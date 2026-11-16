import { computed, type MaybeRefOrGetter, toValue } from 'vue'

import type { VacuumApp } from '.'
import { useEntitiesStore } from '@/stores/entities'

function humanize(value: string) {
  const text = value.replace(/_/g, ' ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function useVacuum(app: MaybeRefOrGetter<VacuumApp>) {
  const store = useEntitiesStore()
  const ids = () => toValue(app).entities

  const state = computed(() => store.get(ids().vacuum)?.state ?? 'unavailable')
  const progress = computed(() => Number(store.get(ids().progress)?.state ?? 0))
  const battery = computed(
    () => store.get(ids().battery)?.state ?? store.get(ids().vacuum)?.attributes.battery_level,
  )
  const status = computed(() => humanize(store.get(ids().status)?.state ?? state.value))

  return {
    state,
    progress,
    battery,
    status,
    isCleaning: computed(() => state.value === 'cleaning'),
    isPaused: computed(() => state.value === 'paused'),
    press: (entityId: string) => store.callService('button', 'press', {}, { entity_id: entityId }),
    command: (service: string) =>
      store.callService('vacuum', service, {}, { entity_id: ids().vacuum }),
  }
}
