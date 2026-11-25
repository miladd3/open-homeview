// Typed shape of `kiosk.yaml`, which is fetched at startup. The YAML is the single
// place to change when apps or HA entity IDs change; this file only
// validates it and fills in defaults.
//
// The Zod schema below is the one definition of the file: it checks the YAML at
// runtime, and `npm run schema` turns it into kiosk.schema.json for editor
// autocomplete. Descriptions (`.meta`) show up as hover help in the editor.

import { z } from 'zod'

import { type AppConfig, appTypeOf, appTypes, finishApp, widgetSizes } from '@/apps'
import { faceTypes } from '@/faces'
import { themeTypes } from '@/themes'
import { WIDGET_SIZES, type WidgetSize } from '@/kit/define'
import type { Rgb } from '@/ha/lightColor'
import type { FinishContext, ThemeGraphics, ThemeMode } from '@/kit/define'
import {
  color,
  didYouMean,
  entity,
  type Gradient,
  list,
  object,
  optional,
  seconds,
  text,
} from './fields'

export type { Gradient } from './fields'

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

/** One widget on the dashboard: an app (from `apps:` or written inline) at a size. */
export interface DashboardWidget {
  app: AppConfig
  size: WidgetSize
  /** The widget's own keys, e.g. `group` for a Lights widget. */
  settings: Record<string, unknown>
  /** How kiosk.yaml writes it, without `size`. The on-screen editor saves this. */
  entry: DashboardEntry
}

/** A face as kiosk.yaml sets it: which one, its options, and the widgets in its slots. */
export interface FaceEntry {
  face: string
  options: Record<string, unknown>
  slots: Record<string, DashboardWidget>
}

/** What the screen shows when nobody uses it. */
export interface StandbyConfig {
  afterMs: number
  /** Swiped through in order; the first shows first. */
  faces: FaceEntry[]
  night: {
    /** Local time. `from` may be later than `to` (22 to 7). */
    hours: { from: number; to: number }
    face: FaceEntry
  }
}

/** The look: a theme from src/themes, its version and mode. */
export interface ThemeConfig {
  name: string
  /** `lite` drops live blur and shadows, for weak GPUs like the Pi's. */
  graphics: ThemeGraphics
  /** One accent colour for the whole UI. Unset: the theme's own. */
  tint?: string
  /** `auto`: dark during standby's night hours, light otherwise. */
  mode: ThemeMode | 'auto'
}

export interface HomeConfig {
  /** Unset: the theme's wallpaper. */
  wallpaper?: Gradient
  theme: ThemeConfig
  weatherEntityId?: string
  /** The apps in kiosk.yaml, then the ones written inline on the dashboard (hidden). */
  apps: AppConfig[]
  /** Pages of widgets. Generated from the apps when kiosk.yaml has no `dashboard:`. */
  dashboard: DashboardWidget[][]
  /** What the on-screen editor may add: only things kiosk.yaml already has. */
  gallery: DashboardWidget[]
  events: EventConfig[]
  standby: StandbyConfig
}

/** Whether `date` falls in the night hours (`from` may be later than `to`: 22 to 7). */
export function isNight(date: Date, { from, to }: StandbyConfig['night']['hours']): boolean {
  const hour = date.getHours()
  return from <= to ? hour >= from && hour < to : hour >= from || hour < to
}

const DEFAULT_COLORS: ColorPreset[] = [
  { name: 'Warm white', kelvin: 2200 },
  { name: 'Soft white', kelvin: 2700 },
  { name: 'Neutral', kelvin: 4000 },
  { name: 'Daylight', kelvin: 6500 },
  { name: 'Red', rgb: [255, 59, 48] },
  { name: 'Blue', rgb: [10, 132, 255] },
]

export class ConfigError extends Error {
  override name = 'ConfigError'
}

// ---- the file ----
//
// Built when this file loads, from every app type, face and theme, so runtime
// packs must be registered before (main.ts loads them first).

/** One app in `apps:`, checked against the schema of its `type`. */
const appSchema = z.discriminatedUnion(
  'type',
  appTypes.map((definition) => definition.schema) as unknown as Parameters<
    typeof z.discriminatedUnion
  >[1],
) as unknown as z.ZodType<AppConfig>

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

