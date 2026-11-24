import { onBeforeUnmount, onMounted } from 'vue'

import { fetchConfigSource, parseConfigSource } from '@/config/load'
import { useConfigStore } from '@/stores/config'

const CHECK_MS = 60_000

/**
 * Polls kiosk.yaml every minute and reloads the page when it changes, so a config edit reaches
 * the wall screen without touching the Pi. A broken edit is logged and ignored;
 * the kiosk keeps running on the last good config.
 */
export function useConfigReload() {
  const config = useConfigStore()
  let timer: ReturnType<typeof setInterval> | undefined

  async function check() {
    try {
      const { text } = await fetchConfigSource()
      if (text === config.source) return
      parseConfigSource(text)
      window.location.reload()
    } catch (error) {
      console.error('[config] not reloading:', error)
    }
  }

  onMounted(() => {
    timer = setInterval(check, CHECK_MS)
  })
  onBeforeUnmount(() => clearInterval(timer))
}
