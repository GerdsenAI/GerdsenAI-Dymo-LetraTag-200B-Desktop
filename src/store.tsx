// Central state + behaviour for Label Studio, ported from the prototype's single
// component. Exposed through React context so each view stays focused. The mock
// scan/connect/print of the prototype are replaced with real calls into the
// Python engine via the Tauri backend (see backend.ts).

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as backend from "./backend";
import { buildBitmap, buildPrintBitmap, bitmapToPngBase64 } from "./raster";
import type { Bitmap, LabelState, PrintResult, Snapshot } from "./types";

function isEmpty(s: LabelState): boolean {
  if (s.mode === "barcode") return !(s.barcode || "").trim();
  return !((s.line1 || "").trim() || (s.twoLines && (s.line2 || "").trim()) || s.icon || s.date);
}

function snapshot(s: LabelState): Snapshot {
  return {
    line1: s.line1, line2: s.line2, twoLines: s.twoLines, font: s.font, fontFamily: s.fontFamily,
    bold: s.bold, underline: s.underline, invert: s.invert, align: s.align, tape: s.tape,
    mode: s.mode, barcode: s.barcode, icon: s.icon, date: s.date, padding: s.padding,
  };
}

function mapResult(code: number): PrintResult {
  switch (code) {
    case 0:
    case 1:
      return { ok: true, big: "Label printed", det: "Sent to the LetraTag print head successfully.", icon: "check" };
    case 3:
      return { ok: true, warn: true, big: "Printed · battery low", det: "Done — though the battery is getting low.", icon: "check" };
    case 7:
      return { ok: false, big: "No cassette detected", det: "Open the lid and insert a LetraTag cassette, then try again.", icon: "triangle-alert" };
    case 6:
      return { ok: false, big: "Battery too low", det: "Charge the LetraTag and try again.", icon: "triangle-alert" };
    case 4:
      return { ok: false, big: "Print cancelled", det: "The print job was cancelled.", icon: "triangle-alert" };
    default:
      return { ok: false, big: "Print failed", det: "The printer reported a failure (code " + code + "). Try again.", icon: "triangle-alert" };
  }
}

interface Paired {
  addr: string;
  rssi: number;
  name: string;
}

function loadPaired(): Paired | null {
  try {
    return JSON.parse(localStorage.getItem("gerdsen_paired") || "null");
  } catch {
    return null;
  }
}
function savePaired(p: Paired): void {
  try {
    localStorage.setItem("gerdsen_paired", JSON.stringify(p));
  } catch {
    /* ignore */
  }
}
function clearPaired(): void {
  try {
    localStorage.removeItem("gerdsen_paired");
  } catch {
    /* ignore */
  }
}

function initialState(): LabelState {
  const paired = loadPaired();
  return {
    screen: paired ? "editor" : "connect",
    conn: paired ? "pairing" : "idle",
    addr: paired?.addr || "",
    rssi: paired?.rssi || 0,
    name: paired?.name || "DYMO LetraTag 200B",
    battery: "good",
    line1: "GERDSEN",
    line2: "AI · LABS",
    twoLines: true,
    font: "M",
    fontFamily: "condensed",
    bold: true,
    underline: false,
    invert: false,
    align: "center",
    tape: "white",
    mode: "text",
    barcode: "GERDSEN-200B",
    icon: "",
    date: false,
    padding: 1,
    print: null,
    history: [],
    settingsOpen: false,
    scanError: "",
    dither: true,
    ensureMac: false,
    stretch: 2,
    timeout: 5,
  };
}

