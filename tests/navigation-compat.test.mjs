import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const appRoot = fileURLToPath(new URL("../mfe_ux_lab/cockpit", import.meta.url));
const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const { build } = require("esbuild");
const bundle = await build({
  entryPoints: ["src/shell/navigation.ts"],
  absWorkingDir: appRoot,
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const routes = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));
const navigation = readFileSync(
  fileURLToPath(new URL("../mfe_ux_lab/cockpit/src/shell/navigation.ts", import.meta.url)),
  "utf8",
);
const app = readFileSync(
  fileURLToPath(new URL("../mfe_ux_lab/cockpit/src/App.tsx", import.meta.url)),
  "utf8",
);

assert.match(navigation, /LEGACY_ROUTE_ALIASES[\s\S]*"pattern-atlas"\s*:\s*"home"/);
assert.match(navigation, /LEGACY_ROUTE_ALIASES[\s\S]*"research-atlas"\s*:\s*"home"/);
assert.match(navigation, /canonicalPage\s*=\s*\(id: string\)\s*=>/);
assert.match(navigation, /canonicalHash\s*=\s*\(hash: string\)\s*=>/);
assert.doesNotMatch(navigation, /\{ id: "pattern-atlas",/);
assert.doesNotMatch(navigation, /\{ id: "research-atlas",/);
assert.doesNotMatch(app, /page === "pattern-atlas"/);
assert.doesNotMatch(app, /page === "research-atlas"/);
assert.doesNotMatch(app, /PatternAtlas/, "the focused route must not retain the standalone Pattern Atlas page module");
assert.match(app, /const canonical = canonicalPage\(id\)/);
assert.match(app, /pageFromHash\(window\.location\.hash\)/);
assert.match(app, /const canonical = canonicalHash\(window\.location\.hash\)/,
  "App must normalize direct and legacy hashes to a canonical focused route");
assert.match(app, /window\.history\.replaceState\(null, "", canonical\)/,
  "hash normalization must not add an extra browser history entry");
assert.equal(routes.canonicalPage("pattern-atlas"), "home");
assert.equal(routes.pageFromHash("#pattern-atlas"), "home");
assert.equal(routes.pageFromHash("#/pattern-atlas?source=legacy"), "home");
assert.equal(routes.pageFromHash("#/pattern-atlas/?source=legacy"), "home");
assert.equal(routes.canonicalHash(""), "#home");
assert.equal(routes.canonicalHash("#pattern-atlas?source=legacy"), "#home");
assert.equal(routes.canonicalHash("#unknown"), "#home");
assert.equal(routes.canonicalHash("#/microscope?source=legacy"), "#microscope");
assert.equal(routes.canonicalHash("#/debugger/?panel=errors"), "#debugger", "valid diagnostic routes survive legacy trailing-slash links");
assert.equal(routes.canonicalPage("research-atlas"), "home");
assert.equal(routes.pageFromHash("#/research-atlas?source=legacy"), "home");
assert.equal(routes.validPage("pattern-atlas"), true);
assert.equal(routes.validPage("research-atlas"), true);
assert.equal(routes.workspaceFor("pattern-atlas")?.id, "home");
assert.equal(routes.workspaceFor("research-atlas")?.id, "home");
assert.equal(routes.canonicalPage("kidi-events"), "home", "retired KIDI navigation resolves to focused M5 home");
for (const hash of ["#kidi-events", "#/kidi-events?source=legacy", "#/kidi-events/?source=legacy"]) {
  assert.equal(routes.canonicalHash(hash), "#home");
  assert.equal(routes.pageFromHash(hash), "home");
}
assert.equal(routes.workspaceFor("kidi-events")?.id, "home");
assert.equal(routes.validPage("kidi-events"), true, "old KIDI links remain accepted through the explicit alias");
assert.ok(!routes.WORKSPACES.some((item) => item.id === "kidi-events"), "retired page has no workspace registration");
assert.doesNotMatch(app, /KidiEvents|page === "kidi-events"/, "retired M15 diagnostic cannot load or render");
assert.equal(existsSync(new URL("../mfe_ux_lab/cockpit/src/pages/KidiEvents.tsx", import.meta.url)), false);
assert.deepEqual(routes.searchWorkspaces("kidi"), [], "retired diagnostic is absent from command discovery");
for (const { id, component, search } of [
  { id: "entry-danger", component: "EntryDanger", search: "entry danger" },
  { id: "weekly-audit", component: "WeeklyAudit", search: "weekly audit" },
  { id: "strategy-ranking", component: "StrategyRanking", search: "compatibility map" },
  { id: "analysis", component: "Analysis", search: "governance" },
  { id: "playbook", component: "Playbook", search: "instability episodes" },
]) {
  assert.equal(routes.canonicalPage(id), "home", `${id} navigation resolves to focused M5 home`);
  assert.equal(routes.workspaceFor(id)?.id, "home");
  assert.equal(routes.validPage(id), true, `${id} old links stay accepted through their explicit alias`);
  for (const hash of [`#${id}`, `#/${id}?source=legacy`, `#/${id}/?source=legacy`]) {
    assert.equal(routes.canonicalHash(hash), "#home");
    assert.equal(routes.pageFromHash(hash), "home");
  }
  assert.ok(!routes.WORKSPACES.some((item) => item.id === id), `${id} has no workspace registration`);
  assert.ok(!app.includes(component), `${component} must have no import or render binding`);
  assert.ok(!app.includes(`page === "${id}"`), `${id} must have no rendered route`);
  assert.equal(existsSync(new URL(`../mfe_ux_lab/cockpit/src/pages/${component}.tsx`, import.meta.url)), false);
  assert.deepEqual(routes.searchWorkspaces(search), [], `${id} is absent from command discovery`);
}
const release = readFileSync(new URL("../scripts/package-release.mjs", import.meta.url), "utf8");
assert.doesNotMatch(release, /entry-danger|weekly-audit|strategy-ranking|'analysis'|'playbook'/, "retired routes must not enter future release screenshot lists");
const tour = readFileSync(new URL("../docs/PRODUCT_TOUR.md", import.meta.url), "utf8");
assert.doesNotMatch(tour, /screenshots\/(?:entry-danger|weekly-audit|strategy-ranking|analysis|playbook)\.jpg/, "tour must not advertise retired route screenshots");
assert.deepEqual(new Set(routes.WORKSPACES.map((item) => item.id)),
  new Set([...app.matchAll(/page\s*===\s*"([^"]+)"\s*&&\s*</g)].map((match) => match[1])),
  "every supported workspace keeps its rendered route after legacy retirement");
assert.deepEqual(routes.searchWorkspaces("pattern atlas").map((item) => item.id), ["home"]);
assert.deepEqual(routes.searchWorkspaces("microscope"), [], "hidden legacy workspaces must not re-enter command discovery");
assert.ok(routes.SIDEBAR_WORKSPACES.every((item) => item.showInSidebar !== false));
assert.deepEqual(routes.visibleWorkspaceGroups("home").map((group) => group.id), ["cockpit"],
  "the canonical XAUUSD M5 home keeps unrelated shell groups out of primary navigation");
assert.deepEqual(routes.visibleWorkspaceGroups("help").map((group) => group.id), ["cockpit", "system"],
  "secondary shell navigation remains available away from the focused home surface");
assert.equal(routes.searchWorkspaces("guide").map((item) => item.id).join(","), "help",
  "demoted Guide remains discoverable through Ctrl+K");

console.log("NAVIGATION COMPAT PASS: retired Atlas, KIDI and summary routes resolve to focused home; supported routes remain available.");
