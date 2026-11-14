import { defineStore } from 'pinia'
import { ref } from 'vue'

import { useConfigStore } from './config'

/** A camera app shown full screen, over everything. */
export interface OpenCamera {
  appId: string
  /** Set when an event opened it, e.g. "Someone is at the door". */
  message?: string
}

/** UI-level state that overlays the routed views. */
export const useKioskStore = defineStore('kiosk', () => {
  const activeRoomId = ref<string | null>(null)
  const activeAppId = ref<string | null>(null)
  const camera = ref<OpenCamera | null>(null)
  const screensaver = ref(false)

  function openRoom(roomId: string) {
    activeAppId.value = null
    activeRoomId.value = roomId
  }

  /**
   * Opens an app: a camera full screen, anything else as its dialog. Also wakes
   * the screen, so an event can open an app from the screensaver.
   */
  function openApp(appId: string, options: { message?: string } = {}) {
    const app = useConfigStore().home.apps.find((item) => item.id === appId)
    screensaver.value = false
    if (app?.type === 'camera') {
      closeDialogs()
      camera.value = { appId, message: options.message }
      return
    }
    // A dialog under a camera stays hidden until the camera closes.
    activeRoomId.value = null
    activeAppId.value = appId
  }

  function closeDialogs() {
    activeRoomId.value = null
    activeAppId.value = null
  }

  function closeCamera() {
    camera.value = null
  }

  function sleep() {
    if (camera.value) return
    closeDialogs()
    screensaver.value = true
  }

  function wake() {
    screensaver.value = false
  }

  return {
    activeRoomId,
    activeAppId,
    camera,
    screensaver,
    openRoom,
    openApp,
    closeDialogs,
    closeCamera,
    sleep,
    wake,
  }
})
