import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const component = readFileSync(
  fileURLToPath(new URL("../mfe_ux_lab/cockpit/src/components/MicroChart.tsx", import.meta.url)),
  "utf8",
);
const skin = readFileSync(
  fileURLToPath(new URL("../mfe_ux_lab/cockpit/src/components/microchart.css", import.meta.url)),
  "utf8",
);

assert.doesNotMatch(
  component,
  /fontSize="(?:7\.5|8|8\.5)"/,
  "visible SVG chart labels must remain readable at a 9px minimum",
);
assert.match(
  skin,
  /\.micro-research-status[\s\S]*?font:\s*14px\s+var\(--mfe-mono\);[\s\S]*?line-height:\s*1\.4;/,
  "forecast status must use the 14px primary reading size",
);
assert.match(
  skin,
  /@media \(max-width: 639\.98px\)[\s\S]*?\.micro-research-status\s*\{[\s\S]*?font-size:\s*14px;/,
  "standard phone forecast status must retain the 14px primary reading size",
);
assert.match(
  skin,
  /@media \(max-width: 359\.98px\)[\s\S]*?\.micro-research-status,[\s\S]*?\.micro-research-provenance[\s\S]*?font-size:\s*12px;/,
  "short compact phones must retain the 12px secondary receipt size",
);
assert.doesNotMatch(
  skin,
  /\.micro-research-(?:status|provenance)[\s\S]*?font-size:\s*8px;/,
  "chart receipts must not fall back to 8px text on compact phones",
);
assert.match(skin, /\.microchart-price-legend\s*\{[\s\S]*?font:\s*12px\s+var\(--mfe-mono\);/, "phone OHLC legend values must use the 12px secondary reading size");
assert.match(skin, /\.microchart-price-legend-heading strong\s*\{\s*font-size:\s*14px;/, "phone OHLC legend heading must use the 14px primary reading size");
assert.match(
  component,
  /className=(?:"microchart-bottom-bar"|\{`microchart-bottom-bar)[\s\S]*?fontSize: 12[\s\S]*?SHADOW_ONLY · NO_DECISION/,
  "the footer uses the 12px secondary reading size while its authority status is 14px",
);

console.log("MICROCHART TYPOGRAPHY PASS: chart labels and evidence receipts meet the readability floor without changing authority semantics.");
