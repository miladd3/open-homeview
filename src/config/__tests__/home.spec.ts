import { describe, expect, it } from 'vitest'

import { testConfig } from '@/__tests__/testConfig'
import { ConfigError, parseHomeConfig } from '../home'

const room = { id: 'den', name: 'Den', lights: ['light.den'] }

describe('parseHomeConfig', () => {
  it('parses the shipped kiosk.yaml', () => {
    expect(testConfig.rooms.map((r) => r.id)).toEqual(['living-room', 'bedroom', 'office'])
    expect(testConfig.rooms[0]!.lightEntityIds).toEqual(['light.living_room'])
    expect(testConfig.apps.map((a) => a.type)).toEqual([
      'lights',
      'vacuum',
      'tv',
      'switch',
      'doorbell',
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

  it.each([
    [
      { rooms: [{ ...room, lights: ['switch.den'] }] },
      'rooms[0].lights[0] "switch.den" must be a light.* entity',
    ],
    [{ rooms: [{ ...room, icon: 'unicorn' }] }, 'rooms[0].icon "unicorn" is not a known icon'],
    [{ rooms: [{ ...room, lights: [] }] }, 'rooms[0].lights needs at least one light'],
    [{ rooms: [room, room] }, 'rooms has the id "den" twice'],
    [
      {
        apps: [{ id: 'l', type: 'lights', name: 'L', groups: [{ name: 'G', lights: ['fan.x'] }] }],
      },
      'apps[0].groups[0].lights[0] "fan.x" must be a light.* entity',
    ],
    [{ apps: [{ id: 'l', type: 'lights', name: 'L' }] }, 'apps[0].groups needs at least one group'],
    [{ apps: [{ id: 'x', name: 'X', type: 'radio' }] }, 'apps[0].type must be one of'],
    [
      { apps: [{ id: 'd', name: 'D', type: 'doorbell' }] },
      'apps[0] needs a top-level doorbell section',
    ],
    [{ apps: [{ id: 't', name: 'T', type: 'tv', entities: {} }] }, 'apps[0].entities.player'],
    [{ colors: [{ name: 'Odd', rgb: [1, 2] }] }, 'colors[0] needs kelvin: 2700 or rgb: [r, g, b]'],
    [{ graphics: 'ultra' }, 'graphics must be one of: full, lite'],
  ])('points at the broken key in %j', (raw, message) => {
    expect(() => parseHomeConfig(raw)).toThrow(ConfigError)
    expect(() => parseHomeConfig(raw)).toThrow(message)
  })
})
