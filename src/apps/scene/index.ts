import { type AppOf, defineAppType, entity, mockEntity } from '@/kit/define'

/** One Home Assistant scene. Tapping the widget runs it. */
const scene = defineAppType({
  type: 'scene',
  description: 'Runs one scene.',
  icon: 'sparkles',
  entities: { entity: entity('scene') },
  widget: {
    widgetScreen: () => import('./SceneWidget.vue'),
    sizes: ['1x1', '2x1'],
    complication: true,
  },
  mock: ({ name, entities: e }) => [mockEntity(e.entity, 'unknown', { friendly_name: name })],
})

export default scene
export type SceneApp = AppOf<typeof scene>
