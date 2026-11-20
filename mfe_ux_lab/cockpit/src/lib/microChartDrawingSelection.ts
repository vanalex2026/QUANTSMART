/** Select the next saved drawing without changing chart viewport or evidence state. */
export function microChartDrawingSelection(index: number | null, key: string, count: number): number | null {
  if (count < 1 || (key !== "[" && key !== "]")) return null;
  const current = index === null || !Number.isInteger(index) ? (key === "]" ? -1 : 0) : Math.max(0, Math.min(index, count - 1));
  const step = key === "]" ? 1 : -1;
  return (current + step + count) % count;
}
