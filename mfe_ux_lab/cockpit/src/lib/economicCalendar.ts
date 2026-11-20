export type EconomicCalendarEvent = {
  title: string;
  at_utc: string;
};

export type EconomicCalendar = {
  status: "CONFIGURED";
  source: string;
  updated_at: string;
  events: EconomicCalendarEvent[];
};

const UTC_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})Z$/;
const MAX_SOURCE_LENGTH = 200;
const MAX_TITLE_LENGTH = 240;
const MAX_EVENTS = 2_000;

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("CALENDAR_INVALID_OBJECT");
  }
  return value as Record<string, unknown>;
}

function canonicalUtc(value: unknown, code: string): string {
  if (typeof value !== "string" || !UTC_TIMESTAMP.test(value) || Number.isNaN(Date.parse(value))) {
    throw new Error(code);
  }
  // Date.parse normalizes impossible calendar fields such as February 30.
  // Require the parsed instant to round-trip to the supplied UTC identity.
  if (new Date(Date.parse(value)).toISOString() !== value) throw new Error(code);
  return value;
}

function boundedText(value: unknown, max: number, code: string): string {
  if (typeof value !== "string" || value.length === 0 || value.trim() !== value || value.length > max) {
    throw new Error(code);
  }
  return value;
}

export function parseEconomicCalendar(value: unknown): EconomicCalendar {
  const input = record(value);
  if (input.status !== "CONFIGURED") throw new Error("CALENDAR_INVALID_STATUS");
  const source = boundedText(input.source, MAX_SOURCE_LENGTH, "CALENDAR_INVALID_SOURCE");
  const updated_at = canonicalUtc(input.updated_at, "CALENDAR_INVALID_UPDATED_AT");
  if (!Array.isArray(input.events) || input.events.length > MAX_EVENTS) {
    throw new Error("CALENDAR_INVALID_EVENTS");
  }

  const seen = new Set<string>();
  const events = input.events.map((raw, index) => {
    const event = record(raw);
    const title = boundedText(event.title, MAX_TITLE_LENGTH, `CALENDAR_INVALID_TITLE_${index}`);
    const at_utc = canonicalUtc(event.at_utc, `CALENDAR_INVALID_EVENT_TIME_${index}`);
    const identity = `${at_utc}\u0000${title}`;
    if (seen.has(identity)) throw new Error(`CALENDAR_DUPLICATE_EVENT_${index}`);
    seen.add(identity);
    return { title, at_utc };
  });

  events.sort((a, b) => a.at_utc.localeCompare(b.at_utc) || a.title.localeCompare(b.title));
  return { status: "CONFIGURED", source, updated_at, events };
}
