import {
  decodePatternReplayBookmark,
  encodePatternReplayBookmark,
  type PatternReplayBookmark,
  type PatternReplayBookmarkOptions,
} from "./patternReplayBookmark.ts";

export type PatternReplayBookmarkStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export interface PatternReplayBookmarkStoreOptions extends PatternReplayBookmarkOptions {
  /** Omit for browser localStorage; null explicitly disables persistence. */
  storage?: PatternReplayBookmarkStorage | null;
}

export type PatternReplayBookmarkStoreResult = {
  state: "AVAILABLE";
  reason: "REPLAY_BOOKMARK_LOADED" | "REPLAY_BOOKMARK_SAVED" | "REPLAY_BOOKMARK_CLEARED";
  bookmark: PatternReplayBookmark | null;
  encoded: string | null;
} | {
  state: "UNAVAILABLE" | "INVALID";
  reason: string;
  bookmark: null;
  encoded: null;
};

export const PATTERN_REPLAY_BOOKMARK_STORE_PREFIX = "mfe_pattern_replay_bookmark_v1:XAUUSD:M5:";
export const PATTERN_REPLAY_BOOKMARK_MAX_SCOPE_LENGTH = 256;
const failure = (reason: string, state: "UNAVAILABLE" | "INVALID" = "UNAVAILABLE"): PatternReplayBookmarkStoreResult => ({ state, reason, bookmark: null, encoded: null });

/** The caller supplies the current terminal/account and broker-alias scope.
 * It must use the same scope for restore; this module never infers identity
 * from mutable application state or falls back to another account's key. */
export function patternReplayBookmarkStorageKey(scope: unknown): string | null {
  if (typeof scope !== "string" || !scope || scope.length > PATTERN_REPLAY_BOOKMARK_MAX_SCOPE_LENGTH || scope.trim() !== scope || /[\u0000-\u001f\u007f]/.test(scope)) return null;
  try { return PATTERN_REPLAY_BOOKMARK_STORE_PREFIX + encodeURIComponent(scope); }
  catch { return null; }
}

function storageFailure(error: unknown, action: "ACCESS" | "READ" | "WRITE" | "CLEAR"): PatternReplayBookmarkStoreResult {
  // Error messages may include private browser/account details. Return only
  // stable error categories, including legacy Firefox's quota exception name.
  let name: unknown;
  try { name = error && typeof error === "object" ? (error as { name?: unknown }).name : null; } catch { /* untrusted thrown value */ }
  if (name === "SecurityError") return failure("BOOKMARK_STORAGE_SECURITY_ERROR");
  if (name === "QuotaExceededError" || name === "NS_ERROR_DOM_QUOTA_REACHED") return failure("BOOKMARK_STORAGE_QUOTA_EXCEEDED");
  return failure(`BOOKMARK_STORAGE_${action}_FAILED`);
}

function resolveStorage(options: PatternReplayBookmarkStoreOptions): { storage: PatternReplayBookmarkStorage } | { result: PatternReplayBookmarkStoreResult } {
  try {
    const storage = options.storage === undefined ? globalThis.localStorage : options.storage;
    if (!storage || typeof storage.getItem !== "function" || typeof storage.setItem !== "function" || typeof storage.removeItem !== "function") return { result: failure("BOOKMARK_STORAGE_UNAVAILABLE") };
    return { storage };
  } catch (error) { return { result: storageFailure(error, "ACCESS") }; }
}

/** Load only canonical identity data. Every read revalidates the current
 * clock; a saved record is never evidence that a candle is still available
 * in retained history. The caller must resolve it through causal replay. */
export function loadPatternReplayBookmark(scope: string, options: PatternReplayBookmarkStoreOptions = {}): PatternReplayBookmarkStoreResult {
  const key = patternReplayBookmarkStorageKey(scope);
  if (!key) return failure("INVALID_BOOKMARK_STORAGE_SCOPE", "INVALID");
  const resolved = resolveStorage(options);
  if ("result" in resolved) return resolved.result;
  const { storage } = resolved;
  let raw: string | null;
  try { raw = storage.getItem(key); }
  catch (error) { return storageFailure(error, "READ"); }
  // A missing key is unavailable, but an existing empty value is corruption.
  if (raw === null) return failure("NO_REPLAY_BOOKMARK");
  if (raw === "") return failure("INVALID_BOOKMARK_ENCODING", "INVALID");
  const result = decodePatternReplayBookmark(raw, options);
  if (result.state !== "AVAILABLE") return failure(result.reason, result.state);
  return { state: "AVAILABLE", reason: "REPLAY_BOOKMARK_LOADED", bookmark: result.bookmark, encoded: result.encoded };
}

/** Replace this scope's single record with canonical identity data. Invalid
 * values never reach storage, and failed writes never claim a memory save. */
export function savePatternReplayBookmark(scope: string, value: unknown, options: PatternReplayBookmarkStoreOptions = {}): PatternReplayBookmarkStoreResult {
  const key = patternReplayBookmarkStorageKey(scope);
  if (!key) return failure("INVALID_BOOKMARK_STORAGE_SCOPE", "INVALID");
  const result = encodePatternReplayBookmark(value, options);
  if (result.state !== "AVAILABLE") return failure(result.reason, result.state);
  const resolved = resolveStorage(options);
  if ("result" in resolved) return resolved.result;
  const { storage } = resolved;
  try { storage.setItem(key, result.encoded); }
  catch (error) { return storageFailure(error, "WRITE"); }
  return { state: "AVAILABLE", reason: "REPLAY_BOOKMARK_SAVED", bookmark: result.bookmark, encoded: result.encoded };
}

/** Clear exactly one scoped record, without touching other browser data. */
export function clearPatternReplayBookmark(scope: string, options: PatternReplayBookmarkStoreOptions = {}): PatternReplayBookmarkStoreResult {
  const key = patternReplayBookmarkStorageKey(scope);
  if (!key) return failure("INVALID_BOOKMARK_STORAGE_SCOPE", "INVALID");
  const resolved = resolveStorage(options);
  if ("result" in resolved) return resolved.result;
  const { storage } = resolved;
  try { storage.removeItem(key); }
  catch (error) { return storageFailure(error, "CLEAR"); }
  return { state: "AVAILABLE", reason: "REPLAY_BOOKMARK_CLEARED", bookmark: null, encoded: null };
}
