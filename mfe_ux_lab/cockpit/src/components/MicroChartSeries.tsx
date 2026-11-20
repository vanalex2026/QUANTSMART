import { memo } from "react";
import type { OhlcBar } from "../adapters/loadOhlcReplayChart.ts";

/**
 * Stable geometry inputs for the visible candle layer. The parent owns any
 * fractional pan transform; this component only renders integer viewport
 * geometry and therefore remains reusable across RAF pan frames.
 */
export interface CandleSeriesProps {
  bars: readonly OhlcBar[];
  start: number;
  end: number;
  cursor: number | null;
  formingIndex: number;
  left: number;
  top: number;
  height: number;
  slot: number;
  bodyWidth: number;
  lo: number;
  span: number;
}

const candleY = (price: number, top: number, height: number, lo: number, span: number) => top + height * (1 - (price - lo) / (span || 1));

function CandleSeriesView({ bars, start, end, cursor, formingIndex, left, top, height, slot, bodyWidth, lo, span }: CandleSeriesProps) {
  const first = Math.max(0, start);
  const last = Math.min(end, bars.length - 1);
  const nodes = [];
  for (let i = first; i <= last; i += 1) {
    if (cursor != null && i > cursor) continue;
    const bar = bars[i];
    if (!bar) continue;
    const cx = left + (i - start + 0.5) * slot;
    const up = bar.c >= bar.o;
    const forming = i === formingIndex;
    const color = up ? "var(--tv-up-strong)" : "var(--tv-down-strong)";
    const openY = candleY(bar.o, top, height, lo, span);
    const closeY = candleY(bar.c, top, height, lo, span);
    const highY = candleY(bar.h, top, height, lo, span);
    const lowY = candleY(bar.l, top, height, lo, span);
    const bodyTop = candleY(Math.max(bar.o, bar.c), top, height, lo, span);
    const bodyHeight = Math.max(Math.abs(openY - closeY), 1);
    const dash = forming ? "3 2" : undefined;
    nodes.push(
      <g key={i} data-candle-direction={up ? "up" : "down"} data-candle-state={forming ? "forming" : "closed"} opacity={1}>
        <line x1={cx} y1={highY} x2={cx} y2={lowY} stroke={color} strokeDasharray={dash} />
        <rect x={cx - bodyWidth / 2} y={bodyTop} width={bodyWidth} height={bodyHeight} fill={color} fillOpacity={1} stroke={color} strokeWidth={1} strokeDasharray={dash}>
          <title>{forming ? "Forming candle; context only; not closed-bar evidence" : "Closed candle"}</title>
        </rect>
      </g>,
    );
  }
  return <>{nodes}</>;
}

export const CandleSeries = memo(CandleSeriesView);
CandleSeries.displayName = "CandleSeries";

export interface IndicatorSeriesProps {
  series: readonly number[];
  start: number;
  end: number;
  /** Total bars in the display tape, including a forming tail when present. */
  barCount: number;
  tail?: number;
  liveValues?: readonly number[];
  liveStart?: number;
  left: number;
  top: number;
  height: number;
  slot: number;
  lo: number;
  span: number;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  strokeDasharray?: string;
}

function IndicatorSeriesView({ series, start, end, barCount, tail, liveValues, liveStart = Number.POSITIVE_INFINITY, left, top, height, slot, lo, span, stroke, strokeWidth, opacity, strokeDasharray }: IndicatorSeriesProps) {
  const first = Math.max(0, start);
  const last = Math.min(end, barCount - 1);
  const points: string[] = [];
  for (let index = first; index <= last; index += 1) {
    let value: number | undefined;
    if (Number.isFinite(liveStart) && index >= liveStart) value = liveValues?.[index - liveStart] ?? (index === barCount - 1 ? tail : undefined);
    else value = tail !== undefined && index === barCount - 1 ? tail : series[index];
    if (value === undefined) continue;
    const x = left + (index - start + 0.5) * slot;
    const y = Math.max(top, Math.min(top + height, candleY(value, top, height, lo, span)));
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return <polyline points={points.join(" ")} fill="none" stroke={stroke} strokeWidth={strokeWidth} opacity={opacity} strokeDasharray={strokeDasharray} />;
}

export const IndicatorSeries = memo(IndicatorSeriesView);
IndicatorSeries.displayName = "IndicatorSeries";
