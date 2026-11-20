import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url), "utf8");

assert.match(source, /const onAnaloguePreviewKeyDown = \(event: React\.KeyboardEvent<HTMLDivElement>\)/,
  "mini analogue preview must expose a keyboard navigation handler");
assert.match(source, /event\.key !== "ArrowLeft" && event\.key !== "ArrowRight" && event\.key !== "Home" && event\.key !== "End"/,
  "mini analogue navigation must support horizontal and edge-jump keys");
assert.match(source, /event\.key === "Home"[\s\S]*analogueMatches\.length - 1[\s\S]*event\.key === "ArrowLeft"/,
  "mini analogue navigation must bound Home, End, and relative movement to retained matches");
assert.match(source, /aria-keyshortcuts="ArrowLeft ArrowRight Home End"/,
  "mini analogue preview must disclose its keyboard navigation contract");
assert.match(source, /Research evidence only · SHADOW_ONLY · NO_DECISION · no order authority\./,
  "keyboard analogue inspection must retain the read-only authority boundary");

console.log("FOCUSED ANALOGUE KEYBOARD PASS: retained analogue previews support Arrow/Home/End navigation with explicit read-only provenance.");
