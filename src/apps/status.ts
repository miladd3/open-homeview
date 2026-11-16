import { computed, type ComputedRef } from 'vue'

import { useEntitiesStore } from '@/stores/entities'

export interface AppStatus {
  text: string
  /** The app is doing something worth highlighting (cleaning, TV on…). */
  active: boolean
}

/** "On" / "Off" from an entity's state. */
export function onOffStatus(entityId: string): ComputedRef<AppStatus> {
  const store = useEntitiesStore()
  return computed(() => {
    const on = store.get(entityId)?.state === 'on'
    return { text: on ? 'On' : 'Off', active: on }
  })
}
