import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { parseHomeConfig } from '@/config/home'
import { MockConnection } from '@/ha/mock/MockConnection'
import { useEntitiesStore } from '@/stores/entities'
import { useLightGroup } from '../useLightGroup'

const ids = ['light.den_lamp', 'light.den_ceiling']
const config = parseHomeConfig({
  apps: [{ id: 'lights', type: 'lights', name: 'Lights', groups: [{ name: 'Den', lights: ids }] }],
})

describe('useLightGroup', () => {
  let mock: MockConnection

  beforeEach(() => {
    setActivePinia(createPinia())
    mock = new MockConnection(config, 0)
    useEntitiesStore().connect(mock)
  })

  it('treats a group as on while any of its lights is on', () => {
    // The mock starts with the first light on and the second off.
    const group = useLightGroup(ids)
    expect(group.lights.value.map((l) => l.state)).toEqual(['on', 'off'])
    expect(group.isOn.value).toBe(true)
  })

  it('switches every light together', async () => {
    const group = useLightGroup(ids)
    await group.toggle()
    expect(group.lights.value.map((l) => l.state)).toEqual(['off', 'off'])

    await group.toggle()
    expect(group.lights.value.map((l) => l.state)).toEqual(['on', 'on'])
  })

  it('averages brightness over the lights that are on', async () => {
    const group = useLightGroup(ids)
    await mock.callService('light', 'turn_on', { brightness_pct: 100 }, { entity_id: ids[0]! })
    await mock.callService('light', 'turn_on', { brightness_pct: 50 }, { entity_id: ids[1]! })
    expect(group.brightness.value).toBe(75)
  })
})
