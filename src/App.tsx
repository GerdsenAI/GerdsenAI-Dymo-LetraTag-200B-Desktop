import { CanvasStage } from "./components/CanvasStage";
import { ConnectView } from "./components/ConnectView";
import { PrintOverlay } from "./components/PrintOverlay";
import { SettingsDrawer } from "./components/SettingsDrawer";
import { Sidebar } from "./components/Sidebar";
import { TitleBar } from "./components/TitleBar";
import { WindowControls } from "./components/WindowControls";
import { LabelStudioProvider, useStore } from "./store";
import { css } from "./ui";

function Shell() {
  const { state } = useStore();
  return (
    <div style={css("position:relative;width:100vw;height:100vh;min-height:560px;overflow:hidden;background:#08080a;color:#f2f2f4;")}>
      {state.screen === "editor" && (
        <div style={css("position:absolute;inset:0;display:flex;flex-direction:column;")}>
          <TitleBar />
          <div style={css("flex:1;display:flex;min-height:0;")}>
            <Sidebar />
            <CanvasStage />
          </div>
        </div>
      )}
      {state.screen === "connect" && <ConnectView />}
      {state.print && <PrintOverlay />}
      {state.settingsOpen && <SettingsDrawer />}
      <WindowControls />
    </div>
  );
}

export default function App() {
  return (
    <LabelStudioProvider>
      <Shell />
    </LabelStudioProvider>
  );
}
