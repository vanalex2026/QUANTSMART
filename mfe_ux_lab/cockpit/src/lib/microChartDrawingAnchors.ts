import type { OhlcBar } from "../adapters/loadOhlcReplayChart.ts";

export interface MicroChartDrawingPoint { i: number; p: number; t?: string }
export type MicroChartDrawingKind = "rect" | "hline" | "trend" | "measure" | "fib" | "brush" | "text";
export interface MicroChartDrawingAnchor {
  kind: MicroChartDrawingKind;
  a: MicroChartDrawingPoint;
  b: MicroChartDrawingPoint;
  color: string;
  pts?: MicroChartDrawingPoint[];
  text?: string;
}

function isSafeTimestamp(value: string): boolean {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-]\d{2}:\d{2})$/);
  if (!match) return false;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, fractionText, zone] = match;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || parsed > Date.now()) return false;
  const offsetMinutes = zone === "Z"
    ? 0
    : (Number(zone.slice(1, 3)) * 60 + Number(zone.slice(4, 6))) * (zone[0] === "+" ? 1 : -1);
  if (offsetMinutes > 23 * 60 + 59 || offsetMinutes < -(23 * 60 + 59)) return false;
  const local = new Date(parsed + offsetMinutes * 60_000);
  const fractionMs = fractionText ? Number(fractionText.padEnd(3, "0")) : 0;
  return local.getUTCFullYear() === Number(yearText)
    && local.getUTCMonth() + 1 === Number(monthText)
    && local.getUTCDate() === Number(dayText)
    && local.getUTCHours() === Number(hourText)
    && local.getUTCMinutes() === Number(minuteText)
    && local.getUTCSeconds() === Number(secondText)
    && local.getUTCMilliseconds() === fractionMs;
}

function findTimestamp(rows: readonly OhlcBar[], target: number): number {
  let lo = 0;
  let hi = rows.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    const instant = Date.parse(rows[mid]?.t || "");
    if (instant < target) lo = mid + 1;
    else hi = mid;
  }
  return lo < rows.length && Date.parse(rows[lo]?.t || "") === target ? lo : -1;
}

/** Re-anchor saved drawings without allocating full-tape timestamp maps. */
export function reanchorMicroChartDrawings<T extends MicroChartDrawingAnchor>(drawings: readonly T[], rows: readonly OhlcBar[]): T[] {
  if (!drawings.length || rows.length < 2) return drawings.slice();
  const latestInstant = Date.parse(rows[rows.length - 1]?.t || "");
  const resolve = (point: MicroChartDrawingPoint): MicroChartDrawingPoint | null => {
    if (!point.t) return point;
    if (!isSafeTimestamp(point.t)) return null;
    const pointInstant = Date.parse(point.t);
    if (!Number.isFinite(pointInstant) || pointInstant > latestInstant) return null;
    const index = findTimestamp(rows, pointInstant);
    if (index < 0) return null;
    return index === point.i ? point : { ...point, i: index };
  };
  return drawings.flatMap((drawing) => {
    const a = resolve(drawing.a);
    const b = resolve(drawing.b);
    const points = drawing.pts?.map(resolve);
    if (!a || !b || points?.some((point): point is null => point === null)) return [];
    const resolvedPoints = points as MicroChartDrawingPoint[] | undefined;
    const changed = a !== drawing.a || b !== drawing.b || resolvedPoints?.some((point, index) => point !== drawing.pts?.[index]);
    return [changed ? { ...drawing, a, b, ...(resolvedPoints ? { pts: resolvedPoints } : {}) } : drawing];
  });
}
