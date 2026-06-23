// The canvas stage: the live 1-bit preview composited over the tape colour, the
// Print button + last result, and the status bar with Recent history.

import { useEffect, useRef } from "react";
import { accent, hexA, TAPES } from "../data";
import { Icon } from "../icons";
import { paint, sizeNote } from "../raster";
import { useStore } from "../store";
import { css } from "../ui";

export function CanvasStage() {
  const { state, bitmap, doPrint, applySnapshot } = useStore();
  const ac = accent();
  const mainRef = useRef<HTMLCanvasElement>(null);

  const empty =
    state.mode === "barcode"
      ? !(state.barcode || "").trim()
      : !((state.line1 || "").trim() || (state.twoLines && (state.line2 || "").trim()) || state.icon || state.date);

  useEffect(() => {
    if (mainRef.current) paint(mainRef.current, bitmap, state, "main");
  }, [bitmap, state.tape, state.invert, state.mode]);

  const printRunning = !!(state.print && state.print.stage !== "result");
  const printLabel = printRunning ? "Printing…" : state.conn === "on" ? "Print" : "Connect & print";
  const disabled = empty && state.mode === "text";
  const pBase = "display:inline-flex;align-items:center;gap:6px;border:none;border-radius:9px;color:#0a0a0a;font-size:13px;font-weight:700;cursor:pointer;transition:all .15s;padding:9px 18px;";
  const pBg =
    printRunning || disabled
      ? "background:#2a2a30;color:#76767e;cursor:default;"
      : "background:" + ac.grad + ";background-size:200% 100%;box-shadow:0 8px 22px -8px " + hexA(ac.hex, 0.8) + ";";

  const res = state.print && state.print.stage === "result" ? state.print.result : null;
  const resultText = res ? (res.ok ? (res.warn ? "Printed · battery low" : "Printed") : "Print failed") : "";
  const resultColor = res ? (res.ok ? (res.warn ? "#f5c542" : "#2fc46a") : "#ff6a5c") : "#8a8a92";

  const statusBar =
    state.conn === "on"
      ? "● " + state.addr + "  ·  RSSI " + state.rssi + " dBm  ·  battery OK"
      : "○ not connected  ·  designing offline";

  const glow =
    "position:absolute;width:55%;height:55%;top:6%;left:22%;border-radius:50%;background:radial-gradient(circle," +
    hexA(ac.hex, 0.14) +
    ",transparent 70%);filter:blur(24px);pointer-events:none;";

  return (
    <div style={css("flex:1;display:flex;flex-direction:column;min-width:0;")}>
      <div style={css("flex:1;position:relative;display:flex;align-items:center;justify-content:center;background:radial-gradient(130% 130% at 50% -5%,#15151c,#0a0a0d 68%);overflow:hidden;padding:32px;")}>
        <div style={css(glow)} />

        {empty ? (
          <div style={css("position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;gap:14px;text-align:center;")}>
            <div style={css("width:220px;height:64px;border:2px dashed rgba(255,255,255,.12);border-radius:8px;display:flex;align-items:center;justify-content:center;color:#4a4a52;font-size:13px;font-weight:600;")}>
              your label
            </div>
            <div style={css("font-size:13px;color:#6e6e76;font-weight:600;")}>Type in the sidebar to design a label</div>
          </div>
        ) : (
          <div style={css("position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;gap:20px;")}>
            <div style={css("position:relative;padding:20px;border-radius:9px;background:rgba(0,0,0,.32);box-shadow:0 16px 55px -14px rgba(0,0,0,.75),0 0 0 1px rgba(255,255,255,.06);max-width:760px;overflow:hidden;")}>
              <canvas className="gcv" ref={mainRef} />
            </div>
            <div style={css("display:flex;align-items:center;gap:10px;font-size:12px;color:#62626a;font-weight:600;letter-spacing:.02em;")}>
              <span>{sizeNote(bitmap.w, state.stretch)}</span>
              <span style={css("opacity:.4;")}>·</span>
              <span>{TAPES[state.tape].label} tape</span>
            </div>
          </div>
        )}

        <div style={css("position:absolute;top:18px;right:20px;z-index:2;display:flex;align-items:center;gap:10px;")}>
          <span style={{ fontSize: 12, fontWeight: 600, color: resultColor, minHeight: 16 }}>{resultText}</span>
          <button onClick={doPrint} style={css(pBase + pBg)}>
            <Icon name="printer" size={15} />
            {printLabel}
          </button>
        </div>
      </div>

      <div style={css("height:42px;flex:none;padding:0 18px;border-top:1px solid rgba(255,255,255,.06);background:#0b0b0e;display:flex;align-items:center;gap:14px;")}>
        <span style={css("font-size:11px;color:#8a8a92;font-weight:600;font-family:ui-monospace,Menlo,monospace;white-space:nowrap;")}>{statusBar}</span>
        <div style={css("flex:1;")} />
        <span style={css("font-size:11px;color:#56565e;font-weight:600;")}>Recent</span>
        <div style={css("display:flex;gap:6px;max-width:50vw;overflow-x:auto;")}>
          {state.history.length === 0 ? (
            <span style={css("font-size:11px;color:#42424a;font-weight:600;")}>nothing printed yet</span>
          ) : (
            state.history.map((h, i) => (
              <button
                key={i}
                onClick={() => applySnapshot(h.snap)}
                style={css("flex:none;padding:5px 10px;border-radius:7px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);color:#b6b6bd;font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap;max-width:150px;overflow:hidden;text-overflow:ellipsis;")}
              >
                {h.text}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
