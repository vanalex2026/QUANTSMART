import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const evidence = readFileSync(new URL("../mfe_ux_lab/cockpit/src/components/PatternBarrierEvidence.tsx", import.meta.url), "utf8");
const inspector = readFileSync(new URL("../mfe_ux_lab/cockpit/src/components/ChartPatternInspector.tsx", import.meta.url), "utf8");
assert.match(evidence, /measurePatternTechnicalObstacleOutcomes/);
assert.match(evidence, /TECHNICAL_SETUP_KINDS/);
assert.match(evidence, /Technical protection \/ obstacle study/);
assert.match(evidence, /Only resolved first touches enter the rate denominator/);
assert.match(evidence, /SHADOW_ONLY \/ NO_DECISION/);
assert.match(inspector, /<PatternBarrierEvidence[\s\S]*setup=\{signal\.pdfSetup\}/);
console.log("PATTERN TECHNICAL OBSTACLE UI PASS: separate source-grounded section, setup-family scope, denominator and authority copy are wired into the inspector.");