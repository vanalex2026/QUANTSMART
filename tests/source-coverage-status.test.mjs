import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const source = readFileSync(fileURLToPath(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url)), "utf8");

assert.match(source, /const sourceCoverageStatus = focused && source === "Live" && tf === "M5"/, "source coverage must derive an explicit focused MT5 status");
assert.match(source, /verifiedM5HistoryState === "loading"[\s\S]*MT5 (?:data|candle data) is loading/, "loading provenance must be announced clearly");
assert.match(source, /verifiedM5HistoryState === "fallback"[\s\S]*local snapshot is descriptive only/, "fallback provenance must be labelled descriptive-only");
assert.match(source, /!latestClosedBarFresh[\s\S]*latest closed-bar evidence is stale or unavailable/, "stale provenance must be announced clearly");
assert.match(source, /className="source-coverage-status" role="status" aria-live="polite" aria-atomic="true" aria-label=\{`\$\{focusedCopy\.sourceCoverageStatus\}: \$\{sourceCoverageStatus\}`\}/, "source coverage state must be one atomic accessible live status in the selected locale");

console.log("SOURCE COVERAGE STATUS PASS: MT5 loading, fallback, and stale states are explicit and accessible.");
