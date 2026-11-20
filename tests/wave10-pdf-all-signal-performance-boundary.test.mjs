import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { performance } from "node:perf_hooks";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit/", import.meta.url));
const receipt = JSON.parse(readFileSync(new URL("../artifacts/wave10-pdf-all-signal-performance-boundary.json", import.meta.url), "utf8"));
const { build } = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url))("esbuild");
const bundled = await build({
  stdin: { contents: 'export * from "./src/lib/pdfSignalDetector.ts";', resolveDir: app },
  bundle: true,
  format: "esm",
  platform: "node",
  write: false,
  logLevel: "silent",
});
const api = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`);

const authority = "SHADOW_ONLY / NO_DECISION / live_apply_allowed=false";
assert.equal(receipt.result, "PASS");
assert.equal(receipt.authority, authority);
assert.equal(receipt.input.closed_bars, 5120);
assert.deepEqual(receipt.input.selected_prefix_indices, [95, 1024, 4999]);
assert.equal(receipt.performance.budget_ms_per_case, 5000);

const epoch = Date.parse("2026-01-05T00:00:00.000Z");
const bars = Array.from({ length: receipt.input.closed_bars }, (_, index) => {
  const open = 2000 + (index % 31) * 0.03;
  const close = open + (index % 4 === 0 ? 0.2 : index % 4 === 1 ? -0.1 : 0.05);
  return {
    t: new Date(epoch + index * 300_000).toISOString(),
    o: open,
    h: Math.max(open, close) + 0.5,
    l: Math.min(open, close) - 0.5,
    c: close,
    closed: true,
  };
});

const forbiddenKeys = new Set(["worker", "workerId", "order", "orderId", "fill", "fillId"]);
function hasForbiddenKey(value) {
  if (!value || typeof value !== "object") return false;
  for (const [key, child] of Object.entries(value)) {
    if (forbiddenKeys.has(key)) return true;
    if (hasForbiddenKey(child)) return true;
  }
  return false;
}

function inputFor(index, tape = bars) {
  const selectedTime = tape[index].t;
  return {
    bars: tape,
    selectedTime,
    direction: "UP",
    protection: 1998,
    nowMs: Date.parse(selectedTime) + 300_000,
  };
}

function assertAuthority(result) {
  assert.equal(result.authority, authority);
  assert.equal(result.live_apply_allowed, false);
  assert.equal(result.counts.total, 23);
  assert.equal(result.observations.length, 23);
  assert.ok(result.observations.every((observation) => observation.outcomeStatus === "WITHHELD"));
  assert.equal(hasForbiddenKey(result), false);
  for (const descriptor of Object.values(result.sourceNoteDescriptors)) {
    assert.equal(descriptor.authority, authority);
    assert.equal(descriptor.live_apply_allowed, false);
    assert.equal(descriptor.outcomeStatus, "WITHHELD");
  }
}

const measured = [];
const baselineByIndex = new Map();
for (const index of receipt.input.selected_prefix_indices) {
  const input = inputFor(index);
  // Warm the bundle and JIT before recording the bounded call time.
  const warmed = api.detectAllPdfSignals(input);
  assertAuthority(warmed);
  const started = performance.now();
  const baseline = api.detectAllPdfSignals(input);
  const elapsedMs = performance.now() - started;
  measured.push({ index, elapsedMs });
  assert.ok(elapsedMs < receipt.performance.budget_ms_per_case, `selected prefix ${index} exceeded performance budget`);
  assertAuthority(baseline);
  assert.equal(baseline.asOf, input.selectedTime);
  baselineByIndex.set(index, baseline);

  const causalPrefix = bars.slice(0, index + 1);
  const prefixResult = api.detectAllPdfSignals(inputFor(index, causalPrefix));
  assert.deepEqual(prefixResult, baseline, `selected prefix ${index} must equal the full tape before future rows`);

  const futureMutated = bars.map((bar, row) => row <= index ? bar : {
    ...bar,
    o: 9000 + row,
    h: 9001 + row,
    l: 8999 + row,
    c: 9000.5 + row,
    closed: true,
  });
  const futureResult = api.detectAllPdfSignals(inputFor(index, futureMutated));
  assert.deepEqual(futureResult, baseline, `future rows after selected prefix ${index} must not influence output`);

  for (const descriptor of Object.values(baseline.sourceNoteDescriptors)) {
    assert.ok(descriptor.causalPrefix.bars <= receipt.input.source_note_max_prefix_bars);
    assert.equal(descriptor.causalPrefix.maxBars, receipt.input.source_note_max_prefix_bars);
    assert.equal(descriptor.causalPrefix.futureRows, "WITHHELD");
  }
}

const lastInput = inputFor(4999);
const firstRun = baselineByIndex.get(4999);
const secondRun = api.detectAllPdfSignals(lastInput);
assert.deepEqual(secondRun, firstRun, "repeated calls must be deterministic");
api.detectAllPdfSignals(inputFor(95));
const afterReentry = api.detectAllPdfSignals(lastInput);
assert.deepEqual(afterReentry, firstRun, "re-entry after another selected prefix must not leak lifecycle state");

assert.equal(api.PDF_SIGNAL_DETECTOR_AUTHORITY, authority);
assert.equal(api.PDF_SIGNAL_DETECTOR_VERSION, "pdf-signal-detector/1");
assert.equal(receipt.cases.authority.worker_authority_changed, false);
assert.equal(receipt.cases.authority.order_authority_changed, false);

const summary = measured.map(({ index, elapsedMs }) => `${index}=${elapsedMs.toFixed(1)}ms`).join(", ");
console.log(`WAVE 10 PDF ALL-SIGNAL PERFORMANCE BOUNDARY PASS: 5,120 closed synthetic XAUUSD M5 rows, bounded 96-bar source prefixes, future-row invariance, deterministic lifecycle re-entry and research-only authority verified (${summary}).`);
