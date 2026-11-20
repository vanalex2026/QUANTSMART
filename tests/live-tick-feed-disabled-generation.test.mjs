import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../mfe_ux_lab/cockpit/src/lib/liveTickFeed.ts", import.meta.url), "utf8");

assert.match(
  source,
  /const generation = useTerminalGeneration\(enabled\);/,
  "live tick subscriptions must opt out of terminal-generation updates when disabled",
);
assert.match(
  source,
  /if \(!enabled\) return \(\) => \{\};/,
  "disabled live feeds must not create an EventSource subscription",
);
assert.match(
  source,
  /useSyncExternalStore\(subscribe, read, \(\) => EMPTY\)/,
  "disabled live feeds must expose the stable empty snapshot",
);

console.log("LIVE TICK FEED DISABLED GENERATION PASS: disabled surfaces avoid MT5 invalidation rerenders and SSE subscriptions.");
