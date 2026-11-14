// Typed shape of `kiosk.yaml`, which is fetched at startup. The YAML is the single
// place to change when rooms, apps or HA entity IDs change; this file only
// validates it and fills in defaults.
//
// The Zod schema below is the one definition of the file: it checks the YAML at
// runtime, and `npm run schema` turns it into kiosk.schema.json for editor
// autocomplete. Descriptions (`.meta`) show up as hover help in the editor.

import { z } from 'zod'

import type { Rgb } from '@/ha/lightColor'
import { type IconName, icons } from './icons'

export type Gradient = [string, string]

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

interface AppBase {
  id: string
  name: string
  icon: IconName
  colors: Gradient
  /** Left off the Home screen; it only opens from an event. */
  hidden: boolean
}

export interface VacuumApp extends AppBase {
  type: 'vacuum'
  entities: {
    vacuum: string
    fullClean?: string
    fullVacuum?: string
    progress?: string
    status?: string
    battery?: string
  }
}

export interface TvApp extends AppBase {
  type: 'tv'
  entities: { player: string; remote?: string }
}

export interface SwitchApp extends AppBase {
  type: 'switch'
  entities: { switch: string; sensors: string[] }
}

/** A named set of lights, shown as one section of the Lights app. */
export interface LightGroup {
  name: string
  icon: IconName
  lightEntityIds: string[]
}

/** Every light on its own, sorted into groups (rooms, floors, lamps vs. spots…). */
export interface LightsApp extends AppBase {
  type: 'lights'
  groups: LightGroup[]
}

/** A live camera, shown full screen. */
export interface CameraApp extends AppBase {
  type: 'camera'
  entities: { camera: string }
  /** Closes after this long without a touch. */
  autoCloseMs: number
}

export type AppConfig = VacuumApp | TvApp | SwitchApp | LightsApp | CameraApp

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
const DEFAULT_APP_COLORS: Gradient = ['#8e8e93', '#48484a']
const ENTITY_ID = /^[a-z_]+\.[a-z0-9_]+$/
const ICON_NAMES = Object.keys(icons) as [IconName, ...IconName[]]

export class ConfigError extends Error {
  override name = 'ConfigError'
}

// ---- did you mean ----

function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0]!
    row[0] = i
    for (let j = 1; j <= b.length; j++) {
      const current = row[j]!
      row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1))
      previous = current
    }
  }
  return row[b.length]!
}

/** ` Did you mean "scenes"?` when one of `options` is close to `word`, else ''. */
export function didYouMean(word: unknown, options: readonly string[]): string {
  if (typeof word !== 'string') return ''
  const lower = word.toLowerCase()
  let best: string | undefined
  let bestDistance = Math.max(2, Math.floor(lower.length / 3)) + 1
  for (const option of options) {
    const d = option.toLowerCase().startsWith(lower) ? 1 : distance(lower, option.toLowerCase())
    if (d < bestDistance) [best, bestDistance] = [option, d]
  }
  return best ? ` Did you mean "${best}"?` : ''
}

// ---- building blocks ----

/** An object that rejects unknown keys, naming the closest known one. */
function object<Shape extends z.ZodRawShape>(shape: Shape) {
  const keys = Object.keys(shape)
  return z.strictObject(shape, {
    error: (issue) =>
      issue.code === 'unrecognized_keys'
        ? issue.keys.map((key) => `.${key} is not a known key.${didYouMean(key, keys)}`).join('\n')
        : undefined,
  })
}

/** Optional key; YAML `key:` with no value (null) counts as not set. */
function optional<T extends z.ZodType>(schema: T) {
  return schema.nullish().transform((value) => value ?? undefined)
}

/** Optional list; a missing or empty (null) list is []. */
function list<T extends z.ZodType>(item: T) {
  return z
    .array(item)
    .nullish()
    .transform((value) => value ?? [])
}

const text = z.string().trim().min(1, 'must not be empty')

function entity(domain?: string, description?: string) {
  const pattern = domain ? new RegExp(`^${domain}\\.[a-z0-9_]+$`) : ENTITY_ID
  return z
    .string()
    .regex(pattern, {
      error: (issue) =>
        domain && ENTITY_ID.test(String(issue.input))
          ? `"${String(issue.input)}" must be a ${domain}.* entity`
          : `"${String(issue.input)}" is not a valid entity ID (like ${domain ?? 'light'}.kitchen)`,
    })
    .meta({
      // Lets the server fill in this home's entity IDs as suggestions (see server/schema.ts).
      'x-entity-domain': domain ?? '*',
      description:
        description ??
        (domain
          ? `A ${domain}.* entity ID from Home Assistant.`
          : 'An entity ID from Home Assistant.'),
    })
}

