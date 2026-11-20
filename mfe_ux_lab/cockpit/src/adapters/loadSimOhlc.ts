// Replay-Simulator OHLC loader — wide-range tape from data/sim/ (full 11y for swing/intraday TFs;
// recent window for minute TFs). Falls back to data/cotrade/ so the sim still works before the wide
// export exists. Read-only; no recompute. Separate path keeps the existing pages (Microscope) snappy.
// MULTI-ASSET: file name is keyed by the ACTIVE symbol (header dropdown). Only symbols with ingested
// tapes resolve; others return null → pages show their honest no-data states (no fabrication).
import type { OhlcBar } from "./loadOhlcReplayChart.ts";
import { getLiveExt, mergeBars, normT } from "../lib/marketDataSync.ts";
import { terminalCacheScope } from "../lib/mt5Connection.ts";
import { getActiveSymbol, SYMBOL_CHANGED_EVENT } from "../lib/activeSymbolStore.ts";
import { simTailOhlc, isOffline, liveSymbol } from "../lib/mt5DemoAdapter.ts";

export const SIM_TFS = ["M1", "M5", "M15", "M30", "H1", "H4", "D1"] as const;
export type SimTf = (typeof SIM_TFS)[number];

export interface SimOhlc {
  symbol: string;
  timeframe: string;
  source?: string;
  closed_bar_provenance?: string;
  forming_bar_included?: boolean;
  server_timezone?: string;
  timestamp_basis?: string;
  authority?: string;
  decision?: string;
  coverage_status?: "COMPLETE" | "COMPLETE_BOUNDARY_GAPS" | "PARTIAL_BOUNDARIES" | "PARTIAL" | string;
  boundary_partial_chunks?: number;
  coverage_chunks?: number;
  n: number;
  bars: OhlcBar[];
}

function trustedSimTape(value: unknown, symbol: string, timeframe: string): value is SimOhlc {
  if (!value || typeof value !== "object") return false;
  const tape = value as Partial<SimOhlc>;
  if (tape.symbol !== symbol || tape.timeframe !== timeframe || !Array.isArray(tape.bars) || tape.bars.length === 0) return false;
  if (tape.n != null && tape.n !== tape.bars.length) return false;
  if (tape.source === "MT5_HISTORY") {
    if (tape.closed_bar_provenance !== "MT5_CLOSED_BARS" || tape.forming_bar_included !== false || tape.timestamp_basis !== "UTC" || typeof tape.server_timezone !== "string" || tape.authority !== "SHADOW_ONLY" || tape.decision !== "NO_DECISION") return false;
    // A snapshot may have expected non-trading boundary gaps, but an empty
    // or unknown coverage marker must never be promoted to a usable tape.
    if (typeof tape.coverage_status !== "string" || (tape.coverage_status !== "COMPLETE" && tape.coverage_status !== "COMPLETE_BOUNDARY_GAPS" && tape.coverage_status !== "PARTIAL_BOUNDARIES")) return false;
    if (tape.coverage_chunks != null && (!Number.isSafeInteger(tape.coverage_chunks) || tape.coverage_chunks < 1)) return false;
  }
  let previous = -Infinity;
  return tape.bars.every((bar) => {
    if (!bar || typeof bar.t !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(bar.t)) return false;
    const stamp = Date.parse(bar.t);
    if (!Number.isFinite(stamp) || stamp <= previous) return false;
    previous = stamp;
    return [bar.o, bar.h, bar.l, bar.c].every(Number.isFinite)
      && bar.h >= Math.max(bar.o, bar.c, bar.l)
      && bar.l <= Math.min(bar.o, bar.c, bar.h);
  });
}

const _cache = new Map<string, Promise<SimOhlc | null>>();
const _tailCache = new Map<string, Promise<SimOhlc | null>>();
// switching asset must not serve another symbol's cached tape
if (typeof window !== "undefined") window.addEventListener(SYMBOL_CHANGED_EVENT, () => { _cache.clear(); _tailCache.clear(); _m1years = null; });

// includeExt=true → static file + MT5 backfill (for the LIVE-facing tape). includeExt=FALSE → the RAW static
// historical file only (for the Replay/historical windows Y10/M6 — they must NOT be contaminated by the live
// backfill, which would shift the anchor + mix scales and starve the backtest of trades).
export function loadSimOhlc(tf: string, includeExt = true, symbol?: string): Promise<SimOhlc | null> {
  const sym = (symbol || getActiveSymbol()).toUpperCase();
  const brokerSym = liveSymbol(sym);
  const namespace = terminalCacheScope();
  // A merged live tape contains account-scoped MT5 extensions. Keep the
  // in-memory loader cache on the same terminal namespace as localStorage so
  // an account transition cannot serve the previous account's bars.
  const key = namespace + "::" + sym + "::" + brokerSym + "::" + (includeExt ? tf : tf + "#raw");
  let p = _cache.get(key);
  if (!p) {
    p = (async () => {
      for (const base of ["data/sim", "data/cotrade"]) {
        try {
          const r = await fetch(`${base}/ohlc_${sym}_${tf}.json`);
          if (!r.ok) continue;
          const d = await r.json();
          if (includeExt && (terminalCacheScope() !== namespace || liveSymbol(sym) !== brokerSym)) return null;
          if (trustedSimTape(d, sym, tf)) return includeExt ? appendLiveExt(d, tf) : d;
        } catch {
          /* try next base */
        }
      }
      return null;
    })();
    _cache.set(key, p);
  }
  return p;
}

/**
 * Fast tail loader: fetches only the last `n` bars via the backend `/sim/tail` endpoint (<50KB)
 * instead of downloading & parsing a 23MB 11-year JSON file on the browser main thread.
 * Falls back transparently to `loadSimOhlc` if the signature server is offline.
 */
