import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

import type { LightsApp } from '@/apps'
import { parseHomeConfig } from '@/config/home'
import { MockConnection } from '@/ha/mock/MockConnection'
import { useConfigStore } from '@/stores/config'
import { useEntitiesStore } from '@/stores/entities'
import LightsPanel from '../LightsPanel.vue'

const config = parseHomeConfig({
  apps: [
    {
      id: 'lights',
      type: 'lights',
      name: 'Lights',
      groups: [
        {
          name: 'Den',
          lights: ['light.den_lamp', 'light.den_spot'],
          scenes: [{ entity: 'scene.den_movie', name: 'Movie' }],
        },
        { name: 'Hall', lights: ['light.hall'] },
      ],
    },
  ],
})
const app = config.apps[0] as LightsApp

describe('LightsPanel', () => {
  let store: ReturnType<typeof useEntitiesStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    useConfigStore().set(config)
    store = useEntitiesStore()
    store.connect(new MockConnection(config, 0))
  })

  const mountPanel = (focus?: string) =>
    mount(LightsPanel, { props: { app, focus }, attachTo: document.body })

  it('shows a section per group: its row, its scenes and a card per light', () => {
    const wrapper = mountPanel()
    const sections = wrapper.findAll('.group')
    expect(sections.map((s) => s.find('.header .name').text())).toEqual(['Den', 'Hall'])
    expect(sections[0]!.findAll('.light-card')).toHaveLength(2)
    expect(sections[0]!.find('.scenes').text()).toContain('Movie')
    expect(sections[1]!.find('.scenes').exists()).toBe(false)
    wrapper.unmount()
  })

  it('toggles a light from its card icon, and a whole group from its switch or icon', async () => {
    const wrapper = mountPanel()
    const den = wrapper.findAll('.group')[0]!
    const spot = () => store.get('light.den_spot')!.state

    await den.findAll('.light-card')[1]!.find('.toggle').trigger('click')
    expect(spot()).toBe('on')
    expect(store.get('light.den_lamp')!.state).toBe('on')

    await den.find('.header .toggle-switch').trigger('click')
    expect([store.get('light.den_lamp')!.state, spot()]).toEqual(['off', 'off'])

    // The group's icon toggles it too; its color swatches are always there.
    await den.find('.header .icon').trigger('click')
    expect([store.get('light.den_lamp')!.state, spot()]).toEqual(['on', 'on'])
    expect(den.findAll('.header .color-presets .swatch').length).toBeGreaterThan(0)
    wrapper.unmount()
  })

  it('opens a light’s options under the cards when its name is tapped', async () => {
    const wrapper = mountPanel()
    const den = wrapper.findAll('.group')[0]!
    expect(den.find('.options').exists()).toBe(false)

    await den.findAll('.light-card')[0]!.find('.open').trigger('click')
    const options = den.find('.options')
    expect(options.find('.name').text()).toBe('Den lamp')
    expect(options.find('.toggle-switch').exists()).toBe(true)
    expect(options.findAll('.color-presets .swatch').length).toBeGreaterThan(0)
    expect(options.find('.main > .icon').exists()).toBe(false)

    await den.findAll('.light-card')[0]!.find('.open').trigger('click')
    expect(den.find('.options').exists()).toBe(false)
    wrapper.unmount()
  })

  it('scrolls to the focused group and highlights it', async () => {
    const scrollIntoView = vi.fn<() => void>()
    Element.prototype.scrollIntoView = scrollIntoView
    const wrapper = mountPanel('hall')
    await nextTick()
    const hall = wrapper.findAll('.group')[1]!
    expect(scrollIntoView.mock.contexts[0]).toBe(hall.element)
    expect(hall.classes()).toContain('-highlighted')
    wrapper.unmount()
  })
})
