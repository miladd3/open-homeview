import { type AppOf, defineAppType, entity, mockEntity } from '@/kit/define'

/** A door lock. Tapping the widget locks or unlocks it. */
const lock = defineAppType({
  type: 'lock',
  description: 'A door lock: tap locks or unlocks it.',
  icon: 'lock',
  entities: { entity: entity('lock') },
  widget: {
    widgetScreen: () => import('./LockWidget.vue'),
    sizes: ['1x1'],
    complication: true,
  },
  mock: ({ name, entities: e }) => [mockEntity(e.entity, 'locked', { friendly_name: name })],
})

export default lock
export type LockApp = AppOf<typeof lock>
