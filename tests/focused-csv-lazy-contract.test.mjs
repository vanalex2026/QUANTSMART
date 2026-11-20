import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url), "utf8");

assert.doesNotMatch(
  source,
  /^import\s+(?!type\b)[^\n]*from\s+["']\.\.\/lib\/csvImports\.ts["']/m,
  "focused Microscope must not eagerly import the legacy CSV runtime",
);
assert.doesNotMatch(
  source,
  /^import\s+[^\n]*from\s+["']\.\.\/lib\/csvOhlc\.ts["']/m,
  "focused Microscope must not eagerly import the legacy CSV parser",
);
assert.match(
  source,
  /if\(focused\|\|source!==['"]CSV['"]\|\|!csvMeta\)return;/,
  "CSV view loading must stay behind the legacy route/source guard",
);
assert.match(source, /import\(["']\.\.\/lib\/csvImports\.ts["']\)\.then\(\(\{readCsvView\}\)/, "CSV view loading must use the lazy CSV runtime");
assert.match(
  source,
  /if\(focused \|\| localStorage\.getItem\(['"]mfe_microscope_preselect['"]\)\)return;/,
  "CSV metadata hydration must stay behind the legacy route guard",
);
assert.match(source, /import\(["']\.\.\/lib\/csvImports\.ts["']\)\.then\(\(\{listCsvImports\}\)/, "CSV metadata hydration must use the lazy CSV runtime");
assert.match(
  source,
  /const CSV_SELECTED_KEY\s*=\s*["']quantsmart-csv-selected["']/,
  "legacy CSV selection persistence must retain its existing key",
);
assert.match(
  source,
  /SHADOW_ONLY.*NO_DECISION.*live_apply_allowed=false/,
  "CSV lazy loading must preserve the read-only authority boundary",
);

console.log("focused CSV lazy contract: ok");
