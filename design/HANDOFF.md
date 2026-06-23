# Handoff: GerdsenAI Label Studio — DYMO LetraTag 200B Desktop App

## Overview
A simple, beautiful, **open-source desktop app** that lets a user design and print labels on a
**DYMO LetraTag 200B** over Bluetooth from macOS or Windows — **no phone app required**. The
design goal is "simple to make, easy to use, very simple, but beautiful." It deliberately does not
reinvent the wheel: the Bluetooth + rasterization engine already exists as an MIT library; this app
wraps it and adds the one thing the engine lacks — a real **text → label** design surface with a
pixel-accurate live preview.

The product is a **GerdsenAI-branded** client: dark, luminous, premium, with a single accent and
restrained motion.

---

## About the Design Files
The files in this bundle are **design references created in HTML** (a `.dc.html` "Design Component"
that opens directly in a browser). They are **prototypes showing intended look and behavior — not
production code to ship directly.**

Your task is to **recreate these designs in a real desktop app**. There is no existing codebase yet,
so the recommended environment is **Tauri (Rust + WebView) with a React + TypeScript front-end** —
see *Recommended Architecture*. Implement the UI in that stack using idiomatic patterns; use the HTML
purely as the visual + behavioral spec.

> Note on the `.dc.html` format: these run in a proprietary "Design Component" runtime (`support.js`,
> custom tags like `<sc-if>`, `<sc-for>`, `<x-dc>`). **Do not try to ship that runtime.** Read the
> markup and the `class Component extends DCLogic` logic as a spec. All the genuinely reusable logic
> (label rasterization, barcode generation, tape rendering) is plain Canvas/JS and ports directly.

## Fidelity
**High-fidelity (hifi).** Final colors, typography, spacing, icons, motion, and interactions are all
defined here. Recreate the UI pixel-accurately. The one caveat: CSS entrance animations (fade/slide-in
on conditionally-shown panels) were removed because the prototype runtime froze them — **you should
add them back** in the real app (Framer Motion or plain CSS), they're called out below.

---

