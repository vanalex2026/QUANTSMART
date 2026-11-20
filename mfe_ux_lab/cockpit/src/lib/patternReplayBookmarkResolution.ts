import type { OhlcBar } from "../adapters/loadOhlcReplayChart.ts";
import type { SignalMarker } from "../components/MicroChart.tsx";
import { canonicalPatternReplayBookmarkTime, encodePatternReplayBookmark } from "./patternReplayBookmark.ts";
import { patternCausalReplay } from "./patternCausalReplay.ts";

/** Recompute evidence from the current tape; a saved identity attests no data. */
export function resolvePatternReplayBookmark(value: unknown, signal: SignalMarker | null, bars: readonly OhlcBar[], allowGeometry: boolean, nowMs = Date.now()) {
  const decoded = encodePatternReplayBookmark(value, { nowMs });
  if (decoded.state !== "AVAILABLE") return { state: "UNAVAILABLE" as const, reason: decoded.reason };
  const bookmark = decoded.bookmark;
  if (!signal || canonicalPatternReplayBookmarkTime(signal.time) !== bookmark.occurrenceTime || signal.conceptId !== bookmark.conceptId || signal.reads !== bookmark.reads)
    return { state: "UNAVAILABLE" as const, reason: "EXACT_CURRENT_OCCURRENCE_NOT_AVAILABLE" };
  const replay = patternCausalReplay(bars, signal.time, signal.reads, allowGeometry, { mode: bookmark.mode, revealedTime: bookmark.revealedTime, setup: signal.pdfSetup, nowMs });
  if (replay.state !== "AVAILABLE" || replay.revealedTime !== bookmark.revealedTime)
    return { state: "UNAVAILABLE" as const, reason: replay.reason };
  return { state: "AVAILABLE" as const, reason: "EXACT_RETAINED_REPLAY_RESTORED", bookmark, signal, replay };
}
