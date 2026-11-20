import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const root = fileURLToPath(new URL("..", import.meta.url));
const app = path.join(root, "mfe_ux_lab", "cockpit");
const { build } = createRequire(path.join(app, "package.json"))("esbuild");
const bundle = await build({
  stdin: { contents: "export * from './src/lib/simSizingCostReceipt.ts';", resolveDir: app },
  bundle: true, platform: "node", format: "esm", write: false, logLevel: "silent",
});
const api = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));
const artifact = JSON.parse(readFileSync(path.join(root, "docs", "PHASE3_SIZING_COST_ASSUMPTIONS_RECEIPT.json"), "utf8"));

const risk = { sizingMode: "PERCENT_EQUITY", fixedRValue: 1, initialEquity: 10000, riskPctEquity: 0.75 };
const cost = {
  spread: { overlap: 0.15, single: 0.2, asia: 0.3, rollover: 0.9, newsMult: 5, status: "PROVISIONAL" },
  commissionRT_per_lot_usd: 7,
  slippage: { baseTicks: 1, atrK: 0.05, slPenaltyTicks: 2, seed: 42, status: "PROVISIONAL" },
  swap: { longUsdPerLotNight: -7, shortUsdPerLotNight: -4, wedX3: true, status: "PROVISIONAL" },
};
const receipt = api.buildSizingCostAssumptionsReceipt({
  symbol: "XAUUSD",
  risk,
  cost,
  sizingSource: "USER_SUPPLIED",
  costSource: "USER_SUPPLIED",
  bracket: { entryPrice: 2000.25, stopPrice: 1998.75, targetPrice: 2003.25, unit: "QUOTE_PRICE_UNITS", source: "USER_SUPPLIED" },
});

assert.equal(receipt.schema, "quantsmart.phase3.sizing-cost-assumptions-receipt/1");
assert.equal(receipt.status, "USER_SUPPLIED_ASSUMPTIONS_ONLY");
assert.equal(receipt.implementation_change, false);
assert.equal(receipt.source_status, "SOURCE_REVIEW_ONLY");
assert.equal(receipt.data_status, "UNAVAILABLE");
assert.equal(receipt.outcome_status, "WITHHELD");
assert.deepEqual(receipt.authority, { focused_chart: "SHADOW_ONLY", decision: "NO_DECISION", live_apply_allowed: false });
assert.equal(receipt.bracket.pdf_pip_distances_used, false);
assert.equal(receipt.bracket.xauusd_pip_translation, false);
assert.deepEqual(receipt.broker_execution, { fill_authority: "NONE", order_authority: "NONE", broker_fill_observed: false });
assert.equal(artifact.schema, receipt.schema);
assert.equal(artifact.provenance.sizing, "DEFAULT_PROVISIONAL");
assert.equal(artifact.provenance.costs, "DEFAULT_PROVISIONAL");
assert.equal(artifact.implementation_change, false);
assert.equal(artifact.authority.live_apply_allowed, false);
assert.equal(artifact.bracket.pdf_pip_distances_used, false);
assert.equal(artifact.bracket.xauusd_pip_translation, false);
assert.equal(artifact.broker_execution.order_authority, "NONE");

assert.throws(() => api.buildSizingCostAssumptionsReceipt({ symbol: "XAUUSD", risk, cost, bracket: { entryPrice: 1, unit: "PIPS", source: "USER_SUPPLIED" } }), /INVALID_BRACKET_ASSUMPTION_UNIT/);
assert.throws(() => api.buildSizingCostAssumptionsReceipt({ symbol: "XAUUSD", risk, cost, bracket: { entryPrice: 1, pipDistance: 20, unit: "QUOTE_PRICE_UNITS", source: "USER_SUPPLIED" } }), /PDF_PIP_DISTANCE_FORBIDDEN/);
assert.throws(() => api.buildSizingCostAssumptionsReceipt({ symbol: "XAUUSD", risk: { ...risk, fixedRValue: 0 }, cost }), /INVALID_SIZING_COST_ASSUMPTION/);

console.log("PHASE 3 SIZING/COST RECEIPT PASS: explicit user assumptions remain source-only, quote-unit based and carry no fill/order authority.");
