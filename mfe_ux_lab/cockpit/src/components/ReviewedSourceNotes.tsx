import { Component, lazy, Suspense, useId, useRef, useState, type ReactNode } from "react";
import type { KnowledgeConcept } from "../lib/priceActionKnowledge.ts";
import { useLocale } from "../lib/locale.tsx";
import { sourceNotesUi, type SourceNotesLocale } from "../lib/sourceNotesLocalization.ts";

// Creating the lazy type does not fetch the module. It first renders after the
// reader expands this control; retry creates a fresh React lazy import attempt.
const createSourceNotes = () => lazy(() => import("./ChartPatternSourceNotes.tsx"));
type BoundaryProps = { children: ReactNode; onRetry: () => void; errorCopy: string; retryCopy: string };
class SourceNotesBoundary extends Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <p role="alert">{this.props.errorCopy} <button type="button" onClick={this.props.onRetry}>{this.props.retryCopy}</button></p>;
    return this.props.children;
  }
}

export function ReviewedSourceNotes({ knowledge }: { knowledge: KnowledgeConcept }) {
  let locale: SourceNotesLocale = "en";
  let toggleLocale = () => {};
  try {
    const localized = useLocale();
    locale = localized.locale;
    toggleLocale = localized.toggleLocale;
  } catch {
    // Isolated inspector renders retain the English default without a shell provider.
  }
  const ui = sourceNotesUi(locale);
  const [open, setOpen] = useState(false);
  const [SourceNotes, setSourceNotes] = useState(createSourceNotes);
  const [attempt, setAttempt] = useState(0);
  const detailsId = useId();
  const titleId = useId();
  const toggle = useRef<HTMLButtonElement | null>(null);
  const details = useRef<HTMLDivElement | null>(null);
  return <section className="chart-pattern-source-notes">
    <h3 id={titleId}>{locale === "vi" ? "Ghi chú nguồn đã rà soát" : "Reviewed source notes"}</h3>
    <button ref={toggle} type="button" aria-expanded={open} aria-controls={detailsId} onClick={() => setOpen((value) => !value)}>{open ? ui.hide : ui.read}</button>
    {open && <div ref={details} id={detailsId} className="chart-pattern-source-notes-scroll" role="region" tabIndex={0} aria-labelledby={titleId} onKeyDown={(event) => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setOpen(false); toggle.current?.focus(); }
    }}>
      <SourceNotesBoundary key={attempt} errorCopy={ui.failed} retryCopy={ui.retry} onRetry={() => {
        // The retry button unmounts with its failed boundary. Keep keyboard
        // focus on the persistent region while the fresh import is pending.
        (details.current ?? toggle.current)?.focus({ preventScroll: true });
        setSourceNotes(() => createSourceNotes()); setAttempt((value) => value + 1);
      }}>
        <Suspense fallback={<p role="status">{ui.loading}</p>}>
          <SourceNotes knowledge={knowledge} locale={locale} onToggleLocale={toggleLocale} />
        </Suspense>
      </SourceNotesBoundary>
    </div>}
  </section>;
}
