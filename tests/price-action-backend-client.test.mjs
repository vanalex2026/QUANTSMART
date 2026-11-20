import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit", import.meta.url));
const require = createRequire(app + "/package.json");
const { build } = require("esbuild");
const bundle = await build({
  stdin: { contents: "export * from './src/lib/priceActionBackend.ts';", resolveDir: app },
  bundle: true,
  format: "esm",
  platform: "node",
  write: false,
  logLevel: "silent",
});
const api = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));

globalThis.window = { setTimeout, clearTimeout };
globalThis.document = { hidden: false };
const calls = [];
globalThis.fetch = async (url, init = {}) => {
  calls.push({ url, init });
  if (url === "/api/research/jobs") return new Response(JSON.stringify({ id: "job-1", status: "queued" }), { status: 202, headers: { "content-type": "application/json" } });
  if (url === "/api/research/jobs/job-1") return new Response(JSON.stringify({ id: "job-1", status: "done" }), { status: 200, headers: { "content-type": "application/json" } });
  return new Response(JSON.stringify({
    result: {
      ok: true,
      evidence: {},
      assessments: [],
      markers: [],
      schema: "quantsmart.research.price-action/1",
      operation: "price_action",
      result_hash: "a".repeat(64),
      provenance: {
        tape_hash: "b".repeat(64),
        symbol: "XAUUSD",
        timeframe: "M5",
        bars: 2,
        authority: "SHADOW_ONLY / NO_DECISION",
        live_apply_allowed: false,
        canonical_scope: "BROWSER_SUPPLIED_BARS_TRANSITIONAL",
        canonical_scope_pending: true,
      },
    },
    input_hash: "c".repeat(64),
    engine_hash: "d".repeat(64),
    provenance: { dataHash: "b".repeat(64) },
  }), { status: 200, headers: { "content-type": "application/json" } });
};

const result = await api.runPriceActionDetectorJob([
  { i: 7, t: "2026-01-01T00:00:00.000Z", o: 100, h: 101, l: 99, c: 100.5, closed: true },
  { i: 8, t: "2026-01-01T00:05:00.000Z", o: 100.5, h: 102, l: 100, c: 101, closed: true },
], { symbol: "XAUUSD" });

const body = JSON.parse(calls[0].init.body);
assert.equal(body.kind, "detector");
assert.equal(body.analysis, "price_action");
assert.equal(body.options.timeframe, "M5");
assert.equal(body.bars[0].i, undefined, "backend payload must omit UI-only ordinal fields");
assert.equal(result.researchReceipt.job_id, "job-1");
assert.equal(result.researchReceipt.schema, "quantsmart.research.price-action/1");
assert.equal(result.researchReceipt.live_apply_allowed, false);
assert.equal(result.researchReceipt.canonical_scope, "BROWSER_SUPPLIED_BARS_TRANSITIONAL");

console.log("PRICE ACTION BACKEND CLIENT PASS: detector jobs preserve validated receipt metadata and strip presentation-only indices.");
