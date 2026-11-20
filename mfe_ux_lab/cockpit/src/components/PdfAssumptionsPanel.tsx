import { useLocale, type Locale } from "../lib/locale.tsx";
import "./pdf-assumptions-panel.css";

export const PDF_ASSUMPTIONS_AUTHORITY = "SHADOW_ONLY / NO_DECISION / live_apply_allowed=false" as const;

export type PdfBracketAssumptions = {
  entryPrice: number | null;
  stopPrice: number | null;
  targetPrice: number | null;
  spreadPrice: number | null;
  slippagePrice: number | null;
  commissionQuote: number | null;
  unit: "QUOTE_PRICE_UNITS";
  provenance: "USER_SUPPLIED";
};

export type PdfSizingAssumptions = {
  equity: number | null;
  riskPct: number | null;
  stopDistance: number | null;
  contractSize: number | null;
  lotStep: number | null;
  minLot: number | null;
  unit: "QUOTE_PRICE_UNITS";
  provenance: "USER_SUPPLIED";
};

export type PdfReversalAssumptions = {
  level: number | null;
  eventTime: string;
  identity: string;
  unit: "QUOTE_PRICE_UNITS";
  provenance: "USER_SUPPLIED";
};

export type PdfAssumptionsValue = {
  bracket: PdfBracketAssumptions;
  sizing: PdfSizingAssumptions;
  reversal: PdfReversalAssumptions;
};

/** Detector-shaped projection. Missing fields remain omitted instead of being defaulted. */
export type PdfDetectorAssumptionInputs = {
  bracket?: {
    entryPrice: number;
    stopPrice: number;
    targetPrice: number;
    spreadPrice: number;
    slippagePrice: number;
    commissionQuote: number;
    unit: "QUOTE_PRICE_UNITS";
    source: "USER_SUPPLIED";
  };
  sizing?: {
    equity: number;
    riskPct: number;
    stopDistance: number;
    contractSize: number;
    lotStep: number;
    minLot: number;
  };
  reversalLevel?: number;
  reversalEvent?: { time: string; identity: string };
};

export const EMPTY_PDF_ASSUMPTIONS: PdfAssumptionsValue = {
  bracket: {
    entryPrice: null,
    stopPrice: null,
    targetPrice: null,
    spreadPrice: null,
    slippagePrice: null,
    commissionQuote: null,
    unit: "QUOTE_PRICE_UNITS",
    provenance: "USER_SUPPLIED",
  },
  sizing: {
    equity: null,
    riskPct: null,
    stopDistance: null,
    contractSize: null,
    lotStep: null,
    minLot: null,
    unit: "QUOTE_PRICE_UNITS",
    provenance: "USER_SUPPLIED",
  },
  reversal: {
    level: null,
    eventTime: "",
    identity: "",
    unit: "QUOTE_PRICE_UNITS",
    provenance: "USER_SUPPLIED",
  },
};

const completeNumbers = (values: readonly (number | null)[]): values is number[] => values.every((value) => value != null && Number.isFinite(value));

export function toPdfDetectorAssumptions(value: PdfAssumptionsValue): PdfDetectorAssumptionInputs {
  const result: PdfDetectorAssumptionInputs = {};
  const bracketValues = [value.bracket.entryPrice, value.bracket.stopPrice, value.bracket.targetPrice, value.bracket.spreadPrice, value.bracket.slippagePrice, value.bracket.commissionQuote];
  if (completeNumbers(bracketValues)) {
    const [entryPrice, stopPrice, targetPrice, spreadPrice, slippagePrice, commissionQuote] = bracketValues as number[];
    result.bracket = { entryPrice, stopPrice, targetPrice, spreadPrice, slippagePrice, commissionQuote, unit: "QUOTE_PRICE_UNITS", source: "USER_SUPPLIED" };
  }
  const sizingValues = [value.sizing.equity, value.sizing.riskPct, value.sizing.stopDistance, value.sizing.contractSize, value.sizing.lotStep, value.sizing.minLot];
  if (completeNumbers(sizingValues)) {
    const [equity, riskPct, stopDistance, contractSize, lotStep, minLot] = sizingValues as number[];
    result.sizing = { equity, riskPct, stopDistance, contractSize, lotStep, minLot };
  }
  if (value.reversal.level != null && Number.isFinite(value.reversal.level)) result.reversalLevel = value.reversal.level;
  if (value.reversal.eventTime.trim() && value.reversal.identity.trim()) result.reversalEvent = { time: value.reversal.eventTime, identity: value.reversal.identity };
  return result;
}

