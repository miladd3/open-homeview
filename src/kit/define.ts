// The kit for an app type's index.ts: `defineAppType` and the kiosk.yaml field
// helpers. Each folder in src/apps calls `defineAppType` once; src/apps/index.ts
// lists them all.
//
// kiosk.yaml's schema is built from the types' index.ts files, so they must load
// without the UI (tests, `npm run schema`): screens are lazy imports, loaded the
// first time they open.

import type { Component, ComputedRef } from 'vue'
import { z } from 'zod'

import { type Gradient, gradient, icon, object, text } from '@/config/fields'
import type { ColorPreset } from '@/config/home'
import type { HassEntity } from '@/ha/types'

export { z }
export {
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

/** Keys every app has, whatever its type. */
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

type Simplify<T> = { [K in keyof T]: T[K] } & {}
type Outputs<Shape extends z.ZodRawShape> = { [K in keyof Shape]: z.output<Shape[K]> }

/**
 * An app as parsed from kiosk.yaml. Its entity IDs sit right on the app in the
 * YAML (`camera: camera.door`); the kiosk reads them from `app.entities`.
 */
export type ParsedApp<
  Type extends string,
  Entities extends z.ZodRawShape,
  Settings extends z.ZodRawShape,
> = Simplify<
  { type: Type } & Outputs<typeof appBase> &
    Outputs<Settings> & { entities: Simplify<Outputs<Entities>> }
>

export interface AppStatus {
  text: string
  /** The app is doing something worth highlighting (cleaning, TV on…). */
  active: boolean
}

export interface FinishContext {
  /** kiosk.yaml's color swatches for lights. */
  colors: ColorPreset[]
}

export interface AppTypeSpec<
  Type extends string,
  Entities extends z.ZodRawShape,
  Settings extends z.ZodRawShape,
  App,
> {
  /** What kiosk.yaml's `type:` says, e.g. `vacuum`. */
  type: Type
  /** One line for the editor's hover help. */
  description: string
  /** Home Assistant entity IDs the app uses. They end up in `app.entities`. */
  entities: Entities
  /** Any other keys, kept on the app as they are. */
  settings?: Settings
  /**
   * Opens on the top layer, over the screensaver, instead of as a sheet (a camera).
   * Closes any open sheet, keeps the screen awake and gets the event `message`.
   */
  overlay?: boolean
  /**
   * Opens when the app is tapped, as a lazy import: `() => import('./VacuumPanel.vue')`.
   * Gets `app`, an optional `focus` (a part to scroll to) and emits `close`.
   * Overlay types also get the event's `message`.
   */
  screen: () => Promise<Component | { default: Component }>
  /** One-line live status for the Home screen chips. Leave out for no chip. */
  status?: (app: App) => ComputedRef<AppStatus | null>
  /** Fills in what depends on the rest of kiosk.yaml, e.g. the color swatches. */
  finish?: (app: ParsedApp<Type, Entities, Settings>, context: FinishContext) => App
  /** Fake Home Assistant entities for the app, for dev mode without Home Assistant. */
  mock: (app: App) => HassEntity[]
}

export function defineAppType<
  const Type extends string,
  Entities extends z.ZodRawShape,
  Settings extends z.ZodRawShape = {},
  App = ParsedApp<Type, Entities, Settings>,
>(spec: AppTypeSpec<Type, Entities, Settings, App>) {
  const entityKeys = new Set(Object.keys(spec.entities))
  const schema = object({
    ...appBase,
    type: z.literal(spec.type).meta({ description: spec.description }),
    ...spec.entities,
    ...spec.settings,
  }).transform((raw) => {
    const app: Record<string, unknown> = {}
    const entities: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(raw)) {
      if (entityKeys.has(key)) entities[key] = value
      else app[key] = value
    }
    return { ...app, entities } as ParsedApp<Type, Entities, Settings>
  })
  return { ...spec, schema }
}

/** The app config a definition produces, e.g. `AppOf<typeof vacuum>`. */
export type AppOf<Definition> = Definition extends { mock: (app: infer App) => unknown }
  ? App
  : never
