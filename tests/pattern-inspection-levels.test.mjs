import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import test from "node:test";

const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const { build } = require("esbuild");
const bundle = await build({ entryPoints: [fileURLToPath(new URL("../mfe_ux_lab/cockpit/src/lib/patternInspectionLevels.ts", import.meta.url))], bundle: true, write: false, metafile: true, platform: "node", format: "esm", logLevel: "silent" });
const { patternInspectionLevels: describe, patternInspectionLevelRail: rail } = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));

// Synthetic display receipts are test inputs only, not OHLC/outcome fixtures.
const time = "2026-11-04T01:15:00.000Z";
const reference = "2026-11-04T01:10:00.000Z";
const fixture = (direction = "UP") => {
  const up = direction === "UP", entry = 100, target = up ? 122 : 78, invalidation = up ? 90 : 110;
  const anchor = { t: time, o: 99, h: 101, l: 98, c: entry, closed: true };
  const geometry = { entry, target, invalidation, localAtr: 10 };
  const setup = { kind: "PATTERN_BREAK", direction, confirmationTime: time, buildupTimes: [reference], signalBarTime: reference, breakoutLevel: up ? 99 : 101, protectionReference: invalidation };
  const view = { anchor, index: 15, from: 14, to: 16, rows: [{ ...anchor, t: reference, o: up ? 99 : 101, c: up ? 99 : 101, h: up ? 99 : 102, l: up ? 98 : 101 }, anchor, { ...anchor, t: "2026-11-04T01:20:00.000Z" }], direction, geometry,
    study: { ...geometry, state: "INCOMPLETE", observedBars: 1, horizon: 24, exitIndex: null, resolvedAt: null },
    technicalStudy: { state: "INCOMPLETE", direction, protection: invalidation, obstacle: up ? 110 : 90, roomState: "MEASURED", setupKind: setup.kind, authority: "SHADOW_ONLY / NO_DECISION", sourcePages: [13, 51, 107], observedBars: 1 },
    mode: "setup", low: 70, high: 130, outcome: up ? "UP" : "DOWN" };
  return { view, setup };
};
const checkRail = (output) => {
  assert.ok(output.every(item => item.labelY >= 14 && item.labelY <= 178));
  const ordered = [...output].sort((a, b) => a.labelY - b.labelY);
  for (let i = 1; i < ordered.length; i++) assert.ok(ordered[i].labelY - ordered[i - 1].labelY >= 18 - 1e-10);
};
const deepFreeze = (value) => { if (value && typeof value === "object") { Object.values(value).forEach(deepFreeze); Object.freeze(value); } return value; };

test("selected UP and DOWN receipts retain seven distinct exact evidence levels", () => {
  for (const direction of ["UP", "DOWN"]) {
    const { view, setup } = fixture(direction);
    const result = describe(view, setup);
    assert.deepEqual(result.map(item => item.id), ["atr-entry", "atr-target", "atr-invalidation", "technical-protection", "technical-obstacle", "setup-break", "setup-protection"]);
    assert.deepEqual(result.map(item => item.shortLabel), ["AE", "AT", "AI", "TP", "TO", "SB", "SP"]);
    assert.deepEqual(result.map(item => item.level), [100, view.geometry.target, view.geometry.invalidation, view.technicalStudy.protection, view.technicalStudy.obstacle, setup.breakoutLevel, setup.protectionReference]);
    assert.equal(result[0].label, direction === "UP" ? "LONG ENTRY" : "SHORT ENTRY");
    assert.equal(result.filter(item => item.level === setup.protectionReference).length, 3, "equal ATR/technical/setup protection remains three evidence roles");
    assert.ok(result.every(item => /fill/.test(item.meaning)));
    assert.equal(result[0].category, "ATR"); assert.equal(result[3].category, "TECHNICAL"); assert.equal(result[5].category, "SETUP");
  }
});

