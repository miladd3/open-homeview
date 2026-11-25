# Getting started

This guide walks through connecting Open HomeView to Home Assistant, writing your first `kiosk.yaml`, editing the layout on the screen, and optionally putting a reverse proxy in front of it.

## 1. Create a Home Assistant user and token

Use a dedicated **non-admin** Home Assistant user so the kiosk token can never change Home Assistant settings.

1. In Home Assistant, go to **Settings → People → Users** and click **Add user**.
2. Give it a name (for example `kiosk`), set a username and password, and leave **Administrator** turned **off**.
3. Open a private/incognito browser window and sign in to Home Assistant as that new `kiosk` user.
4. Click the user's name in the bottom-left sidebar (**Profile**), open the **Security** tab, and scroll to **Long-lived access tokens**.
5. Click **Create token**, give it a name (for example `Open HomeView`), and copy the token.
6. Put that token in `HA_TOKEN` (and your Home Assistant address in `HA_URL`) in your `compose.yaml` or `.env` file, then start the container with `docker compose up -d`.

## 2. Find your entity IDs and write `kiosk.yaml`

In Home Assistant, open **Settings → Devices & services → Entities** to look up the entity IDs you want on the dashboard (for example `light.living_room_ceiling`, `weather.forecast_home`, `climate.living_room`, `scene.living_room_rest`).

Create `./config/kiosk.yaml` next to your `compose.yaml`. Here is a minimal config to start with:

```yaml
# yaml-language-server: $schema=http://<server-ip>:8080/kiosk.schema.json

theme:
  name: glass
  graphics: lite # solid fills instead of blur; faster on a Raspberry Pi

weather: weather.forecast_home

apps:
  - id: lights
    type: lights
    name: Lights
    icon: lightbulb
    colors: ['#ffd60a', '#ff9f0a']
    groups:
      - name: Living Room
        icon: sofa
        lights:
          - light.living_room_ceiling
          - light.living_room_floor_lamp
        scenes:
          - scene.living_room_rest
```

Without a `dashboard:` section, Open HomeView builds one automatically from your clock, weather, Lights groups, and apps. The kiosk checks `kiosk.yaml` every minute and reloads itself when the file changes — no container restart needed.

To add more apps (thermostat, vacuum, TV, camera, locks, sensors), custom pages, doorbell/motion events, or standby faces, start from [`kiosk.example.yaml`](../kiosk.example.yaml) and see the full [Configuration](configuration.md) reference.

> **Tip:** If an entity ID doesn't exist in Home Assistant, Open HomeView flags it in the **kiosk.yaml** notice on the Home screen instead of silently showing "Unavailable".

## 3. Edit the dashboard on the touch screen

Once the dashboard is up, you can rearrange widgets right on the screen without editing YAML:

1. **Long-press** an empty spot on the Home screen (or any widget without a brightness slider) to enter edit mode.
2. **Drag** widgets to reorder them. Hold a widget at the left or right edge to move it to the next page.
3. Tap a widget's **size badge** to cycle through its available sizes (`1x1`, `2x1`, `2x2`, …).
4. Tap **–** to remove a widget, or **＋** to add one from the gallery.
5. Tap **Done** to save.

Edits are saved to `layout.yaml` next to `kiosk.yaml` and replace the `dashboard:` section of `kiosk.yaml`. Because the container writes `layout.yaml` as user `node` (uid `1000`), make sure `./config` is mounted writable (no `:ro`) and writable by uid `1000`. Tap **Reset layout** in edit mode to delete `layout.yaml` and go back to `kiosk.yaml`'s `dashboard`.

The **＋** gallery only offers widgets for things already in `kiosk.yaml` (your apps, Lights groups, clock, weather, and any extra IDs you list under `entities:`), and the server rejects anything else. If people you don't trust can reach the screen, set `editPin: '1234'` in `kiosk.yaml` to lock edit mode with a PIN.

## 4. Putting a reverse proxy in front (optional)

If you prefer a friendly hostname or HTTPS (for example `https://kiosk.home.lan`), point your reverse proxy at the container on port `8080` and make sure it forwards **WebSocket upgrades** on `/api/websocket` — the dashboard uses that WebSocket for live Home Assistant state updates and commands. Open HomeView has no built-in login, so keep the proxy on your local network or put authentication in front of it.
