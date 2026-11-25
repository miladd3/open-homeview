# Configuration

Everything Open HomeView shows — apps, the dashboard layout, scenes, events, weather, color swatches, the theme, wallpaper, and standby faces — lives in `kiosk.yaml`. Start from [`kiosk.example.yaml`](../kiosk.example.yaml), which has comments for every section.

## Screens

| Screen     | What it does                                                                                                                      |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Home       | A grid of widgets (5 × 3 cells on 1280×720), in pages you swipe sideways: clock, weather, rooms, scenes, lights, a thermostat, …  |
| Apps       | Tap an app's widget. Every app opens full screen; ✕ or Esc closes it: robot vacuum, TV remote, any on/off entity…                 |
| Lights app | One section per group (room): its switch and brightness, its scenes, then each light. Tap a light's icon for its color swatches.  |
| Camera     | Full-screen camera. Opens from its widget or from an event (a doorbell ring, over everything); closes after 60 s without a touch. |
| Standby    | After 60 s idle: faces you swipe sideways (big clock, modular, home modular); a tap wakes. Night face, dimmed, 22:00–07:00.       |

Rooms are the Lights app's groups. On a group's widget, the round icon toggles its lights; a tap anywhere else opens the Lights app scrolled to that room. **Long-press** a light or room widget for a brightness slider.

