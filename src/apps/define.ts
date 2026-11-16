// How an app type is described. Each folder in src/apps calls `defineAppType`
// once; src/apps/index.ts lists them all.
//
// No Vue in here or in the types' index.ts files: kiosk.yaml's schema is built
// from them, and the schema must load without the UI (tests, `npm run schema`).
// The screens are hooked up separately in src/apps/ui.ts.

import { z } from 'zod'

import { type Gradient, gradient, icon, object, text } from '@/config/fields'
import type { RoomConfig } from '@/config/home'
import type { HassEntity } from '@/ha/types'

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

export interface FinishContext {
  rooms: RoomConfig[]
  /** Reports a problem with one of the app's keys, e.g. `problem('groups', 'needs…')`. */
  problem: (key: string, message: string) => void
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
  /** Opens full screen over everything (like a camera) instead of as a dialog. */
  fullScreen?: boolean
  /** Fills in what depends on the rest of kiosk.yaml, e.g. defaults from the rooms. */
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
