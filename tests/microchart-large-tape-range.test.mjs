import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit", import.meta.url));
const require = createRequire(app + "/package.json");
const { build } = require("esbuild");
const bundled = await build({
  stdin: { contents: "export { finiteMinMax } from './src/lib/finiteMinMax.ts'", resolveDir: app, loader: "ts" },
  bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent",
});
const api = await import("data:text/javascript;base64," + Buffer.from(bundled.outputFiles[0].text).toString("base64"));

const values = Array.from({ length: 250_000 }, (_, index) => index % 997);
assert.deepEqual(api.finiteMinMax(values), [0, 996], "large chart tapes use iterative min/max aggregation");
assert.equal(api.finiteMinMax([Number.NaN, Number.POSITIVE_INFINITY]), null, "non-finite-only input fails closed");
console.log("MICROCHART LARGE TAPE RANGE PASS: two-year-sized input avoids spread-based call-stack overflow.");
