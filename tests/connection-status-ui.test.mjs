import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const source = readFileSync(new URL("../mfe_ux_lab/cockpit/src/shell/ConnectionStatus.tsx", import.meta.url), "utf8");
assert.match(source, /MT5_INITIALIZE_FAILED: "MT5 could not be attached\./,
  "connection dialog must explain initialization failures");
assert.match(source, /MT5_AUTHORIZATION_FAILED: "MT5 rejected the terminal session\./,
  "connection dialog must explain broker authorization failures");
assert.match(source, /NOT_ATTACHED: "Open and sign in to your MT5 desktop terminal/,
  "connection dialog must explain the auto-attach prerequisite");
assert.match(source, /TERMINAL_DISCONNECTED: "The terminal is attached but its broker connection is unavailable\./,
  "connection dialog must explain a disconnected terminal");
assert.match(source, /title=\{feedDescription\}/,
  "connection status must expose the current feed state as a native tooltip");
assert.match(source, /aria-label=\{`\$\{copy.connection\}: \$\{feedDescription\}`\}/,
  "connection status must expose its detailed feed state to assistive technology");
assert.match(source, /read-only market data/,
  "connection status must disclose that the sync badge has no execution authority");
assert.match(source, /current \$\{CONNECTION_HEALTH_TF\} closed-bar feed/,
  "connection status must distinguish a current closed-bar feed from attachment alone");
assert.match(source, /\$\{account\.account_kind\} \$\{copy\.account\} - \$\{copy\.readonly\}/,
  "connection status must keep the broker account kind visible in background health state");
assert.match(source, /account\.account_kind === "UNKNOWN"[\s\S]*account-scoped/,
  "unknown account kind must be visible instead of silently appearing equivalent to Demo or Real");
assert.match(source, /const CONNECTION_HEALTH_TF = "M5"/,
  "the shell health badge must use the focused M5 timeframe");
