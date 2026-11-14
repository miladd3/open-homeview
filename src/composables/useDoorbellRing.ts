import { computed, watch } from 'vue'

import { useConfigStore } from '@/stores/config'
import { useEntitiesStore } from '@/stores/entities'

/**
 * HA event entities change state to the event timestamp each time they fire,
 * so a new timestamp with `event_type: ring` means someone pressed the button.
 */
export function useDoorbellRing(onRing: () => void) {
  const store = useEntitiesStore()
  const config = useConfigStore()
  const ring = computed(() => store.get(config.home.doorbell?.ringEntityId))

  watch(
    () => ring.value?.state,
    (state, previous) => {
      if (!state || state === previous || previous === undefined) return
      if (state === 'unknown' || state === 'unavailable') return
      if (ring.value?.attributes.event_type === 'ring') onRing()
    },
  )
}
