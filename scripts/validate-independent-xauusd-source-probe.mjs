import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));

function usage() {
  console.error("Usage: node scripts/validate-independent-xauusd-source-probe.mjs [--probe FILE] [--report FILE]");
}

function parseArgs(argv) {
  const values = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") return { help: true };
    if (!arg.startsWith("--") || !argv[i + 1] || argv[i + 1].startsWith("--")) throw new Error(`Missing value for ${arg}`);
    values[arg.slice(2)] = argv[++i];
  }
  return values;
}

function parseJson(bytes, filename) {
  try {
    return JSON.parse(Buffer.from(bytes).toString("utf8"));
  } catch (error) {
    throw new Error(`${filename} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function isSha256(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/i.test(value);
}

function parseUtc(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function digest(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function sourcePathFromProbe(probePath, rawPath) {
  return rawPath.startsWith(".") ? resolve(dirname(probePath), rawPath) : resolve(root, rawPath);
}

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  usage();
  process.exit(0);
}

const probePath = resolve(args.probe || "docs/independent_xauusd_source_probe.json");
const reportPath = args.report ? resolve(args.report) : null;
const errors = [];
let probe = null;
let rawPath = null;
let rawBytes = null;

try {
  probe = parseJson(await readFile(probePath), probePath);
} catch (error) {
  errors.push(error instanceof Error ? error.message : String(error));
}

const fail = (message) => errors.push(message);
if (probe && typeof probe === "object" && !Array.isArray(probe)) {
  if (probe.schema !== "quantsmart.independent-xauusd-source-probe/1") fail("probe schema is unsupported");
  if (probe.status !== "SOURCE_VERIFIED_NO_HOLDOUT") fail("probe status must remain SOURCE_VERIFIED_NO_HOLDOUT");
  if (probe.instrument !== "XAUUSD" || probe.derived_timeframe !== "M5") fail("probe instrument/timeframe must remain XAUUSD M5");
  if (parseUtc(probe.audited_at_utc) == null) fail("probe audited_at_utc must be UTC");
  if (typeof probe.source_uri !== "string") fail("probe source_uri is required");
  let sourceUrl = null;
  try { sourceUrl = new URL(probe.source_uri); } catch { fail("probe source_uri must be an absolute URL"); }
  if (sourceUrl && (sourceUrl.protocol !== "https:" || !/\/datafeed\/XAUUSD\/\d{4}\/\d{2}\/\d{2}\/\d{2}h_ticks\.bi5$/.test(sourceUrl.pathname))) fail("probe source_uri must identify an HTTPS Dukascopy XAUUSD hourly BI5 file");
  if (!isSha256(probe.source_sha256)) fail("probe source_sha256 must be a SHA-256 digest");
  if (!Number.isInteger(probe.source_bytes) || probe.source_bytes <= 0) fail("probe source_bytes must be a positive integer");
  if (!Number.isInteger(probe.source_record_count) || probe.source_record_count <= 0) fail("probe source_record_count must be a positive integer");
  const sourceHour = parseUtc(probe.source_hour_utc);
  const firstTick = parseUtc(probe.source_tick_window_utc?.first);
  const lastTick = parseUtc(probe.source_tick_window_utc?.last);
  if (sourceHour == null || sourceHour % (60 * 60 * 1000) !== 0) fail("probe source_hour_utc must be an aligned UTC hour");
  if (firstTick == null || lastTick == null || firstTick > lastTick) fail("probe source_tick_window_utc must be ordered UTC timestamps");
  if (sourceHour != null && (firstTick == null || lastTick == null || firstTick < sourceHour || lastTick >= sourceHour + 60 * 60 * 1000)) fail("probe tick window must stay inside the declared source hour");
  if (probe.source_file_format !== "BI5 LZMA-compressed 20-byte tick records") fail("probe source_file_format is not the attested BI5 format");
  if (probe.derivation?.price_basis !== "MID" || probe.derivation?.outcome_labels !== false) fail("probe derivation must remain MID-only with no outcome labels");
  if (probe.holdout_contract?.partition !== "CANDIDATE_ONLY" || probe.holdout_contract?.selection_lock !== "UNSET" || probe.holdout_contract?.outcome_definition !== "UNSET" || probe.holdout_contract?.ready_for_evaluation !== false) fail("probe holdout contract must remain candidate-only and not ready");
  if (probe.holdout_contract?.execution_model !== "UNAVAILABLE") fail("probe execution model must remain UNAVAILABLE");
  if (probe.authority?.focused_chart !== "SHADOW_ONLY" || probe.authority?.decision !== "NO_DECISION" || probe.authority?.live_apply_allowed !== false) fail("probe authority must remain SHADOW_ONLY / NO_DECISION");
  if (Object.hasOwn(probe, "bars") || Object.hasOwn(probe, "outcomes")) fail("probe must not bundle OHLC bars or outcome labels");
  if (probe.raw_source_retention?.retained_bytes !== true || typeof probe.raw_source_retention?.local_probe_path !== "string") fail("probe raw_source_retention must attest retained bytes and a local path");
  rawPath = sourcePathFromProbe(probePath, probe.raw_source_retention.local_probe_path);
  if (!existsSync(rawPath)) fail(`retained raw probe is missing: ${rawPath}`);
  if (existsSync(rawPath)) {
    rawBytes = await readFile(rawPath);
    if (probe.source_bytes !== rawBytes.byteLength) fail("retained raw probe byte count does not match source_bytes");
    if (isSha256(probe.source_sha256) && digest(rawBytes) !== probe.source_sha256.toLowerCase()) fail("retained raw probe digest does not match source_sha256");
  }
} else if (!probe) {
  // parse error already recorded
} else fail("probe must be an object");

const report = {
  schema: "quantsmart.session25.independent-xauusd-source-probe-identity/1",
  status: errors.length === 0 ? "SOURCE_VERIFIED_NO_HOLDOUT" : "NOT_READY",
  probe_path: probePath,
  retained_source_path: rawPath,
  retained_source_checked: rawBytes !== null,
  source_data_bundled: false,
  checks: {
    instrument: "XAUUSD",
    timeframe: "M5",
    source_identity: errors.length === 0,
    retained_bytes_digest: rawBytes !== null && errors.every((error) => !/retained raw probe/.test(error)),
    source_hour_boundary: errors.length === 0,
    candidate_partition: probe?.holdout_contract?.partition === "CANDIDATE_ONLY",
    outcome_labels_present: false,
  },
  errors,
  authority: {
    focused_chart: "SHADOW_ONLY",
    decision: "NO_DECISION",
    live_apply_allowed: false,
  },
  next_verifiable_artifact: "A sealed XAUUSD M5 source manifest plus independently keyed outcome-label file satisfying the holdout validator contract.",
};

const serialized = `${JSON.stringify(report, null, 2)}\n`;
if (reportPath) await writeFile(reportPath, serialized, "utf8");
process.stdout.write(serialized);
process.exit(report.status === "SOURCE_VERIFIED_NO_HOLDOUT" ? 0 : 1);