export interface Store {
  state: LabelState;
  bitmap: Bitmap;
  patch: (p: Partial<LabelState>) => void;
  applySnapshot: (snap: Partial<Snapshot>) => void;
  // content
  setLine1: (v: string) => void;
  setLine2: (v: string) => void;
  setBarcode: (v: string) => void;
  setPadding: (v: number) => void;
  toggleTwo: () => void;
  setMode: (m: "text" | "barcode") => void;
  // style
  setFontSize: (f: "S" | "M" | "L") => void;
  setFontFamily: (f: LabelState["fontFamily"]) => void;
  toggleBold: () => void;
  toggleUnderline: () => void;
  toggleInvert: () => void;
  setAlign: (a: LabelState["align"]) => void;
  toggleDate: () => void;
  setIcon: (g: string) => void;
  setTape: (t: LabelState["tape"]) => void;
  // settings
  setDither: (v: boolean) => void;
  setEnsureMac: (v: boolean) => void;
  setStretch: (v: number) => void;
  setTimeout: (v: number) => void;
  // flows
  startScan: () => void;
  connectFound: () => void;
  skipOffline: () => void;
  forget: () => void;
  goConnect: () => void;
  pillClick: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  doPrint: () => void;
  closePrint: () => void;
}

const StoreContext = createContext<Store | null>(null);

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within <LabelStudioProvider>");
  return ctx;
}

