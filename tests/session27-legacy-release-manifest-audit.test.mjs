import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const manifestPath = resolve(root, "RELEASE_MANIFEST.json");
const releaseScriptPath = resolve(root, "scripts/package-release.mjs");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const releaseScript = readFileSync(releaseScriptPath, "utf8");

const expectedHistoricalStalePaths = [
  "mfe_ux_lab/cockpit/src/components/BeastArenaPanel.tsx",
  "mfe_ux_lab/cockpit/src/components/BeastBuilderPanel.tsx",
  "mfe_ux_lab/cockpit/src/components/BeastDeckBoard.tsx",
  "mfe_ux_lab/cockpit/src/components/CockpitChart.tsx",
  "mfe_ux_lab/cockpit/src/components/CockpitTelemetry.tsx",
  "mfe_ux_lab/cockpit/src/lib/cardEvidence.ts",
  "mfe_ux_lab/cockpit/src/lib/cardLiveSignal.ts",
  "mfe_ux_lab/cockpit/src/pages/Analysis.tsx",
  "mfe_ux_lab/cockpit/src/pages/BeastLab.tsx",
  "mfe_ux_lab/cockpit/src/pages/EntryDanger.tsx",
  "mfe_ux_lab/cockpit/src/pages/KidiEvents.tsx",
  "mfe_ux_lab/cockpit/src/pages/Playbook.tsx",
  "mfe_ux_lab/cockpit/src/pages/ResearchCockpit.tsx",
  "mfe_ux_lab/cockpit/src/pages/StrategyRanking.tsx",
  "mfe_ux_lab/cockpit/src/pages/WeeklyAudit.tsx",
  "mfe_ux_lab/cockpit/src/pages/quant-cockpit.css",
  "mfe_ux_lab/cockpit/src/shell/FirstRun.tsx",
  "mfe_ux_lab/cockpit/src/shell/first-run.css",
  "mfe_ux_lab/cockpit/tools/test-cockpit-instruments.mjs",
  "tests/first-run.test.mjs",
].sort();

const stalePaths = manifest.files
  .map((entry) => entry.path)
  .filter((relative) => !existsSync(resolve(root, relative)))
  .sort();

assert.deepEqual(
  stalePaths,
  expectedHistoricalStalePaths,
  "the historical manifest may contain only the audited retired paths",
);
assert.match(
  releaseScript,
  /for\(const page of \['home','microscope','strategy-lab','strategy-canvas','blocks-modules','formula-lab','assets','hidden-coefficients','debugger','help'\]/,
  "fresh releases must enumerate the supported route screenshot set",
);
for (const retired of expectedHistoricalStalePaths) {
  assert.doesNotMatch(
    releaseScript,
    new RegExp(retired.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    `${retired} must not become a fresh release root`,
  );
}
assert.match(releaseScript, /generated manifest is the authority/i);
assert.match(releaseScript, /const top=\[/);
assert.match(releaseScript, /for\(const file of top\)add\(file\);/);

const status = readFileSync(resolve(root, "docs/PROJECT_STATUS.md"), "utf8");
const state = readFileSync(resolve(root, "docs/AI_SESSION_STATE.md"), "utf8");
const gaps = readFileSync(resolve(root, "docs/PRICE_ACTION_IMPLEMENTATION_GAPS.md"), "utf8");
for (const document of [status, state, gaps]) {
  assert.match(document, /Session 27 legacy release-manifest reachability audit/);
  assert.match(document, /session27-legacy-release-manifest-audit\.json/);
  assert.match(document, /`RELEASE_MANIFEST\.json`/);
  assert.match(document, /scripts\/package-release\.mjs/);
}

console.log("SESSION 27 LEGACY RELEASE-MANIFEST AUDIT PASS: stale historical entries are bounded; fresh release roots come from the current graph.");
