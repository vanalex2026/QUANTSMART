import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit/", import.meta.url));
const require = createRequire(app + "package.json");
const React = require("react");
const { build } = require("esbuild");
const bundled = await build({
  stdin: { contents: "export { PatternContextSelectionEvidence } from './src/components/PatternContextSelectionEvidence.tsx';", resolveDir: app },
  bundle: true, platform: "node", format: "cjs", jsx: "automatic", external: ["react", "react/jsx-runtime"],
  write: false, logLevel: "silent", loader: { ".css": "empty" },
});
const mount = props => {
  const module = { exports: {} };
  const cells = [];
  let cursor = 0;
  const react = { ...React,
    useMemo(fn) { return fn(); },
    useRef(initial) { const i = cursor++; if (!(i in cells)) cells[i] = { current: initial }; return cells[i]; },
    useState(initial) { const i = cursor++; if (!(i in cells)) cells[i] = typeof initial === "function" ? initial() : initial; return [cells[i], value => { cells[i] = typeof value === "function" ? value(cells[i]) : value; }]; },
    useEffect(effect) { effect(); },
  };
  new Function("require", "module", "exports", bundled.outputFiles[0].text)(name => name === "react" ? react : require(name), module, module.exports);
  return { render() { cursor = 0; return module.exports.PatternContextSelectionEvidence(props); }, update(next) { props = next; return this.render(); } };
};
const collect = node => !node || typeof node !== "object" ? [] : [node, ...React.Children.toArray(node.props?.children).flatMap(collect)];
const text = node => node == null || typeof node === "boolean" ? "" : typeof node !== "object" ? String(node) : React.Children.toArray(node.props?.children).map(text).join("");
const t = i => new Date(Date.UTC(2026, 10, 10, 0, i * 5)).toISOString();
const row = (i, direction, nextBar) => ({ occurrenceTime: t(i), direction, nextBar, selection: { lens: "ALIGNED_STRONG_REVIEW", state: "MEASURED", reason: "CAUSAL_CONTEXT_SELECTION_CENSUS" } });
const census = {
  version: "pattern-context-selection-census/1", state: "MEASURED", reason: "CAUSAL_CONTEXT_SELECTION_CENSUS", conceptId: "pattern_break",
  totalOccurrences: 4, measuredOccurrences: 3, unavailableOccurrences: 1, evaluatedOccurrences: 3, skippedOccurrences: 1,
  buckets: {
  ALIGNED_STRONG_REVIEW: { occurrences: 3, outcomes: { up: 1, down: 1, flat: 1 } }, ALIGNED_REVIEW: { occurrences: 0, outcomes: { up: 0, down: 0, flat: 0 } }, COUNTER_DOMINANCE_REVIEW: { occurrences: 0, outcomes: { up: 0, down: 0, flat: 0 } }, RANGE_EDGE_REVIEW: { occurrences: 0, outcomes: { up: 0, down: 0, flat: 0 } }, PRESSURE_CONFLICT_REVIEW: { occurrences: 0, outcomes: { up: 0, down: 0, flat: 0 } }, MIXED_CONTEXT_REVIEW: { occurrences: 0, outcomes: { up: 0, down: 0, flat: 0 } }, UNAVAILABLE: { occurrences: 1, outcomes: { up: 0, down: 0, flat: 0 } } },
  rows: [row(4, "UP", "UP"), row(5, "UP", "FLAT"), row(6, "DOWN", "DOWN")], authority: "SHADOW_ONLY / NO_DECISION", live_apply_allowed: false,
};

test("context evidence reconciles counts and keeps FLAT in the aligned-direction denominator", () => {
  const inspected = [];
  const tree = mount({ census, status: "Measured", selectedTime: t(5), onInspect: time => inspected.push(time) }).render();
  assert.match(text(tree), /Total 4 · measured 3 · unavailable 1 · reconciled/);
  assert.match(text(tree), /Observed H\+1 aligned-direction rate: 66\.7% \(2\/3\)/);
  assert.match(text(tree), /FLAT outcomes remain in each denominator/);
  assert.match(text(tree), /SHADOW_ONLY \/ NO_DECISION \/ live_apply_allowed=false/);
  const buttons = collect(tree).filter(node => node.type === "button");
  const find = label => buttons.find(button => text(button) === label);
  find("Earliest").props.onClick(); find("Previous").props.onClick(); find("Next").props.onClick(); find("Latest").props.onClick();
  assert.deepEqual(inspected, [t(4), t(4), t(6), t(6)], "navigation emits exact UTC endpoint identities");
  const select = collect(tree).find(node => node.type === "select");
  assert.equal(select.props.value, "ALIGNED_STRONG_REVIEW");
});

