import { parseEconomicCalendar, type EconomicCalendar } from "./economicCalendar.ts";

/**
 * Read the explicitly imported calendar without creating a fallback event.
 * Invalid or absent storage stays unavailable so source-note detectors fail
 * closed instead of turning a recurring proxy into news evidence.
 */
export function readConfiguredEconomicCalendar(storage?: Pick<Storage, "getItem">): EconomicCalendar | null {
  try {
    const source = storage ?? (typeof localStorage === "undefined" ? null : localStorage);
    const raw = source?.getItem("mfe_calendar_events");
    return raw ? parseEconomicCalendar(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}
