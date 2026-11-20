import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const readJson = (path) => JSON.parse(read(path));
const audit = readJson("artifacts/wave9-pdf-all-signal-ui-audit.json");
const translation = read("mfe_ux_lab/cockpit/src/components/PdfSignalTranslationEvidence.tsx");
const microscope = read("mfe_ux_lab/cockpit/src/pages/Microscope.tsx");
const microChart = read("mfe_ux_lab/cockpit/src/components/MicroChart.tsx");
const inspectorCss = read("mfe_ux_lab/cockpit/src/components/chart-pattern-inspector.css");

assert.equal(audit.result, "PASS");
assert.equal(audit.authority, "SHADOW_ONLY / NO_DECISION / live_apply_allowed=false");
assert.equal(audit.coverage.pdf_signal_total, 23);
assert.equal(audit.coverage.geometry_proxy_observations, 13);
assert.equal(audit.coverage.source_note_observations, 10);
assert.equal(audit.coverage.source_note_descriptor_cards, 10);
assert.equal(audit.coverage.future_rows, "WITHHELD");
assert.equal(audit.coverage.outcomes, "WITHHELD");
assert.equal(audit.implementation_change, true);
assert.deepEqual(audit.known_gaps, []);
assert.equal(audit.bilingual.shelf_locale_followup, false);

assert.match(translation, /detectAllPdfSignals\(/);
assert.match(translation, /data-pdf-total=\{allSignals\.counts\.total\}/);
assert.match(translation, /allSignals\.counts\.total\}\/23/);
assert.doesNotMatch(translation, /XAUUSD M5 \? detected/, "English PDF coverage summary must not expose question-mark separators");
assert.match(translation, /aria-labelledby="pdf-signal-translation-title"/);
assert.match(translation, /aria-describedby=\{introId\}/);
assert.match(translation, /role="status" aria-live="polite"/);
assert.match(translation, /role="list"/);
assert.match(translation, /role="listitem"/);
assert.match(translation, /SOURCE_REVIEW_ONLY/);
assert.match(translation, /outcomeSuffix/);
assert.match(translation, /live_apply_allowed=false/);
for (const conceptId of [
  "signal_entry_bar", "bracket_costs", "news_exit", "resistance_exit", "reversal_exit",
  "trade_selection_failure", "consecutive_review", "position_sizing", "low_volatility", "obstacle_room",
]) {
  assert.match(translation, new RegExp(`${conceptId}:`), `${conceptId} needs a bilingual descriptor label`);
}
assert.match(translation, /decodeURIComponent\("To%C3%A0n%20b%E1%BB%99%20t%C3%ADn%20hi%E1%BB%87u/);
assert.match(translation, /decodeURIComponent\("Danh%20s%C3%A1ch%20m%C3%B4%20t%E1%BA%A3/);
assert.doesNotMatch(translation, /order_send|place order|execute\s*\(/i);

assert.match(microscope, /const allPdfSignalResult = useMemo\(\(\) =>/);
assert.match(microscope, /if \(!focused \|\| tf !== "M5" \|\| !detectorBars\.length\) return null/);
assert.match(microscope, /detectAllPdfSignals\(\{[\s\S]*?bars: focusedPdfAnalysisBars/);
assert.match(microscope, /currentPdfSourceSignals = useMemo<SignalMarker\[\]>[\s\S]*?sourceStatus === "SOURCE_REVIEW_ONLY"/);
assert.match(microscope, /const currentPatternSignals = useMemo<SignalMarker\[\]>[\s\S]*?seen\.add\(key\)/);
assert.match(microscope, /researchPatternSignals=\{focused \? currentPatternSignals : \[\]\}/);
assert.match(microscope, /researchPatternLabel=\{focused \? currentPatternSignalLabel : undefined\}/);
assert.match(microscope, /OBSERVATION \| SHADOW_ONLY/);

assert.match(microChart, /className="micro-pattern-status" role="status" aria-live="polite"/);
assert.match(microChart, /researchPatternSignals\.map\(\(signal\)/);
assert.match(microChart, /className="micro-pattern-status-button"/);
assert.match(microChart, /const inspect = locale === "vi" \? "Kiểm tra mô hình hiện tại" : "Inspect current pattern"/);
assert.match(microChart, /SHADOW_ONLY; NO_DECISION; no order authority/);
assert.match(microChart, /className="microchart-signal" role="button"/);
assert.match(microChart, /aria-setsize=\{annotationCount\}/);
assert.match(microChart, /aria-posinset=\{annotationIndex \+ 1\}/);
assert.match(microChart, /tabIndex=\{annotationIndex === activeAnnotationIndex \? 0 : -1\}/);

assert.match(inspectorCss, /\.pdf-signal-translation-grid\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
assert.match(inspectorCss, /@media \(max-width:700px\)\{[\s\S]*\.pdf-signal-translation-grid\{grid-template-columns:1fr/);
assert.match(inspectorCss, /\.pdf-signal-translation-card-status\{font-family/);
assert.match(inspectorCss, /overflow-wrap:anywhere/);
assert.match(inspectorCss, /@media\(max-width:640px\)\{\.chart-pattern-inspector[\s\S]*width:calc\(100vw - 16px\)[\s\S]*max-height:65dvh[\s\S]*\.chart-pattern-inspector-body\{padding/);
assert.match(inspectorCss, /\.chart-pattern-inspector-body\{min-height:0;overflow-y:auto/);
assert.match(inspectorCss, /\.chart-pattern-inspector button:focus-visible\{outline:2px solid/);
assert.match(inspectorCss, /\.chart-pattern-inspector button\{min-height:36px;\}/);

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
const selectedTime = bars.at(-1).t;
const result = api.detectAllPdfSignals({
  bars,
  selectedTime,
  direction: "UP",
  protection: 1998,
  nowMs: epoch + 101 * 300_000,
});
assert.equal(result.counts.total, 23);
assert.equal(result.observations.length, 23);
assert.equal(result.authority, audit.authority);
assert.equal(result.live_apply_allowed, false);
assert.ok(result.observations.some((row) => row.sourceStatus === "SOURCE_REVIEW_ONLY" && row.state === "DETECTED"));
assert.ok(result.observations.some((row) => row.sourceStatus === "DETECTOR_GEOMETRY"));
for (const row of result.observations) assert.equal(row.outcomeStatus, "WITHHELD");

const disabled = api.detectAllPdfSignals({ bars, selectedTime, enabled: false });
assert.equal(disabled.state, "WITHHELD");
assert.equal(disabled.counts.detected, 0);
assert.equal(disabled.counts.abstain, 0);
assert.equal(disabled.counts.unavailable, 0);
assert.equal(disabled.counts.withheld, 23);
assert.ok(disabled.observations.every((row) => row.state === "WITHHELD"), "disabled unified evidence must withhold every concept");
const sourceNoteIds = new Set([
  "signal_entry_bar", "bracket_costs", "news_exit", "resistance_exit", "reversal_exit",
  "trade_selection_failure", "consecutive_review", "position_sizing", "low_volatility", "obstacle_room",
]);
assert.ok(disabled.observations
  .filter((row) => sourceNoteIds.has(row.conceptId))
  .every((row) => row.state === "WITHHELD"));

console.log("WAVE 9 PDF ALL-SIGNAL UI AUDIT PASS: 23-signal coverage, source-only descriptor semantics, focused marker shelf, bilingual labels, accessibility and mobile wrapping are verified.");
