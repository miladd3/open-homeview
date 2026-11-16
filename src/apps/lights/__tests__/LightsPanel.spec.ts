import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

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
        { name: 'Den', lights: ['light.den_lamp', 'light.den_spot'] },
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

  const mountPanel = () => mount(LightsPanel, { props: { app }, attachTo: document.body })

  it('lists the groups and the lights of the selected one', async () => {
    const wrapper = mountPanel()
    expect(wrapper.findAll('.group').map((g) => g.find('.name').text())).toEqual(['Den', 'Hall'])
    expect(wrapper.findAll('.light-tile')).toHaveLength(2)

    await wrapper.findAll('.group')[1]!.trigger('click')
    expect(wrapper.findAll('.light-tile').map((t) => t.find('.name').text())).toEqual(['Hall'])
    wrapper.unmount()
  })

  it('toggles a single light from its tile', async () => {
    const wrapper = mountPanel()
    const before = store.get('light.den_spot')!.state
    await wrapper.findAll('.light-tile')[1]!.find('.toggle').trigger('click')
    expect(store.get('light.den_spot')!.state).toBe(before === 'on' ? 'off' : 'on')
    expect(store.get('light.den_lamp')!.state).toBe('on')
    wrapper.unmount()
  })

  it('opens a light’s controls from its tile', async () => {
    const wrapper = mountPanel()
    await wrapper.findAll('.light-tile')[0]!.find('.open').trigger('click')
    expect(wrapper.find('.light-controls .name').text()).toBe('Den lamp')

    await wrapper.find('.light-controls .back').trigger('click')
    expect(wrapper.find('.light-controls').exists()).toBe(false)
    wrapper.unmount()
  })
})
