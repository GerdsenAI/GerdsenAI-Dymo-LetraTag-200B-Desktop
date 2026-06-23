# Changelog

All notable changes to GerdsenAI Label Studio are documented here. The format is based
on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] — 2026-06-23

### Fixed
- **Printing on a stale Bluetooth link.** The DYMO LetraTag 200B drops idle BLE
  connections, so a printer paired on the Connect screen could be unreachable by the
  time you pressed Print — surfacing `Could not get GATT services: Unreachable`. The
  print path now reconnects fresh and retries once on any failure (connect-then-print,
  the way the engine works), and `connect` falls back to a by-address connection when a
  cached scan handle has gone stale.

## [0.1.0] — 2026-06-22

### Added
- First release: a self-contained desktop app for the **DYMO LetraTag 200B** on Windows
  and macOS — design and print labels over Bluetooth, no phone app.
- Pixel-accurate 1-bit live preview at the printer's true 30 px head height
  (**preview == print**), composited over seven tape colours.
- Five label typefaces, S/M/L sizing, bold / underline / invert, alignment, padding,
  one or two lines, printable glyphs, "insert today's date", and 8 quick-start templates.
- Real, scannable **Code 128** barcodes.
- Real Bluetooth scan / pair / print with honest status (printed, battery-low,
  no-cassette).
- Frameless, resizable & maximizable window with custom controls; a Windows installer
  and a portable build.

[0.1.1]: https://github.com/GerdsenAI/GerdsenAI-Dymo-LetraTag-200B-Desktop/releases/tag/v0.1.1
[0.1.0]: https://github.com/GerdsenAI/GerdsenAI-Dymo-LetraTag-200B-Desktop/commit/42eabfa
