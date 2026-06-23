// Thin wrappers over the Tauri commands exposed by src-tauri/src/lib.rs, plus the
// frameless window controls. The Rust side relays each call to the Python sidecar.

import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";

export interface PrinterInfo {
  address: string;
  name: string;
  rssi: number | null;
}

export interface PrintReply {
  code: number;
  name: string;
}

export async function scan(timeout: number, ensureMac: boolean): Promise<PrinterInfo[]> {
  const res = await invoke<{ printers: PrinterInfo[] }>("scan", { timeout, ensureMac });
  return res.printers || [];
}

export async function connect(address: string): Promise<{ connected: boolean; address: string; name: string }> {
  return await invoke("connect", { address });
}

export async function disconnect(): Promise<void> {
  await invoke("disconnect");
}

export async function printLabel(pngBase64: string, stretch: number, address?: string): Promise<PrintReply> {
  return await invoke<PrintReply>("print_label", { pngBase64, stretch, address });
}

export async function ping(): Promise<{ ok: boolean; version: string; platform: string }> {
  return await invoke("sidecar_ping");
}

export function onPrintProgress(cb: (p: { sent: number; total: number; percent: number }) => void): Promise<UnlistenFn> {
  return listen("print-progress", (e) => cb(e.payload as { sent: number; total: number; percent: number }));
}

export function onPrintStage(cb: (p: { stage: string }) => void): Promise<UnlistenFn> {
  return listen("print-stage", (e) => cb(e.payload as { stage: string }));
}

// ----- frameless window controls -----
// getCurrentWindow() is resolved lazily so this module also imports cleanly in a
// plain browser (e.g. `vite dev` previews), where there is no Tauri window.

export const windowControls = {
  minimize: () => getCurrentWindow().minimize(),
  toggleMaximize: () => getCurrentWindow().toggleMaximize(),
  close: () => getCurrentWindow().close(),
  isMaximized: () => getCurrentWindow().isMaximized(),
  onResized: (cb: () => void) => getCurrentWindow().onResized(cb),
};
