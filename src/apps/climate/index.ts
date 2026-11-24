import { type AppOf, defineAppType, entity, mockEntity } from '@/kit/define'

/** A thermostat: the room temperature, and ⌄ ⌃ for the target in the 2x2 size. */
const climate = defineAppType({
  type: 'climate',
  description: 'A thermostat. The 2x2 size has buttons to change the target.',
  icon: 'thermometer',
  entities: { entity: entity('climate') },
  widget: {
    widgetScreen: () => import('./ClimateWidget.vue'),
    sizes: ['2x2', '1x1'],
    complication: true,
  },
  mock: ({ name, entities: e }) => [
    mockEntity(e.entity, 'heat', {
      friendly_name: name,
      current_temperature: 21.5,
      temperature: 22,
      target_temp_step: 0.5,
      hvac_action: 'heating',
      temperature_unit: '°C',
    }),
  ],
})

export default climate
export type ClimateApp = AppOf<typeof climate>
