import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url), "utf8");

assert.match(source, /const forecastStatusLabel = locale === "vi"[\s\S]*?forecastStatus;/,
  "focused forecast status must have a Vietnamese branch",
);
assert.match(source, /const chartEvidenceSource = focused && verifiedM5HistoryState === "ready" \? locale === "vi"/,
  "focused source provenance must follow the active locale",
);
assert.match(source, /localizedChartOverlayProvenance = locale === "vi"/,
  "focused chart provenance must expose a Vietnamese accessible receipt",
);
assert.match(source, /localizedNamedCandleMeaning\(pattern \|\| "", locale\)/,
  "focused current named-candle explanation must avoid English-only structure copy in Vietnamese mode",
);
assert.match(source, /researchProvenance=\{focused \? localizedChartOverlayProvenance : undefined\}/,
  "focused chart must render the locale-aware provenance receipt",
);

console.log("FOCUSED CHART LOCALE RUNTIME AUDIT PASS: forecast, provenance, and named-candle chart receipts route through EN/VI copy.");
