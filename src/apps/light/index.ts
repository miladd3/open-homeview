import { type AppOf, defineAppType, entity, mockLight } from '@/kit/define'

/** One light. Tap toggles it; long-press for brightness. */
const light = defineAppType({
  type: 'light',
  description: 'One light: tap toggles it, long-press sets its brightness.',
  icon: 'lightbulb',
  entities: { entity: entity('light') },
  widget: {
    widgetScreen: () => import('./LightWidget.vue'),
    quick: () => import('./LightQuick.vue'),
    sizes: ['1x1'],
    complication: true,
  },
  mock: ({ name, entities: e }) => [mockLight(e.entity, name, true, 80, 2700)],
})

export default light
export type LightApp = AppOf<typeof light>
