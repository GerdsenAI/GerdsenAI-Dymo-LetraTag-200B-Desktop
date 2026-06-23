<p align="center">
  <img src="assets/gerdsenai-logo.png" width="116" height="116" alt="GerdsenAI Label Studio" />
</p>

<h1 align="center">GerdsenAI Label Studio</h1>

<p align="center">
  <strong>Design and print labels on the DYMO LetraTag 200B from your computer.</strong><br/>
  A free, open-source desktop app for <strong>Windows &amp; macOS</strong> — over Bluetooth, no phone app.
</p>

<p align="center">
  <a href="https://github.com/GerdsenAI/GerdsenAI-Dymo-LetraTag-200B-Desktop/releases/latest"><img src="https://img.shields.io/github/v/release/GerdsenAI/GerdsenAI-Dymo-LetraTag-200B-Desktop?color=2fc46a&label=download" alt="Latest release" /></a>
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS-2fc46a" alt="Platform: Windows | macOS" />
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License: MIT" /></a>
  <a href="https://github.com/GerdsenAI/GerdsenAI-Dymo-LetraTag-200B-Desktop/actions/workflows/build.yml"><img src="https://img.shields.io/github/actions/workflow/status/GerdsenAI/GerdsenAI-Dymo-LetraTag-200B-Desktop/build.yml?label=build" alt="Build" /></a>
</p>

---

Label Studio gives the **DYMO LetraTag 200B** (LT-200B) what it never shipped with: a real desktop
design surface. Type your text, pick a typeface and tape colour, and print over Bluetooth straight
from your Mac or PC — **no phone app, no account, no cloud.** The live preview is the printer's exact
1-bit raster, so **what you see is byte-for-byte what prints.**