const dashboardEntry = z
  .union([
    text.meta({ description: 'A type with no keys, e.g. clock or weather.' }),
    z.looseObject({
      app: optional(text).meta({ description: 'The ID of an app in `apps:`.' }),
      type: optional(text).meta({
        description: `An app type written right here, with its keys. One of: ${appTypes.map((t) => t.type).join(', ')}.`,
      }),
      size: optional(
        z.enum(WIDGET_SIZES, { error: `must be one of: ${WIDGET_SIZES.join(', ')}` }),
      ).meta({ description: "Columns x rows. Default: the widget's first size." }),
    }),
  ])
  .meta({
    // An id puts it in kiosk.schema.json's $defs once, not inline in every face slot.
    id: 'dashboardEntry',
    description:
      'A widget: `clock`, `{ app: <id> }` for an app in `apps:`, or `{ type: <type>, ... }` written inline.',
  })

/** A dashboard entry as kiosk.yaml (or layout.yaml) writes it: `clock`, `{ app: tv }`, `{ type: …, … }`. */
export type DashboardEntry =
  | string
  | { app?: string; type?: string; size?: WidgetSize; [key: string]: unknown }
type Issue = { message: string; path: PropertyKey[] } & Partial<z.core.$ZodIssue>

type Report = (issue: Issue) => void

const reportAll = (report: Report, issues: z.core.$ZodIssue[], at: PropertyKey[]) =>
  issues.forEach((issue) => report({ ...issue, path: [...at, ...issue.path] }))

/**
 * Turns a dashboard entry (on the dashboard or in a face slot) into a widget.
 * Inline entries become apps of their own, added to `inline`, with their path
 * as id. Problems go to `report`, with their path.
 */
function entryResolver(
  apps: AppConfig[],
  context: FinishContext,
  inline: AppConfig[],
  report: Report,
) {
  const appIds = apps.map((app) => app.id)
  const typeNames = appTypes.map((t) => t.type)

  return function resolve(entry: DashboardEntry, at: PropertyKey[]): DashboardWidget | undefined {
    const { app: appId, type, size, ...rest } = typeof entry === 'string' ? { type: entry } : entry
    let app: AppConfig | undefined
    let isInline = false
    let settings: Record<string, unknown> = rest
    if (appId !== undefined) {
      if (type !== undefined) return void report({ path: at, message: 'has both `app` and `type`' })
      app = apps.find((item) => item.id === appId)
      if (!app)
        return void report({
          path: [...at, 'app'],
          message: `"${appId}" is not an app ID.${didYouMean(appId, appIds)}`,
        })
    } else {
      if (type === undefined)
        return void report({ path: at, message: 'needs `app` (an app ID) or `type`' })
      const definition = appTypeOf(type)
      if (!definition)
        return void report({
          path: typeof entry === 'string' ? at : [...at, 'type'],
          message: `must be one of: ${typeNames.join(', ')}.${didYouMean(type, typeNames)}`,
        })
      // The widget's own keys (like a Lights widget's `group`) are not the app's.
      const widgetKeys = Object.keys(definition.widget?.settings ?? {})
      const own = Object.fromEntries(Object.entries(rest).filter(([k]) => !widgetKeys.includes(k)))
      settings = Object.fromEntries(Object.entries(rest).filter(([k]) => widgetKeys.includes(k)))
      const parsed = definition.inlineSchema.safeParse({ type, ...own }, { reportInput: true })
      if (!parsed.success) return void reportAll(report, parsed.error.issues, at)
      app = finishApp({ ...parsed.data, id: at.join('/') }, context)
      isInline = true
    }

    const definition = appTypeOf(app.type)!
    const sizes = widgetSizes(app)
    if (size && !sizes.includes(size))
      report({
        path: [...at, 'size'],
        message: `${app.type} widgets are ${sizes.join(' or ')}, not ${size}.${didYouMean(size, sizes)}`,
      })
    const parsed = object(definition.widget?.settings ?? {}).safeParse(settings, {
      reportInput: true,
    })
    if (!parsed.success) return void reportAll(report, parsed.error.issues, at)
    const problem = definition.widget?.check?.(app, parsed.data)
    if (problem) return void report({ path: at, message: problem })
    if (isInline) inline.push(app)
    return {
      app,
      size: size ?? sizes[0]!,
      settings: parsed.data,
      entry:
        typeof entry === 'string' ? entry : { ...(appId ? { app: appId } : { type }), ...rest },
    }
  }
}

// ---- standby faces ----

const faceIds = faceTypes.map((face) => face.id)