test("all seven coincident or tightly clustered labels fit without moving price geometry", () => {
  const { view, setup } = fixture();
  const descriptors = describe(view, setup);
  for (const position of [0, 0.01, 50, 99.99, 100]) {
    const exact = descriptors.map(item => ({ ...item, level: position }));
    const output = rail(exact, 0, 100);
    assert.equal(output.length, 7); checkRail(output);
    assert.ok(output.every(item => item.priceY === 14 + (1 - position / 100) * 164));
    assert.deepEqual(output.map(item => item.level), exact.map(item => item.level));
    assert.deepEqual(rail(exact, 0, 100), output, "coincident tie layout is deterministic");
    const clustered = descriptors.map((item, index) => ({ ...item, level: position + index * 0.0001 }));
    checkRail(rail(clustered, 0, 100));
  }
});

test("edge and outside-range labels stay bounded while actual price coordinates remain exact", () => {
  const { view, setup } = fixture();
  const descriptors = describe(view, setup).map((item, index) => ({ ...item, level: [-20, 0, 1, 50, 99, 100, 120][index] }));
  const output = rail(descriptors, 0, 100);
  checkRail(output);
  assert.ok(output[0].priceY > 178); assert.ok(output[6].priceY < 14);
  assert.equal(output[0].outsideRange, true); assert.equal(output[6].outsideRange, true);
  assert.equal(output[1].outsideRange, false); assert.equal(output[5].outsideRange, false);
  assert.equal(output[0].level, -20); assert.equal(output[6].level, 120);
  for (const item of output) assert.equal(item.priceY, 14 + (1 - item.level / 100) * 164);
  assert.deepEqual(rail([], 0, 100), []);
  for (const [low, high] of [[0, 0], [2, 1], [NaN, 100], [0, Infinity], [-1e308, 1e308]]) assert.deepEqual(rail(descriptors, low, high), []);
});

test("missing, neutral, withheld and mismatched study geometry cannot acquire directional labels", () => {
  const { view, setup } = fixture();
  for (const altered of [
    { ...view, study: null }, { ...view, direction: "NEUTRAL" },
    { ...view, geometry: { ...view.geometry, target: null } },
    { ...view, study: { ...view.study, state: "INVALID_SETUP" } },
    { ...view, study: { ...view.study, state: "NEUTRAL" } },
    { ...view, study: { ...view.study, target: 999 } },
    { ...view, anchor: { ...view.anchor, closed: false } },
  ]) assert.deepEqual(describe(altered, setup), []);
  for (const value of [NaN, Infinity, -Infinity, null, "122"]) {
    assert.deepEqual(describe({ ...view, geometry: { ...view.geometry, target: value }, study: { ...view.study, target: value } }, setup), []);
  }
});

test("stale or noncanonical setup identity cannot label the current technical or setup levels", () => {
  const { view, setup } = fixture();
  const onlyAtr = describe(view).map(item => item.id);
  for (const confirmationTime of [reference, time.replace("Z", ""), time.replace("Z", "+00:00"), time.replace(".000Z", ".001Z"), "2026-11-04T01:16:00Z", "2026-02-30T01:15:00Z"]) {
    assert.deepEqual(describe(view, { ...setup, confirmationTime }).map(item => item.id), onlyAtr);
  }
  assert.deepEqual(describe(view, { ...setup, direction: "DOWN" }).map(item => item.id), onlyAtr);
  assert.deepEqual(describe(view, { ...setup, confirmationTime: time.replace(".000Z", "Z") }), describe(view, setup), "supported UTC seconds spelling selects the same setup");
  const aliased = { ...view, anchor: { ...view.anchor, t: time.replace(".000Z", "Z") } };
  assert.deepEqual(describe(aliased, setup), describe(view, setup));
  const invalidAnchor = { ...view, anchor: { ...view.anchor, t: time.replace("Z", "+00:00") } };
  assert.deepEqual(describe(invalidAnchor, setup), []);
  assert.deepEqual(describe({ ...view, rows: [...view.rows, { ...view.anchor, t: time.replace(".000Z", "Z") }] }, setup), []);
  assert.equal(describe(view, { ...setup, buildupTimes: ["2026-11-04T01:10:00+00:00"] }).filter(item => item.category === "SETUP").length, 0);
});