function icon(fallback: IconName) {
  return z
    .enum(ICON_NAMES, {
      error: (issue) =>
        `"${String(issue.input)}" is not a known icon.${didYouMean(issue.input, ICON_NAMES)}`,
    })
    .default(fallback)
    .meta({ description: 'Icon name (Lucide). The full list is in src/config/icons.ts.' })
}

const color = text.meta({ description: 'Any CSS color, e.g. "#ff9f0a".' })

function gradient(fallback: Gradient) {
  return z
    .tuple([color, color], { error: 'must be two colors: [from, to]' })
    .default(fallback)
    .meta({ description: 'Two colors for a gradient: [from, to].' })
}

const seconds = (fallback: number, description: string) =>
  z.number().positive().default(fallback).meta({ description })

const lightList = z
  .array(entity('light'), { error: 'must be a list of light.* entities' })
  .min(1, 'needs at least one light')

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

const lightGroup = object({
  name: text,
  icon: icon('lightbulb'),
  lights: lightList,
}).transform((raw): LightGroup => ({ name: raw.name, icon: raw.icon, lightEntityIds: raw.lights }))

const appBase = {
  id: text.meta({ description: 'Unique ID, e.g. vacuum.' }),
  name: text,
  icon: icon('house'),
  colors: gradient(DEFAULT_APP_COLORS),
  hidden: z
    .boolean()
    .default(false)
    .meta({ description: 'Leave it off the Home screen; it then only opens from an event.' }),
}

/**
 * In kiosk.yaml an app's entity IDs sit right on the app (`camera: camera.door`);
 * the kiosk reads them from `app.entities`.
 */
function withEntities<
  Raw extends { id: string; name: string; icon: IconName; colors: Gradient; hidden: boolean },
>(raw: Raw) {
  const { id, name, icon, colors, hidden, ...entities } = raw
  return { id, name, icon, colors, hidden, entities }
}

