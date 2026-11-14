import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'

import { type HomeConfig, parseHomeConfig } from '@/config/home'
import { fetchConfigSource, parseConfigSource } from '@/config/load'

/** The parsed kiosk.yaml. Loaded once before the app mounts; a change reloads the page. */
export const useConfigStore = defineStore('config', () => {
  const home = shallowRef<HomeConfig>(parseHomeConfig({}))
  /** Raw YAML the current config came from, to detect edits. */
  const source = ref('')

  async function load() {
    const text = await fetchConfigSource()
    set(parseConfigSource(text), text)
  }

  function set(config: HomeConfig, text = '') {
    home.value = config
    source.value = text
  }

  return { home, source, load, set }
})
