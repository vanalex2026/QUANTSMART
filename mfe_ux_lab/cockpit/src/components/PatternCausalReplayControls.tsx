import type { PatternCausalReplay } from "../lib/patternCausalReplay.ts";
import { patternCausalReplayCopy, type Locale } from "../lib/locale.ts";

export function PatternCausalReplayControls({ enabled, replay, onToggle, onPrevious, onNext, onReset, locale = "en" }: {
  enabled: boolean;
  replay: PatternCausalReplay | null;
  onToggle: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onReset: () => void;
  locale?: Locale;
}) {
  const revealed = replay?.revealedIndex != null && replay.anchorIndex != null
    ? Math.max(0, replay.revealedIndex - replay.anchorIndex) : 0;
  const copy = patternCausalReplayCopy[locale];
  return <section className="pattern-causal-replay" aria-label={copy.section}>
    <button type="button" aria-pressed={enabled} onClick={onToggle}>{enabled ? copy.exit : copy.reveal}</button>
    {enabled && <>
      <div className="pattern-causal-replay-actions" role="group" aria-label={copy.controls}>
        <button type="button" aria-label={copy.previousLabel} disabled={!replay?.canStepBackward} onClick={onPrevious}>{copy.previous}</button>
        <button type="button" aria-label={copy.nextLabel} disabled={!replay?.canStepForward} onClick={onNext}>{copy.next}</button>
        <button type="button" aria-label={copy.resetLabel} onClick={onReset}>{copy.reset}</button>
      </div>
      <p role="status" aria-live="polite" aria-atomic="true">{replay?.view ? copy.progress(revealed, replay.revealedTime) : copy.unavailable}</p>
      <p className="chart-pattern-inspector-muted">{copy.note}</p>
    </>}
  </section>;
}
