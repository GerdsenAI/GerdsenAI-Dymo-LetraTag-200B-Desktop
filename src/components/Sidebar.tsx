// The editor sidebar: Content, Typeface, Style, Extras, Tape colour, Templates.
// A faithful port of the prototype's sidebar with the same controls and styling.

import { accent, FONTS, FONT_ORDER, ICONS, TAPE_ORDER, TAPES, TEMPLATES } from "../data";
import { Icon } from "../icons";
import { useStore } from "../store";
import { css, SEC_LABEL, seg } from "../ui";

export function Sidebar() {
  const s = useStore();
  const { state } = s;
  const ac = accent();
  const isText = state.mode === "text";

  return (
    <div style={css("width:300px;flex:none;border-right:1px solid rgba(255,255,255,.06);background:#0b0b0e;display:flex;flex-direction:column;")}>
      <div style={css("flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:20px;")}>
        {/* ---------- Content ---------- */}
        <div>
          <div style={css(SEC_LABEL)}>Content</div>
          <div style={css("display:flex;gap:6px;padding:3px;background:rgba(255,255,255,.04);border-radius:9px;border:1px solid rgba(255,255,255,.07);margin-bottom:10px;")}>
            <button onClick={() => s.setMode("text")} style={css(seg(isText) + ";flex:1;text-align:center;padding:9px;")}>Text</button>
            <button onClick={() => s.setMode("barcode")} style={css(seg(!isText) + ";flex:1;text-align:center;padding:9px;")}>Barcode</button>
          </div>

          {isText ? (
            <div style={css("display:flex;flex-direction:column;gap:8px;")}>
              <input
                value={state.line1}
                onChange={(e) => s.setLine1(e.target.value)}
                placeholder="Line 1"
                style={css("width:100%;padding:10px 12px;border-radius:8px;border:1px solid rgba(255,255,255,.1);background:#161619;color:#f2f2f4;font-size:13px;font-weight:600;")}
              />
              <input
                value={state.line2}
                onChange={(e) => s.setLine2(e.target.value)}
                placeholder="Line 2"
                style={css((state.twoLines ? "" : "opacity:.4;pointer-events:none;") + "width:100%;padding:10px 12px;border-radius:8px;border:1px solid rgba(255,255,255,.1);background:#161619;color:#f2f2f4;font-size:13px;font-weight:600;")}
              />
              <div style={css("display:flex;gap:7px;")}>
                <button onClick={s.toggleTwo} style={css(seg(state.twoLines) + ";flex:1;")}>2 lines</button>
                <div style={css("display:flex;gap:4px;padding:3px;background:rgba(255,255,255,.04);border-radius:9px;border:1px solid rgba(255,255,255,.07);")}>
                  <button onClick={() => s.setAlign("left")} style={css(seg(state.align === "left"))}>‹</button>
                  <button onClick={() => s.setAlign("center")} style={css(seg(state.align === "center"))}>≡</button>
                  <button onClick={() => s.setAlign("right")} style={css(seg(state.align === "right"))}>›</button>
                </div>
              </div>
            </div>
          ) : (
            <input
              value={state.barcode}
              onChange={(e) => s.setBarcode(e.target.value)}
              placeholder="Barcode data"
              style={css("width:100%;padding:10px 12px;border-radius:8px;border:1px solid rgba(255,255,255,.1);background:#161619;color:#f2f2f4;font-size:12px;font-weight:600;font-family:ui-monospace,Menlo,monospace;")}
            />
          )}
        </div>

        {isText && (
          <>
            {/* ---------- Typeface ---------- */}
            <div>
              <div style={css(SEC_LABEL)}>Typeface</div>
              <div style={css("display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px;")}>
                {FONT_ORDER.map((id) => {
                  const ff = FONTS[id];
                  const on = state.fontFamily === id;
                  const extra =
                    ";font-family:" + ff.stack + ";" + (id === "display" ? "letter-spacing:.02em;" : "") + (id === "script" ? "font-size:14px;" : "font-size:12px;");
                  return (
                    <button key={id} onClick={() => s.setFontFamily(id)} style={css(seg(on) + extra)}>
                      {ff.label}
                    </button>
                  );
                })}
              </div>

              {/* ---------- Style ---------- */}
              <div style={css(SEC_LABEL)}>Style</div>
              <div style={css("display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap;")}>
                <div style={css("display:flex;gap:4px;padding:3px;background:rgba(255,255,255,.04);border-radius:9px;border:1px solid rgba(255,255,255,.07);")}>
                  <button onClick={() => s.setFontSize("S")} style={css(seg(state.font === "S"))}>S</button>
                  <button onClick={() => s.setFontSize("M")} style={css(seg(state.font === "M"))}>M</button>
                  <button onClick={() => s.setFontSize("L")} style={css(seg(state.font === "L"))}>L</button>
                </div>
                <button onClick={s.toggleBold} style={css(seg(state.bold))}>B</button>
                <button onClick={s.toggleUnderline} style={css(seg(state.underline))}>U</button>
                <button onClick={s.toggleInvert} style={css(seg(state.invert))}>Inv</button>
              </div>
              <div style={css("display:flex;align-items:center;gap:10px;")}>
                <span style={css("font-size:11px;color:#8a8a92;font-weight:600;white-space:nowrap;")}>Padding</span>
                <input
                  type="range"
                  min={0}
                  max={6}
                  step={1}
                  value={state.padding}
                  onChange={(e) => s.setPadding(+e.target.value)}
                  style={{ flex: 1, accentColor: ac.hex }}
                />
                <span style={css("font-size:11px;color:#cfcfd6;font-weight:700;width:14px;")}>{state.padding}</span>
              </div>
            </div>

            {/* ---------- Extras ---------- */}
            <div>
              <div style={css(SEC_LABEL)}>Extras</div>
              <div style={css("display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;")}>
                {ICONS.map((g, i) => (
                  <button
                    key={i}
                    onClick={() => s.setIcon(g)}
                    style={css(seg(state.icon === g) + ";width:34px;height:32px;display:flex;align-items:center;justify-content:center;font-size:13px;padding:0;")}
                  >
                    {g === "" ? "∅" : g}
                  </button>
                ))}
              </div>
              <button onClick={s.toggleDate} style={css(seg(state.date) + ";width:100%;")}>Insert today's date</button>
            </div>
          </>
        )}

        {/* ---------- Tape colour ---------- */}
        <div>
          <div style={css(SEC_LABEL)}>Tape colour</div>
          <div style={css("display:flex;gap:9px;flex-wrap:wrap;")}>
            {TAPE_ORDER.map((id) => {
              const tp = TAPES[id];
              const on = state.tape === id;
              const ring = on ? "0 0 0 2px " + ac.hex + ",0 0 0 4px rgba(0,0,0,.5)" : "0 0 0 1px rgba(255,255,255,.18)";
              return (
                <button
                  key={id}
                  title={tp.label}
                  onClick={() => s.setTape(id)}
                  style={css("width:32px;height:32px;border-radius:9px;border:none;cursor:pointer;background:" + tp.sw + ";box-shadow:" + ring + ";padding:0;transition:box-shadow .14s;")}
                />
              );
            })}
          </div>
          <div style={css("font-size:11px;color:#62626a;font-weight:600;margin-top:8px;")}>{TAPES[state.tape].label} · black thermal print</div>
        </div>

        {/* ---------- Templates ---------- */}
        <div>
          <div style={css(SEC_LABEL)}>Templates</div>
          <div style={css("display:flex;flex-direction:column;gap:6px;")}>
            {TEMPLATES.map((t) => (
              <button
                key={t.name}
                onClick={() => s.applySnapshot(t.s)}
                style={css("display:flex;align-items:center;gap:10px;padding:9px 11px;border-radius:8px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.02);color:#cfcfd6;font-size:12px;font-weight:600;cursor:pointer;text-align:left;")}
              >
                <span style={css("width:18px;display:flex;align-items:center;justify-content:center;color:#9a9aa2;")}>
                  <Icon name={t.lucide} size={16} color="#9a9aa2" />
                </span>
                {t.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
