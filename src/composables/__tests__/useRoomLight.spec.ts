import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { parseHomeConfig } from '@/config/home'
import { MockConnection } from '@/ha/mock/MockConnection'
import { useEntitiesStore } from '@/stores/entities'
import { useRoomLight } from '../useRoomLight'

const config = parseHomeConfig({
  rooms: [{ id: 'den', name: 'Den', lights: ['light.den_lamp', 'light.den_ceiling'] }],
})
const room = config.rooms[0]!

describe('useRoomLight', () => {
  let mock: MockConnection

  beforeEach(() => {
    setActivePinia(createPinia())
    mock = new MockConnection(config, 0)
    useEntitiesStore().connect(mock)
  })

  it('treats a room as on while any of its lights is on', async () => {
    const light = useRoomLight(room)
    expect(light.isOn.value).toBe(true)
    expect(light.lights.value).toHaveLength(2)

    await light.toggleLight('light.den_lamp')
    expect(light.isOn.value).toBe(true)
  })

  it('switches every light together', async () => {
    const light = useRoomLight(room)
    await light.toggleLight('light.den_lamp')

    await light.toggle()
    expect(light.lights.value.map((l) => l.state)).toEqual(['off', 'off'])

    await light.toggle()
    expect(light.lights.value.map((l) => l.state)).toEqual(['on', 'on'])
  })

  it('averages brightness over the lights that are on', async () => {
    const light = useRoomLight(room)
    await mock.callService(
      'light',
      'turn_on',
      { brightness_pct: 100 },
      { entity_id: 'light.den_lamp' },
    )
    await mock.callService(
      'light',
      'turn_on',
      { brightness_pct: 50 },
      { entity_id: 'light.den_ceiling' },
    )
    expect(light.brightness.value).toBe(75)
  })
})
