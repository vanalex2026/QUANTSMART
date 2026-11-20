import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const app=fileURLToPath(new URL('../mfe_ux_lab/cockpit/',import.meta.url));
const require=createRequire(app+'package.json');
const {build}=require('esbuild');
const {renderToStaticMarkup}=require('react-dom/server');
const component=readFileSync(app+'src/components/PriceActionBookIndex.tsx','utf8');
const bundled=await build({stdin:{contents:component.replace('import { useState } from "react";', 'const useState = globalThis.__bookUseState;'),resolveDir:app+'src/components',loader:'tsx'},bundle:true,format:'esm',platform:'node',jsx:'automatic',write:false,logLevel:'silent'});
let chapter=1;
let reviewFilter='all';
globalThis.__bookUseState=initial=>typeof initial==='number'
  ? [chapter??initial,value=>{chapter=typeof value==='function'?value(chapter):value;}]
  : [reviewFilter,value=>{reviewFilter=typeof value==='function'?value(reviewFilter):value;}];
const {PriceActionBookIndex}=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const map=JSON.parse(readFileSync(new URL('../docs/price_action_knowledge_map.json',import.meta.url),'utf8'));
const pageIndex=JSON.parse(readFileSync(new URL('../docs/price_action_page_index.json',import.meta.url),'utf8'));
const flatten=node=>!node||typeof node!=='object'?[]:[node,...[node.props?.children].flat(Infinity).flatMap(flatten)];
test('book index exposes explicit reviewed and pending chapter navigation',()=>{
  assert.match(component,/Review status filter/);
  assert.match(component,/Reviewed chapters/);
  assert.match(component,/Pending or in-review/);
  assert.match(component,/visibleChapters = map\.book_index\.filter/);
  assert.match(component,/copy\.reviewStatus/);
  assert.match(component,/chapterStatus\(row\) !== "reviewed"/);
});
test('all source chapters navigate actual reviewed notes, page ranges and source lenses',()=>{
  // The chapter summary is rendered from the map while the panel-wide
  // coverage badge is rendered from the page index. Keep those two navigation
  // surfaces in lockstep so a newly reviewed page cannot leave a stale count
  // in the book selector.
  const indexedReviewedByChapter = new Map();
  for (const page of pageIndex.pages) {
    if (page.chapter === null || page.review_status !== 'CURATED_NOTES') continue;
    indexedReviewedByChapter.set(page.chapter, [...(indexedReviewedByChapter.get(page.chapter) || []), page.printed_page]);
  }
  for (const row of map.book_index) {
    assert.deepEqual(row.reviewed_printed_pages, indexedReviewedByChapter.get(row.number) || [], `chapter ${row.number} reviewed-page count drifted from the source index`);
  }
  const opened=[];
  const render=()=>PriceActionBookIndex({map,onOpenConcept:id=>opened.push(id)});
  for(const row of map.book_index){
    const selector=flatten(render()).find(node=>node.type==='select' && node.props?.['aria-label']==='PDF chapter');
    selector.props.onChange({target:{value:String(row.number)}});
    const tree=render();
    const html=renderToStaticMarkup(tree);
    assert.ok(html.includes(`Chapter ${row.number}: ${row.title.replaceAll('&','&amp;')}`));
    assert.ok(html.includes(row.summary.replaceAll('&','&amp;')));
    assert.ok(html.includes(`Reviewed pages: ${row.reviewed_printed_pages.length}/${row.printed_range[1] - row.printed_range[0] + 1}`));
    const complete = row.reviewed_printed_pages.length === row.printed_range[1] - row.printed_range[0] + 1;
    assert.equal(html.includes('All pages in this chapter interval have source review notes.'), complete);
    assert.equal(html.includes('Unreviewed pages remain navigation references.'), !complete);
    const lenses = map.source_lenses.filter(lens => lens.pages.some(page => page >= row.printed_range[0] && page <= row.printed_range[1]));
    assert.equal(flatten(tree).filter(node => node.props?.['data-source-lens']).length, lenses.length);
    for (const lens of lenses) {
      const note=flatten(tree).find(node=>node.props?.['data-source-lens']===lens.id);
      assert.ok(note, `${lens.id} must remain reachable from its chapter`);
      const region=flatten(note).find(node=>node.props?.className==='p-akp-source-note-content');
      assert.equal(region?.props?.role,'region', `${lens.id} source notes need an accessible region`);
      assert.equal(region?.props?.tabIndex,0, `${lens.id} source notes need keyboard focus`);
      assert.ok(html.includes(`data-source-lens="${lens.id}"`));
      assert.ok(html.includes(lens.definition.replaceAll('&','&amp;')));
      assert.ok(html.includes('SOURCE_NOTES'));
      assert.ok(html.includes('do not add detector occurrences or measured outcomes'));
      assert.doesNotMatch(renderToStaticMarkup(note),/Source page anchors unavailable/, `${lens.id} has malformed source anchors`);
    }
    const buttons=flatten(tree).filter(node=>node.type==='button');
    assert.equal(buttons.length,row.concept_ids.length);
    buttons.forEach((button,i)=>{button.props.onClick();assert.equal(opened.at(-1),row.concept_ids[i]);});
    assert.equal(flatten(tree).filter(node=>node.type==='option' && node.props?.value !== 'all' && node.props?.value !== 'reviewed' && node.props?.value !== 'pending').length,12);
    if(row.number===9){
      assert.match(html,/March 2012/);assert.match(html,/August 2012/);
      assert.match(html,/PDF p\. 257/);
      assert.equal(flatten(tree).filter(node=>node.type==='dt').length,map.glossary.length);
    }
    if(row.number===10){
      assert.match(html,/compounding/i);
      assert.match(html,/PDF pp\. 393-400/);
    }
  }
  assert.match(renderToStaticMarkup(render()),/not fully transcribed/);
  assert.match(renderToStaticMarkup(render()),/Coverage and translation limits/);
});

