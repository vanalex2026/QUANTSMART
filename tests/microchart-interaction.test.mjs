import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const source = readFileSync(
  fileURLToPath(new URL("../mfe_ux_lab/cockpit/src/components/MicroChart.tsx", import.meta.url)),
  "utf8",
);

assert.match(source, /const pointerRect = useRef<DOMRect \| null>\(null\)/,
  "pointer gestures must keep a cached chart rect instead of forcing layout on every move");
assert.match(source, /pointerRect\.current = wrapRef\.current\?\.getBoundingClientRect\(\) \?\? null/,
  "drag start must take the one layout measurement used by the gesture");
assert.match(source, /const r = pointerRect\.current \?\? wrapRef\.current!\.getBoundingClientRect\(\)/,
  "pointer coordinates must use the cached rect during a drag");
assert.match(source, /pointerRect\.current = null;\s*if \(e\.currentTarget\.hasPointerCapture/,
  "pointer release must clear the cached rect after the gesture");

assert.match(source, /if \(event\.key === "Escape"\) \{/,
  "the chart canvas must handle Escape as a drawing-cancel shortcut");
assert.match(source, /cancelInteractiveGesture\(\);\s*setChartKeyStatus\("Active drawing cancelled\."\);/,
  "Escape must discard the draft and release every active pointer or pinch gesture");
assert.match(source, /Escape cancels an active drawing/,
  "keyboard help must explain how to cancel an active drawing");
assert.match(source, /const reset = \(\) => \{ setView\(\[Math\.max\(0, n - recentCount\), n - 1\]\); setChartKeyStatus\("Recent bars shown\."\); \};/,
  "the visible Reset action must announce the same recent-bars state as the keyboard Home shortcut");
assert.match(source, /const selectSignal = \(signal: SignalMarker, index: number\) => \{/,
  "mouse signal selection must update the chart's roving annotation state");
assert.match(source, /setAnnotationFocusIndex\(index\);\s*setChartKeyStatus\(annotationStatus\(index\)\);\s*annotationRefs\.current\[index\]\?\.focus\(\{ preventScroll: true \}\);\s*onSignalSelect\?\.\(signal\);/,
  "mouse signal selection must focus and announce the selected marker before notifying the parent");
assert.match(source, /onClick=\{\(\) => selectSignal\(s, annotationIndex\)\}/,
  "signal marker clicks must use the synchronized selection path");
assert.match(source, /visibleBrokerMarks\.map\([\s\S]*?pointerEvents=\"none\"/,
  "broker evidence overlays must not intercept pointer clicks intended for overlapping research markers");
assert.match(source, /lines\.map\([\s\S]*?pointerEvents=\"none\"/,
  "research landmark lines must remain visual-only so marker hit targets stay clickable");
assert.match(source, /const onChartDoubleClick = \(event: React\.MouseEvent<SVGSVGElement>\) => \{[\s\S]*if \(tool !== "cursor"\) return;[\s\S]*event\.preventDefault\(\);[\s\S]*reset\(\);/,
  "double-click reset must be available from the cursor tool without interrupting drawing tools");
assert.match(source, /if \(e\.shiftKey\) \{[\s\S]*const rawDelta = Math\.abs\(e\.deltaY\) >= Math\.abs\(e\.deltaX\) \? e\.deltaY : e\.deltaX;[\s\S]*setViewRef\.current\(\[nextStart, nextStart \+ w\]\);/,
  "Shift+wheel must horizontally navigate the retained tape while preserving the zoom width");
assert.match(source, /onKeyDown=\{onChartKeyDown\} onDoubleClick=\{onChartDoubleClick\}/,
  "the chart canvas must wire the double-click viewport reset");
assert.match(source, /double-click with Cursor resets the viewport/,
  "keyboard help must disclose the double-click viewport reset");
assert.match(source, /const onPointerCancel = \(\) => \{[\s\S]*drag\.current = null;[\s\S]*setTemp\(null\);[\s\S]*setChartKeyStatus\("Pointer gesture cancelled\."\);/,
  "pointer cancellation must discard an interrupted drawing gesture and announce it");
assert.match(source, /onPointerUp=\{onUp\} onPointerCancel=\{onPointerCancel\}/,
  "the chart canvas must wire pointer cancellation for interrupted touch gestures");
assert.match(source, /const setView = useCallback\(\(next: React\.SetStateAction<\[number, number\]>\) => \{[\s\S]*setHover\(\(prior\) => prior === null \? prior : null\);/,
  "external viewport jumps must clear a stale crosshair before rendering the new window");
assert.match(source, /const toggleDrawingsVisibility = \(\) => \{[\s\S]*setChartKeyStatus\(drawingVisibilityStatus\(locale, nextHidden\)\);[\s\S]*\};/,
  "drawing visibility changes must announce the new annotation state and authority boundary");
assert.match(source, /aria-label=\{hideDraws \? chartCopy\.showDrawings : chartCopy\.hideDrawings\}[\s\S]*onClick=\{toggleDrawingsVisibility\}/,
  "the visibility button must use the announcing localized toggle path");

console.log("MICROCHART INTERACTION PASS: Escape cancellation and mouse signal selection keep chart state synchronized.");
