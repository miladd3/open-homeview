import { defineStore } from 'pinia'
import { ref } from 'vue'

import { isFullScreen } from '@/apps'
import { useConfigStore } from './config'

/** An app shown full screen, over everything (a camera). */
export interface FullScreenApp {
  appId: string
  /** Set when an event opened it, e.g. "Someone is at the door". */
  message?: string
}

/** UI-level state that overlays the routed views. */
export const useKioskStore = defineStore('kiosk', () => {
  const activeRoomId = ref<string | null>(null)
  const activeAppId = ref<string | null>(null)
  const fullScreen = ref<FullScreenApp | null>(null)
  const screensaver = ref(false)

  function openRoom(roomId: string) {
    activeAppId.value = null
    activeRoomId.value = roomId
  }

  /**
   * Opens an app: full screen for types like camera, else as its dialog. Also wakes
   * the screen, so an event can open an app from the screensaver.
   */
  function openApp(appId: string, options: { message?: string } = {}) {
    const app = useConfigStore().home.apps.find((item) => item.id === appId)
    screensaver.value = false
    if (app && isFullScreen(app)) {
      closeDialogs()
      fullScreen.value = { appId, message: options.message }
      return
    }
    // A dialog opened under a full-screen app shows once that closes.
    activeRoomId.value = null
    activeAppId.value = appId
  }

  function closeDialogs() {
    activeRoomId.value = null
    activeAppId.value = null
  }

  function closeFullScreen() {
    fullScreen.value = null
  }

  function sleep() {
    if (fullScreen.value) return
    closeDialogs()
    screensaver.value = true
  }

  function wake() {
    screensaver.value = false
  }

  return {
    activeRoomId,
    activeAppId,
    fullScreen,
    screensaver,
    openRoom,
    openApp,
    closeDialogs,
    closeFullScreen,
    sleep,
    wake,
  }
})
