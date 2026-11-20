// marketDataSync — auto-feed (backfill) the OHLC gap from MT5 after the system was offline. When the user
// connects MT5 (DEMO), we pull the missing bars [lastBarInOurData → now] via the REAL copy_rates_range
// bridge and merge them into the tape. Persisted to localStorage so the extension survives reload.
// FAIL-CLOSED: if MT5 is not connected, nothing is fetched and NO bar is fabricated. DEMO-only · read-only.
import type { OhlcBar } from "../adapters/loadOhlcReplayChart.ts";
import { mt5History, liveSymbol, isOffline, MT5_HISTORY_CONTRACT_VERSION, type Mt5History } from "./mt5DemoAdapter.ts";
import { terminalCacheScope } from "./mt5Connection.ts";

const TF_MIN: Record<string, number> = { M1: 1, M5: 5, M15: 15, M30: 30, H1: 60, H4: 240, D1: 1440, W1: 10080 };
// Persisted extensions are bound to the exact broker instrument as well as
// the cockpit symbol.  A user may map XAUUSD to a broker alias (for example
// GOLD.i#); omitting that alias lets a later override reuse bars fetched for
// the previous instrument under the same account namespace.
const lsKey = (sym: string, tf: string) => `mfe_live_ext_${encodeURIComponent(terminalCacheScope())}_${encodeURIComponent(sym)}_${encodeURIComponent(liveSymbol(sym))}_${tf}`;
const MAX_EXT = 6000;   // cap the live extension per tf → bounded localStorage (auto-poll can't grow it forever)

// Normalize a bar timestamp to a UTC key; offset-bearing timestamps must merge by instant.
export const normT = (t: string): string => {
  const raw = String(t || "").trim();
  // Internal keys intentionally omit a timezone and are already UTC. Parsing
  // them as local time would shift the boundary on non-UTC runtimes.
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(raw)) return raw;
  const parsed = Date.parse(raw);
  if (Number.isFinite(parsed)) return new Date(parsed).toISOString().slice(0, 19);
  return raw.replace("Z", "").replace(" ", "T").slice(0, 19);
};

// union + dedup by timestamp (b overrides a on collision) + chronological + re-index.
export function mergeBars(a: OhlcBar[], b: OhlcBar[]): OhlcBar[] {
  const m = new Map<string, OhlcBar>();
  for (const x of a) m.set(normT(x.t), x);
  for (const x of b) m.set(normT(x.t), { ...x, t: normT(x.t) });
  const out = [...m.values()].sort((x, y) => (normT(x.t) < normT(y.t) ? -1 : normT(x.t) > normT(y.t) ? 1 : 0));
  return out.map((bar, i) => ({ ...bar, i }));
}

function trustedBackfillRows(result: Mt5History, expectedSymbol: string, tf: string, fromMs: number, toMs: number): OhlcBar[] | null {
  // Range responses are durable input to the local extension. Require the
  // bridge to attest both requested identities; a stale M15/XAUUSD response
  // must never be accepted into an M5 tape merely because its timestamps land
  // on the five-minute grid.
  if (!result.ok || result.symbol !== expectedSymbol || result.timeframe !== tf
    || result.source !== "MT5_HISTORY" || result.contract_version !== MT5_HISTORY_CONTRACT_VERSION
    || result.closed_bar_provenance !== "MT5_CLOSED_BARS" || result.forming_bar_included !== false
    || result.timestamp_basis !== "UTC" || (result.authority != null && result.authority !== "SHADOW_ONLY")
    || (result.decision != null && result.decision !== "NO_DECISION")
    // A positive live-apply marker is an explicit authority escalation.  The
    // bridge may omit this legacy field, but it must never be allowed to
    // override the closed, shadow-only contract when present.
    || (result.live_apply_allowed != null && result.live_apply_allowed !== false) || result.read_only === false
    || !Array.isArray(result.bars) || !result.bars.length) return null;
  const step = (TF_MIN[tf] || 0) * 60_000;
  if (!step) return null;
  const rows: OhlcBar[] = [];
  const seen = new Set<string>();
  for (const row of result.bars) {
    const stamp = Date.parse(row?.t || "");
    if (!Number.isFinite(stamp) || stamp < fromMs || stamp > toMs || stamp + step > Date.now() + 1_000
      || stamp % step !== 0 || ![row.o, row.h, row.l, row.c].every((value) => typeof value === "number" && Number.isFinite(value))
      || row.h < Math.max(row.o, row.c, row.l) || row.l > Math.min(row.o, row.c, row.h)) return null;
    const key = new Date(stamp).toISOString().slice(0, 19);
    if (seen.has(key)) return null;
    seen.add(key);
    rows.push({ ...row, t: key });
  }
  return rows.sort((a, b) => a.t.localeCompare(b.t)).map((bar, i) => ({ ...bar, i }));
}

