import type { CameraApp } from '.'
import type { AppUi } from '../ui'
import CameraOverlay from './CameraOverlay.vue'

export const cameraUi: AppUi<CameraApp> = {
  screen: CameraOverlay,
}
