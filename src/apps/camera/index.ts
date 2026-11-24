import { type AppOf, defineAppType, entity, mockEntity, seconds } from '@/kit/define'

/** A live camera, full screen. Usually opened by an event, like a doorbell ring. */
const camera = defineAppType({
  type: 'camera',
  description: 'A live camera, full screen.',
  overlay: true,
  screen: () => import('./CameraOverlay.vue'),
  widget: {
    widgetScreen: () => import('./CameraWidget.vue'),
    sizes: ['1x1', '2x1', '2x2'],
  },
  entities: {
    camera: entity('camera'),
  },
  settings: {
    autoCloseSeconds: seconds(60, 'Closes after this long without a touch.'),
  },
  mock: ({ name, entities: e }) => [mockEntity(e.camera, 'idle', { friendly_name: name })],
})

export default camera

export type CameraApp = AppOf<typeof camera>
