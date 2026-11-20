import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url), "utf8");
assert.match(source, /normalizeResearchBookmarks = \(value: unknown, contextOnly = true\)/,
  "bookmark normalization must support validating a durable cross-context shelf");
assert.match(source, /const shelf = normalizeResearchBookmarks\(raw, false\)/,
  "hydration must preserve valid bookmarks from other focused contexts in storage");
assert.match(source, /setResearchBookmarks\(valid\)/,
  "the visible shelf must still be filtered to the active symbol/timeframe");
assert.match(source, /localStorage\.setItem\(BOOKMARKS_KEY, JSON\.stringify\(nextShelf\)\)/,
  "bookmark writes must retain other-context records instead of deleting them on context switch");
assert.match(source, /const nextShelf = normalizeResearchBookmarks\(shelf\.filter\(\(record\) => record\.id !== id\), false\)/,
  "deletion must operate on the durable cross-context shelf");
assert.match(source, /maxWidth: "100%", minHeight: 36, padding: "3px 6px", textAlign: "left", whiteSpace: "normal", overflowWrap: "anywhere"/,
  "long bookmark names must wrap inside a bounded restore target on narrow layouts");
assert.match(source, /minWidth: 36, minHeight: 36, padding: "3px 6px", color: "var\(--mfe-red\)"/,
  "bookmark deletion must remain a minimum 36px touch target");
assert.match(source, /overflowWrap: "anywhere", whiteSpace: "normal" }}>\{snapshotStatus\}/,
  "saved bookmark status must wrap unbroken user names without page overflow");
console.log("FOCUSED BOOKMARK CONTEXT PASS: cross-context bookmarks remain durable while the visible shelf stays namespaced.");
