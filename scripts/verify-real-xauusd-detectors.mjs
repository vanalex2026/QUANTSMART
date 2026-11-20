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
if (payload.source !== "MT5_CLOSED_BARS" || payload.symbol !== "XAUUSD" || payload.timeframe !== "M5" || payload.closed_bar_provenance !== "MT5_CLOSED_BARS" || payload.forming_bar_included !== false || payload.timestamp_basis !== "UTC" || typeof payload.server_timezone !== "string" || payload.server_timezone.length === 0 || payload.authority !== "SHADOW_ONLY" || payload.decision !== "NO_DECISION" || payload.live_apply_allowed !== false || payload.read_only !== true) {
  throw new Error("REAL_MT5_PAYLOAD_NOT_CLOSED_XAUUSD_M5_SHADOW_ONLY");
}
const bars = payload.bars;
if (!Array.isArray(bars) || bars.length < 100) throw new Error("REAL_MT5_TAPE_TOO_SHORT");
const nowMs = Date.parse(payload.retrieved_at);
if (!Number.isFinite(nowMs)) throw new Error("REAL_MT5_PAYLOAD_INVALID_RETRIEVAL_CLOCK");

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
const timestamps = bars.map((bar) => Date.parse(bar.t));
const validGrid = bars.every((bar, i) => Number.isFinite(timestamps[i]) && timestamps[i] % 300_000 === 0 && timestamps[i] + 300_000 <= nowMs && bar.closed !== false && [bar.o, bar.h, bar.l, bar.c].every(Number.isFinite) && bar.h >= Math.max(bar.o, bar.c) && bar.l <= Math.min(bar.o, bar.c) && bar.h > bar.l);
const ordered = timestamps.every((value, i) => i === 0 || value > timestamps[i - 1]);
const deltas = timestamps.slice(1).map((value, i) => value - timestamps[i]);
const contiguousTransitions = deltas.filter((delta) => delta === 300_000).length;
const gaps = deltas.filter((delta) => delta !== 300_000).length;
const result = api.detectM5PriceAction(bars, { symbol: "XAUUSD" });
const repeat = api.detectM5PriceAction(bars, { symbol: "XAUUSD" });
if (JSON.stringify(result) !== JSON.stringify(repeat)) throw new Error("REAL_DETECTOR_NOT_DETERMINISTIC");
const concepts = Object.fromEntries(Object.entries(result.evidence || {}).map(([id, evidence]) => [id, {
  evaluated: evidence.evaluated,
  skipped: evidence.skipped,
  occurrences: evidence.occurrences,
  history: evidence.history.length,
  outcomes: evidence.outcomes,
  lastOccurrence: evidence.lastOccurrence,
  authority: evidence.authority,
}]));
const direct = {
  pattern_break: api.observePatternBreak(bars).detected,
  pattern_break_combi: api.observePatternBreakCombi(bars).detected,
  pattern_break_pullback: api.observePatternBreakPullback(bars).detected,
  pullback_reversal: api.observePullbackReversal(bars).detected,
};
const futureMutation = bars.concat([{ ...bars.at(-1), t: new Date(timestamps.at(-1) + 300_000).toISOString(), c: bars.at(-1).c + 100 }]);
const baselineHistory = api.measurePriceActionEvidence(bars);
const mutatedHistory = api.measurePriceActionEvidence(futureMutation);
const causalPrefixStable = Object.keys(baselineHistory).every((id) => {
  const baseline = new Map(baselineHistory[id].history.map((row) => [row.time, JSON.stringify(row.setup)]));
  return mutatedHistory[id].history.filter((row) => baseline.has(row.time)).every((row) => baseline.get(row.time) === JSON.stringify(row.setup));
});
const artifact = {
  audit: "real-xauusd-m5-detector-verification",
  retrieved_at: payload.retrieved_at,
  source: payload.source,
  symbol: payload.symbol,
  timeframe: payload.timeframe,
  bars: bars.length,
  first_bar: bars[0].t,
  last_bar: bars.at(-1).t,
  latest_closed_bar_age_seconds: payload.latest_closed_bar_age_seconds,
  closed_bar_provenance: payload.closed_bar_provenance,
  server_timezone: payload.server_timezone,
  read_only: payload.read_only,
  authority: payload.authority,
  decision: payload.decision,
  live_apply_allowed: payload.live_apply_allowed,
  forming_bar_included: payload.forming_bar_included,
  timestamp_basis: payload.timestamp_basis,
  valid_closed_utc_grid: validGrid,
  strictly_ordered: ordered,
  contiguous_m5_transitions: contiguousTransitions,
  non_contiguous_transitions: gaps,
  detector: {
    ok: result.ok,
    state: result.state,
    reason: result.reason || null,
    marker_count: result.markers.length,
    detected_concepts: result.markers.map((marker) => marker.conceptId),
    markers: result.markers.map((marker) => {
      const bar = bars[marker.i];
      return {
        conceptId: marker.conceptId,
        i: marker.i,
        time: marker.time,
        price: marker.price,
        position: marker.position,
        direction: marker.direction,
        bar: bar ? { t: bar.t, o: bar.o, h: bar.h, l: bar.l, c: bar.c } : null,
        priceWithinBar: !!bar && marker.price >= bar.l && marker.price <= bar.h,
        positionConsistent: !!bar && (marker.position === "above" ? marker.price >= bar.c : marker.position === "below" ? marker.price <= bar.c : marker.price === bar.c),
      };
    }),
    concepts,
    direct_observers: direct,
    deterministic_repeat: true,
    causal_prefix_stable_after_future_mutation: causalPrefixStable,
    authority: result.source.authority,
  },
};
mkdirSync(resolve(root, "artifacts"), { recursive: true });
const output = resolve(root, "artifacts/real-xauusd-m5-detector-verification.json");
writeFileSync(output, JSON.stringify(artifact, null, 2) + "\n");
console.log(JSON.stringify(artifact, null, 2));
