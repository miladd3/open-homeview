import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import { loadAllParts, testConfig } from '@/__tests__/testConfig'
import App from '@/App.vue'
import { type AppConfig, appTypes, isOverlay } from '@/apps'
import type { HomeConfig } from '@/config/home'
import { MockConnection } from '@/ha/mock/MockConnection'
import { useConfigStore } from '@/stores/config'
import { useEntitiesStore } from '@/stores/entities'
import { useKioskStore } from '@/stores/kiosk'
import HomeView from '@/views/HomeView.vue'

function appOf(type: AppConfig['type']) {
  return testConfig.apps.find((app) => app.type === type)!
}

async function mountApp(config: HomeConfig = testConfig) {
  // jsdom has no matchMedia (useTouchCursor asks for the pointer type), ResizeObserver
  // or scrollIntoView (Lights scrolls to a focused group).
  vi.stubGlobal('matchMedia', () => ({ matches: false }))
  Element.prototype.scrollIntoView = () => {}
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  )
  useConfigStore().set(config)
  useEntitiesStore().connect(new MockConnection(config, 0))
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', name: 'home', component: HomeView }],
  })
  router.push('/')
  await router.isReady()
  const wrapper = mount(App, {
    attachTo: document.body,
    global: { plugins: [router], stubs: { CameraFeed: true, Transition: false } },
  })
  await flushPromises()
  return wrapper
}

/** The dashboard cell holding the widget of this app (and Lights group). */
function cellOf(wrapper: Awaited<ReturnType<typeof mountApp>>, name: string) {
  return wrapper.findAll('.widget-cell').find((cell) => cell.text().includes(name))!
}

describe('app types', () => {
  beforeAll(loadAllParts)
  beforeEach(() => setActivePinia(createPinia()))

  it('every folder has a type of its own name, with a screen or a widget', () => {
    const modules = import.meta.glob<{ type: string }>('../*/index.ts', {
      eager: true,
      import: 'default',
    })
    for (const [path, definition] of Object.entries(modules))
      expect(path).toBe(`../${definition.type}/index.ts`)
    for (const { screen, widget } of appTypes) expect(screen ?? widget).toBeTruthy()
  })

  it('the example config uses every type, so the checks below cover them all', () => {
    expect(new Set(testConfig.dashboard.flat().map((w) => w.app.type))).toEqual(
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
})

describe('dashboard', () => {
  beforeAll(loadAllParts)
  beforeEach(() => setActivePinia(createPinia()))

  it('shows every widget of the example, one grid page per page', async () => {
    const wrapper = await mountApp()
    expect(wrapper.findAll('.page').map((page) => page.findAll('.widget-cell').length)).toEqual(
      testConfig.dashboard.map((page) => page.length),
    )
    expect(wrapper.findAll('.dots .dot')).toHaveLength(2)
    wrapper.unmount()
  })

  it('opens the app of a tapped widget', async () => {
    const wrapper = await mountApp()
    await cellOf(wrapper, 'Vacuum').find('.kit-widget').trigger('click')
    await flushPromises()
    expect(wrapper.findComponent({ name: 'VacuumPanel' }).exists()).toBe(true)
    wrapper.unmount()
  })

  it('opens Lights at a group from the corner arrow of its widget', async () => {
    const wrapper = await mountApp()
    await cellOf(wrapper, 'Bedroom').find('.open').trigger('click')
    await flushPromises()
    expect(useKioskStore().focus).toBe('bedroom')
    expect(wrapper.findComponent({ name: 'LightsPanel' }).exists()).toBe(true)
    wrapper.unmount()
  })

  it('shows the quick control on a long-press, not a tap', async () => {
    vi.useFakeTimers()
    const wrapper = await mountApp()
    const cell = cellOf(wrapper, 'Bedroom')
    const ids = ['light.bedroom_ceiling']
    const before = useEntitiesStore().get(ids[0])?.state

    await cell.trigger('pointerdown')
    vi.advanceTimersByTime(600)
    await flushPromises()
    await cell.find('.kit-widget').trigger('click')
    await flushPromises()
    expect(cell.find('.quick [role="slider"]').exists()).toBe(true)
    // The click that ended the long-press didn't toggle the group.
    expect(useEntitiesStore().get(ids[0])?.state).toBe(before)

    await cell.find('.scrim').trigger('click')
    expect(cell.find('.quick').exists()).toBe(false)
    vi.useRealTimers()
    wrapper.unmount()
  })

  it('shows a broken widget as a grey cell and keeps the rest', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    // An app whose entities went missing: its widget throws.
    const widget = testConfig.dashboard.flat().find((w) => w.app.type === 'switch')!
    const broken: HomeConfig = {
      ...testConfig,
      dashboard: [
        [
          testConfig.dashboard[0]![0]!,
          { ...widget, app: { ...widget.app, entities: undefined as never } },
        ],
      ],
    }
    const wrapper = await mountApp(broken)
    expect(wrapper.findAll('.widget-cell .error').map((e) => e.text())).toEqual(['Widget error'])
    expect(wrapper.findAll('.kit-widget')).toHaveLength(1)
    expect(errors).toHaveBeenCalled()
    wrapper.unmount()
  })
})