// Execute the actual component and its polling effect with a small hook host.
// Only external I/O and React scheduling are replaced; no server or terminal
// is needed to reproduce a successful account probe followed by feed failure.
const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit", import.meta.url));
const require = createRequire(app + "/package.json");
const { build } = require("esbuild");
const mocks = {
  react: `export const useState = value => globalThis.__connectionStatusTest.useState(value);
    export const useEffect = (effect, deps) => globalThis.__connectionStatusTest.useEffect(effect, deps);
    export const useRef = value => ({ current: value });`,
  "react/jsx-runtime": `export const jsx = (type, props) => ({ type, props }); export const jsxs = jsx; export const Fragment = 'fragment';`,
  "../lib/activeSymbolStore.ts": `export const getActiveSymbol = () => 'XAUUSD'; export const SYMBOL_CHANGED_EVENT = 'symbol-changed';`,
  "../lib/mt5Connection.ts": `export const terminalRequest = (...args) => globalThis.__connectionStatusTest.request(...args);
    export const autoAttachTerminal = signal => globalThis.__connectionStatusTest.autoAttach(signal);
    export const canAutoAttachTerminal = account => account?.supported === true && !account?.connected && ['NOT_ATTACHED', 'TERMINAL_DISCONNECTED', 'ACCOUNT_UNAVAILABLE'].includes(account?.reason);
    export const observeTerminalAccount = account => globalThis.__connectionStatusTest.observed.push(account);
    export const useTerminalGeneration = () => globalThis.__connectionStatusTest.generation;
    export const MT5_OPEN_DIALOG_EVENT = 'open-connection';
    export const attachTerminal = () => { throw new Error('unexpected attachment'); };
    export const detachTerminal = () => { throw new Error('unexpected detachment'); };
    export const invalidateTerminalData = () => {};`,
  "../lib/mt5DemoAdapter.ts": `export const isVerifiedClosedBarWindow = bars => bars.verified === true;`,
  "../components/ui/Glyph.tsx": `export const Glyph = () => null;`,
  "./mt5-connection.css": "",
};
const bundled = await build({
  entryPoints: [app + "/src/shell/ConnectionStatus.tsx"], bundle: true, format: "esm", platform: "node", jsx: "automatic", write: false, logLevel: "silent",
  define: { window: "globalThis.__connectionStatusTest.window", document: "globalThis.__connectionStatusTest.document", setTimeout: "globalThis.__connectionStatusTest.setTimeout", clearTimeout: "globalThis.__connectionStatusTest.clearTimeout" },
  plugins: [{ name: "connection-component-test-host", setup(builder) {
    builder.onResolve({ filter: /.*/ }, args => Object.hasOwn(mocks, args.path) ? { path: args.path, namespace: "test-host" } : undefined);
    builder.onLoad({ filter: /.*/, namespace: "test-host" }, args => ({ contents: mocks[args.path], loader: "js" }));
  } }],
});
const { ConnectionStatus } = await import("data:text/javascript;base64," + Buffer.from(bundled.outputFiles[0].text).toString("base64"));
const connectedAccount = { connected: true, supported: true, account_kind: "DEMO", trade_allowed: false, generation: 1 };
const freshBars = { verified: true, bars: [{ t: new Date(Date.now() - 15 * 60_000).toISOString() }] };
const find = (node, className) => {
  if (node?.props?.className?.split(" ").includes(className)) return node;
  for (const child of [node?.props?.children].flat(Infinity)) {
    const match = child && typeof child === "object" && find(child, className);
    if (match) return match;
  }
};
function host(responses, hidden = false) {
  const states = [], effects = [], pending = [], timers = new Map();
  let stateCursor = 0, effectCursor = 0, timerId = 0;
  const events = { addEventListener() {}, removeEventListener() {} };
  const harness = {
    generation: 0, observed: [], requests: [], synced: [], window: events, document: { ...events, hidden },
    useState(initial) {
      const index = stateCursor++;
      if (!(index in states)) states[index] = typeof initial === "function" ? initial() : initial;
      return [states[index], value => { states[index] = typeof value === "function" ? value(states[index]) : value; }];
    },
    useEffect(effect, deps) {
      const index = effectCursor++, previous = effects[index];
      if (previous && deps.every((dep, i) => Object.is(dep, previous.deps[i]))) return;
      previous?.cleanup?.();
      effects[index] = { deps };
      pending.push(() => { effects[index].cleanup = effect(); });
    },
    async request(path) {
      harness.requests.push(path);
      assert.ok(responses.length, `unexpected request: ${path}`);
      const next = responses.shift();
      if (next instanceof Error) throw next;
      return next;
    },
    async autoAttach(signal) {
      harness.requests.push('/connect');
      assert.equal(signal?.aborted, false, 'auto-attach must receive a live cancellation signal');
      assert.ok(harness.autoResponses.length, 'unexpected auto-attach request');
      const next = harness.autoResponses.shift();
      if (next instanceof Error) throw next;
      return next;
    },
    setTimeout(callback) { timers.set(++timerId, callback); return timerId; },
    clearTimeout(id) { timers.delete(id); },
    async render() {
      stateCursor = 0; effectCursor = 0;
      const tree = ConnectionStatus({ onSynced: synced => harness.synced.push(synced) });
      while (pending.length) pending.shift()();
      await new Promise(resolve => setImmediate(resolve));
      return tree;
    },
    async poll() {
      const [id, callback] = timers.entries().next().value;
      timers.delete(id); callback();
      await new Promise(resolve => setImmediate(resolve));
      return harness.render();
    },
    cleanup() { for (const effect of effects) effect?.cleanup?.(); },
  };
  harness.autoResponses = [];
  globalThis.__connectionStatusTest = harness;
  return harness;
}