const app = z.discriminatedUnion('type', [
  object({
    ...appBase,
    type: z.literal('vacuum').meta({ description: 'A robot vacuum.' }),
    vacuum: entity('vacuum'),
    fullClean: optional(entity(undefined, 'Button that starts a full clean (vacuum + mop).')),
    fullVacuum: optional(entity(undefined, 'Button that starts a full vacuum.')),
    progress: optional(entity('sensor', 'Cleaning progress in %.')),
    status: optional(entity('sensor', 'Detailed status text.')),
    battery: optional(entity('sensor', 'Battery level in %.')),
  }).transform(({ type, ...raw }) => ({ type, ...withEntities(raw) })),
  object({
    ...appBase,
    type: z.literal('tv').meta({ description: 'A TV remote.' }),
    player: entity('media_player'),
    remote: optional(entity('remote')),
  }).transform(({ type, ...raw }) => ({ type, ...withEntities(raw) })),
  object({
    ...appBase,
    type: z.literal('switch').meta({ description: 'Any on/off entity, with optional sensors.' }),
    switch: entity(undefined, 'Any on/off entity (switch, input_boolean, fan…).'),
    sensors: list(entity('sensor')),
  }).transform(({ type, ...raw }) => ({ type, ...withEntities(raw) })),
  object({
    ...appBase,
    type: z.literal('lights').meta({ description: 'Every light on its own, sorted into groups.' }),
    groups: optional(z.array(lightGroup).min(1, 'needs at least one group')).meta({
      description: 'Sections of the app. Leave out for one group per room.',
    }),
  }),
  object({
    ...appBase,
    type: z.literal('camera').meta({ description: 'A live camera, full screen.' }),
    camera: entity('camera'),
    autoCloseSeconds: seconds(60, 'Closes after this long without a touch.'),
  }).transform(({ type, autoCloseSeconds, ...raw }) => ({
    type,
    ...withEntities(raw),
    autoCloseMs: autoCloseSeconds * 1000,
  })),
])

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
  apps: list(app).meta({ description: 'App icons on the Home screen.' }),
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
    raw.apps.forEach((item, i) => {
      if (item.type === 'lights' && !item.groups && !raw.rooms.length)
        ctx.addIssue({
          code: 'custom',
          path: ['apps', i, 'groups'],
          message: 'needs at least one group (or rooms to make them from)',
        })
    })
  })
  .transform((raw): HomeConfig => ({
    wallpaper: raw.wallpaper,
    graphics: raw.graphics,
    weatherEntityId: raw.weather,
    rooms: raw.rooms,
    apps: raw.apps.map((item): AppConfig => {
      if (item.type !== 'lights') return item
      // Without `groups`, one group per room, using the rooms' lights.
      const groups =
        item.groups ??
        raw.rooms.map(({ name, icon, lightEntityIds }) => ({ name, icon, lightEntityIds }))
      return { ...item, groups }
    }),
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

type Raw = Record<string, unknown>
const isMapping = (value: unknown): value is Raw =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Old configs nested an app's entity IDs under `entities:`. Moves them onto the app. */
function flattenAppEntities(app: unknown): unknown {
  if (!isMapping(app) || !isMapping(app.entities)) return app
  const { entities, ...rest } = app
  return { ...rest, ...entities }
}

/**
 * Old configs had a top-level `doorbell:` (camera + ring) and a `type: doorbell`
 * app. Rewrites them to a camera app plus an event.
 */
function migrateDoorbell(config: Raw): Raw {
  const { doorbell, ...rest } = config
  const timings = isMapping(rest.timings) ? { ...rest.timings } : undefined
  const autoCloseSeconds = timings?.doorbellAutoCloseSeconds
  if (timings) delete timings.doorbellAutoCloseSeconds
  const apps = Array.isArray(rest.apps) ? rest.apps : []
  const hasLegacyApp = apps.some((app) => isMapping(app) && app.type === 'doorbell')
  if (!isMapping(doorbell) && !hasLegacyApp && autoCloseSeconds === undefined) return config

  const legacy = isMapping(doorbell) ? doorbell : {}
  const camera = (app: Raw = { id: 'doorbell', hidden: true }) => ({
    name: legacy.name ?? 'Doorbell',
    icon: 'cctv',
    ...app,
    type: 'camera',
    camera: legacy.camera,
    ...(autoCloseSeconds !== undefined && { autoCloseSeconds }),
  })
  const migratedApps = hasLegacyApp
    ? apps.map((app) => (isMapping(app) && app.type === 'doorbell' ? camera(app) : app))
    : isMapping(doorbell)
      ? [...apps, camera()]
      : apps
  const cameraId = (migratedApps.find((app) => isMapping(app) && app.type === 'camera') as Raw)?.id
  const events = [
    ...(Array.isArray(rest.events) ? rest.events : []),
    ...(legacy.ring && cameraId
      ? [
          {
            entity: legacy.ring,
            open: cameraId,
            eventTypes: ['ring'],
            message: 'Someone is at the door',
          },
        ]
      : []),
  ]
  return {
    ...rest,
    apps: migratedApps,
    ...(events.length && { events }),
    ...(timings && { timings }),
  }
}

/**
 * Rewrites older kiosk.yaml layouts to the current one, so they keep working:
 * `entities:` under apps, and the top-level `doorbell:`.
 * TODO: drop once old configs are gone.
 */
export function migrateLegacyConfig(value: unknown): unknown {
  if (!isMapping(value)) return value
  const apps = Array.isArray(value.apps) ? value.apps.map(flattenAppEntities) : value.apps
  const migrated = migrateDoorbell({ ...value, ...(apps !== undefined && { apps }) })
  if (JSON.stringify(migrated) !== JSON.stringify(value))
    console.warn(
      '[config] kiosk.yaml uses an old layout (`entities:` under apps or a top-level `doorbell:`). It still works; see kiosk.example.yaml for the new one.',
    )
  return migrated
}

/** Validates the parsed YAML and fills in defaults. Throws `ConfigError` naming the bad keys. */
export function parseHomeConfig(value: unknown): HomeConfig {
  const result = kioskYamlSchema.safeParse(migrateLegacyConfig(value ?? {}), { reportInput: true })
  if (result.success) return result.data
  const problems = configProblems(result.error)
  throw new ConfigError(problems.slice(0, 5).join('\n'))
}
