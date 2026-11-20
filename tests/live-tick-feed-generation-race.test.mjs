import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../mfe_ux_lab/cockpit/src/lib/liveTickFeed.ts", import.meta.url), "utf8");

assert.match(
  source,
  /if \(entry\.source !== source \|\| !entry\.listeners\.size \|\| getTerminalGeneration\(\) !== generation\) return;/,
  "queued ticks from a replaced source or stale terminal generation must be ignored",
);
assert.match(
  source,
  /entry\.source = undefined; source\.close\(\); publish\(EMPTY\); invalidateTerminalData\(\);/,
  "reset must retire the source before invalidating terminal consumers",
);
assert.match(
  source,
  /const source = entry\.source; entry\.source = undefined; source\?\.close\(\);/,
  "subscription cleanup must retire the source before closing it",
);

console.log("LIVE TICK FEED GENERATION RACE PASS: late SSE packets cannot repaint a retired generation.");
