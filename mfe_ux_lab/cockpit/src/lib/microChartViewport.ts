import type { OhlcBar } from "../adapters/loadOhlcReplayChart.ts";

export interface MicroChartViewportIdentity { start: number; end: number; startTime?: string; endTime?: string }

/** Return the inclusive viewport range from rows sorted by candle index. */
export function sliceSortedByIndex<T extends { i: number }>(rows: readonly T[], start: number, end: number): T[] {
  if (!rows.length || end < start) return [];
  let lo = 0;
  let hi = rows.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (rows[mid].i < start) lo = mid + 1;
    else hi = mid;
  }
  const first = lo;
  lo = first;
  hi = rows.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (rows[mid].i <= end) lo = mid + 1;
    else hi = mid;
  }
  return rows.slice(first, lo);
}

/** Preserve visible candle identities when a refreshed tape shifts rows. */
export function reanchorViewport(viewport: MicroChartViewportIdentity, previousBars: OhlcBar[], nextBars: OhlcBar[], pinLiveTail = false): MicroChartViewportIdentity {
  if (nextBars.length < 2) return { start: 0, end: Math.max(1, nextBars.length - 1) };
  // Most refreshes append or replace the forming tail while retaining the
  // visible UTC rows at the same indices. Resolve those anchors directly and
  // defer the full-tape map until an actual retention/interior shift needs it.
  // This keeps the common 141k-row refresh path allocation-free without
  // weakening timestamp identity when a shift really occurs.
  let byInstant: Map<number, number> | undefined;
  const timestampIndex = (instant: number): number | undefined => {
    if (!Number.isFinite(instant)) return undefined;
    byInstant ??= new Map(nextBars.map((bar, index) => [Date.parse(bar.t), index]));
    return byInstant.get(instant);
  };
  const resolve = (index: number, timestamp?: string) => {
    const target = timestamp || previousBars[index]?.t;
    const instant = target ? Date.parse(target) : NaN;
    const candidate = Math.max(0, Math.min(nextBars.length - 1, Math.trunc(index)));
    const candidateInstant = Date.parse(nextBars[candidate]?.t || "");
    const exact = Number.isFinite(instant) && candidateInstant === instant
      ? candidate
      : timestampIndex(instant);
    return exact == null ? Math.max(0, Math.min(nextBars.length - 1, Math.trunc(index))) : exact;
  };
  const wasAtTail = viewport.end >= previousBars.length - 1;
  let end = resolve(viewport.end, viewport.endTime);
  let start = resolve(viewport.start, viewport.startTime);
  const tailAdvanced = Date.parse(nextBars[nextBars.length - 1].t) > Date.parse(previousBars[previousBars.length - 1]?.t);
  if (pinLiveTail && wasAtTail && tailAdvanced) {
    const width = Math.max(1, viewport.end - viewport.start);
    end = nextBars.length - 1;
    start = Math.max(0, end - width);
  }
  end = Math.max(1, Math.min(nextBars.length - 1, end));
  start = Math.max(0, Math.min(nextBars.length - 2, Math.min(start, end - 1)));
  return { start, end, startTime: nextBars[start]?.t, endTime: nextBars[end]?.t };
}
