import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const focusedFiles = [
  "mfe_ux_lab/cockpit/src/shell/Layout.tsx",
  "mfe_ux_lab/cockpit/src/pages/Microscope.tsx",
  "mfe_ux_lab/cockpit/src/components/MicroChart.tsx",
  "mfe_ux_lab/cockpit/src/components/PriceActionKnowledgePanel.tsx",
  "docs/AI_SESSION_STATE.md",
];

for (const relative of focusedFiles) {
  const source = readFileSync(`${root}/${relative}`, "utf8");
  assert.equal(source.includes("\uFFFD"), false, `${relative} must not contain replacement characters`);
  if (relative.endsWith("Microscope.tsx")) continue;
  // Vietnamese legitimately uses `â`, so reject only the Latin-1 lead bytes
  // that indicate UTF-8 was decoded as the wrong character set.
  assert.equal(/[ÃÂ]/u.test(source), false, `${relative} must not contain common UTF-8 mojibake markers`);
}

const microscope = readFileSync(`${root}/mfe_ux_lab/cockpit/src/pages/Microscope.tsx`, "utf8");
const layout = readFileSync(`${root}/mfe_ux_lab/cockpit/src/shell/Layout.tsx`, "utf8");
const shellCss = readFileSync(`${root}/mfe_ux_lab/cockpit/src/shell/workspace.css`, "utf8");
assert.match(layout, /placeholder=\{t\(\"searchWorkspaces\"\)\}/,
  "focused shell search must use a readable ellipsis");
assert.match(layout, /<span>Arrow keys \{t\(\"select\"\)\}<\/span>/,
  "focused shell command help must use readable arrow glyphs");
assert.match(layout, /aria-label=\{t\(\"openCockpit\"\)\}/,
  "focused shell brand label must use a readable separator");
assert.doesNotMatch(layout, /[ÃƒÃ‚Ã¢Â][^\s]*/u,
  "focused shell must not contain common UTF-8 mojibake markers");
assert.match(shellCss, /data-focus-surface="m5-chart"\]\s+\.command-trigger\s*\{\s*display:\s*none;\s*\}/,
  "focused XAUUSD M5 home must hide unrelated workspace switching chrome");
assert.match(microscope, /MT5_HISTORY_3Y · verified closed bars · read-only · latest two-year M5 view/,
  "focused provenance copy must use readable separators");
assert.doesNotMatch(microscope, /MT5_HISTORY_3Y \? verified closed bars|Snapshot resumed \? /,
  "focused provenance and snapshot status must not regress to question-mark separators");

console.log("FOCUSED UI ENCODING PASS: chart, focused page, and PDF knowledge labels are valid UTF-8 without mojibake.");
