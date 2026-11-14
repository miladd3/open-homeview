import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { testConfig, vacuumApp } from '@/__tests__/testConfig'
import type { HassEntities } from '@/ha/types'
import { MockConnection } from '../MockConnection'

const vacuum = vacuumApp.entities
const doorbellRing = testConfig.doorbell!.ringEntityId!

describe('MockConnection', () => {
  let conn: MockConnection
  let latest: HassEntities

  beforeEach(() => {
    conn = new MockConnection(testConfig, 0)
    conn.subscribeEntities((next) => (latest = next))
  })

  afterEach(() => conn.dispose())

  it('emits the initial state on subscribe', () => {
    expect(latest['light.living_room']?.state).toBe('on')
  })

  it('toggles a light and clears its brightness when off', async () => {
    await conn.callService('light', 'toggle', {}, { entity_id: 'light.living_room' })
    expect(latest['light.living_room']?.state).toBe('off')
    expect(latest['light.living_room']?.attributes.brightness).toBeNull()

    await conn.callService('light', 'toggle', {}, { entity_id: 'light.living_room' })
    expect(latest['light.living_room']?.state).toBe('on')
    expect(latest['light.living_room']?.attributes.brightness).toBe(255)
  })

  it('sets brightness from a percentage', async () => {
    await conn.callService(
      'light',
      'turn_on',
      { brightness_pct: 50 },
      { entity_id: 'light.bedroom' },
    )
    expect(latest['light.bedroom']?.attributes.brightness).toBe(128)
  })

  it('applies a scene to its room light', async () => {
    await conn.callService('scene', 'turn_on', {}, { entity_id: 'scene.living_room_red' })
    const light = latest['light.living_room']!
    expect(light.attributes.rgb_color).toEqual([255, 77, 77])
    expect(light.attributes.color_mode).toBe('xy')
  })

  it('runs the vacuum to completion after a full clean', async () => {
    vi.useFakeTimers()
    await conn.callService('button', 'press', {}, { entity_id: vacuum.fullClean! })
    expect(latest[vacuum.vacuum]?.state).toBe('cleaning')

    vi.advanceTimersByTime(50_000)
    expect(latest[vacuum.progress!]?.state).toBe('100')
    expect(latest[vacuum.vacuum]?.state).toBe('returning')

    vi.advanceTimersByTime(3_000)
    expect(latest[vacuum.vacuum]?.state).toBe('docked')
    vi.useRealTimers()
  })

  it('toggles any on/off entity through homeassistant.toggle', async () => {
    await conn.callService(
      'homeassistant',
      'toggle',
      {},
      { entity_id: 'switch.adguard_home_protection' },
    )
    expect(latest['switch.adguard_home_protection']?.state).toBe('off')
  })

  it('fires a doorbell ring event', () => {
    conn.simulateDoorbellRing()
    const ring = latest[doorbellRing]!
    expect(ring.attributes.event_type).toBe('ring')
    expect(Number.isNaN(Date.parse(ring.state))).toBe(false)
  })
})
