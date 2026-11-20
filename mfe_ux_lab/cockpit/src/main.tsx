import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { WorkspaceGate } from "./shell/WorkspaceGate.tsx";
import { LocaleProvider } from "./lib/locale.tsx";
import "./styles.css";
import "./theme/tokens.css"; // loaded LAST → re-skins every page to the package navy/neon system

import "./responsive.css";

const el = document.getElementById("root");
if (el) {
  createRoot(el).render(
    <React.StrictMode>
      <LocaleProvider><WorkspaceGate><App /></WorkspaceGate></LocaleProvider>
    </React.StrictMode>,
  );
}
