// Settings slide-over: printer management, print defaults (mapped 1:1 to the
// engine's flags), and an About block. Slides in from the right.

import { accent, hexA } from "../data";
import { Icon } from "../icons";
import { useStore } from "../store";
import { css, SEC_LABEL } from "../ui";

export function SettingsDrawer() {
  const { state, closeSettings, forget, goConnect, setDither, setEnsureMac, setStretch, setTimeout } = useStore();
  const ac = accent();
  const connected = state.conn === "on";

  const cdot = connected ? "#2fc46a" : "#6e6e76";
  const connDot =
    "width:9px;height:9px;border-radius:50%;flex:none;background:" + cdot + (connected ? ";box-shadow:0 0 8px " + cdot : "");

  return (
    <div style={css("position:absolute;inset:0;z-index:50;display:flex;justify-content:flex-end;")}>
      <div onClick={closeSettings} style={css("position:absolute;inset:0;background:rgba(4,4,6,.55);")} />
      <div style={css("position:relative;width:380px;max-width:90%;height:100%;background:#0d0d10;border-left:1px solid rgba(255,255,255,.08);box-shadow:-20px 0 60px -20px rgba(0,0,0,.6);display:flex;flex-direction:column;animation:gSlide .28s cubic-bezier(.2,.8,.2,1);")}>
        <div style={css("height:48px;flex:none;display:flex;align-items:center;justify-content:space-between;padding:0 16px;border-bottom:1px solid rgba(255,255,255,.06);")}>
          <span style={css("font-size:14px;font-weight:700;")}>Settings</span>
          <button onClick={closeSettings} style={css("width:30px;height:30px;border-radius:8px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);color:#cfcfd6;cursor:pointer;display:flex;align-items:center;justify-content:center;")}>
            <Icon name="x" size={15} />
          </button>
        </div>

        <div style={css("flex:1;overflow-y:auto;padding:18px;display:flex;flex-direction:column;gap:22px;")}>
          {/* Printer */}
          <div>
            <div style={css(SEC_LABEL)}>Printer</div>
            <div
              style={css(
                "border-radius:11px;padding:14px;background:" +
                  (connected ? "rgba(47,196,106,.07)" : "rgba(255,255,255,.02)") +
                  ";border:1px solid " +
                  (connected ? "rgba(47,196,106,.25)" : "rgba(255,255,255,.07)") +
                  ";",
              )}
            >
              <div style={css("display:flex;align-items:center;gap:9px;margin-bottom:8px;")}>
                <span style={css(connDot)} />
                <span style={css("font-size:13px;font-weight:700;")}>{connected ? "Connected" : "Disconnected"}</span>
              </div>
              <div style={css("font-size:11px;color:#8a8a92;font-weight:600;font-family:ui-monospace,Menlo,monospace;margin-bottom:4px;")}>
                {connected ? state.addr : "No printer connected"}
              </div>
              <div style={css("font-size:11px;color:#8a8a92;font-weight:600;margin-bottom:12px;")}>
                {connected ? "RSSI " + state.rssi + " dBm · battery OK" : "—"}
              </div>
              <div style={css("display:flex;gap:8px;")}>
                {connected ? (
                  <button onClick={forget} style={css("flex:1;padding:9px;border-radius:8px;border:1px solid rgba(255,106,92,.3);background:rgba(255,106,92,.1);color:#ff8a7e;font-size:12px;font-weight:700;cursor:pointer;")}>
                    Forget printer
                  </button>
                ) : (
                  <button onClick={goConnect} style={css("flex:1;padding:9px;border-radius:8px;border:1px solid " + ac.hex + ";background:" + hexA(ac.hex, 0.16) + ";color:#eaffef;font-size:12px;font-weight:700;cursor:pointer;")}>
                    Connect a printer
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Print defaults */}
          <div>
            <div style={css(SEC_LABEL)}>Print defaults</div>
            <div style={css("display:flex;flex-direction:column;gap:12px;font-size:13px;color:#cfcfd6;font-weight:600;")}>
              <label style={css("display:flex;align-items:center;justify-content:space-between;cursor:pointer;")}>
                Floyd–Steinberg dither
                <input type="checkbox" checked={state.dither} onChange={(e) => setDither(e.target.checked)} style={{ accentColor: ac.hex, width: 16, height: 16 }} />
              </label>
              <label style={css("display:flex;align-items:center;justify-content:space-between;cursor:pointer;")}>
                Strict MAC match
                <input type="checkbox" checked={state.ensureMac} onChange={(e) => setEnsureMac(e.target.checked)} style={{ accentColor: ac.hex, width: 16, height: 16 }} />
              </label>
              <div style={css("display:flex;align-items:center;justify-content:space-between;gap:12px;")}>
                Stretch ×{state.stretch}
                <input type="range" min={1} max={4} step={1} value={state.stretch} onChange={(e) => setStretch(+e.target.value)} style={{ width: 130, accentColor: ac.hex }} />
              </div>
              <div style={css("display:flex;align-items:center;justify-content:space-between;gap:12px;")}>
                Scan timeout {state.timeout}s
                <input type="range" min={3} max={15} step={1} value={state.timeout} onChange={(e) => setTimeout(+e.target.value)} style={{ width: 130, accentColor: ac.hex }} />
              </div>
            </div>
          </div>

          {/* About */}
          <div>
            <div style={css(SEC_LABEL)}>About</div>
            <div style={css("font-size:12px;color:#8a8a92;font-weight:500;line-height:1.7;")}>
              GerdsenAI Label Studio · v0.1
              <br />
              Open-source desktop client for the DYMO LetraTag 200B.
              <br />
              Bluetooth engine: <span style={css("color:#cfcfd6;font-weight:600;")}>ysfchn/dymo-bluetooth</span> (MIT).
              <br />
              Built with Tauri · Rust · WebView.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
