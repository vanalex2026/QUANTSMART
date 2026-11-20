/** Keep focused MT5 history failures actionable while preserving raw codes. */
export function explainFocusedHistoryFailure(reason: string | null | undefined): string {
  const raw = reason?.trim() || "MT5_HISTORY_PROMOTION_REJECTED";
  const segments = raw.split(" · ").map((segment) => segment.trim()).filter(Boolean);
  const code = segments[0] || "MT5_HISTORY_PROMOTION_REJECTED";
  const guidance: Record<string, string> = {
    MT5_INITIALIZE_FAILED: "MT5 could not attach. Open a signed-in terminal or use Advanced connection.",
    MT5_AUTHORIZATION_FAILED: "MT5 rejected the terminal session. Sign in to the broker account in MT5, then retry Auto-Attach.",
    NOT_ATTACHED: "Open and sign in to MT5, then retry the history pull.",
    NOT_CONNECTED: "The MT5 terminal is not connected. Sign in there, then retry the history pull.",
    LOCAL_BRIDGE_UNAVAILABLE: "The local MT5 connector is unavailable. Restart the workspace connector, then retry.",
    BROKER_RETENTION: "The broker did not retain the requested multi-year range; the labelled local snapshot remains active.",
    TERMINAL_MAX_BARS: "MT5 terminal Max bars is too low for the requested range; increase it and retry.",
    MT5_HISTORY_REQUEST_FAILED: "The MT5 history request failed. Check the terminal and retry.",
  };
  const guidanceCode = segments.map((segment) => segment.replace(/\([^)]*\)$/, "")).find((segment) => guidance[segment]);
  return `${segments.join(" · ")} · ${guidance[guidanceCode || code] || "MT5 history was not promoted; the labelled local snapshot remains active."}`;
}

/** Keep a post-promotion refresh failure distinct from initial history fallback. */
export function explainFocusedHistoryRefreshFailure(reason: string | null | undefined): string {
  const raw = reason?.trim().replace(/\s+/g, " ").slice(0, 160) || "MT5_REFRESH_REQUEST_FAILED";
  const guidance: Record<string, string> = {
    REFRESH_CANCELLED: "The refresh was cancelled; the last verified tape is retained.",
    HISTORY_ACCOUNT_CHANGED: "The account scope changed during refresh; the last verified tape is retained.",
    NOT_CONNECTED: "The terminal is no longer connected; the last verified tape is retained while the next refresh retries.",
    TERMINAL_DISCONNECTED: "The terminal connection dropped; the last verified tape is retained while the next refresh retries.",
    ACCOUNT_UNAVAILABLE: "The broker account is temporarily unavailable; the last verified tape is retained while the next refresh retries.",
    UNVERIFIED_M5_REFRESH: "The latest probe failed closed-bar or provenance checks; the last verified tape is retained.",
    M5_REFRESH_BEHIND_HISTORY: "The latest probe is behind the retained tape; the last verified tape is retained.",
    M5_REFRESH_INCOMPLETE: "The bounded catch-up is incomplete; the last verified tape is retained while the next refresh retries.",
    MT5_REFRESH_REQUEST_FAILED: "The MT5 refresh request failed; the last verified tape is retained while the next refresh retries.",
  };
  return `${raw} | ${guidance[raw] || "The MT5 refresh was not promoted; the last verified tape is retained."}`;
}
