import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit/", import.meta.url));
const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const { build } = require("esbuild");
const bundled = await build({
  stdin: { contents: 'export * from "./src/lib/pdfSignalVerification.ts";', resolveDir: app },
  bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent",
});
const api = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`);

const epoch = Date.parse("2026-01-05T00:00:00.000Z");
const bars = Array.from({ length: 120 }, (_, index) => ({
  t: new Date(epoch + index * 300_000).toISOString(),
  o: 2000 + index * 0.02,
  h: 2001 + index * 0.02,
  l: 1999 + index * 0.02,
  c: 2000.5 + index * 0.02,
  closed: true,
}));
const input = { bars, selectedTime: bars.at(-1).t, direction: "UP", nowMs: epoch + 121 * 300_000 };
const receipt = api.verifyPdfSignalReceipt(input, "VERIFIED_MT5_CLOSED");
assert.equal(receipt.state, "PASS");
assert.equal(receipt.deterministicRepeat, true);
assert.equal(receipt.futureRowInvariant, true);
assert.equal(receipt.countsReconcile, true);
assert.equal(receipt.conceptIdsReconcile, true);
assert.equal(receipt.live_apply_allowed, false);
const middle = api.verifyPdfSignalReceipt({ ...input, selectedTime: bars[90].t }, "VERIFIED_MT5_CLOSED");
assert.equal(middle.state, "PASS");
assert.equal(middle.futureRowInvariant, true, "mutating the first excluded row cannot rewrite the selected receipt");
const withheld = api.verifyPdfSignalReceipt({ ...input, enabled: false }, "UNAVAILABLE");
assert.equal(withheld.state, "WITHHELD");
assert.equal(withheld.reason, "VERIFIED_CLOSED_TAPE_UNAVAILABLE");
const unsupportedSource = api.verifyPdfSignalReceipt(input, "UNVERIFIED_BRIDGE");
assert.equal(unsupportedSource.state, "WITHHELD");
assert.equal(unsupportedSource.reason, "UNSUPPORTED_VERIFICATION_SOURCE");
assert.equal(unsupportedSource.source, "UNAVAILABLE");

console.log("PDF SIGNAL VERIFICATION PASS: deterministic repeat, 23-count reconciliation and future-row invariance are explicit.");
