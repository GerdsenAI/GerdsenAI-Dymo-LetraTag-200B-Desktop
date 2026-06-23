// Shared types for the Label Studio frontend.

export type Accent = { hex: string; grad: string };
export type Screen = "connect" | "editor";
export type Conn = "idle" | "scan" | "found" | "pairing" | "on";
export type FontSize = "S" | "M" | "L";
export type FontFamily = "condensed" | "grotesk" | "mono" | "display" | "script";
export type Align = "left" | "center" | "right";
export type TapeId = "white" | "clear" | "yellow" | "red" | "green" | "blue" | "silver";
export type Mode = "text" | "barcode";
export type PrintStage = "rasterizing" | "sending" | "result";

export interface PrintResult {
  ok: boolean;
  warn?: boolean;
  big: string;
  det: string;
  icon: "check" | "triangle-alert";
}

export interface PrintState {
  stage: PrintStage;
  percent: number;
  sent: number;
  total: number;
  result: PrintResult | null;
}

/** The subset of state captured by a template or a Recent-history chip. */
export interface Snapshot {
  line1: string;
  line2: string;
  twoLines: boolean;
  font: FontSize;
  fontFamily: FontFamily;
  bold: boolean;
  underline: boolean;
  invert: boolean;
  align: Align;
  tape: TapeId;
  mode: Mode;
  barcode: string;
  icon: string;
  date: boolean;
  padding: number;
}

export interface HistoryItem {
  text: string;
  snap: Snapshot;
}

export interface LabelState {
  // device / connection
  screen: Screen;
  conn: Conn;
  addr: string;
  rssi: number;
  name: string;
  battery: string;
  // content
  line1: string;
  line2: string;
  twoLines: boolean;
  // typography / style
  font: FontSize;
  fontFamily: FontFamily;
  bold: boolean;
  underline: boolean;
  invert: boolean;
  align: Align;
  // tape / mode / extras
  tape: TapeId;
  mode: Mode;
  barcode: string;
  icon: string;
  date: boolean;
  padding: number;
  // transient
  print: PrintState | null;
  history: HistoryItem[];
  settingsOpen: boolean;
  scanError: string;
  // defaults (map 1:1 to engine flags)
  dither: boolean;
  ensureMac: boolean;
  stretch: number;
  timeout: number;
}

export interface Bitmap {
  w: number;
  h: number;
  data: Uint8Array;
}
