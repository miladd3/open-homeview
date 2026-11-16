import { computed } from 'vue'

import type { VacuumApp } from '.'
import type { AppUi } from '../ui'
import { useVacuum } from './useVacuum'
import VacuumPanel from './VacuumPanel.vue'

export const vacuumUi: AppUi<VacuumApp> = {
  screen: VacuumPanel,
  status: (app) => {
    const vacuum = useVacuum(app)
    return computed(() => ({ text: vacuum.status.value, active: vacuum.isCleaning.value }))
  },
}
