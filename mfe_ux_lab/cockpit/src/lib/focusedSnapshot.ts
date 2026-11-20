/** Read-only import contract for the focused M5 research snapshot. */
import { getPriceActionKnowledge, PRICE_ACTION_KNOWLEDGE_PROVENANCE, priceActionKnowledgeConceptIds } from "./priceActionKnowledgeLookup.ts";
import { NAMED_CANDLE_PATTERNS } from "./candlePatternAtlas.ts";
import { NAMED_CANDLE_FAMILIES } from "./namedCandleKnowledge.ts";
import type { NamedCandleFocus } from "./namedCandleHistory.ts";

export const FOCUSED_SNAPSHOT_SCHEMA = "quantsmart.focused-m5-research-snapshot/1" as const;
/** Stable authority attestation: imported snapshots can never grant execution rights. */
export const FOCUSED_SNAPSHOT_AUTHORITY = "SHADOW_ONLY / NO_DECISION / live_apply_allowed=false" as const;
export const FOCUSED_KNOWLEDGE_MAP_SCHEMA = PRICE_ACTION_KNOWLEDGE_PROVENANCE.schema;
export const FOCUSED_KNOWLEDGE_SOURCE_SHA256 = PRICE_ACTION_KNOWLEDGE_PROVENANCE.sourceSha256;
const FOCUSED_KNOWLEDGE_SOURCE_TITLE = PRICE_ACTION_KNOWLEDGE_PROVENANCE.sourceTitle;
const FOCUSED_KNOWLEDGE_PDF_PAGES = PRICE_ACTION_KNOWLEDGE_PROVENANCE.pdfPages;
const FOCUSED_KNOWLEDGE_CONCEPT_IDS = new Set(priceActionKnowledgeConceptIds);
const FOCUSED_M5_MS = 300_000;
export const FOCUSED_DRAWING_KINDS = ["rect", "hline", "trend", "measure", "fib", "brush", "text"] as const;
export type FocusedSnapshotDrawingKind = typeof FOCUSED_DRAWING_KINDS[number];
export interface FocusedSnapshotPoint { i: number; p: number; t?: string }
export interface FocusedSnapshotDrawing { kind: FocusedSnapshotDrawingKind; a: FocusedSnapshotPoint; b: FocusedSnapshotPoint; color: string; pts?: FocusedSnapshotPoint[]; text?: string }

export interface FocusedSnapshotImport {
  schema: typeof FOCUSED_SNAPSHOT_SCHEMA;
  symbol: string;
  timeframe: string;
  authority?: typeof FOCUSED_SNAPSHOT_AUTHORITY;
  latest_closed_bar_time?: string | null;
  latest_closed_bar_age_ms?: number | null;
  forecast_evidence_bars?: number;
  forecast_evidence_window?: string | null;
  forecast_evidence_limit?: number;
  forecast_retained_bars?: number;
  forecast_omitted_bars?: number;
  forecast_evidence_truncated?: boolean;
  forecast_evidence_scope?: string | null;
  forecast_truncated?: boolean;
  /** Freshness attestation captured when the focused forecast was exported. */
  forecast_freshness?: {
    ok: boolean;
    latest_closed_bar_utc: string | null;
    age_ms: number | null;
    max_age_ms: number;
    reason: string;
  };
  /** The saved read-only forecast state, including an explicit WAIT reason. */
  forecast?: {
    status?: string;
    direction?: string | null;
  };
  /** Attestation for the PDF knowledge graph used by the selected concept. */
  knowledge_map_provenance?: {
    schema: string;
    source_sha256: string;
    source_title?: string;
    pdf_pages?: number;
  };
  selected_concept?: string | null;
  /** Optional concept payload exported with the PDF page anchors. Omitted by
   * early schema-1 snapshots; when present it is checked against the indexed
   * knowledge map before a session can resume. */
  selected_concept_knowledge?: unknown;
  selected_concept_assessment?: unknown;
  selected_concept_evidence?: any;
  /** Informational receipt only. UI recomputes context from the current tape;
   * imported measurements never qualify a setup or supply chart levels. */
  selected_setup_room_context?: unknown;
  /** Informational only; wider swing/range context is recomputed from the tape. */
  selected_setup_market_context?: unknown;
  /** Informational only; correction strength is recomputed from closed bars. */
  selected_setup_pullback_pressure?: unknown;
  inspection?: {
    /** Independent full-history taxonomy focus, revalidated against current bars. */
    named_candle_focus?: NamedCandleFocus | null;
    historical_tape_enabled?: boolean;
    chart_focus_index?: number | null;
    chart_focus_time?: string | null;
    viewport_start_index?: number | null;
    viewport_end_index?: number | null;
    viewport_start_time?: string | null;
    viewport_end_time?: string | null;
    preview_occurrence_index?: number | null;
    preview_occurrence?: unknown;
    analogue_match_index?: number | null;
    analogue_match_time?: string | null;
    /** Named candle filter applied to the causal analogue tape. */
    analogue_pattern_filter?: string | null;
    analogue_family_filter?: string | null;
  };
  pattern_census?: unknown[];
  /** Read-only chart drawings carried between focused research sessions. */
  drawings?: FocusedSnapshotDrawing[];
}

