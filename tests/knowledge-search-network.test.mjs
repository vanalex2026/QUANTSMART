import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const source = readFileSync(fileURLToPath(new URL("../mfe_ux_lab/cockpit/src/components/PriceActionKnowledgePanel.tsx", import.meta.url)), "utf8");
assert.match(source, /concept\.pages\.map\(\(page\) => `page \$\{page\}`\)/, "knowledge search must index each concept's PDF page anchor");
assert.match(source, /map\.relationships[\s\S]*relationship\.label[\s\S]*relationship\.pages\.map/, "knowledge search must include directed source-network edge labels and anchors");
assert.match(source, /page reference or graph term can resume the same lens/, "search provenance affordance must be documented in code");
assert.doesNotMatch(source, /order_send|execute|place order/i, "knowledge search must remain read-only");
console.log("KNOWLEDGE SEARCH NETWORK PASS: PDF anchors and graph terms resume source-grounded lenses.");

const map=JSON.parse(readFileSync(new URL('../docs/price_action_knowledge_map.json',import.meta.url),'utf8'));
const memo=source.match(/const concepts = useMemo\(\(\) => \{([\s\S]*?)\n  \}, \[conceptLimit, query\]\);/);
assert.ok(memo,'actual panel search callback must be available for behavior verification');
const pageSource = readFileSync(new URL('../mfe_ux_lab/cockpit/src/lib/priceActionSourcePages.ts', import.meta.url), 'utf8');
const pageOffset = Number(pageSource.match(/PRICE_ACTION_PRINTED_PDF_OFFSET = (\d+)/)[1]);
const actualSearch=new Function('map','conceptLimit','query','PRICE_ACTION_PRINTED_PDF_OFFSET',memo[1]);
const search=(map,conceptLimit,query)=>actualSearch(map,conceptLimit,query,pageOffset);
const squeeze=search(map,undefined,'squeeze');
const lens=map.source_lenses.find(row=>row.id==='chapter3_practice_buildup_break_context');
assert.ok(lens.concept_ids.every(id=>squeeze.some(row=>row.id===id)),'source-only squeeze cues must discover their linked concepts');
assert.equal(search(map,undefined,'unindexed invented term').length,0);
assert.ok(search(map,undefined,'page 43').some(row=>row.id==='buildup'));
assert.ok(search(map,undefined,'page 240').some(row=>row.id==='double_pressure'), 'exact printed page anchors must resolve');
assert.equal(search(map,undefined,'page 24').some(row=>row.id==='double_pressure'), false, 'short page anchors must not match page 240');
assert.ok(search(map,undefined,'PDF page 250').some(row=>row.id==='double_pressure'), 'PDF page anchors must map through the attested offset');
assert.ok(search(map,undefined,'p. 240').some(row=>row.id==='double_pressure'), 'abbreviated printed page anchors must resolve');
assert.deepEqual(search(map,undefined,''),map.concepts);
assert.ok(search(map,2,'squeeze').length<=2,'source-note search must preserve the host concept limit');
console.log('KNOWLEDGE SOURCE SEARCH PASS: actual query callback includes source notes without creating detector identities.');

for (const query of ['doji alone', 'before a false perforation', 'technical-test triple', 'countertrend entry', 'page 65']) {
  assert.ok(search(map, undefined, query).some(row => lens.concept_ids.includes(row.id)), query);
}
assert.equal(search(map, undefined, 'page 66').length, 0, 'blank divider must not invent concept search hits');

const chapter5Lens=map.source_lenses.find(row=>row.id==='chapter5_pattern_break_entry_context');
for (const query of ['never front-run', 'topping tails', 'entry bar reflexively', 'page 85', 'page 96', 'adverse round magnet', 'double-bar break']) {
  assert.ok(search(map,undefined,query).some(row=>chapter5Lens.concept_ids.includes(row.id)),query);
}
assert.equal(search(map,undefined,'page 72').length,0,'blank Chapter 4 divider has no invented concept hits');

for (const reviewedLens of map.source_lenses) {
  const hits = search(map, undefined, reviewedLens.name);
  assert.ok(reviewedLens.concept_ids.every(id => hits.some(row => row.id === id)), `${reviewedLens.id}: every source lens must remain searchable after map growth`);
}
const finalRecap = map.source_lenses.find(row => row.id === 'chapter8_recap_harmony_and_patience');
for (const query of ['anticipated, not predicted', 'page 241', 'Printed p. 241', 'PDF p. 251']) {
  assert.ok(finalRecap.concept_ids.every(id => search(map, undefined, query).some(row => row.id === id)), `completed Chapter 8: ${query}`);
}
for (const query of ['page 242', 'page 244', 'PDF page 252', 'PDF page 254']) {
  assert.equal(search(map, undefined, query).length, 0, `${query}: reviewed blank dividers must not create concept hits`);
}

for (const [lensId, queries] of [
  ['chapter5_pattern_break_pullback_context', ['aspect ratio', 'last-resort recovery', 'powerful V-shaped', 'page 106']],
  ['chapter5_pattern_break_combi_context', ['thin and fat buildup', 'strict inside-bar geometry', 'dated external evidence', 'page 124']],
]) {
  const reviewedLens = map.source_lenses.find(row => row.id === lensId);
  for (const query of queries) assert.ok(search(map, undefined, query).some(row => reviewedLens.concept_ids.includes(row.id)), query);
}
