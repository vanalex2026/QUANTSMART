import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../mfe_ux_lab/cockpit/src/components/MicroChart.tsx", import.meta.url), "utf8");

assert.match(source, /lines\.map\(\(l, k\) =>[\s\S]*role="img" aria-label=\{`\$\{l\.label\} at \$\{fp\(l\.price\)\}; research landmark only; SHADOW_ONLY; NO_DECISION`\}/,
  "research price lines must expose their label, price and read-only authority to assistive technology");
assert.match(source, /\$\{locale === "vi" \? "Mốc nghiên cứu" : "Research landmarks"\}: \$\{lines\.map\(\(line\) => line\.label\)\.join\(", "\)\}/,
  "chart summary must continue to enumerate localized research landmarks");

console.log("MICROCHART RESEARCH LINE ACCESSIBILITY PASS: LONG/SHORT research landmarks expose price and read-only authority semantics.");
