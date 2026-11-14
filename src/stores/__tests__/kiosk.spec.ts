import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { useKioskStore } from '../kiosk'

describe('kiosk store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('shows one dialog at a time', () => {
    const kiosk = useKioskStore()
    kiosk.openRoom('bedroom')
    kiosk.openApp('vacuum')
    expect(kiosk.activeRoomId).toBeNull()
    expect(kiosk.activeAppId).toBe('vacuum')

    kiosk.openRoom('office')
    expect(kiosk.activeAppId).toBeNull()
    expect(kiosk.activeRoomId).toBe('office')
  })

  it('closes dialogs when the screensaver starts', () => {
    const kiosk = useKioskStore()
    kiosk.openApp('tv')
    kiosk.sleep()
    expect(kiosk.activeAppId).toBeNull()
    expect(kiosk.screensaver).toBe(true)
  })
})
