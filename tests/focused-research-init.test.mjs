import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const microscope = readFileSync(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url), "utf8");
const jobs = readFileSync(new URL("../mfe_ux_lab/cockpit/src/lib/researchJobs.ts", import.meta.url), "utf8");
const liveQuery = readFileSync(new URL("../mfe_ux_lab/cockpit/src/lib/liveWorkspaceQuery.ts", import.meta.url), "utf8");
const terminal = readFileSync(new URL("../mfe_ux_lab/cockpit/src/lib/mt5Connection.ts", import.meta.url), "utf8");

assert.doesNotMatch(microscope, /^import .*researchJobs\.ts/m,
  "focused home must not statically import the legacy backtest hooks");
assert.match(microscope, /!focused && <Suspense fallback=\{null\}><LegacyResearchJobsController/,
  "focused home must not mount the legacy backtest controller");
assert.doesNotMatch(microscope, /import\(["']\.\.\/adapters\/loadCotrade\.ts["']\)/,
  "Microscope must not initialize the dead co-trade adapter; the rendered advice comes from the live workspace query");
assert.doesNotMatch(microscope, /\b(?:simAdv|setSimAdv|setMissing)\b/,
  "Microscope must not retain unreachable co-trade state that cannot affect the rendered advice");
assert.match(jobs, /enabled = true/,
  "legacy callers must remain enabled by default");
assert.match(jobs, /if \(!enabled \|\| !card \|\| !bars \|\| bars\.length <= 60\) return \"\";/,
  "disabled/idle hooks must avoid reading legacy research storage");
assert.match(jobs, /if \(!enabled \|\| !card \|\| !bars \|\| bars\.length <= 60\) return null;/,
  "disabled/idle hooks must avoid creating research requests");
assert.match(liveQuery, /useTerminalGeneration\(enabled\)/,
  "disabled focused live query must not subscribe to terminal-generation invalidations");
assert.match(terminal, /export function useTerminalGeneration\(enabled = true\)/,
  "terminal-generation hook must preserve enabled-by-default legacy callers");
assert.match(terminal, /enabled \? subscribe : noopSubscribe/,
  "disabled terminal-generation consumers must use a no-op subscription");
console.log("FOCUSED RESEARCH INIT CONTRACT PASS: home skips legacy backtest initialization while microscope callers retain defaults.");
