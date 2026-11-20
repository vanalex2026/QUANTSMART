import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../mfe_ux_lab/cockpit/src/components/MicroChart.tsx", import.meta.url), "utf8");

assert.match(source, /resetShort: viCopy\("%C4%90%E1%BA%B7t%20l%E1%BA%A1i"\)/,
  "Vietnamese footer reset text must be localized");
assert.match(source, /barsLabel: viCopy\("N%E1%BA%BFn"\)/,
  "Vietnamese footer bar readout must use a localized label");
assert.match(source, /magnetOn: viCopy\("nam%20ch%C3%A2m%20b%E1%BA%ADt"\)/,
  "Vietnamese magnet state must be localized");
assert.match(source, /footerHint: viCopy\(/,
  "Vietnamese footer interaction hint must be localized");
assert.match(source, /keyboardHelp: viCopy\([\s\S]*?Delete[\s\S]*?Backspace[\s\S]*?Page%20Up[\s\S]*?Ctrl%2FCmd%2BZ/,
  "Vietnamese keyboard help must include drawing deletion, paging and undo parity");
assert.match(source, /\{chartCopy\.resetShort\}/,
  "footer reset button must render through locale copy");
assert.match(source, /\{chartCopy\.barsLabel\}/,
  "footer bars readout must render through locale copy");
assert.match(source, /\{chartCopy\.magnetOn\}/,
  "footer magnet state must render through locale copy");
assert.match(source, /: chartCopy\.footerHint}/,
  "footer interaction hint must render through locale copy");
assert.match(source, /chartCopy\.sessionLabels\[k as "ASIA" \| "EUROPE" \| "US"\]/,
  "footer session names must render through locale copy");
assert.match(source, /className="microchart-signal"[\s\S]*?aria-label=\{locale === "vi" \? `\$\{s\.annotationKind/,
  "primary signal marker aria labels must have a Vietnamese branch");
assert.match(source, /className="microchart-trade"[\s\S]*?aria-label=\{locale === "vi" \? `Giao dịch mô phỏng/,
  "simulated trade aria labels must have a Vietnamese branch");
assert.match(source, /locale === "vi"\s*\? `Chú thích quan sát\$\{position\}/,
  "dynamic annotation keyboard status must have a Vietnamese branch");

console.log("MICROCHART VI FOOTER PASS: reset, bars, magnet, sessions and keyboard help follow the active locale.");
