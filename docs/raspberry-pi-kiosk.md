# Raspberry Pi wall screen

Open HomeView runs on your server; the Raspberry Pi only needs to boot into a full-screen browser pointed at `http://<server-ip>:8080`.

## Hardware

Open HomeView is built for a **1280×720** landscape touch screen and tested on a **Raspberry Pi 5** with the official **Raspberry Pi Touch Display 2 (7")**, but any Raspberry Pi and HDMI or DSI screen works.

For a Pi 3 or Pi 4 (or if you want extra-snappy taps on a Pi 5), set `graphics: lite` under `theme:` in `kiosk.yaml` to turn off blur effects.

## 1. Flash Raspberry Pi OS

1. Flash **Raspberry Pi OS** (Lite is enough) to an SD card using **Raspberry Pi Imager**.
2. In Imager's OS customization settings, set:
   - a hostname (for example `kiosk-pi`),
   - a user and password (the examples below use `kiosk`),
   - your Wi-Fi network and country,
   - SSH enabled.
3. Boot the Pi and SSH into it: `ssh kiosk@kiosk-pi.local`.

## 2. Configure the display overlay

If you use an HDMI screen, you can usually skip this step.

For the official **7" Touch Display 2**, add the display overlay to `/boot/firmware/config.txt` under `[all]`:

```ini
dtoverlay=vc4-kms-dsi-ili9881-7inch
```

Reboot (`sudo reboot`) so the kernel picks up the screen.

## 3. Install `cage`, Chromium, and `wlr-randr`

[`cage`](https://github.com/cage-kiosk/cage) is a minimal Wayland compositor that runs a single full-screen app with no desktop environment overhead.

```bash
sudo apt update
sudo apt install -y cage chromium wlr-randr
```

## 4. Make taps fast in Chromium

Raspberry Pi OS enables Chromium's accessibility tree by default in `/etc/chromium.d/`, which makes touch taps noticeably slower. Check the files in `/etc/chromium.d/` and remove `--force-renderer-accessibility`:

```bash
grep -rn force-renderer-accessibility /etc/chromium.d/
```

Remove that flag from whichever file sets it (or override it in `/etc/chromium.d/99-kiosk`).

## 5. Start the kiosk on boot

Create a small startup script `/home/kiosk/kiosk.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Rotate a portrait screen (such as the 7" Touch Display 2) into landscape.
# Run `wlr-randr` inside a session to check your output name (e.g. DSI-2, HDMI-A-1).
wlr-randr --output DSI-2 --transform 90

exec chromium \
  --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --no-first-run \
  --check-for-update-interval=31536000 \
  http://<server-ip>:8080
```

Make it executable:

```bash
chmod +x /home/kiosk/kiosk.sh
```

### Match touch input to the rotated screen

`wlr-randr` rotates the picture, but under `cage` touch coordinates stay in portrait unless you rotate touch input too:

- **Raspberry Pi Touch Display 2 (recommended):** rotate the touch driver directly in `/boot/firmware/config.txt` by adding `rotation=90` (or `270`) — or explicit axis flags (`swapxy,invx` / `swapxy,invy`) — to the display overlay, then reboot:

  ```ini
  dtoverlay=vc4-kms-dsi-ili9881-7inch,rotation=90
  ```

- **Other touchscreens (`udev` rule):** find your touchscreen's device name with `libinput list-devices` (look for `Capabilities: touch`) and add `/etc/udev/rules.d/99-touch-rotate.rules`:

  ```udev
  # 90° clockwise (use "0 1 0 -1 0 1" for 270°)
  SUBSYSTEM=="input", ATTRS{name}=="<your touchscreen device name>", ENV{LIBINPUT_CALIBRATION_MATRIX}="0 -1 1 1 0 0"
  ```

  Then run `sudo udevadm control --reload-rules && sudo udevadm trigger` and reboot.

Create `/etc/systemd/system/kiosk.service`:

```ini
[Unit]
Description=Open HomeView Kiosk
After=network-online.target
Wants=network-online.target

[Service]
User=kiosk
PAMName=login
TTYPath=/dev/tty1
StandardInput=tty
StandardOutput=journal
StandardError=journal
UtmpIdentifier=tty1
UtmpMode=user
Environment=XDG_RUNTIME_DIR=/run/user/1000
ExecStart=/usr/bin/cage -s -- /home/kiosk/kiosk.sh
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

Enable and start it:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now kiosk.service
```

Check `journalctl -u kiosk.service -f` if the screen stays blank.

## 6. Remote debugging (when needed)

To inspect the browser console or layout from another computer, add `--remote-debugging-port=9222` to `/etc/chromium.d/99-kiosk` (or to the `chromium` command in `kiosk.sh`) and restart the service:

```bash
sudo systemctl restart kiosk.service
```

Forward the port from your laptop over SSH:

```bash
ssh -L 9222:localhost:9222 kiosk@kiosk-pi.local
```

Then open `chrome://inspect` in Chrome on your laptop to attach DevTools. **Remove `--remote-debugging-port=9222` and restart `kiosk.service` when you're done.**

## 7. Wi-Fi tip: recover after a power cut

If your router takes longer to boot than the Pi after a power cut, make sure NetworkManager keeps retrying Wi-Fi instead of giving up, and turn off Wi-Fi power saving so the Pi doesn't drop off the network while idle:

```bash
# Find your Wi-Fi connection name
nmcli connection show

# Retry forever on boot/disconnect
sudo nmcli connection modify "<your-wifi-name>" \
  connection.autoconnect yes \
  connection.autoconnect-retries 0
```

Disable Wi-Fi power saving by creating `/etc/NetworkManager/conf.d/wifi-powersave-off.conf`:

```ini
[connection]
wifi.powersave = 2
```

Then reload NetworkManager (`sudo systemctl reload NetworkManager` or reboot).
