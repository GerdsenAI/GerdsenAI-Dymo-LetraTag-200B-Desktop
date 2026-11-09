// Spec-valid Code 128 (subset B) encoder rendered to a 1-bit bitmap.
//
// The prototype shipped a "visually representative" bar pattern that does not
// scan. This produces a real Code 128-B symbol — start code, modulo-103 check
// digit, stop pattern and quiet zones — so the printed label decodes with any
// scanner. Code B covers ASCII 32–126 (upper/lowercase, digits, punctuation),
// which is the right default for human-named labels.

import type { Bitmap } from "./types";

// Bar/space element widths for Code 128 values 0–106 (index 106 = stop).
// Each entry sums to 11 modules (the stop is 13), elements alternate bar, space,
// bar, … starting with a bar.
const PATTERNS: string[] = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112",
];

const START_B = 104;
const STOP = 106;
const QUIET_MODULES = 10; // quiet zone each side

/** Encodes `input` as a Code 128-B module bit string (1 = bar/ink). */
function encodeModules(input: string): number[] {
  // Restrict to the printable ASCII range Code B can represent.
  const text = Array.from(input).filter((c) => {
    const code = c.charCodeAt(0);
    return code >= 32 && code <= 126;
  });

  const values = [START_B, ...text.map((c) => c.charCodeAt(0) - 32)];

  // Modulo-103 checksum: start weight 1, then data weighted by position.
  let checksum = values[0];
  for (let i = 1; i < values.length; i++) checksum += values[i] * i;
  checksum %= 103;

  const symbols = [...values, checksum, STOP];

  const modules: number[] = [];
  for (let q = 0; q < QUIET_MODULES; q++) modules.push(0);
  for (const sym of symbols) {
    const pattern = PATTERNS[sym];
    for (let e = 0; e < pattern.length; e++) {
      const width = pattern.charCodeAt(e) - 48;
      const ink = e % 2 === 0 ? 1 : 0;
      for (let w = 0; w < width; w++) modules.push(ink);
    }
  }
  for (let q = 0; q < QUIET_MODULES; q++) modules.push(0);
  return modules;
}

export interface BarcodeOptions {
  /** Small human-readable text under the bars (takes ~30% of the 30-dot head). Off = bars use the full height. */
  caption?: boolean;
  /** Print dots per bar module, 1-3. 2 doubles the bar width without stretching any text. */
  bar?: number;
  /** Big text printed left of the barcode at full head height, e.g. a bin code "A1". */
  side?: string;
}

/** Thresholds whatever is drawn on `c` into `data` (1 = ink) inside the given box. */
function inkFrom(c: CanvasRenderingContext2D, data: Uint8Array, W: number, x0: number, x1: number, y0: number, y1: number): void {
  const d = c.getImageData(0, 0, W, c.canvas.height).data;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = y * W + x;
      const a = d[i * 4 + 3];
      const lum = (d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2]) / 3;
      if (a > 60 && lum < 140) data[i] = 1;
    }
  }
}

/**
 * Renders Code 128-B for `str` to a 1-bit bitmap of height `H`. With the
 * caption off, the bars use the whole head height (the LetraTag head is only
 * 30 dots, so every dot of bar height helps a scanner). Optionally adds the
 * small caption under the bars, and/or a big text label left of the barcode.
 */
export function code128Bitmap(str: string, H: number, opts: BarcodeOptions = {}): Bitmap {
  const text = (str || " ").toString();
  const bar = Math.max(1, Math.min(3, Math.round(opts.bar ?? 1)));
  const modules = encodeModules(text || " ");
  const side = (opts.side || "").trim().slice(0, 24);

  // Size the side text so its ink fills the head height (bold, condensed), if any.
  let sideFont = "";
  let sideW = 0;
  let sideY = 0;
  if (side) {
    const m = document.createElement("canvas").getContext("2d")!;
    for (let px = 44; px >= 12; px--) {
      m.font = "700 " + px + "px 'Arial Narrow','Roboto Condensed',system-ui,sans-serif";
      const t = m.measureText(side);
      const ink = t.actualBoundingBoxAscent + t.actualBoundingBoxDescent;
      if (ink <= H - 2 || px === 12) {
        sideFont = m.font;
        sideW = Math.ceil(t.width) + 10;
        sideY = Math.round((H - ink) / 2 + t.actualBoundingBoxAscent); // alphabetic baseline
        break;
      }
    }
  }

  const barsW = modules.length * bar;
  const x0 = sideW; // bars start after the side text
  const W = Math.max(8, sideW + barsW);
  const data = new Uint8Array(W * H);
  const barH = opts.caption ? Math.round(H * 0.7) : H;

  for (let m = 0; m < modules.length; m++) {
    if (!modules[m]) continue;
    for (let k = 0; k < bar; k++) {
      const x = x0 + m * bar + k;
      for (let y = 0; y < barH; y++) data[y * W + x] = 1;
    }
  }

  if (!side && !opts.caption) return { w: W, h: H, data };

  const off = document.createElement("canvas");
  off.width = W;
  off.height = H;
  const c = off.getContext("2d")!;
  c.fillStyle = "#fff";
  c.fillRect(0, 0, W, H);
  c.fillStyle = "#000";
  if (side) {
    c.font = sideFont;
    c.textAlign = "left";
    c.textBaseline = "alphabetic";
    c.fillText(side, 2, sideY);
  }
  if (opts.caption) {
    c.textBaseline = "middle";
    // Human-readable caption, thresholded into the rows below the bars.
    c.font = "700 8px 'Arial Narrow',system-ui,sans-serif";
    c.textAlign = "center";
    c.fillText(text.slice(0, 42), x0 + barsW / 2, H - 5);
  }
  if (side) inkFrom(c, data, W, 0, x0, 0, H);
  if (opts.caption) inkFrom(c, data, W, x0, W, barH + 1, H);
  return { w: W, h: H, data };
}
