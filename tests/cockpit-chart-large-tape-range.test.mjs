import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const source = readFileSync(new URL("../mfe_ux_lab/cockpit/src/components/MicroChart.tsx", import.meta.url), "utf8");
assert.match(source, /import \{ finiteMinMax \} from "\.\.\/lib\/finiteMinMax\.ts"/);
assert.match(source, /finiteMinMax\(vis\.flatMap\(\(bar\) => \[bar\.l, bar\.h\]\)\)/, "focused chart must aggregate its visible tape safely");
assert.doesNotMatch(source, /Math\.min\(\.\.\.bars\.map|Math\.max\(\.\.\.bars\.map/, "focused chart must not spread history into Math.min/Math.max");

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit", import.meta.url));
const require = createRequire(app + "/package.json");
const { build } = require("esbuild");
const bundled = await build({
  stdin: { contents: "export { finiteMinMax } from './src/lib/finiteMinMax.ts'", resolveDir: app, loader: "ts" },
  bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent",
});
const api = await import("data:text/javascript;base64," + Buffer.from(bundled.outputFiles[0].text).toString("base64"));
const values = Array.from({ length: 250_000 }, (_, index) => index % 997);
assert.deepEqual(api.finiteMinMax(values), [0, 996], "large M5 tape range must remain stack-safe");
console.log("FOCUSED CHART LARGE TAPE PASS: XAUUSD M5-sized tapes avoid spread-based range overflow.");
