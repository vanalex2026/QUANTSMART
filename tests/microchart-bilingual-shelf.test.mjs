import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const source = readFileSync(
  fileURLToPath(new URL("../mfe_ux_lab/cockpit/src/components/MicroChart.tsx", import.meta.url)),
  "utf8",
);

assert.match(source, /locale === "vi" \? "Mô hình hiện tại" : "Current pattern"/,
  "the compact chart shelf heading must follow the active locale",
);
assert.match(source, /locale === "vi" \? "Vì sao \/ PDF" : "Why \/ PDF"/,
  "the compact PDF explanation disclosure must follow the active locale",
);
assert.match(source, /const inspect = locale === "vi" \? "Kiểm tra mô hình hiện tại" : "Inspect current pattern"/,
  "chart chip accessible labels must follow the active locale",
);
assert.match(source, /const at = locale === "vi" \? "tại" : "at"/,
  "chart chip labels must localize the identity connector",
);
assert.match(source, /aria-label=\{`\$\{inspect\} \$\{label\} \$\{at\} \$\{shortTime\(signal\.time\)\}; \$\{authority\}`\}/,
  "localized chart chip labels must retain the UTC identity and authority receipt",
);
assert.match(source, /sessionLabels: \{ ASIA: viCopy\("Ch%C3%A2u%20%C3%81"\), EUROPE: viCopy\("Ch%C3%A2u%20%C3%82u"\), US: viCopy\("Hoa%20K%E1%BB%B3"\) \}/,
  "the VI session legend must decode its localized labels",
);
assert.match(source, /title=\{chartCopy\.magnetLabel\} aria-label=\{chartCopy\.magnetLabel\}/,
  "the magnet toolbar control must follow the active locale",
);
assert.match(source, /title=\{chartCopy\.lockLabel\} aria-label=\{chartCopy\.lockLabel\}/,
  "the lock toolbar control must follow the active locale",
);
assert.match(source, /title=\{chartCopy\.clearLabel\} aria-label=\{chartCopy\.clearLabel\}/,
  "the clear toolbar control must follow the active locale",
);

console.log("MICROCHART BILINGUAL SHELF PASS: chart pattern headings, disclosures and chip labels follow EN/VI locale state.");