test("malformed and withheld technical levels are omitted independently", () => {
  const { view, setup } = fixture();
  for (const value of [NaN, Infinity, -Infinity, null, "90"]) {
    const result = describe({ ...view, technicalStudy: { ...view.technicalStudy, protection: value } }, { ...setup, breakoutLevel: value });
    assert.ok(!result.some(item => item.id === "technical-protection" || item.id === "setup-break"));
    assert.ok(!result.some(item => item.category === "TECHNICAL"), "unattested protection cannot borrow an obstacle from a stale technical receipt");
  }
  for (const alteration of [{ roomState: "WITHHELD" }, { state: "WITHHELD" }, { state: "INVALID_SETUP" }, { direction: "DOWN" }, { setupKind: "PATTERN_BREAK_COMBI" }, { authority: "LIVE" }]) {
    assert.equal(describe({ ...view, technicalStudy: { ...view.technicalStudy, ...alteration } }, setup).filter(item => item.category === "TECHNICAL").length, 0);
  }
  const partial = describe({ ...view, technicalStudy: { ...view.technicalStudy, state: "UNAVAILABLE", obstacle: null } }, setup);
  assert.ok(partial.some(item => item.id === "technical-protection")); assert.ok(!partial.some(item => item.id === "technical-obstacle"));
  assert.equal(rail([{ ...describe(view)[0], level: NaN }], 0, 100).length, 0);
});

test("display helpers preserve selected evidence, provenance, states and causal geometry", () => {
  const { view, setup } = deepFreeze(fixture());
  const before = JSON.stringify({ view, setup });
  const descriptors = deepFreeze(describe(view, setup));
  rail(descriptors, view.low, view.high);
  assert.equal(JSON.stringify({ view, setup }), before);
  const futureChanged = { ...view, mode: "context", outcome: "DOWN", rows: view.rows.map((bar, index) => index === 2 ? { ...bar, c: 1e6, h: 1e6 } : bar), study: { ...view.study, state: "TARGET_FIRST", observedBars: 24 }, technicalStudy: { ...view.technicalStudy, state: "PROTECTION_FIRST", observedBars: 24 } };
  assert.deepEqual(describe(futureChanged, setup), descriptors, "observed outcomes and future display bars do not reprice labels");
  assert.equal(Object.keys(bundle.metafile.inputs).length, 1, "type-only receipt imports must not load detector, map or full-window runtime graphs");
});


test("same-anchor source receipts require their exact unique closed signal edge", () => {
  const { view, setup } = fixture();
  const onlyAtr = describe(view).map(item => item.id);
  for (const changed of [
    { ...setup, breakoutLevel: setup.breakoutLevel + 1 },
    { ...setup, signalBarTime: time },
    { ...setup, signalBarTime: reference.replace("Z", "+00:00") },
    { ...setup, signalBarTime: "2026-11-04T01:05:00Z" },
  ]) assert.deepEqual(describe(view, changed).map(item => item.id), onlyAtr);
  for (const row of [
    { ...view.rows[0], closed: false }, { ...view.rows[0], h: NaN },
    { ...view.rows[0], c: 101 }, { ...view.rows[0], o: 101 },
  ]) assert.deepEqual(describe({ ...view, rows: [row, ...view.rows.slice(1)] }, setup).map(item => item.id), onlyAtr);
  assert.deepEqual(describe({ ...view, rows: [...view.rows, { ...view.rows[0], t: reference.replace(".000Z", "Z") }] }, setup).map(item => item.id), onlyAtr);
  const changedProtection = describe(view, { ...setup, protectionReference: 85 });
  assert.ok(!changedProtection.some(item => item.category === "TECHNICAL"));
  assert.equal(changedProtection.find(item => item.id === "setup-protection").level, 85);
  const combi = { ...setup, kind: "PATTERN_BREAK_COMBI", insideBarTimes: ["2026-11-04T01:05:00Z", reference] };
  const combiView = { ...view, technicalStudy: { ...view.technicalStudy, setupKind: combi.kind } };
  assert.ok(describe(combiView, combi).some(item => item.category === "TECHNICAL"), "last inside bar attests combi break edge");
  assert.deepEqual(describe(combiView, { ...combi, insideBarTimes: [reference, time] }).map(item => item.id), onlyAtr);
});