**Edit the dashboard on the screen:** long-press the Home screen (or a widget without a slider). Drag widgets to reorder them (hold at the screen's edge to move to the next page), tap the size badge to cycle its sizes, – removes, ＋ adds from a gallery, **Done** saves. Edits go to `layout.yaml` next to `kiosk.yaml`, which then replaces `kiosk.yaml`'s `dashboard` (so `/config` must be writable: no `:ro`). **Reset layout** deletes it. The gallery only offers what `kiosk.yaml` already has (apps, Lights groups, clock, weather, and the IDs in `entities:`), and the server refuses a layout with anything else, so nobody at the screen can widen what the kiosk reaches. A broken `layout.yaml` is ignored, with a warning on the **kiosk.yaml** notice.

## `kiosk.yaml` reference

`kiosk.yaml` is loaded at runtime, not bundled:

- In Docker it is mounted at `/config/kiosk.yaml`. Until it exists, the kiosk shows the example, with a **kiosk.yaml** notice on the Home screen explaining what to do. The container runs as user `node` (uid 1000), which must be able to write the folder for the on-screen editor's `layout.yaml`.
- The kiosk checks it every minute and **reloads itself when it changes**, so you never have to touch the screen. Edit the file and the wall screen updates within a minute.
- A broken edit is never applied: a running kiosk keeps its last good config (the error is in the browser console), and a fresh start shows an error screen naming every bad key, with a suggestion for typos (e.g. `apps[0].groups[0].scene is not a known key. Did you mean "scenes"?`).
- Entity IDs that Home Assistant doesn't know show up in the **kiosk.yaml** notice on the Home screen, instead of silently showing "Unavailable".
- A scene can be written as just its entity ID: `scenes: [scene.bedroom_read]`. Add `name:` and `colors:` only when you want them.
- Icons are referenced by name from [`src/config/icons.ts`](../src/config/icons.ts). Add a Lucide icon there to make it available.
- App types: `vacuum`, `tv`, `switch` (any on/off entity plus optional sensors), `lights` and `camera`. These only have a widget: `clock`, `weather`, `scene`, `light`, `climate`, `lock` and `sensor`.
- An app's entity IDs go right on the app (`camera: camera.front_door`, `player: media_player.tv`).
- The `lights` app lists `groups` (usually rooms), each with a `name`, an optional `icon`, its `lights` and optional `scenes`. A group's `id` defaults to its name in lower case with dashes (`Living Room` → `living-room`).
- `dashboard` is a list of pages, each a list of widgets that flow into the grid in order (a full page goes on to the next). An entry is `clock` (a type with no keys), `{ app: vacuum }` (an app from `apps`), or a type written inline: `{ type: lock, entity: lock.front_door }`. Inline entries need no `id`, and their `name` defaults to the entity's (`lock.front_door` → Front door). Any entry takes a `size` (`1x1`, `2x1`, `1x2`, `2x2`, `4x2`: columns × rows) that its widget offers. A Lights widget takes a `group`: `{ app: lights, group: bedroom }`.
- Without `dashboard`, the kiosk makes one: the clock, the weather, each Lights group, then every app. Add `hidden: true` to leave an app out of it (it then only opens from an event).
- `events` open an app on their own, over everything (and out of standby). Each names an `entity` and the app to `open`. An `event.*` entity (a doorbell ring, a button press) fires every time it changes, optionally only for some `eventTypes`. Any other entity fires when it changes `to` a state, e.g. `binary_sensor.driveway_motion` with `to: 'on'`. A `message` shows on the camera view (e.g. "Someone is at the door").
- `standby` is what the screen shows when idle: after `afterSeconds` (default 60), the `faces` you swipe through, then a tap wakes to Home. A face entry is `night` or `{ face: modular, color: '#ff9f0a', slots: { right1: weather } }`: the face's own keys sit next to `face:`, and `slots` take dashboard entries for widgets that can sit on a face (a tap on one does the widget's action, not wake). During `night.hours` (default 22 to 7) only `night.face` shows (default `night`), dimmed. Without `standby`: big-clock with the weather. Faces: `big-clock`, `modular`, `home-modular`, `night`. Faces move a few pixels every minute against burn-in.
- `theme` is the look: `glass` (the default), `liquid-glass` or `flat-light` (HomeView's light lavender look). The long form `{ name: glass, graphics: lite, tint: '#7d6bff', mode: auto }` picks the `lite` version (no blur or soft shadows, for the Pi), one accent colour for the whole UI, and `light`, `dark` or `auto` (dark during standby's night hours) for themes that have both. Standby faces stay on black and use the theme's dark mode.
- `wallpaper: [from, to]` puts your own two colours behind everything, over the theme's.
- `addons: [garage-door]` loads runtime packs from `/config/addons/` (see [Runtime packs](#runtime-packs)).
- `entities` lists more entity IDs the on-screen editor may offer as widgets (a `light.*` gets a light widget, `scene.*` a scene…).
- `editPin: '1234'` locks edit mode with a PIN; the server checks it and never sends it to the page (5 wrong tries lock it for a minute).

## Autocomplete in your editor

The container serves a JSON Schema for `kiosk.yaml`. Add this line at the top of the file:

```yaml
# yaml-language-server: $schema=http://<your server>:8080/kiosk.schema.json
```

Editors with the YAML language server (VS Code with the Red Hat YAML extension, or Home Assistant's Studio Code Server add-on) then autocomplete keys, app types and icon names, show what each key does, and underline mistakes while you type.

**Your own entity IDs as suggestions:** start the container with `SCHEMA_ENTITIES=true` and the schema also suggests your Home Assistant entities on every entity field (only `light.*` under `lights:`, only `scene.*` under `scenes:`, and so on). It's off by default because anyone on your network can then read the list of your entity names.

Without a running kiosk, use the schema from GitHub: `https://raw.githubusercontent.com/miladd3/open-homeview/main/kiosk.schema.json`. It is generated from the same code that checks the file (`npm run schema`), so the two always agree.

## Home Assistant connection

The browser never holds an HA token. It connects to `/api/websocket` on its own origin, where the **HA auth proxy** ([`server/haProxy.ts`](../server/haProxy.ts)):

- swaps the placeholder token in the WebSocket `auth` message for the real one,
- limits entity subscriptions and service calls to the entity IDs listed in `kiosk.yaml` (no area/device targets, no other API calls),
- serves `/api/camera_proxy_stream/<camera>` (MJPEG for camera apps) and `/api/camera_proxy/<camera>` (the snapshot in a camera widget) with the token added, only for cameras in `kiosk.yaml`.

Entity IDs are found anywhere in `kiosk.yaml` by their shape, so those in inline `dashboard` entries are allowed too.

In production the proxy runs in the same Node process that serves the page ([`server/app.ts`](../server/app.ts)). During `npm run dev` the same code runs inside the Vite dev server.

**Token:** create a dedicated **non-admin** HA user (e.g. `kiosk`), log in as it, and create a long-lived access token under _Profile → Security_. Pass it as `HA_TOKEN` (Docker) or put it in `.env.local` (dev), see [`.env.example`](../.env.example).

## Runtime packs

App types, faces and themes are folders, and anyone can write one: see [CONTRIBUTING.md](../CONTRIBUTING.md) and the [gallery](gallery.md) of built-in ones. Share yours with a pull request, or as a **runtime pack** that needs no rebuild of the kiosk:

1. Build it: `npm run build:addon src/apps/garage-door 1.0.0` writes `dist-addon/garage-door/`.
2. Copy that folder to `/config/addons/garage-door/` on the server, next to `kiosk.yaml`.
3. List it in `kiosk.yaml`: `addons: [garage-door]`. The kiosk reloads by itself.

Only listed packs load, and only in the built kiosk (not `npm run dev`). A pack built for another kit major, one whose name a built-in folder already has, or one that fails to load is skipped, with a warning on the **kiosk.yaml** notice; the kiosk keeps running. A widget or face from a pack that throws shows as an error cell, like a built-in one.

**Trust:** a runtime pack is code you choose to run. It can't see the Home Assistant token, and it can only reach the entities listed in `kiosk.yaml`. It can still do anything a web page can do, so only install packs you trust (their `index.js` is not minified: read it first).
