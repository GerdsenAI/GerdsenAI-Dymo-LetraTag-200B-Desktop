// The label rasterizer — ported from the prototype's buildBitmap/paint/fillPaper.
//
// The printer head is a fixed 30px tall, 1-bit (ink or no-ink) strip. buildBitmap
// renders the user's text to an offscreen canvas at H=30 and luminance-thresholds
// it to a Uint8Array of 0/1 — the exact raster the print head needs. paint() shows
// that raster upscaled and composited over the chosen tape colour for the live
// preview. buildPrintBitmap() bakes invert so the PNG handed to the engine is
// byte-for-byte what prints.

import { FONTS, TAPES, type Tape } from "./data";
import { code128Bitmap } from "./barcode";
import type { Bitmap, LabelState } from "./types";

export const HEAD_PX = 30;

export function todayStr(): string {
  const d = new Date();
  return d.getMonth() + 1 + "/" + d.getDate() + "/" + String(d.getFullYear()).slice(2);
}

function drawLine(
  c: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  s: LabelState,
  px: number,
): void {
  c.fillText(text || "", x, y);
  if (s.underline && text) {
    const m = c.measureText(text).width;
    let lx = x;
    if (s.align === "center") lx = x - m / 2;
    else if (s.align === "right") lx = x - m;
    c.fillRect(lx, Math.round(y + px * 0.52), m, Math.max(1, Math.round(px * 0.09)));
  }
}

export function buildBitmap(s: LabelState): Bitmap {
  const H = HEAD_PX;
  if (s.mode === "barcode") return code128Bitmap(s.barcode || "", H);

  const L = s.twoLines ? [s.line1 || "", s.line2 || ""] : [s.line1 || ""];
  if (s.icon) L[0] = s.icon + " " + L[0];
  if (s.date) {
    if (s.twoLines) L[1] = (L[1] ? L[1] + "  " : "") + todayStr();
    else L[0] = (L[0] ? L[0] + "  " : "") + todayStr();
  }

  const sizeMap = s.twoLines ? { S: 10, M: 12, L: 14 } : { S: 17, M: 22, L: 26 };
  const px = (sizeMap as Record<string, number>)[s.font] || 20;
  const ff = FONTS[s.fontFamily] || FONTS.condensed;
  const weight = s.bold
    ? s.fontFamily === "display"
      ? "400"
      : "700"
    : s.fontFamily === "display"
      ? "400"
      : "500";
  const font = weight + " " + px + "px " + ff.stack;

  const measureCtx = document.createElement("canvas").getContext("2d")!;
  measureCtx.font = font;
  let tw = 0;
  L.forEach((t) => {
    tw = Math.max(tw, measureCtx.measureText(t || " ").width);
  });
  tw = Math.ceil(tw) + 6;
  const pad = (s.padding || 0) * 7;
  const W = Math.max(8, tw + pad * 2);

  const off = document.createElement("canvas");
  off.width = W;
  off.height = H;
  const c = off.getContext("2d")!;
  c.fillStyle = "#fff";
  c.fillRect(0, 0, W, H);
  c.fillStyle = "#000";
  c.font = font;
  c.textBaseline = "middle";
  c.textAlign = s.align as CanvasTextAlign;
  const ax = s.align === "left" ? pad + 1 : s.align === "right" ? W - pad - 1 : W / 2;
  if (s.twoLines) {
    drawLine(c, L[0], ax, H * 0.29, s, px);
    drawLine(c, L[1], ax, H * 0.71, s, px);
  } else {
    drawLine(c, L[0], ax, H * 0.5, s, px);
  }

  const d = c.getImageData(0, 0, W, H).data;
  const data = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const a = d[i * 4 + 3];
    const lum = (d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2]) / 3;
    data[i] = a > 60 && lum < 140 ? 1 : 0;
  }
  return { w: W, h: H, data };
}

function fillPaper(ctx: CanvasRenderingContext2D, cv: HTMLCanvasElement, tape: Tape): void {
  if (tape.paper === "clear") {
    const t = 7;
    for (let y = 0; y < cv.height; y += t) {
      for (let x = 0; x < cv.width; x += t) {
        ctx.fillStyle = (Math.floor(x / t) + Math.floor(y / t)) % 2 === 0 ? "#3a3a40" : "#2c2c31";
        ctx.fillRect(x, y, t, t);
      }
    }
    ctx.fillStyle = "rgba(222,230,238,0.16)";
    ctx.fillRect(0, 0, cv.width, cv.height);
    return;
  }
  if (tape.paper === "silver") {
    const g = ctx.createLinearGradient(0, 0, 0, cv.height);
    g.addColorStop(0, "#e2e5e7");
    g.addColorStop(0.45, "#c4c8cb");
    g.addColorStop(0.55, "#aeb2b6");
    g.addColorStop(1, "#cdd0d3");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, cv.width, cv.height);
    return;
  }
  ctx.fillStyle = tape.paper;
  ctx.fillRect(0, 0, cv.width, cv.height);
}

/** Paints the live preview onto a visible canvas, upscaled over the tape colour. */
export function paint(cv: HTMLCanvasElement, b: Bitmap, s: LabelState, kind: "main" | "mini"): void {
  const cfg = kind === "main" ? { maxW: 760, scale: 15 } : { maxW: 300, scale: 7 };
  let sc = Math.floor(cfg.maxW / Math.max(1, b.w));
  sc = Math.max(2, Math.min(cfg.scale, sc));
  if (!isFinite(sc)) sc = 4;
  cv.width = b.w * sc;
  cv.height = b.h * sc;
  cv.style.width = b.w * sc + "px";
  cv.style.height = b.h * sc + "px";

  const ctx = cv.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  const tape = TAPES[s.tape];
  const inv = s.invert && s.mode === "text";
  if (inv) {
    ctx.fillStyle = "#161618";
    ctx.fillRect(0, 0, cv.width, cv.height);
  } else {
    fillPaper(ctx, cv, tape);
  }
  ctx.fillStyle = inv ? tape.fg : tape.ink;
  for (let y = 0; y < b.h; y++) {
    for (let x = 0; x < b.w; x++) {
      if (b.data[y * b.w + x]) ctx.fillRect(x * sc, y * sc, sc, sc);
    }
  }
}

/** The exact pixels to burn: bakes invert so preview == print. */
export function buildPrintBitmap(s: LabelState): Bitmap {
  const b = buildBitmap(s);
  if (s.mode === "text" && s.invert) {
    const data = new Uint8Array(b.data.length);
    for (let i = 0; i < data.length; i++) data[i] = b.data[i] ? 0 : 1;
    return { w: b.w, h: b.h, data };
  }
  return b;
}

/** Renders a bitmap to a 1x black/white PNG and returns base64 (no data: prefix). */
export function bitmapToPngBase64(b: Bitmap): string {
  const cv = document.createElement("canvas");
  cv.width = b.w;
  cv.height = b.h;
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, b.w, b.h);
  ctx.fillStyle = "#000";
  for (let y = 0; y < b.h; y++) {
    for (let x = 0; x < b.w; x++) {
      if (b.data[y * b.w + x]) ctx.fillRect(x, y, 1, 1);
    }
  }
  return cv.toDataURL("image/png").split(",", 2)[1];
}

export function sizeNote(lastW: number, stretch: number): string {
  return "12 mm tall · ~" + Math.max(8, Math.round((lastW || 40) * 0.127 * stretch)) + " mm printed";
}
