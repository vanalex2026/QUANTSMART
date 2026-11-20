import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const boundary = readFileSync(new URL("../mfe_ux_lab/cockpit/src/shell/WorkspaceErrorBoundary.tsx", import.meta.url), "utf8");
const gate = readFileSync(new URL("../mfe_ux_lab/cockpit/src/shell/WorkspaceGate.tsx", import.meta.url), "utf8");
const app = readFileSync(new URL("../mfe_ux_lab/cockpit/src/App.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../mfe_ux_lab/cockpit/src/shell/workspace.css", import.meta.url), "utf8");

assert.match(app, /<WorkspaceErrorBoundary key=\{page\} routeLabel=\{workspaceFor\(page\)\?\.label\}/,
  "route errors must identify the workspace that failed");
assert.match(boundary, /data-error-state="render-failed"/);
assert.match(boundary, /FAIL-CLOSED/);
assert.match(boundary, /Saved workspace data was left untouched/);
assert.match(boundary, /Open focused chart/);
assert.match(boundary, /window\.location\.hash = "#home"/);
assert.match(boundary, /replace\(\/\\s\+\/g, " "\)/,
  "render diagnostics must be whitespace-normalized before display");
assert.match(boundary, /slice\(0, 240\)/,
  "render diagnostics must remain bounded");
assert.match(gate, /data-error-state="service-unavailable"/);
assert.match(gate, /Retry connection/);
assert.match(gate, /import "\.\/workspace\.css"/,
  "the pre-shell gate must style its own fail-closed state");
assert.match(css, /\.workspace-service-shell/);
assert.match(css, /\.workspace-error-card/);
assert.match(css, /\.workspace-error-actions/);
console.log("WORKSPACE ERROR BOUNDARY PASS: route-aware fail-closed recovery and styled service errors are explicit.");
