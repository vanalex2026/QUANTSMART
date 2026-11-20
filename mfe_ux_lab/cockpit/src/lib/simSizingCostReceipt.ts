// A provenance-only receipt for sizing and bracket-cost assumptions.
// It records inputs without turning source examples into XAUUSD distances or orders.
import type { SimulatorCostConfig, SimulatorRiskConfig } from "./simConfig.ts";
import type { SymbolSpec } from "./symbolSpec.ts";

export type AssumptionSource = "USER_SUPPLIED" | "DEFAULT_PROVISIONAL" | "BROKER_SPEC";

export interface BracketAssumption {
  entryPrice?: number;
  stopPrice?: number;
  targetPrice?: number;
  unit: "QUOTE_PRICE_UNITS";
  source: "USER_SUPPLIED";
}

export interface SizingCostReceiptInput {
  symbol: string;
  risk: SimulatorRiskConfig;
  cost: SimulatorCostConfig;
  sizingSource?: AssumptionSource;
  costSource?: AssumptionSource;
  spec?: Pick<SymbolSpec, "source" | "brokerSymbol" | "tickSize" | "contractSize" | "lotStep" | "minLot">;
  bracket?: BracketAssumption;
}

export interface SizingCostAssumptionsReceipt {
  schema: "quantsmart.phase3.sizing-cost-assumptions-receipt/1";
  status: "USER_SUPPLIED_ASSUMPTIONS_ONLY";
  implementation_change: false;
  source_status: "SOURCE_REVIEW_ONLY";
  data_status: "UNAVAILABLE";
  outcome_status: "WITHHELD";
  authority: {
    focused_chart: "SHADOW_ONLY";
    decision: "NO_DECISION";
    live_apply_allowed: false;
  };
  symbol: string;
  provenance: {
    sizing: AssumptionSource;
    costs: AssumptionSource;
    bracket: "USER_SUPPLIED" | "NOT_PROVIDED";
  };
  sizing: {
    mode: SimulatorRiskConfig["sizingMode"];
    fixed_r: number;
    initial_equity: number;
    risk_pct_equity: number;
    max_demo_lot?: number;
  };
  costs: {
    spread: SimulatorCostConfig["spread"];
    commission_rt_per_lot_usd: number;
    slippage: SimulatorCostConfig["slippage"];
    swap: SimulatorCostConfig["swap"];
  };
  bracket: {
    unit: "QUOTE_PRICE_UNITS";
    entry_price?: number;
    stop_price?: number;
    target_price?: number;
    pdf_pip_distances_used: false;
    xauusd_pip_translation: false;
  };
  broker_execution: {
    fill_authority: "NONE";
    order_authority: "NONE";
    broker_fill_observed: false;
  };
  spec_summary?: {
    source: SymbolSpec["source"];
    broker_symbol?: string;
    tick_size?: number;
    contract_size?: number;
    lot_step?: number;
    min_lot?: number;
  };
}

const COST_STATUSES = new Set(["PROVISIONAL", "CALIBRATED", "NOT_AVAILABLE"]);
const ASSUMPTION_SOURCES = new Set<AssumptionSource>(["USER_SUPPLIED", "DEFAULT_PROVISIONAL", "BROKER_SPEC"]);

function finite(value: unknown, name: string): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`INVALID_SIZING_COST_ASSUMPTION: ${name}`);
}

function nonNegative(value: unknown, name: string): asserts value is number {
  finite(value, name);
  if (value < 0) throw new Error(`INVALID_SIZING_COST_ASSUMPTION: ${name}`);
}

function positive(value: unknown, name: string): asserts value is number {
  finite(value, name);
  if (value <= 0) throw new Error(`INVALID_SIZING_COST_ASSUMPTION: ${name}`);
}

function validateCost(cost: SimulatorCostConfig): void {
  for (const [name, value] of Object.entries(cost.spread)) {
    if (name === "status") {
      if (typeof value !== "string" || !COST_STATUSES.has(value)) throw new Error("INVALID_SIZING_COST_ASSUMPTION: spread.status");
    } else nonNegative(value, `spread.${name}`);
  }
  nonNegative(cost.commissionRT_per_lot_usd, "commissionRT_per_lot_usd");
  for (const [name, value] of Object.entries(cost.slippage)) {
    if (name === "status") {
      if (typeof value !== "string" || !COST_STATUSES.has(value)) throw new Error("INVALID_SIZING_COST_ASSUMPTION: slippage.status");
    } else if (name !== "seed") nonNegative(value, `slippage.${name}`);
  }
  finite(cost.slippage.seed, "slippage.seed");
  for (const [name, value] of Object.entries(cost.swap)) {
    if (name === "status") {
      if (typeof value !== "string" || !COST_STATUSES.has(value)) throw new Error("INVALID_SIZING_COST_ASSUMPTION: swap.status");
    } else if (name !== "wedX3") finite(value, `swap.${name}`);
  }
}

