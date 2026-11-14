import { createPinia, setActivePinia } from 'pinia'
import { describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick } from 'vue'

import { useDoorbellRing } from '@/composables/useDoorbellRing'
import { MockConnection } from '@/ha/mock/MockConnection'
import { useConfigStore } from '@/stores/config'
import { useEntitiesStore } from '@/stores/entities'
import { useKioskStore } from '@/stores/kiosk'
import { testConfig } from './testConfig'

describe('doorbell ring', () => {
  it('opens the doorbell overlay over the screensaver and dialogs', async () => {
    setActivePinia(createPinia())
    useConfigStore().set(testConfig)
    const mock = new MockConnection(testConfig, 0)
    useEntitiesStore().connect(mock)
    const kiosk = useKioskStore()
    kiosk.openRoom('bedroom')
    kiosk.sleep()

    const onRing = vi.fn<() => void>(() => kiosk.openDoorbell('ring'))
    const scope = effectScope()
    scope.run(() => useDoorbellRing(onRing))

    mock.simulateDoorbellRing()
    await nextTick()

    expect(onRing).toHaveBeenCalledOnce()
    expect(kiosk.doorbell).toEqual({ reason: 'ring' })
    expect(kiosk.screensaver).toBe(false)
    expect(kiosk.activeRoomId).toBeNull()
    scope.stop()
  })
})
