import { z } from 'zod'

import { icon, lightList, object, optional, text } from '@/config/fields'
import { mockLight } from '@/ha/mock/entity'
import { type AppOf, defineAppType } from '../define'

const lightGroup = object({
  name: text,
  icon: icon('lightbulb'),
  lights: lightList,
}).transform((raw) => ({ name: raw.name, icon: raw.icon, lightEntityIds: raw.lights }))

/** A named set of lights, shown as one section of the Lights app. */
export type LightGroup = z.output<typeof lightGroup>

/** Every light on its own, sorted into groups (rooms, floors, lamps vs. spots…). */
export const lights = defineAppType({
  type: 'lights',
  description: 'Every light on its own, sorted into groups.',
  entities: {},
  settings: {
    groups: optional(z.array(lightGroup).min(1, 'needs at least one group')).meta({
      description: 'Sections of the app. Leave out for one group per room.',
    }),
  },
  // Without `groups`, one group per room, using the rooms' lights.
  finish: ({ groups, ...app }, { rooms, problem }) => {
    if (!groups && !rooms.length)
      problem('groups', 'needs at least one group (or rooms to make them from)')
    return {
      ...app,
      groups:
        groups ??
        rooms.map(({ name, icon, lightEntityIds }): LightGroup => ({ name, icon, lightEntityIds })),
    }
  },
  // Every third light starts on. Names come from the entity ID (light.wall_lamp_1 → Wall lamp 1).
  mock: (app) =>
    app.groups
      .flatMap((group) => group.lightEntityIds)
      .map((id, i) => {
        const name = id.slice('light.'.length).replace(/_/g, ' ')
        return mockLight(id, name[0]!.toUpperCase() + name.slice(1), i % 3 === 0, 60, 2700)
      }),
})

export type LightsApp = AppOf<typeof lights>
