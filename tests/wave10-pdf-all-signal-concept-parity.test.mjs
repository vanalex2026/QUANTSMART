import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const receipt = JSON.parse(readFileSync(new URL("../artifacts/wave10-pdf-all-signal-concept-parity.json", import.meta.url), "utf8"));
const map = JSON.parse(readFileSync(new URL("../docs/price_action_knowledge_map.json", import.meta.url), "utf8"));
const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit/", import.meta.url));
const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const { build } = require("esbuild");
const bundled = await build({
  stdin: { contents: 'export * from "./src/lib/pdfSignalDetector.ts";', resolveDir: app },
  bundle: true,
  format: "esm",
  platform: "node",
  write: false,
  logLevel: "silent",
});
const api = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`);

assert.equal(receipt.result, "PASS");
assert.equal(receipt.parity.source_descriptor_states_match_observations, true);
assert.equal(receipt.boundaries.authority, "SHADOW_ONLY / NO_DECISION / live_apply_allowed=false");
const mapIds = map.concepts.map((concept) => concept.id);
assert.equal(new Set(mapIds).size, mapIds.length);
assert.deepEqual([...api.ALL_PDF_SIGNAL_CONCEPT_IDS].sort(), [...mapIds].sort());

const epoch = Date.parse("2026-01-05T00:00:00.000Z");
const bars = Array.from({ length: 120 }, (_, index) => ({
  t: new Date(epoch + index * 300_000).toISOString(),
  o: 2000 + index * 0.02,
  h: 2001 + index * 0.02,
  l: 1999 + index * 0.02,
  c: 2000.5 + index * 0.02,
  closed: true,
}));
const result = api.detectAllPdfSignals({
  bars,
  selectedTime: bars.at(-1).t,
  direction: "UP",
  protection: 1998,
  nowMs: epoch + 121 * 300_000,
});
assert.equal(result.observations.length, 23);
assert.equal(Object.keys(result.sourceNoteDescriptors).length, 10);
for (const descriptor of Object.values(result.sourceNoteDescriptors)) {
  const observation = result.observations.find((row) => row.conceptId === descriptor.conceptId);
  assert.ok(observation, descriptor.conceptId);
  assert.equal(observation.state, descriptor.state === "DESCRIPTIVE" ? "DETECTED" : descriptor.state);
  assert.equal(descriptor.live_apply_allowed, false);
  assert.equal(descriptor.outcomeStatus, "WITHHELD");
}
assert.equal(result.observations.find((row) => row.conceptId === "position_sizing").state, "UNAVAILABLE");
assert.equal(result.observations.find((row) => row.conceptId === "position_sizing").sourceStatus, "SOURCE_REVIEW_ONLY");
for (const observation of result.observations.filter((row) => row.sourceStatus === "DETECTOR_GEOMETRY" && row.state === "ABSTAIN")) {
  assert.equal(observation.dataStatus, "AVAILABLE", `${observation.conceptId} abstain is a valid no-match on an available tape`);
}
const sized = api.detectAllPdfSignals({
  bars,
  selectedTime: bars.at(-1).t,
  direction: "UP",
  sizing: { equity: 10_000, riskPct: 1, stopDistance: 2, contractSize: 100, lotStep: 0.01, minLot: 0.01 },
  nowMs: epoch + 121 * 300_000,
});
assert.equal(sized.sourceNoteDescriptors.position_sizing.state, "DESCRIPTIVE");
assert.equal(sized.observations.find((row) => row.conceptId === "position_sizing").state, "DETECTED");
assert.equal(sized.sourceNoteDescriptors.position_sizing.geometry.pdfPipDistancesUsed, undefined);
const newsEvent = api.detectAllPdfSignals({
  bars,
  selectedTime: bars.at(-1).t,
  direction: "UP",
  newsEvent: { atUtc: bars.at(-1).t, title: "Validated event", source: "user-supplied" },
  nowMs: epoch + 121 * 300_000,
});
assert.equal(newsEvent.sourceNoteDescriptors.news_exit.state, "DESCRIPTIVE");
assert.equal(newsEvent.sourceNoteDescriptors.news_exit.geometry.eventIdentity, `${bars.at(-1).t}\u0000Validated event`);
const selectedForExit = bars[90];
const observedThrough = bars[95];
const resistanceEvent = api.detectAllPdfSignals({
  bars,
  selectedTime: selectedForExit.t,
  observedThrough: observedThrough.t,
  direction: "UP",
  resistanceLevel: bars[92].h,
  nowMs: epoch + 121 * 300_000,
});
assert.equal(resistanceEvent.sourceNoteDescriptors.resistance_exit.state, "DESCRIPTIVE");
assert.equal(resistanceEvent.sourceNoteDescriptors.resistance_exit.geometry.eventState, "OBSERVED");
const reversalEvent = api.detectAllPdfSignals({
  bars,
  selectedTime: selectedForExit.t,
  direction: "UP",
  reversalEvent: { time: selectedForExit.t, identity: "validated-reversal" },
  nowMs: epoch + 121 * 300_000,
});
assert.equal(reversalEvent.sourceNoteDescriptors.reversal_exit.state, "DESCRIPTIVE");
assert.equal(reversalEvent.sourceNoteDescriptors.reversal_exit.geometry.identity, "validated-reversal");

console.log("WAVE 10 PDF ALL-SIGNAL CONCEPT PARITY PASS: 23 XAUUSD M5 concepts, descriptor/observation states and external position-sizing boundary reconcile.");