function validateBracket(bracket?: BracketAssumption): void {
  if (!bracket) return;
  if (bracket.unit !== "QUOTE_PRICE_UNITS" || bracket.source !== "USER_SUPPLIED") {
    throw new Error("INVALID_BRACKET_ASSUMPTION_UNIT");
  }
  for (const [name, value] of Object.entries(bracket)) {
    if (name === "unit" || name === "source") continue;
    if (/pip/i.test(name)) throw new Error("PDF_PIP_DISTANCE_FORBIDDEN");
    finite(value, `bracket.${name}`);
  }
}

export function buildSizingCostAssumptionsReceipt(input: SizingCostReceiptInput): SizingCostAssumptionsReceipt {
  if (!input || typeof input.symbol !== "string" || !input.symbol.trim()) throw new Error("INVALID_SIZING_COST_ASSUMPTION: symbol");
  if (!input.risk || !input.cost || !input.cost.spread || !input.cost.slippage || !input.cost.swap) throw new Error("INVALID_SIZING_COST_ASSUMPTION: missing risk or cost input");
  if (!ASSUMPTION_SOURCES.has(input.sizingSource ?? "DEFAULT_PROVISIONAL")) throw new Error("INVALID_SIZING_ASSUMPTION_SOURCE");
  if (!ASSUMPTION_SOURCES.has(input.costSource ?? "DEFAULT_PROVISIONAL")) throw new Error("INVALID_COST_ASSUMPTION_SOURCE");
  const risk = input.risk;
  if (risk.sizingMode !== "FIXED_R" && risk.sizingMode !== "PERCENT_EQUITY") throw new Error("INVALID_SIZING_COST_ASSUMPTION: risk.sizingMode");
  positive(risk.fixedRValue, "risk.fixedRValue");
  positive(risk.initialEquity, "risk.initialEquity");
  positive(risk.riskPctEquity, "risk.riskPctEquity");
  if (risk.maxDemoLot != null) positive(risk.maxDemoLot, "risk.maxDemoLot");
  validateCost(input.cost);
  validateBracket(input.bracket);
  const bracket = input.bracket;
  return {
    schema: "quantsmart.phase3.sizing-cost-assumptions-receipt/1",
    status: "USER_SUPPLIED_ASSUMPTIONS_ONLY",
    implementation_change: false,
    source_status: "SOURCE_REVIEW_ONLY",
    data_status: "UNAVAILABLE",
    outcome_status: "WITHHELD",
    authority: { focused_chart: "SHADOW_ONLY", decision: "NO_DECISION", live_apply_allowed: false },
    symbol: input.symbol,
    provenance: { sizing: input.sizingSource ?? "DEFAULT_PROVISIONAL", costs: input.costSource ?? "DEFAULT_PROVISIONAL", bracket: bracket ? "USER_SUPPLIED" : "NOT_PROVIDED" },
    sizing: {
      mode: risk.sizingMode,
      fixed_r: risk.fixedRValue,
      initial_equity: risk.initialEquity,
      risk_pct_equity: risk.riskPctEquity,
      ...(risk.maxDemoLot == null ? {} : { max_demo_lot: risk.maxDemoLot }),
    },
    costs: {
      spread: { ...input.cost.spread },
      commission_rt_per_lot_usd: input.cost.commissionRT_per_lot_usd,
      slippage: { ...input.cost.slippage },
      swap: { ...input.cost.swap },
    },
    bracket: {
      unit: "QUOTE_PRICE_UNITS",
      ...(bracket?.entryPrice == null ? {} : { entry_price: bracket.entryPrice }),
      ...(bracket?.stopPrice == null ? {} : { stop_price: bracket.stopPrice }),
      ...(bracket?.targetPrice == null ? {} : { target_price: bracket.targetPrice }),
      pdf_pip_distances_used: false,
      xauusd_pip_translation: false,
    },
    broker_execution: { fill_authority: "NONE", order_authority: "NONE", broker_fill_observed: false },
    ...(input.spec ? {
      spec_summary: {
        source: input.spec.source,
        ...(input.spec.brokerSymbol == null ? {} : { broker_symbol: input.spec.brokerSymbol }),
        ...(input.spec.tickSize == null ? {} : { tick_size: input.spec.tickSize }),
        ...(input.spec.contractSize == null ? {} : { contract_size: input.spec.contractSize }),
        ...(input.spec.lotStep == null ? {} : { lot_step: input.spec.lotStep }),
        ...(input.spec.minLot == null ? {} : { min_lot: input.spec.minLot }),
      },
    } : {}),
  };
}
