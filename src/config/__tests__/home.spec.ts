import { describe, expect, it } from 'vitest'

import { testConfig } from '@/__tests__/testConfig'
import type { LightsApp } from '@/apps'
import { ConfigError, parseHomeConfig } from '../home'

const room = { id: 'den', name: 'Den', lights: ['light.den'] }
/** A config with one Lights app holding these groups. */
const withGroups = (...groups: unknown[]) => ({
  apps: [{ id: 'lights', type: 'lights', name: 'Lights', groups }],
})
const lightsOf = (config: ReturnType<typeof parseHomeConfig>) =>
  config.apps.find((app): app is LightsApp => app.type === 'lights')!
const camera = { id: 'door', name: 'Door', type: 'camera', camera: 'camera.door' }

describe('parseHomeConfig', () => {
  it('parses the shipped kiosk.yaml', () => {
    expect(lightsOf(testConfig).groups.map((g) => g.id)).toEqual([
      'living-room',
      'bedroom',
      'office',
    ])
    expect(lightsOf(testConfig).groups[0]!.scenes).toHaveLength(4)
    expect(testConfig.apps.filter((a) => !a.hidden).map((a) => a.type)).toEqual([
      'lights',
      'vacuum',
      'tv',
      'switch',
      'camera',
    ])
    expect(testConfig.dashboard.map((page) => page.length)).toEqual([11, 5])
    expect(testConfig.events).toEqual([
      {
        entityId: 'event.front_door_doorbell',
        appId: 'front-door',
        to: undefined,
        eventTypes: ['ring'],
        message: 'Someone is at the door',
      },
    ])
    expect(testConfig.standby.afterMs).toBe(60_000)
    expect(testConfig.standby.faces.map((f) => f.face)).toEqual([
      'modular',
      'home-modular',
      'big-clock',
    ])
    expect(testConfig.standby.night).toMatchObject({
      hours: { from: 22, to: 7 },
      face: { face: 'night' },
    })
  })

  it('fills in defaults for an empty file', () => {
    const config = parseHomeConfig(null)
    expect(config.dashboard.flat().map((w) => w.app.type)).toEqual(['clock'])
    expect(config.theme).toEqual({ name: 'glass', graphics: 'full', mode: 'dark' })
    expect(config.wallpaper).toBeUndefined()
    expect(config.standby).toEqual({
      afterMs: 60_000,
      faces: [{ face: 'big-clock', options: {}, slots: {} }],
      night: { hours: { from: 22, to: 7 }, face: { face: 'night', options: {}, slots: {} } },
    })
  })

  it('fills big-clock with the weather by default, when there is a weather entity', () => {
    const { faces } = parseHomeConfig({ weather: 'weather.home' }).standby
    expect(faces).toHaveLength(1)
    expect(faces[0]!.slots.bottom).toMatchObject({ app: { type: 'weather' }, size: '2x1' })
  })

  it('reads faces: short form, options with defaults, and slots like dashboard entries', () => {
    const config = parseHomeConfig({
      ...withGroups(room),
      standby: {
        faces: [
          'night',
          { face: 'modular', slots: { right1: { app: 'lights', group: 'den' }, right2: 'clock' } },
          { face: 'home-modular', color: '#123456' },
        ],
      },
    })
    const [night, modular, homeModular] = config.standby.faces
    expect(night).toEqual({ face: 'night', options: {}, slots: {} })
    expect(modular!.options).toEqual({ color: '#ff9f0a' })
    expect(modular!.slots.right1).toMatchObject({
      app: { id: 'lights' },
      size: '1x1',
      settings: { group: 'den' },
    })
    // An inline slot entry is a hidden app, named by its path, like on the dashboard.
    expect(modular!.slots.right2!.app.id).toBe('standby/faces/1/slots/right2')
    expect(config.apps.some((app) => app.id === 'standby/faces/1/slots/right2')).toBe(true)
    expect(homeModular!.options).toEqual({ color: '#123456' })
  })

  it('defaults group ids, icons and scene colors, and hands the lights the swatches', () => {
    const config = parseHomeConfig(
      withGroups({ name: 'Living Room', lights: ['light.den'], scenes: [{ entity: 'scene.x' }] }),
    )
    const group = lightsOf(config).groups[0]!
    expect(group).toMatchObject({
      id: 'living-room',
      icon: 'lightbulb',
      lightEntityIds: ['light.den'],
    })
    expect(group.scenes[0]!.colors).toHaveLength(2)
    expect(lightsOf(config).colorPresets.length).toBeGreaterThan(0)
  })

  it('accepts a scene as just its entity ID, and empty keys as not set', () => {
    const config = parseHomeConfig({
      weather: null,
      ...withGroups({ ...room, scenes: ['scene.den_movie'] }),
      events: null,
    })
    expect(lightsOf(config).groups[0]!.scenes[0]).toMatchObject({ entityId: 'scene.den_movie' })
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

  it('builds a dashboard without `dashboard:`: clock, weather, each Lights group, other apps', () => {
    const config = parseHomeConfig({
      weather: 'weather.home',
      apps: [
        ...withGroups(room, { name: 'Hall', lights: ['light.hall'] }).apps,
        camera,
        { ...camera, id: 'back', hidden: true },
      ],
    })
    expect(
      config.dashboard.flat().map((w) => [w.app.type, w.size, w.settings.group ?? null]),
    ).toEqual([
      ['clock', '1x1', null],
      ['weather', '1x1', null],
      ['lights', '1x1', 'den'],
      ['lights', '1x1', 'hall'],
      ['camera', '1x1', null],
    ])
  })

  it('reads dashboard entries: short form, app links with widget keys, and inline types', () => {
    const config = parseHomeConfig({
      ...withGroups(room),
      dashboard: [
        [
          'clock',
          { app: 'lights', group: 'den', size: '2x1' },
          { type: 'scene', entity: 'scene.movie_night' },
          { type: 'sensor', entity: 'sensor.outside', name: 'Outside', icon: 'trees' },
        ],
        [{ app: 'lights' }],
      ],
    })
    const [page1, page2] = config.dashboard
    expect(page1!.map((w) => w.size)).toEqual(['1x1', '2x1', '1x1', '1x1'])
    expect(page1![1]).toMatchObject({ app: { id: 'lights' }, settings: { group: 'den' } })
    // Inline entries become hidden apps of their own, named after their entity.
    expect(page1![2]!.app).toMatchObject({
      id: 'dashboard/0/2',
      type: 'scene',
      name: 'Movie night',
      icon: 'sparkles',
      hidden: true,
      entities: { entity: 'scene.movie_night' },
    })
    expect(page1![3]!.app).toMatchObject({ name: 'Outside', icon: 'trees' })
    expect(config.apps.map((a) => a.id)).toContain('dashboard/0/2')
    expect(page2![0]!.settings).toEqual({})
  })

  it('reads a theme by name, or with its version, tint and mode', () => {
    expect(parseHomeConfig({ theme: 'flat-light' }).theme).toEqual({
      name: 'flat-light',
      graphics: 'full',
      mode: 'light',
    })
    expect(
      parseHomeConfig({
        theme: { name: 'liquid-glass', graphics: 'lite', tint: '#ff2d55', mode: 'auto' },
      }).theme,
    ).toEqual({ name: 'liquid-glass', graphics: 'lite', tint: '#ff2d55', mode: 'auto' })
  })

  it('lists every problem, not just the first', () => {
    expect(() =>
      parseHomeConfig({ theme: 'glas', ...withGroups({ ...room, icon: 'unicorn' }) }),
    ).toThrow(/theme must be one of: .*\napps\[0\]\.groups\[0\]\.icon "unicorn"/)
  })

  it.each([
    [
      withGroups({ ...room, lights: ['switch.den'] }),
      'apps[0].groups[0].lights[0] "switch.den" must be a light.* entity',
    ],
    [withGroups({ ...room, icon: 'unicorn' }), 'apps[0].groups[0].icon "unicorn" is not a known'],
    [withGroups({ ...room, lights: [] }), 'apps[0].groups[0].lights needs at least one light'],
    [withGroups(room, room), 'apps[0].groups[1].id "den" is used twice'],
    [withGroups(room, { name: 'den', lights: ['light.x'] }), 'groups[1].id "den" is used twice'],
    [{ apps: [{ id: 'l', type: 'lights', name: 'L' }] }, 'apps[0].groups is required'],
    [withGroups(), 'apps[0].groups needs at least one group'],
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
    [{ rooms: [room] }, 'rooms is not a known key'],
    [
      { apps: [{ id: 't', name: 'T', type: 'tv', player: 'media_player.tv', remot: 'remote.tv' }] },
      'apps[0].remot is not a known key. Did you mean "remote"?',
    ],
    [{ colors: [{ name: 'Odd', rgb: [1, 2] }] }, 'colors[0].rgb must be [r, g, b]'],
    [{ colors: [{ name: 'None' }] }, 'colors[0] needs kelvin: 2700 or rgb: [r, g, b]'],
    [
      withGroups({ ...room, scene: [] }),
      'apps[0].groups[0].scene is not a known key. Did you mean "scenes"?',
    ],
    [{ wallpapr: ['#000', '#fff'] }, 'wallpapr is not a known key. Did you mean "wallpaper"?'],
    [withGroups({ ...room, icon: 'sofaa' }), '"sofaa" is not a known icon. Did you mean "sofa"?'],
    [{ apps: [{ id: 'v', name: 'V', type: 'vacum' }] }, 'Did you mean "vacuum"?'],
    [
      withGroups({ ...room, scenes: ['light.den'] }),
      'apps[0].groups[0].scenes[0] "light.den" must be a scene.* entity',
    ],
    [
      withGroups({ ...room, scenes: [{ entity: 'scene.x', colour: [] }] }),
      'apps[0].groups[0].scenes[0].colour is not a known key. Did you mean "colors"?',
    ],
    [withGroups({ id: 'den', lights: ['light.den'] }), 'apps[0].groups[0].name is required'],
    [
      { apps: [{ id: 'l', type: 'lights', name: 'L', groups: {} }] },
      'apps[0].groups must be a list',
    ],
    [{ timings: {} }, 'timings is not a known key'],
    [{ nightHours: {} }, 'nightHours is not a known key'],
    [{ standby: { afterSeconds: 'soon' } }, 'standby.afterSeconds must be a number'],
    [{ standby: { faces: ['big-clok'] } }, 'standby.faces[0] must be one of: '],
    [{ standby: { faces: ['big-clok'] } }, 'Did you mean "big-clock"?'],
    [{ standby: { faces: [{ face: 'modulr' }] } }, 'Did you mean "modular"?'],
    [
      { standby: { faces: [{ face: 'modular', colour: 'red' }] } },
      'standby.faces[0].colour is not a known key. Did you mean "color"?',
    ],
    [
      { standby: { faces: [{ face: 'modular', slots: { right: 'clock' } }] } },
      'standby.faces[0].slots.right is not a known key. Did you mean "right1"?',
    ],
    [
      { standby: { faces: [{ face: 'modular', slots: { right1: 'clok' } }] } },
      'standby.faces[0].slots.right1 must be one of: ',
    ],
    [
      {
        apps: [camera],
        standby: { faces: [{ face: 'modular', slots: { right1: { app: 'door' } } }] },
      },
      "standby.faces[0].slots.right1 camera can't sit on a face. These can: ",
    ],
    [
      {
        standby: {
          faces: [{ face: 'big-clock', slots: { bottom: { type: 'lock', entity: 'lock.x' } } }],
        },
      },
      'standby.faces[0].slots.bottom the bottom slot of big-clock takes 2x1, and lock widgets are 1x1',
    ],
    [
      {
        standby: {
          faces: [{ face: 'modular', slots: { right1: { type: 'clock', size: '2x1' } } }],
        },
      },
      'standby.faces[0].slots.right1.size the right1 slot of modular takes 1x1',
    ],
    [{ standby: { night: { face: 'nite' } } }, 'standby.night.face must be one of: '],
    [{ standby: { night: { hours: { from: 25 } } } }, 'standby.night.hours.from'],
    [{ graphics: 'lite' }, 'graphics is not a known key'],
    [
      { theme: 'glas' },
      'theme must be one of: flat-light, glass, liquid-glass. Did you mean "glass"?',
    ],
    [{ theme: { name: 'glass', graphics: 'ultra' } }, 'theme.graphics must be one of: full, lite'],
    [{ theme: { name: 'glass', mode: 'auto' } }, 'theme.mode glass has no light mode, only dark'],
    [
      { theme: { name: 'glass', tnt: '#fff' } },
      'theme.tnt is not a known key. Did you mean "tint"?',
    ],
    [{ wallpaper: ['#000'] }, 'wallpaper must be two colors: [from, to]'],
    [{ dashboard: [['clok']] }, 'dashboard[0][0] must be one of: '],
    [{ dashboard: [['clok']] }, 'Did you mean "clock"?'],
    [
      { apps: [camera], dashboard: [[{ app: 'dor' }]] },
      'dashboard[0][0].app "dor" is not an app ID. Did you mean "door"?',
    ],
    [
      { apps: [camera], dashboard: [[{ app: 'door', size: '4x2' }]] },
      'dashboard[0][0].size camera widgets are 1x1 or 2x1 or 2x2, not 4x2',
    ],
    [{ dashboard: [[{ app: 'x', size: '3x3' }]] }, 'dashboard[0][0].size must be one of: 1x1'],
    [
      { ...withGroups(room), dashboard: [[{ app: 'lights', group: 'dne' }]] },
      'dashboard[0][0] group "dne" is not a group of lights. Did you mean "den"?',
    ],
    [
      { ...withGroups(room), dashboard: [[{ app: 'lights', grup: 'den' }]] },
      'dashboard[0][0].grup is not a known key. Did you mean "group"?',
    ],
    [{ dashboard: [[{ type: 'lock' }]] }, 'dashboard[0][0].entity is required'],
    [
      { dashboard: [[{ type: 'lock', entity: 'light.x' }]] },
      'dashboard[0][0].entity "light.x" must be a lock.* entity',
    ],
    [{ dashboard: [[{ type: 'clock', id: 'c' }]] }, 'dashboard[0][0].id is not a known key'],
    [{ dashboard: [[{ size: '1x1' }]] }, 'dashboard[0][0] needs `app` (an app ID) or `type`'],
    [{ dashboard: [['weather']] }, 'dashboard[0][0] needs `weather:`'],
    [{ dashboard: [[]] }, 'dashboard[0] needs at least one widget'],
  ])('points at the broken key in %j', (raw, message) => {
    expect(() => parseHomeConfig(raw)).toThrow(ConfigError)
    expect(() => parseHomeConfig(raw)).toThrow(message)
  })
})