export function loadSimOhlcTail(tf: string, n = 700, includeExt = true, symbol?: string): Promise<SimOhlc | null> {
  const sym = (symbol || getActiveSymbol()).toUpperCase();
  const brokerSym = liveSymbol(sym);
  const namespace = terminalCacheScope();
  const fullKey = namespace + "::" + sym + "::" + brokerSym + "::" + (includeExt ? tf : tf + "#raw");
  const fullCached = _cache.get(fullKey);
  if (fullCached) {
    return fullCached.then((d) => (d ? { ...d, bars: d.bars.slice(-n), n: Math.min(n, d.bars.length) } : null));
  }
  const key = `${namespace}::${sym}::${brokerSym}::${tf}::tail${n}${includeExt ? "" : "#raw"}`;
  let p = _tailCache.get(key);
  if (!p) {
    p = (async () => {
      const res = await simTailOhlc(sym, tf, n);
      if (includeExt && (terminalCacheScope() !== namespace || liveSymbol(sym) !== brokerSym)) return null;
      const tail = !isOffline(res) && res.ok && trustedSimTape({ symbol: res.symbol, timeframe: res.timeframe, source: res.source || "sim_tail", n: res.bars?.length, bars: res.bars }, sym, tf);
      if (tail) {
        const base: SimOhlc = { symbol: res.symbol, timeframe: res.timeframe, source: res.source || "sim_tail", n: res.bars.length, bars: res.bars as unknown as OhlcBar[] };
        const merged = includeExt ? appendLiveExt(base, tf) : base;
        return { ...merged, bars: merged.bars.slice(-n), n: Math.min(n, merged.bars.length) };
      }
      const fallback = await loadSimOhlc(tf, includeExt, sym);
      if (includeExt && (terminalCacheScope() !== namespace || liveSymbol(sym) !== brokerSym)) return null;
      return fallback ? { ...fallback, bars: fallback.bars.slice(-n), n: Math.min(n, fallback.bars.length) } : null;
    })();
    _tailCache.set(key, p);
  }
  return p;
}

// append any MT5-backfilled bars (persisted by marketDataSync) AFTER the static file's last bar — so the
// whole app (Microscope, Strategy Lab, backtests) transparently sees the gap-filled tape. No fabrication.
export function appendLiveExt(d: SimOhlc, tf: string): SimOhlc {
  const ext = getLiveExt(d.symbol || getActiveSymbol(), tf);
  if (!ext.length) return d;
  const lastT = d.bars.length ? normT(d.bars[d.bars.length - 1].t) : "";
  // The persisted extension can contain a broker correction for the final
  // static row. Re-read the inclusive boundary so mergeBars can replace that
  // observation instead of silently dropping the corrected OHLC.
  const fresh = ext.filter((b) => normT(b.t) >= lastT);
  if (!fresh.length) return d;
  const bars = mergeBars(d.bars, fresh);
  return { ...d, n: bars.length, source: (d.source || "sim") + "+mt5_backfill", bars };
}

// after a backfill, clear the cache so the next load re-merges the new extension.
export function clearSimCache(tf?: string) {
  if (!tf) { _cache.clear(); _tailCache.clear(); return; }
  for (const k of [..._cache.keys()]) if (k.endsWith("::" + tf) || k.endsWith("::" + tf + "#raw")) _cache.delete(k);
  for (const k of [..._tailCache.keys()]) if (k.includes(`::${tf}::tail`)) _tailCache.delete(k);
}

// M1 11-year tape, split per YEAR (browser-loadable ~33MB chunks) — for Microscope Replay full-history.
export interface M1Year { year: string; n: number; first: string; last: string; file: string; mb: number }
let _m1years: Promise<M1Year[]> | null = null;
export function loadM1Years(): Promise<M1Year[]> {
  if (!_m1years) _m1years = (async () => {
    try { const r = await fetch(`data/sim/ohlc_${getActiveSymbol()}_M1_years.json`, { cache: "no-cache" }); if (!r.ok) return []; const d = await r.json(); return (d?.years as M1Year[]) || []; }
    catch { return []; }
  })();
  return _m1years;
}
// Stitch the per-year M1 shards covering a date window [fromISO, toISO] (inclusive) into one tape — for
// intrabar entry on a tractable window (e.g. Microscope M6). Returns [] when no shard covers the range.
// Caller is responsible for keeping the window small enough (M1 ≈ designBars × TF_MINUTES[designTf]).
export async function loadM1Range(fromISO: string, toISO: string): Promise<OhlcBar[]> {
  const norm = (s: string) => String(s || "").replace(" ", "T");
  const from = norm(fromISO), to = norm(toISO);
  const y0 = +from.slice(0, 4), y1 = +to.slice(0, 4);
  if (!y0 || !y1 || y1 < y0) return [];
  const out: OhlcBar[] = [];
  for (let y = y0; y <= y1; y++) {
    const d = await loadSimM1Year(String(y));
    if (d?.bars?.length) for (const b of d.bars) { const t = norm(b.t); if (t >= from && t <= to) out.push(b); }
  }
  return out;
}
export function loadSimM1Year(year: string): Promise<SimOhlc | null> {
  const sym = getActiveSymbol();
  const key = sym + "::M1#" + year;
  let p = _cache.get(key);
  if (!p) {
    p = (async () => {
      try { const r = await fetch(`data/sim/ohlc_${sym}_M1_${year}.json`, { cache: "no-cache" }); if (!r.ok) return null; const d = (await r.json()) as SimOhlc; return Array.isArray(d?.bars) && d.bars.length ? d : null; }
      catch { return null; }
    })();
    _cache.set(key, p);
  }
  return p;
}
