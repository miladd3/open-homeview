import { entity, seconds } from '@/config/fields'
import { mockEntity } from '@/ha/mock/entity'
import { type AppOf, defineAppType } from '../define'

/** A live camera, full screen. Usually opened by an event, like a doorbell ring. */
export const camera = defineAppType({
  type: 'camera',
  description: 'A live camera, full screen.',
  fullScreen: true,
  entities: {
    camera: entity('camera'),
  },
  settings: {
    autoCloseSeconds: seconds(60, 'Closes after this long without a touch.'),
  },
  mock: ({ name, entities: e }) => [mockEntity(e.camera, 'idle', { friendly_name: name })],
})

export type CameraApp = AppOf<typeof camera>