type Copy = {
  title: string;
  intro: string;
  bracket: string;
  sizing: string;
  reversal: string;
  provenance: string;
  quoteUnit: string;
  noInference: string;
  entry: string;
  stop: string;
  target: string;
  spread: string;
  slippage: string;
  commission: string;
  equity: string;
  riskPct: string;
  stopDistance: string;
  contractSize: string;
  lotStep: string;
  minLot: string;
  level: string;
  eventTime: string;
  identity: string;
  eventHint: string;
};

const COPY: Record<Locale, Copy> = {
  en: {
    title: "PDF assumptions",
    intro: "Enter only values you explicitly supplied for this XAUUSD M5 review.",
    bracket: "Bracket and quote-price costs",
    sizing: "Position sizing",
    reversal: "Reversal assumption",
    provenance: "USER_SUPPLIED",
    quoteUnit: "QUOTE_PRICE_UNITS",
    noInference: "Blank fields stay unavailable. The panel does not infer distances, lots, fills, outcomes, or orders.",
    entry: "Entry price",
    stop: "Stop price",
    target: "Target price",
    spread: "Spread price",
    slippage: "Slippage price",
    commission: "Commission quote",
    equity: "Account equity",
    riskPct: "Risk percent",
    stopDistance: "Stop distance",
    contractSize: "Contract size",
    lotStep: "Lot step",
    minLot: "Minimum lot",
    level: "Reversal level",
    eventTime: "Validated event time (UTC)",
    identity: "Validated event identity",
    eventHint: "A reversal event identity must be supplied externally. A chart candle does not create one.",
  },
  vi: {
    title: decodeURIComponent("Gi%E1%BA%A3%20%C4%91%E1%BB%8Bnh%20PDF"),
    intro: decodeURIComponent("Ch%E1%BB%89%20nh%E1%BA%ADp%20c%C3%A1c%20gi%C3%A1%20tr%E1%BB%8B%20b%E1%BA%A1n%20%C4%91%C3%A3%20cung%20c%E1%BA%A5p%20r%C3%B5%20r%C3%A0ng%20cho%20l%E1%BA%A7n%20xem%20XAUUSD%20M5%20n%C3%A0y"),
    bracket: decodeURIComponent("Khung%20gi%C3%A1%20v%C3%A0%20chi%20ph%C3%AD%20theo%20%C4%91%C6%A1n%20v%E1%BB%8B%20gi%C3%A1"),
    sizing: decodeURIComponent("Qu%E1%BA%A3n%20tr%E1%BB%8B%20kh%E1%BB%91i%20l%C6%B0%E1%BB%A3ng"),
    reversal: decodeURIComponent("Gi%E1%BA%A3%20%C4%91%E1%BB%8Bnh%20%C4%91%E1%BA%A3o%20chi%E1%BB%81u"),
    provenance: decodeURIComponent("USER_SUPPLIED%20%C2%B7%20DO%20NG%C6%AF%E1%BB%9CI%20D%C3%99NG%20CUNG%20C%E1%BA%A4P"),
    quoteUnit: decodeURIComponent("QUOTE_PRICE_UNITS%20%C2%B7%20%C4%90%C6%A0N%20V%E1%BB%8A%20GI%C3%81"),
    noInference: decodeURIComponent("%C3%94%20tr%E1%BB%91ng%20v%E1%BA%ABn%20l%C3%A0%20ch%C6%B0a%20c%C3%B3%20d%E1%BB%AF%20li%E1%BB%87u.%20B%E1%BA%A3ng%20kh%C3%B4ng%20suy%20ra%20kho%E1%BA%A3ng%20c%C3%A1ch%2C%20lot%2C%20kh%E1%BB%9Bp%20l%E1%BB%87nh%2C%20k%E1%BA%BFt%20qu%E1%BA%A3%20hay%20l%E1%BB%87nh."),
    entry: decodeURIComponent("Gi%C3%A1%20v%C3%A0o"),
    stop: decodeURIComponent("Gi%C3%A1%20d%E1%BB%ABng"),
    target: decodeURIComponent("Gi%C3%A1%20m%E1%BB%A5c%20ti%C3%AAu"),
    spread: decodeURIComponent("Spread%20theo%20gi%C3%A1"),
    slippage: decodeURIComponent("Tr%C6%B0%E1%BB%A3t%20gi%C3%A1%20theo%20gi%C3%A1"),
    commission: decodeURIComponent("Hoa%20h%E1%BB%93ng%20theo%20gi%C3%A1"),
    equity: decodeURIComponent("V%E1%BB%91n%20t%C3%A0i%20kho%E1%BA%A3n"),
    riskPct: decodeURIComponent("Ph%E1%BA%A7n%20tr%C4%83m%20r%E1%BB%A7i%20ro"),
    stopDistance: decodeURIComponent("Kho%E1%BA%A3ng%20d%E1%BB%ABng"),
    contractSize: decodeURIComponent("Quy%20m%C3%B4%20h%E1%BB%A3p%20%C4%91%E1%BB%93ng"),
    lotStep: decodeURIComponent("B%C6%B0%E1%BB%9Bc%20lot"),
    minLot: decodeURIComponent("Lot%20t%E1%BB%91i%20thi%E1%BB%83u"),
    level: decodeURIComponent("M%E1%BB%A9c%20%C4%91%E1%BA%A3o%20chi%E1%BB%81u"),
    eventTime: decodeURIComponent("Th%E1%BB%9Di%20%C4%91i%E1%BB%83m%20s%E1%BB%B1%20ki%E1%BB%87n%20%C4%91%C3%A3%20x%C3%A1c%20minh%20(UTC)"),
    identity: decodeURIComponent("Danh%20t%C3%ADnh%20s%E1%BB%B1%20ki%E1%BB%87n%20%C4%91%C3%A3%20x%C3%A1c%20minh"),
    eventHint: decodeURIComponent("Danh%20t%C3%ADnh%20s%E1%BB%B1%20ki%E1%BB%87n%20%C4%91%E1%BA%A3o%20chi%E1%BB%81u%20ph%E1%BA%A3i%20%C4%91%C6%B0%E1%BB%A3c%20cung%20c%E1%BA%A5p%20t%E1%BB%AB%20b%C3%AAn%20ngo%C3%A0i.%20N%E1%BA%BFn%20tr%C3%AAn%20bi%E1%BB%83u%20%C4%91%E1%BB%93%20kh%C3%B4ng%20t%E1%BB%B1%20t%E1%BA%A1o%20danh%20t%C3%ADnh."),
  },
};

