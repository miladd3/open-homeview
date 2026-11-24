import { type AppOf, defineAppType, entity, mockEntity } from '@/kit/define'

/** One sensor reading, like the outdoor temperature. */
const sensor = defineAppType({
  type: 'sensor',
  description: 'One sensor reading.',
  icon: 'gauge',
  entities: { entity: entity('sensor') },
  widget: {
    widgetScreen: () => import('./SensorWidget.vue'),
    sizes: ['1x1', '2x1'],
    complication: true,
  },
  mock: ({ name, entities: e }) => [
    e.entity.includes('humidity')
      ? mockEntity(e.entity, '64', { friendly_name: name, unit_of_measurement: '%' })
      : mockEntity(e.entity, '12.5', { friendly_name: name, unit_of_measurement: '°C' }),
  ],
})

export default sensor
export type SensorApp = AppOf<typeof sensor>
