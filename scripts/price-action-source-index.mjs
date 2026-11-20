// Durable page metadata and local OCR retrieval. No PDF rendering or new extraction.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual} from 'node:util';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const INDEX_SCHEMA='quantsmart.price-action-page-index/1';
const textHash=text=>createHash('sha256').update(text,'utf8').digest('hex');
const normalized=text=>text.normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim();

function assertExtraction(extraction,map){
  if(extraction?.schema!=='quantsmart.price-action-pdf-extraction/1' || extraction.source?.sha256?.toUpperCase()!==map.source.sha256.toUpperCase() || extraction.source?.pdf_pages!==map.source.pdf_pages)throw Error('Extraction does not match the indexed source hash/page count.');
  if(!Array.isArray(extraction.pages)||extraction.pages.length!==map.source.pdf_pages)throw Error('Extraction must retain every source page, including pages without OCR.');
  extraction.pages.forEach((page,i)=>{
    if(page?.pdf_page!==i+1||typeof page.text!=='string'||page.has_text!==Boolean(page.text.trim()))throw Error(`Invalid extraction page ${i+1}.`);
  });
  if(extraction.text_pages!==extraction.pages.filter(page=>page.has_text).length)throw Error('Extraction OCR page count is inconsistent.');
}

// Printed pagination is source metadata, not a universal PDF offset. Keep the
// conversion anchored to the chapter ranges so a source with front matter or
// a chapter-specific pagination change cannot silently receive wrong anchors.
function printedPageForPdfPage(chapter,pdfPage){
  const pdfRange=chapter?.pdf_range,printedRange=chapter?.printed_range;
  if(!Array.isArray(pdfRange)||pdfRange.length!==2||!Array.isArray(printedRange)||printedRange.length!==2
    ||!pdfRange.every(Number.isInteger)||!printedRange.every(Number.isInteger)
    ||pdfRange[0]>pdfRange[1]||printedRange[0]>printedRange[1]
    ||pdfRange[1]-pdfRange[0]!==printedRange[1]-printedRange[0]){
    throw Error(`Chapter ${chapter?.number??'?'} has invalid printed/PDF ranges.`);
  }
  return printedRange[0]+(pdfPage-pdfRange[0]);
}

export function buildPriceActionSourceIndex(extraction,map){
  assertExtraction(extraction,map);
  const pages=extraction.pages.map(page=>{
    const chapter=map.book_index.find(row=>page.pdf_page>=row.pdf_range[0]&&page.pdf_page<=row.pdf_range[1]);
    const printed=chapter?printedPageForPdfPage(chapter,page.pdf_page):null;
    // These are textual mentions, including references to figures on other pages.
    // OCR may omit/mangle a label. They do not assert a figure's actual location.
    const mentions=[...page.text.matchAll(/\bFigure\s+(\d+)\s*\.\s*(\d+)\b/gi)].map(match=>`${Number(match[1])}.${Number(match[2])}`);
    const month=map.case_study_months.find(row=>page.pdf_page>=row.pdf_range[0]&&page.pdf_page<=row.pdf_range[1]);
    return {
      pdf_page:page.pdf_page,printed_page:printed,chapter:chapter?.number??null,
      section:chapter?.title||(page.pdf_page<map.book_index[0].pdf_range[0]?'Front matter':'Back matter'),
      has_ocr:page.has_text,ocr_characters:page.text.length,ocr_sha256:textHash(page.text),
      review_status:chapter?.reviewed_printed_pages.includes(printed)?'CURATED_NOTES':'NOT_CURATED',
      concept_ids:map.concepts.filter(concept=>concept.pages.includes(printed)).map(concept=>concept.id),
      figure_mentions:[...new Set(mentions)],case_month:month?`${month.year}-${String(map.case_study_months.indexOf(month)+3).padStart(2,'0')}`:null,
    };
  });
  return {
    schema:INDEX_SCHEMA,source:{sha256:map.source.sha256,pdf_pages:map.source.pdf_pages,title:map.source.title},
    coverage:{page_records:pages.length,ocr_pages:pages.filter(page=>page.has_ocr).length,curated_pages:pages.filter(page=>page.review_status==='CURATED_NOTES').length,
      status:'PARTIAL_CURATED_NOTES',figure_policy:'OCR mentions only; may refer to another page and may miss damaged labels. Not a figure-location or outcome dataset.',
      text_policy:'Full OCR text stays in the local extraction artifact. This index retains metadata and text hashes only.'},
    pages,
  };
}

