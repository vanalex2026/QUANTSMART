import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const { build } = require("esbuild");
const bundled = await build({
  entryPoints: [fileURLToPath(new URL("../mfe_ux_lab/cockpit/src/lib/patternReplayBookmarkStore.ts", import.meta.url))],
  bundle: true, write: false, platform: "node", format: "esm", logLevel: "silent",
});
const lib = await import("data:text/javascript;base64," + Buffer.from(bundled.outputFiles[0].text).toString("base64"));
const { loadPatternReplayBookmark: load, savePatternReplayBookmark: save, clearPatternReplayBookmark: clear, patternReplayBookmarkStorageKey: key } = lib;
const scope = "terminal-1/account-123/broker:XAUUSDm";
const otherScope = "terminal-1/account-456/broker:XAUUSDm";
const bookmark = {
  version: "pattern-replay-bookmark/1",
  occurrenceTime: "2026-11-10T00:00:00.000Z",
  conceptId: "pattern_break",
  reads: "bullish",
  mode: "outcome",
  revealedTime: "2026-11-10T00:10:00.000Z",
  authority: "SHADOW_ONLY / NO_DECISION",
  live_apply_allowed: false,
};
const nowMs = Date.parse("2026-11-10T01:00:00.000Z");
const memory = () => {
  const values = new Map();
  const calls = [];
  return {
    values, calls,
    getItem(k) { calls.push(["get", k]); return values.has(k) ? values.get(k) : null; },
    setItem(k, value) { calls.push(["set", k]); values.set(k, value); },
    removeItem(k) { calls.push(["remove", k]); values.delete(k); },
  };
};
const storage = memory();
storage.state = "an unrelated browser storage key";
const options = { storage, nowMs };
assert.match(key(scope), /^mfe_pattern_replay_bookmark_v1:XAUUSD:M5:/);
assert.notEqual(key("account:a/b"), key("account:a%2Fb"), "scope escaping cannot collide");
for (const invalid of [undefined, null, "", " ", " account", "account ", "a\nb", "x".repeat(257), "\ud800"]) {
  assert.equal(key(invalid), null, "malformed scopes are rejected");
  assert.equal(load(invalid, options).reason, "INVALID_BOOKMARK_STORAGE_SCOPE");
  assert.equal(save(invalid, bookmark, options).reason, "INVALID_BOOKMARK_STORAGE_SCOPE");
  assert.equal(clear(invalid, options).reason, "INVALID_BOOKMARK_STORAGE_SCOPE");
}
assert.equal(storage.calls.length, 0, "invalid scopes never touch storage");
assert.equal(load(scope, options).state, "UNAVAILABLE");
const saved = save(scope, bookmark, options);
assert.equal(saved.reason, "REPLAY_BOOKMARK_SAVED");
assert.deepEqual(saved.bookmark, bookmark);
assert.equal(storage.values.size, 1);
assert.equal(storage.values.get(key(scope)), JSON.stringify(bookmark));
assert.equal(load(otherScope, options).reason, "NO_REPLAY_BOOKMARK", "accounts cannot restore each other's identity");
assert.deepEqual(load(scope, options).bookmark, bookmark);

const second = { ...bookmark, reads: "bearish", conceptId: "second_setup" };
assert.equal(save(scope, second, options).state, "AVAILABLE");
assert.equal(storage.values.size, 1, "a save replaces the single scoped record");
assert.deepEqual(load(scope, options).bookmark, second);
save(otherScope, bookmark, options);
storage.values.set("unrelated-market-data", "keep");
assert.equal(clear(scope, options).reason, "REPLAY_BOOKMARK_CLEARED");
assert.equal(load(scope, options).reason, "NO_REPLAY_BOOKMARK");
assert.deepEqual(load(otherScope, options).bookmark, bookmark);
assert.equal(storage.values.get("unrelated-market-data"), "keep");
assert.equal(clear(scope, options).state, "AVAILABLE", "clearing a missing record is idempotent");

