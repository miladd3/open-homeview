import type { LightsApp } from '.'
import type { AppUi } from '../ui'
import LightsPanel from './LightsPanel.vue'

// No chip: the Home screen's Lights chip already shows how many lights are on.
export const lightsUi: AppUi<LightsApp> = {
  screen: LightsPanel,
}
