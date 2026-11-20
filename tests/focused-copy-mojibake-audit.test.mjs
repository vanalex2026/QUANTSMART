import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const files = [
  "mfe_ux_lab/cockpit/src/components/MicroChart.tsx",
  "mfe_ux_lab/cockpit/src/components/AssetReadinessPanel.tsx",
  "mfe_ux_lab/cockpit/src/shell/ConnectionStatus.tsx",
  "mfe_ux_lab/cockpit/src/lib/locale.ts",
];

for (const relative of files) {
  const source = readFileSync(new URL(`../${relative}`, import.meta.url), "utf8");
  assert.doesNotMatch(source, /\uFFFD/u, `${relative} must not contain replacement characters`);
  assert.doesNotMatch(source, /(?:Ãƒ|Ã‚|Ã„|Ã…|Ã†|Ã|Ã‘|Ã’|Ã“|Ã”|Ã•|Ã–|Ã˜|Ã™|Ãš|Ã|Ãž|ÃŸ)[\u0080-\u00BF]/u,
    `${relative} must not contain UTF-8 mojibake sequences`);
}

const chart = readFileSync(new URL("../mfe_ux_lab/cockpit/src/components/MicroChart.tsx", import.meta.url), "utf8");
assert.match(chart, /const separator = "·"/, "live chart copy must use a literal readable separator");
assert.doesNotMatch(chart, /decodeURIComponent\("%C2%B7"\)/, "live chart copy must not hide separators in escaped literals");
assert.match(chart, /const direction = b\.dir > 0 \? "UP" : b\.dir < 0 \? "DOWN" : "FLAT"/,
  "episode accessibility titles must expose readable direction labels");
assert.doesNotMatch(chart, /<text[^>]*>\?\s*\{t\.outcome|–² BUY|–¼ SELL|startsWith\("\?"\)/u,
  "trade labels and reason styling must not expose corrupted glyph placeholders");
assert.doesNotMatch(chart, /entry triangle \?|candle-pattern signals \?|TRADES \? entry/u,
  "focused chart source comments must not retain corrupted separator placeholders");

const assets = readFileSync(new URL("../mfe_ux_lab/cockpit/src/components/AssetReadinessPanel.tsx", import.meta.url), "utf8");
assert.match(assets, /Saving calendar…/, "asset readiness progress copy must use a readable ellipsis");
assert.doesNotMatch(assets, /Saving calendar(?:â|\\u)/u, "asset readiness must not expose encoded ellipsis text");

const connection = readFileSync(new URL("../mfe_ux_lab/cockpit/src/shell/ConnectionStatus.tsx", import.meta.url), "utf8");
assert.match(connection, /MT5 Attaching…/, "MT5 status copy must use a readable ellipsis");
assert.doesNotMatch(connection, /MT5 Attaching\.\.\.|MT5\.\.\.|Â·|â/u, "MT5 status must not expose raw separators or mojibake");

console.log("FOCUSED COPY MOJIBAKE AUDIT PASS: focused chart, MT5 status, and asset surfaces use canonical readable copy.");
