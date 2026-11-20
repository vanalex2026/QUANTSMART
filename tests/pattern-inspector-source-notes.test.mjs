import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const ts = require("typescript"), React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const base = new URL("../mfe_ux_lab/cockpit/src/", import.meta.url);
const read = (path) => readFileSync(new URL(path, base), "utf8");
function load(path, dependencies = {}) {
  const code = ts.transpileModule(read(path), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", code)((name) => dependencies[name] || require(name), module, module.exports);
  return module.exports;
}
const map = JSON.parse(readFileSync(new URL("../docs/price_action_knowledge_map.json", import.meta.url), "utf8"));
const sourcePages = load("lib/priceActionSourcePages.ts");
const sourceConceptStatus = load("lib/sourceConceptStatus.ts");
const sourceNotesLocalization = load("lib/sourceNotesLocalization.ts");
const Content = load("components/ChartPatternSourceNotes.tsx", {
  "../../../../docs/price_action_knowledge_map.json": map,
  "../lib/priceActionKnowledge.ts": load("lib/priceActionKnowledge.ts"),
  "../lib/priceActionSourcePages.ts": sourcePages,
  "../lib/sourceConceptStatus.ts": sourceConceptStatus,
  "../lib/sourceNotesLocalization.ts": sourceNotesLocalization,
}).default;
const collect = (node) => !node || typeof node !== "object" ? [] : [node, ...React.Children.toArray(node.props?.children).flatMap(collect)];

// Execute the real content for every selected concept. Only exact membership
// may expose a lens; a shared page, name fragment or detector family is not a link.
for (const knowledge of [...map.concepts, { id: "pattern_break_suffix" }, { id: "named_candle:DOJI" }]) {
  const tree = Content({ knowledge });
  const expected = map.source_lenses.filter((lens) => lens.concept_ids.includes(knowledge.id));
  const articles = collect(tree).filter((node) => node.type === "article");
  assert.deepEqual(articles.map((article) => article.props["aria-label"]), expected.map((lens) => `Reviewed source lens: ${lens.name}`), `exact linked lenses for ${knowledge.id}`);
  articles.forEach((article, index) => {
    assert.equal(article.props.role, "region");
    assert.equal(article.props.tabIndex, 0);
    const text = collect(article).flatMap((node) => React.Children.toArray(node.props?.children).filter((child) => typeof child === "string")).join(" ");
    const lens = expected[index];
    for (const note of [lens.name, lens.definition, ...lens.cues, ...lens.abstain, sourcePages.formatPriceActionSourcePages(lens.pages)]) assert.ok(text.includes(note), `${lens.id} retains source text/anchors`);
  });
  const html = renderToStaticMarkup(tree);
  assert.match(html, /SOURCE_NOTES/);
  assert.match(html, /no detector rules, occurrences or measured outcomes/);
  assert.match(html, /no XAUUSD OHLC or win rates/);
  assert.match(html, /SHADOW_ONLY \/ NO_DECISION \/ live_apply_allowed=false/);
  if (!expected.length) assert.match(html, /No reviewed source notes are linked/);
}

// Run the actual expansion, Escape and retry handlers with deterministic hooks.
let slot = 0, refSlot = 0, lazyTypes = 0;
const states = [];
const focusCalls = [];
const refs = ["toggle", "region"].map((target) => ({ current: { focus(options) { focusCalls.push({ target, options }); } } }));
const hooks = {
  ...React,
  useState(initial) {
    const index = slot++;
    if (!(index in states)) states[index] = typeof initial === "function" ? initial() : initial;
    return [states[index], (next) => { states[index] = typeof next === "function" ? next(states[index]) : next; }];
  },
  useId: () => `notes-id-${slot++}`,
  useRef: () => refs[refSlot++],
  lazy: (loader) => {
    lazyTypes++;
    const LazyNotes = () => null;
    LazyNotes.loader = loader;
    return LazyNotes;
  },
};
const localeFallback = { useLocale: () => ({ locale: "en", toggleLocale() {}, t(key) { return key; } }) };
const { ReviewedSourceNotes } = load("components/ReviewedSourceNotes.tsx", { react: hooks, "../lib/locale.tsx": localeFallback, "../lib/sourceNotesLocalization.ts": sourceNotesLocalization });
const render = () => { slot = 0; refSlot = 0; return ReviewedSourceNotes({ knowledge: map.concepts[0] }); };
let tree = render();
let button = collect(tree).find((node) => node.type === "button");
assert.equal(button.props["aria-expanded"], false);
assert.equal(collect(tree).some((node) => node.props.role === "region"), false, "collapsed control must not mount or fetch the full-map content");
assert.equal(lazyTypes, 1);
button.props.onClick();
tree = render();
button = collect(tree).find((node) => node.type === "button");
const region = collect(tree).find((node) => node.props.role === "region");
assert.equal(button.props["aria-expanded"], true);
assert.equal(button.props["aria-controls"], region.props.id);
assert.equal(region.props.tabIndex, 0);
assert.ok(region.props["aria-labelledby"]);
const suspense = collect(tree).find((node) => node.type === React.Suspense);
assert.match(renderToStaticMarkup(suspense.props.fallback), /Loading reviewed PDF source notes/);
const boundary = collect(tree).find((node) => typeof node.type === "function" && node.type.getDerivedStateFromError);
const instance = new boundary.type(boundary.props);
instance.state = boundary.type.getDerivedStateFromError(new Error("network"));
const failure = instance.render();
assert.match(renderToStaticMarkup(failure), /Reviewed source notes could not be loaded/);
collect(failure).find((node) => node.type === "button").props.onClick();
assert.deepEqual(focusCalls, [{ target: "region", options: { preventScroll: true } }], "retry moves focus from the disappearing button to the persistent region without scrolling");
const retryTree = render();
const retryBoundary = collect(retryTree).find((node) => node.type === boundary.type);
assert.notEqual(retryBoundary.key, boundary.key, "retry remounts the failed boundary");
assert.equal(lazyTypes, 2, "retry must create a fresh React lazy import attempt");
assert.equal(collect(retryTree).find((node) => node.props.role === "region").props["aria-labelledby"], region.props["aria-labelledby"], "retry keeps the same named keyboard region");
const persistentRegion = refs[1].current;
refs[1].current = null;
retryBoundary.props.onRetry();
assert.deepEqual(focusCalls.at(-1), { target: "toggle", options: { preventScroll: true } }, "retry safely falls back to the persistent toggle when the region ref is unavailable");
refs[1].current = persistentRegion;
let prevented = 0, stopped = 0;
region.props.onKeyDown({ key: "Escape", preventDefault() { prevented++; }, stopPropagation() { stopped++; } });
assert.equal(prevented, 1); assert.equal(stopped, 1);
assert.equal(focusCalls.at(-1).target, "toggle", "Escape after retry collapses only the notes and restores the toggle");
assert.equal(focusCalls.length, 3);
assert.equal(collect(render()).find((node) => node.type === "button").props["aria-expanded"], false);

const inspector = read("components/ChartPatternInspector.tsx");
assert.match(inspector, /knowledge && <ReviewedSourceNotes key=\{knowledge.id\} knowledge=\{knowledge\}/, "PDF concepts alone expose notes and reset expansion on concept change");
assert.match(read("components/ReviewedSourceNotes.tsx"), /lazy\(\(\) => import\("\.\/ChartPatternSourceNotes.tsx"\)\)/);
assert.doesNotMatch(read("components/ReviewedSourceNotes.tsx"), /price_action_knowledge_map\.json|price_action_page_index\.json/);
assert.doesNotMatch(read("components/ChartPatternSourceNotes.tsx"), /price_action_page_index\.json|priceActionDetector\.ts/);
const styles = read("components/chart-pattern-inspector.css");
for (const selector of ["chart-pattern-source-notes-scroll", "chart-pattern-source-lens"]) {
  assert.match(styles, new RegExp(`\\.${selector}\\{[^}]*max-height:[^}]*overflow-y:auto`));
  assert.match(styles, new RegExp(`\\.${selector}:focus-visible`));
}
console.log("PATTERN INSPECTOR SOURCE NOTES PASS: exact concept lenses, source authority, collapsed lazy loading, bounded keyboard regions and isolated retry.");