save(scope, bookmark, options);
const beforeInvalid = storage.values.get(key(scope));
for (const invalid of [
  { ...bookmark, o: 100 }, { ...bookmark, outcome: "UP" }, { ...bookmark, winRate: .9 },
  { ...bookmark, index: 10 }, { ...bookmark, live_apply_allowed: true },
  { ...bookmark, revealedTime: "2026-11-10T00:01:00.000Z" },
]) {
  assert.equal(save(scope, invalid, options).state, "INVALID");
  assert.equal(storage.values.get(key(scope)), beforeInvalid, "rejected values preserve prior record");
}
assert.equal(save(scope, bookmark, { storage, nowMs: NaN }).reason, "INVALID_BOOKMARK_CLOCK");
assert.equal(load(scope, { storage, nowMs: NaN }).reason, "INVALID_BOOKMARK_CLOCK");
assert.equal(load(scope, { storage, nowMs: Date.parse(bookmark.revealedTime) }).reason, "BOOKMARK_CANDLE_NOT_CLOSED", "load revalidates the clock after rollback");
assert.equal(save(scope, bookmark, { storage, nowMs: Date.parse(bookmark.revealedTime) }).reason, "BOOKMARK_CANDLE_NOT_CLOSED");

for (const malformed of ["", "{", "null", "[]", "{}", " "+JSON.stringify(bookmark), JSON.stringify({ ...bookmark, outcome: "UP" }), "x".repeat(2049)]) {
  storage.values.set(key(scope), malformed);
  const result = load(scope, options);
  assert.equal(result.state, "INVALID", "stored corruption cannot restore a bookmark");
  assert.equal(result.bookmark, null);
  assert.equal(result.encoded, null);
  assert.equal(storage.values.get(key(scope)), malformed, "reads do not mutate corrupt or unrelated storage");
}

for (const storage of [null, {}, { getItem() {} }]) {
  assert.equal(load(scope, { storage, nowMs }).reason, "BOOKMARK_STORAGE_UNAVAILABLE");
  assert.equal(save(scope, bookmark, { storage, nowMs }).reason, "BOOKMARK_STORAGE_UNAVAILABLE");
  assert.equal(clear(scope, { storage, nowMs }).reason, "BOOKMARK_STORAGE_UNAVAILABLE");
}
const throwStorage = (name) => ({
  getItem() { throw Object.assign(new Error("private details"), { name }); },
  setItem() { throw Object.assign(new Error("private details"), { name }); },
  removeItem() { throw Object.assign(new Error("private details"), { name }); },
});
for (const [name, expected] of [["SecurityError", "BOOKMARK_STORAGE_SECURITY_ERROR"], ["QuotaExceededError", "BOOKMARK_STORAGE_QUOTA_EXCEEDED"], ["NS_ERROR_DOM_QUOTA_REACHED", "BOOKMARK_STORAGE_QUOTA_EXCEEDED"]]) {
  const options = { storage: throwStorage(name), nowMs };
  for (const result of [load(scope, options), save(scope, bookmark, options), clear(scope, options)]) {
    assert.equal(result.state, "UNAVAILABLE");
    assert.equal(result.reason, expected);
    assert.equal(result.bookmark, null);
    assert.equal(result.encoded, null);
    assert.ok(!JSON.stringify(result).includes("private details"));
  }
}
const generic = { storage: throwStorage("Error"), nowMs };
assert.equal(load(scope, generic).reason, "BOOKMARK_STORAGE_READ_FAILED");
assert.equal(save(scope, bookmark, generic).reason, "BOOKMARK_STORAGE_WRITE_FAILED");
assert.equal(clear(scope, generic).reason, "BOOKMARK_STORAGE_CLEAR_FAILED");

const previousStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
try {
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: memory() });
  assert.equal(save(scope, bookmark, { nowMs }).state, "AVAILABLE", "default path uses browser localStorage");
  assert.deepEqual(load(scope, { nowMs }).bookmark, bookmark);
  assert.equal(clear(scope).state, "AVAILABLE");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, get() { throw Object.assign(new Error(), { name: "SecurityError" }); } });
  assert.equal(load(scope, { nowMs }).reason, "BOOKMARK_STORAGE_SECURITY_ERROR", "blocked localStorage accessor is handled");
  assert.equal(save(scope, bookmark, { nowMs }).reason, "BOOKMARK_STORAGE_SECURITY_ERROR");
  assert.equal(clear(scope).reason, "BOOKMARK_STORAGE_SECURITY_ERROR");
  assert.equal(load(scope, { storage: null, nowMs }).reason, "BOOKMARK_STORAGE_UNAVAILABLE", "explicitly disabled storage avoids browser accessor");
  delete globalThis.localStorage;
  assert.equal(load(scope, { nowMs }).reason, "BOOKMARK_STORAGE_UNAVAILABLE", "SSR has no silent memory fallback");
} finally {
  if (previousStorage) Object.defineProperty(globalThis, "localStorage", previousStorage);
  else delete globalThis.localStorage;
}
console.log("PATTERN REPLAY BOOKMARK STORE PASS: scoped identity-only persistence, canonical revalidation and explicit storage failures.");
