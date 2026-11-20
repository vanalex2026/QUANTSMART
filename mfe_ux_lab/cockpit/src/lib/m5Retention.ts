/** Calendar-aware retention for the focused XAUUSD M5 display tape. */
export const M5_DISPLAY_WINDOW_MS = 2 * 365 * 24 * 60 * 60 * 1000;
const CANONICAL_UTC_TIMESTAMP = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{3}))?Z$/;

const parseCanonicalUtc = (value: string): number => {
  const match = value.match(CANONICAL_UTC_TIMESTAMP);
  if (!match) return Number.NaN;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return Number.NaN;
  const date = new Date(parsed);
  const expected = [Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]), Number(match[6]), Number(match[7] || 0)];
  const actual = [date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds(), date.getUTCMilliseconds()];
  return expected.every((component, index) => component === actual[index]) ? parsed : Number.NaN;
};

/**
 * Subtract calendar years in UTC while clamping a leap day to the last day of
 * the target month. Date#setUTCFullYear alone normalizes 29 February into
 * March in a non-leap target year and silently changes the retention window.
 */
export function calendarTwoYearsBefore(lastMs: number): number {
  const last = new Date(lastMs);
  const targetYear = last.getUTCFullYear() - 2;
  const month = last.getUTCMonth();
  const day = Math.min(last.getUTCDate(), new Date(Date.UTC(targetYear, month + 1, 0)).getUTCDate());
  return Date.UTC(targetYear, month, day, last.getUTCHours(), last.getUTCMinutes(), last.getUTCSeconds(), last.getUTCMilliseconds());
}

/**
 * Cap M5 rows to the inclusive latest-two-year UTC calendar window. Timestamp
 * parsing is fail-closed: malformed rows are excluded and the latest valid
 * timestamp is used, so one bad tail row cannot disable retention entirely.
 */
export function capM5DisplayWindow<T extends { t: string }>(rows: T[], timeframe: string): T[] {
  if (timeframe !== "M5") return rows;
  const parsed = rows.map((row) => parseCanonicalUtc(row.t));
  const valid = parsed.filter((value) => Number.isFinite(value));
  if (!valid.length) return [];
  // Do not spread a two-year M5 tape into Math.max: ~200k arguments exceed
  // the JavaScript call-stack limit before the chart can render.
  let latest = Number.NEGATIVE_INFINITY;
  for (const value of valid) if (value > latest) latest = value;
  const cutoff = calendarTwoYearsBefore(latest);
  return rows.filter((_, index) => Number.isFinite(parsed[index]) && parsed[index] >= cutoff);
}

/** Return the latest timestamp that the M5 retention filter would accept.
 * Keeping this in the same module prevents provenance readouts from using an
 * offset or malformed tail row that was already rejected by the display cap. */
export function latestCanonicalUtc<T extends { t: string }>(rows: T[]): string | null {
  let latest = Number.NaN;
  for (const row of rows) {
    const parsed = parseCanonicalUtc(row.t);
    if (Number.isFinite(parsed) && (!Number.isFinite(latest) || parsed > latest)) latest = parsed;
  }
  return Number.isFinite(latest) ? new Date(latest).toISOString() : null;
}
