import { useState } from "react";
import {
  clearPatternReplayBookmark,
  loadPatternReplayBookmark,
  savePatternReplayBookmark,
  type PatternReplayBookmarkStorage,
} from "../lib/patternReplayBookmarkStore.ts";
import type { PatternReplayBookmark } from "../lib/patternReplayBookmark.ts";
import { patternReplayBookmarkCopy, type Locale } from "../lib/locale.ts";
import "./pattern-replay-bookmark-controls.css";

/**
 * Persistence controls for the currently selected causal replay.
 *
 * The component deliberately accepts an identity record only. The bookmark
 * codec rejects prices, OHLC, outcomes and statistics before anything reaches
 * storage; restoring still goes through the caller's current retained tape.
 */
export interface PatternReplayBookmarkControlsProps {
  /** Account/broker scope used to isolate this one saved identity. */
  scope: string;
  /** Current replay identity, or null when no replay can be saved. */
  current: PatternReplayBookmark | null;
  /** Resolve the identity against current retained data in the host. */
  onRestore: (bookmark: PatternReplayBookmark) => void;
  /** Optional storage injection for tests or an embedding app. */
  storage?: PatternReplayBookmarkStorage | null;
  /** Optional deterministic clock forwarded to the strict codec. */
  nowMs?: number;
  locale?: Locale;
}

function reasonText(reason: string, locale: Locale): string {
  const copy = patternReplayBookmarkCopy[locale];
  switch (reason) {
    case "REPLAY_BOOKMARK_SAVED": return copy.saved;
    case "REPLAY_BOOKMARK_LOADED": return copy.loaded;
    case "REPLAY_BOOKMARK_CLEARED": return copy.cleared;
    case "NO_REPLAY_BOOKMARK": return copy.missing;
    case "BOOKMARK_STORAGE_UNAVAILABLE": return copy.storageUnavailable;
    default: return copy.unavailable(reason);
  }
}

export function PatternReplayBookmarkControls({
  scope,
  current,
  onRestore,
  storage,
  nowMs,
  locale = "en",
}: PatternReplayBookmarkControlsProps) {
  const [notice, setNotice] = useState<{ scope: string; reason: string } | null>(null);
  const copy = patternReplayBookmarkCopy[locale];
  const status = notice?.scope === scope ? reasonText(notice.reason, locale) : copy.idle;
  const options = {
    ...(storage === undefined ? {} : { storage }),
    ...(nowMs === undefined ? {} : { nowMs }),
  };

  const save = () => {
    const result = savePatternReplayBookmark(scope, current, options);
    setNotice({ scope, reason: result.reason });
  };

  const restore = () => {
    const result = loadPatternReplayBookmark(scope, options);
    setNotice({ scope, reason: result.reason });
    if (result.state === "AVAILABLE" && result.bookmark) onRestore(result.bookmark);
  };

  const clear = () => {
    const result = clearPatternReplayBookmark(scope, options);
    setNotice({ scope, reason: result.reason });
  };

  return <section className="pattern-replay-bookmark-controls" aria-label={copy.section}>
    <div className="pattern-replay-bookmark-actions" role="group" aria-label={copy.actions}>
      <button type="button" onClick={save} disabled={!current}>{copy.save}</button>
      <button type="button" onClick={restore}>{copy.restore}</button>
      <button type="button" onClick={clear}>{copy.clear}</button>
    </div>
    <p className="pattern-replay-bookmark-copy">
      {copy.note}
    </p>
    <p className="pattern-replay-bookmark-status" role="status" aria-live="polite" aria-atomic="true">{status}</p>
  </section>;
}

