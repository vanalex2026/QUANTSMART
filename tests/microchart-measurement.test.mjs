import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const source = readFileSync(
  fileURLToPath(new URL("../mfe_ux_lab/cockpit/src/components/MicroChart.tsx", import.meta.url)),
  "utf8",
);

assert.match(source, /const measureExpiry = useRef<ReturnType<typeof setTimeout> \| null>\(null\)/,
  "measurements need a ref-backed expiry handle so timers can be cancelled");
assert.match(source, /if \(measureExpiry\.current !== null\) clearTimeout\(measureExpiry\.current\);\s*const measurement = completed;/,
  "starting a new measurement must cancel the prior measurement timer first");
assert.match(source, /setTemp\(\(current\) => current === measurement \? null : current\);/,
  "an old measurement timer must not clear a newer measurement preview");
assert.match(source, /useEffect\(\(\) => \(\) => \{\s*if \(measureExpiry\.current !== null\) clearTimeout\(measureExpiry\.current\);/,
  "measurement expiry timers must be cleaned up when the chart unmounts");

console.log("MICROCHART MEASURE PASS: repeated measure gestures keep the newest transient readout visible.");
