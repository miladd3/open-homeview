// The screen of each app type in src/apps/index.ts. Kept apart from that list
// so kiosk.yaml's schema loads without Vue. The type checker makes sure every
// type has an entry here.

import type { Component, ComputedRef } from 'vue'

import { cameraUi } from './camera/ui'
import type { AppConfig, AppOfType, AppType } from '.'
import { lightsUi } from './lights/ui'
import type { AppStatus } from './status'
import { switchUi } from './switch/ui'
import { tvUi } from './tv/ui'
import { vacuumUi } from './vacuum/ui'

export interface AppUi<App> {
  /**
   * Opens when the app is tapped. Gets `app` and emits `close`. Full-screen
   * types (see `fullScreen`) also get the event's `message`.
   */
  screen: Component
  /** One-line live status for the Home screen chips. Leave out for no chip. */
  status?: (app: App) => ComputedRef<AppStatus | null>
}

const appUi: { [Type in AppType]: AppUi<AppOfType<Type>> } = {
  vacuum: vacuumUi,
  tv: tvUi,
  switch: switchUi,
  lights: lightsUi,
  camera: cameraUi,
}

/** The screen and status of an app's type. */
export function uiOf<App extends AppConfig>(app: App): AppUi<App> {
  return appUi[app.type] as AppUi<App>
}
