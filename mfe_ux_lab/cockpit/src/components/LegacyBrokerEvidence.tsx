import type { ReactNode } from "react";
import { useBrokerDeals } from "../lib/useBrokerDeals.ts";

export type BrokerEvidenceState = ReturnType<typeof useBrokerDeals>;

/**
 * Legacy-only broker overlays. Keeping the hook behind this component means
 * focused home can render its chart without importing the execution-adjacent
 * deals/positions adapter or its terminal polling loop.
 */
export function LegacyBrokerEvidence({ symbol, enabled, children }: {
  symbol: string;
  enabled: boolean;
  children: (state: BrokerEvidenceState) => ReactNode;
}) {
  return children(useBrokerDeals(symbol, enabled));
}
