import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { parseHomeConfig } from '@/config/home'
import { createFixtures } from '@/ha/mock/fixtures'
import { MockConnection } from '@/ha/mock/MockConnection'
import { useConfigStore } from '@/stores/config'
import { useEntitiesStore } from '@/stores/entities'
import { configEntityIds, useMissingEntities } from '../useMissingEntities'

const config = parseHomeConfig({
  weather: 'weather.home',
  rooms: [{ id: 'den', name: 'Den', lights: ['light.den'], scenes: ['scene.den_movie'] }],
})

describe('useMissingEntities', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useConfigStore().set(config)
  })

  it('finds every entity ID in the config', () => {
    expect([...configEntityIds(config)].sort()).toEqual([
      'light.den',
      'scene.den_movie',
      'weather.home',
    ])
  })

  it('lists config entities that Home Assistant does not have', () => {
    const { 'scene.den_movie': _, ...states } = createFixtures(config)
    useEntitiesStore().connect(new MockConnection(config, 0, states))
    expect(useMissingEntities().value).toEqual(['scene.den_movie'])
  })

  it('reports nothing before Home Assistant has sent its states', () => {
    useEntitiesStore().connect(new MockConnection(config, 0, {}))
    expect(useMissingEntities().value).toEqual([])
  })
})
