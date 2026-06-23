// Connect / first-run view. Scans for a printer over Bluetooth and pairs it.
// The whole surface is a window drag region; the logo is sized generously.

import { accent, hexA } from "../data";
import { Icon } from "../icons";
import { useStore } from "../store";
import { css } from "../ui";

const DRAG = { "data-tauri-drag-region": "" } as Record<string, string>;

const HEADINGS: Record<string, string> = {
  idle: "Let's find your label maker",
  scan: "Scanning for printers…",
  found: "Found it",
  pairing: "Pairing…",
};
const SUBS: Record<string, string> = {
  idle: "Turn the LetraTag 200B on and keep it nearby. We connect over Bluetooth — no phone app needed.",
  scan: "Hold tight while we look for a DYMO LetraTag 200B over Bluetooth.",
  found: "Your printer is ready to pair.",
  pairing: "Establishing a secure Bluetooth connection…",
};

export function ConnectView() {
  const { state, startScan, connectFound, skipOffline } = useStore();
  const ac = accent();
  const scanning = state.conn === "scan";
  const showFound = state.conn === "found";
  const showScanBtn = state.conn === "idle" || state.conn === "scan";

  const scanBtnStyle =
    "padding:13px 30px;border-radius:11px;border:none;background:" +
    ac.grad +
    ";background-size:200% 100%;color:#0a0a0a;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 10px 30px -10px " +
    hexA(ac.hex, 0.85) +
    ";" +
    (state.conn === "scan" || state.conn === "pairing" ? "opacity:.6;pointer-events:none;" : "");

  const strength = state.rssi > -50 ? 4 : state.rssi > -58 ? 3 : state.rssi > -66 ? 2 : 1;
  const ring = "position:absolute;width:150px;height:150px;border-radius:50%;border:1.5px solid " + ac.hex + ";animation:gRing 2s ease-out infinite";

  return (
    <div
      {...DRAG}
      style={css("position:absolute;inset:0;z-index:30;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(115% 80% at 50% -5%,#15151f,#08080a 62%);padding:40px;animation:gFade .3s ease;")}
    >
      <div {...DRAG} style={css("position:relative;width:260px;height:220px;display:flex;align-items:center;justify-content:center;margin-bottom:6px;")}>
        {scanning && (
          <>
            <div style={css(ring)} />
            <div style={css(ring + " .66s")} />
            <div style={css(ring + " 1.33s")} />
          </>
        )}
        <img
          src="/gerdsenai-logo.png"
          alt="GerdsenAI"
          style={css("width:156px;height:156px;border-radius:30px;display:block;animation:gFloat 5s ease-in-out infinite;box-shadow:0 20px 60px -20px rgba(0,0,0,.7);")}
        />
      </div>

      <div style={css("font-size:24px;font-weight:700;letter-spacing:-.01em;margin-bottom:8px;text-align:center;")}>
        {HEADINGS[state.conn] || HEADINGS.idle}
      </div>
      <div style={css("font-size:14px;color:#8a8a92;font-weight:500;margin-bottom:28px;text-align:center;max-width:380px;line-height:1.5;")}>
        {SUBS[state.conn] || SUBS.idle}
      </div>

      {showFound && (
        <div
          style={css(
            "width:380px;max-width:100%;border-radius:14px;padding:16px;background:rgba(255,255,255,.03);border:1px solid " +
              hexA(ac.hex, 0.4) +
              ";display:flex;align-items:center;gap:14px;margin-bottom:18px;animation:gPop .3s ease;box-shadow:0 0 0 1px " +
              hexA(ac.hex, 0.4) +
              ",0 12px 40px -16px " +
              hexA(ac.hex, 0.5) +
              ";",
          )}
        >
          <div style={css("width:44px;height:44px;flex:none;border-radius:11px;background:linear-gradient(135deg,#1c1c22,#101014);display:flex;align-items:center;justify-content:center;box-shadow:inset 0 1px 0 rgba(255,255,255,.05);color:#cfcfd6;")}>
            <Icon name="printer" size={22} color="#cfcfd6" />
          </div>
          <div style={css("flex:1;min-width:0;")}>
            <div style={css("font-size:14px;font-weight:700;")}>DYMO LetraTag 200B</div>
            <div style={css("font-size:11px;color:#8a8a92;font-weight:600;font-family:ui-monospace,Menlo,monospace;")}>{state.addr}</div>
          </div>
          <div style={css("display:flex;align-items:flex-end;gap:2px;height:18px;")}>
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                style={css("width:4px;border-radius:1px;height:" + (6 + i * 4) + "px;background:" + (i < strength ? ac.hex : "rgba(255,255,255,.14)") + ";")}
              />
            ))}
          </div>
        </div>
      )}

      {showScanBtn && (
        <button onClick={startScan} style={css(scanBtnStyle)}>
          {state.conn === "scan" ? "Scanning…" : "Scan for printer"}
        </button>
      )}
      {showFound && (
        <button onClick={connectFound} style={css(scanBtnStyle)}>
          {state.conn === "pairing" ? "Pairing…" : "Connect"}
        </button>
      )}

      {state.scanError && (
        <div style={css("margin-top:14px;font-size:12px;color:#ff8a7e;font-weight:600;max-width:380px;text-align:center;")}>{state.scanError}</div>
      )}

      <div style={css("display:flex;align-items:center;gap:18px;margin-top:30px;")}>
        {["Bluetooth on", "Lid closed", "Cassette inserted"].map((t) => (
          <span key={t} style={css("display:flex;align-items:center;gap:6px;font-size:12px;color:#6e6e76;font-weight:600;")}>
            <Icon name="check" size={14} color="#2fc46a" />
            {t}
          </span>
        ))}
      </div>

      <button onClick={skipOffline} style={css("margin-top:22px;background:none;border:none;color:#62626a;font-size:12px;font-weight:600;cursor:pointer;text-decoration:underline;text-underline-offset:3px;")}>
        Design without a printer →
      </button>
    </div>
  );
}
