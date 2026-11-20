import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const source = readFileSync(
  fileURLToPath(new URL("../mfe_ux_lab/cockpit/src/components/MicroChart.tsx", import.meta.url)),
  "utf8",
) + "\n" + readFileSync(
  fileURLToPath(new URL("../mfe_ux_lab/cockpit/src/lib/microChartDrawingAnchors.ts", import.meta.url)),
  "utf8",
);

assert.match(source, /mfe_chart_drawings_v1_\$\{symbol\}_\$\{tf\}/,
  "drawings must be namespaced by symbol and timeframe");
assert.match(source, /const DRAWING_LIMIT = 200/,
  "drawing persistence must keep a bounded retention limit");
assert.match(source, /const BRUSH_POINT_LIMIT = 10_000/,
  "freehand drawing payloads must have a point bound before rendering");
assert.match(source, /function readSavedDraw\(value: unknown\): Draw \| null/,
  "persisted drawing records must be parsed through a fail-closed validator");
assert.match(source, /typeof draw\.color !== "string" \|\| draw\.color\.length > 160/,
  "persisted drawing colors must be bounded before localStorage hydration");
assert.match(source, /!Array\.isArray\(draw\.pts\) \|\| !draw\.pts\.every\(isPoint\)/,
  "malformed freehand point arrays must be discarded instead of crashing re-anchor logic");
assert.match(source, /const appendDrawing = useCallback\(\(draw: Draw\) => setDraws\(\(existing\) => \[\.\.\.existing, draw\]\.slice\(-DRAWING_LIMIT\)\), \[\]\)/,
  "interactive additions must enforce the drawing bound in React state");
assert.match(source, /setDraws\(readSavedDrawings\(drawingStorageKey\)\); setHydratedDrawingKey\(drawingStorageKey\)/,
  "changing symbol or timeframe must hydrate the matching saved drawing set");
assert.match(source, /if \(hydratedDrawingKey !== drawingStorageKey\) return;/,
  "persistence must wait for matching-key hydration to avoid cross-symbol overwrites");
assert.match(source, /const bounded = draws\.slice\(-DRAWING_LIMIT\)[\s\S]*localStorage\.setItem\(drawingStorageKey, JSON\.stringify\(bounded\)\)/,
  "saved drawings must remain bounded at serialization time");
assert.match(source, /if \(lock && tool !== "cursor"\) \{ drag\.current = null; return; \}/,
  "locked drawings must reject new drawing gestures while preserving cursor pan");
assert.match(source, /interface MicroChartPoint \{ i: number; p: number; \/\*\* Closed-bar UTC identity/,
  "drawings must retain a closed-bar timestamp identity for tape re-anchoring");
assert.match(source, /Re-anchor persisted drawings when the retained tape is refreshed/,
  "drawing hydration must re-anchor persisted points when retained history shifts");
assert.match(source, /t: bars\[i\]\?\.t/,
  "new drawing points must capture the originating closed-bar timestamp");
assert.match(source, /const fp0 = \{ i, p: priceAt\(y\), t: bars\[i\]\?\.t \}/,
  "freehand drawing starts must use an integer closed-bar anchor so strokes survive hydration");
assert.match(source, /const np = \{ i, p: priceAt\(y\), t: bars\[i\]\?\.t \}/,
  "freehand drawing points must use integer closed-bar anchors after a two-year tape refresh");
assert.doesNotMatch(source, /const (?:fp0|np) = \{ i: barF\(x\)/,
  "freehand persistence must not serialize fractional render coordinates as candle indices");
assert.match(source, /reanchorMicroChartDrawings/,
  "drawing re-anchoring must use the binary-search retained-tape helper");
assert.match(source, /function isSafeDrawingTimestamp\(value: string\): boolean/,
  "timestamped drawing anchors must use a strict timezone-bearing safety check");
assert.match(source, /pointInstant > latestInstant/,
  "drawing re-anchoring must discard anchors newer than the retained closed-bar tape");
assert.match(source, /typeof point\.i === "number" && Number\.isInteger\(point\.i\) && point\.i >= 0/,
  "drawing anchors must reject negative or fractional candle indices");
assert.match(source, /\[drawingsRestore\?\.nonce, hydratedDrawingKey, drawingStorageKey, bars\]/,
  "snapshot drawing restores must retry against the current retained bars");
assert.match(source, /const clearDrawings = \(\) => \{ if \(lock\) return; setDraws\(\[\]\); setChartKeyStatus\("All drawings cleared\."\); \};/,
  "clearing drawings must announce the destructive visual-layer change");
console.log("MICROCHART DRAWING PERSISTENCE PASS: namespaced hydration and bounded writes preserve interactive annotations.");