export type FocusedSnapshotParse =
  | { ok: true; snapshot: FocusedSnapshotImport }
  | { ok: false; error: string };

/** Bookmarks resume against the current tape, so duplicating every PDF history
 * row wastes the bounded local shelf. Full JSON exports retain those rows. */
export function focusedBookmarkSnapshot(snapshot: Record<string, unknown>): Record<string, unknown> {
  const evidence = snapshot.selected_concept_evidence;
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) return snapshot;
  const { history, ...summary } = evidence as Record<string, unknown>;
  return {
    ...snapshot,
    selected_concept_evidence: {
      ...summary,
      history_retained_count: Array.isArray(history) ? history.length : 0,
      history_storage: "Recomputed from the current retained tape on resume; full history is available in JSON exports.",
    },
  };
}

/** Compare snapshot timestamps by instant so equivalent UTC spellings (for
 * example a trailing `Z` versus `+00:00`) resume the same historical bar. */
export function focusedSnapshotTimestampsEqual(left: unknown, right: unknown): boolean {
  if (typeof left !== "string" || typeof right !== "string") return false;
  if (left === right) return true;
  const leftMs = Date.parse(left);
  const rightMs = Date.parse(right);
  return Number.isFinite(leftMs) && Number.isFinite(rightMs) && leftMs === rightMs;
}

const SNAPSHOT_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

function isWellFormedSnapshotTimestamp(value: string): boolean {
  if (!SNAPSHOT_TIMESTAMP_PATTERN.test(value)) return false;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return false;
  // Check the written wall-clock components independently of the offset so
  // impossible dates and 24:00 cannot normalize into another day's candle.
  const wallTime = value.slice(0, 19);
  const wallMs = Date.parse(`${wallTime}Z`);
  return Number.isFinite(wallMs) && new Date(wallMs).toISOString().slice(0, 19) === wallTime;
}

// Snapshot identities must carry an explicit UTC/offset marker. Date.parse is
// deliberately not sufficient here: engines accept timezone-less strings and
// normalize impossible calendar dates (for example February 30), which would
// let a bookmark point at a different candle on another machine. Equivalent
// offset spellings remain readable for schema-1 compatibility.
function isSafeSnapshotTimestamp(value: string, nowMs = Date.now()): boolean {
  if (!isWellFormedSnapshotTimestamp(value)) return false;
  const parsed = Date.parse(value);
  return parsed <= nowMs;
}

