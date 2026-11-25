import { describe, expect, it, vi } from 'vitest'

import { parseHomeConfig } from '../home'
import { layoutOf } from '../layout'
import { parseConfigSource } from '../load'

const KIOSK = `
weather: weather.home
entities: [light.kitchen, sensor.attic]
apps:
  - { id: tv, type: tv, name: TV, player: media_player.tv }
  - id: lights
    type: lights
    name: Lights
    groups: [{ name: Den, lights: [light.den] }]
dashboard:
  - [clock, { app: tv }]
`

const entries = (pages: ReturnType<typeof parseHomeConfig>['dashboard']) => layoutOf(pages)

describe('layout.yaml', () => {
  it("replaces kiosk.yaml's dashboard", () => {
    const { home, layoutProblem } = parseConfigSource(
      KIOSK,
      'dashboard:\n  - [{ app: lights, group: den }, { type: light, entity: light.kitchen }]\n  - [weather]',
    )
    expect(layoutProblem).toBeUndefined()
    expect(entries(home.dashboard)).toEqual([
      [
        { app: 'lights', group: 'den' },
        { type: 'light', entity: 'light.kitchen' },
      ],
      ['weather'],
    ])
  })

  it('is ignored with a warning when it is broken or names what kiosk.yaml lacks', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    for (const [layout, problem] of [
      ['dashboard:\n  - [{ app: vacuum }]', /"vacuum" is not an app ID/],
      ['theme: glass\ndashboard: [[clock]]', /only have dashboard, not theme/],
      ['dashboard: [', /not valid YAML/],
      ['', /no dashboard/],
    ] as const) {
      const { home, layoutProblem } = parseConfigSource(KIOSK, layout)
      expect(layoutProblem).toMatch(problem)
      expect(entries(home.dashboard)).toEqual([['clock', { app: 'tv' }]])
    }
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('a broken kiosk.yaml still throws, whatever the layout', () => {
    expect(() => parseConfigSource('apps: [{ id: x }]', 'dashboard: [[clock]]')).toThrow(
      /apps\[0\]/,
    )
  })

  it('writes sizes only when they are not the default', () => {
    const home = parseHomeConfig({
      apps: [{ id: 'tv', type: 'tv', name: 'TV', player: 'media_player.tv' }],
      dashboard: [['clock', { type: 'clock', size: '2x1' }, { app: 'tv', size: '1x1' }]],
    })
    expect(layoutOf(home.dashboard)).toEqual([
      ['clock', { type: 'clock', size: '2x1' }, { app: 'tv' }],
    ])
  })
})

describe('gallery', () => {
  it('offers only what kiosk.yaml has: types without keys, apps, groups, entities', () => {
    const { home } = parseConfigSource(KIOSK)
    expect(home.gallery.map((widget) => widget.entry)).toEqual([
      'clock',
      'weather',
      { app: 'tv' },
      { app: 'lights' },
      { app: 'lights', group: 'den' },
      { type: 'light', entity: 'light.kitchen' },
      { type: 'sensor', entity: 'sensor.attic' },
    ])
    // Its inline apps are real apps, so the mock and the missing-entity check know them.
    expect(home.apps.map((app) => app.id)).toContain('gallery/5')
  })

  it('leaves out weather without `weather:`, and refuses entities no widget takes', () => {
    expect(parseHomeConfig({}).gallery.map((widget) => widget.entry)).toEqual(['clock'])
    expect(() => parseHomeConfig({ entities: ['switch.kettle'] })).toThrow(
      'entities[0] no widget takes switch.* entities',
    )
  })
})
