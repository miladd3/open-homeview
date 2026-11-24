import { enableAutoUnmount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { mountApp } from '@/__tests__/mountApp'
import { loadAllParts, testConfig } from '@/__tests__/testConfig'
import type { ThemeConfig } from '@/config/home'
import { useKioskStore } from '@/stores/kiosk'
import { themeTypes } from '..'

enableAutoUnmount(afterEach)

const scss = import.meta.glob<string>('../*/*.scss', {
  eager: true,
  query: '?raw',
  import: 'default',
})
const declared = (file: string) =>
  new Set([...(scss[file] ?? '').matchAll(/(--[a-z-]+):/g)].map((match) => match[1]))

const root = document.documentElement

async function mountWith(theme: ThemeConfig) {
  const wrapper = await mountApp({ ...testConfig, theme })
  return wrapper
}

describe('themes', () => {
  beforeAll(loadAllParts)
  beforeEach(() => setActivePinia(createPinia()))
  afterEach(() => vi.useRealTimers())

  it('every folder has a theme of its own name', () => {
    const modules = import.meta.glob<{ id: string }>('../*/index.ts', {
      eager: true,
      import: 'default',
    })
    for (const [path, theme] of Object.entries(modules))
      expect(path).toBe(`../${theme.id}/index.ts`)
  })

  it.each(themeTypes.map((t) => t.id))(
    '%s sets every token, and ships the versions it lists',
    (id) => {
      const theme = themeTypes.find((t) => t.id === id)!
      expect(
        [...declared('../glass/tokens.scss')].filter(
          (token) => !declared(`../${id}/tokens.scss`).has(token),
        ),
      ).toEqual([])
      expect(`../${id}/lite.scss` in scss).toBe(theme.graphics.includes('lite'))
    },
  )

  it.each(themeTypes.flatMap(({ id, graphics }) => graphics.map((g) => [id, g] as const)))(
    'renders the dashboard and a sheet in %s, %s',
    async (name, graphics) => {
      const errors = vi.spyOn(console, 'error')
      const wrapper = await mountWith({
        name,
        graphics,
        mode: themeTypes.find((t) => t.id === name)!.modes[0],
      })
      expect(root.dataset).toMatchObject({ theme: name, graphics })
      expect(wrapper.findAll('.kit-widget').length).toBeGreaterThan(3)
      useKioskStore().openApp('lights')
      await flushPromises()
      expect(wrapper.find('.kit-sheet').exists()).toBe(true)
      useKioskStore().sleep()
      await flushPromises()
      expect(wrapper.find('.standby-host').attributes()).toMatchObject({
        'data-theme': name,
        'data-mode': 'dark',
      })
      expect(errors).not.toHaveBeenCalled()
    },
  )

  it('sets the tint, and the mode by night hours when it is auto', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 24, 14, 5))
    await mountWith({ name: 'liquid-glass', graphics: 'full', tint: '#ff2d55', mode: 'auto' })
    expect(root.dataset.mode).toBe('light')
    expect(root.style.getPropertyValue('--tint')).toBe('#ff2d55')

    setActivePinia(createPinia())
    vi.setSystemTime(new Date(2026, 10, 24, 23, 41))
    await mountWith({ name: 'liquid-glass', graphics: 'full', mode: 'auto' })
    expect(root.dataset.mode).toBe('dark')
    expect(root.style.getPropertyValue('--tint')).toBe('')
  })

  it('uses the full version, with a warning, when the theme has no lite one', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    themeTypes.push({
      id: 'plain',
      name: 'Plain',
      description: '',
      modes: ['dark'],
      graphics: ['full'],
    })
    try {
      await mountWith({ name: 'plain', graphics: 'lite', mode: 'dark' })
    } finally {
      themeTypes.pop()
    }
    expect(root.dataset.graphics).toBe('full')
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('plain has no lite version'))
  })
})

describe('colours', () => {
  // Outside src/themes, colours come from theme tokens. A declaration may keep a
  // literal colour only when the line above says why, with `// fixed colour: …`
  // (a face's own look, text over a camera image).
  const COLOUR =
    /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(|(?<![\w-])(?:white|black)(?![\w-])/i
  const styles = import.meta.glob<string>(['/src/**/*.vue', '/src/**/*.scss', '!/src/themes/**'], {
    eager: true,
    query: '?raw',
    import: 'default',
  })
  // Blanks out a match but keeps its line breaks, so line numbers stay right.
  const blank = (text: string) => text.replace(/[^\n]/g, '')

  it('components use theme tokens for colours', () => {
    const found = Object.entries(styles).flatMap(([file, source]) => {
      const start = file.endsWith('.vue') ? source.indexOf('<style') : 0
      if (start < 0) return []
      const offset = source.slice(0, start).split('\n').length
      return source
        .slice(start)
        .replace(/\/\/ fixed colour[^\n]*\n[^;{}]*;/g, blank)
        .replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, blank)
        .split('\n')
        .flatMap((line, i) => (COLOUR.test(line) ? [`${file}:${offset + i}: ${line.trim()}`] : []))
    })
    expect(found).toEqual([])
  })
})
