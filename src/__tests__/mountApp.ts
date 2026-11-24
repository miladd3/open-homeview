import { flushPromises, mount } from '@vue/test-utils'
import { vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import App from '@/App.vue'
import type { HomeConfig } from '@/config/home'
import { MockConnection } from '@/ha/mock/MockConnection'
import { useConfigStore } from '@/stores/config'
import { useEntitiesStore } from '@/stores/entities'
import HomeView from '@/views/HomeView.vue'
import { testConfig } from './testConfig'

/** The whole kiosk against the mock. Call `loadAllParts` first (in `beforeAll`). */
export async function mountApp(config: HomeConfig = testConfig) {
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
