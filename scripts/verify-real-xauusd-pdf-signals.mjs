import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("../", import.meta.url)));
const app = resolve(root, "mfe_ux_lab/cockpit");
const require = createRequire(resolve(app, "package.json"));
const { build } = require("esbuild");
const endpoint = process.env.MFE_REAL_BARS_URL || "http://127.0.0.1:5090/api/mt5/bars?symbol=XAUUSD&tf=M5&n=5000";

const response = await fetch(endpoint, { signal: AbortSignal.timeout(30_000) });
if (!response.ok) throw new Error(`REAL_MT5_FETCH_FAILED:${response.status}`);
const payload = await response.json();
const hasPayloadOk = payload && typeof payload === "object" && Object.prototype.hasOwnProperty.call(payload, "ok");
const latestClosedBarAgeSeconds = payload?.latest_closed_bar_age_seconds;
if ((hasPayloadOk && payload.ok !== true) || !Number.isFinite(latestClosedBarAgeSeconds) || latestClosedBarAgeSeconds < 0 || payload.source !== "MT5_CLOSED_BARS" || payload.symbol !== "XAUUSD" || payload.timeframe !== "M5" || payload.closed_bar_provenance !== "MT5_CLOSED_BARS" || payload.forming_bar_included !== false || payload.timestamp_basis !== "UTC" || typeof payload.server_timezone !== "string" || payload.server_timezone.length === 0 || payload.authority !== "SHADOW_ONLY" || payload.decision !== "NO_DECISION" || payload.live_apply_allowed !== false || payload.read_only !== true) {
  throw new Error("REAL_MT5_PAYLOAD_NOT_CLOSED_XAUUSD_M5_SHADOW_ONLY");
}
const bars = Array.isArray(payload.bars) ? payload.bars : [];
if (bars.length < 100) throw new Error("REAL_MT5_TAPE_TOO_SHORT");
const canonicalUtcBarTimestamp = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.000)?Z$/.test(value)) return false;
  const parsed = Date.parse(value);
  const canonical = value.endsWith(".000Z") ? value : value.replace("Z", ".000Z");
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === canonical;
};
const timestamps = bars.map((bar) => canonicalUtcBarTimestamp(bar?.t) ? Date.parse(bar.t) : Number.NaN);
const nowMs = Date.parse(payload.retrieved_at);
const validClosedUtc = bars.every((bar, index) => canonicalUtcBarTimestamp(bar?.t) && Number.isFinite(timestamps[index]) && timestamps[index] % 300_000 === 0 && timestamps[index] + 300_000 <= nowMs && bar.closed !== false && [bar.o, bar.h, bar.l, bar.c].every(Number.isFinite) && bar.h > bar.l && bar.h >= Math.max(bar.o, bar.c) && bar.l <= Math.min(bar.o, bar.c));
const strictlyOrdered = timestamps.every((value, index) => index === 0 || value > timestamps[index - 1]);
const selectedIndex = bars.reduce((candidate, _bar, index) => {
  if (index < 95) return candidate;
  const start = index - 95;
  const contiguous = bars.slice(start, index + 1).every((bar, offset) => offset === 0 || Date.parse(bar.t) - Date.parse(bars[start + offset - 1].t) === 300_000);
  return contiguous ? index : candidate;
}, -1);
if (!validClosedUtc || !strictlyOrdered || !Number.isFinite(nowMs) || selectedIndex < 0) throw new Error("REAL_MT5_TAPE_NOT_CLOSED_UTC_CONTIGUOUS_PREFIX");
const selectedTime = bars[selectedIndex].t;

