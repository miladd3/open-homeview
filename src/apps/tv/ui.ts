import type { TvApp } from '.'
import { onOffStatus } from '../status'
import type { AppUi } from '../ui'
import TvPanel from './TvPanel.vue'

export const tvUi: AppUi<TvApp> = {
  screen: TvPanel,
  status: (app) => onOffStatus(app.entities.player),
}
