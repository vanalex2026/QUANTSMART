import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url), "utf8");
assert.match(source, /const currentNamedPatternGroupLabel = locale === "vi"/);
assert.match(source, /aria-label=\{currentNamedPatternGroupLabel\}/);
assert.match(source, /aria-label=\{`\$\{currentNamedPatternFilterLabel\}: \$\{pattern\}`\}/);
assert.match(source, /const patternFilterLabel = locale === "vi"/);
assert.match(source, /const familyFilterLabel = locale === "vi"/);
assert.match(source, /const showAllLabel = locale === "vi"/);
assert.match(source, /aria-label=\{showAllAriaLabel\}/);
assert.match(source, /\{showAllLabel\}<\/button>/);
assert.match(source, /focusedCopy\.currentNamedCandleUnavailable/);
assert.doesNotMatch(source, /currentNamedPatterns\.join\(" Â· "\)/);
console.log("FOCUSED NAMED-CANDLE LOCALE PASS: current and analogue filters expose localized labels, empty states, and accessible names.");
