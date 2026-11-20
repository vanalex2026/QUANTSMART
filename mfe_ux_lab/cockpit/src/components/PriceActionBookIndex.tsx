import { useState } from "react";
import type { KnowledgeChapter, KnowledgeMap } from "../lib/priceActionKnowledge.ts";
import { formatPriceActionSourcePages } from "../lib/priceActionSourcePages.ts";
import { getSourceConceptReviewStatus } from "../lib/sourceConceptStatus.ts";

const viText = (encoded: string) => decodeURIComponent(encoded);
// Source-only navigation copy is localized as "Chỉ diễn giải nguồn".
// Source notes retain the explicit read-only authority boundary below.

export function PriceActionBookIndex({ map, locale = "en", onOpenConcept }: { map: KnowledgeMap; locale?: "en" | "vi"; onOpenConcept: (id: string) => void }) {
  const [chapterNumber, setChapterNumber] = useState(1);
  const [reviewFilter, setReviewFilter] = useState<"all" | "reviewed" | "pending">("all");
  const chapterStatus = (row: KnowledgeChapter) => {
    const pageCount = row.printed_range[1] - row.printed_range[0] + 1;
    if (row.reviewed_printed_pages.length === 0) return "pending" as const;
    if (row.reviewed_printed_pages.length === pageCount) return "reviewed" as const;
    return "in-review" as const;
  };
  const visibleChapters = map.book_index.filter(row => {
    if (reviewFilter === "all") return true;
    if (reviewFilter === "reviewed") return chapterStatus(row) === "reviewed";
    return chapterStatus(row) !== "reviewed";
  });
  const chapter = visibleChapters.find(row => row.number === chapterNumber) || visibleChapters[0] || map.book_index[0];
  if (!chapter) return null;
  const sourceNotes = (map.source_lenses || []).filter(lens => lens.pages.some(page => page >= chapter.printed_range[0] && page <= chapter.printed_range[1]));
  const chapterPageCount = chapter.printed_range[1] - chapter.printed_range[0] + 1;
  const chapterReviewedCount = chapter.reviewed_printed_pages.length;
  const reviewed = map.book_index.reduce((count, row) => count + row.reviewed_printed_pages.length, 0);
  const reviewedChapterCount = map.book_index.filter(row => chapterStatus(row) === "reviewed").length;
  const pendingChapterCount = map.book_index.length - reviewedChapterCount;
  const range = (pages: number[]) => pages[0] === pages[1] ? `${pages[0]}` : `${pages[0]}-${pages[1]}`;
  const vi = locale === "vi";
  const labels = vi ? {
    aria: viText("M%E1%BB%A5c%20l%E1%BB%A5c%20PDF%20v%C3%A0%20ph%E1%BA%A1m%20vi%20r%C3%A0%20so%C3%A1t"),
    title: viText("M%E1%BB%A5c%20l%E1%BB%A5c%20%C2%B7%2012%20ch%C6%B0%C6%A1ng"),
    filter: viText("B%E1%BB%99%20l%E1%BB%8Dc%20tr%E1%BA%A1ng%20th%C3%A1i%20r%C3%A0%20so%C3%A1t"),
    chapter: viText("Ch%C6%B0%C6%A1ng%20PDF"),
    related: viText("L%C4%83ng%20k%C3%ADnh%20ngu%E1%BB%93n%20li%C3%AAn%20quan"),
    notes: viText("Ghi%20ch%C3%BA%20ngu%E1%BB%93n%20%C4%91%C3%A3%20r%C3%A0%20so%C3%A1t"),
    notesAria: viText("Ghi%20ch%C3%BA%20ngu%E1%BB%93n%20%C4%91%C3%A3%20r%C3%A0%20so%C3%A1t%20cho%20ch%C6%B0%C6%A1ng"),
    notesIntro: viText("Ch%E1%BB%89%20di%E1%BB%85n%20gi%E1%BA%A3i%20ngu%E1%BB%93n%3B%20kh%C3%B4ng%20th%C3%AAm%20l%E1%BA%A7n%20xu%E1%BA%A5t%20hi%E1%BB%87n%20b%E1%BB%99%20ph%C3%A1t%20hi%E1%BB%87n%20ho%E1%BA%B7c%20k%E1%BA%BFt%20qu%E1%BA%A3%20%C4%91o%20l%C6%B0%E1%BB%9Dng."),
    cues: viText("D%E1%BA%A5u%20hi%E1%BB%87u%20r%C3%A0%20so%C3%A1t"),
    abstain: viText("Gi%E1%BB%9Bi%20h%E1%BA%A1n%20v%C3%A0%20d%E1%BA%A5u%20hi%E1%BB%87u%20c%E1%BA%A7n%20tr%C3%A1nh"),
    limits: viText("Gi%E1%BB%9Bi%20h%E1%BA%A1n%20ph%E1%BA%A1m%20vi%20v%C3%A0%20b%E1%BA%A3n%20d%E1%BB%8Bch"),
  } : {
    aria: "PDF book index and review coverage", title: "Book index · 12 chapters", filter: "Review status filter", chapter: "PDF chapter", related: "Related source lenses", notes: "Reviewed source notes", notesAria: "Reviewed source notes for chapter", notesIntro: "Source interpretation only; these notes do not add detector occurrences or measured outcomes.", cues: "Review cues", abstain: "Limits and abstain cues", limits: "Coverage and translation limits",
  };
  const copy = vi ? {
    concepts: viText("kh%C3%A1i%20ni%E1%BB%87m%20%C4%91%C3%A3%20tuy%E1%BB%83n%20ch%E1%BB%8Dn"), reviewedPages: viText("trang%20c%C3%B3%20ghi%20ch%C3%BA%20%C4%91%C3%A3%20r%C3%A0%20so%C3%A1t"), chapterNavigation: viText("Kho%E1%BA%A3ng%20ch%C6%B0%C6%A1ng%20d%C3%B9ng%20%C4%91%E1%BB%83%20%C4%91i%E1%BB%81u%20h%C6%B0%E1%BB%9Bng%3B%20c%C3%A1c%20h%C3%ACnh%20v%C3%A0%20ca%20h%E1%BA%B1ng%20ng%C3%A0y%20c%C3%B2n%20l%E1%BA%A1i%20ch%C6%B0a%20%C4%91%C6%B0%E1%BB%A3c%20ch%C3%A9p%20%C4%91%E1%BA%A7y%20%C4%91%E1%BB%A7."),
    allStates: viText("T%E1%BA%A5t%20c%E1%BA%A3%20tr%E1%BA%A1ng%20th%C3%A1i"), reviewedChapters: viText("Ch%C6%B0%C6%A1ng%20%C4%91%C3%A3%20r%C3%A0%20so%C3%A1t"), pendingChapters: viText("%C4%90ang%20ch%E1%BB%9D%20ho%E1%BA%B7c%20%C4%91ang%20r%C3%A0%20so%C3%A1t"), chapterPrefix: viText("Ch%C6%B0%C6%A1ng"), printed: viText("B%E1%BA%A3n%20in"), pdf: "PDF", reviewStatus: viText("Tr%E1%BA%A1ng%20th%C3%A1i%20r%C3%A0%20so%C3%A1t"), reviewed: viText("%C4%90%C3%A3%20r%C3%A0%20so%C3%A1t"), pending: viText("%C4%90ang%20ch%E1%BB%9D"), inReview: viText("%C4%90ang%20r%C3%A0%20so%C3%A1t"), reviewedPagesLabel: viText("Trang%20%C4%91%C3%A3%20r%C3%A0%20so%C3%A1t"), allPagesReviewed: viText("T%E1%BA%A5t%20c%E1%BA%A3%20c%C3%A1c%20trang%20trong%20kho%E1%BA%A3ng%20ch%C6%B0%C6%A1ng%20n%C3%A0y%20%C4%91%C3%A3%20c%C3%B3%20ghi%20ch%C3%BA%20ngu%E1%BB%93n.%20Vi%E1%BB%87c%20r%C3%A0%20so%C3%A1t%20kh%C3%B4ng%20x%C3%A1c%20l%E1%BA%ADp%20tri%E1%BB%83n%20khai%20b%E1%BB%99%20ph%C3%A1t%20hi%E1%BB%87n%20ho%E1%BA%B7c%20k%E1%BA%BFt%20qu%E1%BA%A3%20%C4%91o%20l%C6%B0%E1%BB%9Dng."), unreviewed: viText("C%C3%A1c%20trang%20ch%C6%B0a%20r%C3%A0%20so%C3%A1t%20v%E1%BA%ABn%20l%C3%A0%20m%E1%BB%91c%20%C4%91i%E1%BB%81u%20h%C6%B0%E1%BB%9Bng."), sourceGlossary: viText("B%E1%BA%A3ng%20thu%E1%BA%ADt%20ng%E1%BB%AF%20ch%C3%BA%20th%C3%ADch%20ngu%E1%BB%93n%20%C2%B7%20b%E1%BA%A3n%20in%20tr.%20247%20%2F%20PDF%20tr.%20257"), sourceOnly: viText("Ch%E1%BB%89%20di%E1%BB%85n%20gi%E1%BA%A3i%20ngu%E1%BB%93n"),
    monthsPrinted: viText("b%E1%BA%A3n%20in"), monthsPdf: "PDF", sourceNotesStatus: viText("CH%E1%BB%88%20R%C3%80%20SO%C3%81T%20NGU%E1%BB%92N%20%C2%B7%20"),
  } : {
    concepts: "curated concepts", reviewedPages: "pages with reviewed notes", chapterNavigation: "Chapter ranges provide navigation; the remaining figures and daily cases are not fully transcribed.", allStates: "All review states", reviewedChapters: "Reviewed chapters", pendingChapters: "Pending or in-review", chapterPrefix: "Chapter", printed: "Printed", pdf: "PDF", reviewStatus: "Review status", reviewed: "Reviewed", pending: "Pending", inReview: "In review", reviewedPagesLabel: "Reviewed pages", allPagesReviewed: "All pages in this chapter interval have source review notes. Review does not establish detector implementation or measured outcomes.", unreviewed: "Unreviewed pages remain navigation references.", sourceGlossary: "Source annotation glossary · printed p. 247 / PDF p. 257", sourceOnly: "Source interpretation only", monthsPrinted: "printed", monthsPdf: "PDF", sourceNotesStatus: "SOURCE_NOTES · ",
  };
  return <section className="p-akp-book" aria-label={labels.aria} lang={locale}>
    <div className="p-akp-family-head"><div><h3>{labels.title}</h3><p>{`${map.concepts.length} ${copy.concepts} · ${reviewed} ${copy.reviewedPages}. ${copy.chapterNavigation}`}</p></div>
      <div className="p-akp-book-filters">
        <label><span className="p-akp-visually-hidden">{labels.filter}</span><select aria-label={labels.filter} value={reviewFilter} onChange={event => setReviewFilter(event.target.value as "all" | "reviewed" | "pending")}>
          <option value="all">{copy.allStates} ({map.book_index.length})</option>
          <option value="reviewed">{copy.reviewedChapters} ({reviewedChapterCount})</option>
          <option value="pending" disabled={pendingChapterCount === 0}>{copy.pendingChapters} ({pendingChapterCount})</option>
        </select></label>
        <label><span className="p-akp-visually-hidden">{labels.chapter}</span><select aria-label={labels.chapter} value={chapter.number} onChange={event => setChapterNumber(Number(event.target.value))}>{visibleChapters.map(row => <option key={row.number} value={row.number}>{row.number}. {row.title}</option>)}</select></label>
      </div>
    </div>
    <article aria-live="polite" aria-label={`${copy.chapterPrefix} ${chapter.number}: ${chapter.title}`}>
      <h4>{chapter.title}</h4><p className="p-akp-source">{copy.printed} pp. {range(chapter.printed_range)} · {copy.pdf} pp. {range(chapter.pdf_range)}</p>
      <p>{chapter.summary}</p>
      <p className="p-akp-source">{copy.reviewStatus}: <strong>{chapterStatus(chapter) === "reviewed" ? copy.reviewed : chapterStatus(chapter) === "pending" ? copy.pending : copy.inReview}</strong> · <span>{copy.reviewedPagesLabel}: {chapterReviewedCount}/{chapterPageCount}</span>{chapterReviewedCount > 0 && <> - {formatPriceActionSourcePages(chapter.reviewed_printed_pages)}</>}</p>
      <p>{chapterReviewedCount === chapterPageCount ? copy.allPagesReviewed : copy.unreviewed}</p>
      <div className="p-akp-family-concepts" aria-label={labels.related}><span>{labels.related}</span><div>{chapter.concept_ids.map(id => <button type="button" key={id} onClick={() => onOpenConcept(id)}>{map.concepts.find(concept => concept.id === id)?.name || id}</button>)}</div></div>
      {sourceNotes.length > 0 && <section className="p-akp-source-notes" aria-label={`${labels.notesAria} ${chapter.number}`}>
        <h4>{labels.notes}</h4>
        <p>{labels.notesIntro}</p>
        {sourceNotes.map(lens => {
          const reviewStatus = getSourceConceptReviewStatus(lens.implementation);
          return <details key={`${chapter.number}-${lens.id}`} data-source-lens={lens.id}>
          <summary>{lens.name}</summary>
          <div className="p-akp-source-note-content" role="region" aria-label={`${lens.name} source notes`} tabIndex={0}>
            <p className="p-akp-source">{formatPriceActionSourcePages(lens.pages)}</p>
            <p>{lens.definition}</p>
            <h5>{labels.cues}</h5><ul>{lens.cues.map(cue => <li key={cue}>{cue}</li>)}</ul>
            <h5>{labels.abstain}</h5><ul>{lens.abstain.map(cue => <li key={cue}>{cue}</li>)}</ul>
            <p className="p-akp-source">{copy.sourceNotesStatus}SHADOW_ONLY / NO_DECISION / live_apply_allowed=false</p>
            {reviewStatus && <p className="p-akp-source" data-source-review-status={`source-status-${reviewStatus.status.toLowerCase()}`} role="status">{vi ? `${copy.sourceOnly} · ` : ""}{reviewStatus.label} / {reviewStatus.authority}</p>}
          </div>
        </details>;
        })}
      </section>}
      {chapter.number === 9 && <><ul className="p-akp-months">{map.case_study_months.map(month => <li key={month.month}>{month.month} {month.year}: {copy.monthsPrinted} pp. {range(month.printed_range)} · {copy.monthsPdf} pp. {range(month.pdf_range)}</li>)}</ul>
        <details><summary>{copy.sourceGlossary}</summary><dl>{map.glossary.map(entry => <div key={entry.term}><dt>{entry.term}</dt><dd>{entry.meaning}</dd></div>)}</dl></details></>}
    </article>
    <details><summary>{labels.limits}</summary><p>{map.coverage.page_convention}</p><ul>{map.coverage.limitations.map(note => <li key={note}>{note}</li>)}</ul></details>
  </section>;
}