export function searchPriceActionSource(index,extraction,map,options={}){
  assertExtraction(extraction,map);
  const expected=buildPriceActionSourceIndex(extraction,map);
  // Check semantic metadata as well as OCR hashes; stale/manual edits must not
  // attach a source excerpt to an incorrect chapter, concept or review status.
  if(!isDeepStrictEqual(index,expected))throw Error('Page index is stale or inconsistent. Rebuild from the matching local extraction and knowledge map.');
  const {query='',chapter,printedPage,pdfPage,figure,limit=10,includeText=false}=options;
  if(typeof query!=='string'||query.length>500)throw Error('Query must be a string of at most 500 characters.');
  if(!Number.isInteger(limit)||limit<1||limit>100)throw Error('Limit must be between 1 and 100.');
  const chapterNumbers=new Set(map.book_index.map(row=>row.number));
  const printedPageMax=Math.max(...map.book_index.map(row=>row.printed_range[1]));
  if(chapter!==undefined&&(!Number.isInteger(chapter)||!chapterNumbers.has(chapter)))throw Error('Invalid chapter.');
  if(printedPage!==undefined&&(!Number.isInteger(printedPage)||printedPage<1||printedPage>printedPageMax))throw Error('Invalid printed page.');
  if(pdfPage!==undefined&&(!Number.isInteger(pdfPage)||pdfPage<1||pdfPage>map.source.pdf_pages))throw Error('Invalid PDF page.');
  if(figure!==undefined&&!/^\d+\.\d+$/.test(figure))throw Error('Figure must use chapter.number notation, for example 5.10.');
  const terms=normalized(query).split(' ').filter(Boolean);
  const matches=index.pages.flatMap(page=>{
    if(chapter!==undefined&&page.chapter!==chapter||printedPage!==undefined&&page.printed_page!==printedPage||pdfPage!==undefined&&page.pdf_page!==pdfPage||figure!==undefined&&!page.figure_mentions.includes(figure))return [];
    const text=extraction.pages[page.pdf_page-1].text;
    const searchable=normalized(text);
    if(terms.some(term=>!searchable.includes(term)))return [];
    const first=terms.length?Math.max(0,searchable.indexOf(terms[0])-90):0;
    return [{...page,excerpt:searchable.slice(first,first+360),...(includeText?{text}:{})}];
  });
  return {source:index.source,query,search_basis:'Local OCR text, all query terms required, chronological PDF order. OCR is not a reviewed interpretation.',total:matches.length,returned:Math.min(matches.length,limit),results:matches.slice(0,limit)};
}

// Keep the chart's compact lookup reproducible from the same attested map used
// by the source index. This is intentionally a source-only concept export: the
// full page index and OCR never enter focused chart startup.
export function buildPriceActionCompactLookup(map) {
  if (!map || typeof map !== 'object' || !Array.isArray(map.concepts) || !map.concepts.length || !map.source) throw Error('Knowledge map is invalid for compact lookup.');
  if (!/^quantsmart\.price-action-knowledge-map\/\d+$/.test(map.schema)
    || map.authority !== 'SHADOW_ONLY / NO_DECISION / live_apply_allowed=false'
    || !/^[a-f0-9]{64}$/i.test(map.source.sha256)
    || typeof map.source.title !== 'string' || !map.source.title.trim()
    || !Number.isInteger(map.source.pdf_pages) || map.source.pdf_pages < 1) throw Error('Knowledge map provenance is invalid for compact lookup.');
  return {
    concepts: map.concepts,
    provenance: {
      schema: map.schema,
      sourceSha256: map.source.sha256,
      sourceTitle: map.source.title,
      pdfPages: map.source.pdf_pages,
    },
  };
}

