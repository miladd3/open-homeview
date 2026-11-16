import type { SwitchApp } from '.'
import { onOffStatus } from '../status'
import type { AppUi } from '../ui'
import SwitchPanel from './SwitchPanel.vue'

export const switchUi: AppUi<SwitchApp> = {
  screen: SwitchPanel,
  status: (app) => onOffStatus(app.entities.switch),
}
