import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const mapPath = path.join(root, "docs", "price_action_knowledge_map.json");
const componentPath = path.join(root, "mfe_ux_lab", "cockpit", "src", "components", "PriceActionKnowledgePanel.tsx");
const stylePath = path.join(root, "mfe_ux_lab", "cockpit", "src", "components", "price-action-knowledge-panel.css");
const pageIndexPath = path.join(root, "docs", "price_action_page_index.json");

test("price action knowledge map has panel-ready concepts and setup families", () => {
  const map = JSON.parse(fs.readFileSync(mapPath, "utf8"));
  assert.equal(map.authority, "SHADOW_ONLY / NO_DECISION / live_apply_allowed=false");
  assert.match(map.schema, /^quantsmart\.price-action-knowledge-map\/\d+$/);
  assert.match(map.source.sha256, /^[a-f0-9]{64}$/i, "PDF source must carry a durable SHA-256 attestation");
  assert.equal(map.concepts.length, 23);
  assert.ok(map.concepts.every((concept) => concept.id && concept.definition && concept.cues?.length && concept.abstain?.length && concept.pages?.length));
  assert.equal(map.setup_families.length, 4);
  assert.ok(map.relationships?.length >= 5, "knowledge map must expose source-grounded concept relationships");
  const conceptIds = new Set(map.concepts.map((concept) => concept.id));
  assert.ok(map.relationships.every((relationship) => conceptIds.has(relationship.from) && conceptIds.has(relationship.to) && relationship.from !== relationship.to && relationship.label && relationship.pages?.length), "relationships must resolve to anchored concepts");
});

