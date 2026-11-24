// Every theme. `theme:` in kiosk.yaml picks one.
//
// To add a theme: make a folder next to these (copy glass/) with an index.ts that
// does `export default defineTheme(...)` and a tokens.scss. The folder name is the
// theme id. It is found on its own, no list to update.

import type { ThemeSpec } from '@/kit/define'

/** Every theme, from the folders next to this file. */
export const themeTypes = Object.values(
  import.meta.glob<ThemeSpec>('./*/index.ts', { eager: true, import: 'default' }),
)