export function getLiveExt(sym: string, tf: string): OhlcBar[] {
  try { const a = JSON.parse(localStorage.getItem(lsKey(sym, tf)) || "[]"); return Array.isArray(a) ? a : []; } catch { return []; }
}
function saveLiveExt(sym: string, tf: string, bars: OhlcBar[]) { try { localStorage.setItem(lsKey(sym, tf), JSON.stringify(bars)); } catch { /* quota */ } }
export function clearLiveExt(sym = "XAUUSD", tf?: string) {
  if (tf) localStorage.removeItem(lsKey(sym, tf));
  else for (const t of Object.keys(TF_MIN)) localStorage.removeItem(lsKey(sym, t));
}

export interface GapInfo { lastBarT: string; nowIso: string; missingMs: number; missingDays: number; missingBarsApprox: number; hasGap: boolean }
export function detectGap(lastBarT: string | null, tf: string): GapInfo | null {
  if (!lastBarT) return null;
  const tfMin = TF_MIN[tf] || 60;
  const lastMs = Date.parse(normT(lastBarT) + "Z");
  const now = new Date(); const nowMs = now.getTime();
  const missingMs = Math.max(0, nowMs - lastMs);
  return {
    lastBarT: normT(lastBarT), nowIso: now.toISOString().slice(0, 19),
    missingMs, missingDays: +(missingMs / 86400000).toFixed(1),
    missingBarsApprox: Math.round((missingMs / (tfMin * 60000)) * (5 / 7)),   // ~exclude weekends
    hasGap: missingMs > tfMin * 60000 * 2,
  };
}

export interface BackfillResult { ok: boolean; tf: string; added: number; totalExt: number; firstNew?: string; lastNew?: string; reason?: string }
// Pull [lastBarT → now] from MT5 for ONE tf, merge into the persisted extension. Fail-closed.
export async function backfillFromMt5(sym: string, tf: string, lastBarT: string): Promise<BackfillResult> {
  // Capture the account scope before the request. A reconnect can replace the
  // localStorage namespace while the bridge is in flight; persisting that
  // response under the new scope would mix bars from two terminals.
  const namespace = terminalCacheScope();
  if (namespace === "detached") return { ok: false, tf, added: 0, totalExt: getLiveExt(sym, tf).length, reason: "HISTORY_ACCOUNT_CHANGED" };
  const from = `${normT(lastBarT)}Z`;
  const to = `${new Date().toISOString().slice(0, 19)}Z`;
  const requestedSymbol = liveSymbol(sym);
  const r = await mt5History(requestedSymbol, tf, from, to);
  if (terminalCacheScope() !== namespace) return { ok: false, tf, added: 0, totalExt: getLiveExt(sym, tf).length, reason: "HISTORY_ACCOUNT_CHANGED" };
  if (liveSymbol(sym) !== requestedSymbol) return { ok: false, tf, added: 0, totalExt: getLiveExt(sym, tf).length, reason: "HISTORY_PROVENANCE_MISMATCH" };
  if (isOffline(r) || !(r as { ok?: boolean }).ok) return { ok: false, tf, added: 0, totalExt: getLiveExt(sym, tf).length, reason: isOffline(r) ? "SERVER_OFFLINE" : ((r as { reason?: string }).reason || "BROKER_NOT_CONNECTED") };
  const trusted = trustedBackfillRows(r as Mt5History, requestedSymbol, tf, Date.parse(from), Date.parse(to));
  if (!trusted) return { ok: false, tf, added: 0, totalExt: getLiveExt(sym, tf).length, reason: "HISTORY_PROVENANCE_MISMATCH" };
  // The range is inclusive at the left boundary so broker corrections replace local rows.
  const raw = trusted.filter((b) => normT(b.t) >= normT(lastBarT));
  let ext = mergeBars(getLiveExt(sym, tf), raw);                      // dedup by timestamp (idempotent — repeat-safe)
  if (ext.length > MAX_EXT) ext = ext.slice(-MAX_EXT).map((b, i) => ({ ...b, i }));   // cap → quota-safe
  saveLiveExt(sym, tf, ext);
  return { ok: true, tf, added: raw.length, totalExt: ext.length, firstNew: raw[0]?.t, lastNew: raw[raw.length - 1]?.t };
}

