// An app type: `npm run new app <type>` made this folder from templates/app.
// It works as is: one on/off entity, a widget that shows it and a screen with a
// big toggle. Change what you need, then run `npm run schema`.
//
// In kiosk.yaml:
//   apps:
//     - { id: kettle, type: example, name: Kettle, entity: switch.kettle }
//   dashboard:
//     - [{ app: kettle }, { type: example, entity: switch.fan }]  # or inline
//
// Import only from '@/kit', '@/kit/define', 'vue', '@lucide/vue' and this folder.

import { onOffStatus } from '@/kit'
import { type AppOf, defineAppType, entity, mockEntity } from '@/kit/define'

const definition = defineAppType({
  // What kiosk.yaml's `type:` says. Must be the folder's name.
  type: 'example',
  // One line: the editor's hover help, and the docs gallery.
  description: 'Any on/off entity: a widget that shows it, a screen that toggles it.',
  icon: 'plug',
  // Home Assistant entity IDs, flat on the app in kiosk.yaml. The kiosk can only
  // reach the entities kiosk.yaml lists, so every entity the app uses goes here.
  entities: { entity: entity(undefined, 'Any on/off entity (switch, fan, input_boolean…).') },
  // Lazy imports: each part loads the first time it shows. Leave out `screen`
  // for a widget-only type.
  screen: () => import('./ExamplePanel.vue'),
  widget: {
    widgetScreen: () => import('./ExampleWidget.vue'),
    sizes: ['1x1', '2x1'], // the first is the default
    complication: true, // may sit in a face slot
  },
  // Live one-line status, for the screen's header. May use '@/kit', not .vue files.
  status: (app) => onOffStatus(app.entities.entity),
  // Fake entities, so `npm run dev` works without Home Assistant.
  mock: ({ name, entities }) => [mockEntity(entities.entity, 'on', { friendly_name: name })],
})

export default definition
export type ExampleApp = AppOf<typeof definition>
