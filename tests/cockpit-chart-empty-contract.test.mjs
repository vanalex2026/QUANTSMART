import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../mfe_ux_lab/cockpit/src/components/MicroChart.tsx", import.meta.url), "utf8");
assert.match(source, /No closed-bar data available for \$\{symbol\} \$\{tf\}/, "empty focused tapes must be labelled as no data");
assert.match(source, /Need at least two closed bars for \$\{symbol\} \$\{tf\}/, "one-bar focused tapes must explain the minimum closed-bar requirement");
console.log("FOCUSED CHART EMPTY CONTRACT PASS: no-data and insufficient-bar states are explicit.");
