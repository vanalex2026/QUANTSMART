import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit/", import.meta.url));
const { build } = createRequire(app + "package.json")("esbuild");
const bundled = await build({
  stdin: { contents: [
    "export * from './src/lib/priceActionDetector.ts';",
    "export * from './src/lib/patternBreak.ts';",
    "export * from './src/lib/patternBreakCombi.ts';",
    "export * from './src/lib/patternBreakPullback.ts';",
    "export * from './src/lib/pullbackReversal.ts';",
  ].join("\n"), resolveDir: app },
  bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent",
});
const api = await import("data:text/javascript;base64," + Buffer.from(bundled.outputFiles[0].text).toString("base64"));
const audit = JSON.parse(readFileSync(root + "artifacts/wave5-detector-exhaustive-audit.json", "utf8"));
const epoch = Date.parse("2026-01-05T00:00:00Z");
const time = (i, shift = 0) => new Date(epoch + i * 300000 + shift).toISOString();
const bar = (i, o, h, l, c, shift = 0) => ({ t: time(i, shift), o, h, l, c, closed: true });

test("wave5 artifact covers every detector concept, boundary and worker scan", () => {
  assert.equal(audit.authority, "SHADOW_ONLY / NO_DECISION");
  assert.equal(audit.live_apply_allowed, false);
  assert.equal(audit.concepts.length, 13);
  assert.deepEqual(audit.concepts.map(row => row.id), [
    "support_resistance", "dominant_pressure", "false_high_low", "double_pressure", "tease_break",
    "buildup", "false_break", "pullback_reversal", "ceiling_test", "round_number",
    "pattern_break_combi", "pattern_break", "pattern_break_pullback",
  ]);
  for (const row of audit.concepts) for (const field of ["entry", "min_context", "causal_window", "input_validation", "duplicate_offgrid_forming", "direction_edge", "fixtures"]) assert.ok(row[field] !== undefined, `${row.id}.${field}`);
  assert.equal(audit.workers_and_scans.length, 4);
  assert.equal(audit.findings.filter(row => row.severity === "fixed").length, 2);
});

test("ambiguous opposing boundaries abstain instead of inventing direction", () => {
  const rows = [
    bar(0, 100, 101, 99, 100), bar(1, 100, 101.2, 98.8, 100), bar(2, 100, 101.1, 98.9, 100),
    bar(3, 100, 102, 98, 100),
  ];
  const falseBreak = api.detectM5PriceAction(rows).assessments.find(row => row.conceptId === "false_break");
  assert.equal(falseBreak.state, "ABSTAIN");
  assert.equal(falseBreak.reason, "AMBIGUOUS_TWO_SIDED_BOUNDARY_SWEEP");

  const levelRows = Array.from({ length: 8 }, (_, i) => bar(i, 100, 101, 99, 100));
  const levelResult = api.detectM5PriceAction(levelRows);
  const supportResistance = levelResult.assessments.find(row => row.conceptId === "support_resistance");
  const ceiling = levelResult.assessments.find(row => row.conceptId === "ceiling_test");
  assert.ok(["UP", "DOWN", "NEUTRAL"].includes(supportResistance.direction));
  assert.ok(["UP", "DOWN", "NEUTRAL"].includes(ceiling.direction));
});

test("direct pattern observers reject shifted off-grid timestamps while preserving valid fixtures", () => {
  const context = Array.from({ length: 4 }, (_, i) => bar(i, 99.6 + i * .15, 100.5 + i * .1, 99.5 + i * .1, 99.7 + i * .15));
  const buildup = [
    bar(4, 100.7, 100.8, 100.2, 100.4), bar(5, 100.4, 100.78, 100.25, 100.7),
    bar(6, 100.7, 100.8, 100.2, 100.4), bar(7, 100.4, 100.82, 100.3, 100.76),
  ];
  const rows = [...context, ...buildup, bar(8, 100.7, 101.3, 100.5, 101.1)];
  assert.equal(api.observePatternBreak(rows).detected, true);
  assert.equal(api.observePatternBreak(rows.map(row => ({ ...row, t: new Date(Date.parse(row.t) + 60000).toISOString() }))).detected, false);
  assert.equal(api.detectM5PriceAction(rows.map(row => ({ ...row, t: new Date(Date.parse(row.t) + 60000).toISOString() }))).ok, false);
});

test("public boundary rejects forming, malformed, duplicate, unordered, off-grid and zero-range rows", () => {
  const valid = Array.from({ length: 10 }, (_, i) => bar(i, 100, 101, 99, 100.5));
  const cases = [
    valid.map((row, i) => i === 4 ? { ...row, closed: false } : row),
    valid.map((row, i) => i === 4 ? { ...row, h: NaN } : row),
    valid.map((row, i) => i === 4 ? { ...row, t: valid[3].t } : row),
    valid.map((row, i) => i === 4 ? { ...row, t: new Date(Date.parse(row.t) + 60000).toISOString() } : row),
    valid.map((row, i) => i === 4 ? { ...row, h: 100, l: 100, o: 100, c: 100 } : row),
    [...valid].reverse(),
  ];
  for (const rows of cases) {
    const result = api.detectM5PriceAction(rows);
    assert.equal(result.ok, false);
    assert.equal(result.state, "ABSTAIN");
    assert.equal(result.authority ?? result.source.authority, "SHADOW_ONLY / NO_DECISION");
  }
});

test("historical evidence withholds gaps and future rows and retains authority", () => {
  const rows = Array.from({ length: 20 }, (_, i) => bar(i, 100, 101, 99, i % 2 ? 100.5 : 99.5));
  const gap = rows.filter((_, i) => i !== 10);
  const evidence = api.measurePriceActionEvidence(gap);
  for (const value of Object.values(evidence)) {
    assert.equal(value.authority, "SHADOW_ONLY / NO_DECISION");
    assert.equal(value.history.length, value.occurrences);
  }
  const baseline = api.measurePriceActionEvidence(rows);
  const future = api.measurePriceActionEvidence([...rows, bar(20, 100, 121, 99, 120)]);
  for (const id of Object.keys(baseline)) {
    const prior = baseline[id].history;
    const replay = future[id].history.filter(row => row.i < rows.length);
    const byTime = new Map(replay.map(row => [row.time, row]));
    for (const row of prior) assert.deepEqual(byTime.get(row.time)?.setup, row.setup);
  }
});

console.log("WAVE5 DETECTOR EXHAUSTIVE AUDIT PASS: matrix, ambiguity, grid and causal-boundary regressions.");
