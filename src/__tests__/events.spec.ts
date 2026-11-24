import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { effectScope, nextTick } from 'vue'

import { parseHomeConfig } from '@/config/home'
import { useEvents } from '@/composables/useEvents'
import { MockConnection } from '@/ha/mock/MockConnection'
import { useConfigStore } from '@/stores/config'
import { useEntitiesStore } from '@/stores/entities'
import { useKioskStore } from '@/stores/kiosk'
import { testConfig } from './testConfig'

function start(config = testConfig) {
  useConfigStore().set(config)
  const mock = new MockConnection(config, 0)
  useEntitiesStore().connect(mock)
  const kiosk = useKioskStore()
  const fired: string[] = []
  const scope = effectScope()
  scope.run(() =>
    useEvents((event) => {
      fired.push(event.entityId)
      kiosk.openApp(event.appId, { message: event.message })
    }),
  )
  return { mock, kiosk, fired, scope }
}

describe('events', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('a doorbell ring opens the camera over standby and apps', async () => {
    const { mock, kiosk, fired, scope } = start()
    kiosk.openApp('lights')
    kiosk.sleep()

    mock.fireEvent(testConfig.events[0]!)
    await nextTick()

    expect(fired).toEqual(['event.front_door_doorbell'])
    expect(kiosk.overlay).toEqual({ appId: 'front-door', message: 'Someone is at the door' })
    expect(kiosk.standby).toBe(false)
    expect(kiosk.activeAppId).toBeNull()

    // Standby waits while the camera is open.
    kiosk.sleep()
    expect(kiosk.standby).toBe(false)
    scope.stop()
  })

  it('skips event types that are not listed', async () => {
    const { mock, fired, scope } = start()
    const ring = testConfig.events[0]!
    mock.fireEvent({ ...ring, eventTypes: ['press'] })
    await nextTick()
    expect(fired).toEqual([])
    scope.stop()
  })

  it('a state event fires when the entity changes to `to`, and opens a sheet app', async () => {
    const config = parseHomeConfig({
      apps: [
        {
          id: 'adguard',
          type: 'switch',
          name: 'AdGuard',
          switch: 'switch.adguard',
        },
      ],
      events: [{ entity: 'binary_sensor.motion', to: 'on', open: 'adguard' }],
    })
    const { mock, kiosk, fired, scope } = start(config)
    kiosk.sleep()

    mock.fireEvent(config.events[0]!)
    await nextTick()

    expect(fired).toEqual(['binary_sensor.motion'])
    expect(kiosk.activeAppId).toBe('adguard')
    expect(kiosk.overlay).toBeNull()
    expect(kiosk.standby).toBe(false)
    scope.stop()
  })
})
