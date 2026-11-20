import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const source = readFileSync(
  fileURLToPath(new URL("../mfe_ux_lab/cockpit/src/components/MicroChart.tsx", import.meta.url)),
  "utf8",
);

assert.match(source, /const DRAWING_HISTORY_LIMIT = 100/, "drawing edit history must have an explicit bound");
assert.match(source, /useState<Draw\[\]\[\]>\(\[\]\)/, "undo and redo stacks must be session state");
assert.match(source, /setUndoStack\(\(existing\) => \[\.\.\.existing, draws\]\.slice\(-DRAWING_HISTORY_LIMIT\)\)/, "new edits must push a bounded prior snapshot");
assert.match(source, /setRedoStack\(\[\]\)/, "a new edit must invalidate the redo branch");
assert.match(source, /const undoDrawing = useCallback/, "undo must be an explicit command");
assert.match(source, /const redoDrawing = useCallback/, "redo must be an explicit command");
assert.match(source, /if \(lock\) \{ setChartKeyStatus\("Drawings are locked; unlock to undo\."\)/, "undo must respect the drawing lock");
assert.match(source, /if \(lock\) \{ setChartKeyStatus\("Drawings are locked; unlock to redo\."\)/, "redo must respect the drawing lock");
assert.match(source, /event\.key\.toLowerCase\(\) === "z"/, "chart keyboard handler must recognize Ctrl/Cmd+Z");
assert.match(source, /if \(event\.shiftKey\) redoDrawing\(\); else undoDrawing\(\);/, "Shift+Z must select redo");
assert.match(source, /event\.key\.toLowerCase\(\) === "y"/, "Ctrl/Cmd+Y must also redo");
assert.match(source, /aria-label=\{chartCopy\.undo\} aria-keyshortcuts="Control\+Z"/, "undo must be an accessible localized toolbar control");
assert.match(source, /aria-label=\{chartCopy\.redo\} aria-keyshortcuts="Control\+Shift\+Z"/, "redo must be an accessible localized toolbar control");
assert.match(source, /setUndoStack\(\[\]\);\s*setRedoStack\(\[\]\);\s*setHydratedDrawingKey/, "switching symbol or timeframe must reset session history");
assert.match(source, /Undo history is intentionally session-scoped/, "persisted behavior must explain that history resets after reload");
assert.match(source, /existing\.map\(\(snapshot\) => reanchorDrawings\(snapshot, bars\)\)/, "history snapshots must follow timestamp reanchoring");
assert.match(source, /disabled=\{lock \|\| undoStack\.length === 0\}/, "undo control must disable while locked or empty");
assert.match(source, /disabled=\{lock \|\| redoStack\.length === 0\}/, "redo control must disable while locked or empty");
console.log("MICROCHART DRAWING HISTORY PASS: bounded lock-safe undo/redo with accessible controls and explicit persistence semantics.");
