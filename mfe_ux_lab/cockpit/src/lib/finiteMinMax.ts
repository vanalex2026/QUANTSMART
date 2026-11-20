/** Iterative finite range aggregation for large chart/history tapes. */
export function finiteMinMax(values: Iterable<number>): [number, number] | null {
  let lo = Number.POSITIVE_INFINITY;
  let hi = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    if (!Number.isFinite(value)) continue;
    if (value < lo) lo = value;
    if (value > hi) hi = value;
  }
  return lo === Number.POSITIVE_INFINITY ? null : [lo, hi];
}
