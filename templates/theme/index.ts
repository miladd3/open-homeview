// A theme: `npm run new theme <id>` made this folder from templates/theme. It
// works as is (a copy of glass); change the colours in tokens.scss.
//
// In kiosk.yaml:   theme: example   or   theme: { name: example, graphics: lite }
//
// A theme changes the look (colours, material, radius, font, shadows, motion),
// never the layout or sizes.

import { defineTheme } from '@/kit/define'

export default defineTheme({
  // What kiosk.yaml's `theme:` says. Must be the folder's name.
  id: 'example',
  name: 'Example',
  // One line: the editor's hover help, and the docs gallery.
  description: 'Frosted glass over a dark wallpaper.',
  // The modes tokens.scss styles; the first is the default. Add 'light' with a
  // [data-theme='example'][data-mode='light'] block.
  modes: ['dark'],
  // 'lite' means it ships lite.scss: the same look without blur and soft shadows.
  graphics: ['full', 'lite'],
})
