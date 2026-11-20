import knowledgeMap from "../../../../docs/price_action_knowledge_map.json";
import { validatePriceActionKnowledgeMap, type KnowledgeConcept, type KnowledgeMap } from "../lib/priceActionKnowledge.ts";
import { formatPriceActionSourcePages } from "../lib/priceActionSourcePages.ts";
import { getSourceConceptReviewStatus } from "../lib/sourceConceptStatus.ts";
import { getSourceNotesCopy, sourceNotesStatus, sourceNotesUi, type SourceNotesLocale } from "../lib/sourceNotesLocalization.ts";

// Full source prose is loaded only by the expanded inspector control. The page
// index and detector implementation are deliberately not dependencies here.
const map = knowledgeMap as KnowledgeMap;
const validation = validatePriceActionKnowledgeMap(map);
if (!validation.ok) throw new Error(`Invalid reviewed source notes: ${validation.errors.join("; ")}`);

export default function ChartPatternSourceNotes({ knowledge, locale = "en", onToggleLocale }: { knowledge: KnowledgeConcept; locale?: SourceNotesLocale; onToggleLocale?: () => void }) {
  const lenses = (map.source_lenses || []).filter((lens) => lens.concept_ids.includes(knowledge.id));
  const reviewStatus = getSourceConceptReviewStatus(knowledge.implementation);
  const ui = sourceNotesUi(locale);
  const copy = getSourceNotesCopy(knowledge, locale);
  return <>
    <div className="chart-pattern-source-notes-language" role="group" aria-label={ui.language}>
      <span>{ui.language}</span>
      <button type="button" aria-pressed={locale === "en"} onClick={locale === "vi" ? onToggleLocale : undefined}>{ui.english}</button>
      <button type="button" aria-pressed={locale === "vi"} onClick={locale === "en" ? onToggleLocale : undefined}>{ui.vietnamese}</button>
    </div>
    <p className="chart-pattern-inspector-muted">SOURCE_NOTES · {sourceNotesStatus(locale)}. {locale === "vi" ? "Ghi chú PDF chỉ phục vụ rà soát và không thêm quy tắc bộ phát hiện, lần xuất hiện hoặc kết quả đo lường. Ví dụ tường thuật không cung cấp OHLC XAUUSD hay tỷ lệ thắng." : "Reviewed PDF context only. These notes add no detector rules, occurrences or measured outcomes. Narrative examples supply no XAUUSD OHLC or win rates."}</p>
    <p className="chart-pattern-inspector-muted">{ui.authority}</p>
    {reviewStatus && <p className="chart-pattern-inspector-muted" data-source-review-status={`source-status-${reviewStatus.status.toLowerCase()}`} role="status">{reviewStatus.label} / {reviewStatus.authority} · {locale === "vi" ? "Chỉ rà soát nguồn; dữ liệu không khả dụng; kết quả được giữ lại." : "Source review only; market data unavailable; outcomes withheld."}</p>}
    {!lenses.length && <p role="status">{ui.noNotes}</p>}
    {lenses.map((lens) => <article key={lens.id} className="chart-pattern-source-lens" role="region" tabIndex={0} aria-label={`Reviewed source lens: ${lens.name}`}>
      <h4>{locale === "vi" ? `${copy.name} · ${lens.name}` : lens.name}</h4>
      <section lang={locale} aria-label={ui.translated}>
        <h5>{ui.translated}</h5>
        <p>{copy.definition}</p>
        <h5>{ui.cues}</h5><ul>{copy.cues.map((cue) => <li key={`translated-cue-${cue}`}>{cue}</li>)}</ul>
        <h5>{ui.abstain}</h5><ul>{copy.abstain.map((cue) => <li key={`translated-abstain-${cue}`}>{cue}</li>)}</ul>
      </section>
      <details>
        <summary>{ui.original}</summary>
        <div lang="en"><p>{lens.definition}</p>
        <h5>Look for</h5><ul>{lens.cues.map((cue) => <li key={cue}>{cue}</li>)}</ul>
        <h5>When to abstain</h5><ul>{lens.abstain.map((cue) => <li key={cue}>{cue}</li>)}</ul></div>
      </details>
      <p className="chart-pattern-inspector-muted">{formatPriceActionSourcePages(lens.pages)}</p>
      <p className="chart-pattern-inspector-muted">{sourceNotesStatus(locale)} · {ui.authority}</p>
    </article>)}
  </>;
}
