# GerdsenAI Label Studio

A simple, beautiful, open-source desktop app for designing and printing labels on a
**DYMO LetraTag 200B** over Bluetooth — from **macOS or Windows, no phone app required.**

It wraps the proven MIT Bluetooth engine [`ysfchn/dymo-bluetooth`](https://github.com/ysfchn/dymo-bluetooth)
and adds the one thing it lacked: a real **text → label** design surface with a pixel-accurate
live preview. What you see in the preview is **byte-for-byte what prints**.

![Editor](design/HANDOFF.md)

## Features

- Live, pixel-accurate 1-bit preview at the printer's true 30px head height, composited over the
  selected tape colour (white, clear, yellow, red, green, blue, silver).
- Five label typefaces (Condensed, Grotesk, Mono, Display, Script), S/M/L sizing, bold, underline,
  invert, alignment, padding, one or two lines.
- Printable glyphs, "insert today's date", and 8 quick-start templates.
- **Real, scannable Code 128** barcodes.
- Real Bluetooth: scan, pair, and print with honest status (printed / battery-low / no-cassette).
- Frameless, premium window that is **resizable, maximizable and windowed**, plus a **portable**
  Windows build that runs without installation.

## Architecture

```
React + TypeScript (Vite)  ──Tauri invoke──►  Rust (Tauri 2)  ──stdio JSON-RPC──►  Python sidecar
  the 4 views + rasterizer       commands         bridge + events        dymo_bluetooth (bleak + pillow)
        ▲                                                                              │
        └────────────────────── Tauri events (print progress) ─────────────────────────┘
```

- **`src/`** — the React frontend. The rasterizer (`raster.ts`, `barcode.ts`) renders the label to a
  30px-tall 1-bit PNG; the same PNG is what gets printed, so preview == print.
- **`src-tauri/`** — the Rust shell. It spawns the Python sidecar once and keeps it alive, correlating
  JSON-RPC responses and relaying print-progress events to the UI.
- **`engine/`** — the Python engine + `dymo_bluetooth/sidecar.py`, a line-delimited JSON-RPC bridge.
  Frozen with PyInstaller into a self-contained binary for release.
- **`design/`** — the original Claude Design prototypes (reference only; not shipped).

## Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [Rust](https://rustup.rs/) (stable) + the platform toolchain Tauri needs
  (see [Tauri prerequisites](https://tauri.app/start/prerequisites/))
- [Python](https://www.python.org/) 3.9+ (3.12/3.13 recommended)

## Develop

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

## Build

PyInstaller can't cross-compile, so each OS builds its own sidecar.

**Windows (installer + portable):**

```powershell
powershell -File scripts/build-sidecar.ps1          # freeze the sidecar
npm run tauri build -- --bundles nsis               # -> src-tauri/target/release/bundle/nsis/*.exe
powershell -File scripts/package-portable.ps1        # -> release/LabelStudio-portable-win64.zip
```

**Both platforms via CI:** the `build` GitHub Actions workflow
(`.github/workflows/build.yml`) builds the sidecar and the app on a macOS + Windows matrix and
uploads the installers. Run it from the Actions tab (workflow_dispatch) or by pushing a `v*` tag.

### Unsigned binaries

v1 ships **unsigned**. On first launch:

- **Windows** — SmartScreen may warn; choose *More info → Run anyway*.
- **macOS** — Gatekeeper may block it; right-click the app → *Open*, or
  `xattr -dr com.apple.quarantine "Label Studio.app"`. macOS will ask for Bluetooth permission the
  first time you scan.

## Hardware notes

Only the DYMO **LetraTag LT-200B** is supported. The printer won't print with the lid open (it may
still report success), and all four batteries should be charged. Bluetooth requires Windows build
≥16299 or macOS ≥10.13.

## Credits & licence

MIT. Bluetooth + rasterization engine: [`ysfchn/dymo-bluetooth`](https://github.com/ysfchn/dymo-bluetooth)
(MIT). Built with Tauri · Rust · React. *LetraTag* is a DYMO trademark; this project is not affiliated
with DYMO.