test('book index switches its shell copy to Vietnamese without changing source identities', () => {
  chapter = 9;
  const html = renderToStaticMarkup(PriceActionBookIndex({ map, locale: 'vi', onOpenConcept() {} }));
  assert.match(html, /Mục lục/);
  assert.match(html, /Trạng thái rà soát/);
  assert.match(html, /Trang đã rà soát/);
  assert.match(html, /SHADOW_ONLY \/ NO_DECISION \/ live_apply_allowed=false/);
  assert.match(html, /Chapter 9|Chương 9/);
});

test('review notes expose source anchors and bounded keyboard scroll without opening every chapter', () => {
  chapter=3;
  const tree=PriceActionBookIndex({map,onOpenConcept(){}});
  const note=flatten(tree).find(node=>node.props?.['data-source-lens']==='chapter3_practice_buildup_break_context');
  assert.ok(note);
  assert.equal(note.type,'details');
  assert.equal(note.props.open,undefined,'long source notes remain collapsed until requested');
  const content=flatten(note).find(node=>node.props?.className==='p-akp-source-note-content');
  assert.equal(content.props.role,'region');
  assert.equal(content.props.tabIndex,0);
  const html=renderToStaticMarkup(note);
  assert.match(html,/Printed pp\. 36-65/);
  assert.match(html,/PDF pp\. 46-75/);
  assert.match(html,/p\. 43:.*squeeze/);
  assert.match(html,/EMA is an average, not support or resistance/);
  const css=readFileSync(app+'src/components/price-action-knowledge-panel.css','utf8');
  assert.match(css,/\.p-akp-source-note-content\{[^}]*max-height:320px;overflow:auto/);
  assert.match(css,/\.p-akp-source-note-content:focus-visible\{/);
});
test('source combi definition and management notes cannot acquire detector statistics by adding knowledge',()=>{
  const proxies=map.concepts.filter(row=>row.implementation==='GEOMETRY_PROXY');
  const notes=map.concepts.filter(row=>row.implementation==='SOURCE_NOTES');
  assert.equal(proxies.length,13);assert.equal(notes.length,10);
  const combi=proxies.find(row=>row.id==='pattern_break_combi');
  assert.match(combi.definition,/powerbar/i);assert.match(combi.definition,/inside bar/i);
  const chapter5CombiPages=[...Array.from({length:17},(_,i)=>i+108),136,139,140];
  // Chapter 8 adds independently reviewed recap anchors without changing the
  // detector identity or turning the whole recap lens into combi attribution.
  const chapter8CombiPages=[221,223,225,227];
  const chapter8FinalCombiPages=[230,231,235,239,241];
  const chapter9CombiPages=[254,258,260,262];
  const chapter9LateCombiPages=[263,264,268,270,272];
  const chapter9AprilCombiPages=[273,279,280];
  const chapter9LateAprilCombiPages=[285,286,290];
  const chapter9EarlyMayCombiPages=[297,301];
  const chapter9MidMayCombiPages=[303,304,305,311,312];
  const chapter9LateMayCombiPages=[317,318,321];
  const chapter9JuneCombiPages=[323,329];
  const recap=map.source_lenses.find(row=>row.id==='chapter8_recap_session_examples_context');
  assert.ok(recap.concept_ids.includes(combi.id));
  assert.ok(chapter8CombiPages.every(page=>recap.pages.includes(page)));
  const finalRecap=map.source_lenses.find(row=>row.id==='chapter8_recap_harmony_and_patience');
  assert.ok(chapter8FinalCombiPages.every(page=>finalRecap.pages.includes(page)));
  const march=map.source_lenses.find(row=>row.id==='chapter9_march_context_and_selection');
  assert.ok(chapter9CombiPages.every(page=>march.pages.includes(page)));
  const lateMarch=map.source_lenses.find(row=>row.id==='chapter9_late_march_risk_and_room');
  assert.ok(lateMarch.concept_ids.includes(combi.id));
  assert.ok(chapter9LateCombiPages.every(page=>lateMarch.pages.includes(page)));
  const april=map.source_lenses.find(row=>row.id==='chapter9_april_context_and_conditional_management');
  assert.ok(april.concept_ids.includes(combi.id));
  assert.ok(chapter9AprilCombiPages.every(page=>april.pages.includes(page)));
  const lateApril=map.source_lenses.find(row=>row.id==='chapter9_late_april_range_edges_and_patience');
  assert.ok(lateApril.concept_ids.includes(combi.id));
  assert.ok(chapter9LateAprilCombiPages.every(page=>lateApril.pages.includes(page)));
  const earlyMay=map.source_lenses.find(row=>row.id==='chapter9_early_may_selection_and_news_context');
  assert.ok(earlyMay.concept_ids.includes(combi.id));
  assert.ok(chapter9EarlyMayCombiPages.every(page=>earlyMay.pages.includes(page)));
  const midMay=map.source_lenses.find(row=>row.id==='chapter9_mid_may_patience_and_conditional_exits');
  assert.ok(midMay.concept_ids.includes(combi.id));
  assert.ok(chapter9MidMayCombiPages.every(page=>midMay.pages.includes(page)));
  const chapter9MidJulyCombiPages=[344,350];
  const chapter9AugustCombiPages=[376,378];
  assert.deepEqual(combi.pages,[...new Set([...chapter5CombiPages,...chapter8CombiPages,...chapter8FinalCombiPages,...chapter9CombiPages,...chapter9LateCombiPages,...chapter9AprilCombiPages,...chapter9LateAprilCombiPages,...chapter9EarlyMayCombiPages,...chapter9MidMayCombiPages,...chapter9LateMayCombiPages,...chapter9JuneCombiPages,...chapter9MidJulyCombiPages,...chapter9AugustCombiPages,342,354])].sort((a,b)=>a-b));
  const family=map.setup_families.find(row=>row.id==='pattern_break_combination');
  assert.ok(family.concept_ids.includes(combi.id));
  assert.ok(family.steps.some(step=>/powerbar/.test(step)));
  assert.ok(family.steps.some(step=>/inside[ _]bar/.test(step)));
  const panel=readFileSync(app+'src/components/PriceActionKnowledgePanel.tsx','utf8');
  assert.match(panel,/<PriceActionBookIndex map=\{map\} onOpenConcept=\{selectRelatedConcept\}/);
  assert.match(panel,/Source notes only.*no detector or measured outcome statistics/);
  assert.doesNotMatch(panel,/source pages indexed/);
  assert.match(panel,/steps.map\(\(step, index\) =>.*index \+ 1/s);
  const css=readFileSync(app+'src/components/price-action-knowledge-panel.css','utf8');
  assert.match(css,/is-collapsed \.p-akp-book\{display:none/);
  assert.match(css,/\.workspace-shell \.main-wide \.p-akp-book select\{[^}]*min-height:36px/);
  const detector=readFileSync(app+'src/lib/priceActionDetector.ts','utf8');
  for(const note of notes)assert.ok(!detector.includes(`"${note.id}"`),`${note.id} has no detector attribution`);
});


test('new Chapter 5 source notes expose entry discipline and compact reviewed ranges', () => {
  chapter=5;
  const tree=PriceActionBookIndex({map,onOpenConcept(){}});
  const html=renderToStaticMarkup(tree);
  assert.match(html,/Reviewed pages: 70\/70/);
  assert.match(html,/Printed pp\. 73-142/);
  assert.match(html,/All pages in this chapter interval have source review notes/);
  const note=flatten(tree).find(node=>node.props?.['data-source-lens']==='chapter5_pattern_break_entry_context');
  const content=renderToStaticMarkup(note);
  assert.match(content,/Printed pp\. 78-96/);
  assert.match(content,/PDF pp\. 88-106/);
  assert.match(content,/never front-run/);
});

test('late April source notes retain page anchors and conditional entry and exit distinctions',()=>{
  chapter=9;
  const tree=PriceActionBookIndex({map,onOpenConcept(){}});
  const note=flatten(tree).find(node=>node.props?.['data-source-lens']==='chapter9_late_april_range_edges_and_patience');
  assert.ok(note);
  const html=renderToStaticMarkup(note);
  assert.match(html,/Printed pp\. 283-292/);
  assert.match(html,/PDF pp\. 293-302/);
  assert.match(html,/No real entry is provided/);
  assert.match(html,/conditional exit does not establish a qualifying entry/);
  assert.match(html,/not measured probabilities/);
  assert.match(html,/SOURCE_NOTES/);
  assert.match(renderToStaticMarkup(tree),/do not add detector occurrences or measured outcomes/);
  assert.equal(note.props.open,undefined);
});

test('early May source notes retain dated-news abstention and conditional re-entry',()=>{
  chapter=9;
  const tree=PriceActionBookIndex({map,onOpenConcept(){}});
  const note=flatten(tree).find(node=>node.props?.['data-source-lens']==='chapter9_early_may_selection_and_news_context');
  assert.ok(note);
  const html=renderToStaticMarkup(note);
  assert.match(html,/Printed pp\. 293-302/);
  assert.match(html,/PDF pp\. 303-312/);
  assert.match(html,/technically valid but skipped/);
  assert.match(html,/not provide a live economic-calendar/);
  assert.match(html,/require an earlier accepted trade and shakeout/);
  assert.match(html,/SOURCE_NOTES/);
  assert.equal(note.props.open,undefined);
  assert.match(renderToStaticMarkup(tree),new RegExp(`Reviewed pages: ${map.book_index.find(row=>row.number===9).reviewed_printed_pages.length}/138`));
});

test('mid May source notes preserve aggressive entries, skipped continuation and conditional exits',()=>{
  chapter=9;
  const tree=PriceActionBookIndex({map,onOpenConcept(){}});
  const note=flatten(tree).find(node=>node.props?.['data-source-lens']==='chapter9_mid_may_patience_and_conditional_exits');
  assert.ok(note);
  const html=renderToStaticMarkup(note);
  assert.match(html,/Printed pp\. 303-312/);
  assert.match(html,/PDF pp\. 313-322/);
  assert.match(html,/not a tradable break yet/);
  assert.match(html,/does not align with the pattern line/);
  assert.match(html,/require an existing accepted position/);
  assert.match(html,/not measured probabilities or automatic detector rules/);
  assert.match(html,/SOURCE_NOTES/);
  assert.equal(note.props.open,undefined);
  assert.match(renderToStaticMarkup(tree),new RegExp(`Reviewed pages: ${map.book_index.find(row=>row.number===9).reviewed_printed_pages.length}/138`));
});