export type FocusedSnapshotStalenessDiagnostic = {
  state: "CURRENT" | "STALE" | "UNAVAILABLE" | "INVALID";
  reason:
    | "LATEST_CLOSED_BAR_MATCHES"
    | "SNAPSHOT_LAGS_CURRENT_TAPE"
    | "SNAPSHOT_LATEST_BAR_UNAVAILABLE"
    | "CURRENT_LATEST_BAR_UNAVAILABLE"
    | "SNAPSHOT_LATEST_BAR_INVALID"
    | "CURRENT_LATEST_BAR_INVALID"
    | "SNAPSHOT_LATEST_BAR_FUTURE"
    | "CURRENT_LATEST_BAR_FUTURE"
    | "SNAPSHOT_LATEST_BAR_OFF_GRID"
    | "CURRENT_LATEST_BAR_OFF_GRID"
    | "SNAPSHOT_AHEAD_OF_CURRENT_TAPE";
  snapshot_latest_bar_utc: string | null;
  current_latest_bar_utc: string | null;
  age_bars: number | null;
};

function classifySnapshotTimestamp(value: unknown, nowMs: number): "UNAVAILABLE" | "INVALID" | "FUTURE" | "OFF_GRID" | "VALID" {
  if (value == null || value === "") return "UNAVAILABLE";
  if (typeof value !== "string" || !isWellFormedSnapshotTimestamp(value)) return "INVALID";
  const parsed = Date.parse(value);
  if (parsed > nowMs) return "FUTURE";
  if (parsed % FOCUSED_M5_MS !== 0) return "OFF_GRID";
  return "VALID";
}

/** Diagnose whether a saved snapshot's latest closed bar still matches the
 * current retained M5 tape. This only compares UTC identities and never
 * restores data, changes a snapshot, or grants execution authority. */
export function diagnoseFocusedSnapshotStaleness(
  snapshot: Pick<FocusedSnapshotImport, "latest_closed_bar_time"> | { latest_closed_bar_time?: unknown } | null | undefined,
  currentLatestClosedBarTime: unknown,
  nowMs = Date.now(),
): FocusedSnapshotStalenessDiagnostic {
  const snapshotValue = snapshot && typeof snapshot === "object" && !Array.isArray(snapshot)
    ? (snapshot as { latest_closed_bar_time?: unknown }).latest_closed_bar_time
    : undefined;
  const snapshotTime = typeof snapshotValue === "string" ? snapshotValue : null;
  const currentTime = typeof currentLatestClosedBarTime === "string" ? currentLatestClosedBarTime : null;
  const base = { snapshot_latest_bar_utc: snapshotTime, current_latest_bar_utc: currentTime };
  if (!Number.isFinite(nowMs)) return { state: "INVALID", reason: "CURRENT_LATEST_BAR_INVALID", ...base, age_bars: null };
  const snapshotStatus = classifySnapshotTimestamp(snapshotValue, nowMs);
  if (snapshotStatus === "UNAVAILABLE") return { state: "UNAVAILABLE", reason: "SNAPSHOT_LATEST_BAR_UNAVAILABLE", ...base, age_bars: null };
  if (snapshotStatus === "INVALID") return { state: "INVALID", reason: "SNAPSHOT_LATEST_BAR_INVALID", ...base, age_bars: null };
  if (snapshotStatus === "FUTURE") return { state: "INVALID", reason: "SNAPSHOT_LATEST_BAR_FUTURE", ...base, age_bars: null };
  if (snapshotStatus === "OFF_GRID") return { state: "INVALID", reason: "SNAPSHOT_LATEST_BAR_OFF_GRID", ...base, age_bars: null };
  const currentStatus = classifySnapshotTimestamp(currentLatestClosedBarTime, nowMs);
  if (currentStatus === "UNAVAILABLE") return { state: "UNAVAILABLE", reason: "CURRENT_LATEST_BAR_UNAVAILABLE", ...base, age_bars: null };
  if (currentStatus === "INVALID") return { state: "INVALID", reason: "CURRENT_LATEST_BAR_INVALID", ...base, age_bars: null };
  if (currentStatus === "FUTURE") return { state: "INVALID", reason: "CURRENT_LATEST_BAR_FUTURE", ...base, age_bars: null };
  if (currentStatus === "OFF_GRID") return { state: "INVALID", reason: "CURRENT_LATEST_BAR_OFF_GRID", ...base, age_bars: null };
  const snapshotMs = Date.parse(snapshotValue as string);
  const currentMs = Date.parse(currentLatestClosedBarTime as string);
  if (snapshotMs === currentMs) return { state: "CURRENT", reason: "LATEST_CLOSED_BAR_MATCHES", ...base, age_bars: 0 };
  if (snapshotMs > currentMs) return { state: "INVALID", reason: "SNAPSHOT_AHEAD_OF_CURRENT_TAPE", ...base, age_bars: null };
  return { state: "STALE", reason: "SNAPSHOT_LAGS_CURRENT_TAPE", ...base, age_bars: (currentMs - snapshotMs) / FOCUSED_M5_MS };
}

