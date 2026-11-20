import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(new URL('../mfe_ux_lab/cockpit/package.json', import.meta.url));
const ts = require('typescript');
const path = require('node:path');
const fs = require('node:fs');

// The regex assertions below protect the readable contract. This small graph
// walk also proves that a future refactor cannot accidentally reintroduce the
// legacy research engine through an eager transitive import on the focused
// page. Dynamic imports are intentionally ignored: those are the lazy route
// boundary this contract is checking.
const appRoot = fileURLToPath(new URL('../mfe_ux_lab/cockpit/src/', import.meta.url));
function focusedRuntimeGraph(entries) {
  const seen = new Set();
  const resolveImport = (from, spec) => {
    if (!spec.startsWith('.')) return null;
    let candidate = path.resolve(path.dirname(from), spec);
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
    for (const ext of ['.ts', '.tsx', '.css', '.json']) if (fs.existsSync(candidate + ext)) return candidate + ext;
    return null;
  };
  const visit = (file) => {
    if (!file || seen.has(file)) return;
    seen.add(file);
    if (!file.endsWith('.ts') && !file.endsWith('.tsx')) return;
    const ast = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    for (const statement of ast.statements) {
      if (!ts.isImportDeclaration(statement) || !statement.moduleSpecifier || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
      if (statement.importClause?.isTypeOnly) continue;
      visit(resolveImport(file, statement.moduleSpecifier.text));
    }
  };
  entries.forEach((entry) => visit(path.resolve(appRoot, entry)));
  return seen;
}

const microscope = readFileSync(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url), "utf8");
const controller = readFileSync(new URL("../mfe_ux_lab/cockpit/src/components/LegacyResearchJobsController.tsx", import.meta.url), "utf8");

assert.doesNotMatch(microscope, /^import .*researchJobs\.ts/m, "focused Microscope must not statically import the legacy research job module");
const focusedGraph = focusedRuntimeGraph(['main.tsx', 'pages/Microscope.tsx']);
assert.equal(focusedGraph.has(path.resolve(appRoot, 'lib/researchJobs.ts')), false,
  'focused runtime graph must exclude researchJobs transitively');
assert.equal(focusedGraph.has(path.resolve(appRoot, 'components/LegacyResearchJobsController.tsx')), false,
  'focused runtime graph must exclude the lazy legacy controller');
assert.match(microscope, /lazy\(\(\) => import\("\.\.\/components\/LegacyResearchJobsController\.tsx"\)/, "legacy research hooks must be behind a lazy controller");
assert.match(microscope, /!focused && <Suspense fallback=\{null\}><LegacyResearchJobsController/, "focused chart must never mount the legacy research controller");
assert.match(microscope, /legacyResearchState\?\.inputs === legacyResearchInputs/, "stale legacy results must be hidden when input identity changes");
assert.match(controller, /useResearchBacktest\(primaryBars/);
assert.match(controller, /useResearchBacktest\(compareBars/);
assert.match(controller, /return null/);
// Run the real component body with deterministic hook stand-ins. Verify the
// legacy request arguments survived the split, and only a plain snapshot is
// published after render instead of calling the parent's setter during render.
const executable = ts.transpileModule(controller.replace(/^import .*;\r?\n/gm, ''), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
const calls = [], effects = [], published = [];
const hookResults = [{ result: { id: 'primary' }, error: null, pending: false }, { result: null, error: 'compare error', pending: false }];
const exports = {};
new Function('exports', 'useEffect', 'useResearchBacktest', executable)(exports, callback => effects.push(callback), (...args) => { calls.push(args); return hookResults[calls.length - 1]; });
const props = {
  primaryBars: [{ t: 'primary' }], primaryCard: { id: 'A' }, compareBars: [{ t: 'compare' }], compareCard: { id: 'B' },
  options: { symbol: 'XAUUSD' }, primaryMode: 'm1', primaryHistorical: true, source: 'Replay', primaryStage: 'M6',
  csvReference: { id: 'import', windowTf: 'H1' }, compareStage: 'Y10', onState: state => published.push(state),
};
assert.equal(exports.LegacyResearchJobsController(props), null);
assert.equal(published.length, 0, 'parent state must not be changed during child render');
assert.deepEqual(calls[0], [props.primaryBars, props.primaryCard, props.options, 'm1', true, 'Replay', 'M6', props.csvReference, true]);
assert.deepEqual(calls[1], [props.compareBars, props.compareCard, props.options, 'design', true, 'Replay', 'Y10', undefined, true]);
effects[0]();
assert.deepEqual(published, [{ primary: hookResults[0], compare: hookResults[1] }]);
const gate = microscope.match(/const legacyResearchJobs = ([^;]+);/)[1];
const select = new Function('focused', 'legacyResearchState', 'legacyResearchInputs', 'EMPTY_LEGACY_RESEARCH_JOBS', `return ${gate}`);
const oldInputs = {}, newInputs = {}, empty = {};
assert.equal(select(false, { inputs: oldInputs, jobs: published[0] }, oldInputs, empty), published[0]);
assert.equal(select(false, { inputs: oldInputs, jobs: published[0] }, newInputs, empty), empty, 'changed tape/Card/options hide the old result immediately');
assert.equal(select(true, { inputs: oldInputs, jobs: published[0] }, oldInputs, empty), empty, 'focused chart never exposes legacy results');
console.log("FOCUSED RESEARCH JOBS LAZY PASS: chart-only startup excludes researchJobs and legacy results are identity-gated.");
