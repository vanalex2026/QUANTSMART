import { closedBarsForFocusedResearch } from "./focusedClosedBars.ts";

export const XAUUSD_M5_HOLDOUT_MANIFEST_SCHEMA = "quantsmart.xauusd-m5-sealed-holdout-manifest/1" as const;
export const XAUUSD_M5_HOLDOUT_LABELS_SCHEMA = "quantsmart.xauusd-m5-outcome-labels/1" as const;
export const XAUUSD_M5_HOLDOUT_AUTHORITY = "SHADOW_ONLY" as const;
export const XAUUSD_M5_HOLDOUT_PARTITION = "SEALED_HOLDOUT" as const;
export const XAUUSD_M5_HOLDOUT_SPLIT_SCHEME = "TRAIN_VALIDATION_HOLDOUT" as const;

const LABEL_STATUSES = ["WIN", "LOSS", "FLAT", "UNAVAILABLE", "AMBIGUOUS"] as const;
type LabelStatus = typeof LABEL_STATUSES[number];

export interface HoldoutManifestBar {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  /** Optional transport attestation. A forming row is never eligible. */
  closed?: boolean;
}

export interface HoldoutOutcomeDefinition {
  id: string;
  horizon_bars: number;
  label_rule: string;
  frozen_before_access: true;
}

export interface HoldoutPartitionRef {
  dataset_id: string;
  source_sha256: string;
}

export interface HoldoutPartitionIdentity {
  scheme: typeof XAUUSD_M5_HOLDOUT_SPLIT_SCHEME;
  train: HoldoutPartitionRef;
  validation: HoldoutPartitionRef;
  holdout: HoldoutPartitionRef;
  locked_before_access: true;
}

export interface XauusdM5HoldoutManifest {
  schema: typeof XAUUSD_M5_HOLDOUT_MANIFEST_SCHEMA;
  dataset_id: string;
  symbol: "XAUUSD";
  timeframe: "M5";
  partition: typeof XAUUSD_M5_HOLDOUT_PARTITION;
  source_uri: string;
  source_sha256: string;
  retrieved_at_utc: string;
  timezone: string;
  price_basis: "BID" | "ASK" | "MID" | "UNKNOWN";
  bars: HoldoutManifestBar[];
  bar_schema: ["timestamp", "open", "high", "low", "close"];
  outcome_definition: HoldoutOutcomeDefinition;
  partition_identity: HoldoutPartitionIdentity;
  selection_lock: { sealed_before_access: true; description: string };
  execution_model: "UNAVAILABLE";
  fabricated_data: false;
  authority: typeof XAUUSD_M5_HOLDOUT_AUTHORITY;
}

export interface HoldoutOutcomeLabel {
  status: LabelStatus;
  reason?: string;
}

export interface HoldoutLabelProvenance {
  source_sha256: string;
  event_time_basis: "CLOSED_M5_OHLC";
  derivation: string;
  generated_at_utc: string;
  frozen_before_access: true;
  pdf_illustrations_used: false;
}

export interface XauusdM5HoldoutLabels {
  schema: typeof XAUUSD_M5_HOLDOUT_LABELS_SCHEMA;
  dataset_id: string;
  symbol: "XAUUSD";
  timeframe: "M5";
  partition: typeof XAUUSD_M5_HOLDOUT_PARTITION;
  source_sha256: string;
  outcome_definition_id: string;
  label_provenance: HoldoutLabelProvenance;
  labels: Record<string, HoldoutOutcomeLabel>;
  authority: typeof XAUUSD_M5_HOLDOUT_AUTHORITY;
}

export interface HoldoutValidationInput {
  manifest: unknown;
  labels: unknown;
  /** Digest computed from the unmodified source bytes by the file loader. */
  source_sha256?: string;
  /** Source bytes are accepted for callers that do not have a separate digest step. */
  source_bytes?: Uint8Array | ArrayBuffer | string;
  now_ms?: number;
}

export interface HoldoutValidationResult {
  ok: boolean;
  errors: string[];
  dataset_id: string | null;
  bar_count: number;
  label_count: number;
  source_hash_verified: boolean;
  authority: typeof XAUUSD_M5_HOLDOUT_AUTHORITY;
}

