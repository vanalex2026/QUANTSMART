import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit", import.meta.url));
const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const { build } = require("esbuild");
const bundle = await build({ entryPoints: ["src/lib/focusedHistoryFailure.ts"], absWorkingDir: app, bundle: true, platform: "node", format: "esm", write: false, logLevel: "silent" });
const api = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));

assert.match(api.explainFocusedHistoryFailure("BROKER_MAX_BARS_LIMIT · TERMINAL_MAX_BARS(100000)"), /BROKER_MAX_BARS_LIMIT · TERMINAL_MAX_BARS\(100000\) · MT5 terminal Max bars is too low/,
  "retention detail must select terminal-cap guidance while preserving the primary reason");
assert.match(api.explainFocusedHistoryFailure("HISTORY_PARTIAL_CHUNKS · BROKER_RETENTION"), /broker did not retain/,
  "broker retention details must remain actionable after a partial-chunk reason");
assert.match(api.explainFocusedHistoryFailure("MT5_HISTORY_REQUEST_FAILED"), /Check the terminal and retry/);
console.log("FOCUSED HISTORY FAILURE PASS: compound MT5 fallback reasons retain raw provenance and actionable guidance.");
