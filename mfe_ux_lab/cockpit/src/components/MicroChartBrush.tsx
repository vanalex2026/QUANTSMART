import { memo } from "react";

// Fractional pan belongs to the parent SVG transform. A long saved brush must
// not serialize thousands of points again just because that transform moved.
export const MicroChartBrush = memo(function MicroChartBrush({ points, color, opacity, start, left, top, height, slot, lo, span }: {
  points?: ReadonlyArray<{ i: number; p: number }>;
  color: string; opacity: number;
  start: number; left: number; top: number; height: number; slot: number; lo: number; span: number;
}) {
  const geometry = (points || []).map(point => `${(left + (point.i - start + 0.5) * slot).toFixed(1)},${(top + height * (1 - (point.p - lo) / span)).toFixed(1)}`).join(" ");
  return <polyline points={geometry} fill="none" stroke={color} strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" opacity={opacity} />;
});
