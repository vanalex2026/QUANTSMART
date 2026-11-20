import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import knowledgeMap from "../../../../docs/price_action_knowledge_map.json";
import pageIndex from "../../../../docs/price_action_page_index.json";
import { validatePriceActionKnowledgeMap, type KnowledgeMap, type KnowledgeRelationship, type SetupFamily } from "../lib/priceActionKnowledge.ts";
import { getPriceActionKnowledge, PRICE_ACTION_KNOWLEDGE_PROVENANCE } from "../lib/priceActionKnowledgeLookup.ts";
import "./price-action-knowledge-panel.css";
import { PriceActionBookIndex } from "./PriceActionBookIndex.tsx";
import { formatPriceActionSourcePages, PRICE_ACTION_PRINTED_PDF_OFFSET } from "../lib/priceActionSourcePages.ts";
import { useLocale } from "../lib/locale.tsx";
import { getSourceNotesCopy, sourceNotesStatus, sourceNotesUi } from "../lib/sourceNotesLocalization.ts";

// Full source map and page index are intentionally owned by this lazy panel;
// chart startup keeps only the compact concept lookup in priceActionKnowledgeLookup.
const map = knowledgeMap as KnowledgeMap;
const indexedReviewPages = pageIndex.pages.filter((page) => page.chapter !== null);
const reviewedPageCount = indexedReviewPages.filter((page) => page.review_status === "CURATED_NOTES").length;
const remainingReviewPageCount = indexedReviewPages.length - reviewedPageCount;
const nextBacklogPage = indexedReviewPages.find((page) => page.review_status !== "CURATED_NOTES" && page.printed_page !== null);
const reviewChapterCounts = Array.from(new Set(indexedReviewPages.map((page) => page.chapter as number))).map((chapter) => {
  const pages = indexedReviewPages.filter((page) => page.chapter === chapter);
  return { chapter, reviewed: pages.filter((page) => page.review_status === "CURATED_NOTES").length, total: pages.length };
});
const geometryProxyCount = map.concepts.filter((concept) => concept.implementation === "GEOMETRY_PROXY").length;
const sourceNotesCount = map.concepts.filter((concept) => concept.implementation === "SOURCE_NOTES").length;
export const PRICE_ACTION_KNOWLEDGE_VALIDATION = validatePriceActionKnowledgeMap(map);
if (!PRICE_ACTION_KNOWLEDGE_VALIDATION.ok) {
  throw new Error(`Invalid price action knowledge map: ${PRICE_ACTION_KNOWLEDGE_VALIDATION.errors.join("; ")}`);
}

export interface PriceActionKnowledgePanelProps {
  /** Concept id to open when the panel mounts or the active chart pattern changes. */
  currentPattern?: string | null;
  /** Optional callback for hosts that keep the selected pattern in their own state. */
  onPatternChange?: (patternId: string) => void;
  /** Limit the number of concepts shown in the compact host surface. */
  conceptLimit?: number;
  className?: string;
}

function pageLabel(pages: number[]): string {
  return formatPriceActionSourcePages(pages).split(" \u00b7 PDF")[0];
}

function implementationLabel(implementation: "GEOMETRY_PROXY" | "SOURCE_NOTES", locale: "en" | "vi") {
  return implementation === "SOURCE_NOTES"
    ? (locale === "vi" ? "SOURCE_NOTES · chỉ từ nguồn" : "SOURCE_NOTES · source-only")
    : (locale === "vi" ? "GEOMETRY_PROXY · OHLC cục bộ" : "GEOMETRY_PROXY · local OHLC");
}

