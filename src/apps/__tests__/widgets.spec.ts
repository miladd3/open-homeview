import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'

import { loadAllParts, testConfig } from '@/__tests__/testConfig'
import { appTypes, widgetOf, widgetSizes } from '@/apps'
import { MockConnection } from '@/ha/mock/MockConnection'
import { useConfigStore } from '@/stores/config'
import { useEntitiesStore } from '@/stores/entities'

// Every widget on the example dashboard, which uses every type (apps.spec checks).
const cases = appTypes.flatMap(({ type }) => {
  const widgets = testConfig.dashboard.flat().filter((w) => w.app.type === type)
  return widgets.flatMap((widget) =>
    widgetSizes(widget.app).map((size) => ({
      name: `${type}${widget.settings.group ? ` (${String(widget.settings.group)})` : ''} ${size}`,
      widget,
      size,
    })),
  )
})

describe('widgets', () => {
  beforeAll(loadAllParts)
  beforeEach(() => {
    setActivePinia(createPinia())
    useConfigStore().set(testConfig)
    useEntitiesStore().connect(new MockConnection(testConfig, 0))
  })

  it.each(cases)('renders $name', async ({ widget, size }) => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const props = { app: widget.app, size, mode: 'dashboard', settings: widget.settings }
    // Widgets are async components; test-utils needs a plain one at the root.
    const wrapper = mount(defineComponent(() => () => h(widgetOf(widget.app), props)))
    await flushPromises()
    expect(wrapper.find('.kit-widget').exists()).toBe(true)
    expect(wrapper.text()).not.toBe('')
    expect(errors).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