let harness = host([connectedAccount, new Error("feed timeout"), connectedAccount, freshBars]);
await harness.render();
let tree = await harness.render();
assert.equal(find(tree, "connection-label").props.children, "MT5 Connected", "a failed bars request must preserve proven terminal attachment");
assert.equal(find(tree, "connection-status").props.className, "connection-status stale");
assert.match(find(tree, "connection-status").props.title, /no current M5 closed-bar feed.*check is unavailable; retrying/);
assert.equal(harness.observed.at(-1), connectedAccount);
assert.equal(harness.synced.at(-1), false, "feed failure cannot report synchronized health");
tree = await harness.poll();
assert.equal(find(tree, "connection-label").props.children, "MT5 Sync", "a later healthy poll must recover without reconnecting");
assert.doesNotMatch(find(tree, "connection-status").props.title, /unavailable|retrying/, "recovery must clear the old feed failure explanation");
assert.deepEqual(harness.requests.map(path => path.split("?")[0]), ["/account", "/bars", "/account", "/bars"]);
harness.cleanup();

harness = host([connectedAccount, freshBars], true);
await harness.render(); tree = await harness.render();
assert.equal(find(tree, "connection-label").props.children, "MT5 Sync", "a restarted or reattached hidden tab must obtain one current account receipt");
assert.deepEqual(harness.requests.map(path => path.split("?")[0]), ["/account", "/bars"]);
await harness.poll();
assert.equal(harness.requests.length, 2, "background account recovery must not enable recurring hidden-tab polling");
harness.cleanup();

harness = host([{ connected: false, reason: "NOT_ATTACHED", account_kind: "UNKNOWN", trade_allowed: false }, connectedAccount, freshBars], true);
await harness.render(); tree = await harness.render();
assert.equal(find(tree, "connection-label").props.children, "MT5 Offline");
harness.generation += 1; // Explicit Auto-Attach invalidates terminal consumers.
await harness.render(); tree = await harness.render();
assert.equal(find(tree, "connection-label").props.children, "MT5 Sync", "Auto-Attach must replace a previously offline hidden-tab badge without a visibility event");
assert.equal(harness.observed.at(-1), connectedAccount);
assert.deepEqual(harness.requests.map(path => path.split("?")[0]), ["/account", "/account", "/bars"]);
harness.cleanup();

harness = host([{ connected: false, supported: true, reason: "TERMINAL_DISCONNECTED", account_kind: "UNKNOWN", trade_allowed: false }, freshBars], false);
harness.autoResponses.push(connectedAccount);
await harness.render(); tree = await harness.render();
assert.equal(find(tree, "connection-label").props.children, "MT5 Sync", "a disconnected terminal must auto-attach and become synchronized after a healthy M5 feed check");
assert.equal(harness.observed.at(-1), connectedAccount);
assert.deepEqual(harness.requests.map(path => path.split("?")[0]), ["/account", "/connect", "/bars"]);
harness.cleanup();

harness = host([{ connected: false, supported: true, reason: "ACCOUNT_UNAVAILABLE", account_kind: "UNKNOWN", trade_allowed: false }, freshBars], false);
harness.autoResponses.push(connectedAccount);
await harness.render(); tree = await harness.render();
assert.equal(find(tree, "connection-label").props.children, "MT5 Sync", "an unavailable account must auto-attach and become synchronized after a healthy M5 feed check");
assert.equal(harness.observed.at(-1), connectedAccount);
assert.deepEqual(harness.requests.map(path => path.split("?")[0]), ["/account", "/connect", "/bars"]);
harness.cleanup();

harness = host([{ connected: false, supported: false, reason: "HISTORICAL_MODE", account_kind: "UNKNOWN", trade_allowed: false }]);
await harness.render(); tree = await harness.render();
assert.equal(find(tree, "connection-label").props.children, "Historical mode", "intentionally disabled connectivity must explain the active mode visibly");
assert.match(find(tree, "connection-status").props.title, /Restart without --historical/);
assert.deepEqual(harness.requests, ["/account"], "disabled historical mode must not probe bars");
harness.cleanup();

harness = host([new Error("account transport unavailable")]);
await harness.render(); tree = await harness.render();
assert.equal(find(tree, "connection-label").props.children, "MT5 Offline", "account transport failure must still be reported offline");
assert.match(find(tree, "connection-status").props.title, /local connector is not responding/);
harness.cleanup();
delete globalThis.__connectionStatusTest;
console.log("CONNECTION STATUS UI PASS: real polling effect preserves attachment on feed failure, recovers on retry, distinguishes historical mode and reports account transport failure.");
