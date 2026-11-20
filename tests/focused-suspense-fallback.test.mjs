import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url), "utf8");

// The legacy job controller renders no UI and cannot replace the chart. Only
// that exact boundary may have an empty fallback; visible lazy surfaces still
// need an accessible loading state.
const visibleSurfaces = source.replace(/!focused && <Suspense fallback=\{null\}><LegacyResearchJobsController[^>]*\/><\/Suspense>/, '');
assert.doesNotMatch(visibleSurfaces, /<Suspense\s+fallback=\{null\}>/, "Microscope must not blank the chart while a lazy panel is loading");
assert.match(source, /const microscopeSuspenseFallback = \(\s*<div[\s\S]*role="status"[\s\S]*aria-label="Loading chart surface"/, "the loading fallback must expose one accessible status");
assert.match(source, /background:\s*"#050505"[\s\S]*color:\s*"#f5f5f5"/, "the loading fallback must preserve the focused monochrome palette");
assert.match(source, /fallback=\{microscopeSuspenseFallback\}/, "Microscope must use the non-blank loading fallback");

console.log("FOCUSED SUSPENSE FALLBACK PASS: lazy loading keeps an accessible monochrome chart surface visible.");
