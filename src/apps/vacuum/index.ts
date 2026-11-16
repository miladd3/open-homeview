import { entity, optional } from '@/config/fields'
import { mockEntity } from '@/ha/mock/entity'
import { type AppOf, defineAppType } from '../define'

/** A robot vacuum: start, pause, dock, plus optional cleaning buttons and sensors. */
export const vacuum = defineAppType({
  type: 'vacuum',
  description: 'A robot vacuum.',
  entities: {
    vacuum: entity('vacuum'),
    fullClean: optional(entity(undefined, 'Button that starts a full clean (vacuum + mop).')),
    fullVacuum: optional(entity(undefined, 'Button that starts a full vacuum.')),
    progress: optional(entity('sensor', 'Cleaning progress in %.')),
    status: optional(entity('sensor', 'Detailed status text.')),
    battery: optional(entity('sensor', 'Battery level in %.')),
  },
  mock: ({ name, entities: e }) => [
    mockEntity(e.vacuum, 'docked', { friendly_name: name, fan_speed: 'balanced' }),
    ...(e.fullClean
      ? [mockEntity(e.fullClean, 'unknown', { friendly_name: 'Full cleaning' })]
      : []),
    ...(e.fullVacuum
      ? [mockEntity(e.fullVacuum, 'unknown', { friendly_name: 'Full vacuum' })]
      : []),
    ...(e.progress ? [mockEntity(e.progress, '0', { unit_of_measurement: '%' })] : []),
    ...(e.status ? [mockEntity(e.status, 'charging_complete')] : []),
    ...(e.battery ? [mockEntity(e.battery, '100', { unit_of_measurement: '%' })] : []),
  ],
})

export type VacuumApp = AppOf<typeof vacuum>
