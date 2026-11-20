import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const ts = require("typescript");
const cockpitSrc = join(root, "mfe_ux_lab", "cockpit", "src");
const retired = join(cockpitSrc, "components", "BeastDeckBoard.tsx");

assert.equal(existsSync(retired), false, "retired Beast deck wrapper must stay removed");

const sourceFiles = [];
function visit(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) visit(absolute);
    else if (/\.(?:ts|tsx)$/.test(entry.name)) sourceFiles.push(absolute);
  }
}
visit(cockpitSrc);

const references = [];
for (const file of sourceFiles) {
  const ast = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
  function inspect(node) {
    let specifier;
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) specifier = node.moduleSpecifier.text;
    else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) specifier = node.arguments[0].text;
    else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) && ts.isStringLiteral(node.argument.literal)) specifier = node.argument.literal.text;
    if (specifier?.includes("BeastDeckBoard")) references.push({ file, specifier });
    ts.forEachChild(node, inspect);
  }
  inspect(ast);
}
assert.deepEqual(references, [], "no cockpit source module may import the retired deck wrapper");

for (const shared of [
  "lib/cardBeastV2/beastStore.ts",
  "lib/cardBeastV2/beastContext.ts",
  "lib/cardBeastV2/affinityObserved.ts",
  "lib/cardBeastV2/budget.ts",
]) {
  assert.equal(existsSync(join(cockpitSrc, shared)), true, `${shared} remains available as shared Beast data/service code`);
}

console.log("LEGACY BEAST DECK CLEANUP PASS: orphan wrapper removed; no source imports remain; shared Beast code preserved.");
