// Every app type the kiosk supports. `type:` on an app in kiosk.yaml picks one.
//
// To add a type: make a folder next to these (copy a small one like switch/),
// and add it to `appTypes` below. The type checker points out anything still missing.

import { type Component, type ComputedRef, defineAsyncComponent } from 'vue'
import { z } from 'zod'

import type { AppOf, AppStatus, FinishContext } from '@/kit/define'
import { camera } from './camera'
import { lights } from './lights'
import { switchApp } from './switch'
import { tv } from './tv'
import { vacuum } from './vacuum'

export const appTypes = [vacuum, tv, switchApp, lights, camera] as const

type AppTypeDefinition = (typeof appTypes)[number]

/** Any app from kiosk.yaml, after parsing. Narrow it with `app.type`. */
export type AppConfig = AppOf<AppTypeDefinition>
export type AppType = AppConfig['type']

/** The parsed app, before `finishApp`. */
export type ParsedAppConfig = { type: AppType; id: string }

/** One app in kiosk.yaml, checked against the schema of its `type`. */
export const appSchema = z.discriminatedUnion(
  'type',
  appTypes.map((definition) => definition.schema) as unknown as Parameters<
    typeof z.discriminatedUnion
  >[1],
) as unknown as z.ZodType<ParsedAppConfig>

const byType = Object.fromEntries(appTypes.map((definition) => [definition.type, definition]))

function definitionOf(app: { type: AppType }) {
  return byType[app.type] as {
    overlay?: boolean
    screen: () => Promise<Component | { default: Component }>
    status?: (app: AppConfig) => ComputedRef<AppStatus | null>
    finish?: (app: unknown, context: FinishContext) => AppConfig
    mock: (app: AppConfig) => ReturnType<AppTypeDefinition['mock']>
  }
}

/** Runs the type's `finish`, which may need the rest of kiosk.yaml (like the color swatches). */
export function finishApp(app: ParsedAppConfig, context: FinishContext): AppConfig {
  const { finish } = definitionOf(app)
  return finish ? finish(app, context) : (app as AppConfig)
}

/** Opens over everything, even the screensaver (a camera), rather than as a sheet. */
export function isOverlay(app: AppConfig): boolean {
  return definitionOf(app).overlay === true
}

const screens = new Map<AppType, Component>()

/** The screen of an app's type, loaded the first time it opens. */
export function screenOf(app: AppConfig): Component {
  let screen = screens.get(app.type)
  if (!screen) {
    screen = defineAsyncComponent(definitionOf(app).screen)
    screens.set(app.type, screen)
  }
  return screen
}

/** The app's live status for the Home screen chips, or null for no chip. */
export function statusOf(app: AppConfig): ComputedRef<AppStatus | null> | null {
  return definitionOf(app).status?.(app) ?? null
}

/** Fake Home Assistant entities for an app, for dev mode. */
export function mockAppEntities(app: AppConfig) {
  return definitionOf(app).mock(app)
}

export type { LightGroup, LightsApp } from './lights'
export type { VacuumApp } from './vacuum'
