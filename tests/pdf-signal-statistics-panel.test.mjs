import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const source = readFileSync(new URL("../mfe_ux_lab/cockpit/src/components/PdfSignalStatisticsPanel.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../mfe_ux_lab/cockpit/src/components/pdf-signal-statistics-panel.css", import.meta.url), "utf8");
const host = readFileSync(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url), "utf8");
const combined = `${source}\n${styles}\n${host}`;
const ids = [
  "double_pressure", "dominant_pressure", "support_resistance", "buildup", "false_break", "tease_break", "false_high_low", "pullback_reversal", "ceiling_test", "round_number", "signal_entry_bar", "pattern_break_combi", "bracket_costs", "news_exit", "resistance_exit", "reversal_exit", "trade_selection_failure", "consecutive_review", "position_sizing", "low_volatility", "pattern_break", "pattern_break_pullback", "obstacle_room",
];
assert.match(combined, /data-pdf-statistics="23"/);
assert.match(combined, /aria-describedby="m5-pdf-statistics-note"/);
assert.match(combined, /SOURCE_REVIEW_ONLY/);
assert.match(combined, /WITHHELD/);
assert.match(source, /result\.denominatorEquation/);
assert.match(combined, /warm-up rows/);
assert.match(combined, /terminal row without H\+1/);
assert.match(combined, /Evaluated \(DETECTED \+ ABSTAIN\)/);
assert.match(combined, /m5-pdf-stat-source source-\$\{row\.sourceStatus/);
assert.match(combined, /@media\(max-width:500px\)/);
assert.match(combined, /m5-pdf-statistics-table\{min-width:0;font-size:10px\}/, "mobile statistics text must retain a readable minimum size");
assert.match(combined, /m5-pdf-statistics-table tbody th small\{[^}]*font:400 9px/, "concept IDs must remain readable on narrow screens");
assert.match(combined, /m5-pdf-stat-source\{font:700 9px/, "source badges must remain readable when the source column collapses");
assert.match(combined, /m5-pdf-statistics-head>span\{[^}]*white-space:normal;overflow-wrap:anywhere/, "statistics state copy must wrap instead of overflowing");
assert.match(source, /loadingProgress/);
assert.match(source, /processedRows\.toLocaleString\(language\)/);
assert.match(combined, /locale === "vi"/);
assert.doesNotMatch(source, /Â·|Ã|�/u, "statistics copy must not retain mojibake punctuation");
assert.match(source, /m5-pdf-stat-provenance/, "mobile concept cells must retain source provenance");
assert.match(styles, /m5-pdf-statistics-readable \.m5-pdf-statistics-table\s*\{[\s\S]*font-size: 11px !important/, "statistics table must retain an 11px readability floor");
assert.match(styles, /m5-pdf-statistics-readable \.m5-pdf-stat-source\s*\{[\s\S]*font-size: 10px !important/, "source provenance badges must retain a 10px readability floor");
for (const id of ids) assert.match(combined, new RegExp(`${id.replace(/_/g, "_")}`));
assert.match(combined, /not win rates, orders or fills/i, "source copy must retain the execution boundary");
const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit/", import.meta.url));
const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const bundle = await require("esbuild").build({
  stdin: { contents: `
    import { renderToStaticMarkup } from "react-dom/server";
    import { PdfSignalStatisticsPanel } from "./src/components/PdfSignalStatisticsPanel.tsx";
    export const render = props => renderToStaticMarkup(<PdfSignalStatisticsPanel {...props}/>);
  `, resolveDir: app, loader: "tsx" },
  jsx: "automatic", platform: "node", format: "cjs", bundle: true, write: false,
  loader: { ".css": "empty" }, logLevel: "silent",
});
const compiled = { exports: {} };
new Function("require", "module", "exports", bundle.outputFiles[0].text)(require, compiled, compiled.exports);
for (const locale of ["en", "vi"]) {
  const result = { state: "UNAVAILABLE", reason: "INVALID_OR_FORMING_CLOSED_TAPE",
    invalidBar: { row: 23, time: "2026-11-20T03:15:00.000Z", cause: "flat" } };
  const rejected = compiled.exports.render({ result, locale });
  assert.doesNotMatch(rejected, /<table|Scanned|Đã quét/);
  assert.match(rejected, /23 · 2026-11-20 03:15 UTC/);
  assert.match(rejected, locale === "vi" ? /Giá cao nhất bằng giá thấp nhất/ : /high and low are equal/);
  const progress = compiled.exports.render({ result: null, locale, status: "loading", loadingElapsedMs: 12000,
    loadingProgress: { processedRows: 1024, totalRows: 141589 } });
  assert.match(progress, locale === "vi" ? /1\.024\/141\.589/ : /1,024\/141,589/);
}
console.log("PDF SIGNAL STATISTICS PANEL PASS: bilingual progress, rejected data, accounting and mobile provenance.");
