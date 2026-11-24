// The kit for an app type's, face's or theme's index.ts: `defineAppType`,
// `defineFace`, `defineTheme` and the kiosk.yaml field helpers. Each folder in
// src/apps, src/faces and src/themes has `export default define…(...)`; the
// index.ts next to them finds them all.
//
// kiosk.yaml's schema is built from the types' index.ts files, so they must load
// without the UI (tests, `npm run schema`): screens and widgets are lazy imports,
// loaded the first time they show.

import type { Component, ComputedRef } from 'vue'
import { z } from 'zod'

import { type Gradient, gradient, icon, object, optional, text } from '@/config/fields'
import type { ColorPreset } from '@/config/home'
import type { IconName } from '@/config/icons'
import type { HassEntity } from '@/ha/types'

export { z }
export {
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
} from '@/config/fields'
export type { ColorPreset } from '@/config/home'
export type { IconName } from '@/config/icons'
export { mockEntity, mockLight } from '@/ha/mock/entity'

const DEFAULT_APP_COLORS: Gradient = ['#8e8e93', '#48484a']

/** Cells a widget takes on the dashboard grid: columns x rows. */
export type WidgetSize = '1x1' | '2x1' | '1x2' | '2x2' | '4x2'
export const WIDGET_SIZES: WidgetSize[] = ['1x1', '2x1', '1x2', '2x2', '4x2']
/** On the dashboard, or small in a face slot. */
export type WidgetMode = 'dashboard' | 'complication'

type Loader = () => Promise<Component | { default: Component }>
type Simplify<T> = { [K in keyof T]: T[K] } & {}
type Outputs<Shape extends z.ZodRawShape> = { [K in keyof Shape]: z.output<Shape[K]> }

/** Keys every app has, whatever its type. */
function appBase(defaultIcon: IconName) {
  return {
    id: text.meta({ description: 'Unique ID, e.g. vacuum.' }),
    name: text,
    icon: icon(defaultIcon),
    colors: gradient(DEFAULT_APP_COLORS),
    hidden: z.boolean().default(false).meta({
      description: 'Leave it off the generated dashboard (when there is no `dashboard:`).',
    }),
  }
}
type AppBase = Outputs<ReturnType<typeof appBase>>

/**
 * An app as parsed from kiosk.yaml. Its entity IDs sit right on the app in the
 * YAML (`camera: camera.door`); the kiosk reads them from `app.entities`.
 */
export type ParsedApp<
  Type extends string,
  Entities extends z.ZodRawShape,
  Settings extends z.ZodRawShape,
> = Simplify<
  { type: Type } & AppBase & Outputs<Settings> & { entities: Simplify<Outputs<Entities>> }
>

export interface AppStatus {
  text: string
  /** The app is doing something worth highlighting (cleaning, TV on…). */
  active: boolean
}

export interface FinishContext {
  /** kiosk.yaml's color swatches for lights. */
  colors: ColorPreset[]
  /** kiosk.yaml's top-level `weather:` entity. */
  weather?: string
}

export interface WidgetSpec<App, WidgetSettings extends z.ZodRawShape> {
  /** The widget, as a lazy import: `() => import('./VacuumWidget.vue')`. */
  widgetScreen: Loader
  /** Shown over the widget on a long-press, e.g. a brightness slider. */
  quick?: Loader
  /** The sizes it can take. The first is the default. */
  sizes: [WidgetSize, ...WidgetSize[]]
  /** May sit in a face slot. */
  complication?: boolean
  /** Keys of the widget itself on a dashboard entry (`{ app: lights, group: den }`). */
  settings?: WidgetSettings
  /** Checks the settings against the app. Returns the problem, if any. */
  check?: (app: NoInfer<App>, settings: Outputs<WidgetSettings>) => string | undefined
}

export interface AppTypeSpec<
  Type extends string,
  Entities extends z.ZodRawShape,
  Settings extends z.ZodRawShape,
  WidgetSettings extends z.ZodRawShape,
  App,
> {
  /** What kiosk.yaml's `type:` says, e.g. `vacuum`. Must match the folder name. */
  type: Type
  /** One line for the editor's hover help. */
  description: string
  /** The icon when kiosk.yaml sets none. Default: house. */
  icon?: IconName
  /** Home Assistant entity IDs the app uses. They end up in `app.entities`. */
  entities: Entities
  /** Any other keys, kept on the app as they are. */
  settings?: Settings
  /**
   * Opens on the top layer, over standby, instead of as a sheet (a camera).
   * Closes any open sheet, keeps the screen awake and gets the event `message`.
   */
  overlay?: boolean
  /**
   * The full-screen view, as a lazy import: `() => import('./VacuumPanel.vue')`.
   * Gets `app`, an optional `focus` (a part to scroll to) and emits `close`.
   * Overlay types also get the event's `message`. Leave out for a widget-only type.
   */
  screen?: Loader
  /** The dashboard widget. Leave out for a 1x1 widget built from `status`. */
  widget?: WidgetSpec<App, WidgetSettings>
  /** One-line live status, for the default widget. */
  status?: (app: App) => ComputedRef<AppStatus | null>
  /** Fills in what depends on the rest of kiosk.yaml, e.g. the color swatches. */
  finish?: (app: ParsedApp<Type, Entities, Settings>, context: FinishContext) => App
  /** Fake Home Assistant entities for the app, for dev mode without Home Assistant. */
  mock: (app: App) => HassEntity[]
}

