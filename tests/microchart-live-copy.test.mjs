import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const chart = readFileSync(new URL("../mfe_ux_lab/cockpit/src/components/MicroChart.tsx", import.meta.url), "utf8");
const liveStart = chart.indexOf("live && (() => {");
const liveBlock = chart.slice(liveStart, chart.indexOf("{W < 480 &&"));
assert.ok(liveStart >= 0, "focused chart must retain a live quote block");
assert.doesNotMatch(liveBlock, /: "\?"/, "live quote values must use a readable unavailable label");
assert.equal(liveBlock.includes("\\u00b7"), false, "live copy must render a separator instead of exposing an escape sequence");
assert.match(liveBlock, /const quoteUnavailable/);
assert.match(liveBlock, /locale === "vi"/);
assert.match(liveBlock, /data-live-detection=\{liveDetection\.state\}/, "technical detection state must remain stable for automation");
assert.match(liveBlock, /liveDetection\.authority/, "live detection copy must retain the authority receipt");
assert.match(liveBlock, /const separator = "·"/, "live status separators must render as a middle dot instead of a literal escape");
assert.doesNotMatch(liveBlock, />[^<]*\\u00b7[^<]*</, "live status JSX must not expose literal Unicode escape text");
assert.match(liveBlock, /const quoteLocale = locale === "vi" \? "vi-VN" : "en-US"/, "live quote values must follow the active locale");
assert.match(liveBlock, /quote\.bid\.toLocaleString\(quoteLocale/, "BID formatting must use the active locale");
assert.match(liveBlock, /quote\.ask\.toLocaleString\(quoteLocale/, "ASK formatting must use the active locale");
assert.match(liveBlock, /const bidLabel = locale === "vi" \? "Giá BID" : "BID quote"/, "BID accessible copy must follow the active locale");
assert.match(liveBlock, /const askLabel = locale === "vi" \? "Giá ASK" : "ASK quote"/, "ASK accessible copy must follow the active locale");
assert.match(liveBlock, /aria-label=\{`\$\{bidLabel\}: \$\{bidValue\}`\}/, "BID quote value must expose a localized accessible name");
assert.match(liveBlock, /aria-label=\{`\$\{askLabel\}: \$\{askValue\}`\}/, "ASK quote value must expose a localized accessible name");

const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));
const { build } = require("esbuild");
const bundle = await build({
  entryPoints: [new URL("../mfe_ux_lab/cockpit/src/lib/liveTickModel.ts", import.meta.url).pathname.replace(/^\/(\w:)/, "$1")],
  bundle: true,
  format: "esm",
  platform: "node",
  write: false,
  logLevel: "silent",
});
const { liveFormingDetection } = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));
const frame = {
  bar: { t: "2026-10-28T03:05:00.000Z", o: 100, h: 103, l: 99, c: 102 },
};
const vi = liveFormingDetection(frame, "live", "2026-10-28T03:00:00.000Z", "vi");
assert.match(vi.label, /PROVISIONAL/);
assert.match(vi.label, /NẾN/);
assert.match(vi.reason, /nến M5 đóng/);
assert.doesNotMatch(vi.label, /\?/);
assert.doesNotMatch(vi.reason, /\?/);
assert.match(vi.authority, /SHADOW_ONLY \/ NO_DECISION \/ live_apply_allowed=false/);

console.log("MICROCHART LIVE COPY PASS: quote fallbacks and forming-candle detection copy are readable in EN/VI while technical state and authority remain stable.");
