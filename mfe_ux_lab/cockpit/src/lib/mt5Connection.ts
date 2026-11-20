// Same-origin, read-only terminal connector. Secrets stay in the request and are never persisted.
import { useSyncExternalStore } from "react";
export const MT5_API = "/api/mt5";
export const MT5_CONNECTED_EVENT = "mfe-mt5-connected";
export const MT5_OPEN_DIALOG_EVENT = "mfe-mt5-open-dialog";
export interface TerminalAccount {
  connected: boolean; supported?: boolean; reason?: string; error?: string;
  account_id?: string; account_kind: "DEMO" | "REAL" | "UNKNOWN";
  server?: string; broker?: string; balance?: number | null; equity?: number | null;
  currency?: string; trade_allowed: false; generation?: number; read_only?: boolean;
}
export interface TerminalSettings { terminal_path?: string; login?: string; password?: string; server?: string }
export interface SymbolResolution { ok: boolean; canonical_symbol?: string; broker_symbol?: string; reason?: string; candidates: { name: string; description: string; base?: string; quote?: string }[] }
let generation = 0;
let attached = false;
let accountKey = "";
let automaticAttachPaused = false;
let connectionOperation = 0;
const ACCOUNT_NAMESPACE_KEY = "mfe_mt5_account_namespace";
const ACCOUNT_KIND_KEY = "mfe_mt5_account_kind";
const HISTORY_CACHE_PREFIX = "mfe_mt5_history_v";
const LIVE_EXTENSION_PREFIX = "mfe_live_ext_";
function purgeLiveExtensionCaches(): void {
  try {
    const stale: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(LIVE_EXTENSION_PREFIX)) stale.push(key);
    }
    for (const key of stale) localStorage.removeItem(key);
  } catch { /* localStorage is optional or a restricted test double */ }
}
function purgeHistoryCaches(): void {
  try {
    const stale: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(HISTORY_CACHE_PREFIX)) stale.push(key);
    }
    for (const key of stale) localStorage.removeItem(key);
  } catch { /* localStorage is optional or a restricted test double */ }
}
function persistAccountNamespace(value: string): void {
  try {
    if (value) localStorage.setItem(ACCOUNT_NAMESPACE_KEY, value);
    else localStorage.removeItem(ACCOUNT_NAMESPACE_KEY);
  } catch { /* localStorage is optional */ }
}
function persistAccountKind(value: string): void {
  try {
    if (value === "DEMO" || value === "REAL" || value === "UNKNOWN") localStorage.setItem(ACCOUNT_KIND_KEY, value);
    else localStorage.removeItem(ACCOUNT_KIND_KEY);
  } catch { /* localStorage is optional */ }
}
function persistedAccountKind(): "DEMO" | "REAL" | "UNKNOWN" | "" {
  try {
    const value = localStorage.getItem(ACCOUNT_KIND_KEY);
    return value === "DEMO" || value === "REAL" || value === "UNKNOWN" ? value : "";
  } catch { return ""; }
}
/** Stable cache scope for terminal-derived data; empty while detached. */
export function terminalAccountNamespace(): string {
  try { return localStorage.getItem(ACCOUNT_NAMESPACE_KEY) || ""; } catch { return ""; }
}
/**
 * Normalized scope for terminal-derived caches.  Invalid or incomplete
 * persisted identity markers collapse into the detached scope so an
 * in-memory cache cannot outlive the same safety boundary as history chunks.
 */
export function terminalCacheScope(): string {
  const value = terminalAccountNamespace();
  if (!value) return "detached";
  const parts = value.split("|");
  // Persisted storage is user-writable and may contain a torn marker. Trim
  // only the two identity fields (broker server names may contain spaces),
  // reject control characters, and canonicalize numeric generations so an
  // equivalent marker cannot create a second cache namespace.
  const [rawAccount, rawServer, rawGeneration] = parts;
  const generationText = rawGeneration?.trim();
  if (parts.length !== 3 || !rawAccount?.trim() || !rawServer?.trim() || /[\u0000-\u001f\u007f]/.test(value) || !/^\d+$/.test(generationText || "")) return "detached";
  const generation = Number(generationText);
  return Number.isSafeInteger(generation) && generation > 0
    ? `${rawAccount.trim()}|${rawServer.trim()}|${generation}`
    : "detached";
}
export const isTerminalAttached = () => attached;
/**
 * Build a cache scope only from a complete terminal identity.  A connected
 * response without account/server/generation provenance is not safe to use as
 * a persisted-history namespace: interpolating missing fields would create a
 * reusable `undefined|undefined|undefined` scope that could survive a
 * reconnect and mix data from unrelated terminals.
 */
