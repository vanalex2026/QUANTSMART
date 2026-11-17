import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";

const root = resolve(process.cwd(), "mfe_ux_lab", "cockpit", "src");
const require = createRequire(resolve(root, "../package.json"));
const ts = require("typescript");
// Follow actual static imports from the eager shell and the lazy home entry.
// Dynamic route imports stay outside this closure, as they do at startup.
function staticGraph(entries) {
  const seen = new Set();
  function visit(file) {
    if (seen.has(file)) return;
    assert.ok(existsSync(file), `static dependency must resolve: ${file}`);
    seen.add(file);
    const text = readFileSync(file, "utf8");
    const specs = [];
    if (file.endsWith(".css")) {
      for (const match of text.matchAll(/@import\s+["']([^"']+)["']/g)) specs.push(match[1]);
    } else {
      const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
      for (const statement of source.statements) {
        if ((ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) && statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)) specs.push(statement.moduleSpecifier.text);
      }
    }
    for (const spec of specs) if (spec.startsWith(".")) visit(resolve(dirname(file), spec));
  }
  entries.forEach(visit);
  return seen;
}
const focusedGraph = staticGraph([resolve(root, "main.tsx"), resolve(root, "pages/Microscope.tsx")]);
assert.equal(focusedGraph.has(resolve(root, "shell/guide.css")), false,
  "neither the eager shell nor focused home static graph may include guide styles");
assert.equal(staticGraph([resolve(root, "pages/HelpManual.tsx")]).has(resolve(root, "shell/guide.css")), true,
  "opening Guide must still load its stylesheet");
assert.equal(focusedGraph.has(resolve(root, "owner.css")), false,
  "focused home startup must exclude legacy forensic chrome");
for (const page of ["StrategyLab.tsx", "StrategyCanvas.tsx"]) {
  const source = readFileSync(resolve(root, "pages", page), "utf8");
  assert.match(source, /import\s+["']\.\.\/owner\.css["']/,
    `${page} must retain the forensic styles used by its fx controls`);
}
const main = readFileSync(resolve(root, "main.tsx"), "utf8");
const layout = readFileSync(resolve(root, "shell", "Layout.tsx"), "utf8");
const guide = readFileSync(resolve(root, "pages", "HelpManual.tsx"), "utf8");
const workspaceCss = readFileSync(resolve(root, "shell", "workspace.css"), "utf8");
assert.doesNotMatch(layout, /import\s+["']\.\/guide\.css["']/,
  "focused shell must not eagerly import guide-only CSS");
assert.match(guide, /import\s+["']\.\.\/shell\/guide\.css["']/,
  "Guide must retain its route-local stylesheet");
assert.match(workspaceCss, /\.workspace-orientation\s*\{/,
  "shared route orientation chrome must remain in the eager workspace stylesheet");
assert.doesNotMatch(main, /import\s+["']\.\/pages\/coefficients\.css["']/, "focused startup must not eagerly import the legacy coefficient stylesheet");
for (const page of ["EntryDanger.tsx", "WeeklyAudit.tsx", "StrategyRanking.tsx", "Analysis.tsx", "Playbook.tsx"]) {
  assert.equal(existsSync(resolve(root, "pages", page)), false, `${page} summary route has been retired`);
  assert.ok(![...focusedGraph].some((file) => file.endsWith(page)), `${page} must stay out of focused startup`);
}
const assets = readFileSync(resolve(root, "components", "AssetReadinessPanel.tsx"), "utf8");
assert.match(assets, /import\s+["']\.\.\/pages\/coefficients\.css["']/, "asset readiness must retain coefficient styles for its legacy table surface");
console.log("FOCUSED LEGACY CSS LAZY PASS: guide, coefficient and forensic styles stay off chart startup and load with their owning routes.");
