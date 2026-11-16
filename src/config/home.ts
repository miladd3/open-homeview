// Typed shape of `kiosk.yaml`, which is fetched at startup. The YAML is the single
// place to change when rooms, apps or HA entity IDs change; this file only
// validates it and fills in defaults.
//
// The Zod schema below is the one definition of the file: it checks the YAML at
// runtime, and `npm run schema` turns it into kiosk.schema.json for editor
// autocomplete. Descriptions (`.meta`) show up as hover help in the editor.

import { z } from 'zod'

import { type AppConfig, appSchema, finishApp } from '@/apps'
import type { Rgb } from '@/ha/lightColor'
import {
  didYouMean,
  entity,
  type Gradient,
  gradient,
  icon,
  lightList,
  list,
  object,
  optional,
  seconds,
  text,
} from './fields'
import type { IconName } from './icons'

export type { Gradient } from './fields'

export interface SceneConfig {
  entityId: string
  /** Falls back to the scene's friendly name in HA. */
  name?: string
  /** Two colors used for the scene button gradient. */
  colors: Gradient
}

export interface RoomConfig {
  id: string
  name: string
  icon: IconName
  lightEntityIds: string[]
  scenes: SceneConfig[]
}

export type ColorPreset = { name: string; kelvin: number } | { name: string; rgb: Rgb }

/** Something happening in Home Assistant that opens an app on its own (a ring opens the camera). */
export interface EventConfig {
  entityId: string
  /** The app to open. */
  appId: string
  /**
   * For any entity but `event.*`: fires when its state changes to this.
   * `event.*` entities fire on every change, so they leave it out.
   */
  to?: string
  /** For `event.*` entities: only these `event_type`s fire. Empty: all of them. */
  eventTypes: string[]
  /** Shown on the camera view, e.g. "Someone is at the door". */
  message?: string
}

export interface HomeConfig {
  wallpaper: Gradient
  /** `lite` drops live blur and shadows, for weak GPUs like the Pi's. */
  graphics: 'full' | 'lite'
  weatherEntityId?: string
  rooms: RoomConfig[]
  apps: AppConfig[]
  events: EventConfig[]
  colors: ColorPreset[]
  timings: {
    screensaverAfterMs: number
    /** How often the kiosk checks kiosk.yaml for changes. */
    configCheckMs: number
  }
  /** Hours (local time) during which the screensaver is dimmed. */
  nightHours: { from: number; to: number }
}

const DEFAULT_COLORS: ColorPreset[] = [
  { name: 'Warm white', kelvin: 2200 },
  { name: 'Soft white', kelvin: 2700 },
  { name: 'Neutral', kelvin: 4000 },
  { name: 'Daylight', kelvin: 6500 },
  { name: 'Red', rgb: [255, 59, 48] },
  { name: 'Blue', rgb: [10, 132, 255] },
]

const DEFAULT_SCENE_COLORS: Gradient = ['#ffd27a', '#ff9f0a']
export class ConfigError extends Error {
  override name = 'ConfigError'
}

// ---- the file ----

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

const room = object({
  id: text.meta({ description: 'Unique ID, e.g. living-room.' }),
  name: text,
  icon: icon('house'),
  lights: lightList.meta({
    description: 'The lights this room tile switches. A whole-room group light works best.',
  }),
  scenes: list(scene),
}).transform((raw): RoomConfig => ({
  id: raw.id,
  name: raw.name,
  icon: raw.icon,
  lightEntityIds: raw.lights,
  scenes: raw.scenes,
}))

const event = object({
  entity: entity(
    undefined,
    'What to watch. An event.* entity (like a doorbell ring) fires every time it changes; any other entity needs `to`.',
  ),
  open: text.meta({ description: 'ID of the app to open, e.g. a camera app.' }),
  to: optional(z.union([text, z.number().transform(String)])).meta({
    description:
      "Fires when the entity's state changes to this, e.g. 'on'. Not for event.* entities.",
  }),
  eventTypes: list(text).meta({
    description:
      'For event.* entities: only these event types fire (e.g. [ring]). Leave out for all.',
  }),
  message: optional(text).meta({
    description: 'Shown on the camera view, e.g. "Someone is at the door".',
  }),
}).transform((raw): EventConfig => ({
  entityId: raw.entity,
  appId: raw.open,
  to: raw.to,
  eventTypes: raw.eventTypes,
  message: raw.message,
}))

const colorPreset = object({
  name: text,
  kelvin: optional(z.number().positive()).meta({ description: 'A white, e.g. 2700.' }),
  rgb: optional(z.tuple([z.number(), z.number(), z.number()], { error: 'must be [r, g, b]' })).meta(
    { description: 'A color as [r, g, b], 0–255.' },
  ),
}).transform((raw, ctx): ColorPreset => {
  if (raw.kelvin !== undefined) return { name: raw.name, kelvin: raw.kelvin }
  if (raw.rgb) return { name: raw.name, rgb: raw.rgb as Rgb }
  ctx.addIssue({ code: 'custom', message: 'needs kelvin: 2700 or rgb: [r, g, b]' })
  return z.NEVER
})

