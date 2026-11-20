import type { PatternInspectionMode } from "./patternInspectionWindow.ts";

/** Navigation identity only. Restoring one must recompute current retained
 * evidence through patternCausalReplay; this record never attests market data. */
export interface PatternReplayBookmark {
  version: "pattern-replay-bookmark/1";
  occurrenceTime: string;
  conceptId: string;
  reads: "bullish" | "bearish" | "neutral";
  mode: PatternInspectionMode;
  revealedTime: string;
  authority: "SHADOW_ONLY / NO_DECISION";
  live_apply_allowed: false;
}

export interface PatternReplayBookmarkOptions { nowMs?: number }
export type PatternReplayBookmarkResult = {
  state: "AVAILABLE";
  reason: "VALID_CAUSAL_REPLAY_BOOKMARK";
  bookmark: PatternReplayBookmark;
  encoded: string;
} | {
  state: "UNAVAILABLE" | "INVALID";
  reason: string;
  bookmark: null;
  encoded: null;
};

export const PATTERN_REPLAY_BOOKMARK_VERSION = "pattern-replay-bookmark/1" as const;
export const PATTERN_REPLAY_BOOKMARK_MAX_LENGTH = 2048;
export const PATTERN_REPLAY_BOOKMARK_MAX_CONCEPT_LENGTH = 160;
const M5_MS = 300_000;
const KEYS = ["version", "occurrenceTime", "conceptId", "reads", "mode", "revealedTime", "authority", "live_apply_allowed"] as const;
const failure = (reason: string, state: "UNAVAILABLE" | "INVALID" = "INVALID"): PatternReplayBookmarkResult => ({ state, reason, bookmark: null, encoded: null });

/** Accept only the two exact UTC aliases used by retained M5 bars. Consumers
 * may use this when constructing a record; the serialized codec is stricter. */
export function canonicalPatternReplayBookmarkTime(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.000)?Z$/.test(value)) return null;
  const instant = Date.parse(value);
  const canonical = value.endsWith(".000Z") ? value : value.replace("Z", ".000Z");
  return Number.isFinite(instant) && instant % M5_MS === 0 && new Date(instant).toISOString() === canonical ? canonical : null;
}

/** Validate and deterministically encode an identity-only record. Unknown
 * fields are rejected, including prices, outcomes, indices and statistics.
 * Passing a clock makes validation deterministic for tests and import flows. */
export function encodePatternReplayBookmark(value: unknown, options: PatternReplayBookmarkOptions = {}): PatternReplayBookmarkResult {
  if (value == null) return failure("NO_REPLAY_BOOKMARK", "UNAVAILABLE");
  const nowMs = options.nowMs ?? Date.now();
  if (!Number.isFinite(nowMs) || nowMs < 0 || nowMs > 8_640_000_000_000_000) return failure("INVALID_BOOKMARK_CLOCK");
  if (typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) return failure("INVALID_BOOKMARK_RECORD");
  const record = value as Record<string, unknown>;
  // Reject hidden/accessor/symbol fields too: this codec must not serialize a
  // price receipt or invoke a caller-controlled toJSON/getter.
  const descriptors = Object.getOwnPropertyDescriptors(record);
  if (Reflect.ownKeys(record).length !== KEYS.length || KEYS.some(key => !Object.prototype.hasOwnProperty.call(descriptors, key) || !Object.prototype.hasOwnProperty.call(descriptors[key], "value") || !descriptors[key].enumerable)) return failure("INVALID_BOOKMARK_FIELDS");
  if (record.version !== PATTERN_REPLAY_BOOKMARK_VERSION) return failure("UNSUPPORTED_BOOKMARK_VERSION");
  if (record.authority !== "SHADOW_ONLY / NO_DECISION" || record.live_apply_allowed !== false) return failure("INVALID_BOOKMARK_AUTHORITY");
  if (typeof record.conceptId !== "string" || record.conceptId.length > PATTERN_REPLAY_BOOKMARK_MAX_CONCEPT_LENGTH || !/^[a-zA-Z0-9][a-zA-Z0-9:_-]*$/.test(record.conceptId)) return failure("INVALID_BOOKMARK_CONCEPT");
  if (!["bullish", "bearish", "neutral"].includes(record.reads as string)) return failure("INVALID_BOOKMARK_READS");
  if (!["setup", "context", "outcome"].includes(record.mode as string)) return failure("INVALID_BOOKMARK_MODE");
  const occurrenceTime = canonicalPatternReplayBookmarkTime(record.occurrenceTime);
  const revealedTime = canonicalPatternReplayBookmarkTime(record.revealedTime);
  if (!occurrenceTime || occurrenceTime !== record.occurrenceTime || !revealedTime || revealedTime !== record.revealedTime) return failure("INVALID_CANONICAL_UTC_M5_IDENTITY");
  const occurrenceMs = Date.parse(occurrenceTime), revealedMs = Date.parse(revealedTime);
  if (occurrenceMs + M5_MS > nowMs || revealedMs + M5_MS > nowMs) return failure("BOOKMARK_CANDLE_NOT_CLOSED");
  if (revealedMs < occurrenceMs || revealedMs > occurrenceMs + 24 * M5_MS || (record.mode !== "outcome" && revealedMs !== occurrenceMs)) return failure("UNSAFE_BOOKMARK_REVEAL_BOUNDARY");
  const bookmark: PatternReplayBookmark = {
    version: PATTERN_REPLAY_BOOKMARK_VERSION,
    occurrenceTime,
    conceptId: record.conceptId,
    reads: record.reads as PatternReplayBookmark["reads"],
    mode: record.mode as PatternInspectionMode,
    revealedTime,
    authority: "SHADOW_ONLY / NO_DECISION",
    live_apply_allowed: false,
  };
  const encoded = JSON.stringify(bookmark);
  if (encoded.length > PATTERN_REPLAY_BOOKMARK_MAX_LENGTH) return failure("BOOKMARK_TOO_LONG");
  return { state: "AVAILABLE", reason: "VALID_CAUSAL_REPLAY_BOOKMARK", bookmark, encoded };
}

/** The wire form must be exactly the canonical encoding. This also rejects
 * duplicate JSON keys, escaped identity aliases and trailing payloads. */
export function decodePatternReplayBookmark(value: unknown, options: PatternReplayBookmarkOptions = {}): PatternReplayBookmarkResult {
  if (value == null || value === "") return failure("NO_REPLAY_BOOKMARK", "UNAVAILABLE");
  if (typeof value !== "string") return failure("INVALID_BOOKMARK_ENCODING");
  if (value.length > PATTERN_REPLAY_BOOKMARK_MAX_LENGTH) return failure("BOOKMARK_TOO_LONG");
  let parsed: unknown;
  try { parsed = JSON.parse(value); } catch { return failure("INVALID_BOOKMARK_JSON"); }
  const result = encodePatternReplayBookmark(parsed, options);
  if (result.state !== "AVAILABLE") return parsed == null ? failure("INVALID_BOOKMARK_RECORD") : result;
  return result.encoded === value ? result : failure("NONCANONICAL_BOOKMARK_ENCODING");
}
