// Every app type the kiosk supports. `type:` on an app in kiosk.yaml picks one.
//
// To add a type: make a folder next to these (copy a small one like switch/) with
// an index.ts that does `export default defineAppType(...)`. The folder name is
// the type name. It is found on its own, no list to update.

import { type Component, type ComputedRef, defineAsyncComponent } from 'vue'
import { z } from 'zod'

import type { AppStatus, FinishContext, ParsedApp, WidgetSize, WidgetSpec } from '@/kit/define'
import type { HassEntity } from '@/ha/types'

/**
 * Any app from kiosk.yaml, after parsing. Its type's index.ts exports the exact
 * shape (`VacuumApp`); narrow to it with `app.type`.
 */
export type AppConfig = ParsedApp<
  string,
  Record<string, z.ZodType<string | string[] | undefined>>,
  {}
>

type Loader = () => Promise<Component | { default: Component }>

/** What `defineAppType` returns, seen from outside the type's folder. */
interface AppTypeDefinition {
  type: string
  overlay?: boolean
  screen?: Loader
  widget?: WidgetSpec<AppConfig, z.ZodRawShape>
  status?: (app: AppConfig) => ComputedRef<AppStatus | null>
  finish?: (app: AppConfig, context: FinishContext) => AppConfig
  mock: (app: AppConfig) => HassEntity[]
  schema: z.ZodType<AppConfig>
  inlineSchema: z.ZodType<AppConfig>
}

/** Every app type, from the folders next to this file. */
export const appTypes = Object.values(
  import.meta.glob<AppTypeDefinition>('./*/index.ts', { eager: true, import: 'default' }),
)

const byType = new Map(appTypes.map((definition) => [definition.type, definition]))

/** The definition of a type, or undefined for a name kiosk.yaml made up. */
export function appTypeOf(type: string): AppTypeDefinition | undefined {
  return byType.get(type)
}

function definitionOf(app: { type: string }) {
  return byType.get(app.type)!
}

/** One app in kiosk.yaml's `apps:`, checked against the schema of its `type`. */
export const appSchema = z.discriminatedUnion(
  'type',
  appTypes.map((definition) => definition.schema) as unknown as Parameters<
    typeof z.discriminatedUnion
  >[1],
) as unknown as z.ZodType<AppConfig>

/** Runs the type's `finish`, which may need the rest of kiosk.yaml (like the color swatches). */
export function finishApp(app: AppConfig, context: FinishContext): AppConfig {
  const { finish } = definitionOf(app)
  return finish ? finish(app, context) : app
}

/** Opens over everything, even the screensaver (a camera), rather than as a sheet. */
export function isOverlay(app: AppConfig): boolean {
  return definitionOf(app).overlay === true
}

/** The app has a full-screen view to open. */
export function hasScreen(app: AppConfig): boolean {
  return definitionOf(app).screen !== undefined
}

/** The sizes the app's widget can take. The first is the default. */
export function widgetSizes(app: AppConfig): WidgetSize[] {
  return definitionOf(app).widget?.sizes ?? ['1x1']
}

const components = new Map<string, Component>()

/** One async component per type and part, loaded the first time it shows. */
function lazy(key: string, load: () => Promise<Component | { default: Component }>) {
  let component = components.get(key)
  if (!component) {
    component = defineAsyncComponent(load)
    components.set(key, component)
  }
  return component
}

/** The screen of an app's type, loaded the first time it opens. */
export function screenOf(app: AppConfig): Component {
  return lazy(`${app.type}/screen`, definitionOf(app).screen!)
}

/** The widget of an app's type. Types without one get the default widget. */
export function widgetOf(app: AppConfig): Component {
  const { widget } = definitionOf(app)
  return widget
    ? lazy(`${app.type}/widget`, widget.widgetScreen)
    : lazy('default/widget', () => import('@/components/organisms/DefaultWidget.vue'))
}

/** The long-press control of an app's widget, if it has one. */
export function quickOf(app: AppConfig): Component | undefined {
  const { quick } = definitionOf(app).widget ?? {}
  return quick && lazy(`${app.type}/quick`, quick)
}

/** The app's live status for its default widget, or null for none. */
export function statusOf(app: AppConfig): ComputedRef<AppStatus | null> | null {
  return definitionOf(app).status?.(app) ?? null
}

/** Fake Home Assistant entities for an app, for dev mode. */
export function mockAppEntities(app: AppConfig) {
  return definitionOf(app).mock(app)
}

export type { LightGroup, LightsApp } from './lights'
export type { VacuumApp } from './vacuum'
