/** Locate a timestamp in an already measured chronological occurrence index.
 * Binary search keeps navigation independent of the size of the retained tape.
 * An unmeasured current setup may sit after the latest measured occurrence.
 */
export function patternOccurrenceNavigation(rows: readonly { time: string }[], time: string) {
  const instant = Date.parse(time);
  if (!Number.isFinite(instant) || !rows.length) return { selected: -1, earlier: -1, later: -1, total: rows.length };
  let low = 0, high = rows.length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (Date.parse(rows[mid].time) < instant) low = mid + 1;
    else high = mid;
  }
  const selected = low < rows.length && Date.parse(rows[low].time) === instant ? low : -1;
  const later = selected >= 0 ? low + 1 : low;
  return { selected, earlier: low - 1, later: later < rows.length ? later : -1, total: rows.length };
}
