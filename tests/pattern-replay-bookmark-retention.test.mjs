import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit", import.meta.url));
const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const { build } = require("esbuild");
const bundled = await build({
  stdin: { contents: "export * from './src/lib/patternReplayBookmarkResolution.ts'; export * from './src/lib/patternReplayBookmarkStore.ts'; export * from './src/lib/m5Retention.ts';", resolveDir: app },
  bundle: true, write: false, platform: "node", format: "esm", logLevel: "silent",
});
const { resolvePatternReplayBookmark: resolve, capM5DisplayWindow: retain, loadPatternReplayBookmark: load, savePatternReplayBookmark: save } =
  await import("data:text/javascript;base64," + Buffer.from(bundled.outputFiles[0].text).toString("base64"));

// Synthetic OHLC validates navigation and identity only; no market outcome claim.
const epoch = Date.parse("2026-11-10T00:00:00.000Z");
const time = step => new Date(epoch + step * 300_000).toISOString();
const bars = Array.from({ length: 45 }, (_, i) => ({ i, t: time(i), o: 100 + i * .1, h: 101 + i * .1, l: 99 + i * .1, c: 100.4 + i * .1, r: "N", closed: true }));
const signal = { time: time(20), conceptId: "pattern_break", reads: "bullish", i: 20 };
const bookmark = { version: "pattern-replay-bookmark/1", occurrenceTime: time(20), conceptId: signal.conceptId, reads: signal.reads, mode: "outcome", revealedTime: time(23), authority: "SHADOW_ONLY / NO_DECISION", live_apply_allowed: false };
const nowMs = epoch + 50 * 300_000;
const restored = (tape = bars, current = signal, record = bookmark, clock = nowMs, geometry = true) => resolve(record, current, tape, geometry, clock);
const unavailable = (result, reason) => {
  assert.equal(result.state, "UNAVAILABLE");
  if (reason) assert.equal(result.reason, reason);
  assert.equal(result.replay, undefined, "failed restore exposes no priced replay");
};

const initial = restored();
assert.equal(initial.state, "AVAILABLE");
assert.equal(initial.replay.anchorIndex, 20);
assert.equal(initial.replay.revealedTime, time(23));
assert.equal(initial.replay.authority, "SHADOW_ONLY / NO_DECISION");
assert.equal(initial.replay.live_apply_allowed, false);

for (const shifted of [bars.slice(10), [{ ...bars[0], i: 999, t: time(-1) }, ...bars]]) {
  const result = restored(shifted.map((bar, i) => ({ ...bar, i: i + 900 })));
  assert.equal(result.state, "AVAILABLE", "backfill/retention may reindex the tape without changing identity");
  assert.equal(result.replay.anchorTime, initial.replay.anchorTime);
  assert.equal(result.replay.revealedTime, initial.replay.revealedTime);
  assert.deepEqual(result.replay.view.geometry, initial.replay.view.geometry);
}
assert.equal(restored(bars.map(bar => ({ ...bar, t: bar.t.replace(".000Z", "Z") })), { ...signal, time: signal.time.replace(".000Z", "Z") }).state, "AVAILABLE",
  "the exact retained seconds alias restores the same canonical UTC identity");

for (const changed of [null, { ...signal, time: time(21) }, { ...signal, conceptId: "pattern_break_pullback" }, { ...signal, reads: "bearish" }, { ...signal, time: "2026-11-10T01:40:00+00:00" }]) {
  unavailable(restored(bars, changed), "EXACT_CURRENT_OCCURRENCE_NOT_AVAILABLE");
}
unavailable(restored(bars.slice(21)), "SELECTED_CANDLE_NOT_RETAINED");
unavailable(restored([...bars, { ...bars[20], t: time(20).replace(".000Z", "Z") }]), "AMBIGUOUS_SELECTED_UTC_M5_IDENTITY");
unavailable(restored(bars.map((bar, i) => i === 20 ? { ...bar, closed: false } : bar)), "SELECTED_CANDLE_NOT_AVAILABLE_AS_CLOSED_M5");
unavailable(restored(bars.map((bar, i) => i === 20 ? { ...bar, h: 0 } : bar)), "SELECTED_CANDLE_NOT_AVAILABLE_AS_CLOSED_M5");
unavailable(restored(bars, signal, bookmark, Date.parse(time(23))), "BOOKMARK_CANDLE_NOT_CLOSED");
for (const tape of [
  bars.filter((_, i) => i !== 22),
  bars.map((bar, i) => i === 22 ? { ...bar, closed: false } : bar),
  bars.map((bar, i) => i === 22 ? { ...bar, t: "2026-11-10T01:51:00.000Z" } : bar),
  bars.slice(0, 23),
]) unavailable(restored(tape), "REVEALED_PATH_NOT_CONTIGUOUS_CLOSED_M5");
unavailable(restored(bars.map((bar, i) => i === 22 ? { ...bar, c: NaN } : bar)), "INVALID_REVEALED_OHLC");

// The exact inclusive calendar cutoff retains an identity; the next M5
// cutoff expires it instead of selecting its old ordinal in the shorter tape.
const latestAtBoundary = { ...bars.at(-1), t: "2028-11-10T01:40:00.000Z" };
const laterClock = Date.parse(latestAtBoundary.t) + 10 * 300_000;
const boundaryTape = retain([...bars, latestAtBoundary], "M5");
assert.equal(boundaryTape[0].t, time(20));
assert.equal(restored(boundaryTape, signal, bookmark, laterClock).state, "AVAILABLE");
const expiredTape = retain([...bars, { ...latestAtBoundary, t: "2028-11-10T01:45:00.000Z" }], "M5");
assert.equal(expiredTape[0].t, time(21));
unavailable(restored(expiredTape, signal, bookmark, laterClock), "SELECTED_CANDLE_NOT_RETAINED");

const values = new Map();
const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
const options = { storage, nowMs };
const accountAliasScope = "100|Broker-A|11|XAUUSDm";
assert.equal(save(accountAliasScope, bookmark, options).state, "AVAILABLE");
for (const otherScope of ["200|Broker-A|11|XAUUSDm", "100|Broker-B|11|XAUUSDm", "100|Broker-A|12|XAUUSDm", "100|Broker-A|11|GOLD.i#", "local-retained-snapshot"]) {
  assert.equal(load(otherScope, options).reason, "NO_REPLAY_BOOKMARK", "account/server/generation/alias/fallback namespaces do not borrow saved identity");
}
const loaded = load(accountAliasScope, { storage, nowMs: laterClock });
assert.equal(loaded.state, "AVAILABLE", "valid storage is identity, not retention attestation");
unavailable(restored(expiredTape, signal, loaded.bookmark, laterClock), "SELECTED_CANDLE_NOT_RETAINED");
const withheld = restored(bars, signal, { ...bookmark, mode: "context", revealedTime: time(20) });
assert.equal(withheld.state, "AVAILABLE");
assert.equal(withheld.replay.view.outcome, null);
assert.equal(withheld.replay.view.study, null);
assert.equal(withheld.replay.futureWithheld, true);
console.log("PATTERN REPLAY BOOKMARK RETENTION PASS: exact current occurrence, canonical closed M5 path, inclusive 2Y expiry and account/alias storage isolation.");