test("loading and retry states remain announced without fabricated evidence", () => {
  let retries = 0;
  const tree = mount({ census: null, status: "error", onRetry: () => retries++, selectedTime: "", onInspect() {} }).render();
  assert.match(text(tree), /Context selection evidence unavailable/);
  const retry = collect(tree).find(node => node.type === "button");
  retry.props.onClick();
  assert.equal(retries, 1);
  assert.doesNotMatch(text(tree), /Observed H\+1 aligned-direction rate/);
});

test("bucket survives occurrence navigation but resets on unavailable evidence or a new concept", () => {
  const inspected = [];
  const props = { census, status: "ready", selectedTime: t(5), onInspect: time => inspected.push(time) };
  const mounted = mount(props);
  let tree = mounted.render();
  const select = tree => collect(tree).find(node => node.type === "select");
  select(tree).props.onChange({ target: { value: "ALIGNED_REVIEW" } });
  tree = mounted.update({ ...props, selectedTime: t(6) });
  assert.equal(select(tree).props.value, "ALIGNED_REVIEW");
  tree = mounted.update({ ...props, census: { ...census, conceptId: "other" } });
  assert.equal(select(tree).props.value, "ALIGNED_STRONG_REVIEW");
  const staleLatest = collect(tree).find(node => node.type === "button" && text(node) === "Latest");
  tree = mounted.update({ ...props, census: null, status: "loading" });
  staleLatest.props.onClick();
  assert.deepEqual(inspected, [], "stale controls cannot restore evidence after withholding");
  assert.doesNotMatch(text(tree), /Observed H\+1 aligned-direction rate/);
  tree = mounted.update(props);
  assert.equal(select(tree).props.value, "ALIGNED_STRONG_REVIEW");
});

test("context evidence retains native keyboard controls, named groups, mobile wrapping and exact source/execution limits", () => {
  const tree = mount({ census, status: "ready", selectedTime: t(4), onInspect() {} }).render();
  const nodes = collect(tree);
  assert.equal(tree.type, "section");
  assert.equal(tree.props["aria-label"], "Context selection evidence");
  const filter = nodes.find(node => node.type === "label");
  assert.match(text(filter), /^Review bucket/);
  assert.equal(collect(filter).filter(node => node.type === "select").length, 1, "native select is implicitly labelled and keyboard operable");
  assert.equal(nodes.filter(node => node.type === "option").length, 7);
  const navigation = nodes.find(node => node.props?.["aria-label"] === "Matching occurrence navigation");
  assert.equal(navigation.props.role, "group");
  const controls = collect(navigation).filter(node => node.type === "button");
  assert.deepEqual(controls.map(text), ["Earliest", "Previous", "Next", "Latest"]);
  controls.forEach(node => { assert.equal(node.props.type, "button"); assert.equal(node.props.tabIndex, undefined); assert.equal(node.props.onKeyDown, undefined); });
  assert.equal(controls[1].props.disabled, true, "previous is natively disabled at the first matching endpoint");
  const endpointStatus = collect(navigation).find(node => node.props?.role === "status");
  assert.equal(endpointStatus.props["aria-live"], "polite");
  assert.equal(endpointStatus.props["aria-atomic"], "true");
  const limits = "This local census is not source evidence and does not establish a source execution rule, fill, order, or live apply.";
  assert.ok(text(tree).includes(limits));
  for (const status of ["loading", "error", "unavailable"]) {
    const unavailable = mount({ census: null, status, selectedTime: "", onInspect() {} }).render();
    assert.ok(text(unavailable).includes(limits), status);
    assert.match(text(unavailable), /SHADOW_ONLY \/ NO_DECISION \/ live_apply_allowed=false/);
    assert.doesNotMatch(text(unavailable), /Observed H\+1 aligned-direction rate/);
  }
  const styles = readFileSync(new URL("../mfe_ux_lab/cockpit/src/components/pattern-context-selection-evidence.css", import.meta.url), "utf8");
  assert.match(styles, /\.pattern-context-selection-evidence\{[^}]*min-width:0;max-width:100%[^}]*overflow-wrap:anywhere/);
  assert.match(styles, /\.pattern-context-selection-navigation button,\.pattern-context-selection-evidence>button\{[^}]*min-height:36px/);
  assert.match(styles, /button:focus-visible,\.pattern-context-selection-evidence select:focus-visible\{outline:2px solid/);
  assert.match(styles, /@media\(max-width:360px\)\{\.pattern-context-selection-buckets\{grid-template-columns:1fr\}/);
});

console.log("PATTERN CONTEXT SELECTION EVIDENCE PASS: reconciled buckets, flat-inclusive rates, exact UTC navigation and fail-closed loading.");
