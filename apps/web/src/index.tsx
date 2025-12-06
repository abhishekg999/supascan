import { createRoot } from "react-dom/client";
import { App } from "./App";

function initApp() {
  const rootElement = document.getElementById("root");
  if (!rootElement) throw new Error("Root element not found");

  const root = createRoot(rootElement);
  root.render(<App />);
}

initApp();

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
