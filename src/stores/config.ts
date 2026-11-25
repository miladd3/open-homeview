import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'

import { type HomeConfig, parseHomeConfig } from '@/config/home'
import { type ConfigSource, fetchConfigSource, parseConfigSource } from '@/config/load'

/** The parsed kiosk.yaml. Loaded once before the app mounts; a change reloads the page. */
export const useConfigStore = defineStore('config', () => {
  const home = shallowRef<HomeConfig>(parseHomeConfig({}))
  /** What the current config came from, to detect edits. */
  const source = ref<Pick<ConfigSource, 'text' | 'layout'>>({ text: '' })
  /** Showing the example config because there is no kiosk.yaml yet. */
  const isExample = ref(false)
  /** Editing the dashboard on the screen needs kiosk.yaml's `editPin`. */
  const pinSet = ref(false)
  /** Runtime packs that were skipped, and why. */
  const addonWarnings = ref<string[]>([])
  const layoutProblem = ref<string>()
  /** Problems that don't stop the kiosk: skipped packs, an ignored layout.yaml. */
  const warnings = computed(() => [
    ...addonWarnings.value,
    ...(layoutProblem.value ? [layoutProblem.value] : []),
  ])

  async function load() {
    const fetched = await fetchConfigSource()
    const parsed = parseConfigSource(fetched.text, fetched.layout)
    set(parsed.home, fetched)
    isExample.value = fetched.isExample
    pinSet.value = fetched.pinSet
    layoutProblem.value = parsed.layoutProblem
  }

  function set(config: HomeConfig, from: Pick<ConfigSource, 'text' | 'layout'> = { text: '' }) {
    home.value = config
    source.value = { text: from.text, layout: from.layout }
  }

  return { home, source, isExample, pinSet, addonWarnings, warnings, load, set }
})
