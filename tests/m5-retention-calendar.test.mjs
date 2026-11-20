import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const app = fileURLToPath(new URL("../mfe_ux_lab/cockpit", import.meta.url));
const require = createRequire(app + "/package.json");
const { build } = require("esbuild");
const bundled = await build({
  stdin: { contents: "export * from './src/lib/m5Retention.ts'", resolveDir: app },
  bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent",
});
const api = await import("data:text/javascript;base64," + Buffer.from(bundled.outputFiles[0].text).toString("base64"));

const leap = Date.parse("2028-02-29T12:34:56.789Z");
assert.equal(new Date(api.calendarTwoYearsBefore(leap)).toISOString(), "2026-02-28T12:34:56.789Z",
  "calendar subtraction must clamp a leap day to the target month's final day");

const row = (iso) => ({ t: iso, o: 1, h: 2, l: 0, c: 1 });
const leapBoundary = [
  row("2026-02-27T23:55:00Z"),
  row("2026-02-28T00:00:00Z"),
  row("2028-02-29T00:00:00Z"),
];
assert.deepEqual(api.capM5DisplayWindow(leapBoundary, "M5"), leapBoundary.slice(1),
  "the exact clamped UTC two-year cutoff is inclusive and excludes the preceding M5 bucket");
const retained = [
  row("2024-02-27T12:34:56.789Z"),
  row("2026-02-28T12:34:56.789Z"),
  row("2026-02-28T12:34:56+00:00"),
  row("2026-02-30T12:34:56.789Z"),
  row("not-a-timestamp"),
];
assert.deepEqual(api.capM5DisplayWindow(retained, "M5").map((value) => value.t), [
  "2026-02-28T12:34:56.789Z",
], "a malformed tail timestamp must not disable the two-year cap or enter the retained tape");

const nonM5 = [row("2024-01-01T00:00:00.000Z"), row("2026-01-01T00:00:00.000Z"), row("bad")];
assert.deepEqual(api.capM5DisplayWindow(nonM5, "M15"), nonM5, "retention helper must not alter non-M5 history");

assert.deepEqual(api.capM5DisplayWindow([row("not-a-timestamp")], "M5"), [],
  "a malformed single M5 row must fail closed rather than bypassing retention validation");
assert.deepEqual(api.capM5DisplayWindow([row("2026-02-28T12:34:56.789Z")], "M5").map((value) => value.t), [
  "2026-02-28T12:34:56.789Z",
], "a valid single M5 row remains visible inside the calendar window");
assert.equal(api.latestCanonicalUtc([
  row("2026-02-28T12:34:56.789Z"),
  row("2026-02-28T12:35:00+00:00"),
  row("2026-02-30T12:40:00.000Z"),
  row("not-a-timestamp"),
]), "2026-02-28T12:34:56.789Z",
  "retention provenance must use the latest canonical UTC row, matching the rows accepted by the display cap");
assert.equal(api.latestCanonicalUtc([row("not-a-timestamp")]), null,
  "retention provenance must fail closed when no canonical UTC row exists");

// The focused route can receive roughly 200k M5 rows over two years. This
// regression keeps retention aggregation iterative so a large valid tape does
// not throw RangeError before the chart mounts.
const largeTape = Array.from({ length: 250_000 }, (_, index) => row(`2026-02-28T${String(Math.floor(index / 3600) % 24).padStart(2, "0")}:${String(Math.floor(index / 60) % 60).padStart(2, "0")}:${String(index % 60).padStart(2, "0")}.000Z`));
assert.doesNotThrow(() => api.capM5DisplayWindow(largeTape, "M5"),
  "large M5 retention tapes must not spread into Math.max and overflow the call stack");
console.log("M5 RETENTION CALENDAR PASS: UTC leap-day clamp and malformed-tail fail-closed filtering preserve the exact two-year view.");
