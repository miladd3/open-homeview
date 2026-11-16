import source from '../../kiosk.example.yaml?raw'

import type { VacuumApp } from '@/apps'
import { parseConfigSource } from '@/config/load'

/** The example config, so tests also prove the shipped example is valid. */
export const testConfig = parseConfigSource(source)

export const vacuumApp = testConfig.apps.find((app): app is VacuumApp => app.type === 'vacuum')!
