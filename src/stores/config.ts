import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'

import { type HomeConfig, parseHomeConfig } from '@/config/home'
import { fetchConfigSource, parseConfigSource } from '@/config/load'

/** The parsed kiosk.yaml. Loaded once before the app mounts; a change reloads the page. */
export const useConfigStore = defineStore('config', () => {
  const home = shallowRef<HomeConfig>(parseHomeConfig({}))
  /** Raw YAML the current config came from, to detect edits. */
  const source = ref('')
  /** Showing the example config because there is no kiosk.yaml yet. */
  const isExample = ref(false)

  async function load() {
    const fetched = await fetchConfigSource()
    set(parseConfigSource(fetched.text), fetched.text)
    isExample.value = fetched.isExample
  }

  function set(config: HomeConfig, text = '') {
    home.value = config
    source.value = text
  }

  return { home, source, isExample, load, set }
})