/** The whole kiosk.yaml, as written (before defaults and renames). */
export const kioskYamlSchema = object({
  wallpaper: gradient(['#2a2f6b', '#7a3d5c']).meta({ description: 'Background colors.' }),
  graphics: z
    .enum(['full', 'lite'], { error: 'must be one of: full, lite' })
    .default('full')
    .meta({ description: 'lite: no live blur or shadows, for weak GPUs like a Raspberry Pi.' }),
  weather: optional(entity('weather')),
  rooms: list(room).meta({ description: 'Room tiles on the Home screen.' }),
  apps: list(appSchema).meta({ description: 'App icons on the Home screen.' }),
  events: list(event).meta({
    description:
      'Things in Home Assistant that open an app on their own, e.g. a ring opens the camera.',
  }),
  colors: optional(z.array(colorPreset)).meta({ description: 'Color swatches for lights.' }),
  timings: object({
    screensaverSeconds: seconds(60, 'Idle time before the screensaver.'),
    configCheckSeconds: seconds(60, 'How often to check kiosk.yaml for changes.'),
  }).default({ screensaverSeconds: 60, configCheckSeconds: 60 }),
  nightHours: object({
    from: z.number().min(0).max(24).default(22),
    to: z.number().min(0).max(24).default(7),
  })
    .default({ from: 22, to: 7 })
    .meta({ description: 'Hours (local time) during which the screensaver is dimmed.' }),
})
  .superRefine((raw, ctx) => {
    for (const key of ['rooms', 'apps'] as const) {
      const seen = new Set<string>()
      raw[key].forEach((item, i) => {
        if (seen.has(item.id))
          ctx.addIssue({
            code: 'custom',
            path: [key, i, 'id'],
            message: `"${item.id}" is used twice`,
          })
        seen.add(item.id)
      })
    }
    const appIds = raw.apps.map((item) => item.id)
    raw.events.forEach((item, i) => {
      if (!appIds.includes(item.appId))
        ctx.addIssue({
          code: 'custom',
          path: ['events', i, 'open'],
          message: `"${item.appId}" is not an app ID.${didYouMean(item.appId, appIds)}`,
        })
      const isEvent = item.entityId.startsWith('event.')
      if (isEvent && item.to !== undefined)
        ctx.addIssue({
          code: 'custom',
          path: ['events', i, 'to'],
          message: 'is not for event.* entities (they fire on every change)',
        })
      if (!isEvent && item.to === undefined)
        ctx.addIssue({
          code: 'custom',
          path: ['events', i],
          message: "needs `to`, the state that fires it (e.g. to: 'on')",
        })
      if (!isEvent && item.eventTypes.length)
        ctx.addIssue({
          code: 'custom',
          path: ['events', i, 'eventTypes'],
          message: 'is only for event.* entities',
        })
    })
  })
  .transform((raw, ctx): HomeConfig => ({
    wallpaper: raw.wallpaper,
    graphics: raw.graphics,
    weatherEntityId: raw.weather,
    rooms: raw.rooms,
    apps: raw.apps.map((item, i) =>
      finishApp(item, {
        rooms: raw.rooms,
        problem: (key, message) =>
          ctx.addIssue({ code: 'custom', path: ['apps', i, key], message }),
      }),
    ),
    events: raw.events,
    colors: raw.colors ?? DEFAULT_COLORS,
    timings: {
      screensaverAfterMs: raw.timings.screensaverSeconds * 1000,
      configCheckMs: raw.timings.configCheckSeconds * 1000,
    },
    nightHours: raw.nightHours,
  }))

// ---- errors ----

function formatPath(path: readonly PropertyKey[]): string {
  return path
    .map((key, i) => (typeof key === 'number' ? `[${key}]` : `${i ? '.' : ''}${String(key)}`))
    .join('')
}

const TYPE_NAMES: Record<string, string> = {
  object: 'mapping',
  array: 'list',
  string: 'text',
  number: 'number',
  boolean: 'true or false',
}

function issueText(issue: z.core.$ZodIssue, base: readonly PropertyKey[] = []): string[] {
  const path = [...base, ...issue.path]
  const at = formatPath(path)
  // Unknown-key messages start with `.key`, so they read `rooms[0].scene is not…`.
  const say = (message: string) =>
    message.startsWith('.')
      ? at
        ? `${at}${message}`
        : message.slice(1)
      : `${at || 'kiosk.yaml'} ${message}`

  switch (issue.code) {
    case 'invalid_union': {
      // A bad app `type`.
      const noMatch = issue as unknown as { note?: string; options?: string[]; input?: unknown }
      if (noMatch.note === 'No matching discriminator' && noMatch.options) {
        const { options, input } = noMatch
        // Zod reports the whole object here, not just its `type`.
        const value =
          input && typeof input === 'object' ? (input as { type?: unknown }).type : input
        return [say(`must be one of: ${options.join(', ')}.${didYouMean(value, options)}`)]
      }
      // Either/or values (a scene as text or as a mapping): report the branch that
      // got furthest, i.e. the one that didn't fail on its type right away.
      const branches = issue.errors.map((errors) => ({
        errors,
        score: errors.some((e) => e.code === 'invalid_type' && e.path.length === 0) ? 1 : 0,
      }))
      branches.sort((a, b) => a.score - b.score)
      const best = branches[0]
      return best ? best.errors.flatMap((e) => issueText(e, path)) : [say(issue.message)]
    }
    case 'invalid_type': {
      const input = (issue as unknown as { input?: unknown }).input
      if (input === undefined) return [say('is required')]
      return [say(`must be a ${TYPE_NAMES[issue.expected] ?? issue.expected}`)]
    }
    case 'unrecognized_keys':
      return issue.message.split('\n').map(say)
    default:
      return [say(issue.message)]
  }
}

/** Human-readable problems in a config, each naming its key, e.g. `rooms[1].lights[0] …`. */
export function configProblems(error: z.ZodError): string[] {
  return error.issues.flatMap((issue) => issueText(issue))
}

/** Validates the parsed YAML and fills in defaults. Throws `ConfigError` naming the bad keys. */
export function parseHomeConfig(value: unknown): HomeConfig {
  const result = kioskYamlSchema.safeParse(value ?? {}, { reportInput: true })
  if (result.success) return result.data
  const problems = configProblems(result.error)
  throw new ConfigError(problems.slice(0, 5).join('\n'))
}