// ── AUTO-SYNC (Tier 2) — periodic backfill with anti-duplicate + re-entrancy + throttle + backoff. The dedup itself is
// mergeBars (timestamp Map) so a poll can NEVER create duplicate bars; these guards stop overlapping/too-frequent runs
// (e.g. user toggling on/off, a slow poll still running when the next fires) and back off when MT5 is offline.
let _syncing = false;        // in-flight lock — only one sync at a time
let _lastSyncMs = 0;         // throttle anchor
let _failStreak = 0;         // consecutive offline failures → exponential backoff
const MIN_SYNC_MS = 20000;   // never sync more than once per 20s, no matter how fast the caller fires
export interface AutoSyncResult { ran: boolean; skipped?: "IN_FLIGHT" | "THROTTLED" | "BACKOFF"; status?: "OK" | "OFFLINE" | "NO_TAPE"; added: number; perTf: BackfillResult[]; at: string }
const stamp = () => new Date().toISOString().slice(0, 19);

// loadLastBar(tf) is injected by the caller (avoids a marketDataSync→loadSimOhlc import cycle: loadSimOhlc reads ext).
export async function autoSyncOnce(sym: string, tfs: string[], loadLastBar: (tf: string) => Promise<string | null>): Promise<AutoSyncResult> {
  const now = Date.now();
  if (_syncing) return { ran: false, skipped: "IN_FLIGHT", added: 0, perTf: [], at: stamp() };                 // don't run concurrently
  if (now - _lastSyncMs < MIN_SYNC_MS) return { ran: false, skipped: "THROTTLED", added: 0, perTf: [], at: stamp() };
  if (_failStreak >= 3 && now - _lastSyncMs < MIN_SYNC_MS * Math.min(_failStreak, 8)) return { ran: false, skipped: "BACKOFF", added: 0, perTf: [], at: stamp() };
  _syncing = true; _lastSyncMs = now;
  try {
    const perTf: BackfillResult[] = [];
    for (const tf of tfs) {
      const lt = await loadLastBar(tf);
      if (!lt) { perTf.push({ ok: false, tf, added: 0, totalExt: getLiveExt(sym, tf).length, reason: "NO_TAPE" }); continue; }
      const g = detectGap(lt, tf);
      if (!g?.hasGap) { perTf.push({ ok: true, tf, added: 0, totalExt: getLiveExt(sym, tf).length }); continue; }   // already current → no fetch
      perTf.push(await backfillFromMt5(sym, tf, lt));
    }
    const added = perTf.reduce((s, r) => s + r.added, 0);
    const offline = perTf.some((r) => r.reason === "SERVER_OFFLINE" || r.reason === "BROKER_NOT_CONNECTED");
    _failStreak = offline && added === 0 ? _failStreak + 1 : 0;       // back off only when truly offline, reset on any success
    return { ran: true, status: offline && added === 0 ? "OFFLINE" : "OK", added, perTf, at: stamp() };
  } finally { _syncing = false; }
}