const bundled = await build({
  stdin: { contents: 'export * from "./src/lib/pdfSignalDetector.ts"; export * from "./src/lib/pdfSignalStatistics.ts";', resolveDir: app },
  bundle: true,
  format: "esm",
  platform: "node",
  write: false,
  logLevel: "silent",
});
const api = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`);
const input = { bars, selectedTime, direction: "NEUTRAL", nowMs };
const result = api.detectAllPdfSignals(input);
const historicalCensus = api.measurePdfSignalStatistics(bars, nowMs);
const historicalCensusRepeat = api.measurePdfSignalStatistics(bars, nowMs);
const historicalCensusDeterministicRepeat = JSON.stringify(historicalCensus) === JSON.stringify(historicalCensusRepeat);
if (!historicalCensusDeterministicRepeat) throw new Error("REAL_PDF_SIGNAL_CENSUS_NOT_DETERMINISTIC");
const nestedAuthority = { focused_chart: "SHADOW_ONLY", decision: "NO_DECISION", live_apply_allowed: false };
const repeat = api.detectAllPdfSignals(input);
if (JSON.stringify(result) !== JSON.stringify(repeat)) throw new Error("REAL_PDF_SIGNAL_DETECTOR_NOT_DETERMINISTIC");
// Mutate the first row excluded by the selected causal prefix. This is the
// boundary that must remain invisible to a selected-candle observation.
const futureRows = bars.slice();
const firstExcludedIndex = selectedIndex + 1;
if (firstExcludedIndex < futureRows.length) {
  const next = futureRows[firstExcludedIndex];
  futureRows[firstExcludedIndex] = { ...next, o: next.o + 100, h: next.h + 100, l: next.l + 100, c: next.c + 100 };
} else {
  futureRows.push({ ...bars.at(-1), t: new Date(Date.parse(selectedTime) + 300_000).toISOString(), c: bars.at(-1).c + 100 });
}
const futureResult = api.detectAllPdfSignals({ ...input, bars: futureRows });
const futureRowInvariant = JSON.stringify(result) === JSON.stringify(futureResult);
if (!futureRowInvariant) throw new Error("REAL_PDF_SIGNAL_FUTURE_ROW_CHANGED_RESULT");
// Exercise the same closed XAUUSD tape with both directional contexts. This
// verifies every concept's directional branch without inventing a source
// label, event identity, bracket, sizing input, fill or outcome.
const directionalCases = Object.fromEntries(["NEUTRAL", "UP", "DOWN"].map((direction) => {
  const caseInput = { ...input, direction };
  const baseline = api.detectAllPdfSignals(caseInput);
  const repeated = api.detectAllPdfSignals(caseInput);
  if (JSON.stringify(baseline) !== JSON.stringify(repeated)) throw new Error(`REAL_PDF_SIGNAL_${direction}_NOT_DETERMINISTIC`);
  if (baseline.observations.length !== api.ALL_PDF_SIGNAL_CONCEPT_IDS.length) throw new Error(`REAL_PDF_SIGNAL_${direction}_CONCEPT_COUNT_MISMATCH`);
  const caseFutureRows = bars.slice();
  const excluded = selectedIndex + 1;
  if (excluded < caseFutureRows.length) {
    const next = caseFutureRows[excluded];
    caseFutureRows[excluded] = { ...next, o: next.o + 100, h: next.h + 100, l: next.l + 100, c: next.c + 100 };
  } else {
    caseFutureRows.push({ ...bars.at(-1), t: new Date(Date.parse(selectedTime) + 300_000).toISOString(), c: bars.at(-1).c + 100 });
  }
  const futureInvariant = JSON.stringify(baseline) === JSON.stringify(api.detectAllPdfSignals({ ...caseInput, bars: caseFutureRows }));
  if (!futureInvariant) throw new Error(`REAL_PDF_SIGNAL_${direction}_FUTURE_ROW_CHANGED_RESULT`);
  return [direction, {
    counts: baseline.counts,
    detected_concepts: baseline.observations.filter((row) => row.state === "DETECTED").map((row) => row.conceptId),
    states: Object.fromEntries(baseline.observations.map((observation) => [observation.conceptId, observation.state])),
    source_note_states: Object.fromEntries(Object.entries(baseline.sourceNoteDescriptors).map(([id, descriptor]) => [id, {
      state: descriptor.state,
      dataStatus: descriptor.dataStatus,
      causalBars: descriptor.causalPrefix.bars,
      reason: descriptor.reason,
    }])),
    deterministic_repeat: true,
    future_row_invariant: true,
  }];
}));
const sourceStates = Object.fromEntries(Object.entries(result.sourceNoteDescriptors).map(([id, descriptor]) => [id, {
  state: descriptor.state,
  dataStatus: descriptor.dataStatus,
  causalBars: descriptor.causalPrefix.bars,
  reason: descriptor.reason,
}]));
const artifact = {
  audit: "real-xauusd-m5-pdf-signal-verification",
  schema: "quantsmart.real-xauusd-m5-pdf-signal-verification/1",
  retrieved_at: payload.retrieved_at,
  source: payload.source,
  symbol: payload.symbol,
  timeframe: payload.timeframe,
  bars: bars.length,
  first_bar: bars[0].t,
  feed_last_bar: bars.at(-1).t,
  last_bar: selectedTime,
  selected_index: selectedIndex,
  latest_closed_bar_age_seconds: payload.latest_closed_bar_age_seconds,
  closed_bar_provenance: payload.closed_bar_provenance,
  forming_bar_included: payload.forming_bar_included,
  server_timezone: payload.server_timezone,
  timestamp_basis: payload.timestamp_basis,
  authority: payload.authority,
  decision: payload.decision,
  live_apply_allowed: payload.live_apply_allowed,
  read_only: payload.read_only,
  valid_closed_utc: validClosedUtc,
  strictly_ordered: strictlyOrdered,
  concept_count: api.ALL_PDF_SIGNAL_CONCEPT_IDS.length,
  observation_count: result.observations.length,
  counts: result.counts,
  detected_concepts: result.observations.filter((row) => row.state === "DETECTED").map((row) => row.conceptId),
  source_note_states: sourceStates,
  directional_cases: directionalCases,
  concept_state_matrix: Object.fromEntries(api.ALL_PDF_SIGNAL_CONCEPT_IDS.map((conceptId) => [conceptId,
    Object.fromEntries(Object.entries(directionalCases).map(([direction, value]) => [direction, value.states[conceptId]]))
  ])),
  deterministic_repeat: true,
  future_row_invariant: futureRowInvariant,
  future_row_index: firstExcludedIndex,
  future_row_mutation: "FIRST_EXCLUDED_ROW_AFTER_SELECTED_CAUSAL_PREFIX",
  authority: result.authority,
  live_apply_allowed: result.live_apply_allowed,
  outcomes: "WITHHELD",
  pdf_ohlc_translation: false,
  data_boundary: "MT5_CLOSED_BARS, UTC closed XAUUSD M5 OHLC only. No PDF narrative figure is used as OHLC or outcome evidence.",
  historical_census: {
    version: historicalCensus.version,
    state: historicalCensus.state,
    reason: historicalCensus.reason,
    bars: historicalCensus.bars,
    evaluated_rows: historicalCensus.evaluatedRows,
    skipped_rows: historicalCensus.skippedRows,
    warmup_rows: historicalCensus.warmupRows,
    terminal_rows_without_h1: historicalCensus.terminalRowsWithoutH1,
    denominator_equation: historicalCensus.denominatorEquation,
    row_accounting_equation: historicalCensus.rowAccountingEquation,
    concept_count: Object.keys(historicalCensus.statistics).length,
    concepts: Object.fromEntries(Object.entries(historicalCensus.statistics).map(([id, row]) => [id, {
      source_status: row.sourceStatus,
      evaluated: row.evaluated,
      evaluated_equation: row.denominatorEquation,
      occurrences: row.occurrences,
      detection_rate: row.detectionRate,
      state_counts: row.stateCounts,
      direction_counts: row.sourceStatus === "SOURCE_REVIEW_ONLY" ? "WITHHELD" : row.directionCounts,
      h1_direction: row.h1Direction ?? "WITHHELD",
    }])),
    authority: nestedAuthority,
    authority_label: historicalCensus.authority,
    live_apply_allowed: historicalCensus.live_apply_allowed,
    deterministic_repeat: historicalCensusDeterministicRepeat,
  },
};
const output = resolve(root, "artifacts/real-xauusd-m5-pdf-signal-verification.json");
mkdirSync(resolve(root, "artifacts"), { recursive: true });
writeFileSync(output, JSON.stringify(artifact, null, 2) + "\n");
console.log(JSON.stringify(artifact, null, 2));
