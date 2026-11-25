// A standby face: `npm run new face <id>` made this folder from templates/face.
// It works as is: the time in a colour you pick, and one widget under it.
//
// In kiosk.yaml:
//   standby:
//     faces:
//       - { face: example, color: '#ff9f0a', slots: { bottom: weather } }
//
// Import only from '@/kit', '@/kit/define', 'vue', '@lucide/vue' and this folder.

import { defineFace, type FaceOptionsOf, z } from '@/kit/define'

const definition = defineFace({
  // What kiosk.yaml's `face:` says. Must be the folder's name.
  id: 'example',
  name: 'Example',
  // One line: the editor's hover help, and the docs gallery.
  description: 'The time in one colour, with a widget under it.',
  screen: () => import('./ExampleFace.vue'),
  // The face's keys in kiosk.yaml, next to `face:` (not `face` or `slots`).
  options: { color: z.string().default('#ff9f0a') },
  // Places for widgets, and the sizes each takes (the first fits best).
  slots: { bottom: { sizes: ['2x1', '1x1'] } },
})

export default definition
export type ExampleOptions = FaceOptionsOf<typeof definition>
