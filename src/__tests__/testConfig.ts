import source from '../../kiosk.example.yaml?raw'

import { appTypes, type VacuumApp } from '@/apps'
import { parseConfigSource } from '@/config/load'

/** The example config, so tests also prove the shipped example is valid. */
export const testConfig = parseConfigSource(source)

export const vacuumApp = testConfig.apps.find((app): app is VacuumApp => app.type === 'vacuum')!

/**
 * Loads every type's lazy screen, widget and quick control (and the default
 * widget), so tests can mount them without waiting on dynamic imports.
 */
export const loadAllParts = () =>
  Promise.all([
    import('@/components/organisms/DefaultWidget.vue'),
    ...appTypes.flatMap((t) => [t.screen?.(), t.widget?.widgetScreen(), t.widget?.quick?.()]),
  ])
