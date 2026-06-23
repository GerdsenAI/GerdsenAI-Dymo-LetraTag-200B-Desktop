// Static design data ported verbatim from the Claude Design prototype:
// accent, tape colours, label typefaces, printable glyphs and templates.

import type { Accent, FontFamily, Snapshot, TapeId } from "./types";

/** The design ships a single accent; green is the default identity. */
export function accent(): Accent {
  return { hex: "#2fc46a", grad: "linear-gradient(90deg,#1ba85a,#46e08a)" };
}

export function hexA(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
}

export interface Tape {
  paper: string;
  ink: string;
  label: string;
  fg: string;
  sw: string;
}

export const TAPE_ORDER: TapeId[] = ["white", "clear", "yellow", "red", "green", "blue", "silver"];

export const TAPES: Record<TapeId, Tape> = {
  white: { paper: "#f4f3ec", ink: "#1a1a1a", label: "White", fg: "#f4f3ec", sw: "#f4f3ec" },
  clear: {
    paper: "clear",
    ink: "#1c1c1c",
    label: "Clear",
    fg: "#e7ebf0",
    sw: "linear-gradient(135deg,#cfd4da 25%,#aeb4bc 25% 50%,#cfd4da 50% 75%,#aeb4bc 75%)",
  },
  yellow: { paper: "#f5d12e", ink: "#1a1a1a", label: "Yellow", fg: "#f5d12e", sw: "#f5d12e" },
  red: { paper: "#d8433b", ink: "#161616", label: "Red", fg: "#f3e3e2", sw: "#d8433b" },
  green: { paper: "#54b75f", ink: "#11210f", label: "Green", fg: "#eaf6ea", sw: "#54b75f" },
  blue: { paper: "#4f93d1", ink: "#0e1620", label: "Blue", fg: "#eaf2fb", sw: "#4f93d1" },
  silver: {
    paper: "silver",
    ink: "#1a1a1a",
    label: "Silver",
    fg: "#f0f1f2",
    sw: "linear-gradient(135deg,#e2e5e7,#b3b7ba 50%,#d3d6d8)",
  },
};

/** Printable glyphs that prepend to line 1. "" = none (shown as ∅). */
export const ICONS = ["", "★", "♥", "✓", "→", "●", "⚡", "☂", "✿", "✱"];

export const FONT_ORDER: FontFamily[] = ["condensed", "grotesk", "mono", "display", "script"];

export const FONTS: Record<FontFamily, { label: string; stack: string }> = {
  condensed: { label: "Condensed", stack: "'Oswald','Arial Narrow','Roboto Condensed',sans-serif" },
  grotesk: { label: "Grotesk", stack: "'Space Grotesk',system-ui,sans-serif" },
  mono: { label: "Mono", stack: "'JetBrains Mono',ui-monospace,Menlo,monospace" },
  display: { label: "Display", stack: "'Anton','Arial Narrow',sans-serif" },
  script: { label: "Script", stack: "'Caveat',ui-rounded,cursive" },
};

export interface Template {
  name: string;
  lucide: string;
  s: Partial<Snapshot>;
}

export const TEMPLATES: Template[] = [
  { name: "Name badge", lucide: "id-card", s: { line1: "HELLO", line2: "my name is", twoLines: true, font: "M", bold: true, align: "center", mode: "text", invert: false, icon: "", date: false } },
  { name: "File folder", lucide: "folder", s: { line1: "TAXES 2026", line2: "", twoLines: false, font: "L", bold: true, align: "center", mode: "text", invert: false, icon: "", date: false } },
  { name: "Cable label", lucide: "plug", s: { line1: "HDMI", line2: "living room TV", twoLines: true, font: "M", bold: true, align: "left", mode: "text", invert: false, icon: "→", date: false } },
  { name: "Pantry jar", lucide: "archive", s: { line1: "FLOUR", line2: "", twoLines: false, font: "L", bold: true, align: "center", mode: "text", invert: false, icon: "", date: false } },
  { name: "Fragile", lucide: "triangle-alert", s: { line1: "FRAGILE", line2: "", twoLines: false, font: "L", bold: true, align: "center", mode: "text", invert: true, icon: "", date: false } },
  { name: "Opened on", lucide: "calendar", s: { line1: "OPENED", line2: "", twoLines: false, font: "M", bold: true, align: "center", mode: "text", invert: false, icon: "", date: true } },
  { name: "Address", lucide: "mail", s: { line1: "A. GERDSEN", line2: "1 Neural Way", twoLines: true, font: "S", bold: false, align: "left", mode: "text", invert: false, icon: "", date: false } },
  { name: "Barcode", lucide: "barcode", s: { mode: "barcode", barcode: "GERDSEN-200B" } },
];
