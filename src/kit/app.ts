import { computed, type ComputedRef, type MaybeRefOrGetter, toValue } from 'vue'

import type { AppStatus } from '@/kit/define'
import { useEntitiesStore } from '@/stores/entities'

/** A Home Assistant entity, live. Undefined while unknown. */
export function useEntity(entityId: MaybeRefOrGetter<string | undefined>) {
  const store = useEntitiesStore()
  return computed(() => store.get(toValue(entityId)))
}

/** Several entities, live. Ones Home Assistant doesn't know are left out. */
export function useEntities(entityIds: MaybeRefOrGetter<string[]>) {
  const store = useEntitiesStore()
  return computed(() => toValue(entityIds).flatMap((id) => store.get(id) ?? []))
}

/**
 * Calls a Home Assistant service. Pass a prediction (`{ state: 'on' }`) to show
 * the result right away instead of after the round trip (see stores/entities.ts).
 */
export function useService() {
  return useEntitiesStore().callService
}

/** "On" / "Off" from an entity's state. */
export function onOffStatus(entityId: string): ComputedRef<AppStatus> {
  const entity = useEntity(entityId)
  return computed(() => {
    const on = entity.value?.state === 'on'
    return { text: on ? 'On' : 'Off', active: on }
  })
}
