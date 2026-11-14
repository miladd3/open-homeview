# Open HomeView

An Apple Home style wall dashboard for [Home Assistant](https://www.home-assistant.io/), made for a touch screen in landscape (built on a Raspberry Pi 5 with the 7" Touch Display 2, 1280×720). The screen only runs a full-screen browser; everything else runs in one small Docker container on your server.

- **One container, one YAML file.** Rooms, scenes, apps and entity IDs all live in `kiosk.yaml`. Edit it and the screen reloads by itself.
- **Your Home Assistant token never reaches the browser.** The container keeps it and only lets the screen see and control the entities listed in `kiosk.yaml`. Anyone who walks up to the wall screen can't do more than that.
- **Fast on a Raspberry Pi.** Taps update right away, and `graphics: lite` turns off blur effects for weak GPUs.

## Quick start

1. **Create a token.** In Home Assistant, add a new **non-admin** user (e.g. `kiosk`), log in as that user and create a long-lived access token under _Profile → Security_.
2. **Write your config.** Download [`kiosk.example.yaml`](kiosk.example.yaml) as `config/kiosk.yaml` and put in your own entity IDs (Settings → Devices & services → Entities).
3. **Start it** next to that `config/` folder:

   ```bash
   docker run -d --name open-homeview --restart unless-stopped -p 8080:8080 \
     -e HA_URL=http://homeassistant.local:8123 \
     -e HA_TOKEN=your-token \
     -v ./config:/config:ro \
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
- Use a dedicated non-admin HA user, so the token can't change Home Assistant's settings even if it leaks.

## Screens

| Screen      | What it does                                                                                                                             |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Home        | Clock, weather, status chips (lights on, vacuum, TV…), room tiles and app icons.                                                         |
| Room dialog | Tap a room tile. On/off switch, brightness slider, color swatches, scenes, and per-light switches for rooms with more lights.            |
| App dialogs | Tap an app icon (or its status chip): robot vacuum, TV remote, or any on/off entity with sensors (AdGuard).                              |
| Lights app  | Every light on its own, by group (left). Tap a bulb to toggle it, or the tile for brightness and color. Also opens from the Lights chip. |
| Doorbell    | Full-screen camera. Opens on ring (over everything) or from the Doorbell app; closes after 60 s without a touch.                         |
| Screensaver | After 60 s idle: big clock + weather, dimmed 22:00–07:00, small pixel shift against burn-in.                                             |

Tapping the **icon** on a room tile toggles that room's lights without opening the dialog.

## Configuration: `kiosk.yaml`

Rooms, scenes, apps, weather, doorbell, color swatches, wallpaper and timings all live in `kiosk.yaml`. Start from [`kiosk.example.yaml`](kiosk.example.yaml). The file has comments for every section. It is loaded at runtime, not bundled:

- In Docker it is mounted at `/config/kiosk.yaml`. Until it exists, the kiosk shows the example, with a **kiosk.yaml** chip on the Home screen explaining what to do.
- The kiosk checks it every minute and **reloads itself when it changes**, so you never have to touch the screen. Edit the file and the wall screen updates within a minute.
- A broken edit is never applied: a running kiosk keeps its last good config (the error is in the browser console), and a fresh start shows an error screen naming every bad key, with a suggestion for typos (e.g. `rooms[0].scene is not a known key. Did you mean "scenes"?`).
- Entity IDs that Home Assistant doesn't know show up in the **kiosk.yaml** chip on the Home screen, instead of silently showing "Unavailable".
- A scene can be written as just its entity ID: `scenes: [scene.bedroom_read]`. Add `name:` and `colors:` only when you want them.
- Icons are referenced by name from [`src/config/icons.ts`](src/config/icons.ts). Add a Lucide icon there to make it available.
- App types: `vacuum`, `tv`, `switch` (any on/off entity plus optional sensors), `lights` and `doorbell`.
- The `lights` app lists `groups`, each with a `name`, an optional `icon` and its `lights`. Groups can be anything (rooms, floors, lamps vs. spots). Leave `groups` out to get one group per room. Room tiles usually point at a whole-room light (e.g. a Hue room), while the Lights app lists the single bulbs.

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
- serves `/api/camera_proxy_stream/<camera>` (MJPEG for the doorbell) with the token added, only for cameras in `kiosk.yaml`.

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

Without `HA_URL`/`HA_TOKEN` in `.env.local`, `npm run dev` runs against an in-memory **mock** built from `kiosk.yaml` (or the example). Add `?mock` to any URL to force the mock. In mock mode a small **Mock** toolbar (bottom-right) lets you trigger a doorbell ring or the screensaver. Keyboard: `R` = ring, `S` = sleep.

## Structure

```
kiosk.example.yaml        # example config: copy to kiosk.yaml
server/                   # Node server (runs .ts directly): serves the page + kiosk.yaml, and the HA auth proxy
src/
  config/               # kiosk.yaml schema + validation (home.ts), loader, icon registry
  ha/                   # HaConnection interface, LiveConnection (home-assistant-js-websocket), mock
  stores/               # config (parsed kiosk.yaml), entities (HA state), kiosk (dialogs, overlays, screensaver)
  composables/          # useRoomLight, useVacuum, useAppStatus, useConfigReload, useIdle, useDoorbellRing, …
  components/
    atoms/              # GlassPanel, IconButton, RangeSlider, ProgressBar, ToggleSwitch
    molecules/          # ModalDialog, AppIcon, StatusChip, ClockDisplay, WeatherSummary, SceneButton, ColorPresets, CameraFeed
    organisms/          # RoomTile, RoomDialog, AppDialog, VacuumPanel, TvPanel, SwitchPanel, LightsPanel (+ LightTile, LightControls), DoorbellOverlay, ScreenSaver, DevToolbar
  views/                # HomeView, ConfigErrorView
  styles/               # design tokens (CSS custom properties) + base reset
```

Every component talks to Home Assistant only through `HaConnection` (`subscribeEntities`, `subscribeStatus`, `callService`). `LiveConnection` and the mock both implement it, and `src/ha/connection.ts` picks one.

### Styling conventions

- `<style scoped lang="scss">` in every component.
- The root element and every important child get a class (`.room-card`, `> .name`, `> .status`) so parents can restyle children.
- Variants are props mapped to `-variant` classes (`variant="filled"` → `.-filled`). Props are used only for real variants, not one-off styling.
- No margin on a component's root; the parent handles layout with `gap`.
- No `!important`, and no inline styles except CSS custom properties for live data (brightness %, light color).
- Native attributes and listeners fall through to the root element. Slots with prop fallbacks (`<slot>{{ label }}</slot>`) keep components open for extension.

## License

[MIT](LICENSE)
