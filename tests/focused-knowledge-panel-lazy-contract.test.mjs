import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";

const root = resolve(process.cwd(), "mfe_ux_lab", "cockpit", "src");
const require = createRequire(resolve(root, "../package.json"));
const ts = require("typescript");
const { build } = require("esbuild");
function staticGraph(entries, { runtimeOnly = false } = {}) {
  const seen = new Set();
  function visit(file) {
    if (seen.has(file)) return;
    assert.ok(existsSync(file), `dependency must resolve: ${file}`);
    seen.add(file);
    const source = readFileSync(file, "utf8");
    const specs = file.endsWith(".css")
      ? [...source.matchAll(/@import\s+["']([^"']+)/g)].map((m) => m[1])
      : [...ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true).statements]
        .filter((statement) => (ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) && statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier))
        .filter((statement) => !runtimeOnly || !(statement.isTypeOnly || statement.importClause?.isTypeOnly))
        .map((statement) => statement.moduleSpecifier.text);
    for (const spec of specs) if (spec.startsWith(".")) {
      let next = resolve(dirname(file), spec);
      if (!existsSync(next)) for (const ext of [".ts", ".tsx", ".css", ".json"]) if (existsSync(next + ext)) { next += ext; break; }
      visit(next);
    }
  }
  entries.forEach(visit);
  return seen;
}

const focused = staticGraph([resolve(root, "main.tsx"), resolve(root, "pages/Microscope.tsx")]);
assert.equal(focused.has(resolve(root, "components/PriceActionKnowledgePanel.tsx")), false,
  "the full knowledge panel must stay behind the chart-context lazy boundary");
assert.equal(focused.has(resolve(root, "components/price-action-knowledge-panel.css")), false,
  "knowledge panel CSS must stay out of chart-only startup");
assert.equal(focused.has(resolve(root, "../../../docs/price_action_page_index.json")), false,
  "the 176 KB page index must not enter focused startup");
assert.equal(focused.has(resolve(root, "../../../docs/price_action_knowledge_map.json")), false,
  "the full source map must not enter focused startup");
assert.equal(focused.has(resolve(root, "components/ReviewedSourceNotes.tsx")), true,
  "the small expansion/error boundary stays available with the chart inspector");
assert.equal(focused.has(resolve(root, "components/ChartPatternSourceNotes.tsx")), false,
  "reviewed source prose must stay behind its own expansion boundary");
const timelineFile = resolve(root, "lib/patternSetupTimeline.ts");
assert.equal(focused.has(timelineFile), true, "the small selected-setup receipt remains available with the chart inspector");
assert.deepEqual([...staticGraph([timelineFile], { runtimeOnly: true })], [timelineFile],
  "the selected-setup timeline must have no runtime detector, source-map or page-index dependencies");
const levelsFile = resolve(root, "lib/patternInspectionLevels.ts");
assert.equal(focused.has(levelsFile), true, "the bounded price-rail helper stays available in the focused inspector");
assert.deepEqual([...staticGraph([levelsFile], { runtimeOnly: true })], [levelsFile],
  "price-level descriptions must not import React, detector or full retained-tape study dependencies");
// Verify emitted runtime dependencies too: type-only view/setup references may
// point into larger graphs, but must disappear from the actual helper bundle.
const levelsBundle = await build({ entryPoints: [levelsFile], bundle: true, write: false, metafile: true,
  platform: "browser", format: "esm", logLevel: "silent" });
assert.deepEqual(Object.keys(levelsBundle.metafile.inputs).map(file => resolve(file)), [levelsFile],
  "the actual price-rail runtime graph must contain only its pure bounded helper");
assert.deepEqual(Object.values(levelsBundle.metafile.outputs).flatMap(output => output.imports), [],
  "the price-rail helper must have no external runtime dependencies either");
const sourceNotes = staticGraph([resolve(root, "components/ChartPatternSourceNotes.tsx")]);
assert.equal(sourceNotes.has(resolve(root, "../../../docs/price_action_knowledge_map.json")), true,
  "expanded source notes retain the full reviewed source map");
for (const excluded of ["../../../docs/price_action_page_index.json", "lib/priceActionDetector.ts", "lib/priceActionScan.ts", "components/PriceActionKnowledgePanel.tsx"]) {
  assert.equal(sourceNotes.has(resolve(root, excluded)), false,
    `expanding source notes must not fetch unrelated page-index/panel/detector dependencies: ${excluded}`);
}
const microscope = readFileSync(resolve(root, "pages/Microscope.tsx"), "utf8");
assert.match(microscope, /const PriceActionKnowledgePanel = lazy\(\(\) => import\("\.\.\/components\/PriceActionKnowledgePanel\.tsx"\)/);
assert.match(microscope, /focused && !chartOnly && <Suspense fallback=\{<div role="status"[\s\S]*<PriceActionKnowledgePanel/,
  "context panel must mount only when focused chart-only mode is disabled");
const lookup = readFileSync(resolve(root, "lib/priceActionKnowledgeLookup.ts"), "utf8");
assert.doesNotMatch(lookup, /price_action_knowledge_map\.json/,
  "compact chart lookup must not import the full source map JSON");
assert.match(lookup, /PRICE_ACTION_KNOWLEDGE_PROVENANCE/);
const compactMatch = lookup.match(/^const source = (\{.*\}) as \{/m);
assert.ok(compactMatch, "compact source data must be inspectable for parity");
const compact = JSON.parse(compactMatch[1]);
const full = JSON.parse(readFileSync(resolve(root, "../../../docs/price_action_knowledge_map.json"), "utf8"));
assert.deepEqual(compact.concepts, full.concepts, "compact lookup must carry exact source concept labels and pages");
assert.deepEqual(compact.provenance, {
  schema: full.schema,
  sourceSha256: full.source.sha256,
  sourceTitle: full.source.title,
  pdfPages: full.source.pdf_pages,
}, "chart snapshot attestation must match the full source map");
console.log("FOCUSED KNOWLEDGE PANEL LAZY PASS: chart startup excludes source prose/map/page index; expanded source notes own the map without the index, panel or detector graph.");
