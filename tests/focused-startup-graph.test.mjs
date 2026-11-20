import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const appPath = fileURLToPath(new URL("../mfe_ux_lab/cockpit/src/App.tsx", import.meta.url));
const source = readFileSync(appPath, "utf8");
const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const ts = require("typescript");
const ast = ts.createSourceFile(appPath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

const eagerRouteImports = ast.statements
  .filter((statement) => ts.isImportDeclaration(statement) && statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier))
  .map((statement) => statement.moduleSpecifier.text)
  .filter((specifier) => /^\.\/(?:pages|components)\//.test(specifier));
assert.deepEqual(eagerRouteImports, [], "App must keep page and route components behind lazy imports");

const lazyTargets = [...source.matchAll(/const\s+(\w+)\s*=\s*lazy\(\(\)\s*=>\s*import\("([^"]+)"\)/g)]
  .map((match) => ({ name: match[1], target: match[2] }));
const renderedRoutes = [...source.matchAll(/page\s*===\s*"([^"]+)"\s*&&\s*<([A-Za-z0-9_]+)/g)];
assert.ok(renderedRoutes.length > 0, "App must render the registered route surface");
for (const match of renderedRoutes) {
  const [, page, component] = match;
  assert.ok(lazyTargets.some((target) => target.name === component), `${page} route must use a lazy component binding`);
}
assert.deepEqual(new Set(lazyTargets.map((target) => target.name)), new Set(renderedRoutes.map((match) => match[2])),
  "every lazy route binding must still have a rendered route after retirement");
assert.match(source, /page\s*===\s*"home"\s*&&\s*<Microscope\s+focused\s*\/>/);
assert.doesNotMatch(source, /PatternAtlas|ResearchCockpit|CockpitChart|KidiEvents|EntryDanger|WeeklyAudit/);
console.log("FOCUSED STARTUP GRAPH PASS: App route modules stay lazy and the focused home remains the chart boundary.");