function isSnapshotPoint(value: unknown): value is FocusedSnapshotPoint {
  if (!value || typeof value !== "object") return false;
  const point = value as Record<string, unknown>;
  return typeof point.i === "number" && Number.isInteger(point.i) && point.i >= 0
    && typeof point.p === "number" && Number.isFinite(point.p)
    && (point.t === undefined || (typeof point.t === "string" && Number.isFinite(Date.parse(point.t)) && isSafeSnapshotTimestamp(point.t)));
}

/** Object imports can contain sparse arrays even though JSON cannot. Visit
 * every slot so holes never pass validation and reach drawing geometry. */
function isDenseSnapshotArray(value: unknown, limit: number, validate: (item: unknown) => boolean): boolean {
  if (!Array.isArray(value) || value.length > limit) return false;
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.prototype.hasOwnProperty.call(value, index) || !validate(value[index])) return false;
  }
  return true;
}

function isSnapshotDrawing(value: unknown): value is FocusedSnapshotDrawing {
  if (!value || typeof value !== "object") return false;
  const drawing = value as Record<string, unknown>;
  if (typeof drawing.kind !== "string" || !(FOCUSED_DRAWING_KINDS as readonly string[]).includes(drawing.kind)) return false;
  if (!isSnapshotPoint(drawing.a) || !isSnapshotPoint(drawing.b) || typeof drawing.color !== "string" || drawing.color.length > 160) return false;
  if (drawing.text !== undefined && (typeof drawing.text !== "string" || drawing.text.length > 500)) return false;
  if (drawing.pts !== undefined && !isDenseSnapshotArray(drawing.pts, 10_000, isSnapshotPoint)) return false;
  return true;
}

