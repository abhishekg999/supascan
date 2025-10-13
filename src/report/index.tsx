import { createRoot } from "react-dom/client";
import { App } from "./App";

function initApp() {
  const rootElement = document.getElementById("root");
  if (!rootElement) throw new Error("Root element not found");

  const reportData = window.__REPORT_DATA__;
  if (!reportData) throw new Error("Report data not found");

  const root = createRoot(rootElement);
  root.render(<App reportData={reportData} />);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
