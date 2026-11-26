# Raspberry Pi wall screen

Open HomeView runs on your server. The Raspberry Pi only needs to boot into a full-screen browser pointed at `http://<server-ip>:8080`.

This guide is the exact setup of a working wall screen: a **Raspberry Pi 5** with the official **Raspberry Pi Touch Display 2 (7")**, running **Raspberry Pi OS Lite (Debian 13 "trixie", 64-bit)**.

## Hardware

Open HomeView is built for a **1280×720** landscape touch screen. Any Raspberry Pi and HDMI or DSI screen works.

For a Pi 3 or Pi 4 (or if you want extra-snappy taps on a Pi 5), set `graphics: lite` under `theme:` in `kiosk.yaml` to turn off blur effects.

## 1. Flash Raspberry Pi OS

1. Flash **Raspberry Pi OS Lite (64-bit)** to an SD card using [**Raspberry Pi Imager**](https://www.raspberrypi.com/software/). New to Imager? The official [getting started guide](https://www.raspberrypi.com/documentation/computers/getting-started.html) walks through it step by step, including the OS customization screen.
2. In Imager's OS customization settings, set:
   - a hostname (for example `kiosk-pi`),
   - a user and password (this guide uses `kiosk`; it must be the first user, so it gets uid 1000),
   - your Wi-Fi network and country,
   - SSH enabled.
3. Boot the Pi and SSH into it: `ssh kiosk@kiosk-pi.local` (or use the Pi's IP if `.local` names don't resolve on your network).
4. Update it:

   ```bash
   sudo apt update && sudo apt full-upgrade -y
   ```

## 2. Install `cage`, Chromium, `wlr-randr` and `curl`

[`cage`](https://github.com/cage-kiosk/cage) is a minimal Wayland compositor that runs a single full-screen app with no desktop environment. `wlr-randr` rotates the screen, and `curl` lets the kiosk wait until the server answers.

```bash
sudo apt install -y cage chromium wlr-randr curl
```

## 3. Turn on the display

If you use an HDMI screen, skip this step.

For the **Touch Display 2**, add the display overlay at the end of `/boot/firmware/config.txt` (under `[all]`):

```bash
echo 'dtoverlay=vc4-kms-dsi-ili9881-7inch' | sudo tee -a /boot/firmware/config.txt
sudo reboot
```

After the reboot, find the screen's output name. You need it in step 6:

```bash
ls /sys/class/drm | grep -E 'DSI|HDMI'
```

`card0-DSI-2` means the output is `DSI-2`. On a Pi 5 the Touch Display 2 is usually `DSI-2`, not `DSI-1`.

## 4. Make taps fast in Chromium

Raspberry Pi OS turns on Chromium's accessibility tree in `/etc/chromium.d/00-rpi-vars` (`--force-renderer-accessibility`), which makes touch taps noticeably slow. Don't edit that file, because updates may overwrite it. Remove the flag in a file that loads after it:

```bash
echo 'CHROMIUM_FLAGS=$(echo "$CHROMIUM_FLAGS" | sed "s/--force-renderer-accessibility//")' \
  | sudo tee /etc/chromium.d/99-kiosk
```

Chromium sources every file in `/etc/chromium.d/` in name order, so `99-kiosk` runs last.

## 5. Rotate touch input

The Touch Display 2 is a portrait panel. Step 6 turns the picture to landscape, but touch input stays in portrait unless you rotate it too. Without this, taps land in the wrong place.

Add a udev rule that rotates every touchscreen 90° clockwise:

```bash
echo 'ENV{ID_INPUT_TOUCHSCREEN}=="1", ENV{LIBINPUT_CALIBRATION_MATRIX}="0 -1 1 1 0 0"' \
  | sudo tee /etc/udev/rules.d/99-touch-rotate.rules
sudo udevadm control --reload
sudo udevadm trigger --subsystem-match=input
```

If you rotate the screen 270° instead of 90° in step 6, use `"0 1 0 -1 0 1"`.

To check that the rule applied:

```bash
for d in /dev/input/event*; do udevadm info -q property -n "$d" | grep -q ID_INPUT_TOUCHSCREEN=1 && udevadm info -q property -n "$d" | grep CALIBRATION; done
```

It should print `LIBINPUT_CALIBRATION_MATRIX=0 -1 1 1 0 0`.

## 6. Start the kiosk on boot

Create `/etc/systemd/system/kiosk.service`. Replace `<server-ip>` with your server's address, and `DSI-2` with your output from step 3:

```bash
sudo tee /etc/systemd/system/kiosk.service >/dev/null <<'EOF'
[Unit]
Description=Open HomeView kiosk
After=network-online.target systemd-user-sessions.service
Wants=network-online.target
Conflicts=getty@tty1.service

[Service]
User=kiosk
PAMName=login
TTYPath=/dev/tty1
TTYReset=yes
TTYVHangup=yes
StandardInput=tty-fail
StandardOutput=journal
StandardError=journal
# Wait until the server answers, so Chromium doesn't open on an error page.
ExecStartPre=/bin/sh -c 'until curl -sf http://<server-ip>:8080 >/dev/null; do sleep 2; done'
ExecStart=/usr/bin/cage -- /bin/sh -c 'wlr-randr --output DSI-2 --transform 90; exec chromium --kiosk --incognito --noerrdialogs --disable-infobars --no-first-run --ozone-platform=wayland --password-store=basic http://<server-ip>:8080'
Restart=always
RestartSec=3

[Install]
WantedBy=graphical.target
EOF
```

What the parts do:

- `Conflicts=getty@tty1.service` and `TTYPath=/dev/tty1`: the kiosk takes over the first console instead of a login prompt.
- `PAMName=login`: opens a real login session, so `/run/user/1000` and GPU access are set up for the `kiosk` user.
- `wlr-randr ... --transform 90`: turns the portrait panel to landscape. If the output name is wrong, it fails, but Chromium still starts (in portrait), so you can see that something is off. HDMI screens that are already landscape don't need this line.
- `--incognito`: no saved tabs or "Chromium didn't shut down correctly" bar after a power cut.
- `--password-store=basic`: stops Chromium from waiting on a keyring that doesn't exist in a kiosk.

Enable it and boot into it:

```bash
sudo systemctl daemon-reload
sudo systemctl enable kiosk
sudo systemctl set-default graphical.target
sudo reboot
```

If the screen stays blank, check the logs over SSH:

```bash
journalctl -u kiosk -b --no-pager | tail -30
```

Don't log in on the Pi's own keyboard and screen while the kiosk runs. Switching consoles can take the screen away from `cage`.

## 7. Remote debugging (when needed)

To inspect the browser console or layout from another computer, add the debugging port to `/etc/chromium.d/99-kiosk` and restart the kiosk:

```bash
echo 'export CHROMIUM_FLAGS="$CHROMIUM_FLAGS --remote-debugging-port=9222"' | sudo tee -a /etc/chromium.d/99-kiosk
sudo systemctl restart kiosk
```

Chromium only listens on `127.0.0.1`, so forward the port from your laptop over SSH:

```bash
ssh -L 9222:localhost:9222 kiosk@kiosk-pi.local
```

Then open `chrome://inspect` in Chrome on your laptop to attach DevTools.

**When you're done**, remove the line and restart:

```bash
sudo sed -i '/remote-debugging-port/d' /etc/chromium.d/99-kiosk
sudo systemctl restart kiosk
```

## 8. Wi-Fi after a power cut

### Keep retrying Wi-Fi

If your router boots slower than the Pi after a power cut, NetworkManager can give up on Wi-Fi before the router is back. Make it retry forever and turn off Wi-Fi power saving:

```bash
# Find your Wi-Fi connection name
nmcli connection show

sudo nmcli connection modify "<your-wifi-name>" \
  connection.autoconnect yes \
  connection.autoconnect-retries 0 \
  802-11-wireless.powersave 2
```

`autoconnect-retries 0` means retry forever. `powersave 2` turns power saving off.

### If Wi-Fi is gone after a power cut

Raspberry Pi OS (trixie) keeps Wi-Fi settings in netplan files under `/etc/netplan/`. A hard power cut can leave them empty (0 bytes), and the Pi then boots with no network. The kiosk keeps waiting in `ExecStartPre`, so the screen stays blank.

Fix it with a keyboard on the Pi (or a wired network cable and SSH):

```bash
ls -l /etc/netplan/                     # empty files show size 0
sudo rm /etc/netplan/90-NM-*.yaml       # remove the empty files
sudo nmcli device wifi connect "<your-wifi-name>" password "<your-wifi-password>"
sudo reboot
```

The new connection is saved as a NetworkManager file in `/etc/NetworkManager/system-connections/`. Then run the retry command above on it.
