import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit", import.meta.url));
const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const { build } = require("esbuild");
const bundle = await build({ entryPoints: ["src/lib/focusedHistoryFailure.ts"], absWorkingDir: app, bundle: true, platform: "node", format: "esm", write: false, logLevel: "silent" });
const api = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));
const microscope = readFileSync(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url), "utf8");

assert.match(api.explainFocusedHistoryRefreshFailure("NOT_CONNECTED"), /NOT_CONNECTED \| .*last verified tape is retained/);
assert.match(api.explainFocusedHistoryRefreshFailure("UNVERIFIED_M5_REFRESH"), /closed-bar or provenance checks/);
assert.match(api.explainFocusedHistoryRefreshFailure(undefined), /MT5_REFRESH_REQUEST_FAILED \| .*next refresh retries/);
assert.ok(api.explainFocusedHistoryRefreshFailure("x".repeat(1000)).length < 260,
  "refresh diagnostics must remain bounded when a connector returns an unexpectedly long reason");
assert.match(microscope, /const \[verifiedM5RefreshReason, setVerifiedM5RefreshReason\]/,
  "focused runtime must retain a bounded refresh failure reason separately from initial history promotion");
assert.match(microscope, /setVerifiedM5RefreshReason\(result\.reason \|\| null\)/,
  "a failed refresh result must become inspectable without replacing the verified tape");
assert.match(microscope, /setVerifiedM5RefreshReason\("MT5_REFRESH_REQUEST_FAILED"\)/,
  "transport exceptions must expose a stable user-visible refresh code");
assert.match(microscope, /MT5 REFRESH \| LAST VERIFIED TAPE RETAINED/,
  "the focused toolbar must disclose that refresh failed while the prior tape remains active");
assert.match(microscope, /<span>\{focusedCopy\.mt5Refresh\}<\/span><b>\{mt5RefreshStatus\}<\/b>/,
  "source coverage must expose the detailed refresh reason to assistive technology");
assert.match(microscope, /verifiedM5HeartbeatLabel = `MT5 M5 CLOSED \| \$\{verifiedM5HeartbeatUtc\} \| age \$\{verifiedM5HeartbeatAge\} \| \$\{verifiedM5HeartbeatState\} \| refresh \$\{verifiedM5RefreshState\}`/,
  "focused chart must expose a current closed-bar UTC heartbeat with age and refresh state");
assert.match(microscope, /verifiedM5HeartbeatState = verifiedM5Heartbeat\?\.reason === "FRESH"[\s\S]*?STALE_CLOSED_BAR[\s\S]*?UNKNOWN/,
  "heartbeat must distinguish fresh, stale, and unknown evidence");
assert.match(microscope, /m5-heartbeat\{flex:1 1 280px;min-width:0;max-width:100%;overflow-wrap:anywhere;white-space:normal/,
  "heartbeat copy must wrap within the focused mobile control bar");
assert.match(microscope, /SHADOW_ONLY \| NO_DECISION/,
  "heartbeat tooltip must preserve research-only authority wording");
console.log("FOCUSED M5 REFRESH STATUS PASS: refresh failures remain read-only, bounded, and visibly distinct from initial history fallback.");
