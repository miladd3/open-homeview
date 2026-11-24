import { onOffStatus } from '@/kit'
import { type AppOf, defineAppType, entity, list, mockEntity } from '@/kit/define'

/** A big on/off button for any on/off entity, with optional sensor readings. */
const switchApp = defineAppType({
  type: 'switch',
  description: 'Any on/off entity, with optional sensors.',
  entities: {
    switch: entity(undefined, 'Any on/off entity (switch, input_boolean, fan…).'),
    sensors: list(entity('sensor')),
  },
  screen: () => import('./SwitchPanel.vue'),
  status: (app) => onOffStatus(app.entities.switch),
  mock: ({ name, entities: e }) => [
    mockEntity(e.switch, 'on', { friendly_name: name }),
    ...e.sensors.map((id) =>
      mockEntity(id, '4.2', {
        friendly_name: 'Average processing speed',
        unit_of_measurement: 'ms',
      }),
    ),
  ],
})

export default switchApp

export type SwitchApp = AppOf<typeof switchApp>
