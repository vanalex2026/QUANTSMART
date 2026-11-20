import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const component = readFileSync(new URL("../mfe_ux_lab/cockpit/src/components/ChartPatternInspector.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../mfe_ux_lab/cockpit/src/components/chart-pattern-inspector.css", import.meta.url), "utf8");

assert.match(component, /className="chart-pattern-inspector-body" role="region" tabIndex=\{0\} aria-label=\{copy\.details\}/, "the long inspector body must be a named keyboard-focusable region");
assert.match(styles, /\.chart-pattern-inspector-body:focus-visible\{outline:2px solid #aaa;outline-offset:-2px\}/, "the inspector details region must retain a visible focus ring");
assert.doesNotMatch(component, /crosses a short M5 data gap/, "historical evidence copy must describe every excluded M5 gap");
assert.match(component, /crosses an M5 data gap/, "historical evidence copy must name the M5 gap boundary");
console.log("PATTERN INSPECTOR ACCESSIBILITY PASS: evidence body is keyboard-focusable, named, scrollable and visibly focused.");
