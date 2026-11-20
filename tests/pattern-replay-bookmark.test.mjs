import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const { build } = require("esbuild");
const bundled = await build({
  entryPoints: [fileURLToPath(new URL("../mfe_ux_lab/cockpit/src/lib/patternReplayBookmark.ts", import.meta.url))],
  bundle: true, write: false, platform: "node", format: "esm", logLevel: "silent",
});
const {
  encodePatternReplayBookmark: encode, decodePatternReplayBookmark: decode,
  canonicalPatternReplayBookmarkTime: canonical, PATTERN_REPLAY_BOOKMARK_MAX_LENGTH: maxLength,
} = await import("data:text/javascript;base64," + Buffer.from(bundled.outputFiles[0].text).toString("base64"));
const epoch = Date.parse("2026-11-10T00:00:00.000Z");
const time = step => new Date(epoch + step * 300_000).toISOString();
const options = { nowMs: epoch + 30 * 300_000 };
// Synthetic navigation identities only: no OHLC or measured market outcome.
const bookmark = {
  version: "pattern-replay-bookmark/1", occurrenceTime: time(0), conceptId: "pattern_break",
  reads: "bullish", mode: "outcome", revealedTime: time(3),
  authority: "SHADOW_ONLY / NO_DECISION", live_apply_allowed: false,
};
const invalid = value => {
  const result = encode(value, options);
  assert.equal(result.state, "INVALID");
  assert.equal(result.bookmark, null);
  assert.equal(result.encoded, null);
  return result.reason;
};

test("canonical identity roundtrips stably for each mode, read and concept family", () => {
  for (const mode of ["setup", "context", "outcome"]) for (const reads of ["bullish", "bearish", "neutral"]) for (const conceptId of ["pattern_break", "named_candle:doji"]) {
    const value = { ...bookmark, mode, reads, conceptId, revealedTime: time(mode === "outcome" ? 24 : 0) };
    const result = encode(value, options);
    assert.equal(result.state, "AVAILABLE");
    assert.deepEqual(result.bookmark, value);
    assert.deepEqual(decode(result.encoded, options), result);
    assert.equal(encode(decode(result.encoded, options).bookmark, options).encoded, result.encoded);
    assert.deepEqual(Object.keys(result.bookmark), Object.keys(bookmark));
  }
});

test("encoding reorders fields deterministically and detaches the input", () => {
  const input = { ...Object.fromEntries(Object.entries(bookmark).reverse()) };
  const result = encode(input, options);
  assert.equal(result.encoded, JSON.stringify(bookmark));
  input.conceptId = "changed";
  assert.equal(result.bookmark.conceptId, "pattern_break");
});

test("missing inputs are explicit unavailable; malformed wire inputs are invalid", () => {
  for (const value of [undefined, null, ""]) assert.equal(decode(value, options).state, "UNAVAILABLE");
  for (const value of [undefined, null]) assert.equal(encode(value, options).state, "UNAVAILABLE");
  for (const value of [1, {}, [], "null", "false", "[]", "{}", " ", "not-json", JSON.stringify(bookmark) + "{}"]) {
    const result = decode(value, options);
    assert.equal(result.state, "INVALID", String(value));
    assert.equal(result.encoded, null);
  }
});

test("rejects every field outside the navigation allowlist", () => {
  for (const key of ["o", "h", "l", "c", "rows", "outcome", "hitRate", "score", "statistics", "anchorIndex", "setup", "toJSON"]) {
    assert.equal(invalid({ ...bookmark, [key]: key === "toJSON" ? () => bookmark : 100 }), "INVALID_BOOKMARK_FIELDS");
    assert.equal(decode(JSON.stringify({ ...bookmark, [key]: 100 }), options).state, "INVALID");
  }
  assert.equal(invalid({ ...bookmark, [Symbol("extra")]: 1 }), "INVALID_BOOKMARK_FIELDS");
  const missing = { ...bookmark }; delete missing.reads;
  assert.equal(invalid(missing), "INVALID_BOOKMARK_FIELDS");
});

test("rejects accessors, hidden fields, custom prototypes and executable authority", () => {
  const accessor = { ...bookmark };
  Object.defineProperty(accessor, "reads", { enumerable: true, get() { throw Error("must not execute"); } });
  assert.equal(invalid(accessor), "INVALID_BOOKMARK_FIELDS");
  const hidden = { ...bookmark }; Object.defineProperty(hidden, "prices", { value: [100] });
  assert.equal(invalid(hidden), "INVALID_BOOKMARK_FIELDS");
  assert.equal(invalid(Object.assign(Object.create({}), bookmark)), "INVALID_BOOKMARK_RECORD");
  for (const live_apply_allowed of [true, "false", 0, null]) assert.equal(invalid({ ...bookmark, live_apply_allowed }), "INVALID_BOOKMARK_AUTHORITY");
  for (const authority of ["LIVE", "SHADOW_ONLY", null]) assert.equal(invalid({ ...bookmark, authority }), "INVALID_BOOKMARK_AUTHORITY");
});

