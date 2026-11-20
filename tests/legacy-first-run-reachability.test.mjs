import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, normalize, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const src = join(root, "mfe_ux_lab", "cockpit", "src");
const files = [];

function visit(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) visit(absolute);
    else if (/\.(?:ts|tsx|js|jsx)$/.test(entry.name)) files.push(normalize(absolute));
  }
}
visit(src);

const knownFiles = new Set(files);
const graph = new Map(files.map((file) => [file, []]));
const extensions = ["", ".ts", ".tsx", ".js", ".jsx"];
for (const file of files) {
  const source = readFileSync(file, "utf8");
  const imports = /import\s*(?:type\s*)?(?:[^'";]*?from\s*)?["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)/g;
  let match;
  while ((match = imports.exec(source))) {
    const specifier = match[1] || match[2];
    if (!specifier?.startsWith(".")) continue;
    const base = resolve(join(file, ".."), specifier);
    const candidates = [
      ...extensions.map((extension) => normalize(base + extension)),
      normalize(join(base, "index.ts")),
      normalize(join(base, "index.tsx")),
    ];
    const target = candidates.find((candidate) => knownFiles.has(candidate));
    if (target) graph.get(file).push(target);
  }
}

const entry = normalize(join(src, "main.tsx"));
const reachable = new Set([entry]);
const queue = [entry];
while (queue.length) {
  for (const target of graph.get(queue.shift()) || []) {
    if (!reachable.has(target)) {
      reachable.add(target);
      queue.push(target);
    }
  }
}

const orphanLegacyWrapper = normalize(join(src, "shell", "FirstRun.tsx"));
assert.equal(existsSync(orphanLegacyWrapper), false, "retired FirstRun wrapper must remain removed");
assert.equal(existsSync(join(src, "shell", "first-run.css")), false, "retired FirstRun stylesheet must remain removed");
assert.equal(existsSync(join(root, "tests", "first-run.test.mjs")), false, "retired wrapper acceptance test must remain removed");
assert.equal(existsSync(join(src, "components", "CsvImportPanel.tsx")), true, "CSV import service UI remains available");
const releaseScript = readFileSync(join(root, "scripts", "package-release.mjs"), "utf8");
const portableScript = readFileSync(join(root, "scripts", "package-portable.mjs"), "utf8");
const doctorScript = readFileSync(join(root, "scripts", "doctor.mjs"), "utf8");
const csvGuide = readFileSync(join(root, "docs", "CSV_IMPORT.md"), "utf8");
const installerGuide = readFileSync(join(root, "docs", "INSTALLER_VALIDATION.md"), "utf8");
assert.match(releaseScript, /legacy-first-run-reachability\.test\.mjs/, "release graph must package the active reachability regression");
assert.doesNotMatch(releaseScript, /tests\/first-run\.test\.mjs/, "release graph must not package the retired acceptance test");
assert.doesNotMatch(portableScript, /first-run panel/, "portable instructions must name the active CSV importer");
assert.doesNotMatch(doctorScript, /first-run panel/i, "doctor guidance must not advertise the retired panel");
assert.match(doctorScript, /CSV importer in Microscope/, "doctor guidance must point to the active importer");
assert.doesNotMatch(csvGuide, /first-run panel/i, "CSV guide must not advertise the retired panel");
assert.doesNotMatch(installerGuide, /first-run browser file chooser/i, "installer evidence must describe the active importer");
const activeSource = files.map((file) => readFileSync(file, "utf8")).join("\n");
assert.doesNotMatch(activeSource, /FirstRun|first-run\.css|quantsmart-first-run-v1/, "active source must not retain retired wrapper references");
assert.ok(reachable.has(normalize(join(src, "components", "CsvImportPanel.tsx"))), "shared CSV import panel remains reachable");

console.log(`LEGACY FIRST-RUN CLEANUP PASS: ${reachable.size}/${files.length} source modules reachable from main; orphan wrapper and stylesheet removed; shared CSV import panel preserved.`);
