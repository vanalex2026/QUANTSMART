import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit/", import.meta.url));
const require = createRequire(app + "package.json");
const { build } = require("esbuild");
const React = require("react"), { renderToStaticMarkup } = require("react-dom/server");
const result = await build({
  stdin: { contents: "export {PatternSetupTimeline} from './src/components/PatternSetupTimeline.tsx'; export {patternSetupTimeline} from './src/lib/patternSetupTimeline.ts';", resolveDir: app },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic", external: ["react", "react/jsx-runtime"], write: false, logLevel: "silent",
});
const module = { exports: {} };
new Function("require", "module", "exports", result.outputFiles[0].text)(require, module, module.exports);
const { PatternSetupTimeline, patternSetupTimeline } = module.exports;
const render = (timeline) => renderToStaticMarkup(React.createElement(PatternSetupTimeline, { timeline }));
const epoch = Date.parse("2026-01-05T00:00:00Z");
const bar = (i, o, h, l, c) => ({ t: new Date(epoch + i * 300_000).toISOString(), o, h, l, c, closed: true });
const rows = [bar(0, 99, 100, 98, 99.8), bar(1, 99.8, 100.5, 99.4, 99.9), bar(2, 99.9, 100.8, 99.5, 100.6)];
const setup = { kind: "PATTERN_BREAK", version: "pattern-break-close-confirmation/1", direction: "UP", signalBarTime: rows[0].t, confirmationTime: rows[2].t, breakoutLevel: 100 };
const receipt = (bars = rows, enabled = true) => patternSetupTimeline(setup, bars, setup.confirmationTime, enabled, epoch + 900_000);
const collect = (node) => !node || typeof node !== "object" ? [] : [node, ...React.Children.toArray(node.props?.children).flatMap(collect)];

test("selected setup renders semantic ordered events with exact UTC open and close clocks", () => {
  const timeline = receipt();
  assert.equal(timeline.state, "AVAILABLE");
  const tree = PatternSetupTimeline({ timeline });
  const events = collect(tree).filter((node) => node.type === "li");
  assert.equal(tree.props["aria-label"], "Setup event timeline");
  assert.equal(collect(tree).filter((node) => node.type === "ol").length, 1);
  assert.deepEqual(events.map((node) => node.props["data-setup-event"]), ["SIGNAL", "ENTRY_BREAK", "CLOSE_CONFIRMATION", "OUTCOME_MEASUREMENT_START"]);
  const times = events.map((event) => collect(event).filter((node) => node.type === "time").map((node) => node.props.dateTime));
  assert.deepEqual(times, [[rows[0].t], [rows[1].t], ["2026-01-05T00:15:00.000Z", rows[2].t], ["2026-01-05T00:15:00.000Z", rows[2].t]]);
  const html = render(timeline);
  for (const phrase of ["Signal candle", "First later OHLC break observation", "Local model close confirmation", "Outcome measurement origin", "Candle opens:", "M5 close instant:", "Confirmation candle opens:", "exact intrabar time", "executable fill are unknown", "confirmation close; occurrence counts and rates are unchanged", "PDF source context remains separate", "SHADOW_ONLY / NO_DECISION / live_apply_allowed=false"]) assert.ok(html.includes(phrase), phrase);
  assert.doesNotMatch(html, /win rate|<button|<input/);
});

test("open beyond reference is labelled as a gap without claiming a level trade", () => {
  const gap = receipt([rows[0], bar(1, 100.2, 100.5, 100.1, 100.3), rows[2]]);
  assert.equal(gap.breakObservation, "OPEN_GAP_BEYOND_LEVEL");
  assert.match(render(gap), /opened beyond the reference; OHLC does not establish a trade at that level/);
  assert.match(render(gap), /no entry or fill/);
});

test("withheld receipts expose reason and authority without prices or event times", () => {
  for (const timeline of [receipt(rows, false), patternSetupTimeline(setup, rows.slice(1), setup.confirmationTime, true, epoch + 900_000)]) {
    assert.equal(timeline.state, "WITHHELD");
    const html = render({ ...timeline, milestones: receipt().milestones, breakoutLevel: 123456789 });
    assert.match(html, /role="status"/);
    assert.ok(html.includes(timeline.reason.replace(/_/g, " ").toLowerCase()));
    assert.match(html, /SHADOW_ONLY \/ NO_DECISION/);
    assert.doesNotMatch(html, /<ol|<time|123456789/);
  }
});

test("timeline is memoized in the selected inspector and stays inside responsive detail flow", () => {
  const inspector = readFileSync(new URL("../mfe_ux_lab/cockpit/src/components/ChartPatternInspector.tsx", import.meta.url), "utf8");
  assert.match(inspector, /const setupTimeline = useMemo\(\(\) => signal\.pdfSetup \? patternSetupTimeline\(signal\.pdfSetup, bars, signal\.time, allowGeometry\) : null, \[signal\.pdfSetup, bars, signal\.time, allowGeometry\]\)/);
  assert.match(inspector, /setupTimeline && <PatternSetupTimeline timeline=\{setupTimeline\}/);
  const styles = readFileSync(new URL("../mfe_ux_lab/cockpit/src/components/chart-pattern-inspector.css", import.meta.url), "utf8");
  assert.match(styles, /\.pattern-setup-timeline\{min-width:0;overflow-wrap:anywhere\}/);
  assert.match(styles, /@media\(max-width:640px\)[\s\S]*max-height:65dvh/);
  const component = readFileSync(new URL("../mfe_ux_lab/cockpit/src/components/PatternSetupTimeline.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(component, /Date\.parse|new Date|toLocaleTime|price_action_knowledge_map|priceActionDetector|fetch\(/);
});
