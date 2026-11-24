import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { useKioskStore } from '../kiosk'

describe('kiosk store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('opens an app with the part to focus, and forgets it on close', () => {
    const kiosk = useKioskStore()
    kiosk.openApp('lights', { focus: 'bedroom' })
    expect(kiosk.activeAppId).toBe('lights')
    expect(kiosk.focus).toBe('bedroom')

    kiosk.openApp('vacuum')
    expect(kiosk.focus).toBeUndefined()
    kiosk.closeApp()
    expect(kiosk.activeAppId).toBeNull()
  })

  it('closes the app when standby starts', () => {
    const kiosk = useKioskStore()
    kiosk.openApp('tv')
    kiosk.sleep()
    expect(kiosk.activeAppId).toBeNull()
    expect(kiosk.standby).toBe(true)
  })
})
