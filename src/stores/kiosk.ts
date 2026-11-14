import { defineStore } from 'pinia'
import { ref } from 'vue'

export type DoorbellReason = 'ring' | 'manual'

/** UI-level state that overlays the routed views. */
export const useKioskStore = defineStore('kiosk', () => {
  const activeRoomId = ref<string | null>(null)
  const activeAppId = ref<string | null>(null)
  const doorbell = ref<{ reason: DoorbellReason } | null>(null)
  const screensaver = ref(false)

  function openRoom(roomId: string) {
    activeAppId.value = null
    activeRoomId.value = roomId
  }

  function openApp(appId: string) {
    activeRoomId.value = null
    activeAppId.value = appId
  }

  function closeDialogs() {
    activeRoomId.value = null
    activeAppId.value = null
  }

  function openDoorbell(reason: DoorbellReason) {
    screensaver.value = false
    closeDialogs()
    doorbell.value = { reason }
  }

  function closeDoorbell() {
    doorbell.value = null
  }

  function sleep() {
    if (doorbell.value) return
    closeDialogs()
    screensaver.value = true
  }

  function wake() {
    screensaver.value = false
  }

  return {
    activeRoomId,
    activeAppId,
    doorbell,
    screensaver,
    openRoom,
    openApp,
    closeDialogs,
    openDoorbell,
    closeDoorbell,
    sleep,
    wake,
  }
})
