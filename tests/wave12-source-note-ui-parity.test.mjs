import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const component = readFileSync(new URL("../mfe_ux_lab/cockpit/src/components/PdfSignalTranslationEvidence.tsx", import.meta.url), "utf8");
const map = JSON.parse(readFileSync(new URL("../docs/price_action_knowledge_map.json", import.meta.url), "utf8"));
const sourceIds = map.concepts.filter((concept) => concept.implementation === "SOURCE_NOTES").map((concept) => concept.id);
assert.equal(sourceIds.length, 10);
assert.match(component, /detectAllPdfSignals\(/);
assert.match(component, /data-translation-state=\{sourceDescriptorState\}/);
assert.match(component, /const sourceDescriptorState = displayDescriptors\.some/);
assert.doesNotMatch(component, /translatePdfSignalConcepts\(/, "the UI must not derive state from the legacy translation receipt");

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
const epoch = Date.parse("2026-01-05T00:00:00.000Z");
const bars = Array.from({ length: 100 }, (_, index) => ({
  t: new Date(epoch + index * 300_000).toISOString(),
  o: 2000 + index * 0.02,
  h: 2001 + index * 0.02,
  l: 1999 + index * 0.02,
  c: 2000.5 + index * 0.02,
  closed: true,
}));
const expectedAggregate = (descriptors) => Object.values(descriptors).some((descriptor) => descriptor.state === "DESCRIPTIVE")
  ? "DESCRIPTIVE"
  : Object.values(descriptors).some((descriptor) => descriptor.state === "UNAVAILABLE")
    ? "UNAVAILABLE"
    : "WITHHELD";
for (const direction of ["NEUTRAL", "UP"]) {
  const result = api.detectAllPdfSignals({
    bars,
    selectedTime: bars.at(-1).t,
    direction,
    protection: 1998,
    nowMs: epoch + 101 * 300_000,
  });
  assert.equal(Object.keys(result.sourceNoteDescriptors).length, 10);
  assert.deepEqual(Object.keys(result.sourceNoteDescriptors).sort(), [...sourceIds].sort());
  assert.equal(expectedAggregate(result.sourceNoteDescriptors), Object.values(result.sourceNoteDescriptors).some((descriptor) => descriptor.state === "DESCRIPTIVE") ? "DESCRIPTIVE" : Object.values(result.sourceNoteDescriptors).some((descriptor) => descriptor.state === "UNAVAILABLE") ? "UNAVAILABLE" : "WITHHELD");
  for (const descriptor of Object.values(result.sourceNoteDescriptors)) {
    const observation = result.observations.find((row) => row.conceptId === descriptor.conceptId);
    assert.ok(observation, descriptor.conceptId);
    assert.equal(observation.state, descriptor.state === "DESCRIPTIVE" ? "DETECTED" : descriptor.state);
    assert.equal(descriptor.sourceStatus, "SOURCE_REVIEW_ONLY");
    assert.equal(descriptor.outcomeStatus, "WITHHELD");
    assert.equal(descriptor.live_apply_allowed, false);
  }
}

console.log("WAVE 12 SOURCE-NOTE UI PARITY PASS: unified descriptor state drives the panel attribute for all ten source concepts.");
