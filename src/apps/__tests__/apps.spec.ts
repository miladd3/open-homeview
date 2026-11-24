import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import { testConfig } from '@/__tests__/testConfig'
import App from '@/App.vue'
import { type AppConfig, appTypes, isOverlay } from '@/apps'
import { MockConnection } from '@/ha/mock/MockConnection'
import { useConfigStore } from '@/stores/config'
import { useEntitiesStore } from '@/stores/entities'
import { useKioskStore } from '@/stores/kiosk'
import HomeView from '@/views/HomeView.vue'

function appOf(type: AppConfig['type']) {
  return testConfig.apps.find((app) => app.type === type)!
}

async function mountApp() {
  // jsdom has no matchMedia (useTouchCursor asks for the pointer type).
  vi.stubGlobal('matchMedia', () => ({ matches: false }))
  useConfigStore().set(testConfig)
  useEntitiesStore().connect(new MockConnection(testConfig, 0))
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', name: 'home', component: HomeView }],
  })
  router.push('/')
  await router.isReady()
  return mount(App, {
    attachTo: document.body,
    global: { plugins: [router], stubs: { CameraFeed: true, Transition: false } },
  })
}

describe('app types', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('every type in the list has a screen', async () => {
    for (const { screen } of appTypes) expect(await screen()).toBeTruthy()
  })

  it('the example config uses every type, so the checks below cover them all', () => {
    expect(new Set(testConfig.apps.map((app) => app.type))).toEqual(
      new Set(appTypes.map(({ type }) => type)),
    )
  })

  it('only the camera is an overlay', () => {
    expect(appTypes.filter((type) => type.overlay).map(({ type }) => type)).toEqual(['camera'])
    expect(isOverlay(appOf('camera'))).toBe(true)
    expect(isOverlay(appOf('vacuum'))).toBe(false)
  })

  it('opens each app with its own screen', async () => {
    const wrapper = await mountApp()
    const kiosk = useKioskStore()

    for (const [type, component] of [
      ['vacuum', 'VacuumPanel'],
      ['tv', 'TvPanel'],
      ['switch', 'SwitchPanel'],
      ['lights', 'LightsPanel'],
    ] as const) {
      kiosk.openApp(appOf(type).id)
      await flushPromises()
      expect(wrapper.findComponent({ name: component }).exists()).toBe(true)
      kiosk.closeApp()
      await flushPromises()
      expect(wrapper.findComponent({ name: component }).exists()).toBe(false)
    }

    kiosk.openApp(appOf('camera').id, { message: 'Someone is at the door' })
    await flushPromises()
    const overlay = wrapper.findComponent({ name: 'CameraOverlay' })
    expect(overlay.exists()).toBe(true)
    expect(overlay.text()).toContain('Someone is at the door')
    wrapper.unmount()
  })

  it('shows status chips for types that have one', async () => {
    const wrapper = await mountApp()
    const chips = wrapper.findAll('.chips .chip').map((chip) => chip.text())
    expect(chips.some((text) => text.includes(appOf('vacuum').name))).toBe(true)
    expect(chips.some((text) => text.includes(appOf('tv').name))).toBe(true)
    expect(chips.some((text) => text.includes(appOf('camera').name))).toBe(false)
    wrapper.unmount()
  })
})
