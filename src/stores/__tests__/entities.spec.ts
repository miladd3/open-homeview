import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { HaConnection, HassEntities, HassEntity } from '@/ha/types'
import { useEntitiesStore } from '../entities'

const LIGHT = 'light.office'

function light(state: string, brightness: number | null): HassEntity {
  return {
    entity_id: LIGHT,
    state,
    attributes: { brightness },
    last_changed: '',
    last_updated: '',
  }
}

/** A Home Assistant that answers only when the test says so. */
function fakeHa(initial: HassEntity) {
  let push: (entities: HassEntities) => void = () => {}
  const callService = vi.fn<HaConnection['callService']>(async () => {})
  const conn: HaConnection = {
    subscribeEntities(callback) {
      push = callback
      callback({ [LIGHT]: initial })
      return () => {}
    },
    subscribeStatus: () => () => {},
    callService,
  }
  return { conn, callService, report: (entity: HassEntity) => push({ [LIGHT]: entity }) }
}

describe('entities store predictions', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })
  afterEach(() => vi.useRealTimers())

  it('shows the predicted state right away, before HA answers', async () => {
    const ha = fakeHa(light('off', null))
    const store = useEntitiesStore()
    store.connect(ha.conn)

    const call = store.callService('light', 'turn_on', {}, { entity_id: LIGHT }, { state: 'on' })
    expect(store.get(LIGHT)?.state).toBe('on')
    await call
    expect(ha.callService).toHaveBeenCalledOnce()
  })

  it('keeps the prediction through in-between updates until HA matches it', async () => {
    const ha = fakeHa(light('on', 100))
    const store = useEntitiesStore()
    store.connect(ha.conn)
    await store.callService(
      'light',
      'turn_on',
      { brightness_pct: 80 },
      { entity_id: LIGHT },
      { state: 'on', brightness: 204 },
    )

    // Hue groups report the old brightness first.
    ha.report(light('on', 100))
    expect(store.get(LIGHT)?.attributes.brightness).toBe(204)

    // Then the real value, rounded slightly differently.
    ha.report(light('on', 203))
    expect(store.get(LIGHT)?.attributes.brightness).toBe(203)

    // From here HA wins: e.g. someone dimmed it with the Hue app.
    ha.report(light('on', 50))
    expect(store.get(LIGHT)?.attributes.brightness).toBe(50)
  })

  it('goes back to the real state when the call fails', async () => {
    const ha = fakeHa(light('off', null))
    ha.callService.mockRejectedValueOnce(new Error('HA said no'))
    const store = useEntitiesStore()
    store.connect(ha.conn)

    await expect(
      store.callService('light', 'turn_on', {}, { entity_id: LIGHT }, { state: 'on' }),
    ).rejects.toThrow('HA said no')
    expect(store.get(LIGHT)?.state).toBe('off')
  })

  it('gives up on a prediction HA never confirms', async () => {
    const ha = fakeHa(light('off', null))
    const store = useEntitiesStore()
    store.connect(ha.conn)
    await store.callService('light', 'turn_on', {}, { entity_id: LIGHT }, { state: 'on' })

    vi.advanceTimersByTime(4_999)
    expect(store.get(LIGHT)?.state).toBe('on')
    vi.advanceTimersByTime(1)
    expect(store.get(LIGHT)?.state).toBe('off')
  })

  it('clears brightness when predicting off', async () => {
    const ha = fakeHa(light('on', 200))
    const store = useEntitiesStore()
    store.connect(ha.conn)
    await store.callService('light', 'turn_off', {}, { entity_id: LIGHT }, { state: 'off' })
    expect(store.get(LIGHT)?.attributes.brightness).toBeNull()
  })
})
