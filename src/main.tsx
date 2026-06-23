import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

// Bundled label typefaces (local @fontsource — no CDN, identical output offline).
import "@fontsource/oswald/400.css";
import "@fontsource/oswald/500.css";
import "@fontsource/oswald/600.css";
import "@fontsource/oswald/700.css";
import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/700.css";
import "@fontsource/anton/400.css";
import "@fontsource/caveat/500.css";
import "@fontsource/caveat/700.css";

// StrictMode intentionally omitted: it double-invokes effects in dev, which would
// fire duplicate sidecar calls (scan/connect/print) against real hardware.
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(<App />);