function numberValue(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function Field({ label, value, onChange, step = "any", min }: { label: string; value: number | null; onChange: (value: number | null) => void; step?: string; min?: number }) {
  return <label className="pdf-assumptions-field"><span>{label}</span><input type="number" inputMode="decimal" step={step} min={min} value={value == null ? "" : value} onChange={(event) => onChange(numberValue(event.target.value))} /></label>;
}

export function PdfAssumptionsPanel({
  value,
  onChange,
  locale,
  disabled = false,
}: {
  value: PdfAssumptionsValue;
  onChange: (value: PdfAssumptionsValue) => void;
  locale?: Locale;
  disabled?: boolean;
}) {
  const context = useLocale();
  const copy = COPY[locale ?? context.locale];
  const update = <K extends keyof PdfAssumptionsValue>(section: K, patch: Partial<PdfAssumptionsValue[K]>) => onChange({ ...value, [section]: { ...value[section], ...patch } });
  const textField = (section: "reversal", field: "eventTime" | "identity", label: string) => <label className="pdf-assumptions-field"><span>{label}</span><input type="text" value={value.reversal[field]} onChange={(event) => update(section, { [field]: event.target.value })} /></label>;
  return <section className="pdf-assumptions-panel" data-pdf-assumptions="user-supplied" data-authority={PDF_ASSUMPTIONS_AUTHORITY} aria-labelledby="pdf-assumptions-title">
    <header className="pdf-assumptions-head"><div><h2 id="pdf-assumptions-title">{copy.title}</h2><p>{copy.intro}</p></div><span className="pdf-assumptions-provenance">{copy.provenance}</span></header>
    <p className="pdf-assumptions-note">{copy.noInference}</p>
    <div className="pdf-assumptions-unit"><span>{copy.quoteUnit}</span><span>{PDF_ASSUMPTIONS_AUTHORITY}</span></div>
    <fieldset disabled={disabled}>
      <legend>{copy.bracket}</legend>
      <div className="pdf-assumptions-grid">
        <Field label={copy.entry} value={value.bracket.entryPrice} onChange={(entryPrice) => update("bracket", { entryPrice })} min={0} />
        <Field label={copy.stop} value={value.bracket.stopPrice} onChange={(stopPrice) => update("bracket", { stopPrice })} min={0} />
        <Field label={copy.target} value={value.bracket.targetPrice} onChange={(targetPrice) => update("bracket", { targetPrice })} min={0} />
        <Field label={copy.spread} value={value.bracket.spreadPrice} onChange={(spreadPrice) => update("bracket", { spreadPrice })} min={0} />
        <Field label={copy.slippage} value={value.bracket.slippagePrice} onChange={(slippagePrice) => update("bracket", { slippagePrice })} min={0} />
        <Field label={copy.commission} value={value.bracket.commissionQuote} onChange={(commissionQuote) => update("bracket", { commissionQuote })} min={0} />
      </div>
    </fieldset>
    <fieldset disabled={disabled}>
      <legend>{copy.sizing}</legend>
      <div className="pdf-assumptions-grid">
        <Field label={copy.equity} value={value.sizing.equity} onChange={(equity) => update("sizing", { equity })} min={0} />
        <Field label={copy.riskPct} value={value.sizing.riskPct} onChange={(riskPct) => update("sizing", { riskPct })} min={0} />
        <Field label={copy.stopDistance} value={value.sizing.stopDistance} onChange={(stopDistance) => update("sizing", { stopDistance })} min={0} />
        <Field label={copy.contractSize} value={value.sizing.contractSize} onChange={(contractSize) => update("sizing", { contractSize })} min={0} />
        <Field label={copy.lotStep} value={value.sizing.lotStep} onChange={(lotStep) => update("sizing", { lotStep })} min={0} />
        <Field label={copy.minLot} value={value.sizing.minLot} onChange={(minLot) => update("sizing", { minLot })} min={0} />
      </div>
    </fieldset>
    <fieldset disabled={disabled}>
      <legend>{copy.reversal}</legend>
      <div className="pdf-assumptions-grid">
        <Field label={copy.level} value={value.reversal.level} onChange={(level) => update("reversal", { level })} min={0} />
        {textField("reversal", "eventTime", copy.eventTime)}
        {textField("reversal", "identity", copy.identity)}
      </div>
      <p className="pdf-assumptions-hint">{copy.eventHint}</p>
    </fieldset>
  </section>;
}
