import { computed } from 'vue'

import { useConfigStore } from '@/stores/config'
import { useEntitiesStore } from '@/stores/entities'

const ENTITY_ID = /^[a-z_]+\.[a-z0-9_]+$/

/** Every entity ID anywhere in the config, found by shape like the server does. */
export function configEntityIds(value: unknown, found = new Set<string>()): Set<string> {
  if (typeof value === 'string') {
    if (ENTITY_ID.test(value)) found.add(value)
  } else if (Array.isArray(value)) {
    for (const item of value) configEntityIds(item, found)
  } else if (value && typeof value === 'object') {
    for (const item of Object.values(value)) configEntityIds(item, found)
  }
  return found
}

/**
 * Entity IDs in kiosk.yaml that Home Assistant doesn't know, usually typos. They
 * would otherwise just show as "Unavailable". Empty until HA has sent its states.
 */
export function useMissingEntities() {
  const config = useConfigStore()
  const store = useEntitiesStore()
  const ids = [...configEntityIds(config.home)].sort()

  return computed(() => {
    if (store.status !== 'connected' || !Object.keys(store.entities).length) return []
    return ids.filter((id) => !store.entities[id])
  })
}
