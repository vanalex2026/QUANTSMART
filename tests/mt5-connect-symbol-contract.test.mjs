import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../mfe_ux_lab/cockpit/src/components/Mt5ConnectPanel.tsx", import.meta.url), "utf8");
assert.match(source, /loadSimOhlc\("H1", true, getActiveSymbol\(\)\)/, "MT5 gap telemetry must read the active symbol tape");
assert.equal((source.match(/loadSimOhlc\(tf, true, getActiveSymbol\(\)\)/g) || []).length, 2, "MT5 backfill and auto-sync must read the active symbol tape");
console.log("MT5 CONNECT SYMBOL CONTRACT PASS: gap, backfill, and auto-sync use active symbol provenance.");
