// Print overlay: a modal showing the exact label being printed, live progress
// driven by the engine's events, then the honest result (mirrors status codes).

import { useEffect, useRef } from "react";
import { accent, hexA } from "../data";
import { Icon } from "../icons";
import { paint } from "../raster";
import { useStore } from "../store";
import { css } from "../ui";

export function PrintOverlay() {
  const { state, bitmap, doPrint, closePrint } = useStore();
  const ac = accent();
  const miniRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (miniRef.current) paint(miniRef.current, bitmap, state, "mini");
  }, [bitmap, state.tape, state.invert, state.mode]);

  const pr = state.print;
  if (!pr) return null;
  const running = pr.stage !== "result";
  const res = pr.stage === "result" ? pr.result : null;

  const stageText = pr.stage === "rasterizing" ? "Rasterizing label…" : "Sending to LetraTag";
  const subText =
    pr.stage === "rasterizing"
      ? "1-bit · " + bitmap.w + "×30 px · stretch ×" + state.stretch
      : "chunk " + (pr.sent || 0) + " / " + (pr.total || 1) + "  ·  " + (pr.percent || 0) + "%";

  const ic = res ? (res.ok ? (res.warn ? "#f5c542" : "#2fc46a") : "#ff6a5c") : "#2fc46a";

  return (
    <div style={css("position:absolute;inset:0;z-index:40;display:flex;align-items:center;justify-content:center;background:rgba(4,4,6,.72);backdrop-filter:blur(6px);")}>
      <div style={css("width:420px;max-width:90%;border-radius:18px;background:#101013;border:1px solid rgba(255,255,255,.08);box-shadow:0 30px 80px -20px rgba(0,0,0,.7);padding:26px;animation:gPop .25s ease;")}>
        <div style={css("display:flex;justify-content:center;margin-bottom:20px;")}>
          <div style={css("padding:12px;border-radius:8px;background:rgba(0,0,0,.4);box-shadow:0 0 0 1px rgba(255,255,255,.06);max-width:100%;overflow:hidden;")}>
            <canvas className="gcv" ref={miniRef} />
          </div>
        </div>

        {running ? (
          <div>
            <div style={css("display:flex;align-items:center;gap:10px;margin-bottom:14px;")}>
              <div style={css("width:20px;height:20px;border-radius:50%;border:2px solid rgba(255,255,255,.15);border-top-color:" + ac.hex + ";animation:gSpin .8s linear infinite;")} />
              <span style={css("font-size:14px;font-weight:700;")}>{stageText}</span>
            </div>
            <div style={css("height:7px;border-radius:6px;background:rgba(255,255,255,.08);overflow:hidden;")}>
              <div style={css("height:100%;width:" + (pr.percent || 0) + "%;background:" + ac.grad + ";transition:width .14s linear;border-radius:6px;")} />
            </div>
            <div style={css("font-size:11px;color:#8a8a92;font-weight:600;margin-top:9px;font-family:ui-monospace,Menlo,monospace;")}>{subText}</div>
          </div>
        ) : (
          res && (
            <div style={css("text-align:center;animation:gPop .25s ease;")}>
              <div style={css("width:56px;height:56px;border-radius:50%;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;color:" + ic + ";background:" + hexA(ic, 0.14) + ";")}>
                <Icon name={res.icon} size={28} color={ic} />
              </div>
              <div style={css("font-size:17px;font-weight:700;margin-bottom:6px;")}>{res.big}</div>
              <div style={css("font-size:13px;color:#8a8a92;font-weight:500;margin-bottom:22px;line-height:1.5;")}>{res.det}</div>
              <div style={css("display:flex;gap:10px;")}>
                <button onClick={closePrint} style={css("flex:1;padding:12px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.03);color:#cfcfd6;font-size:13px;font-weight:700;cursor:pointer;")}>
                  Done
                </button>
                <button onClick={doPrint} style={css("flex:1;padding:12px;border-radius:10px;border:none;background:" + ac.grad + ";color:#0a0a0a;font-size:13px;font-weight:700;cursor:pointer;")}>
                  {res.ok ? "Print again" : "Retry"}
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
