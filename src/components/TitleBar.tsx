// Editor title bar: brand, filename, settings, connection pill. The bar doubles
// as the window drag handle (double-click toggles maximize); a spacer reserves
// room for the fixed WindowControls on the right.

import { accent } from "../data";
import { Icon } from "../icons";
import { useStore } from "../store";
import { windowControls } from "../backend";
import { css } from "../ui";

const DRAG = { "data-tauri-drag-region": "" } as Record<string, string>;

export function TitleBar() {
  const { state, openSettings, pillClick } = useStore();
  const ac = accent();

  const filename =
    (state.mode === "barcode" ? "barcode" : "label") +
    "-" +
    (state.line1 || "untitled").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 16) +
    ".png";

  const connColors: Record<string, string> = {
    idle: "#6e6e76",
    scan: "#f5d12e",
    found: ac.hex,
    pairing: ac.hex,
    on: "#2fc46a",
  };
  const cdot = connColors[state.conn] || "#6e6e76";
  const connDot =
    "width:9px;height:9px;border-radius:50%;flex:none;background:" +
    cdot +
    (state.conn === "scan" || state.conn === "pairing" ? ";animation:gPulse 1s infinite" : "") +
    (state.conn === "on" ? ";box-shadow:0 0 8px " + cdot : "");
  const connText =
    state.conn === "on" ? "LetraTag 200B" : state.conn === "scan" ? "Scanning…" : state.conn === "pairing" ? "Pairing…" : "Connect";
  const connPill =
    "display:inline-flex;align-items:center;gap:8px;padding:7px 13px;border-radius:20px;border:1px solid " +
    (state.conn === "on" ? "rgba(47,196,106,.4)" : "rgba(255,255,255,.12)") +
    ";background:" +
    (state.conn === "on" ? "rgba(47,196,106,.1)" : "rgba(255,255,255,.03)") +
    ";color:#dcdce2;font-size:12px;font-weight:600;cursor:pointer;";

  return (
    <div
      {...DRAG}
      onDoubleClick={() => windowControls.toggleMaximize()}
      style={css(
        "height:48px;flex:none;display:flex;align-items:center;gap:12px;padding:0 14px;border-bottom:1px solid rgba(255,255,255,.06);background:#0b0b0e;",
      )}
    >
      <img src="/gerdsenai-logo.png" alt="GerdsenAI" style={css("width:30px;height:30px;border-radius:8px;display:block;")} />
      <span style={css("font-size:13px;font-weight:700;")}>Label Studio</span>
      <span style={css("font-size:11px;color:#56565e;font-weight:600;padding:2px 7px;border:1px solid rgba(255,255,255,.08);border-radius:20px;")}>
        v0.1 · MIT
      </span>
      <div {...DRAG} style={css("flex:1;display:flex;justify-content:center;")}>
        <span style={css("font-size:12px;color:#62626a;font-weight:600;font-family:ui-monospace,Menlo,monospace;")}>{filename}</span>
      </div>
      <button
        onClick={openSettings}
        title="Settings"
        style={css(
          "width:32px;height:32px;border-radius:8px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);color:#cfcfd6;cursor:pointer;display:flex;align-items:center;justify-content:center;",
        )}
      >
        <Icon name="settings" size={16} />
      </button>
      <button onClick={pillClick} style={css(connPill)}>
        <span style={css(connDot)} />
        {connText}
      </button>
      {/* room for the fixed window controls */}
      <div style={css("width:138px;flex:none;")} {...DRAG} />
    </div>
  );
}
