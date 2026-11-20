import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url), "utf8"));
const map = read("../docs/price_action_knowledge_map.json");
const receipt = read("../artifacts/wave9-knowledge-navigation-source-label-audit.json");
const book = readFileSync(new URL("../mfe_ux_lab/cockpit/src/components/PriceActionBookIndex.tsx", import.meta.url), "utf8");
const inspector = readFileSync(new URL("../mfe_ux_lab/cockpit/src/components/ChartPatternSourceNotes.tsx", import.meta.url), "utf8");
const status = readFileSync(new URL("../mfe_ux_lab/cockpit/src/lib/sourceConceptStatus.ts", import.meta.url), "utf8");

assert.equal(receipt.source_sha256, map.source.sha256);
assert.equal(receipt.authority, "SHADOW_ONLY / NO_DECISION / live_apply_allowed=false");
assert.equal(receipt.implementation_change, true);
assert.equal(receipt.status, "SOURCE_REVIEW_ONLY");
assert.equal(receipt.data_status, "UNAVAILABLE");
assert.equal(receipt.outcome_status, "WITHHELD");
assert.equal(receipt.gap.id, "BOOK_INDEX_SOURCE_STATUS_OMISSION");

const sourceConcepts = map.concepts.filter(concept => concept.implementation === "SOURCE_NOTES");
const sourceLenses = map.source_lenses.filter(lens => lens.implementation === "SOURCE_NOTES");
assert.ok(sourceConcepts.length > 0, "the map must retain source-only concepts");
assert.ok(sourceLenses.length > 0, "the map must retain source-only lenses");
for (const concept of sourceConcepts) {
  assert.ok(concept.pages.length > 0, `${concept.id} must retain page anchors`);
  assert.ok(concept.cues.length >= 2 && concept.abstain.length >= 2, `${concept.id} must retain review and abstain cues`);
}
for (const lens of sourceLenses) {
  assert.ok(lens.pages.length > 0, `${lens.id} must retain page anchors`);
  const fixtures = map.held_out_source_fixtures.filter(fixture => fixture.lens_id === lens.id);
  assert.ok(fixtures.length > 0, `${lens.id} must retain a held-out fixture`);
  for (const fixture of fixtures) {
    assert.equal(fixture.status, "SOURCE_REVIEW_ONLY");
    assert.equal(fixture.data_status, "UNAVAILABLE");
    assert.equal(fixture.outcome_status, "WITHHELD");
  }
}

assert.match(book, /Source interpretation only; these notes do not add detector occurrences or measured outcomes/);
assert.ok(book.includes("SOURCE_NOTES") && book.includes("SHADOW_ONLY / NO_DECISION / live_apply_allowed=false"));
assert.match(book, /getSourceConceptReviewStatus\(lens\.implementation\)/);
assert.match(book, /reviewStatus\.label\} \/ \{reviewStatus\.authority\}/);
assert.match(book, /data-source-review-status/);
assert.match(inspector, /getSourceConceptReviewStatus/);
assert.match(inspector, /data-source-review-status/);
assert.match(status, /SOURCE_REVIEW_ONLY \/ data UNAVAILABLE \/ outcome WITHHELD/);

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit/", import.meta.url));
const require = createRequire(`${app}/package.json`);
const { build } = require("esbuild");
const { renderToStaticMarkup } = require("react-dom/server");
globalThis.__bookUseState = initial => [typeof initial === "number" ? 3 : initial, () => {}];
const bundled = await build({
  stdin: { contents: book.replace('import { useState } from "react";', "const useState = globalThis.__bookUseState;"), resolveDir: `${app}/src/components`, loader: "tsx" },
  bundle: true,
  format: "esm",
  platform: "node",
  jsx: "automatic",
  write: false,
  logLevel: "silent",
});
const { PriceActionBookIndex } = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`);
const rendered = renderToStaticMarkup(PriceActionBookIndex({ map, onOpenConcept() {} }));
assert.match(rendered, /SOURCE_REVIEW_ONLY \/ data UNAVAILABLE \/ outcome WITHHELD/);

console.log("WAVE 9 KNOWLEDGE NAVIGATION SOURCE LABEL AUDIT PASS: BookIndex source-only navigation exposes explicit review-only, unavailable and withheld status.");
