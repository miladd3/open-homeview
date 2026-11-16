// Every app type the kiosk supports. `type:` on an app in kiosk.yaml picks one.
//
// To add a type: make a folder next to these (copy a small one like switch/),
// add it to `appTypes` below, and add its screen in ./ui.ts. The type checker
// points out anything still missing.

import { z } from 'zod'

import type { AppOf, FinishContext } from './define'
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
/** The app config of one type, e.g. `AppOfType<'camera'>`. */
export type AppOfType<Type extends AppType> = Extract<AppConfig, { type: Type }>

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
    fullScreen?: boolean
    finish?: (app: unknown, context: FinishContext) => AppConfig
    mock: (app: AppConfig) => ReturnType<AppTypeDefinition['mock']>
  }
}

/** Runs the type's `finish`, which may need the rest of kiosk.yaml (like the rooms). */
export function finishApp(app: ParsedAppConfig, context: FinishContext): AppConfig {
  const { finish } = definitionOf(app)
  return finish ? finish(app, context) : (app as AppConfig)
}

/** Opens full screen over everything (a camera) rather than as a dialog. */
export function isFullScreen(app: AppConfig): boolean {
  return definitionOf(app).fullScreen === true
}

/** Fake Home Assistant entities for an app, for dev mode. */
export function mockAppEntities(app: AppConfig) {
  return definitionOf(app).mock(app)
}

export type { CameraApp } from './camera'
export type { LightGroup, LightsApp } from './lights'
export type { SwitchApp } from './switch'
export type { TvApp } from './tv'
export type { VacuumApp } from './vacuum'