/** One face's entry, e.g. `{ face: modular, color: …, slots: { right1: weather } }`. */
const faceSchemas = new Map(
  faceTypes.map((face) => [
    face.id,
    object({
      face: z.literal(face.id).meta({ description: `${face.name}: ${face.description}` }),
      ...face.options,
      slots: optional(
        object(
          Object.fromEntries(
            Object.entries(face.slots ?? {}).map(([name, slot]) => [
              name,
              optional(dashboardEntry).meta({
                description: `A widget that can sit on a face, ${slot.sizes.join(' or ')}.`,
              }),
            ]),
          ),
        ),
      ).meta({ description: 'Widgets in the slots, written like dashboard entries.' }),
    }),
  ]),
)

type FaceInput = { face: string; slots?: Record<string, DashboardEntry | undefined> }

const faceEntry = z
  // The mapping first: on a tie, a bad mapping is reported as one, not as a bad id.
  .union([
    z.discriminatedUnion('face', [...faceSchemas.values()] as unknown as Parameters<
      typeof z.discriminatedUnion
    >[1]) as unknown as z.ZodType<FaceInput>,
    z.enum(faceIds as [string, ...string[]], {
      error: (issue) => `must be one of: ${faceIds.join(', ')}.${didYouMean(issue.input, faceIds)}`,
    }),
  ])
  .meta({
    id: 'faceEntry',
    description: `A face: ${faceIds.join(', ')}, or { face: <id>, ...its options, slots }.`,
  })

const hour = z.number().min(0).max(24)

/**
 * Checks a face entry and fills its slots. A slot takes a widget whose type may
 * sit on a face (`complication`), at the first of the slot's sizes it offers.
 */
function resolveFace(
  input: FaceInput | string,
  at: PropertyKey[],
  resolve: ReturnType<typeof entryResolver>,
  report: Report,
): FaceEntry | undefined {
  let entry = input as FaceInput & Record<string, unknown>
  if (typeof input === 'string') {
    const parsed = faceSchemas.get(input)!.safeParse({ face: input }, { reportInput: true })
    if (!parsed.success) return void reportAll(report, parsed.error.issues, at)
    entry = parsed.data as typeof entry
  }
  const { face, slots: written = {}, ...options } = entry
  const spec = faceTypes.find((item) => item.id === face)!
  const slots: Record<string, DashboardWidget> = {}
  for (const [name, slotEntry] of Object.entries(written)) {
    if (slotEntry === undefined) continue
    const where = [...at, 'slots', name]
    const widget = resolve(slotEntry, where)
    if (!widget) continue
    if (!appTypeOf(widget.app.type)!.widget?.complication) {
      const fit = appTypes.filter((t) => t.widget?.complication).map((t) => t.type)
      report({
        path: where,
        message: `${widget.app.type} can't sit on a face. These can: ${fit.join(', ')}.`,
      })
      continue
    }
    const fits = spec.slots![name]!.sizes
    const asked = typeof slotEntry === 'string' ? undefined : slotEntry.size
    const size = asked ?? fits.find((s) => widgetSizes(widget.app).includes(s))
    if (!size || !fits.includes(size)) {
      report({
        path: asked ? [...where, 'size'] : where,
        message: `the ${name} slot of ${face} takes ${fits.join(' or ')}, and ${widget.app.type} widgets are ${widgetSizes(widget.app).join(' or ')}`,
      })
      continue
    }
    slots[name] = { ...widget, size }
  }
  return { face, options, slots }
}

/** Without `dashboard:`: the clock, the weather, widget variants (Lights groups), then other apps. */
function generateDashboard(
  apps: AppConfig[],
  context: FinishContext,
  inline: AppConfig[],
  resolve: ReturnType<typeof entryResolver>,
): DashboardWidget[][] {
  const builtIn = (type: string) => {
    const parsed = appTypeOf(type)!.inlineSchema.parse({ type })
    const app = finishApp({ ...parsed, id: `dashboard/${type}` }, context)
    inline.push(app)
    return { app, size: widgetSizes(app)[0]!, settings: {}, entry: type }
  }
  const shown = apps.filter((app) => !app.hidden)
  return [
    [
      builtIn('clock'),
      ...(context.weather ? [builtIn('weather')] : []),
      ...shown.flatMap((app) =>
        variantEntries(app).flatMap((entry) => resolve(entry, ['dashboard']) ?? []),
      ),
      ...shown
        .filter((app) => !variantEntries(app).length)
        .map((app) => ({ app, size: widgetSizes(app)[0]!, settings: {}, entry: { app: app.id } })),
    ],
  ]
}

