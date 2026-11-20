import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit/", import.meta.url));
const require = createRequire(app + "package.json");
const React = require("react");
const { build } = require("esbuild");
const bundled = await build({
  stdin: { contents: "export { PatternReplayBookmarkControls } from './src/components/PatternReplayBookmarkControls.tsx';", resolveDir: app },
  bundle: true, platform: "node", format: "cjs", jsx: "automatic", external: ["react", "react/jsx-runtime"],
  write: false, logLevel: "silent", loader: { ".css": "empty" },
});
const load = () => {
  const module = { exports: {} };
  const hooks = { state: null };
  const react = { ...React, useState(initial) { if (hooks.state === null) hooks.state = initial; return [hooks.state, value => { hooks.state = typeof value === "function" ? value(hooks.state) : value; }]; } };
  new Function("require", "module", "exports", bundled.outputFiles[0].text)(name => name === "react" ? react : require(name), module, module.exports);
  return { component: module.exports.PatternReplayBookmarkControls, hooks };
};
const collect = node => !node || typeof node !== "object" ? [] : [node, ...React.Children.toArray(node.props?.children).flatMap(collect)];
const text = node => node == null || typeof node === "boolean" ? "" : typeof node !== "object" ? String(node) : React.Children.toArray(node.props?.children).map(text).join("");
const bookmark = { version: "pattern-replay-bookmark/1", occurrenceTime: "2026-01-05T04:10:00.000Z", conceptId: "named_candle:engulfing", reads: "bullish", mode: "outcome", revealedTime: "2026-01-05T04:15:00.000Z", authority: "SHADOW_ONLY / NO_DECISION", live_apply_allowed: false };

test("bookmark controls expose identity-only accessible actions", () => {
  const { component } = load();
  const storage = new Map();
  const fakeStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
  const restored = [];
  const tree = component({ scope: "terminal:1|broker:demo", current: bookmark, storage: fakeStorage, nowMs: Date.parse("2026-01-05T05:00:00.000Z"), onRestore: value => restored.push(value) });
  const nodes = collect(tree);
  const buttons = nodes.filter(node => node.type === "button");
  assert.deepEqual(buttons.map(button => text(button)), ["Save current replay", "Restore saved replay", "Delete saved replay"]);
  assert.ok(buttons.every(button => button.props.type === "button" && button.props.tabIndex === undefined && button.props.onKeyDown === undefined),
    "native buttons retain sequential keyboard focus and browser Enter/Space activation");
  buttons[0].props.onClick();
  buttons[1].props.onClick();
  assert.deepEqual(restored, [bookmark]);
  buttons[2].props.onClick();
  assert.equal(storage.size, 0);
  const status = nodes.find(node => node.props?.role === "status");
  assert.equal(status.props["aria-live"], "polite");
  assert.equal(status.props["aria-atomic"], "true");
  assert.match(text(tree), /read-only replay identity/i);
  assert.match(text(tree), /no prices, OHLC, outcomes, fills or statistics/i);
});

test("save is disabled when no current replay identity exists", () => {
  const { component } = load();
  const tree = component({ scope: "scope", current: null, storage: null, onRestore() {} });
  const save = collect(tree).find(node => node.type === "button");
  assert.equal(save.props.disabled, true);
});

test("Vietnamese bookmark controls translate the current notice when locale changes", () => {
  const { component } = load();
  const props = { scope: "scope", current: bookmark, storage: {
    getItem: () => null, setItem() {}, removeItem() {},
  }, nowMs: Date.parse("2026-01-05T05:00:00.000Z"), onRestore() {} };
  const buttons = tree => collect(tree).filter(node => node.type === "button");
  const status = tree => text(collect(tree).find(node => node.props?.role === "status"));
  buttons(component(props))[0].props.onClick();
  assert.equal(status(component(props)), "Replay identity saved for this account scope.");
  const vietnamese = component({ ...props, locale: "vi" });
  assert.equal(vietnamese.props["aria-label"], "D\u1ea5u trang ph\u00e1t l\u1ea1i");
  assert.deepEqual(buttons(vietnamese).map(text), ["L\u01b0u phi\u00ean ph\u00e1t l\u1ea1i hi\u1ec7n t\u1ea1i", "Kh\u00f4i ph\u1ee5c phi\u00ean ph\u00e1t l\u1ea1i \u0111\u00e3 l\u01b0u", "X\u00f3a phi\u00ean ph\u00e1t l\u1ea1i \u0111\u00e3 l\u01b0u"]);
  assert.equal(status(vietnamese), "\u0110\u00e3 l\u01b0u d\u1ea5u trang ph\u00e1t l\u1ea1i cho t\u00e0i kho\u1ea3n n\u00e0y.");
});

test("invalid stored data never reaches restore and failed writes are announced", () => {
  const { component } = load();
  const restored = [];
  const props = { scope: "scope", current: bookmark, onRestore: value => restored.push(value), nowMs: Date.parse("2026-01-05T05:00:00.000Z"), storage: {
    getItem: () => JSON.stringify({ ...bookmark, close: 123 }),
    setItem() { throw { name: "QuotaExceededError" }; },
    removeItem() {},
  } };
  let tree = component(props);
  collect(tree).find(node => node.type === "button" && text(node) === "Restore saved replay").props.onClick();
  tree = component(props);
  assert.deepEqual(restored, []);
  assert.match(text(collect(tree).find(node => node.props?.role === "status")), /INVALID_BOOKMARK_FIELDS/);
  collect(tree).find(node => node.type === "button" && text(node) === "Save current replay").props.onClick();
  tree = component(props);
  assert.match(text(collect(tree).find(node => node.props?.role === "status")), /BOOKMARK_STORAGE_QUOTA_EXCEEDED/);
  const switched = component({ ...props, scope: "other-account" });
  assert.match(text(collect(switched).find(node => node.props?.role === "status")), /No saved replay identity loaded for this account scope/);
});
