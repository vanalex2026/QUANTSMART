import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit/", import.meta.url));
const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const { build } = require("esbuild");
const bundled = await build({
  stdin: {
    contents: 'export * from "./src/lib/sourceConceptStatus.ts";',
    resolveDir: app,
  },
  bundle: true,
  format: "esm",
  platform: "node",
  write: false,
  logLevel: "silent",
});
const api = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`);

const source = api.getSourceConceptReviewStatus("SOURCE_NOTES");
assert.deepEqual(source, {
  status: "SOURCE_REVIEW_ONLY",
  dataStatus: "UNAVAILABLE",
  outcomeStatus: "WITHHELD",
  authority: "SHADOW_ONLY / NO_DECISION / live_apply_allowed=false",
  label: "SOURCE_REVIEW_ONLY / data UNAVAILABLE / outcome WITHHELD",
});
assert.equal(api.getSourceConceptReviewStatus("GEOMETRY_PROXY"), null);
assert.match(source.label, /SOURCE_REVIEW_ONLY/);
assert.match(source.label, /UNAVAILABLE/);
assert.match(source.label, /WITHHELD/);

console.log("SOURCE CONCEPT STATUS PASS: source notes expose explicit review-only, unavailable and withheld state.");
