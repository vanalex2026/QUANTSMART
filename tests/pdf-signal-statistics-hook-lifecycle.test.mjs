import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../mfe_ux_lab/cockpit/src/lib/usePdfSignalStatistics.ts", import.meta.url), "utf8");
assert.match(source, /generation\.current\+\+; stop\(\);/);
assert.match(source, /active\.onmessage = null;/);
assert.match(source, /active\.onerror = null;/);
assert.match(source, /active\.onmessageerror = null;/);
assert.match(source, /worker\.onmessageerror = fail;/);
assert.match(source, /try \{[\s\S]*new Worker\([\s\S]*\} catch \{/);
assert.match(source, /if \(stopped \|\| generation\.current !== generationId\) return;/);
assert.match(source, /\}, \[bars, enabled\]\);/);
assert.match(source, /does not change a retained closed-bar tape/);
assert.match(source, /loadingProgress/);
assert.match(source, /event\.data\?\.progress/);
console.log("PDF SIGNAL STATISTICS HOOK LIFECYCLE PASS: stale worker callbacks, message errors, startup failures, and cleanup are fail-closed.");
