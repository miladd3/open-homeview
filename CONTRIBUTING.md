# Contributing: app types, faces and themes

Open HomeView is built from folders. Each folder is one of:

| Kind         | Folder             | What it is                                                                |
| ------------ | ------------------ | ------------------------------------------------------------------------- |
| **App type** | `src/apps/<type>/` | A widget on the dashboard, a full-screen screen, or both (vacuum, lock…). |
| **Face**     | `src/faces/<id>/`  | A standby screen, with slots for small widgets (big-clock, modular…).     |
| **Theme**    | `src/themes/<id>/` | The look: colours, material, radius, font, shadows and motion.            |

A folder is found on its own; there is no list to update. The same folder can be
shared two ways:

- **In this repo:** open a pull request. It is reviewed and built into the image.
- **As a runtime pack:** build it into plain JS and CSS (`npm run build:addon`) and
  copy it into `/config/addons/` on a kiosk. No rebuild of the kiosk is needed.

See every built-in folder in the [gallery](docs/gallery.md).

## Start a folder

```bash
npm install
npm run new app garage-door     # or: npm run new face sunrise / npm run new theme ocean
```

This copies a small, commented template from [`templates/`](templates/) that works
as it is. Then:

1. Run `npm run schema` (kiosk.yaml's schema is built from the folders).
2. Use it in `kiosk.example.yaml` (tests render every type and face the example uses,
   and fail when one is missing), and look at it with `npm run dev`.
3. Add a `preview.png`: a screenshot of it (a widget at its default size, a face or
   a dashboard in your theme, about 480 px wide). A test fails without one. Then run
   `npm run gallery`.
4. `npm run type-check`, `npx vitest run`, `npm run lint` and `npx oxfmt` must pass.

## The rules

1. Import only from `@/kit`, `@/kit/define`, `vue`, `@lucide/vue` and your own folder.
   `npm run lint` checks it.
2. In `index.ts`, import `.vue` files only as lazy imports (`() => import('./X.vue')`).
   `status` may use `@/kit`, but no `.vue` files.
3. Talk to Home Assistant only with `useEntity` and `useService`, and only for entity
   IDs from your config. Pass IDs as getters (`useEntity(() => props.app.entities.x)`)
   so they follow prop changes.
4. Always provide `mock`, so `npm run dev` works without Home Assistant.
5. A widget must look right in every size it declares. Text follows the cell
   (`--u` inside `<Widget>`); use container units (`cqi`), not fixed pixels.
6. Colours come from theme tokens (listed in
   [`src/themes/glass/tokens.scss`](src/themes/glass/tokens.scss)). Only data colours
   (an app's or a scene's colours) may be literal, with a `// fixed colour: <why>`
   comment on the line above. A test checks it.
7. Themes change the look (colours, material, radius, font, shadows, motion), never
   the layout or sizes.
8. A theme with blur, canvas or WebGL ships a lite version without them
   (`lite.scss`). The kiosk runs on a Raspberry Pi.
9. One tap does one thing. Long-press is for quick controls (`widget.quick`) and the
   dashboard editor.
10. No network requests of your own.

Faces also: animate only `transform` and `opacity`, and use no timers but `useNow`
(once a second). Home data reaches a face only through the widgets in its slots.

The full API (every `defineAppType` key, widget props, face slots, theme tokens, kit
exports) is in the [README](README.md#app-types) and the templates' comments.

## An app type

```ts
// src/apps/garage-door/index.ts
import { type AppOf, defineAppType, entity, mockEntity } from '@/kit/define'

const definition = defineAppType({
  type: 'garage-door', // kiosk.yaml's `type:`, the folder's name
  description: 'A garage door: open, closed, and a button to move it.',
  icon: 'car',
  entities: { door: entity('cover') }, // flat on the app in kiosk.yaml
  screen: () => import('./GarageDoorPanel.vue'), // leave out for a widget-only type
  widget: {
    widgetScreen: () => import('./GarageDoorWidget.vue'),
    sizes: ['1x1', '2x1'], // the first is the default
    complication: true, // may sit in a face slot
  },
  mock: ({ name, entities }) => [mockEntity(entities.door, 'closed', { friendly_name: name })],
})

export default definition
export type GarageDoorApp = AppOf<typeof definition>
```

A widget gets `app`, `size` and `mode` (`dashboard` or `complication`), is built from
`<Widget>`, `<WidgetIcon>`, `<WidgetValue>` and `<WidgetLabel>`, and emits `open` to
open the screen. A screen gets `app` (and `focus`), wraps `<AppSheet>` and emits
`close`. See [`templates/app/`](templates/app/).

## A face

```ts
// src/faces/sunrise/index.ts
import { defineFace, z } from '@/kit/define'

export default defineFace({
  id: 'sunrise', // kiosk.yaml's `face:`, the folder's name
  name: 'Sunrise',
  description: 'The time in one colour, with a widget under it.',
  screen: () => import('./SunriseFace.vue'), // gets `options` and `night`
  options: { color: z.string().default('#ff9f0a') }, // keys next to `face:`
  slots: { bottom: { sizes: ['2x1', '1x1'] } }, // <FaceSlot name="bottom" />
})
```

See [`templates/face/`](templates/face/).

## A theme

```ts
// src/themes/ocean/index.ts
import { defineTheme } from '@/kit/define'

export default defineTheme({
  id: 'ocean', // kiosk.yaml's `theme:`, the folder's name
  name: 'Ocean',
  description: 'Deep blue glass.',
  modes: ['dark'], // the modes tokens.scss styles; the first is the default
  graphics: ['full', 'lite'], // 'lite' needs a lite.scss
})
```

`tokens.scss` sets every token under `[data-theme='ocean']` (a test compares it with
glass's); `lite.scss` overrides only what is slow; an optional `material.scss` may
style only `.kit-surface`, `.kit-widget` and `.kit-sheet`. See
[`templates/theme/`](templates/theme/).

## Build a runtime pack

```bash
npm run build:addon src/apps/garage-door 1.0.0
```

This writes `dist-addon/garage-door/`:

```text
addon.json      # name, kind, version, kit (the kit major it was built for), description, files
index.js        # from index.ts
chunks/*.js     # the lazy screens and widgets
style.css       # component styles, or a theme's tokens
preview.png
```

`vue`, `zod` and the kit are not bundled: the kiosk provides its own copies, so a
pack shares its Vue and Home Assistant state. Icons from `@lucide/vue` are bundled
(only the ones you use).

To install it, copy the folder to `/config/addons/` next to `kiosk.yaml` and list it:

```yaml
addons: [garage-door]
```

Packs load in the built kiosk (Docker, or `npm run build`), not in `npm run dev`;
develop the folder in `src/` instead. A pack loads only on the kit major it was built
for (`KIT_VERSION` in [`src/kit/version.ts`](src/kit/version.ts)): rebuild it after a
kit major. A pack whose name is taken by a built-in folder, that was built for another
kit, or that fails to load is skipped, with a warning on the kiosk.yaml notice.

## Trust

A runtime pack is code you choose to run on your wall screen. It can't see the Home
Assistant token, and it can only reach the entities listed in `kiosk.yaml`. But it can
do anything else a web page can do, so only install packs you trust. The built
`index.js` is not minified, so you can read it first.