export function formatPriceActionCompactLookupModule(map) {
  const payload = JSON.stringify(buildPriceActionCompactLookup(map), null, 0);
  return `// Generated by scripts/price-action-source-index.mjs --compact-lookup.\n// The full page index, relationships and OCR remain outside focused chart startup.\nimport type { KnowledgeConcept } from "./priceActionKnowledge.ts";\n\nconst source = ${payload} as { concepts: KnowledgeConcept[]; provenance: {\n  schema: string; sourceSha256: string; sourceTitle: string; pdfPages: number;\n} };\n\nexport function getPriceActionKnowledge(patternId?: string | null): KnowledgeConcept | null {\n  return source.concepts.find((concept) => concept.id === patternId) || null;\n}\n\nexport const priceActionKnowledgeConceptIds = source.concepts.map((concept) => concept.id);\nexport const PRICE_ACTION_KNOWLEDGE_PROVENANCE = source.provenance;\n`;
}

function main(){
  const args=process.argv.slice(2),values={};
  const booleanFlags=new Set(['--build','--check','--compact-lookup','--text','--help']);
  const valueFlags=new Set(['--extraction','--index','--map','--query','--chapter','--printed-page','--pdf-page','--figure','--limit','--output']);
  for(let i=0;i<args.length;i++){
    const flag=args[i];if(booleanFlags.has(flag)){values[flag]=true;continue;}
    if(!valueFlags.has(flag)||i+1>=args.length||args[i+1].startsWith('--'))throw Error(`Unknown option or missing value: ${flag}`);
    values[flag]=args[++i];
  }
  if (['--build','--compact-lookup','--check'].filter(flag=>values[flag]).length>1) throw Error('Choose exactly one write/check operation.');
  if(values['--help']){console.log('node scripts/price-action-source-index.mjs [--build] [--compact-lookup] [--check] [--query words] [--chapter 1..12] [--printed-page N] [--pdf-page N] [--figure 5.10] [--limit 10] [--text]\nDefaults: --extraction artifacts/price_action_pages_audit.json --index docs/price_action_page_index.json --map docs/price_action_knowledge_map.json\nUses existing local OCR only. --build writes metadata; --compact-lookup writes the generated chart concept lookup; --check verifies it; --text includes original OCR for selected pages.');return;}
  const read=path=>JSON.parse(readFileSync(path,'utf8').replace(/^\uFEFF/,''));
  const map=read(resolve(root,values['--map']||'docs/price_action_knowledge_map.json'));
  const indexPath=resolve(root,values['--index']||'docs/price_action_page_index.json');
  const compactPath=resolve(root,values['--output']||'mfe_ux_lab/cockpit/src/lib/priceActionKnowledgeLookup.ts');
  if(values['--compact-lookup']){writeFileSync(compactPath,formatPriceActionCompactLookupModule(map),'utf8');console.log(JSON.stringify({output:compactPath,concepts:map.concepts.length,sourceSha256:map.source.sha256}));return;}
  if(values['--check']){const expected=formatPriceActionCompactLookupModule(map);const actual=readFileSync(compactPath,'utf8');if(actual!==expected)throw Error('Compact knowledge lookup is stale; run --compact-lookup.');console.log(JSON.stringify({compact_lookup:compactPath,status:'CURRENT',concepts:map.concepts.length}));return;}
  const extraction=read(resolve(root,values['--extraction']||'artifacts/price_action_pages_audit.json'));
  if(values['--build']){const index=buildPriceActionSourceIndex(extraction,map);writeFileSync(indexPath,JSON.stringify(index,null,2)+'\n','utf8');console.log(JSON.stringify({index:indexPath,...index.coverage}));return;}
  const number=flag=>values[flag]===undefined?undefined:Number(values[flag]);
  console.log(JSON.stringify(searchPriceActionSource(read(indexPath),extraction,map,{query:values['--query']||'',chapter:number('--chapter'),printedPage:number('--printed-page'),pdfPage:number('--pdf-page'),figure:values['--figure'],limit:number('--limit')??10,includeText:values['--text']===true}),null,2));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{main();}catch(error){console.error(error.message);process.exitCode=1;}}
