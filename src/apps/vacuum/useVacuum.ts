import { computed, type MaybeRefOrGetter, toValue } from 'vue'

import { useEntity, useService } from '@/kit'
import type { VacuumApp } from '.'

function humanize(value: string) {
  const text = value.replace(/_/g, ' ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function useVacuum(app: MaybeRefOrGetter<VacuumApp>) {
  const callService = useService()
  const ids = () => toValue(app).entities
  const vacuum = useEntity(() => ids().vacuum)
  const progressSensor = useEntity(() => ids().progress)
  const batterySensor = useEntity(() => ids().battery)
  const statusSensor = useEntity(() => ids().status)

  const state = computed(() => vacuum.value?.state ?? 'unavailable')
  const progress = computed(() => Number(progressSensor.value?.state ?? 0))
  const battery = computed(
    () => batterySensor.value?.state ?? vacuum.value?.attributes.battery_level,
  )
  const status = computed(() => humanize(statusSensor.value?.state ?? state.value))

  return {
    state,
    progress,
    battery,
    status,
    isCleaning: computed(() => state.value === 'cleaning'),
    isPaused: computed(() => state.value === 'paused'),
    press: (entityId: string) => callService('button', 'press', {}, { entity_id: entityId }),
    command: (service: string) => callService('vacuum', service, {}, { entity_id: ids().vacuum }),
  }
}