function accountNamespace(account: TerminalAccount): string {
  if (!account.connected) return "";
  const accountId = typeof account.account_id === "string" ? account.account_id.trim() : "";
  const server = typeof account.server === "string" ? account.server.trim() : "";
  const generation = account.generation;
  if (!accountId || !server || accountId.includes("|") || server.includes("|") || typeof generation !== "number" || !Number.isSafeInteger(generation) || generation <= 0) return "";
  return `${accountId}|${server}|${generation}`;
}
export function observeTerminalAccount(account: TerminalAccount) {
  const becameConnected = !attached && account.connected;
  const nextKey = accountNamespace(account);
  const nextKind = account.connected ? account.account_kind : "";
  // A browser/runtime restart resets the in-memory key while localStorage keeps
  // the previous terminal namespace. Compare against that persisted marker too:
  // otherwise a new account/generation can leave old chunks orphaned and
  // reusable if the user later reconnects to the old terminal identity.
  const previousKey = accountKey || terminalAccountNamespace();
  const previousKind = persistedAccountKind();
  // Account mode is part of the terminal identity even when the broker keeps
  // the same login/server/generation. Never let a Demo/Real mode switch reuse
  // history or live extensions from the prior mode.
  const accountKindChanged = Boolean(previousKind && previousKind !== nextKind);
  const missingKindMarker = Boolean(account.connected && previousKey && !previousKind);
  if (nextKey !== previousKey || accountKindChanged || missingKindMarker) {
    // A reconnect/account transition can race an in-flight Auto-Attach
    // request.  Advance the operation token before publishing the new
    // namespace so that the late response is rejected instead of reverting
    // the active account identity in the caller.
    connectionOperation++;
    if (previousKey) purgeHistoryCaches();
    purgeLiveExtensionCaches();
    accountKey = nextKey;
    persistAccountNamespace(nextKey);
    persistAccountKind(nextKind);
    invalidateTerminalData();
  } else if (nextKind) {
    persistAccountKind(nextKind);
  }
  attached = account.connected;
  if (becameConnected) window.dispatchEvent(new CustomEvent(MT5_CONNECTED_EVENT));
}
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const noopSubscribe = (_listener: () => void) => () => {};
export function invalidateTerminalData() { generation++; listeners.forEach((listener) => listener()); }
/** Read the current terminal invalidation generation from non-React consumers. */
export function getTerminalGeneration() { return generation; }
/**
 * Subscribe to terminal-generation invalidations only for consumers that have
 * an active terminal data path. Focused research surfaces pass false for their
 * disabled live poller, avoiding an otherwise needless rerender whenever a
 * legacy terminal connection changes.
 */
export function useTerminalGeneration(enabled = true) {
  return useSyncExternalStore(enabled ? subscribe : noopSubscribe, enabled ? () => generation : () => 0, () => 0);
}
export async function terminalRequest<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const controller = new AbortController(); const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true }); if (signal?.aborted) abort();
  const timer = setTimeout(abort, 20000);
  try {
    const response = await fetch(`${MT5_API}${path}`, { method: body === undefined ? "GET" : "POST", headers: body === undefined ? undefined : { "Content-Type": "application/json", "X-MFE-Request": "1" }, body: body === undefined ? undefined : JSON.stringify(body), signal: controller.signal, credentials: "same-origin" });
    const data = await response.json(); if (!response.ok) throw new Error(data.error || "LOCAL_BRIDGE_UNAVAILABLE"); return data as T;
  } finally { clearTimeout(timer); signal?.removeEventListener("abort", abort); }
}
export async function attachTerminal(settings: TerminalSettings = {}) {
  automaticAttachPaused = false;
  connectionOperation++;
  purgeHistoryCaches();
  purgeLiveExtensionCaches();
  accountKey = "";
  persistAccountNamespace("");
  persistAccountKind("");
  invalidateTerminalData();
  try {
    const account = await terminalRequest<TerminalAccount & { ok: boolean }>("/connect", settings);
    observeTerminalAccount(account);
    return account;
  } finally { invalidateTerminalData(); }
}

/**
 * Attempt the broker session already open in the local MT5 terminal.
 *
 * This deliberately has a separate, cancelable path from the explicit
 * connection form: it sends an empty settings object (never credentials),
 * does not invalidate the terminal generation before the request, and lets a
 * connected response establish the cache namespace through
 * observeTerminalAccount. Callers should bound attempts and abort on
 * unmount/visibility changes.
 */
export async function autoAttachTerminal(signal?: AbortSignal) {
  const operation = connectionOperation;
  if (automaticAttachPaused || signal?.aborted) throw new DOMException("Auto-Attach canceled", "AbortError");
  const account = await terminalRequest<TerminalAccount & { ok: boolean }>("/connect", {}, signal);
  if (automaticAttachPaused || operation !== connectionOperation || signal?.aborted) throw new DOMException("Auto-Attach canceled", "AbortError");
  return account;
}
/** Explicit detach remains offline until a manual connection or page restart. */
export function canAutoAttachTerminal(account: TerminalAccount): boolean {
  // A bridge that survives an MT5 restart reports one of the two transient
  // session-loss reasons below. Keep these eligible for the same bounded,
  // empty-settings reconnect loop as an initially unattached terminal. The
  // explicit-detach pause remains the first gate so a user choice always wins.
  const transientSessionLoss = account.reason === "NOT_ATTACHED"
    || account.reason === "TERMINAL_DISCONNECTED"
    || account.reason === "ACCOUNT_UNAVAILABLE";
  return !automaticAttachPaused && !account.connected && account.supported === true && transientSessionLoss;
}
export async function detachTerminal() {
  automaticAttachPaused = true;
  connectionOperation++;
  attached = false;
  purgeHistoryCaches();
  purgeLiveExtensionCaches();
  accountKey = "";
  persistAccountNamespace("");
  persistAccountKind("");
  invalidateTerminalData();
  try { return await terminalRequest<TerminalAccount>("/disconnect", {}); }
  finally { invalidateTerminalData(); }
}
