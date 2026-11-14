import { onBeforeUnmount, onMounted } from 'vue'

import { fetchConfigSource, parseConfigSource } from '@/config/load'
import { useConfigStore } from '@/stores/config'

/**
 * Polls kiosk.yaml and reloads the page when it changes, so a config edit reaches
 * the wall screen without touching the Pi. A broken edit is logged and ignored;
 * the kiosk keeps running on the last good config.
 */
export function useConfigReload() {
  const config = useConfigStore()
  let timer: ReturnType<typeof setInterval> | undefined

  async function check() {
    try {
      const source = await fetchConfigSource()
      if (source === config.source) return
      parseConfigSource(source)
      window.location.reload()
    } catch (error) {
      console.error('[config] not reloading:', error)
    }
  }

  onMounted(() => {
    timer = setInterval(check, config.home.timings.configCheckMs)
  })
  onBeforeUnmount(() => clearInterval(timer))
}