export function LabelStudioProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LabelState>(initialState);
  const [fontsReady, setFontsReady] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  const patch = useCallback((p: Partial<LabelState>) => {
    setState((s) => ({ ...s, ...p }));
  }, []);

  const applySnapshot = useCallback((snap: Partial<Snapshot>) => {
    setState((s) => ({ ...s, ...snap, print: null }));
  }, []);

  // Single shared 1-bit raster; recomputed when content/style or fonts change.
  const bitmap = useMemo(
    () => buildBitmap(state),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      state.mode, state.line1, state.line2, state.twoLines, state.font, state.fontFamily,
      state.bold, state.underline, state.align, state.barcode, state.icon, state.date,
      state.padding, fontsReady,
    ],
  );

  // ----- print -----

  const runPrint = useCallback(async () => {
    const s = stateRef.current;
    patch({ print: { stage: "rasterizing", percent: 0, sent: 0, total: 0, result: null } });
    try {
      const png = bitmapToPngBase64(buildPrintBitmap(s));
      const reply = await backend.printLabel(png, s.stretch, s.addr || undefined);
      const result = mapResult(reply.code);
      const cur = stateRef.current;
      let history = cur.history;
      if (result.ok) {
        const label =
          cur.mode === "barcode"
            ? "▮ " + cur.barcode
            : cur.line1 + (cur.twoLines && cur.line2 ? " / " + cur.line2 : "");
        history = [{ text: label, snap: snapshot(cur) }, ...history].slice(0, 8);
      }
      setState((st) => ({
        ...st,
        print: { stage: "result", percent: 100, sent: st.print?.total || 0, total: st.print?.total || 0, result },
        history,
      }));
    } catch (e) {
      setState((st) => ({
        ...st,
        print: { stage: "result", percent: 0, sent: 0, total: 0, result: { ok: false, big: "Print failed", det: String(e), icon: "triangle-alert" } },
      }));
    }
  }, [patch]);

  const doPrint = useCallback(() => {
    const s = stateRef.current;
    if (s.print && s.print.stage !== "result") return;
    if (isEmpty(s)) return;
    if (s.conn !== "on") {
      patch({ screen: "connect", conn: s.addr ? "found" : "idle", print: null });
      return;
    }
    void runPrint();
  }, [patch, runPrint]);

  const closePrint = useCallback(() => patch({ print: null }), [patch]);

  // ----- connect flow -----

  const startScan = useCallback(async () => {
    patch({ conn: "scan", scanError: "" });
    try {
      const s = stateRef.current;
      const printers = await backend.scan(s.timeout, s.ensureMac);
      if (printers.length) {
        const p = printers[0];
        patch({ conn: "found", addr: p.address, rssi: p.rssi ?? -60, name: p.name });
      } else {
        patch({ conn: "idle", scanError: "No LetraTag found. Make sure it's on and nearby." });
      }
    } catch (e) {
      patch({ conn: "idle", scanError: String(e) });
    }
  }, [patch]);

  const connectFound = useCallback(async () => {
    patch({ conn: "pairing", scanError: "" });
    try {
      const s = stateRef.current;
      await backend.connect(s.addr);
      savePaired({ addr: s.addr, rssi: s.rssi, name: s.name });
      patch({ conn: "on", screen: "editor" });
    } catch (e) {
      patch({ conn: "found", scanError: String(e) });
    }
  }, [patch]);

  const skipOffline = useCallback(() => patch({ screen: "editor", conn: "idle" }), [patch]);

  const forget = useCallback(() => {
    void backend.disconnect().catch(() => {});
    clearPaired();
    patch({ conn: "idle", addr: "", rssi: 0, name: "DYMO LetraTag 200B", settingsOpen: false, screen: "connect" });
  }, [patch]);

  const goConnect = useCallback(() => patch({ settingsOpen: false, screen: "connect", conn: "idle" }), [patch]);

  const pillClick = useCallback(() => {
    const s = stateRef.current;
    if (s.conn === "on") patch({ settingsOpen: true });
    else patch({ screen: "connect", conn: s.addr ? "found" : "idle" });
  }, [patch]);

  // ----- mount: fonts, reconnect, print events, keyboard -----

  useEffect(() => {
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => setFontsReady(true));
    } else {
      setFontsReady(true);
    }

    // Reconnect to a previously paired printer in the background.
    const paired = loadPaired();
    if (paired) {
      backend
        .connect(paired.addr)
        .then(() => setState((s) => ({ ...s, conn: "on" })))
        .catch(() => setState((s) => ({ ...s, conn: "idle" })));
    }

    const unlisteners: Array<Promise<() => void>> = [];
    unlisteners.push(
      backend.onPrintStage(({ stage }) =>
        setState((s) =>
          s.print ? { ...s, print: { ...s.print, stage: stage === "sending" ? "sending" : "rasterizing" } } : s,
        ),
      ),
    );
    unlisteners.push(
      backend.onPrintProgress(({ sent, total, percent }) =>
        setState((s) => (s.print ? { ...s, print: { ...s.print, sent, total, percent } } : s)),
      ),
    );

    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "p" || e.key === "P")) {
        if (stateRef.current.screen === "editor") {
          e.preventDefault();
          doPrint();
        }
        return;
      }
      if (e.key === "Escape") {
        const s = stateRef.current;
        if (s.print) closePrint();
        else if (s.settingsOpen) patch({ settingsOpen: false });
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
      unlisteners.forEach((p) => p.then((un) => un()).catch(() => {}));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const store: Store = {
    state,
    bitmap,
    patch,
    applySnapshot,
    setLine1: (v) => patch({ line1: v, print: null }),
    setLine2: (v) => patch({ line2: v, print: null }),
    setBarcode: (v) => patch({ barcode: v, print: null }),
    setPadding: (v) => patch({ padding: v }),
    toggleTwo: () => patch({ twoLines: !stateRef.current.twoLines }),
    setMode: (m) => patch({ mode: m, print: null }),
    setFontSize: (f) => patch({ font: f }),
    setFontFamily: (f) => patch({ fontFamily: f }),
    toggleBold: () => patch({ bold: !stateRef.current.bold }),
    toggleUnderline: () => patch({ underline: !stateRef.current.underline }),
    toggleInvert: () => patch({ invert: !stateRef.current.invert }),
    setAlign: (a) => patch({ align: a }),
    toggleDate: () => patch({ date: !stateRef.current.date }),
    setIcon: (g) => patch({ icon: g }),
    setTape: (t) => patch({ tape: t }),
    setDither: (v) => patch({ dither: v }),
    setEnsureMac: (v) => patch({ ensureMac: v }),
    setStretch: (v) => patch({ stretch: v }),
    setTimeout: (v) => patch({ timeout: v }),
    startScan,
    connectFound,
    skipOffline,
    forget,
    goConnect,
    pillClick,
    openSettings: () => patch({ settingsOpen: true }),
    closeSettings: () => patch({ settingsOpen: false }),
    doPrint,
    closePrint,
  };

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}
