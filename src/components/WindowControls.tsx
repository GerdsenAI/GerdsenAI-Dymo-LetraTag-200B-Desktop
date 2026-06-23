// Frameless-window controls (minimize / maximize-restore / close), always visible
// in the top-right so the window can be moved between windowed and maximized and
// closed from any screen. Pairs with the draggable regions on the title bar and
// connect view to give a portable, resizable, maximizable window.

import { useEffect, useState } from "react";
import { windowControls } from "../backend";
import { Icon } from "../icons";
import { css } from "../ui";

const BTN = "width:46px;height:48px;display:flex;align-items:center;justify-content:center;border:none;background:transparent;color:#9a9aa2;cursor:pointer;";

export function WindowControls() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    windowControls.isMaximized().then(setMaximized);
    windowControls
      .onResized(() => windowControls.isMaximized().then(setMaximized))
      .then((un) => {
        unlisten = un;
      });
    return () => unlisten?.();
  }, []);

  return (
    <div style={css("position:fixed;top:0;right:0;height:48px;display:flex;z-index:1000;")}>
      <button className="winctl" title="Minimize" onClick={() => windowControls.minimize()} style={css(BTN)}>
        <Icon name="minimize" size={15} />
      </button>
      <button
        className="winctl"
        title={maximized ? "Restore" : "Maximize"}
        onClick={() => windowControls.toggleMaximize()}
        style={css(BTN)}
      >
        <Icon name={maximized ? "restore" : "maximize"} size={maximized ? 13 : 12} />
      </button>
      <button className="winctl winctl-close" title="Close" onClick={() => windowControls.close()} style={css(BTN)}>
        <Icon name="x" size={16} />
      </button>
    </div>
  );
}
