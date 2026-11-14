import { watch } from 'vue'

import type { EventConfig } from '@/config/home'
import { useConfigStore } from '@/stores/config'
import { useEntitiesStore } from '@/stores/entities'

/**
 * Watches the `events:` in kiosk.yaml and calls `onEvent` when one fires.
 *
 * HA `event.*` entities change state to the event's timestamp each time they
 * fire, so any new state counts (optionally filtered by `event_type`). Other
 * entities fire when their state changes to `to`. The first state HA sends is
 * never an event, so a kiosk reload doesn't replay the last ring.
 */
export function useEvents(onEvent: (event: EventConfig) => void) {
  const store = useEntitiesStore()

  for (const event of useConfigStore().home.events) {
    watch(
      () => store.get(event.entityId)?.state,
      (state, previous) => {
        if (!state || state === previous || previous === undefined) return
        if (event.to !== undefined) {
          if (state === event.to) onEvent(event)
          return
        }
        if (state === 'unknown' || state === 'unavailable') return
        const type = store.get(event.entityId)?.attributes.event_type
        if (!event.eventTypes.length || event.eventTypes.includes(String(type))) onEvent(event)
      },
    )
  }
}
