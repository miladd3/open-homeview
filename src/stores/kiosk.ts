import { defineStore } from 'pinia'
import { ref } from 'vue'

import { isOverlay } from '@/apps'
import { useConfigStore } from './config'

/** An app shown over everything, even the screensaver (a camera). */
export interface Overlay {
  appId: string
  /** Set when an event opened it, e.g. "Someone is at the door". */
  message?: string
}

export interface OpenAppOptions {
  /** Shown by overlay apps, e.g. "Someone is at the door". */
  message?: string
  /** A part of the app's screen to scroll to, e.g. a Lights group. */
  focus?: string
}

/** UI-level state that overlays the routed views. */
export const useKioskStore = defineStore('kiosk', () => {
  const activeAppId = ref<string | null>(null)
  const focus = ref<string>()
  const overlay = ref<Overlay | null>(null)
  const screensaver = ref(false)

  /**
   * Opens an app's screen: over everything for types like camera, else as a
   * sheet. Also wakes the screen, so an event can open an app from the screensaver.
   */
  function openApp(appId: string, options: OpenAppOptions = {}) {
    const app = useConfigStore().home.apps.find((item) => item.id === appId)
    screensaver.value = false
    if (app && isOverlay(app)) {
      closeApp()
      overlay.value = { appId, message: options.message }
      return
    }
    // A sheet opened under an overlay app shows once that closes.
    activeAppId.value = appId
    focus.value = options.focus
  }

  function closeApp() {
    activeAppId.value = null
    focus.value = undefined
  }

  function closeOverlay() {
    overlay.value = null
  }

  function sleep() {
    if (overlay.value) return
    closeApp()
    screensaver.value = true
  }

  function wake() {
    screensaver.value = false
  }

  return {
    activeAppId,
    focus,
    overlay,
    screensaver,
    openApp,
    closeApp,
    closeOverlay,
    sleep,
    wake,
  }
})