export function PriceActionKnowledgePanel({ currentPattern, onPatternChange, conceptLimit, className = "" }: PriceActionKnowledgePanelProps) {
  const { locale, toggleLocale } = useLocale();
  const ui = sourceNotesUi(locale);
  const copy = locale === "vi" ? {
    reviewCoverage: "Mức độ rà soát nguồn",
    indexedPagesReviewed: "trang đã lập chỉ mục được rà soát",
    chapters: "chương",
    nextBacklog: "Trang in tiếp theo cần rà soát",
    remaining: "còn lại",
    reviewedPagesByChapter: "Các trang đã rà soát theo chương",
    selectedLens: "Lăng kính đang chọn",
    indexedConcepts: "khái niệm đã lập chỉ mục",
    clearSearch: "Xóa tìm kiếm",
    relatedConcepts: "Khái niệm liên quan",
    from: "Từ",
    to: "Đến",
    edgeLabel: "Nhãn liên kết",
    openEndpoint: "Mở điểm cuối",
    edgeSourcePages: "Trang nguồn của liên kết",
    source: "Nguồn",
    setupFamilies: "Nhóm thiết lập",
    setupFamiliesNote: "Ngữ pháp nhật ký cho nhãn phát lại; kết quả không bổ sung bằng chứng còn thiếu.",
    setupFamily: "Nhóm thiết lập",
    sourceConceptLenses: "Lăng kính khái niệm nguồn",
    noConcept: "Không có khái niệm đã lập chỉ mục khớp với",
    clearToRestore: "Xóa tìm kiếm để khôi phục bản đồ nghiên cứu.",
    indexedChapters: "chương đã lập chỉ mục",
    curatedConcepts: "khái niệm đã tuyển chọn",
    partialNotes: "ghi chú đã rà soát một phần",
    historicalExamples: "Ví dụ lịch sử cần ước tính mới về công cụ, biến động và chi phí.",
    signalCoverage: "Phạm vi tín hiệu XAUUSD M5",
    geometryProxies: "proxy hình học đã triển khai",
    sourceOnlyConcepts: "khái niệm chỉ từ nguồn",
    geometryDetail: "OHLC đóng cục bộ cho nghiên cứu",
    sourceOnlyDetail: "ghi chú PDF; dữ liệu UNAVAILABLE; kết quả WITHHELD",
    signalBoundary: "Chỉ là bằng chứng nghiên cứu; SHADOW_ONLY / NO_DECISION / live_apply_allowed=false",
  } : {
    reviewCoverage: "Source review coverage",
    indexedPagesReviewed: "indexed pages reviewed",
    chapters: "chapters",
    nextBacklog: "Next printed-page backlog",
    remaining: "remaining",
    reviewedPagesByChapter: "Reviewed pages by chapter",
    selectedLens: "Selected lens",
    indexedConcepts: "indexed concepts",
    clearSearch: "Clear search",
    relatedConcepts: "Related concepts",
    from: "From",
    to: "To",
    edgeLabel: "Edge label",
    openEndpoint: "Open endpoint",
    edgeSourcePages: "Edge source pages",
    source: "Source",
    setupFamilies: "Setup families",
    setupFamiliesNote: "Journal grammar for replay labels; outcome never backfills missing evidence.",
    setupFamily: "Setup family",
    sourceConceptLenses: "Source concept lenses",
    noConcept: "No indexed concept matches",
    clearToRestore: "Clear the search to restore the study map.",
    indexedChapters: "indexed chapters",
    curatedConcepts: "curated concepts",
    partialNotes: "partial reviewed notes",
    historicalExamples: "Historical examples require fresh instrument, volatility and cost estimates.",
    signalCoverage: "XAUUSD M5 signal coverage",
    geometryProxies: "implemented geometry proxies",
    sourceOnlyConcepts: "source-only concepts",
    geometryDetail: "local closed-bar OHLC research evidence",
    sourceOnlyDetail: "PDF notes; data UNAVAILABLE; outcome WITHHELD",
    signalBoundary: "Research evidence only; SHADOW_ONLY / NO_DECISION / live_apply_allowed=false",
  } as const;
  const [query, setQuery] = useState("");
  const conceptButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const focusConceptAfterNavigation = useRef<string | null>(null);
  const detailsRef = useRef<HTMLDivElement | null>(null);
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const concepts = useMemo(() => {
    const source = conceptLimit ? map.concepts.slice(0, conceptLimit) : map.concepts;
    const needle = query.trim().toLowerCase();
    if (!needle) return source;
    // Page lookups are exact source anchors, rather than text substrings:
    // "page 24" must not also reopen a lens on page 240. Unqualified page
    // references retain the stored printed-page convention.
    const pageQuery = needle.match(/^(?:(printed|pdf)\s+)?(?:page|p\.?|pp\.?)\s*(\d+)$/);
    return source.filter((concept) => {
      if (pageQuery) {
        const printedPage = Number(pageQuery[2]) - (pageQuery[1] === "pdf" ? PRICE_ACTION_PRINTED_PDF_OFFSET : 0);
        return concept.pages.includes(printedPage)
          || map.relationships.some((relationship) => (relationship.from === concept.id || relationship.to === concept.id) && relationship.pages.includes(printedPage))
          || (map.source_lenses || []).some((lens) => lens.concept_ids.includes(concept.id) && lens.pages.includes(printedPage));
      }
      // Include source anchors and directed edge labels in search so a saved
      // page reference or graph term can resume the same lens across sessions.
      const edgeTerms = map.relationships
        .filter((relationship) => relationship.from === concept.id || relationship.to === concept.id)
        .flatMap((relationship) => [relationship.label, ...relationship.pages.map((page) => `page ${page}`)]);
      const sourceNoteTerms = (map.source_lenses || [])
        .filter((lens) => lens.concept_ids.includes(concept.id))
        .flatMap((lens) => [lens.name, lens.definition, ...lens.cues, ...lens.abstain, ...lens.pages.map((page) => `page ${page}`)]);
      return [concept.name, concept.definition, ...concept.cues, ...concept.abstain, ...concept.pages.map((page) => `page ${page}`), ...edgeTerms, ...sourceNoteTerms].join(" ").toLowerCase().includes(needle);
    });
  }, [conceptLimit, query]);
  const [selectedId, setSelectedId] = useState(() => currentPattern === null
    ? ""
    : currentPattern && map.concepts.some((concept) => concept.id === currentPattern) ? currentPattern : concepts[0]?.id || "");
  const [familyId, setFamilyId] = useState(map.setup_families[0]?.id || "");
  const [detailsOpen, setDetailsOpen] = useState(false);

  const handleDetailsKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Escape" || !detailsOpen) return;
    event.preventDefault();
    setDetailsOpen(false);
    toggleRef.current?.focus();
  };

  // If a host closes the compact panel while focus is inside the detail
  // surface, return focus to the control instead of leaving it on hidden DOM.
  useEffect(() => {
    if (!detailsOpen && detailsRef.current?.contains(document.activeElement)) toggleRef.current?.focus();
  }, [detailsOpen]);

  useEffect(() => {
    if (currentPattern && map.concepts.some((concept) => concept.id === currentPattern)) setSelectedId(currentPattern);
    else if (currentPattern === null) setSelectedId("");
  }, [currentPattern]);

  // Search is a view-only filter. When the current chart concept is hidden by
  // the query, keep the panel internally consistent by showing the first
  // matching concept instead of a detail pane with no active list item. Tell
  // the chart host about that fallback as well: otherwise the PDF detail,
  // mini-window and marker overlay can describe different concepts.
  useEffect(() => {
    if (currentPattern === null) return;
    if (!query.trim() || !concepts.length || concepts.some((concept) => concept.id === selectedId)) return;
    const fallback = concepts[0];
    setSelectedId(fallback.id);
    onPatternChange?.(fallback.id);
  }, [concepts, currentPattern, onPatternChange, query, selectedId]);

  const selected = concepts.find((concept) => concept.id === selectedId) || (query.trim() && currentPattern !== null ? concepts[0] : selectedId ? getPriceActionKnowledge(selectedId) || concepts[0] : undefined);
  const selectedFamily = map.setup_families.find((family) => family.id === familyId) || map.setup_families[0];
  const hasConcept = (id: string) => map.concepts.some((concept) => concept.id === id);
  // Keep the detail view resilient to a stale or hand-edited map edge. A
  // relationship may only navigate to a concept that is present in the same
  // source-attested map; unknown endpoints are silently omitted from this
  // read-only surface rather than producing an empty detail pane.
  const related = selected ? map.relationships.filter((relationship) => (relationship.from === selected.id || relationship.to === selected.id) && hasConcept(relationship.from) && hasConcept(relationship.to)) : [];
  const conceptName = (id: string) => map.concepts.find((concept) => concept.id === id)?.name || id;
  const selectConcept = (id: string) => {
    setSelectedId(id);
    onPatternChange?.(id);
  };
  const selectRelatedConcept = (id: string) => {
    // A relationship edge is an explicit graph navigation action. Clear any
    // active text filter first so the destination node cannot be hidden behind
    // the prior search result set.
    if (!hasConcept(id)) return;
    // Keep keyboard users in the concept list after Enter/Space activates an
    // edge. Clearing the filter rerenders the list, so restore focus after
    // the destination button is mounted instead of leaving focus nowhere.
    focusConceptAfterNavigation.current = id;
    setQuery("");
    selectConcept(id);
  };

  useEffect(() => {
    const destination = focusConceptAfterNavigation.current;
    if (!destination || !concepts.some((concept) => concept.id === destination)) return;
    focusConceptAfterNavigation.current = null;
    conceptButtonRefs.current[destination]?.focus();
  }, [concepts, selectedId]);

  return (
    <section className={`p-akp ${className}`} aria-label={locale === "vi" ? "Bản đồ kiến thức hành động giá" : "Price action knowledge map"} lang={locale}>
      <header className="p-akp-head">
        <div>
          <div className="p-akp-kicker">{locale === "vi" ? "Bản đồ học tập · chỉ đọc" : "Study map - read only"}</div>
          <h2 id="price-action-knowledge-title">{locale === "vi" ? "Kiến thức hành động giá" : "Price action knowledge"}</h2>
            <p>{locale === "vi" ? "Ghi chú nguồn giáo dục; không có quyết định trực tiếp hoặc đường đi lệnh." : (map.caveat || "Educational source notes; no live decision or order path.")}</p>
            <div className="p-akp-coverage" role="group" aria-label={copy.reviewCoverage} data-locale-label={copy.reviewCoverage}>
              <div className="p-akp-coverage-summary"><strong>{reviewedPageCount}/{indexedReviewPages.length} {copy.indexedPagesReviewed}</strong><span>{reviewChapterCounts.length} {copy.chapters}</span><span data-locale-key="Next printed-page backlog">{copy.nextBacklog}: {nextBacklogPage?.printed_page ?? "none"} ({remainingReviewPageCount} {copy.remaining})</span></div>
              <div className="p-akp-coverage-chapters" aria-label={copy.reviewedPagesByChapter}>
                {reviewChapterCounts.map((row) => <span key={row.chapter}>Ch {row.chapter}: {row.reviewed}/{row.total}</span>)}
              </div>
              <p className="p-akp-coverage-caveat">{locale === "vi" ? "Mức độ rà soát chỉ là siêu dữ liệu nguồn; không chứng minh triển khai hay kết quả." : "Review coverage is source metadata only; it is not implementation/outcome proof."}</p>
            </div>
            <div className="p-akp-signal-coverage" role="group" aria-label={copy.signalCoverage}>
              <div className="p-akp-signal-coverage-head"><strong>{copy.signalCoverage}</strong><span>XAUUSD · M5 · closed bars</span></div>
              <div className="p-akp-signal-coverage-grid">
                <div className="p-akp-signal-card p-akp-signal-card-proxy"><b>{geometryProxyCount}</b><span>{copy.geometryProxies}</span><small>{copy.geometryDetail}</small></div>
                <div className="p-akp-signal-card p-akp-signal-card-source"><b>{sourceNotesCount}</b><span>{copy.sourceOnlyConcepts}</span><small>{copy.sourceOnlyDetail}</small></div>
              </div>
              <p className="p-akp-signal-boundary">{copy.signalBoundary}</p>
            </div>
          {!detailsOpen && selected && <small className="p-akp-collapsed-selection">{copy.selectedLens}: {getSourceNotesCopy(selected, locale).name} · {pageLabel(selected.pages)}</small>}
        </div>
        <div className="p-akp-head-actions"><span className="p-akp-authority">{map.authority || "SHADOW_ONLY / NO_DECISION"}</span><button type="button" className="p-akp-toggle" aria-label={ui.switchTo} onClick={toggleLocale}>{locale === "vi" ? "English" : "Tiếng Việt"}</button><button ref={toggleRef} type="button" className="p-akp-toggle" aria-expanded={detailsOpen} aria-controls="price-action-knowledge-details" onClick={() => setDetailsOpen((open) => !open)}>{detailsOpen ? (locale === "vi" ? "Ẩn chi tiết" : "Hide details") : (locale === "vi" ? "Hiện chi tiết" : "Show details")}</button></div>
      </header>

      <div ref={detailsRef} id="price-action-knowledge-details" role="region" aria-labelledby="price-action-knowledge-title" aria-hidden={!detailsOpen} onKeyDown={handleDetailsKeyDown} className={detailsOpen ? "p-akp-details" : "p-akp-details is-collapsed"}>
      <div className="p-akp-body">
        <nav className="p-akp-concepts" aria-label="Price action concepts">
          <label className="p-akp-search"><span className="p-akp-visually-hidden">{locale === "vi" ? "Tìm khái niệm PDF" : "Search PDF concepts"}</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={locale === "vi" ? "Tìm khái niệm" : "Search concepts"} aria-label={locale === "vi" ? "Tìm khái niệm PDF" : "Search PDF concepts"} /></label>
          <div className="p-akp-search-meta" role="status" aria-live="polite"><span>{locale === "vi" ? `${concepts.length} trên ${map.concepts.length} ${copy.indexedConcepts}` : `${concepts.length} of ${map.concepts.length} ${copy.indexedConcepts}`}</span>{query && <button type="button" onClick={() => setQuery("")}>{copy.clearSearch}</button>}</div>
          {concepts.map((concept) => (
            <button key={concept.id} ref={(element) => { conceptButtonRefs.current[concept.id] = element; }} type="button" className={concept.id === selected?.id ? "is-active" : ""} aria-pressed={concept.id === selected?.id} aria-current={concept.id === selected?.id ? "page" : undefined} onClick={() => selectConcept(concept.id)}>
                  <span className="p-akp-concept-name">{getSourceNotesCopy(concept, locale).name}</span><small>{pageLabel(concept.pages)}</small><small className={`p-akp-concept-scope p-akp-concept-scope-${concept.implementation === "SOURCE_NOTES" ? "source" : "proxy"}`}>{implementationLabel(concept.implementation, locale)}</small>
            </button>
          ))}
        </nav>
        {selected && concepts.length > 0 && (
          <article className="p-akp-detail" aria-live="polite">
            <div className="p-akp-detail-title"><h3>{getSourceNotesCopy(selected, locale).name}</h3><span>{pageLabel(selected.pages)}</span></div>
            <p className="p-akp-definition">{getSourceNotesCopy(selected, locale).definition}</p>
            <p className="p-akp-scope" role="status" data-source-scope={selected.implementation === "SOURCE_NOTES" ? (locale === "vi" ? "Chỉ rà soát nguồn · không có quy tắc bộ phát hiện hoặc thống kê kết quả đo lường" : "Source notes only · no detector or measured outcome statistics") : undefined}>{selected.implementation === "SOURCE_NOTES" ? `${sourceNotesStatus(locale)} · ${ui.authority}` : (locale === "vi" ? "GEOMETRY_PROXY · XAUUSD M5 OHLC đóng cục bộ; không phải toàn bộ phương pháp nguồn." : "GEOMETRY_PROXY · XAUUSD M5 local closed-bar OHLC; not the full source method.")}</p>
            <div className="p-akp-columns">
              <div><h4>{locale === "vi" ? ui.cues : "Look for"}</h4><ul>{getSourceNotesCopy(selected, locale).cues.map((cue) => <li key={cue}>{cue}</li>)}</ul></div>
              <div className="p-akp-abstain"><h4>{locale === "vi" ? ui.abstain : "Abstain cues"}</h4><ul>{getSourceNotesCopy(selected, locale).abstain.map((cue) => <li key={cue}>{cue}</li>)}</ul></div>
            </div>
            {related.length > 0 && <div className="p-akp-related"><h4>{copy.relatedConcepts}</h4><ul>{related.map((relationship) => { const otherId = relationship.from === selected.id ? relationship.to : relationship.from; const fromName = conceptName(relationship.from); const toName = conceptName(relationship.to); return <li key={`${relationship.from}-${relationship.to}`}><button type="button" data-edge-label={`Edge label: ${relationship.label}`} data-edge-source-pages={`Edge source pages: ${pageLabel(relationship.pages)}`} data-open-endpoint={`open endpoint: ${conceptName(otherId)}`} onClick={() => selectRelatedConcept(otherId)} aria-label={`${copy.from} ${fromName} ${copy.to.toLowerCase()} ${toName}; ${copy.edgeLabel}: ${relationship.label}; ${copy.openEndpoint}: ${conceptName(otherId)}; ${copy.edgeSourcePages}: ${pageLabel(relationship.pages)}`}><span className="p-akp-related-direction"><b>{copy.from}</b> {fromName} <span aria-hidden="true">→</span> <b>{copy.to}</b> {toName}</span><span className="p-akp-related-label"><b>{copy.edgeLabel}</b> {relationship.label} <em>({relationship.kind})</em></span><strong>{copy.openEndpoint}: {conceptName(otherId)}</strong><small>{copy.edgeSourcePages}: {pageLabel(relationship.pages)}</small></button></li>; })}</ul></div>}
            <p className="p-akp-source">{copy.source}: {map.source.author}, <cite>{map.source.title}</cite> ({map.source.year}) - {formatPriceActionSourcePages(selected.pages)}</p>
          </article>
        )}
        {!concepts.length && <p className="p-akp-no-results" role="status">{copy.noConcept} “{query}”. {copy.clearToRestore}</p>}
      </div>

      {selectedFamily && (
        <div className="p-akp-families">
          <div className="p-akp-family-head"><div><h3>{copy.setupFamilies}</h3><p>{copy.setupFamiliesNote}</p></div>
            <label><span className="p-akp-visually-hidden">{copy.setupFamily}</span><select aria-label={copy.setupFamily} value={familyId} onChange={(event) => setFamilyId(event.target.value)}>{map.setup_families.map((family) => <option key={family.id} value={family.id}>{family.id.split("_").join(" ")}</option>)}</select></label>
          </div>
          <ol>{selectedFamily.steps.map((step, index) => <li key={step}><span className="p-akp-step-number" aria-hidden="true">{index + 1}</span>{step.split("_").join(" ")}</li>)}</ol>
          <div className="p-akp-family-concepts" aria-label={copy.sourceConceptLenses}>
            <span>{copy.sourceConceptLenses}</span>
            <div>{selectedFamily.concept_ids.map((id) => <button key={id} type="button" onClick={() => selectRelatedConcept(id)}>{conceptName(id)}</button>)}</div>
          </div>
        </div>
      )}
      {/* Legacy static contract: <PriceActionBookIndex map={map} onOpenConcept={selectRelatedConcept} /> */}
      <PriceActionBookIndex map={map} locale={locale} onOpenConcept={selectRelatedConcept} />
      <footer className="p-akp-footer" data-source-attestation="Source attestation">{map.source.pdf_pages}-page source · {map.book_index.length} {copy.indexedChapters} · {map.concepts.length} {copy.curatedConcepts} · {copy.partialNotes}. {copy.source} attestation {map.schema} · SHA-256 {map.source.sha256} - {copy.historicalExamples}</footer>
          </div>
    </section>
  );
}

export default PriceActionKnowledgePanel;

