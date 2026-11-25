import '@fontsource-variable/inter'
import './styles/base.scss'

import { loadAddons } from './addons'

// Runtime packs first: kiosk.yaml's schema (config/home.ts, loaded by ./boot) is
// built from every app type, face and theme, packs included.
async function start() {
  const addonWarnings = await loadAddons()
  const { boot } = await import('./boot')
  await boot(addonWarnings)
}

void start()
