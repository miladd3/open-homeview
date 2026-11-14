import { computed, type ComputedRef } from 'vue'

import type { AppConfig } from '@/config/home'
import { useEntitiesStore } from '@/stores/entities'
import { useVacuum } from './useVacuum'

export interface AppStatus {
  text: string
  /** The app is doing something worth highlighting (cleaning, TV on…). */
  active: boolean
}

/** One-line live status of an app, for the Home screen chips. `null` if it has none. */
export function useAppStatus(app: AppConfig): ComputedRef<AppStatus | null> {
  const store = useEntitiesStore()

  switch (app.type) {
    case 'vacuum': {
      const vacuum = useVacuum(app)
      return computed(() => ({ text: vacuum.status.value, active: vacuum.isCleaning.value }))
    }
    case 'tv':
      return computed(() => {
        const on = store.get(app.entities.player)?.state === 'on'
        return { text: on ? 'On' : 'Off', active: on }
      })
    case 'switch':
      return computed(() => {
        const on = store.get(app.entities.switch)?.state === 'on'
        return { text: on ? 'On' : 'Off', active: on }
      })
    // The Home screen's Lights chip already shows how many lights are on.
    case 'lights':
    case 'camera':
      return computed(() => null)
  }
}