/** The dashboard entries of an app's widget variants, e.g. `{ app: lights, group: den }`. */
function variantEntries(app: AppConfig): DashboardEntry[] {
  const variants = appTypeOf(app.type)!.widget?.variants as
    | ((app: AppConfig) => Record<string, unknown>[])
    | undefined
  return (variants?.(app) ?? []).map((settings) => ({ app: app.id, ...settings }))
}

/**
 * What the on-screen editor's gallery offers: every app (and its widget variants),
 * the types that need no keys (clock, weather when `weather:` is set) and a
 * widget for each ID in `entities:`. Nothing that isn't in kiosk.yaml already.
 */
function buildGallery(
  apps: AppConfig[],
  entityIds: string[],
  resolverWith: (report: Report) => ReturnType<typeof entryResolver>,
  report: Report,
): DashboardWidget[] {
  const widgetOnly = appTypes.filter((t) => !t.screen).map((t) => t.type)
  const gallery: DashboardWidget[] = []
  // A candidate that doesn't resolve (weather without `weather:`) is left out.
  const offer = (entry: DashboardEntry) => {
    let failed = false
    const widget = resolverWith(() => (failed = true))(entry, ['gallery', gallery.length])
    if (widget && !failed) gallery.push(widget)
    return Boolean(widget && !failed)
  }
  widgetOnly.forEach(offer)
  for (const app of apps) {
    offer({ app: app.id })
    variantEntries(app).forEach(offer)
  }
  entityIds.forEach((id, i) => {
    if (widgetOnly.some((type) => offer({ type, entity: id }))) return
    const domain = id.slice(0, id.indexOf('.'))
    report({ path: ['entities', i], message: `no widget takes ${domain}.* entities` })
  })
  return gallery
}

// ---- theme ----

const themeIds = themeTypes.map((theme) => theme.id)

const themeName = z
  .enum(themeIds as [string, ...string[]], {
    error: (issue) => `must be one of: ${themeIds.join(', ')}.${didYouMean(issue.input, themeIds)}`,
  })
  .meta({ description: themeTypes.map((t) => `${t.id}: ${t.description}`).join(' ') })

const theme = z
  .union([
    object({
      name: themeName,
      graphics: z
        .enum(['full', 'lite'], { error: 'must be one of: full, lite' })
        .default('full')
        .meta({ description: 'lite: no live blur or shadows, for weak GPUs like a Raspberry Pi.' }),
      tint: optional(color).meta({ description: 'One accent colour for the whole UI.' }),
      mode: optional(
        z.enum(['light', 'dark', 'auto'], { error: 'must be one of: light, dark, auto' }),
      ).meta({ description: "auto: dark during standby's night hours. Default: the theme's own." }),
    }),
    themeName.transform((name) => ({ name, graphics: 'full' as const })),
  ])
  .transform((raw, ctx): ThemeConfig => {
    const { modes } = themeTypes.find((t) => t.id === raw.name)!
    const mode = 'mode' in raw && raw.mode ? raw.mode : modes[0]
    const missing = (mode === 'auto' ? (['dark', 'light'] as const) : [mode]).find(
      (m) => !modes.includes(m),
    )
    if (missing)
      ctx.addIssue({
        code: 'custom',
        path: ['mode'],
        message: `${raw.name} has no ${missing} mode, only ${modes.join(' and ')}`,
      })
    return { ...raw, mode }
  })
  .meta({ description: 'The look: a theme name, or { name, graphics, tint, mode }.' })