test("rejects unsupported versions, modes, reads and unbounded concepts", () => {
  assert.equal(invalid({ ...bookmark, version: "pattern-replay-bookmark/2" }), "UNSUPPORTED_BOOKMARK_VERSION");
  for (const mode of ["live_apply", "OUTCOME", "", null]) assert.equal(invalid({ ...bookmark, mode }), "INVALID_BOOKMARK_MODE");
  for (const reads of ["UP", "bullish ", "", null]) assert.equal(invalid({ ...bookmark, reads }), "INVALID_BOOKMARK_READS");
  for (const conceptId of ["", "has space", "<script>", " pattern_break", "é", "a".repeat(161), null]) assert.equal(invalid({ ...bookmark, conceptId }), "INVALID_BOOKMARK_CONCEPT");
  assert.equal(encode({ ...bookmark, conceptId: "a".repeat(160) }, options).state, "AVAILABLE");
});

test("UTC identities reject aliases, impossible dates, off-grid and subsecond times", () => {
  for (const value of ["2026-11-10T00:00:00Z", "2026-11-10T00:00:00+00:00", "2026-11-10T00:01:00.000Z", "2026-11-10T00:00:01.000Z", "2026-11-10T00:00:00.001Z", "2026-02-30T00:00:00.000Z", "2026-11-10", 0, "1969-12-31T23:56:00.000Z"]) {
    for (const field of ["occurrenceTime", "revealedTime"]) assert.equal(invalid({ ...bookmark, [field]: value }), "INVALID_CANONICAL_UTC_M5_IDENTITY");
  }
  assert.equal(canonical("2026-11-10T00:00:00Z"), time(0), "explicit construction helper accepts exact retained seconds alias");
  assert.equal(canonical("2026-11-10T00:00:00+00:00"), null);
  assert.equal(canonical("2026-02-30T00:00:00Z"), null);
});

test("rejects unrevealed anchors, excess horizons and setup/context future reveals", () => {
  for (const revealedTime of [time(-1), time(25)]) assert.equal(invalid({ ...bookmark, revealedTime }), "UNSAFE_BOOKMARK_REVEAL_BOUNDARY");
  for (const mode of ["setup", "context"]) assert.equal(invalid({ ...bookmark, mode }), "UNSAFE_BOOKMARK_REVEAL_BOUNDARY");
});

test("both identities must represent already closed candles against a valid clock", () => {
  assert.equal(encode(bookmark, { nowMs: epoch + 4 * 300_000 }).state, "AVAILABLE", "exact close is safe");
  assert.equal(encode(bookmark, { nowMs: epoch + 4 * 300_000 - 1 }).reason, "BOOKMARK_CANDLE_NOT_CLOSED");
  for (const nowMs of [NaN, Infinity, -1, Number.MAX_VALUE]) assert.equal(encode(bookmark, { nowMs }).reason, "INVALID_BOOKMARK_CLOCK");
  assert.equal(invalid({ ...bookmark, occurrenceTime: time(40), revealedTime: time(40) }), "BOOKMARK_CANDLE_NOT_CLOSED");
  assert.equal(decode(JSON.stringify({ ...bookmark, revealedTime: time(40) }), options).reason, "BOOKMARK_CANDLE_NOT_CLOSED");
});

test("wire format rejects duplicate keys, whitespace, key reordering and escaped aliases", () => {
  const wire = JSON.stringify(bookmark);
  for (const value of [" " + wire, wire + "\n", JSON.stringify(bookmark, null, 2), JSON.stringify(Object.fromEntries(Object.entries(bookmark).reverse())), wire.replace('"mode":"outcome"', '"mode":"outcome","mode":"outcome"'), wire.replace("pattern_break", "pattern\\u005fbreak")]) {
    assert.equal(decode(value, options).reason, "NONCANONICAL_BOOKMARK_ENCODING");
  }
});

test("bounds wire input before JSON parsing", () => {
  assert.equal(decode("x".repeat(maxLength + 1), options).reason, "BOOKMARK_TOO_LONG");
  assert.equal(decode("x".repeat(maxLength), options).reason, "INVALID_BOOKMARK_JSON");
});
