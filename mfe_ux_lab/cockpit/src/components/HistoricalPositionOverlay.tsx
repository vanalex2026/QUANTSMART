import type { HistoricalPatternPosition } from "../lib/historicalPatternPosition.ts";
import { arrangeZoneLabels } from "../lib/chartZoneLabels.ts";

const price = (value: number) => value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function HistoricalPositionOverlay({ position, xFor, yFor, left, right, top, bottom, layer = "labels" }: {
  position: HistoricalPatternPosition;
  xFor: (index: number) => number; yFor: (price: number) => number;
  left: number; right: number; top: number; bottom: number;
  layer?: "areas" | "labels";
}) {
  const { entry, target, invalidation } = position;
  const x0 = Math.max(left, xFor(position.index));
  const x1 = Math.min(right, xFor(position.endIndex + 0.5));
  if (x1 <= x0 || right <= left) return null;
  const targetColor = "var(--tv-up-strong)", riskColor = "var(--tv-down-strong)";
  const summary = `Historical ${position.side} illustrative position at ${position.time} UTC; entry ${price(entry)}; target ${price(target)}; invalidation ${price(invalidation)}; ${position.state}; ${position.observedBars} observed closed M5 bars; fixed setup prices, target 2.2 ATR, invalidation 1 ATR; SHADOW_ONLY; NO_DECISION; no order authority`;
  const labelX = Math.max(left + 2, Math.min(right - 142, x0 + 4));
  const levels = [{ value: entry, label: "ENTRY", paint: "#eee" }, { value: target, label: "TARGET", paint: targetColor }, { value: invalidation, label: "INVALIDATION", paint: riskColor }];
  const labelYs = arrangeZoneLabels(levels.map(({ value }) => yFor(value) - 4), top + 30, bottom - 3, 16);
  const area = (to: number, color: string) => <rect x={x0} y={Math.min(yFor(entry), yFor(to))} width={x1 - x0} height={Math.abs(yFor(entry) - yFor(to))} fill={color} fillOpacity="0.16" stroke={color} strokeOpacity="0.7" strokeWidth="1" />;
  if (layer === "areas") return <g aria-hidden="true" pointerEvents="none">{area(target, targetColor)}{area(invalidation, riskColor)}</g>;
  return <g className="microchart-historical-position" role="img" aria-label={summary} data-historical-position={position.side} data-position-time={position.time} data-position-entry={entry} data-position-target={target} data-position-invalidation={invalidation} data-position-state={position.state} pointerEvents="none">
    <title>{summary}</title>
    {levels.map(({ value: level, label, paint }, index) => {
      const labelY = labelYs[index];
      return <g key={label} data-position-level={label}>
        <line x1={x0} x2={x1} y1={yFor(level)} y2={yFor(level)} stroke={paint} strokeDasharray={label === "ENTRY" ? undefined : "4 3"} />
        <line x1={Math.min(x1, labelX)} x2={labelX} y1={yFor(level)} y2={labelY - 4} stroke={paint} strokeOpacity="0.5" />
        {right - left >= 150 && <><rect x={labelX - 2} y={labelY - 10} width="140" height="14" rx="2" fill="var(--chart-canvas)" fillOpacity="0.92" /><text x={labelX + 2} y={labelY} fill={paint} fontSize="9" fontFamily="ui-monospace,monospace">{label} {price(level)}</text></>}
      </g>;
    })}
    {right - left >= 150 && <text x={labelX} y={Math.max(top + 12, Math.min(...labelYs) - 18)} fill="#ddd" fontSize="9" fontWeight="700">HIST {position.side} / STUDY</text>}
  </g>;
}
