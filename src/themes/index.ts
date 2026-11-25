// Every theme. `theme:` in kiosk.yaml picks one.
//
// To add a theme: make a folder next to these (`npm run new theme <id>`) with an
// index.ts that does `export default defineTheme(...)` and a tokens.scss. The
// folder name is the theme id. It is found on its own, no list to update. Runtime
// packs are added to the same list (src/addons.ts); their CSS is their style.css.

import type { ThemeSpec } from '@/kit/define'

/** Every theme: the folders next to this file, then the packs kiosk.yaml lists. */
export const themeTypes = Object.values(
  import.meta.glob<ThemeSpec>('./*/index.ts', { eager: true, import: 'default' }),
)
