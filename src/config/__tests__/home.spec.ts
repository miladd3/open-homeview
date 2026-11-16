import { describe, expect, it } from 'vitest'

import { testConfig } from '@/__tests__/testConfig'
import { ConfigError, parseHomeConfig } from '../home'

const room = { id: 'den', name: 'Den', lights: ['light.den'] }
const camera = { id: 'door', name: 'Door', type: 'camera', camera: 'camera.door' }

describe('parseHomeConfig', () => {
  it('parses the shipped kiosk.yaml', () => {
    expect(testConfig.rooms.map((r) => r.id)).toEqual(['living-room', 'bedroom', 'office'])
    expect(testConfig.rooms[0]!.lightEntityIds).toEqual(['light.living_room'])
    expect(testConfig.apps.map((a) => a.type)).toEqual([
      'lights',
      'vacuum',
      'tv',
      'switch',
      'camera',
    ])
    expect(testConfig.events).toEqual([
      {
        entityId: 'event.front_door_doorbell',
        appId: 'front-door',
        to: undefined,
        eventTypes: ['ring'],
        message: 'Someone is at the door',
      },
    ])
    expect(testConfig.timings.screensaverAfterMs).toBe(60_000)
  })

  it('fills in defaults for an empty file', () => {
    const config = parseHomeConfig(null)
    expect(config.rooms).toEqual([])
    expect(config.colors.length).toBeGreaterThan(0)
    expect(config.nightHours).toEqual({ from: 22, to: 7 })
    expect(config.graphics).toBe('full')
    expect(config.timings.configCheckMs).toBe(60_000)
  })

  it('defaults scene colors and the room icon', () => {
    const config = parseHomeConfig({
      rooms: [{ ...room, scenes: [{ entity: 'scene.den_movie' }] }],
    })
    expect(config.rooms[0]!.icon).toBe('house')
    expect(config.rooms[0]!.scenes[0]!.colors).toHaveLength(2)
  })

  it('groups a lights app by room when it has no groups', () => {
    const config = parseHomeConfig({
      rooms: [{ ...room, icon: 'sofa' }],
      apps: [{ id: 'lights', type: 'lights', name: 'Lights' }],
    })
    expect(config.apps[0]).toMatchObject({
      type: 'lights',
      groups: [{ name: 'Den', icon: 'sofa', lightEntityIds: ['light.den'] }],
    })
  })

  it('reads lights app groups and defaults their icon', () => {
    const config = parseHomeConfig({
      apps: [
        {
          id: 'lights',
          type: 'lights',
          name: 'Lights',
          groups: [{ name: 'Spots', lights: ['light.spot_1', 'light.spot_2'] }],
        },
      ],
    })
    expect(config.apps[0]).toMatchObject({
      groups: [
        { name: 'Spots', icon: 'lightbulb', lightEntityIds: ['light.spot_1', 'light.spot_2'] },
      ],
    })
  })

  it('accepts a scene as just its entity ID, and empty keys as not set', () => {
    const config = parseHomeConfig({
      weather: null,
      rooms: [{ ...room, scenes: ['scene.den_movie'] }],
      events: null,
    })
    expect(config.rooms[0]!.scenes[0]).toMatchObject({ entityId: 'scene.den_movie' })
    expect(config.weatherEntityId).toBeUndefined()
    expect(config.events).toEqual([])
  })

  it('reads camera apps and events', () => {
    const config = parseHomeConfig({
      apps: [{ ...camera, hidden: true, autoCloseSeconds: 30 }],
      events: [{ entity: 'binary_sensor.driveway_motion', to: 'on', open: 'door' }],
    })
    expect(config.apps[0]).toMatchObject({
      type: 'camera',
      hidden: true,
      entities: { camera: 'camera.door' },
      autoCloseSeconds: 30,
    })
    expect(config.events[0]).toEqual({
      entityId: 'binary_sensor.driveway_motion',
      appId: 'door',
      to: 'on',
      eventTypes: [],
      message: undefined,
    })
  })

  it('gathers app entity IDs into app.entities', () => {
    const config = parseHomeConfig({
      apps: [{ id: 'tv', name: 'TV', type: 'tv', player: 'media_player.tv' }],
    })
    expect(config.apps[0]).toMatchObject({ entities: { player: 'media_player.tv' } })
  })

  it('lists every problem, not just the first', () => {
    expect(() =>
      parseHomeConfig({ graphics: 'ultra', rooms: [{ ...room, icon: 'unicorn' }] }),
    ).toThrow(/graphics must be one of: full, lite\nrooms\[0\]\.icon "unicorn"/)
  })

  it.each([
    [
      { rooms: [{ ...room, lights: ['switch.den'] }] },
      'rooms[0].lights[0] "switch.den" must be a light.* entity',
    ],
    [{ rooms: [{ ...room, icon: 'unicorn' }] }, 'rooms[0].icon "unicorn" is not a known icon'],
    [{ rooms: [{ ...room, lights: [] }] }, 'rooms[0].lights needs at least one light'],
    [{ rooms: [room, room] }, 'rooms[1].id "den" is used twice'],
    [
      {
        apps: [{ id: 'l', type: 'lights', name: 'L', groups: [{ name: 'G', lights: ['fan.x'] }] }],
      },
      'apps[0].groups[0].lights[0] "fan.x" must be a light.* entity',
    ],
    [{ apps: [{ id: 'l', type: 'lights', name: 'L' }] }, 'apps[0].groups needs at least one group'],
    [{ apps: [{ id: 'x', name: 'X', type: 'radio' }] }, 'apps[0].type must be one of'],
    [{ apps: [{ ...camera, camera: undefined }] }, 'apps[0].camera is required'],
    [
      { apps: [camera], events: [{ entity: 'event.ring', open: 'dor' }] },
      'events[0].open "dor" is not an app ID. Did you mean "door"?',
    ],
    [
      { apps: [camera], events: [{ entity: 'binary_sensor.motion', open: 'door' }] },
      "events[0] needs `to`, the state that fires it (e.g. to: 'on')",
    ],
    [
      { apps: [camera], events: [{ entity: 'event.ring', to: 'on', open: 'door' }] },
      'events[0].to is not for event.* entities',
    ],
    [
      {
        apps: [camera],
        events: [{ entity: 'switch.x', to: 'on', eventTypes: ['ring'], open: 'door' }],
      },
      'events[0].eventTypes is only for event.* entities',
    ],
    [{ apps: [{ id: 't', name: 'T', type: 'tv' }] }, 'apps[0].player is required'],
    [
      { apps: [{ id: 't', name: 'T', type: 'tv', entities: { player: 'media_player.tv' } }] },
      'apps[0].entities is not a known key',
    ],
    [{ doorbell: { camera: 'camera.door' } }, 'doorbell is not a known key'],
    [
      { apps: [{ id: 't', name: 'T', type: 'tv', player: 'media_player.tv', remot: 'remote.tv' }] },
      'apps[0].remot is not a known key. Did you mean "remote"?',
    ],
    [{ colors: [{ name: 'Odd', rgb: [1, 2] }] }, 'colors[0].rgb must be [r, g, b]'],
    [{ colors: [{ name: 'None' }] }, 'colors[0] needs kelvin: 2700 or rgb: [r, g, b]'],
    [
      { rooms: [{ ...room, scene: [] }] },
      'rooms[0].scene is not a known key. Did you mean "scenes"?',
    ],
    [{ wallpapr: ['#000', '#fff'] }, 'wallpapr is not a known key. Did you mean "wallpaper"?'],
    [{ rooms: [{ ...room, icon: 'sofaa' }] }, '"sofaa" is not a known icon. Did you mean "sofa"?'],
    [{ apps: [{ id: 'v', name: 'V', type: 'vacum' }] }, 'Did you mean "vacuum"?'],
    [
      { rooms: [{ ...room, scenes: ['light.den'] }] },
      'rooms[0].scenes[0] "light.den" must be a scene.* entity',
    ],
    [
      { rooms: [{ ...room, scenes: [{ entity: 'scene.x', colour: [] }] }] },
      'rooms[0].scenes[0].colour is not a known key. Did you mean "colors"?',
    ],
    [{ rooms: [{ id: 'den', lights: ['light.den'] }] }, 'rooms[0].name is required'],
    [{ rooms: { den: {} } }, 'rooms must be a list'],
    [{ timings: { screensaverSeconds: 'soon' } }, 'timings.screensaverSeconds must be a number'],
    [{ graphics: 'ultra' }, 'graphics must be one of: full, lite'],
  ])('points at the broken key in %j', (raw, message) => {
    expect(() => parseHomeConfig(raw)).toThrow(ConfigError)
    expect(() => parseHomeConfig(raw)).toThrow(message)
  })
})