## The hardware truth everything is built around
This is the most important section — the whole UI is shaped by these constraints. Source:
the reverse-engineered protocol in **[`ysfchn/dymo-bluetooth`](https://github.com/ysfchn/dymo-bluetooth)** (MIT).

- The printable area is **30 px tall** (engine sends 32 px; the first row is skipped). 200 DPI thermal.
- Output is a **1-bit monochrome bitmap** — every pixel is ink or no-ink. There is no grayscale, no color.
  Color comes only from the **tape cassette**; the print head always burns black.
- Images are encoded **portrait/column-major** and **stretched 2× horizontally** by default (matches the
  official phone app, otherwise text is too thin).
- The print payload is **chunked into 500-byte BLE GATT writes**, each behind a 9-byte header + checksum.
- The printer reports **status codes 0–7** on a notify characteristic (printed / printed-battery-low /
  no-cassette / lid-open / etc.).
- BLE discovery is by **service UUID** (the engine filters scan results to LetraTag devices).

**Implication for the app:** the front-end's real job is to render the user's text/icons/date/barcode
to a **30px-tall, 1-bit PNG**, then hand that PNG to the engine. The live preview must be that exact
1-bit raster, shown upscaled with `image-rendering: pixelated`, composited over the selected tape color.

---

## Screens / Views

There are **4 views**, all within a single frameless desktop window (1280×800 design size, min 560 tall).

### 1. Connect / First-Run
**Purpose:** Pair a printer on first launch (or after "Forget"). Pairing is remembered (localStorage in
the prototype → use Tauri store / OS keychain in production), so returning users skip straight to the editor.

**Layout:** Full-window, vertically centered column on a radial dark gradient
(`radial-gradient(115% 80% at 50% -5%, #15151f, #08080a 62%)`), `padding: 40px`.
- GerdsenAI logo, 132×132, `border-radius: 26px`, gently floating (`gFloat` 5s ease-in-out infinite,
  ±5px translateY), drop shadow `0 20px 60px -20px rgba(0,0,0,.7)`.
- While scanning: 3 concentric expanding rings behind the logo (`gRing`: scale .45→1.7, opacity .65→0,
  2s ease-out infinite, staggered 0 / .66s / 1.33s), 130×130, 1.5px solid accent border.
- Heading: 24px / 700 / letter-spacing -.01em. Subtext: 14px / 500 / `#8a8a92`, max-width 380, line-height 1.5.
- States drive heading + subtext:
  - `idle` → "Let's find your label maker" / "Turn the LetraTag 200B on and keep it nearby. We connect over Bluetooth — no phone app needed."
  - `scan` → "Scanning for printers…" / "Hold tight while we look for a DYMO LetraTag 200B over Bluetooth."
  - `found` → "Found it" / "Your printer is ready to pair."
  - `pairing` → "Pairing…" / "Establishing a secure Bluetooth connection…"
- **Found-device card** (380px, `border-radius: 14px`, `padding: 16px`, bg `rgba(255,255,255,.03)`,
  accent border + glow shadow): 44×44 rounded tile with a Lucide **printer** icon, "DYMO LetraTag 200B"
  (14/700) + MAC address (11px mono `#8a8a92`), and a 4-bar **signal strength** meter on the right
  (bars 6/10/14/18px tall; filled count from RSSI: >-50→4, >-58→3, >-66→2, else 1; filled = accent).
- Primary button (changes per state): "Scan for printer" → "Connecting…"/"Connect" → "Pairing…".
  Style: `padding: 13px 30px; border-radius: 11px;` accent gradient bg, dark text, glow shadow.
- Readiness row: three Lucide **check** items (accent-green) — "Bluetooth on · Lid closed · Cassette inserted".
- Text link: "Design without a printer →" → enters editor in offline mode.

**Add back in production:** a fade-in on view mount.

### 2. Editor (primary view)
**Purpose:** Design the label. This is where the user spends ~all their time.

**Layout:** Vertical: 48px **titlebar** + flex body (300px sidebar + flexible canvas column).

**Titlebar (48px, bg `#0b0b0e`, bottom border `1px rgba(255,255,255,.06)`):**
GerdsenAI logo 26×26 (radius 7) · "Label Studio" 13/700 · "v0.1 · MIT" pill (11px, bordered, radius 20) ·
centered filename (12px mono `#62626a`, auto-derived: `label-<slug>.png`) · settings gear button (32×32,
Lucide **settings**) · **connection pill** (rounded 20, dot + label; green when connected showing
"LetraTag 200B", else "Connect").

**Sidebar (300px, bg `#0b0b0e`, scrollable, `padding: 16px`, `gap: 20px`):** sections, each with an
uppercase label (`secLabel`: 10px / 700 / letter-spacing .16em / `#62626a`):
- **Content** — segmented Text / Barcode toggle. Text mode: Line 1 + Line 2 inputs (Line 2 dims to
  opacity .4 + pointer-events none when 2-lines is off), a "2 lines" toggle, and a 3-way align control
  (‹ ≡ ›). Barcode mode: a single monospace "Barcode data" input.
- **Typeface** (text mode only) — 5 buttons, each previewed in its own font: **Condensed** (Oswald),
  **Grotesk** (Space Grotesk), **Mono** (JetBrains Mono), **Display** (Anton), **Script** (Caveat).
- **Style** (text mode only) — size segmented S/M/L; Bold (B), Underline (U), Invert (Inv) toggles;
  Padding slider 0–6.
- **Extras** (text mode only) — a row of printable glyph chips (∅ ★ ♥ ✓ → ● ⚡ ☂ ✿ ✱; ∅ = none) that
  prepend a symbol to line 1, plus an "Insert today's date" toggle. *(These glyphs are printed ONTO
  the label — they are label content, intentionally NOT Lucide icons.)*
- **Tape colour** — 7 swatches (32×32, radius 9): White, Clear (checkerboard), Yellow, Red, Green,
  Blue, Silver (metallic gradient). Selected = accent ring. Caption: "<Tape> · black thermal print".
- **Templates** — 8 rows, each a Lucide icon + name: Name badge (id-card), File folder (folder),
  Cable label (plug), Pantry jar (archive), Fragile (triangle-alert), Opened on (calendar),
  Address (mail), Barcode (barcode). Clicking applies a preset state.

**Canvas column:** flexible stage on a radial dark gradient (`radial-gradient(130% 130% at 50% -5%, #15151c, #0a0a0d 68%)`),
with a soft accent glow blob (blurred radial, toggleable via `glow` prop).
- **Empty state** (no content): dashed 220×64 placeholder "your label" + "Type in the sidebar to design a label".
- **Filled state**: the 1-bit raster, upscaled, in a "label holder" — `padding: 20px; border-radius: 9px;
  background: rgba(0,0,0,.32); box-shadow: 0 16px 55px -14px rgba(0,0,0,.75), 0 0 0 1px rgba(255,255,255,.06)`.
  Caption below: "12 mm tall · ~N mm printed · <Tape> tape".
- **Top-right**: live result text + the **Print** button (Lucide printer icon + label). Label is "Print"
  when connected, "Connect & print" when not. Disabled (gray) when the label is empty.

**Status bar (42px, bg `#0b0b0e`):** left = mono connection string (`● <MAC> · RSSI <n> dBm · battery OK`
or `○ not connected · designing offline`); right = "Recent" + horizontally-scrolling chips of recently
printed labels (click to restore that design). Empty = "nothing printed yet".

### 3. Print Overlay (modal)
**Purpose:** Show the print in progress and its result honestly.

**Layout:** Centered modal (420px, radius 18, bg `#101013`, border `1px rgba(255,255,255,.08)`,
big shadow, `gPop` scale-in .25s) over a blurred scrim (`rgba(4,4,6,.72)` + `backdrop-filter: blur(6px)`).
- Top: a mini preview of the exact label being printed (1-bit raster on a dark plate).
- **Running**: spinner (20px, accent top-border, `gSpin` .8s linear infinite) + stage text
  ("Rasterizing label…" → "Sending to LetraTag"); a progress bar (7px, accent gradient fill); and a
  mono sub-line ("1-bit · N×30 px · stretch ×2" then "chunk X / Y · NN%").
- **Result**: 56px circular halo (color by outcome) with a Lucide **check** (success) or
  **triangle-alert** (failure); big title + detail; "Done" + "Print again"/"Retry" buttons. Outcomes
  mirror real status codes: printed / printed-battery-low (amber) / no-cassette (red).

### 4. Settings (slide-over)
**Purpose:** Printer management + print defaults + about.

**Layout:** Right-anchored panel (380px, full height, bg `#0d0d10`, left border, big shadow) over a
`rgba(4,4,6,.55)` scrim (click scrim to close). Header: "Settings" + close (Lucide **x**).
- **Printer** card — connection dot + status, MAC (mono), "RSSI … · battery OK"; "Forget printer"
  (destructive, red-tinted) when connected, else "Connect a printer".
- **Print defaults** — Floyd–Steinberg dither (checkbox), Strict MAC match (checkbox), Stretch ×1–4
  (slider), Scan timeout 3–15s (slider). These map 1:1 to the engine's CLI flags (see Design Tokens → CLI map).
- **About** — name/version, one-liner, engine credit "ysfchn/dymo-bluetooth (MIT)", "Built with Tauri · Rust · WebView."

**Add back in production:** a slide-in from the right (`translateX(100%)→0`, ~.28s cubic-bezier(.2,.8,.2,1)).

---

## Interactions & Behavior
- **First launch** → Connect view. **Returning (paired)** → Editor directly.
- **Scan**: idle→scan; after a timeout proportional to the "Scan timeout" setting, →found (with a
  synthetic MAC + RSSI). **Connect**: found→pairing→on, persist pairing, go to Editor.
- **Print** (button or **⌘/Ctrl + P**): if empty, no-op; if not connected, route to Connect; else open
  Print overlay → raster (≈650ms) → chunked send (interval ticks, ~140ms, count derived from label width)
  → result. Successful prints prepend to Recent history (cap 8).
- **Esc** dismisses the Print overlay (if open) else Settings.
- **Connection pill**: if connected → open Settings; else → go to Connect.
- **Templates / Recent chips**: clicking applies a saved state snapshot.
- **Live preview** re-renders on every content/style/tape/font change, and again on `document.fonts.ready`
  (so web-font metrics are correct).
- **Hover/active**: buttons use subtle bg/border lifts; selected segmented controls use accent fill
  (`border: accent; background: rgba(accent,.18); color: #eaf2ff`).
- **Disabled Print**: bg `#2a2a30`, text `#76767e`, no shadow, default cursor.

## State Management
Single component state (port to a store / React state):
`screen` ('connect'|'editor') · `conn` ('idle'|'scan'|'found'|'pairing'|'on') · `addr`, `rssi`, `battery` ·
`line1`, `line2`, `twoLines` · `font` ('S'|'M'|'L'), `fontFamily` ('condensed'|'grotesk'|'mono'|'display'|'script') ·
`bold`, `underline`, `invert`, `align` ('left'|'center'|'right') · `tape` (7 ids) · `mode` ('text'|'barcode'),
`barcode`, `icon`, `date`, `padding` (0–6) · `print` ({stage:'raster'|'send'|'result', progress, chunks, sent, result}) ·
`history` (max 8 snapshots) · `settingsOpen` · defaults: `dither`, `ensureMac`, `stretch` (1–4), `timeout` (3–15).
Persist `paired:{addr,rssi}` and the print defaults.

**Data the real app fetches/does (replace the prototype's simulations):** BLE scan, connect, print
(see architecture). Everything else is local.

---

## Design Tokens

**Colors**
- Backgrounds: `#08080a` (app), `#0b0b0e` (chrome/sidebar), `#0d0d10` (settings), `#101013` (modal),
  `#161619` (inputs). Canvas stage gradients as quoted above.
- Text: `#f2f2f4` (primary), `#cfcfd6` / `#9a9aa2` (secondary), `#8a8a92` / `#62626a` / `#56565e` (muted), `#42424a` (faint).
- Borders/hairlines: `rgba(255,255,255,.06)`–`.12`.
- Accent (default **green**, switchable): green `#2fc46a` + `linear-gradient(90deg,#1ba85a,#46e08a)`;
  blue `#1f8bff`; violet `#9b46e0`; rainbow (GerdsenAI Apple-spectrum gradient
  `#00FF41,#FFD700,#FF8C00,#FF4500,#FF1493,#9932CC,#0080FF`).
- Status: success `#2fc46a`, warning `#f5c542`, error `#ff6a5c`.
- **Tape paper/ink** (preview only — the print is always black on the cassette color):
  White `#f4f3ec`/`#1a1a1a` · Clear checkerboard · Yellow `#f5d12e`/`#1a1a1a` · Red `#d8433b`/`#161616` ·
  Green `#54b75f`/`#11210f` · Blue `#4f93d1`/`#0e1620` · Silver metallic gradient.

**Typography**
- UI font: system stack (`-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', 'Segoe UI', system-ui`).
- Label fonts (Google Fonts; **bundle as local `.ttf` in production** so output is identical across machines):
  Oswald, Space Grotesk, JetBrains Mono, Anton, Caveat.
- UI sizes: 24 (connect heading), 17 (modal title), 14 (section titles/buttons), 13 (body/inputs),
  12 (captions/labels), 11 (mono/meta), 10 (uppercase section labels, letter-spacing .16em). Weights 500/600/700.

**Spacing / radius / motion**
- Spacing on an 8px-ish rhythm (gaps 6/8/10/12/14/16/18/20; pads 9–26).
- Radius: 7–9 (controls/inputs), 11–14 (cards), 18 (modal), 20 (pills), 26 (logo tile), 50% (dots/halo).
- Motion keyframes: `gPulse`, `gFlow`, `gRing`, `gFloat`, `gSpin`, `gPop`, `gSlide`, `gFade` (definitions
  in the HTML `<style>`). Durations .14s (control transitions) to 5s (logo float).

**Engine / CLI map** (Settings & Style controls → `ysfchn/dymo-bluetooth` flags)
| UI control | CLI flag |
|---|---|
| Style › Padding | `--padding N` |
| Style › Inv | `--reverse` |
| Settings › dither | `--dither` / `--no-dither` |
| Settings › Strict MAC | `--ensure-mac` |
| Settings › Stretch | `--stretch N` |
| Settings › Scan timeout | `--timeout N` |
| Content › Barcode | `--barcode DATA` (Code128) |

---

## The reusable rasterizer (port this, don't reinvent)
The HTML logic class contains the only nontrivial client code, and it ports directly to TS:
- **`buildBitmap()`** — renders 1–2 lines (optional leading icon glyph + optional date) to an offscreen
  canvas at H=30, thresholds luminance to a `Uint8Array` of 0/1. Honors font family, size (two-line
  map S/M/L = 10/12/14, one-line = 17/22/26), weight (Anton/Display forced 400), align, underline, padding (×7px).
- **`barcodeBitmap()`** — a Code128-style bar pattern with human-readable text underneath. **Note:** the
  prototype's pattern is *visually representative, not a spec-valid Code128.* In production, generate the
  real symbology (the engine does this when given `--barcode`, or use a JS/Rust barcode lib) so it scans.
- **`paint()` / `fillPaper()`** — upscales the bitmap with nearest-neighbor and composites it on the tape
  color (checkerboard for clear, vertical metallic gradient for silver), or inverts for white-on-black.

The PNG you hand the engine is just `buildBitmap()` → put 0/1 into a canvas at 1× (black/white) → export PNG.

---

## Recommended Architecture
**Tauri + Python sidecar** (fastest path, reuses the proven engine):
- Freeze `ysfchn/dymo-bluetooth` with PyInstaller into a per-platform sidecar binary; register under
  `tauri.conf.json › bundle.externalBin`.
- Rust `#[tauri::command]`s: `discover_printers(timeout, ensure_mac)`, `connect(address)`,
  `print_label(png_bytes, address)`; each shells out to the sidecar and returns parsed results
  (incl. status code → the overlay's result states).
- React + TS front-end implements the 4 views above; the rasterizer ports as a TS module.

**Alternative — pure Rust** (cleaner install, more work): `btleplug` for BLE + the `image` crate to
threshold to 1-bit; port the engine's byte-mapping (documented in its README).

**CI/installers:** `tauri-apps/tauri-action` on a `macos-latest` + `windows-latest` matrix → signed
`.dmg`/`.app` and `.msi`/NSIS.

---

## Icons
All UI icons are **Lucide** (inlined as SVG in the prototype to avoid a CDN dependency — use the
`lucide-react` package in production). Icons used: `settings`, `x`, `check`, `triangle-alert`, `printer`,
`id-card`, `folder`, `plug`, `archive`, `calendar`, `mail`, `barcode`. The printable **glyph chips**
(★ ♥ ✓ → ● ⚡ ☂ ✿ ✱) are label content rendered into the bitmap — keep them as text glyphs, not icons.

## Assets
- `assets/gerdsenai-logo.png` — GerdsenAI neural/fiber-optic mark (titlebar 26px, connect screen 132px).
  Use the official brand mark from `GerdsenAI_Branding` in your repo at build time.
- Brand: GerdsenAI dark/luminous system — `#0A0A0A`-family backgrounds, Apple-spectrum gradient available
  as the "rainbow" accent, white wordmark. Not affiliated with DYMO; *LetraTag* is a DYMO trademark.

## Files (in this bundle)
- **`Label Studio App.dc.html`** — the finished app (all 4 views, full logic). **This is the spec.**
- **`Label Studio (3 directions explored).dc.html`** — the earlier 3-direction exploration
  (Console / Card / Studio). Reference only; the app is the chosen "Studio" direction.
- **`support.js`** — the Design Component runtime. **Reference only — do not ship.** Needed only to open
  the `.dc.html` files in a browser locally.
- **`assets/gerdsenai-logo.png`** — logo asset.

To preview a `.dc.html`: open it directly in a browser (it loads `support.js` from the same folder).
