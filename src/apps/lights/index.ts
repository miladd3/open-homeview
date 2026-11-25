import {
  type AppOf,
  defineAppType,
  didYouMean,
  entity,
  type Gradient,
  gradient,
  icon,
  lightList,
  list,
  mockEntity,
  mockLight,
  object,
  optional,
  text,
  z,
} from '@/kit/define'

export interface SceneConfig {
  entityId: string
  /** Falls back to the scene's friendly name in HA. */
  name?: string
  /** Two colors used for the scene button gradient. */
  colors: Gradient
}

const DEFAULT_SCENE_COLORS: Gradient = ['#ffd27a', '#ff9f0a']

const scene = z
  .union([
    entity('scene', 'A scene. Shorthand for { entity: scene.x }.'),
    object({
      entity: entity('scene'),
      name: optional(text).meta({ description: "Defaults to the scene's name in Home Assistant." }),
      colors: gradient(DEFAULT_SCENE_COLORS),
    }),
  ])
  .transform((raw): SceneConfig =>
    typeof raw === 'string'
      ? { entityId: raw, colors: DEFAULT_SCENE_COLORS }
      : { entityId: raw.entity, name: raw.name, colors: raw.colors },
  )

const lightGroup = object({
  id: optional(text).meta({
    description: 'Unique ID, e.g. living-room. Defaults to the name in lower case with dashes.',
  }),
  name: text,
  icon: icon('lightbulb'),
  lights: lightList,
  scenes: list(scene),
}).transform((raw) => ({
  // Living room → living-room
  id:
    raw.id ??
    raw.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, ''),
  name: raw.name,
  icon: raw.icon,
  lightEntityIds: raw.lights,
  scenes: raw.scenes,
}))

/** A named set of lights with its scenes, e.g. a room. One section of the Lights app. */
export type LightGroup = z.output<typeof lightGroup>

/** Every light on its own, sorted into groups (rooms, floors, lamps vs. spots…). */
const lights = defineAppType({
  type: 'lights',
  description: 'Every light on its own, sorted into groups (usually rooms) with their scenes.',
  entities: {},
  settings: {
    groups: z
      .array(lightGroup)
      .min(1, 'needs at least one group')
      .superRefine((groups, ctx) =>
        groups.forEach((group, i) => {
          if (groups.findIndex((other) => other.id === group.id) !== i)
            ctx.addIssue({
              code: 'custom',
              path: [i, 'id'],
              message: `"${group.id}" is used twice`,
            })
        }),
      )
      .meta({ description: 'Sections of the app, e.g. one per room.' }),
  },
  screen: () => import('./LightsPanel.vue'),
  // Before `widget`, so its `check` sees the finished app (TypeScript infers in order).
  finish: (app, { colors }) => ({ ...app, colorPresets: colors }),
  // One group (a room), or the whole home without `group`.
  widget: {
    widgetScreen: () => import('./LightsWidget.vue'),
    quick: () => import('./LightsQuick.vue'),
    sizes: ['1x1', '2x1'],
    complication: true,
    settings: {
      group: optional(text).meta({
        description:
          'A group ID, e.g. living-room: tap toggles its lights. Leave out for the whole home.',
      }),
    },
    check: (app, { group }) => {
      const ids = app.groups.map((g) => g.id)
      if (group && !ids.includes(group))
        return `group "${group}" is not a group of ${app.id}.${didYouMean(group, ids)}`
    },
    variants: (app) => app.groups.map((g) => ({ group: g.id })),
  },
  // Every third light starts on. Names come from the entity ID (light.wall_lamp_1 → Wall lamp 1).
  mock: (app) => [
    ...app.groups
      .flatMap((group) => group.lightEntityIds)
      .map((id, i) => {
        const name = id.slice('light.'.length).replace(/_/g, ' ')
        return mockLight(id, name[0]!.toUpperCase() + name.slice(1), i % 3 === 0, 60, 2700)
      }),
    ...app.groups.flatMap((group) =>
      group.scenes.map((s) =>
        mockEntity(s.entityId, 'unknown', { friendly_name: s.name ?? s.entityId }),
      ),
    ),
  ],
})

export default lights

export type LightsApp = AppOf<typeof lights>