/** Parse and minimally validate a snapshot without writing storage or triggering execution. */
export function parseFocusedSnapshot(input: string | unknown): FocusedSnapshotParse {
  let value: unknown = input;
  if (typeof input === "string") {
    if (input.length > 8 * 1024 * 1024) return { ok: false, error: "Snapshot exceeds the 8 MiB limit." };
    try { value = JSON.parse(input.replace(/^\uFEFF/, "")); }
    catch (error) { return { ok: false, error: `Invalid snapshot JSON: ${(error as Error).message}` }; }
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false, error: "Expected one focused research snapshot object." };
  const candidate = value as Record<string, unknown>;
  if (candidate.schema !== FOCUSED_SNAPSHOT_SCHEMA) return { ok: false, error: "Unsupported focused research snapshot schema." };
  if (typeof candidate.symbol !== "string" || !candidate.symbol.trim()) return { ok: false, error: "Snapshot symbol is required." };
  if (typeof candidate.timeframe !== "string" || !candidate.timeframe.trim()) return { ok: false, error: "Snapshot timeframe is required." };
  if (candidate.authority !== undefined && candidate.authority !== FOCUSED_SNAPSHOT_AUTHORITY) return { ok: false, error: "Snapshot authority must remain research-only with live apply disabled." };
  if (candidate.selected_concept !== undefined && candidate.selected_concept !== null && (typeof candidate.selected_concept !== "string" || !candidate.selected_concept.trim() || !FOCUSED_KNOWLEDGE_CONCEPT_IDS.has(candidate.selected_concept))) return { ok: false, error: "Snapshot selected concept is unknown to the indexed knowledge map." };
  if (candidate.inspection !== undefined && (!candidate.inspection || typeof candidate.inspection !== "object" || Array.isArray(candidate.inspection))) return { ok: false, error: "Snapshot inspection state is invalid." };
  const inspection = candidate.inspection as Record<string, unknown> | undefined;
  if (inspection?.named_candle_focus !== undefined && inspection.named_candle_focus !== null) {
    const focus = inspection.named_candle_focus as Record<string, unknown>;
    if (!focus || typeof focus !== "object" || Array.isArray(focus)
      || typeof focus.pattern !== "string" || !(NAMED_CANDLE_PATTERNS as readonly string[]).includes(focus.pattern)
      || typeof focus.time !== "string" || !isSafeSnapshotTimestamp(focus.time) || Date.parse(focus.time) % 300_000 !== 0) {
      return { ok: false, error: "Snapshot named candle focus requires a known pattern and closed M5 UTC identity." };
    }
  }
  if (inspection?.chart_focus_time !== undefined && inspection.chart_focus_time !== null && (typeof inspection.chart_focus_time !== "string" || !isSafeSnapshotTimestamp(inspection.chart_focus_time))) return { ok: false, error: "Snapshot chart focus time is invalid." };
  for (const key of ["viewport_start_time", "viewport_end_time"]) {
    const value = inspection?.[key];
    if (value !== undefined && value !== null && (typeof value !== "string" || !isSafeSnapshotTimestamp(value))) return { ok: false, error: `Snapshot ${key} is invalid.` };
  }
  for (const key of ["chart_focus_index", "preview_occurrence_index", "analogue_match_index"]) {
    const n = inspection?.[key];
    if (n !== undefined && n !== null && (typeof n !== "number" || !Number.isInteger(n) || n < (key === "chart_focus_index" ? 1 : 0))) return { ok: false, error: `Snapshot ${key} is invalid.` };
  }
  if (inspection?.analogue_match_time !== undefined && inspection.analogue_match_time !== null && (typeof inspection.analogue_match_time !== "string" || !isSafeSnapshotTimestamp(inspection.analogue_match_time))) return { ok: false, error: "Snapshot analogue match time is invalid." };
  if (inspection?.analogue_pattern_filter !== undefined && inspection.analogue_pattern_filter !== null && (typeof inspection.analogue_pattern_filter !== "string" || !inspection.analogue_pattern_filter.trim() || inspection.analogue_pattern_filter.length > 80 || !(NAMED_CANDLE_PATTERNS as readonly string[]).includes(inspection.analogue_pattern_filter))) return { ok: false, error: "Snapshot analogue pattern filter is invalid." };
  if (inspection?.analogue_family_filter !== undefined && inspection.analogue_family_filter !== null && (typeof inspection.analogue_family_filter !== "string" || !inspection.analogue_family_filter.trim() || !(NAMED_CANDLE_FAMILIES as readonly string[]).includes(inspection.analogue_family_filter))) return { ok: false, error: "Snapshot analogue family filter is invalid." };
  for (const key of ["viewport_start_index", "viewport_end_index"]) {
    const n = inspection?.[key];
    if (n !== undefined && n !== null && (typeof n !== "number" || !Number.isInteger(n) || n < 0)) return { ok: false, error: `Snapshot ${key} is invalid.` };
  }
  if (inspection?.historical_tape_enabled !== undefined && typeof inspection.historical_tape_enabled !== "boolean") return { ok: false, error: "Snapshot historical tape state is invalid." };
  if (candidate.drawings !== undefined && !isDenseSnapshotArray(candidate.drawings, 200, isSnapshotDrawing)) return { ok: false, error: "Snapshot chart drawings are invalid or exceed the drawing limit." };
  if (candidate.latest_closed_bar_time !== undefined && candidate.latest_closed_bar_time !== null && (typeof candidate.latest_closed_bar_time !== "string" || !isSafeSnapshotTimestamp(candidate.latest_closed_bar_time))) return { ok: false, error: "Snapshot latest closed bar time is invalid." };
  if (candidate.latest_closed_bar_age_ms !== undefined && candidate.latest_closed_bar_age_ms !== null && (typeof candidate.latest_closed_bar_age_ms !== "number" || !Number.isFinite(candidate.latest_closed_bar_age_ms) || candidate.latest_closed_bar_age_ms < 0)) return { ok: false, error: "Snapshot latest closed bar age is invalid." };
  if (candidate.forecast_evidence_bars !== undefined && (typeof candidate.forecast_evidence_bars !== "number" || !Number.isInteger(candidate.forecast_evidence_bars) || candidate.forecast_evidence_bars < 0)) return { ok: false, error: "Snapshot forecast evidence count is invalid." };
  if (candidate.forecast_evidence_window !== undefined && candidate.forecast_evidence_window !== null && typeof candidate.forecast_evidence_window !== "string") return { ok: false, error: "Snapshot forecast evidence window is invalid." };
  for (const key of ["forecast_evidence_limit", "forecast_retained_bars", "forecast_omitted_bars"]) {
    const n = candidate[key];
    if (n !== undefined && (typeof n !== "number" || !Number.isInteger(n) || n < 0)) return { ok: false, error: `Snapshot ${key} is invalid.` };
  }
  if (candidate.forecast_truncated !== undefined && typeof candidate.forecast_truncated !== "boolean") return { ok: false, error: "Snapshot forecast truncation state is invalid." };
  if (candidate.forecast_freshness !== undefined) {
    const freshness = candidate.forecast_freshness;
    if (!freshness || typeof freshness !== "object" || Array.isArray(freshness)) return { ok: false, error: "Snapshot forecast freshness is invalid." };
    const f = freshness as Record<string, unknown>;
    if (typeof f.ok !== "boolean" || typeof f.max_age_ms !== "number" || !Number.isFinite(f.max_age_ms) || f.max_age_ms <= 0 || typeof f.reason !== "string") return { ok: false, error: "Snapshot forecast freshness fields are invalid." };
    if (f.latest_closed_bar_utc !== null && (typeof f.latest_closed_bar_utc !== "string" || !isSafeSnapshotTimestamp(f.latest_closed_bar_utc))) return { ok: false, error: "Snapshot forecast freshness timestamp is invalid." };
    if (f.age_ms !== null && (typeof f.age_ms !== "number" || !Number.isFinite(f.age_ms) || f.age_ms < 0)) return { ok: false, error: "Snapshot forecast freshness age is invalid." };
  }
  if (candidate.forecast_evidence_truncated !== undefined && typeof candidate.forecast_evidence_truncated !== "boolean") return { ok: false, error: "Snapshot forecast evidence truncation state is invalid." };
  if (candidate.forecast_evidence_scope !== undefined && candidate.forecast_evidence_scope !== null && typeof candidate.forecast_evidence_scope !== "string") return { ok: false, error: "Snapshot forecast evidence scope is invalid." };
  if (candidate.forecast !== undefined) {
    if (!candidate.forecast || typeof candidate.forecast !== "object" || Array.isArray(candidate.forecast)) return { ok: false, error: "Snapshot forecast state is invalid." };
    const forecast = candidate.forecast as Record<string, unknown>;
    if (forecast.status !== undefined && (typeof forecast.status !== "string" || !forecast.status.trim())) return { ok: false, error: "Snapshot forecast status is invalid." };
    if (forecast.direction !== undefined && forecast.direction !== null && typeof forecast.direction !== "string") return { ok: false, error: "Snapshot forecast direction is invalid." };
  }
  if (candidate.knowledge_map_provenance !== undefined) {
    const provenance = candidate.knowledge_map_provenance;
    if (!provenance || typeof provenance !== "object" || Array.isArray(provenance)) return { ok: false, error: "Snapshot knowledge-map provenance is invalid." };
    const p = provenance as Record<string, unknown>;
    if (typeof p.schema !== "string" || !p.schema.trim()) return { ok: false, error: "Snapshot knowledge-map schema is invalid." };
    if (typeof p.source_sha256 !== "string" || !/^[a-f0-9]{64}$/i.test(p.source_sha256)) return { ok: false, error: "Snapshot knowledge-map source hash is invalid." };
    if (p.schema !== FOCUSED_KNOWLEDGE_MAP_SCHEMA || p.source_sha256.toUpperCase() !== FOCUSED_KNOWLEDGE_SOURCE_SHA256.toUpperCase()) return { ok: false, error: "Snapshot knowledge-map provenance does not match the indexed source." };
    if (p.source_title !== undefined && (typeof p.source_title !== "string" || p.source_title !== FOCUSED_KNOWLEDGE_SOURCE_TITLE)) return { ok: false, error: "Snapshot knowledge-map source title does not match the indexed source." };
    if (p.pdf_pages !== undefined && (typeof p.pdf_pages !== "number" || !Number.isInteger(p.pdf_pages) || p.pdf_pages < 1 || p.pdf_pages !== FOCUSED_KNOWLEDGE_PDF_PAGES)) return { ok: false, error: "Snapshot knowledge-map page count does not match the indexed source." };
  }
  // Current exports carry the selected concept's source page anchors in the
  // knowledge payload. Keep that field optional so schema-1 snapshots from
  // before concept payloads were exported remain readable, but never trust a
  // present payload whose identity/pages disagree with the indexed PDF map.
  if (candidate.selected_concept_knowledge !== undefined) {
    const knowledge = candidate.selected_concept_knowledge;
    if (knowledge === null) {
      if (candidate.selected_concept !== undefined && candidate.selected_concept !== null) return { ok: false, error: "Snapshot selected concept knowledge is missing." };
    } else if (!knowledge || typeof knowledge !== "object" || Array.isArray(knowledge)) {
      return { ok: false, error: "Snapshot selected concept knowledge is invalid." };
    } else if (candidate.selected_concept === undefined || candidate.selected_concept === null) {
      return { ok: false, error: "Snapshot selected concept knowledge has no selected concept." };
    } else {
      const expected = getPriceActionKnowledge(candidate.selected_concept);
      const payload = knowledge as Record<string, unknown>;
      const pages = payload.pages;
      // Older schema-1 exports may carry a narrower page subset for a concept
      // whose indexed anchors later gained curated examples. Accept only a
      // non-empty, sorted subset of the current attested pages; unknown or
      // duplicated anchors still fail closed.
      const expectedPages = expected?.pages || [];
      const validSubset = Array.isArray(pages) && pages.length > 0
        && pages.every((page, index) => Number.isInteger(page) && expectedPages.includes(page)
          && (index === 0 || page > pages[index - 1]));
      if (!expected || payload.id !== expected.id || !validSubset) {
        return { ok: false, error: "Snapshot selected concept page anchors do not match the indexed source." };
      }
    }
  }
  if (candidate.selected_concept !== undefined && candidate.selected_concept !== null) {
    if (candidate.knowledge_map_provenance === undefined) return { ok: false, error: "Snapshot selected concept requires matching knowledge-map provenance." };
    const provenance = candidate.knowledge_map_provenance as Record<string, unknown>;
    if (provenance.source_title !== FOCUSED_KNOWLEDGE_SOURCE_TITLE || provenance.pdf_pages !== FOCUSED_KNOWLEDGE_PDF_PAGES) return { ok: false, error: "Snapshot selected concept requires complete indexed source metadata." };
  }
  return { ok: true, snapshot: candidate as unknown as FocusedSnapshotImport };
}