const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const isSha256 = (value: unknown): value is string => typeof value === "string" && /^[a-f0-9]{64}$/i.test(value);
const isCanonicalUtc = (value: unknown): value is string => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.000Z$/.test(value)) return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
};

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.keys(value as Record<string, unknown>).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`).join(",")}}`;
}

async function digestSource(source: Uint8Array | ArrayBuffer | string): Promise<string | null> {
  const bytes = typeof source === "string" ? new TextEncoder().encode(source) : source instanceof Uint8Array ? source : new Uint8Array(source);
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return null;
  const digest = await subtle.digest("SHA-256", bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Validate a sealed XAUUSD M5 manifest and its independently keyed labels. */
export async function validateXauusdM5Holdout(input: HoldoutValidationInput): Promise<HoldoutValidationResult> {
  const errors: string[] = [];
  const manifest = isRecord(input.manifest) ? input.manifest : null;
  const labels = isRecord(input.labels) ? input.labels : null;
  const datasetId = typeof manifest?.dataset_id === "string" ? manifest.dataset_id : null;
  const fail = (message: string) => errors.push(message);

  if (!manifest) fail("manifest must be an object");
  if (!labels) fail("labels must be an object");
  if (!manifest || !labels) return { ok: false, errors, dataset_id: datasetId, bar_count: 0, label_count: 0, source_hash_verified: false, authority: XAUUSD_M5_HOLDOUT_AUTHORITY };

  if (manifest.schema !== XAUUSD_M5_HOLDOUT_MANIFEST_SCHEMA) fail("manifest schema is unsupported");
  if (typeof manifest.dataset_id !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]{2,127}$/.test(manifest.dataset_id)) fail("manifest dataset_id is invalid");
  if (manifest.symbol !== "XAUUSD") fail("manifest symbol must be XAUUSD");
  if (manifest.timeframe !== "M5") fail("manifest timeframe must be M5");
  if (manifest.partition !== XAUUSD_M5_HOLDOUT_PARTITION) fail("manifest partition must be SEALED_HOLDOUT");
  if (typeof manifest.source_uri !== "string" || !manifest.source_uri.trim()) fail("manifest source_uri is required");
  if (!isSha256(manifest.source_sha256)) fail("manifest source_sha256 must be a SHA-256 digest");
  if (!isCanonicalUtc(manifest.retrieved_at_utc)) fail("manifest retrieved_at_utc must be canonical UTC");
  if (typeof manifest.timezone !== "string" || !manifest.timezone.trim()) fail("manifest timezone is required");
  if (!(manifest.price_basis === "BID" || manifest.price_basis === "ASK" || manifest.price_basis === "MID" || manifest.price_basis === "UNKNOWN")) fail("manifest price_basis is invalid");
  if (manifest.bar_schema === undefined || canonicalJson(manifest.bar_schema) !== canonicalJson(["timestamp", "open", "high", "low", "close"])) fail("manifest bar_schema is invalid");
  if (manifest.execution_model !== "UNAVAILABLE") fail("manifest execution_model must remain UNAVAILABLE");
  if (manifest.fabricated_data !== false) fail("manifest fabricated_data must be false");
  if (manifest.authority !== XAUUSD_M5_HOLDOUT_AUTHORITY) fail("manifest authority must remain SHADOW_ONLY");

  const definition = isRecord(manifest.outcome_definition) ? manifest.outcome_definition : null;
  const definitionHorizon = definition?.horizon_bars;
  if (!definition || typeof definition.id !== "string" || !definition.id.trim() || typeof definitionHorizon !== "number" || !Number.isInteger(definitionHorizon) || definitionHorizon < 1 || typeof definition.label_rule !== "string" || !definition.label_rule.trim() || definition.frozen_before_access !== true) fail("manifest outcome_definition must be frozen and explicit");
  const partitionIdentity = isRecord(manifest.partition_identity) ? manifest.partition_identity : null;
  const partitionRefs = partitionIdentity ? [partitionIdentity.train, partitionIdentity.validation, partitionIdentity.holdout] : [];
  if (!partitionIdentity || partitionIdentity.scheme !== XAUUSD_M5_HOLDOUT_SPLIT_SCHEME || partitionIdentity.locked_before_access !== true) fail("manifest partition_identity must lock TRAIN/VALIDATION/HOLDOUT before access");
  if (partitionRefs.length !== 3 || partitionRefs.some((ref) => !isRecord(ref) || typeof ref.dataset_id !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]{2,127}$/.test(ref.dataset_id) || !isSha256(ref.source_sha256))) fail("manifest partition_identity references must contain dataset IDs and SHA-256 digests");
  if (partitionRefs.length === 3) {
    const partitionIds = partitionRefs.map((ref) => isRecord(ref) ? ref.dataset_id : null);
    if (new Set(partitionIds).size !== 3) fail("manifest partition_identity dataset IDs must be distinct");
    const holdoutRef = partitionIdentity?.holdout;
    if (!isRecord(holdoutRef) || holdoutRef.dataset_id !== manifest.dataset_id || String(holdoutRef.source_sha256).toLowerCase() !== String(manifest.source_sha256).toLowerCase()) fail("manifest partition_identity holdout reference must match dataset_id and source_sha256");
  }
  const selectionLock = isRecord(manifest.selection_lock) ? manifest.selection_lock : null;
  if (!selectionLock || selectionLock.sealed_before_access !== true || typeof selectionLock.description !== "string" || !selectionLock.description.trim()) fail("manifest selection_lock must attest pre-access sealing");

  const rawBars = manifest.bars;
  if (!Array.isArray(rawBars) || rawBars.length === 0 || rawBars.length > 2_000_000) fail("manifest bars must be a bounded non-empty array");
  const normalized = Array.isArray(rawBars) ? rawBars.map((bar, index) => {
    const finiteOhlc = isRecord(bar) && [bar.open, bar.high, bar.low, bar.close].every((value) => typeof value === "number" && Number.isFinite(value));
    const validGeometry = finiteOhlc
      && (bar.high as number) > (bar.low as number)
      && (bar.high as number) >= Math.max(bar.open as number, bar.close as number)
      && (bar.low as number) <= Math.min(bar.open as number, bar.close as number);
    if (!isRecord(bar) || !isCanonicalUtc(bar.timestamp) || !finiteOhlc || !validGeometry || ("closed" in bar && typeof bar.closed !== "boolean")) {
      fail(`manifest bar ${index} is malformed`);
      return null;
    }
    return { i: index, t: bar.timestamp, o: bar.open, h: bar.high, l: bar.low, c: bar.close, r: "N" as const, ...(typeof bar.closed === "boolean" ? { closed: bar.closed } : {}) };
  }) : [];
  const retrievalMs = isCanonicalUtc(manifest.retrieved_at_utc) ? Date.parse(manifest.retrieved_at_utc) : Number.NaN;
  if (!Number.isFinite(retrievalMs)) fail("manifest retrieval timestamp is unusable");
  const normalizedBars = normalized.filter((bar): bar is NonNullable<typeof bar> => bar !== null);
  const seenTimestamps = new Set<string>();
  let previousMs: number | null = null;
  for (const bar of normalizedBars) {
    const openedMs = Date.parse(bar.t);
    if (seenTimestamps.has(bar.t)) fail(`manifest bars contain duplicate timestamp ${bar.t}`);
    seenTimestamps.add(bar.t);
    if (bar.closed === false) fail(`manifest bar ${bar.t} is forming and cannot enter a sealed holdout`);
    if (Number.isFinite(retrievalMs) && openedMs + 5 * 60_000 > retrievalMs) fail(`manifest bar ${bar.t} is future/forming relative to retrieved_at_utc`);
    if (previousMs !== null) {
      const delta = openedMs - previousMs;
      if (delta <= 0) fail(`manifest bars are out of chronological order at ${bar.t}`);
      else if (delta % (5 * 60_000) !== 0) fail(`manifest bar ${bar.t} is off the UTC M5 grid`);
      else if (delta !== 5 * 60_000) fail(`manifest bars are missing one or more UTC M5 rows before ${bar.t}`);
    }
    previousMs = openedMs;
  }
  const closed = normalized.every((bar): bar is NonNullable<typeof bar> => bar !== null)
    ? closedBarsForFocusedResearch(normalized as any, "M5", retrievalMs)
    : [];
  if (normalized.length > 0 && closed.length !== normalized.length) fail("manifest bars failed strict closed UTC/M5 identity validation");

  if (labels.schema !== XAUUSD_M5_HOLDOUT_LABELS_SCHEMA) fail("labels schema is unsupported");
  if (labels.dataset_id !== manifest.dataset_id) fail("labels dataset_id does not match manifest");
  if (labels.symbol !== "XAUUSD" || labels.timeframe !== "M5" || labels.partition !== XAUUSD_M5_HOLDOUT_PARTITION) fail("labels identity does not match XAUUSD M5 sealed holdout");
  if (labels.source_sha256 !== manifest.source_sha256) fail("labels source_sha256 does not match manifest");
  if (!definition || labels.outcome_definition_id !== definition.id) fail("labels outcome definition does not match manifest");
  if (labels.authority !== XAUUSD_M5_HOLDOUT_AUTHORITY) fail("labels authority must remain SHADOW_ONLY");
  const labelProvenance = isRecord(labels.label_provenance) ? labels.label_provenance : null;
  if (!labelProvenance || !isSha256(labelProvenance.source_sha256) || labelProvenance.source_sha256.toLowerCase() !== String(manifest.source_sha256).toLowerCase() || labelProvenance.event_time_basis !== "CLOSED_M5_OHLC" || typeof labelProvenance.derivation !== "string" || !labelProvenance.derivation.trim() || !isCanonicalUtc(labelProvenance.generated_at_utc) || labelProvenance.frozen_before_access !== true || labelProvenance.pdf_illustrations_used !== false) fail("labels label_provenance must attest independent closed-M5 event labels without PDF illustrations");
  const labelMap = isRecord(labels.labels) ? labels.labels : null;
  if (!labelMap) fail("labels.labels must be a keyed object");
  const barTimes = new Set(normalized.filter((bar): bar is NonNullable<typeof bar> => bar !== null).map((bar) => bar.t));
  if (labelMap) {
    const keys = Object.keys(labelMap);
    if (keys.length !== barTimes.size || keys.some((key) => !barTimes.has(key))) fail("labels must contain exactly one key for every manifest bar");
    for (const [timestamp, rawLabel] of Object.entries(labelMap)) {
      const label = isRecord(rawLabel) ? rawLabel : null;
      if (!isCanonicalUtc(timestamp) || !label || !(LABEL_STATUSES as readonly string[]).includes(label.status as string)) fail(`label ${timestamp} is malformed`);
      if ((label?.status === "UNAVAILABLE" || label?.status === "AMBIGUOUS") && (typeof label.reason !== "string" || !label.reason.trim())) fail(`label ${timestamp} requires a reason`);
      if (label?.reason !== undefined && (typeof label.reason !== "string" || label.reason.length > 500)) fail(`label ${timestamp} reason is invalid`);
      if (label) for (const key of Object.keys(label)) if (key !== "status" && key !== "reason") fail(`label ${timestamp} contains unsupported field ${key}`);
    }
  }

  let sourceHashVerified = false;
  if (input.source_sha256 !== undefined) {
    if (!isSha256(input.source_sha256) || input.source_sha256.toLowerCase() !== String(manifest.source_sha256).toLowerCase()) fail("provided source_sha256 does not match manifest");
    else sourceHashVerified = true;
  } else if (input.source_bytes !== undefined) {
    const digest = await digestSource(input.source_bytes);
    if (!digest) fail("source bytes could not be hashed in this runtime");
    else if (digest !== String(manifest.source_sha256).toLowerCase()) fail("source bytes hash does not match manifest");
    else sourceHashVerified = true;
  } else fail("source bytes or a verified source_sha256 is required");

  return { ok: errors.length === 0, errors, dataset_id: datasetId, bar_count: Array.isArray(rawBars) ? rawBars.length : 0, label_count: labelMap ? Object.keys(labelMap).length : 0, source_hash_verified: sourceHashVerified, authority: XAUUSD_M5_HOLDOUT_AUTHORITY };
}
