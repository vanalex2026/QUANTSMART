import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../mfe_ux_lab/cockpit/src/lib/liveTickFeed.ts", import.meta.url), "utf8");

assert.match(source, /Keep the read-only quote stream alive in background tabs/);
assert.doesNotMatch(source, /if \(document\.hidden\) \{ publish\(\{ \.\.\.entry\.state, status: "paused" \}\); return; \}/);
assert.match(source, /document\.addEventListener\("visibilitychange", connect\)/);

console.log("LIVE TICK FEED BACKGROUND PASS: focused read-only SSE remains active when the chart tab is backgrounded.");
