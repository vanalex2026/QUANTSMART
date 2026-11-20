import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit/", import.meta.url));
const { build } = createRequire(app + "package.json")("esbuild");
const bundled = await build({
  stdin: { contents: 'export * from "./src/lib/pdfSignalTranslation.ts";', resolveDir: app },
  bundle: true,
  format: "esm",
  platform: "node",
  write: false,
  logLevel: "silent",
});
const api = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`);
const artifact = JSON.parse(readFileSync(new URL("../artifacts/pdf-signal-translation-future-duplicate-audit.json", import.meta.url), "utf8"));

const epoch = Date.parse("2026-01-05T00:00:00.000Z");
const bars = Array.from({ length: 100 }, (_, index) => ({
  t: new Date(epoch + index * 300_000).toISOString(),
  o: 100 + index * 0.02,
  h: 101 + index * 0.02,
  l: 99 + index * 0.02,
  c: 100.5 + index * 0.02,
  closed: true,
}));
const selectedTime = bars.at(-1).t;
const input = { bars, selectedTime, direction: "UP", nowMs: epoch + 101 * 300_000 };
const baseline = api.translatePdfSignalConcepts(input);

const futureDuplicate = api.translatePdfSignalConcepts({
  ...input,
  bars: [...bars, { ...bars[20], o: 999, h: 1000, l: 998, c: 999.5 }],
});
assert.deepEqual(futureDuplicate, baseline, "a duplicate identity after selectedTime is future evidence and cannot rewrite the causal descriptor");

const duplicateSelected = api.translatePdfSignalConcepts({
  ...input,
  bars: [...bars, { ...bars.at(-1) }],
});
assert.equal(duplicateSelected.reason, "DUPLICATE_CAUSAL_IDENTITY", "duplicate selected identities remain invalid");

assert.equal(artifact.schema, "quantsmart.pdf-signal-translation-future-duplicate-audit/1");
assert.equal(artifact.result, "PASS");
assert.equal(artifact.future_duplicate_ignored, true);
assert.equal(artifact.selected_duplicate_rejected, true);
assert.equal(artifact.authority, "SHADOW_ONLY / NO_DECISION / live_apply_allowed=false");

console.log("PDF TRANSLATION FUTURE-DUPLICATE PASS: future duplicate rows stay outside the causal prefix while duplicate selected identities fail closed.");