/** light.living_room_lamp → Living room lamp */
function nameFrom(id: string): string {
  const words = id.slice(id.indexOf('.') + 1).replace(/[_-]+/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

export function defineAppType<
  const Type extends string,
  Entities extends z.ZodRawShape,
  Settings extends z.ZodRawShape = {},
  WidgetSettings extends z.ZodRawShape = {},
  App = ParsedApp<Type, Entities, Settings>,
>(spec: AppTypeSpec<Type, Entities, Settings, WidgetSettings, App>) {
  if (!spec.screen && !spec.widget)
    throw new Error(`App type ${spec.type} needs a screen or a widget`)
  const entityKeys = new Set(Object.keys(spec.entities))
  const base = appBase(spec.icon ?? 'house')
  const own = {
    type: z.literal(spec.type).meta({ description: spec.description }),
    ...spec.entities,
    ...spec.settings,
  }
  const split = (raw: Record<string, unknown>) => {
    const app: Record<string, unknown> = {}
    const entities: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(raw)) {
      if (entityKeys.has(key)) entities[key] = value
      else app[key] = value
    }
    return { ...app, entities } as ParsedApp<Type, Entities, Settings>
  }
  /** An entry in `apps:`. */
  const schema = object({ ...base, ...own }).transform(split)
  /**
   * A dashboard entry (`{ type: scene, entity: scene.x }`): no `id` (the kiosk
   * makes one) and the name defaults to the entity's, e.g. "Movie night".
   */
  const inlineSchema = object({
    ...own,
    name: optional(text),
    icon: base.icon,
    colors: base.colors,
  }).transform((parsed) => {
    const raw = parsed as Record<string, unknown> & { name?: string }
    const firstEntity = Object.entries(raw).find(([key]) => entityKeys.has(key))?.[1]
    const name =
      raw.name ??
      (typeof firstEntity === 'string' ? nameFrom(firstEntity) : nameFrom(`.${spec.type}`))
    return split({ ...raw, id: '', name, hidden: true })
  })
  return { ...spec, schema, inlineSchema }
}

/** The app config a definition produces, e.g. `AppOf<typeof vacuum>`. */
export type AppOf<Definition> = Definition extends { mock: (app: infer App) => unknown }
  ? App
  : never

/** A place for a widget on a face, in the sizes that fit it. The first fits best. */
export interface FaceSlotSpec {
  sizes: [WidgetSize, ...WidgetSize[]]
}

export interface FaceSpec<Options extends z.ZodRawShape> {
  /** What kiosk.yaml's `face:` says, e.g. `modular`. Must match the folder name. */
  id: string
  name: string
  /** One line for the editor's hover help. */
  description: string
  /**
   * The face, as a lazy import: `() => import('./ModularFace.vue')`. Gets
   * `options` and `night` (true during night hours) and puts `<FaceSlot>`s where
   * the slots go.
   */
  screen: Loader
  /** Keys of the face in kiosk.yaml, next to `face:`. */
  options?: Options
  /** Where widgets go, by name: `slots: { right1: weather }` in kiosk.yaml. */
  slots?: Record<string, FaceSlotSpec>
}

export function defineFace<Options extends z.ZodRawShape = {}>(spec: FaceSpec<Options>) {
  for (const key of ['face', 'slots'])
    if (key in (spec.options ?? {}))
      throw new Error(`Face ${spec.id}: an option can't be called ${key}`)
  return spec
}

/** The options a face gets, e.g. `FaceOptionsOf<typeof modular>`. */
export type FaceOptionsOf<Definition> =
  Definition extends FaceSpec<infer Options> ? Simplify<Outputs<Options>> : never

export type ThemeMode = 'dark' | 'light'
export type ThemeGraphics = 'full' | 'lite'

export interface ThemeSpec {
  /** What kiosk.yaml's `theme:` says, e.g. `glass`. Must match the folder name. */
  id: string
  name: string
  /** One line for the editor's hover help. */
  description: string
  /** The modes its tokens.scss styles. The first is the default. */
  modes: [ThemeMode, ...ThemeMode[]]
  /** The versions it ships: `lite` needs a lite.scss. */
  graphics: [ThemeGraphics, ...ThemeGraphics[]]
}

/**
 * A theme: CSS variables in the folder's tokens.scss (and lite.scss, material.scss),
 * under `[data-theme='<id>']`. This only describes it.
 */
export function defineTheme(spec: ThemeSpec) {
  return spec
}
