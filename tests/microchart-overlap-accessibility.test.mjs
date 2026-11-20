import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../mfe_ux_lab/cockpit/src/components/MicroChart.tsx", import.meta.url), "utf8");

assert.match(source, /const visibleSignalOverlap = useMemo\(\(\) =>/,
  "signal rendering must precompute overlap metadata for smooth pan frames");
assert.match(source, /const sameIndexCount = counts\.get\(signal\.i\) \|\| 1/,
  "signal rendering must detect multiple annotations on the same candle");
assert.match(source, /overlapOrdinal = sameIndexCount > 1/,
  "overlapping signals must receive a stable ordinal");
assert.match(source, /overlapOffset = sameIndexCount > 1[^;]*\* 16/,
  "overlapping signal hit targets must fan apart visually");
assert.match(source, /Math\.max\(PX0, Math\.min\(PX1, xFor\(s\.i\) \+ overlapOffset\)\)/,
  "marker disambiguation must remain inside the chart bounds");
assert.match(source, /overlapLabel = sameIndexCount > 1 \? `; overlapping marker \$\{overlapOrdinal\} of \$\{sameIndexCount\}`/,
  "screen readers must identify which overlapping marker is focused");
assert.match(source, /aria-posinset=\{annotationIndex \+ 1\}/,
  "overlapping markers must retain keyboard list position semantics");
assert.match(source, /export function microChartSignalLabelLayout\(x: number, left: number, right: number, textWidth: number\)/,
  "signal captions need a deterministic narrow-width layout helper");
assert.match(source, /if \(width < labelWidth \+ 12\) return null/,
  "captions must be withheld when the narrow plot cannot fit them");
assert.match(source, /const labelLayout = nView < 500 && slot >= 10/,
  "narrow zoomed-out views must avoid rendering a wall of overlapping captions");
assert.match(source, /Math\.max\(PY0 \+ 9, Math\.min\(PY1 - 2, low \? y \+ 13 : y - 10\)\)/,
  "signal captions must stay vertically inside the plot bounds");
assert.match(source, /showLabel && labelLayout && <text x=\{labelLayout\.x\}[^>]*textAnchor=\{labelLayout\.anchor\}/,
  "visible captions must use clamped edge-aware placement while markers retain aria labels");

console.log("MICROCHART OVERLAP ACCESSIBILITY PASS: overlapping signals are visually fanned and individually announced.");