/** The whole kiosk.yaml, as written (before defaults and renames). */
export const kioskYamlSchema = object({
  wallpaper: optional(z.tuple([color, color], { error: 'must be two colors: [from, to]' })).meta({
    description: "Two background colors: [from, to]. Default: the theme's.",
  }),
  theme: theme.prefault('glass'),
  weather: optional(entity('weather')),
  apps: list(appSchema).meta({
    description: 'Your apps. Each has a widget, a full-screen view, or both.',
  }),
  dashboard: optional(
    z.array(z.array(dashboardEntry).min(1, 'needs at least one widget')).min(1, 'needs a page'),
  ).meta({
    description:
      'Pages of widgets on the Home screen, in order. Leave out for one made from your apps.',
  }),
  events: list(event).meta({
    description:
      'Things in Home Assistant that open an app on their own, e.g. a ring opens the camera.',
  }),
  colors: optional(z.array(colorPreset)).meta({ description: 'Color swatches for lights.' }),
  entities: list(entity()).meta({
    description:
      "More entities the on-screen editor's gallery may offer as widgets (lights, scenes, sensors…).",
  }),
  addons: list(text).meta({
    description:
      'Runtime packs to load: folder names in /config/addons/ (an app type, face or theme each).',
  }),
  editPin: optional(z.union([text, z.number()])).meta({
    description:
      "A PIN to edit the dashboard on the screen. Quote it ('0123'). Leave out for no PIN.",
  }),
  standby: object({
    afterSeconds: seconds(60, 'Seconds without a touch before standby.'),
    faces: optional(z.array(faceEntry).min(1, 'needs a face')).meta({
      description:
        'The faces you swipe through; the first shows first. Default: big-clock with the weather.',
    }),
    night: object({
      hours: object({ from: hour.default(22), to: hour.default(7) })
        .prefault({})
        .meta({ description: 'Local time, e.g. { from: 22, to: 7 }.' }),
      face: faceEntry.default('night'),
    })
      .prefault({})
      .meta({ description: 'During these hours, standby shows this face, dimmed.' }),
  })
    .prefault({})
    .meta({ description: 'What the screen shows when nobody uses it: faces you swipe through.' }),
})
  .superRefine((raw, ctx) => {
    const seen = new Set<string>()
    raw.apps.forEach((item, i) => {
      if (seen.has(item.id))
        ctx.addIssue({
          code: 'custom',
          path: ['apps', i, 'id'],
          message: `"${item.id}" is used twice`,
        })
      seen.add(item.id)
    })
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
  .transform((raw, ctx): HomeConfig => {
    const context: FinishContext = { colors: raw.colors ?? DEFAULT_COLORS, weather: raw.weather }
    const apps = raw.apps.map((item) => finishApp(item, context))
    const inline: AppConfig[] = []
    const report: Report = (issue) =>
      ctx.addIssue({ code: 'custom', ...issue } as z.core.$ZodRawIssue)
    const resolverWith = (r: Report) => entryResolver(apps, context, inline, r)
    const resolve = resolverWith(report)
    const dashboard = raw.dashboard
      ? raw.dashboard.map((page, p) =>
          page.flatMap((entry, i) => resolve(entry, ['dashboard', p, i]) ?? []),
        )
      : generateDashboard(apps, context, inline, resolve)
    const { standby } = raw
    const faces = standby.faces ?? [
      raw.weather ? { face: 'big-clock', slots: { bottom: 'weather' } } : 'big-clock',
    ]
    const face = (entry: FaceInput | string, at: PropertyKey[]) =>
      resolveFace(entry, ['standby', ...at], resolve, report)!
    // Before `apps`, which takes the inline apps of the slots too.
    const standbyConfig: StandbyConfig = {
      afterMs: standby.afterSeconds * 1000,
      faces: faces.map((entry, i) => face(entry, ['faces', i])),
      night: { hours: standby.night.hours, face: face(standby.night.face, ['night', 'face']) },
    }
    // Before `apps`, which takes the gallery's inline apps too.
    const gallery = buildGallery(apps, raw.entities, resolverWith, report)
    return {
      wallpaper: raw.wallpaper,
      theme: raw.theme,
      weatherEntityId: raw.weather,
      apps: [...apps, ...inline],
      dashboard,
      gallery,
      events: raw.events,
      standby: standbyConfig,
    }
  })

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
  // Unknown-key messages start with `.key`, so they read `apps[0].nmae is not…`.
  const say = (message: string) =>
    message.startsWith('.')
      ? at
        ? `${at}${message}`
        : message.slice(1)
      : `${at || 'kiosk.yaml'} ${message}`

  switch (issue.code) {
    case 'invalid_union': {
      // A bad app `type` or face.
      const noMatch = issue as unknown as {
        note?: string
        options?: string[]
        input?: unknown
        discriminator?: string
      }
      if (noMatch.note === 'No matching discriminator' && noMatch.options) {
        const { options, input, discriminator = 'type' } = noMatch
        // Zod reports the whole object here, not just its `type` (or `face`).
        const value =
          input && typeof input === 'object'
            ? (input as Record<string, unknown>)[discriminator]
            : input
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

/** Human-readable problems in a config, each naming its key, e.g. `apps[1].groups[0] …`. */
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