It builds on the proven MIT Bluetooth engine
[`ysfchn/dymo-bluetooth`](https://github.com/ysfchn/dymo-bluetooth) and adds the text → label editor,
real Code 128 barcodes, and a premium native window.

## Contents

- [Download](#download)
- [Features](#features)
- [FAQ](#faq)
- [How it works](#how-it-works)
- [Build from source](#build-from-source)
- [Hardware notes](#hardware-notes)
- [Changelog](#changelog) · [License](#license) · [Acknowledgements](#acknowledgements)

## Download

Grab the latest build from the **[Releases page »](https://github.com/GerdsenAI/GerdsenAI-Dymo-LetraTag-200B-Desktop/releases/latest)**

| Platform | File | Notes |
|---|---|---|
| **Windows** (installer) | `Label Studio_<ver>_x64-setup.exe` | Standard install + Start-menu shortcut |
| **Windows** (portable) | `LabelStudio-portable-win64.zip` | Unzip and run — no install |
| **macOS** | `.dmg` *(via CI)* | Built on the release CI matrix |

Builds are **unsigned** for now: on Windows, SmartScreen may warn — choose *More info → Run anyway*;
on macOS, right-click the app → *Open* (or `xattr -dr com.apple.quarantine "Label Studio.app"`).

## Features

- **Pixel-accurate live preview** at the printer's true 30 px head height, composited over the chosen
  tape colour (white, clear, yellow, red, green, blue, silver). Preview == print.
- **Five label typefaces** (Condensed, Grotesk, Mono, Display, Script), S/M/L sizing, bold, underline,
  invert, alignment, padding, one or two lines.
- **Printable glyphs**, "insert today's date", and 8 quick-start templates (name badge, cable label,
  pantry jar, address, and more).
- **Real, scannable Code 128 barcodes.**
- **Real Bluetooth** scan, pair, and print — with honest status (printed, battery-low, no-cassette) and
  automatic reconnect.
- **Premium native window** — frameless, resizable, maximizable, plus a portable Windows build.

## FAQ

**Can I use the DYMO LetraTag 200B without the app?**
Yes. Label Studio prints to the LetraTag 200B directly from your computer over Bluetooth — you don't
need the DYMO phone app or an account.

**Does the DYMO LetraTag 200B work with a computer — Windows or Mac?**
Yes. Out of the box the LetraTag 200B pairs with a phone, but with Label Studio you can design and print
from **Windows or macOS** over the same Bluetooth connection.

**How do I print to the LetraTag 200B from my PC or Mac?**
Download Label Studio, turn the printer on, click **Scan**, **Connect**, type your label, and **Print**.
The app finds the printer over Bluetooth and sends the label to the print head.

**Is there free software for the DYMO LetraTag 200B?**
Yes — Label Studio is free and open-source (MIT licensed). No subscription, no in-app purchases.

**Can I print barcodes on the LetraTag 200B?**
Yes. Switch the editor to Barcode mode and type your data to print a real, scannable **Code 128** barcode.

**Why won't my LetraTag 200B print or connect?**
Make sure the printer is on, the lid is closed, a cassette is inserted, and all four batteries are
charged. The LetraTag drops idle Bluetooth links, so Label Studio automatically reconnects right before
printing.

**What tape does the LetraTag 200B use?**
LT label tape (12 mm). The print head always burns black; the colour you see comes from the tape
cassette — Label Studio previews all seven tape colours.

## How it works

```
React + TypeScript (Vite)  ──Tauri invoke──►  Rust (Tauri 2)  ──stdio JSON-RPC──►  Python sidecar
  the 4 views + rasterizer       commands         bridge + events        dymo_bluetooth (bleak + pillow)
        ▲                                                                              │
        └────────────────────── Tauri events (print progress) ─────────────────────────┘
```

- **`src/`** — the React frontend. The rasterizer (`raster.ts`, `barcode.ts`) renders the label to a
  30 px-tall 1-bit PNG; the same PNG is what gets printed, so preview == print.
- **`src-tauri/`** — the Rust shell. It spawns the Python sidecar once and keeps it alive, correlating
  JSON-RPC responses and relaying print-progress events to the UI.
- **`engine/`** — the Python engine + `dymo_bluetooth/sidecar.py`, a line-delimited JSON-RPC bridge.
  Frozen with PyInstaller into a self-contained binary for release.
- **`design/`** — the original Claude Design prototypes (reference only; not shipped).

## Build from source

**Prerequisites:** [Node.js](https://nodejs.org/) 20+, [Rust](https://rustup.rs/) (stable) with the
[Tauri prerequisites](https://tauri.app/start/prerequisites/), and [Python](https://www.python.org/) 3.9+.

```bash
npm install

# one-time: create the engine venv used by the dev sidecar
python -m venv engine/.venv
engine/.venv/Scripts/python -m pip install bleak~=1.1.1 pillow~=11.0.0 "python-barcode[images]~=0.15.1" pyinstaller   # Windows
# (macOS/Linux: engine/.venv/bin/python -m pip install …)

npm run tauri dev
```

In a debug build the app launches the sidecar straight from `engine/.venv` (no freeze needed), so
frontend iteration is fast.

**Package a release** (PyInstaller can't cross-compile, so each OS builds its own sidecar):

```powershell
powershell -File scripts/build-sidecar.ps1          # freeze the sidecar
npm run tauri build -- --bundles nsis               # -> src-tauri/target/release/bundle/nsis/*.exe
powershell -File scripts/package-portable.ps1        # -> release/LabelStudio-portable-win64.zip
```

Both platforms build via the `build` GitHub Actions workflow (macOS + Windows matrix); push a `v*` tag
or run it from the Actions tab.

## Hardware notes

Only the DYMO **LetraTag LT-200B** is supported. The printer won't print with the lid open (it may still
report success), and all four batteries should be charged. Bluetooth requires Windows build ≥16299 or
macOS ≥10.13.

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

## License

[MIT](LICENSE). The Bluetooth + rasterization engine is
[`ysfchn/dymo-bluetooth`](https://github.com/ysfchn/dymo-bluetooth) (MIT). Built with Tauri · Rust · React.

## Acknowledgements

- [`ysfchn/dymo-bluetooth`](https://github.com/ysfchn/dymo-bluetooth) — the reverse-engineered LetraTag
  200B Bluetooth protocol and rasterizer this app is built on.
- [Tauri](https://tauri.app/), [React](https://react.dev/), [bleak](https://github.com/hbldh/bleak),
  [Pillow](https://python-pillow.org/), and [Lucide](https://lucide.dev/).

---

<sub><em>DYMO</em> and <em>LetraTag</em> are trademarks of their respective owner. GerdsenAI Label Studio
is an independent, open-source project and is <strong>not affiliated with, endorsed by, or sponsored by
DYMO</strong>. Product names are used only to describe compatibility.</sub>
