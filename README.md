# Open HomeView

An Apple Home style wall dashboard for [Home Assistant](https://www.home-assistant.io/), made for a touch screen in landscape (built on a Raspberry Pi 5 with the 7" Touch Display 2, 1280×720). The screen only runs a full-screen browser; everything else runs in one small Docker container on your server.

- **One container, one YAML file.** Rooms, scenes, apps and entity IDs all live in `kiosk.yaml`. Edit it and the screen reloads by itself.
- **Your Home Assistant token never reaches the browser.** The container keeps it and only lets the screen see and control the entities listed in `kiosk.yaml`. Anyone who walks up to the wall screen can't do more than that.
- **Fast on a Raspberry Pi.** Taps update right away, and every theme has a lite version without blur effects for weak GPUs.

## Quick start

1. **Create a token.** In Home Assistant, add a new **non-admin** user (e.g. `kiosk`), log in as that user and create a long-lived access token under _Profile → Security_.
2. **Write your config.** Download [`kiosk.example.yaml`](kiosk.example.yaml) as `config/kiosk.yaml` and put in your own entity IDs (Settings → Devices & services → Entities).
3. **Start it** next to that `config/` folder:

   ```bash
   docker run -d --name open-homeview --restart unless-stopped -p 8080:8080 \
     -e HA_URL=http://homeassistant.local:8123 \
     -e HA_TOKEN=your-token \
     -v ./config:/config \
     ghcr.io/miladd3/open-homeview:latest
   ```

   Or use [`compose.yaml`](compose.yaml) with a `.env` file (see [`.env.example`](.env.example)): `docker compose up -d`.

4. Open `http://<your server>:8080` on the wall screen, in kiosk mode (see [Wall screen](#wall-screen)).

| Variable          | Default              | What it is                                                                                         |
| ----------------- | -------------------- | -------------------------------------------------------------------------------------------------- |
| `HA_URL`          | (required)           | Your Home Assistant address                                                                        |
| `HA_TOKEN`        | (required)           | Long-lived token of a non-admin HA user                                                            |
| `PORT`            | `8080`               | Port inside the container                                                                          |
| `CONFIG_PATH`     | `/config/kiosk.yaml` | Where the container reads your config                                                              |
| `SCHEMA_ENTITIES` | `false`              | Suggest your HA entity IDs in the editor schema (see [Autocomplete](#autocomplete-in-your-editor)) |

Images are built for `amd64` and `arm64`. Tags: `latest` (main branch), and `x.y.z` / `x.y` for releases.

## Security

- The page has **no login**. Keep it on your home network and never expose it to the internet without a login in front of it.
- The HA token stays in the container. The browser connects to the container, which swaps in the token and drops any request for an entity that isn't in `kiosk.yaml` (no area or device targets either).
- The container only writes one file: `layout.yaml`, the on-screen dashboard layout. It never adds entities (see [Screens](#screens)). Set `editPin` if people you don't trust can reach the screen or your network.
- Use a dedicated non-admin HA user, so the token can't change Home Assistant's settings even if it leaks.

## Screens

| Screen     | What it does                                                                                                                      |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Home       | A grid of widgets (5 × 3 cells on 1280×720), in pages you swipe sideways: clock, weather, rooms, scenes, lights, a thermostat, …  |
| Apps       | Tap an app's widget. Every app opens full screen; ✕ or Esc closes it: robot vacuum, TV remote, any on/off entity…                 |
| Lights app | One section per group (room): its switch and brightness, its scenes, then each light. Tap a light's icon for its color swatches.  |
| Camera     | Full-screen camera. Opens from its widget or from an event (a doorbell ring, over everything); closes after 60 s without a touch. |
| Standby    | After 60 s idle: faces you swipe sideways (big clock, modular, home modular); a tap wakes. Night face, dimmed, 22:00–07:00.       |

Rooms are the Lights app's groups. On a group's widget, the round icon toggles its lights; a tap anywhere else opens the Lights app scrolled to that room. **Long-press** a light or room widget for a brightness slider.

**Edit the dashboard on the screen:** long-press the Home screen (or a widget without a slider). Drag widgets to reorder them (hold at the screen's edge to move to the next page), tap the size badge to cycle its sizes, – removes, ＋ adds from a gallery, **Done** saves. Edits go to `layout.yaml` next to `kiosk.yaml`, which then replaces kiosk.yaml's `dashboard` (so `/config` must be writable: no `:ro`). **Reset layout** deletes it. The gallery only offers what `kiosk.yaml` already has (apps, Lights groups, clock, weather, and the IDs in `entities:`), and the server refuses a layout with anything else, so nobody at the screen can widen what the kiosk reaches. A broken `layout.yaml` is ignored, with a warning on the **kiosk.yaml** notice.

## Configuration: `kiosk.yaml`

Apps, the dashboard, scenes, events, weather, color swatches, the theme, wallpaper and standby faces all live in `kiosk.yaml`. Start from [`kiosk.example.yaml`](kiosk.example.yaml). The file has comments for every section. It is loaded at runtime, not bundled:

- In Docker it is mounted at `/config/kiosk.yaml`. Until it exists, the kiosk shows the example, with a **kiosk.yaml** notice on the Home screen explaining what to do. The container runs as user `node` (uid 1000), which must be able to write the folder for the on-screen editor's `layout.yaml`.
- The kiosk checks it every minute and **reloads itself when it changes**, so you never have to touch the screen. Edit the file and the wall screen updates within a minute.
- A broken edit is never applied: a running kiosk keeps its last good config (the error is in the browser console), and a fresh start shows an error screen naming every bad key, with a suggestion for typos (e.g. `apps[0].groups[0].scene is not a known key. Did you mean "scenes"?`).
- Entity IDs that Home Assistant doesn't know show up in the **kiosk.yaml** notice on the Home screen, instead of silently showing "Unavailable".
- A scene can be written as just its entity ID: `scenes: [scene.bedroom_read]`. Add `name:` and `colors:` only when you want them.
- Icons are referenced by name from [`src/config/icons.ts`](src/config/icons.ts). Add a Lucide icon there to make it available.
- App types: `vacuum`, `tv`, `switch` (any on/off entity plus optional sensors), `lights` and `camera`. These only have a widget: `clock`, `weather`, `scene`, `light`, `climate`, `lock` and `sensor`.
- `dashboard` is a list of pages, each a list of widgets that flow into the grid in order (a full page goes on to the next). An entry is `clock` (a type with no keys), `{ app: vacuum }` (an app from `apps`), or a type written inline: `{ type: lock, entity: lock.front_door }`. Inline entries need no `id`, and their `name` defaults to the entity's (`lock.front_door` → Front door). Any entry takes a `size` (`1x1`, `2x1`, `1x2`, `2x2`, `4x2`: columns × rows) that its widget offers. A Lights widget takes a `group`: `{ app: lights, group: bedroom }`.
- Without `dashboard`, the kiosk makes one: the clock, the weather, each Lights group, then every app. Add `hidden: true` to leave an app out of it (it then only opens from an event).
- `events` open an app on their own, over everything (and out of standby). Each names an `entity` and the app to `open`. An `event.*` entity (a doorbell ring, a button press) fires every time it changes, optionally only for some `eventTypes`. Any other entity fires when it changes `to` a state, e.g. `binary_sensor.driveway_motion` with `to: 'on'`. A `message` shows on the camera view (e.g. "Someone is at the door").
- `standby` is what the screen shows when idle: after `afterSeconds` (default 60), the `faces` you swipe through, then a tap wakes to Home. A face entry is `night` or `{ face: modular, color: '#ff9f0a', slots: { right1: weather } }`: the face's own keys sit next to `face:`, and `slots` take dashboard entries for widgets that can sit on a face (a tap on one does the widget's action, not wake). During `night.hours` (default 22 to 7) only `night.face` shows (default `night`), dimmed. Without `standby`: big-clock with the weather. Faces: `big-clock`, `modular`, `home-modular`, `night`. Faces move a few pixels every minute against burn-in.
- `theme` is the look: `glass` (the default), `liquid-glass` or `flat-light` (HomeView's light lavender look). The long form `{ name: glass, graphics: lite, tint: '#7d6bff', mode: auto }` picks the `lite` version (no blur or soft shadows, for the Pi), one accent colour for the whole UI, and `light`, `dark` or `auto` (dark during standby's night hours) for themes that have both. Standby faces stay on black and use the theme's dark mode.
- `wallpaper: [from, to]` puts your own two colours behind everything, over the theme's.
- `entities` lists more entity IDs the on-screen editor may offer as widgets (a `light.*` gets a light widget, `scene.*` a scene…). `editPin: '1234'` locks edit mode with a PIN; the server checks it and never sends it to the page (5 wrong tries lock it for a minute).
- An app's entity IDs go right on the app (`camera: camera.front_door`, `player: media_player.tv`).
- The `lights` app lists `groups` (usually rooms), each with a `name`, an optional `icon`, its `lights` and optional `scenes`. A group's `id` defaults to its name in lower case with dashes (`Living Room` → `living-room`).

### Autocomplete in your editor

The container serves a JSON Schema for `kiosk.yaml`. Add this line at the top of the file:

```yaml
# yaml-language-server: $schema=http://<your server>:8080/kiosk.schema.json
```

Editors with the YAML language server (VS Code with the Red Hat YAML extension, or Home Assistant's Studio Code Server add-on) then autocomplete keys, app types and icon names, show what each key does, and underline mistakes while you type.

**Your own entity IDs as suggestions:** start the container with `SCHEMA_ENTITIES=true` and the schema also suggests your Home Assistant entities on every entity field (only `light.*` under `lights:`, only `scene.*` under `scenes:`, and so on). It's off by default because anyone on your network can then read the list of your entity names.

Without a running kiosk, use the schema from GitHub: `https://raw.githubusercontent.com/miladd3/open-homeview/main/kiosk.schema.json`. It is generated from the same code that checks the file (`npm run schema`), so the two always agree.

## Home Assistant connection

The browser never holds an HA token. It connects to `/api/websocket` on its own origin, where the **HA auth proxy** ([`server/haProxy.ts`](server/haProxy.ts)):

- swaps the placeholder token in the WebSocket `auth` message for the real one,
- limits entity subscriptions and service calls to the entity IDs listed in `kiosk.yaml` (no area/device targets, no other API calls),
- serves `/api/camera_proxy_stream/<camera>` (MJPEG for camera apps) and `/api/camera_proxy/<camera>` (the snapshot in a camera widget) with the token added, only for cameras in `kiosk.yaml`.

Entity IDs are found anywhere in `kiosk.yaml` by their shape, so those in inline `dashboard` entries are allowed too.

In production the proxy runs in the same Node process that serves the page ([`server/app.ts`](server/app.ts)). During `npm run dev` the same code runs inside the Vite dev server.

**Token:** create a dedicated **non-admin** HA user (e.g. `kiosk`), log in as it, and create a long-lived access token under _Profile → Security_. Pass it as `HA_TOKEN` (Docker) or put it in `.env.local` (dev), see [`.env.example`](.env.example).

## Wall screen

Any device that can show a full-screen browser works. On a Raspberry Pi with Raspberry Pi OS:

- Run [`cage`](https://github.com/cage-kiosk/cage) (a one-app Wayland compositor) from a systemd service, and let it start `chromium --kiosk http://<your server>:8080`.
- For a portrait screen used in landscape, rotate it with `wlr-randr --output DSI-2 --transform 90` before Chromium starts.
- Chromium flags go in `/etc/chromium.d/`. If taps feel slow, remove `--force-renderer-accessibility`.
- To debug, add `--remote-debugging-port=9222` and open `chrome://inspect` from another machine (remove it afterwards).

## Development

```bash
npm install
cp .env.example .env.local   # add HA_TOKEN to test against the real Home Assistant
cp kiosk.example.yaml kiosk.yaml   # optional: your own config (git-ignored)
npm run dev                  # http://localhost:5173 — size the window to 1280×720
npm run test:unit
npm run lint                 # oxlint
npm run format               # oxfmt (Prettier-compatible output)
npm run build                # type-check + production build
```

Without `HA_URL`/`HA_TOKEN` in `.env.local`, `npm run dev` runs against an in-memory **mock** built from `kiosk.yaml` (or the example). Add `?mock` to any URL to force the mock. In mock mode a small **Mock** toolbar (bottom-right) has a button for each of your `events` (fires it, like a doorbell ring) and one for standby. Keyboard: `E` = first event, `S` = standby.

## Structure

```
kiosk.example.yaml        # example config: copy to kiosk.yaml
server/                   # Node server (runs .ts directly): serves the page, kiosk.yaml and layout.yaml (kiosk.ts), and the HA auth proxy
src/
  apps/                 # every app type, one folder each (see "App types" below)
  faces/                # every standby face, one folder each (see "Faces" below)
  themes/               # every theme, one folder each (see "Themes" below); ThemeHost puts the theme on <html>
  config/               # kiosk.yaml schema + validation (home.ts), shared schema helpers (fields.ts), loader, icons
  ha/                   # HaConnection interface, LiveConnection (home-assistant-js-websocket), mock
  kit/                  # what app, face and theme folders may use: AppSheet, Surface, Widget parts, FaceSlot, controls, useEntity/useService, defineAppType/defineFace/defineTheme (define.ts)
  stores/               # config (parsed kiosk.yaml), entities (HA state), kiosk (open app, overlay apps, standby)
  composables/          # useConfigReload, useIdle, useEvents, …
  components/
    atoms/              # IconButton, RangeSlider, ProgressBar, ToggleSwitch
    molecules/          # ClockDisplay, CameraFeed
    organisms/          # DashboardHost (the grid, and edit mode), WidgetCell, DefaultWidget, EditGallery, PinPad, StandbyHost (faces), DevToolbar, ConfigHelpDialog
  views/                # HomeView, ConfigErrorView
  styles/               # sizes and timings shared by every theme + base reset
```

Every component talks to Home Assistant only through `HaConnection` (`subscribeEntities`, `subscribeStatus`, `callService`). `LiveConnection` and the mock both implement it, and `src/ha/connection.ts` picks one.

### App types

Every folder in [`src/apps/`](src/apps/) is an app type, found on its own ([`src/apps/index.ts`](src/apps/index.ts)); the folder name is the type name. A type has a widget, a screen, or both:

```
src/apps/vacuum/
  index.ts          # export default defineAppType(...): the kiosk.yaml keys (entity IDs +
                    # settings), the screen, the widget and fake entities for dev mode
  VacuumWidget.vue  # the dashboard widget, built from <Widget>, <WidgetIcon>, <WidgetLabel>…
  VacuumPanel.vue   # the screen, wrapped in <AppSheet> (full screen, ✕, icon, name, status)
```

- `widget: { widgetScreen, sizes, quick?, complication?, settings?, check? }`. `sizes` lists the cells it can take; the first is the default. A widget gets `app`, `size` and `mode` (plus `settings` if it declares any) and emits `open` to open the screen. Text sizes follow the cell height (`--u` inside `<Widget>`), so a widget looks the same in every size; the big value grows with the widget.
- `quick` is shown over the widget on a long-press (the brightness slider of `light` and `lights`).
- `settings` are keys of the widget itself on a dashboard entry (`group` on a Lights widget), checked like app keys; `check` cross-checks them against the app.
- A type without `widget` gets a 1×1 one from its `status` (icon, name, status text; tap opens the screen). A type without `screen` is widget-only (clock, scene…).

App folders import only from `@/kit` (UI), `@/kit/define` (`index.ts`), `vue`, `@lucide/vue` and their own folder; `npm run lint` enforces it. Talk to Home Assistant with `useEntity` and `useService`. To add one: copy a small folder like `switch/` or `lock/`, then run `npm run schema`. The screen and widget are lazy imports (`screen: () => import('./VacuumPanel.vue')`), so the schema loads without the UI and each is its own chunk. A widget that throws shows as a grey "Widget error" cell; the rest of the dashboard keeps working.

### Faces

Every folder in [`src/faces/`](src/faces/) is a standby face, found on its own ([`src/faces/index.ts`](src/faces/index.ts)); the folder name is the face id.

```
src/faces/modular/
  index.ts          # export default defineFace({ id, name, description, screen, options, slots })
  ModularFace.vue   # the face: gets `options` and `night`, puts <FaceSlot name="right1" /> where widgets go
```

- `options` are the face's keys in kiosk.yaml (Zod fields with defaults, e.g. `color`); they can't be called `face` or `slots`.
- `slots` name the places for widgets and the sizes each takes (`right1: { sizes: ['1x1'] }`). `<FaceSlot>` renders the widget kiosk.yaml put there, in `complication` mode, or nothing. Only widgets whose type sets `complication: true` may sit in a slot.
- `StandbyHost` does the rest: the idle timer, swiping, tap to wake, night hours and the burn-in shift. A face only draws itself: no timers but `useNow` (once a second), and animate only `transform` and `opacity`.

Face folders follow the same import rule as app folders. To add one: copy `night/`, then run `npm run schema`.

### Themes

Every folder in [`src/themes/`](src/themes/) is a theme, found on its own ([`src/themes/index.ts`](src/themes/index.ts)); the folder name is the theme id.

```
src/themes/liquid-glass/
  index.ts          # export default defineTheme({ id, name, description, modes, graphics })
  tokens.scss       # every theme token under [data-theme='liquid-glass'], other modes under [data-mode='light']
  lite.scss         # the lite version, under [data-graphics='lite']: only what is slow (blur, shadows, springy motion)
  material.scss     # optional: may style only .kit-surface, .kit-widget and .kit-sheet
```

- `modes` lists the modes `tokens.scss` styles; the first is the default. `graphics: ['full', 'lite']` means it ships a `lite.scss`. Without one, `graphics: lite` uses the full version and logs a warning.
- [`src/themes/glass/tokens.scss`](src/themes/glass/tokens.scss) lists every token, with comments; every theme sets all of them (a test checks it). Themes change colours, material, radius, font, shadows and motion curves, never layout or sizes.
- `ThemeHost` sets `data-theme`, `data-mode` and `data-graphics` on `<html>`, and `--tint` from kiosk.yaml (tokens use it as `var(--tint, <default>)`).

Theme folders follow the same import rule as app folders. To add one: copy `glass/`.

### Styling conventions

- Colours come from theme tokens (`var(--text-secondary)`, `var(--fill)`…), so every component works in every theme. A test fails on a literal colour outside `src/themes/`, unless the line above it says why with `// fixed colour: …` (a face's black background, text over a camera image, white on an app's own colours).

- `<style scoped lang="scss">` in every component.
- The root element and every important child get a class (`.light-card`, `> .name`, `> .status`) so parents can restyle children.
- Variants are props mapped to `-variant` classes (`variant="filled"` → `.-filled`). Props are used only for real variants, not one-off styling.
- No margin on a component's root; the parent handles layout with `gap`.
- No `!important`, and no inline styles except CSS custom properties for live data (brightness %, light color).
- Native attributes and listeners fall through to the root element. Slots with prop fallbacks (`<slot>{{ label }}</slot>`) keep components open for extension.

## License

[MIT](LICENSE)
