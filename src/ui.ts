// Tiny helpers shared across views. `css()` turns the design's inline style
// strings into React style objects so the prototype's exact styling ports over
// verbatim — keeping fidelity and sidestepping CSS-specificity surprises.

import type { CSSProperties } from "react";
import { accent, hexA } from "./data";

export function css(s: string): CSSProperties {
  const out: Record<string, string> = {};
  for (const rule of s.split(";")) {
    const i = rule.indexOf(":");
    if (i < 0) continue;
    const k = rule.slice(0, i).trim();
    if (!k) continue;
    const v = rule.slice(i + 1).trim();
    const prop = k.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    out[prop] = v;
  }
  return out as CSSProperties;
}

export const SEC_LABEL =
  "font-size:10px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#62626a;margin-bottom:10px;";

/** Segmented-control style string (active = accent fill). */
export function seg(active: boolean): string {
  const h = accent().hex;
  return active
    ? `padding:7px 11px;border-radius:7px;border:1px solid ${h};background:${hexA(h, 0.18)};color:#eaf2ff;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;transition:all .14s;min-width:30px;`
    : "padding:7px 11px;border-radius:7px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.03);color:#9a9aa2;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;transition:all .14s;min-width:30px;";
}
