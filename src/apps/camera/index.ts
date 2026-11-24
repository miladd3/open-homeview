import { type AppOf, defineAppType, entity, mockEntity, seconds } from '@/kit/define'

/** A live camera, full screen. Usually opened by an event, like a doorbell ring. */
export const camera = defineAppType({
  type: 'camera',
  description: 'A live camera, full screen.',
  overlay: true,
  screen: () => import('./CameraOverlay.vue'),
  entities: {
    camera: entity('camera'),
  },
  settings: {
    autoCloseSeconds: seconds(60, 'Closes after this long without a touch.'),
  },
  mock: ({ name, entities: e }) => [mockEntity(e.camera, 'idle', { friendly_name: name })],
})

export type CameraApp = AppOf<typeof camera>
