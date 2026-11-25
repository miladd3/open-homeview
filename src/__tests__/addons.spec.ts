import { flushPromises, mount } from '@vue/test-utils'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createPinia, setActivePinia } from 'pinia'
import { beforeAll, describe, expect, it } from 'vitest'
import type { Component } from 'vue'

import { buildAddon } from '../../scripts/build-addon.ts'
import { type AddonManifest, registerAddon } from '@/addons'
import { type AppConfig, appTypeOf, appTypes } from '@/apps'
import { parseHomeConfig } from '@/config/home'
import { MockConnection } from '@/ha/mock/MockConnection'
import { useEntitiesStore } from '@/stores/entities'

// Inside the repo (dist-addon is git-ignored), so the pack's `vue` and kit resolve to the kiosk's own.
const OUT = join(process.cwd(), 'dist-addon/.test')

interface Pack {
  manifest: Extract<AddonManifest, { kind: string }>
  definition: {
    type: string
    schema: { parse: (raw: unknown) => AppConfig }
    screen: () => Promise<unknown>
  }
}
let pack: Pack

beforeAll(async () => {
  const folder = await buildAddon('src/apps/switch', { outRoot: OUT, version: '1.2.0' })
  pack = {
    manifest: JSON.parse(await readFile(join(folder, 'addon.json'), 'utf8')),
    definition: (await import(/* @vite-ignore */ join(folder, 'index.js'))).default,
  }
}, 60_000)

describe('a built-in folder built as a pack', () => {
  it('has addon.json, index.js, its lazy screen in chunks/ and its styles', () => {
    expect(pack.manifest).toEqual({
      name: 'switch',
      kind: 'app',
      version: '1.2.0',
      kit: 1,
      description: 'Any on/off entity, with optional sensors.',
      files: ['chunks/', 'index.js', 'style.css'],
    })
  })

  it('works exactly like the built-in one', async () => {
    setActivePinia(createPinia())
    const raw = { id: 'kettle', type: 'switch', name: 'Kettle', switch: 'switch.kettle' }
    const home = parseHomeConfig({ apps: [raw] })
    useEntitiesStore().connect(new MockConnection(home, 0))

    const render = async (screen: () => Promise<unknown>, app: AppConfig) => {
      const { default: component } = (await screen()) as { default: Component }
      const wrapper = mount(component, { props: { app } })
      await flushPromises()
      return wrapper.html()
    }
    const fromPack = await render(pack.definition.screen, pack.definition.schema.parse(raw))
    const builtIn = await render(appTypeOf('switch')!.screen!, home.apps[0]!)
    expect(fromPack).toContain('Kettle')
    expect(fromPack).toBe(builtIn)
  })
})

describe('registerAddon', () => {
  const as = (name: string, kit = 1) => ({ ...pack.manifest, name, kit })
  const named = (type: string) => async () => ({ default: { ...pack.definition, type } })

  it('adds a pack to the same list as the built-in folders', async () => {
    await registerAddon(as('cover'), named('cover'))
    expect(appTypeOf('cover')?.schema).toBe(pack.definition.schema)
    appTypes.splice(appTypes.indexOf(appTypeOf('cover')!), 1)
  })

  it('refuses a pack for another kit, a wrong name, a clash and broken JS', async () => {
    await expect(registerAddon(as('cover', 2), named('cover'))).rejects.toThrow(
      'it was built for kit 2, this kiosk has kit 1. Rebuild it.',
    )
    await expect(registerAddon(as('cover'), named('blinds'))).rejects.toThrow(
      'its app is called "blinds", not "cover"',
    )
    await expect(registerAddon(as('switch'), named('switch'))).rejects.toThrow(
      'a built-in app is already called "switch"; using the built-in',
    )
    await expect(
      registerAddon(as('cover'), () => Promise.reject(new SyntaxError('Unexpected token'))),
    ).rejects.toThrow('Unexpected token')
    await expect(
      registerAddon({ name: 'gone', error: 'no addon.json' }, named('gone')),
    ).rejects.toThrow('no addon.json')
    expect(appTypeOf('cover')).toBeUndefined()
  })
})
