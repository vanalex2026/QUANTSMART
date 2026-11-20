import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../mfe_ux_lab/cockpit/src/", import.meta.url));
const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const ts = require("typescript");

function resolveImport(from, specifier) {
  if (!specifier.startsWith(".")) return null;
  const candidate = path.resolve(path.dirname(from), specifier);
  if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  for (const extension of [".ts", ".tsx", ".css", ".json"]) {
    if (fs.existsSync(candidate + extension)) return candidate + extension;
  }
  return null;
}

function eagerGraph(entries) {
  const seen = new Set();
  const pending = entries.map((entry) => path.resolve(root, entry));
  while (pending.length) {
    const file = pending.pop();
    if (!file || seen.has(file) || !fs.existsSync(file)) continue;
    seen.add(file);
    if (!/\.(ts|tsx)$/.test(file)) continue;
    const ast = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
    for (const statement of ast.statements) {
      if (!ts.isImportDeclaration(statement) || !statement.moduleSpecifier || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
      if (statement.importClause?.isTypeOnly) continue;
      const imported = resolveImport(file, statement.moduleSpecifier.text);
      if (imported) pending.push(imported);
    }
  }
  return new Set([...seen].map((file) => path.relative(root, file).replaceAll("\\", "/")));
}

const graph = eagerGraph(["main.tsx"]);
for (const excluded of [
  "pages/Microscope.tsx",
  "pages/StrategyLab.tsx",
  "pages/StrategyCanvas.tsx",
  "components/PriceActionKnowledgePanel.tsx",
  "components/LegacyResearchJobsController.tsx",
  "lib/researchJobs.ts",
  "lib/priceActionKnowledge.ts",
  "adapters/loadSimOhlc.ts",
]) {
  assert.equal(graph.has(excluded), false, `focused eager graph must exclude ${excluded}`);
}

const app = fs.readFileSync(path.resolve(root, "App.tsx"), "utf8");
const lazyNames = [...app.matchAll(/const\s+(\w+)\s*=\s*lazy\(\(\)\s*=>\s*import\("([^"]+)"\)/g)].map((match) => match[1]);
const renderedNames = [...app.matchAll(/page\s*===\s*"[^"]+"\s*&&\s*<([A-Za-z0-9_]+)/g)].map((match) => match[1]);
assert.ok(lazyNames.length >= 8, "App must retain the registered lazy route surface");
assert.deepEqual(new Set(renderedNames), new Set(lazyNames), "every rendered route must have one lazy binding");
assert.match(app, /page\s*===\s*"home"\s*&&\s*<Microscope\s+focused\s*\/>/);

const microscope = fs.readFileSync(path.resolve(root, "pages/Microscope.tsx"), "utf8");
assert.doesNotMatch(microscope, /^import .*\bresearchJobs\.ts/m);
assert.match(microscope, /lazy\(\(\) => import\("\.\.\/components\/PriceActionKnowledgePanel\.tsx"\)/);
assert.match(microscope, /!focused && <Suspense fallback=\{null\}><LegacyResearchJobsController/);

console.log("SESSION 19 RUNTIME STARTUP AUDIT PASS: focused eager graph stays chart-shell only and route/legacy boundaries remain lazy.");
