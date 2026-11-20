// Canonical input boundary for backend XAUUSD M5 detector jobs.
//
// Detector jobs are descriptive only.  This module deliberately does not
// import the detector engine: it validates the transport envelope before a
// worker is allowed to evaluate any geometry.  A tape hash identifies the
// canonical scope and closed OHLC sequence; retrieval time is provenance and
// therefore is intentionally excluded from the hash.
import { createHash } from "node:crypto";

export const RESEARCH_TAPE_CONTRACT_VERSION = "quantsmart.research-tape/1";
export const CANONICAL_DETECTOR_SYMBOL = "XAUUSD";
export const CANONICAL_DETECTOR_TIMEFRAME = "M5";

const ACCOUNT_SCOPE_KEYS = ["account_id", "server", "broker_symbol", "server_timezone"];
const UTC_STAMP = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.000)?Z$/;
const UTC_RETRIEVED_AT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
const HASH = /^[a-f0-9]{64}$/;

const fail = (reason, detail) => ({ ok: false, reason, ...(detail ? { detail } : {}) });
const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

function canonicalUtc(value) {
  if (typeof value !== "string") return null;
  const match = value.match(UTC_STAMP);
  if (!match) return null;
  const instant = Date.parse(`${match[1]}Z`);
  if (!Number.isFinite(instant) || instant % 300_000 !== 0) return null;
  return { ms: instant, stamp: new Date(instant).toISOString() };
}

function canonicalRetrievedAt(value) {
  if (typeof value !== "string" || !UTC_RETRIEVED_AT.test(value)) return null;
  const instant = Date.parse(value);
  return Number.isFinite(instant) ? { ms: instant, stamp: new Date(instant).toISOString() } : null;
}

function canonicalAccountScope(value) {
  if (value === undefined) return null;
  if (!isRecord(value)) return fail("ACCOUNT_SCOPE_INVALID");
  const unknown = Object.keys(value).filter((key) => !ACCOUNT_SCOPE_KEYS.includes(key));
  if (unknown.length) return fail("ACCOUNT_SCOPE_INVALID", unknown.join(","));
  const scope = {};
  for (const key of ACCOUNT_SCOPE_KEYS) {
    if (value[key] === undefined) continue;
    if (typeof value[key] !== "string" || !value[key].trim() || value[key].length > 256) {
      return fail("ACCOUNT_SCOPE_INVALID", key);
    }
    scope[key] = value[key].trim();
  }
  return scope;
}

function canonicalBars(rawBars, nowMs) {
  if (!Array.isArray(rawBars) || rawBars.length === 0) return fail("BARS_REQUIRED");
  const bars = [];
  let previousMs = -Infinity;
  for (let index = 0; index < rawBars.length; index += 1) {
    const raw = rawBars[index];
    if (!isRecord(raw)) return fail("BAR_INVALID", String(index));
    const timestamp = canonicalUtc(raw.t);
    if (!timestamp) return fail("BAR_TIMESTAMP_NOT_ALIGNED", String(index));
    if (timestamp.ms <= previousMs) {
      return fail(timestamp.ms === previousMs ? "BAR_TIMESTAMP_DUPLICATE" : "BAR_TIMESTAMP_NOT_ASCENDING", String(index));
    }
    // A detector tape is closed-only.  A bar that has not elapsed its complete
    // five-minute interval is mutable context and must never enter a worker.
    if (raw.closed === false || timestamp.ms + 300_000 > nowMs) return fail("BAR_FORMING", String(index));
    const values = [raw.o, raw.h, raw.l, raw.c];
    if (!values.every((value) => typeof value === "number" && Number.isFinite(value))) {
      return fail("BAR_OHLC_INVALID", String(index));
    }
    const [open, high, low, close] = values;
    if (high < Math.max(open, close, low) || low > Math.min(open, high, close)) {
      return fail("BAR_OHLC_INVALID", String(index));
    }
    previousMs = timestamp.ms;
    // Keep the hash independent of source row indices and presentation-only
    // fields.  Timestamp and OHLC are the detector's complete causal input.
    bars.push({ t: timestamp.stamp, o: open, h: high, l: low, c: close });
  }
  return bars;
}

function hashPayload({ symbol, timeframe, account_scope, bars }) {
  const payload = {
    contract: RESEARCH_TAPE_CONTRACT_VERSION,
    symbol,
    timeframe,
    account_scope: account_scope ?? null,
    bars,
  };
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

/**
 * Compute the stable identity of a canonical detector tape.
 *
 * This helper assumes its input has already passed validation.  Callers that
 * accept untrusted HTTP input should use validateCanonicalDetectorTape first.
 */
export function hashCanonicalDetectorTape(input) {
  if (!isRecord(input)) throw new TypeError("INVALID_DETECTOR_ENVELOPE");
  const scope = canonicalAccountScope(input.account_scope);
  if (scope?.ok === false) throw new TypeError(scope.reason);
  const bars = canonicalBars(input.bars, Number.POSITIVE_INFINITY);
  if (bars?.ok === false) throw new TypeError(bars.reason);
  return hashPayload({
    symbol: input.symbol,
    timeframe: input.timeframe,
    account_scope: scope,
    bars,
  });
}

/**
 * Validate and canonicalize a backend detector request envelope.
 *
 * `nowMs` is injectable for deterministic tests and should be the server clock
 * at receipt time in production.  The returned `bars` and `tape_hash` are the
 * values a worker should consume and echo in its result provenance.
 */
export function validateCanonicalDetectorTape(envelope, { nowMs = Date.now() } = {}) {
  if (!isRecord(envelope)) return fail("INVALID_DETECTOR_ENVELOPE");
  if (envelope.symbol !== CANONICAL_DETECTOR_SYMBOL || envelope.timeframe !== CANONICAL_DETECTOR_TIMEFRAME) {
    return fail("INVALID_XAUUSD_M5_SCOPE");
  }
  if (!Number.isFinite(nowMs)) return fail("INVALID_VALIDATION_CLOCK");
  // Retrieval is a wall-clock provenance marker and need not fall on an M5
  // boundary (the bridge includes milliseconds).  Only bar timestamps use the
  // five-minute alignment rule above.
  const retrieved = canonicalRetrievedAt(envelope.retrieved_at);
  if (!retrieved) return fail("RETRIEVED_AT_INVALID");
  const accountScope = canonicalAccountScope(envelope.account_scope);
  if (accountScope?.ok === false) return accountScope;
  const bars = canonicalBars(envelope.bars, nowMs);
  if (bars?.ok === false) return bars;
  const tapeHash = hashPayload({
    symbol: CANONICAL_DETECTOR_SYMBOL,
    timeframe: CANONICAL_DETECTOR_TIMEFRAME,
    account_scope: accountScope,
    bars,
  });
  if (envelope.tape_hash !== undefined && (typeof envelope.tape_hash !== "string" || !HASH.test(envelope.tape_hash))) {
    return fail("TAPE_HASH_INVALID");
  }
  if (envelope.tape_hash !== undefined && envelope.tape_hash !== tapeHash) return fail("TAPE_HASH_MISMATCH");
  return {
    ok: true,
    contract: RESEARCH_TAPE_CONTRACT_VERSION,
    symbol: CANONICAL_DETECTOR_SYMBOL,
    timeframe: CANONICAL_DETECTOR_TIMEFRAME,
    account_scope: accountScope,
    retrieved_at: retrieved.stamp,
    bars,
    tape_hash: tapeHash,
  };
}

export const __private = { canonicalUtc, canonicalRetrievedAt, canonicalAccountScope, canonicalBars };