test("knowledge panel is read-only and source-grounded", () => {
  const source = fs.readFileSync(componentPath, "utf8");
  const style = fs.readFileSync(stylePath, "utf8");
  assert.match(source, /price_action_knowledge_map\.json/);
  assert.match(source, /PRICE_ACTION_KNOWLEDGE_PROVENANCE/);
  assert.match(source, /attestation/);
  assert.match(source, /onPatternChange/);
  assert.match(source, /Abstain cues/);
  assert.match(source, /setupFamilies: "Setup families"/);
  assert.match(source, /sourceConceptLenses: "Source concept lenses"/);
  assert.match(source, /selectedFamily\.concept_ids\.map/);
  assert.match(source, /relatedConcepts: "Related concepts"/);
  assert.match(source, /map\.relationships\.filter/);
  assert.match(source, /const selectRelatedConcept = \(id: string\)[\s\S]*setQuery\(""\)[\s\S]*selectConcept\(id\)/, "relationship navigation must clear a prior search filter");
  assert.match(source, /const hasConcept = \(id: string\) => map\.concepts\.some/, "relationship navigation must validate concept endpoints");
  assert.match(source, /&& hasConcept\(relationship\.from\) && hasConcept\(relationship\.to\)/, "unknown relationship endpoints must be omitted from the panel");
  assert.match(source, /if \(!hasConcept\(id\)\) return;/, "unknown related concept clicks must be inert");
  assert.match(source, /onClick=\{\(\) => selectRelatedConcept\(otherId\)\}/);
  assert.match(source, /p-akp-related-direction/, "relationship cards must show explicit from/to endpoint direction");
  assert.match(source, /copy\.edgeLabel[\s\S]*relationship\.label/, "relationship cards must distinguish the directed edge label");
  assert.match(source, /copy\.edgeSourcePages[\s\S]*pageLabel\(relationship\.pages\)/, "relationship cards must label edge source pages separately");
  assert.match(source, /data-open-endpoint=\{`open endpoint: \$\{conceptName\(otherId\)\}`\}/, "relationship navigation must identify the endpoint opened by the card");
  assert.match(source, /useRef, useState/, "keyboard relationship navigation must retain a destination button reference");
  assert.match(source, /focusConceptAfterNavigation\.current = id/, "relationship navigation must queue destination focus restoration");
  assert.match(source, /conceptButtonRefs\.current\[destination\]\?\.focus\(\)/, "relationship navigation must return focus to the destination concept");
  assert.match(source, /aria-current=\{concept\.id === selected\?\.id \? "page" : undefined\}/, "the active concept must expose current-page state to assistive technology");
  assert.match(source, /search PDF concepts|Search PDF concepts/);
  assert.match(source, /indexedConcepts: "indexed concepts"/);
  assert.match(source, /clearSearch: "Clear search"/);
  assert.match(source, /detailsOpen/);
  assert.match(source, /aria-controls="price-action-knowledge-details"/);
  assert.match(source, /aria-hidden=\{!detailsOpen\}/, "collapsed details must be hidden from assistive technology");
  assert.match(source, /detailsRef\.current\?\.contains\(document\.activeElement\)[\s\S]*toggleRef\.current\?\.focus\(\)/, "closing details must restore focus to the toggle");
  assert.match(source, /event\.key !== "Escape"[\s\S]*setDetailsOpen\(false\)[\s\S]*toggleRef\.current\?\.focus\(\)/, "Escape must close details and return focus to the toggle");
  assert.match(source, /role="region" aria-labelledby="price-action-knowledge-title"/, "expanded details need an accessible region name");
  assert.match(source, /p-akp-details is-collapsed/);
  assert.match(source, /concepts\.find\(\(concept\) => concept\.id === selectedId\)/, "filtered knowledge results must keep the detail pane selection consistent");
  assert.match(source, /currentPattern === null[\s\S]*setSelectedId\(""\)/, "an explicitly empty snapshot lens must clear the panel selection");
  assert.match(source, /selectedId \? getPriceActionKnowledge\(selectedId\)/, "the panel must not fall back to a PDF concept when the restored lens is empty");
  assert.match(source, /if \(!query\.trim\(\) \|\| !concepts\.length \|\| concepts\.some\(\(concept\) => concept\.id === selectedId\)\) return;[\s\S]*setSelectedId\(fallback\.id\);[\s\S]*onPatternChange\?\.\(fallback\.id\)/, "filtered knowledge fallback must synchronize the chart host selection");
  assert.match(source, /noConcept: "No indexed concept matches"/);
  assert.doesNotMatch(source, /order_send|execute|place order/i);
  assert.match(style, /content:"\u2192"/, "setup family steps must use a visible arrow separator");
  assert.match(style, /content:"\u2193"/, "mobile setup family steps must use a visible downward separator");
  assert.doesNotMatch(style, /content:\"\?\"/, "knowledge panel must not render a corrupted question-mark separator");
  assert.match(style, /p-akp-details\.is-collapsed[\s\S]*p-akp-families[\s\S]*display:none/, "knowledge details must collapse the dense family/footer content together");
  assert.match(style, /p-akp-concepts button:hover,\.p-akp-concepts button:focus-visible/, "concept buttons must retain a visible keyboard focus ring");
  assert.match(style, /@media\(max-width:700px\)[\s\S]*p-akp-head-actions\{flex-direction:row/, "compact header actions must remain usable on narrow screens");
  assert.doesNotMatch(source, /[Ã‚Ã¢ï¿½]/, "panel source must not contain mojibake characters");
  assert.doesNotMatch(style, /[Ã‚Ã¢ï¿½]/, "panel styles must not contain mojibake characters");
});

test("knowledge panel exposes metadata-only page review coverage", () => {
  const source = fs.readFileSync(componentPath, "utf8");
  const style = fs.readFileSync(stylePath, "utf8");
  const index = JSON.parse(fs.readFileSync(pageIndexPath, "utf8"));
  const indexed = index.pages.filter((page) => page.chapter !== null);
  const reviewed = indexed.filter((page) => page.review_status === "CURATED_NOTES");
  const next = indexed.find((page) => page.review_status !== "CURATED_NOTES" && page.printed_page !== null);
  assert.match(source, /price_action_page_index\.json/);
  assert.match(source, /reviewedPageCount/);
  assert.match(source, /indexedReviewPages\.length/);
  assert.match(source, /nextBacklog: "Next printed-page backlog"/);
  assert.match(source, /className="p-akp-coverage"\s+role="group"\s+aria-label=\{copy\.reviewCoverage\}/);
  assert.match(source, /Review coverage is source metadata only; it is not implementation\/outcome proof/);
  assert.match(style, /p-akp-coverage/);
  assert.ok(reviewed.length>=359);
  assert.equal(indexed.length, 419);
  if (next) {
    assert.ok(next.printed_page>=323);
    assert.equal(next.pdf_page, next.printed_page + 10);
  } else {
    assert.equal(reviewed.length, indexed.length, "when no backlog exists every indexed page must be curated");
  }
});

