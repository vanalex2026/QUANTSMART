import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const component = readFileSync(new URL("../mfe_ux_lab/cockpit/src/components/ChartPatternInspector.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../mfe_ux_lab/cockpit/src/components/chart-pattern-inspector.css", import.meta.url), "utf8");

assert.match(component, /<aside ref=\{root\} className="chart-pattern-inspector" role="dialog" aria-modal="false" aria-labelledby=\{titleId\} tabIndex=\{-1\}/,
  "the inspector is a named, programmatically focusable dialog surface");
assert.match(component, /aria-label="Close pattern inspection"/, "the close control has an explicit accessible name");
assert.match(component, /className="chart-pattern-inspector-body" role="region" tabIndex=\{0\} aria-label="Pattern inspection details"/,
  "long evidence remains available as a named keyboard-focusable region");
assert.match(component, /if \(event\.key === "Escape"\)[\s\S]*onClose\(\)/,
  "Escape remains a native inspector dismissal path");
assert.match(component, /previous\.isConnected[\s\S]*previous\.focus\(\{ preventScroll: true \}\)/,
  "closing the inspector restores focus to the invoking control when it remains connected");
assert.match(component, /type="button" aria-label="Inspect earlier pattern occurrence"/,
  "occurrence navigation uses native keyboard controls");
assert.match(component, /<input type="number" aria-label="Pattern occurrence number"/,
  "occurrence jump has a direct form-control label");

assert.match(styles, /\.chart-pattern-inspector-body\{[^}]*overflow-y:auto;overscroll-behavior:contain;/,
  "inspector scrolling stays local instead of chaining to the page");
assert.match(styles, /\.chart-pattern-inspector-body:focus-visible\{outline:2px solid #aaa;/,
  "the scroll region retains a visible keyboard focus ring");
assert.match(styles, /@media\(max-width:640px\)\{[\s\S]*\.chart-pattern-inspector\{[\s\S]*max-height:65dvh[\s\S]*\.chart-pattern-inspector-body\{padding:10px 12px\}[\s\S]*\.chart-pattern-inspector-navigation button\{min-height:36px\}/,
  "mobile inspector geometry remains bounded with tappable navigation controls");
assert.match(styles, /\.chart-pattern-inspector \.pattern-inspection-rail-control\{[^}]*height:16px;[^}]*min-height:0;/,
  "compact rail controls remain excluded from generic touch sizing because their equivalent key buttons are available");
assert.match(styles, /\.pattern-inspection-level-key button\{[^}]*min-height:32px;/,
  "the equivalent full-width level-key controls remain available for pointer and touch input");

console.log("WAVE 2 ACCESSIBILITY AUDIT PASS: focused inspector semantics, focus restoration, local scrolling and bounded mobile touch paths are retained; no product fix justified.");
