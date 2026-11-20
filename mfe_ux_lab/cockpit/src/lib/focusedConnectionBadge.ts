export interface FocusedConnectionBadgeEvidence {
  historyState: "idle" | "loading" | "ready" | "fallback";
  historyReason?: string | null;
  account?: { connected: boolean; reason?: string | null } | null;
  terminalAttached?: boolean;
  checking?: boolean;
}

/** Keep history provenance distinct from proof of a current terminal session. */
export function focusedConnectionBadge(evidence: FocusedConnectionBadgeEvidence): string {
  if (evidence.historyState === "loading") return "MT5 HISTORY · SYNCING";
  if (evidence.historyState === "ready") return "MT5 / 2Y CLOSED";
  const historicalMode = [evidence.account?.reason, evidence.historyReason]
    .some((reason) => reason?.split(" · ").some((segment) => segment.trim() === "HISTORICAL_MODE"));
  if (historicalMode) return "LOCAL SNAPSHOT · HISTORICAL MODE";
  // An explicit account response is stronger evidence than an older shared
  // attachment flag. A missing account response proves neither connection
  // nor disconnection, particularly when focused mode disables its poller.
  const connected = evidence.account?.connected ?? evidence.terminalAttached;
  if (connected) return evidence.historyState === "fallback" ? "MT5 CONNECTED · HISTORY FALLBACK" : "MT5 CONNECTED · HISTORY PENDING";
  if (evidence.checking) return "LOCAL SNAPSHOT · MT5 CHECKING";
  return evidence.historyState === "fallback" ? "LOCAL SNAPSHOT · HISTORY UNAVAILABLE" : "MT5 · CONNECTION UNVERIFIED";
}
