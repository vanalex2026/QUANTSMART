import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../mfe_ux_lab/cockpit/src/shell/ConnectionStatus.tsx", import.meta.url), "utf8");

assert.match(source, /const CONNECTION_HEALTH_TF = ["']M5["']/);
assert.match(source, /tf=\$\{CONNECTION_HEALTH_TF\}/);
assert.match(source, /\/bars\?symbol=\$\{encodeURIComponent\(getActiveSymbol\(\)\)\}&tf=\$\{CONNECTION_HEALTH_TF\}&n=2/);
assert.match(source, /isVerifiedClosedBarWindow\(bars, CONNECTION_HEALTH_TF\)/);
assert.match(source, /Date\.parse\(latest\.t\) \+ CONNECTION_HEALTH_TF_MS/);
assert.match(source, /CONNECTION_HEALTH_MAX_AGE_MS/);
assert.doesNotMatch(source, /\/bar\?symbol=/, "shell health must not use the forming-bar endpoint");
assert.doesNotMatch(source, /tf=M1/);
assert.doesNotMatch(source, /current M1 feed/);

console.log("CONNECTION HEALTH PASS: shell probe verifies focused closed M5 bars and never uses forming/M1 feeds.");
