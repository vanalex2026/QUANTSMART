import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const root = fileURLToPath(new URL("..", import.meta.url));
const app = path.join(root, "mfe_ux_lab", "cockpit");
const { build } = createRequire(path.join(app, "package.json"))("esbuild");
const bundle = await build({
  stdin: { contents: "export * from './src/components/PdfAssumptionsPanel.tsx';", resolveDir: app },
  bundle: true, platform: "node", format: "esm", write: false, logLevel: "silent", loader: { ".css": "empty" },
});
const api = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));
const source = readFileSync(path.join(app, "src", "components", "PdfAssumptionsPanel.tsx"), "utf8");
const css = readFileSync(path.join(app, "src", "components", "pdf-assumptions-panel.css"), "utf8");
assert.equal(api.EMPTY_PDF_ASSUMPTIONS.bracket.entryPrice, null);
assert.equal(api.EMPTY_PDF_ASSUMPTIONS.bracket.unit, "QUOTE_PRICE_UNITS");
assert.equal(api.EMPTY_PDF_ASSUMPTIONS.reversal.provenance, "USER_SUPPLIED");
assert.deepEqual(api.toPdfDetectorAssumptions(api.EMPTY_PDF_ASSUMPTIONS), {});
const explicit = structuredClone(api.EMPTY_PDF_ASSUMPTIONS);
Object.assign(explicit.bracket, { entryPrice: 2000, stopPrice: 1998, targetPrice: 2004, spreadPrice: 0.2, slippagePrice: 0.1, commissionQuote: 0.05 });
Object.assign(explicit.sizing, { equity: 10000, riskPct: 0.75, stopDistance: 2, contractSize: 100, lotStep: 0.01, minLot: 0.01 });
Object.assign(explicit.reversal, { level: 1997, eventTime: "2026-01-01T00:00:00.000Z", identity: "external-reversal-1" });
const projected = api.toPdfDetectorAssumptions(explicit);
assert.equal(projected.bracket.unit, "QUOTE_PRICE_UNITS");
assert.equal(projected.bracket.source, "USER_SUPPLIED");
assert.equal(projected.sizing.stopDistance, 2);
assert.equal(projected.reversalLevel, 1997);
assert.deepEqual(projected.reversalEvent, { time: "2026-01-01T00:00:00.000Z", identity: "external-reversal-1" });
assert.match(source, /data-pdf-assumptions="user-supplied"/);
assert.match(source, /SHADOW_ONLY \/ NO_DECISION \/ live_apply_allowed=false/);
assert.match(source, /Blank fields stay unavailable/);
assert.match(source, /Validated event identity/);
assert.doesNotMatch(source, /pip distance|auto-calculated/i);
assert.match(source, /onChange: \(value: PdfAssumptionsValue\)/);
assert.match(source, /unit: "QUOTE_PRICE_UNITS"/);
assert.match(source, /provenance: "USER_SUPPLIED"/);
assert.equal((source.match(/<fieldset disabled=\{disabled\}>/g) ?? []).length, 3, "bracket, sizing and reversal inputs keep separate accessible groups");
assert.equal((source.match(/<legend>/g) ?? []).length, 3, "each assumptions group has one legend");
assert.match(css, /@media\(max-width:420px\)[^{]*\{[\s\S]*?\.pdf-assumptions-field input\{height:36px\}/, "phone inputs retain a 36px touch target at the one-column breakpoint");
console.log("PDF ASSUMPTIONS PANEL PASS: quote-price fields, explicit provenance, bilingual copy and no-inference authority are exposed for Microscope integration.");
