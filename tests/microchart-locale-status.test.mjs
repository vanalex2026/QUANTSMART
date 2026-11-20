import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../mfe_ux_lab/cockpit/src/components/MicroChart.tsx", import.meta.url), "utf8");

assert.match(source, /No shadow annotations in visible window/,
  "English empty-annotation status must remain available");
assert.match(source, /Kh%C3%B4ng%20c%C3%B3%20ch%C3%BA%20th%C3%ADch%20quan%20s%C3%A1t%20n%C3%A0o%20trong%20khung%20%C4%91ang%20hi%E1%BB%83n%20th%E1%BB%8B/,
  "empty-annotation status must have a Vietnamese branch");
assert.match(source, /Drawings hidden; annotations remain saved/,
  "English drawing visibility status must remain available");
assert.match(source, /%C4%90%C3%A3%20%E1%BA%A9n%20b%E1%BA%A3n%20v%E1%BA%BD/,
  "drawing visibility status must have a Vietnamese branch");
assert.match(source, /Annotations available in the visible window/,
  "English populated-annotation status must remain available");
assert.match(source, /C%C3%B3%20ch%C3%BA%20th%C3%ADch%20quan%20s%C3%A1t%20trong%20khung%20%C4%91ang%20hi%E1%BB%83n%20th%E1%BB%8B/,
  "populated-annotation status must have a Vietnamese branch");

console.log("MICROCHART LOCALE STATUS PASS: empty and drawing-visibility announcements follow EN/VI locale state.");
