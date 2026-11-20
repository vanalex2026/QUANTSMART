import { access, mkdir, rename, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const base = process.env.MT5_APP_URL || "http://127.0.0.1:5090";
const symbol = (process.env.MT5_SYMBOL || "XAUUSD").toUpperCase();
const frames = ["M5", "M15", "M30", "H1"];
const end = new Date(process.env.MT5_TO || Date.now());
const start = new Date(process.env.MT5_FROM || end.getTime() - 3 * 365.25 * 86400000);
const outDir = process.env.MT5_OUT || "artifacts/mt5-history";
const publicOutDir = process.env.MT5_PUBLIC_OUT || "mfe_ux_lab/cockpit/public/data/sim";
const runId = `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const stageOutDir = `${outDir}.staging-${runId}`;
const stagePublicOutDir = `${publicOutDir}.staging-${runId}`;

if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
  throw new Error("MT5_FROM and MT5_TO must be valid timestamps");
}
if (start >= end) {
  throw new Error("MT5_FROM must be earlier than MT5_TO");
}

function iso(date) { return date.toISOString().replace(".000Z", "Z"); }
function monthEnd(date) { return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1)); }
function nextMonth(date) { return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1)); }
const CANONICAL_UTC_SECONDS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
function key(bar) {
  const value = typeof bar?.t === "string" ? bar.t : "";
  // The saved tape is a provenance artifact. Do not normalize offsets,
  // fractional seconds, or naive wall-clock values into UTC because that can
  // silently change the candle instant while making the row look valid.
  if (!CANONICAL_UTC_SECONDS.test(value)) throw new Error(`NON_CANONICAL_UTC_TIMESTAMP: ${value || "<missing>"}`);
  const stamp = Date.parse(value);
  if (!Number.isFinite(stamp) || new Date(stamp).toISOString().slice(0, 19) + "Z" !== value) throw new Error(`INVALID_UTC_TIMESTAMP: ${value}`);
  return value;
}
function finiteBar(bar, from, to) {
  const stamp = key(bar);
  const ms = Date.parse(stamp);
  return Boolean(bar) && ms >= from.getTime() && ms < to.getTime() &&
    [bar.o, bar.h, bar.l, bar.c].every((v) => Number.isFinite(Number(v))) &&
    Number(bar.h) >= Math.max(Number(bar.o), Number(bar.c), Number(bar.l)) &&
    Number(bar.l) <= Math.min(Number(bar.o), Number(bar.c), Number(bar.h));
}

async function request(tf, from, to) {
  const url = `${base}/api/mt5/history?symbol=${encodeURIComponent(symbol)}&tf=${tf}&from=${encodeURIComponent(iso(from))}&to=${encodeURIComponent(iso(to))}`;
  const response = await fetch(url);
  const body = await response.json();
  if (!response.ok || !body.ok) throw new Error(`${tf} ${body.reason || body.error || `HTTP_${response.status}`}`);
  if (body.symbol !== symbol || body.timeframe !== tf) throw new Error(`${tf} invalid symbol/timeframe attestation`);
  if (body.closed_bar_provenance !== "MT5_CLOSED_BARS" || body.forming_bar_included !== false || body.authority !== "SHADOW_ONLY" || body.timestamp_basis !== "UTC" || typeof body.server_timezone !== "string" || !body.server_timezone) throw new Error(`${tf} invalid closed-bar provenance`);
  if (!Array.isArray(body.bars) || body.bars.length === 0 || body.coverage_status === "EMPTY") throw new Error(`${tf} empty history chunk`);
  if (body.coverage_status !== "COMPLETE" && body.coverage_status !== "PARTIAL") throw new Error(`${tf} invalid coverage attestation`);
  return body;
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

async function commit(stagedFiles) {
  const backups = [];
  const installed = [];
  try {
    for (const { staged, destination } of stagedFiles) {
      await mkdir(dirname(destination), { recursive: true });
      if (await exists(destination)) {
        const backup = `${destination}.backup-${runId}`;
        await rename(destination, backup);
        backups.push({ destination, backup });
      }
      await rename(staged, destination);
      installed.push(destination);
    }
  } catch (error) {
    for (const destination of installed) await rm(destination, { force: true });
    for (const { destination, backup } of backups.reverse()) {
      if (await exists(backup)) await rename(backup, destination);
    }
    throw error;
  }
  for (const { backup } of backups) await rm(backup, { force: true });
}

// Keep validated chunks out of the published directories until every frame
// succeeds. Per-file backups let a commit failure restore the prior snapshot.
await rm(stageOutDir, { recursive: true, force: true });
await rm(stagePublicOutDir, { recursive: true, force: true });
await mkdir(stageOutDir, { recursive: true });
await mkdir(stagePublicOutDir, { recursive: true });
const manifest = { symbol, from: iso(start), to: iso(end), source: "MT5_HISTORY", closed_bar_provenance: "MT5_CLOSED_BARS", forming_bar_included: false, server_timezone: null, timestamp_basis: "UTC", authority: "SHADOW_ONLY", decision: "NO_DECISION", frames: {} };
const stagedFiles = [];
try {
 for (const tf of frames) {
  const byTime = new Map();
  const chunks = [];
  for (let cursor = new Date(start); cursor < end;) {
    const next = monthEnd(cursor) < end ? monthEnd(cursor) : end;
    const body = await request(tf, cursor, next);
    if (manifest.server_timezone == null) manifest.server_timezone = body.server_timezone;
    if (manifest.server_timezone !== body.server_timezone) throw new Error(`${tf} inconsistent server timezone attestation`);
    const seenChunk = new Set();
    for (const bar of body.bars) {
      const stamp = key(bar);
      if (seenChunk.has(stamp)) throw new Error(`${tf} duplicate timestamp in history chunk: ${stamp}`);
      seenChunk.add(stamp);
      const stampMs = Date.parse(stamp);
      if (stampMs < cursor.getTime() || stampMs >= next.getTime()) throw new Error(`${tf} HISTORY_WINDOW_VIOLATION: ${stamp}`);
      if (!finiteBar(bar, cursor, next)) throw new Error(`${tf} invalid OHLC row at ${stamp}`);
      byTime.set(stamp, { t: stamp, o: Number(bar.o), h: Number(bar.h), l: Number(bar.l), c: Number(bar.c) });
    }
    chunks.push({ from: iso(cursor), to: iso(next), returned: body.returned_bars ?? body.bars?.length ?? 0, coverage: body.coverage_ratio ?? null, status: body.history_limit ? "INCOMPLETE" : body.coverage_status, history_limit: body.history_limit ?? null });
    cursor = next;
    process.stdout.write(`${tf} ${chunks.length} chunks, ${byTime.size} bars\n`);
  }
  const bars = [...byTime.values()].sort((a, b) => a.t.localeCompare(b.t)).map((bar, i) => ({ ...bar, i }));
  if (bars.length === 0) throw new Error(`${tf} history returned no validated bars`);
  const file = `${outDir}/${symbol}_${tf}_3y.json`;
  // MT5 reports a month as PARTIAL when the first/last tradable candle is
  // separated from the calendar boundary by a weekend/session closure. That
  // is different from an empty or failed chunk. Preserve the distinction so
  // the UI can disclose boundary gaps without blocking an otherwise complete
  // three-year tape from the research vote.
  const boundaryPartialChunks = chunks.filter((chunk) => chunk.status === "PARTIAL").length;
  const hasIncompleteChunk = chunks.some((chunk) => chunk.status === "INCOMPLETE");
  const coverageStatus = hasIncompleteChunk ? "PARTIAL"
    : (boundaryPartialChunks ? "COMPLETE_BOUNDARY_GAPS" : "COMPLETE");
  const payload = { symbol, timeframe: tf, source: "MT5_HISTORY", from: iso(start), to: iso(end), n: bars.length, closed_bar_provenance: "MT5_CLOSED_BARS", forming_bar_included: false, server_timezone: manifest.server_timezone, timestamp_basis: "UTC", coverage_status: coverageStatus, coverage_chunks: chunks.length, boundary_partial_chunks: boundaryPartialChunks, authority: "SHADOW_ONLY", decision: "NO_DECISION", bars };
  const stagedFile = `${stageOutDir}/${symbol}_${tf}_3y.json`;
  await writeFile(stagedFile, JSON.stringify(payload));
  stagedFiles.push({ staged: stagedFile, destination: file });
  // Keep the browser's offline/replay snapshot in lockstep with the validated
  // artifact. The UI must never silently fall back to an older candle tape
  // after a successful MT5 refresh.
  const publicFile = `${publicOutDir}/ohlc_${symbol}_${tf}.json`;
  const stagedPublicFile = `${stagePublicOutDir}/ohlc_${symbol}_${tf}.json`;
  await writeFile(stagedPublicFile, JSON.stringify(payload));
  stagedFiles.push({ staged: stagedPublicFile, destination: publicFile });
  manifest.frames[tf] = { file, bars: bars.length, first: bars[0]?.t || null, last: bars.at(-1)?.t || null, chunks };
 }
 const stagedManifest = `${stageOutDir}/${symbol}_3y_manifest.json`;
 await writeFile(stagedManifest, JSON.stringify(manifest, null, 2));
 stagedFiles.push({ staged: stagedManifest, destination: `${outDir}/${symbol}_3y_manifest.json` });
 await commit(stagedFiles);
 console.log(`Saved ${symbol} ${frames.join(", ")} history to ${outDir}`);
} finally {
 await rm(stageOutDir, { recursive: true, force: true });
 await rm(stagePublicOutDir, { recursive: true, force: true });
}
