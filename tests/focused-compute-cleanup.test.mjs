import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url), "utf8");
assert.match(source, /useCandleAtlas\(m5AtlasBars, focused && tf === "M5", requestedSymbol\)/,
  "only focused M5 must enable the off-thread candle atlas scan");
assert.doesNotMatch(source, /analyzeCandlePattern\(/,
  "render must not run the expensive synchronous analogue analysis");
assert.match(
  source,
  /const m5AtlasBars = useMemo\(\(\) => focused \? detectorBars\.slice\(-M5_FORECAST_TAPE_LIMIT\) : \[\]/,
  "legacy Microscope routes must not allocate the focused atlas tape",
);
assert.doesNotMatch(source, /^import\s+\{\s*kidiScan/m, "focused route must not statically import the legacy KIDI scanner");
assert.match(source, /if \(focused \|\| !bars \|\| bars\.length <= 5\) \{ setKidi\(null\); return; \}/, "focused mode must skip the legacy KIDI scan");
assert.match(source, /import\("\.\.\/lib\/kidiEvents\.ts"\)/, "legacy KIDI scanner must remain lazy for full Microscope");
assert.match(source, /const researchOptions = useMemo\(\(\) => \(\{ symbol: requestedSymbol, chartTf: tf/, "focused backtest hooks must receive memoized options");
assert.match(source, /if \(focused \|\| source !== "Live"\) \{ setLiveAdv\(null\); return; \}/, "focused route must skip legacy live-advice derivation");
assert.doesNotMatch(source, /const\s+mtf\s*=\s*adv\.tf_breakdown\?\.main/, "Microscope must not retain the unused multi-timeframe advice computation");
assert.doesNotMatch(source, /function\s+calendarTwoYearsBefore\s*\(/, "Microscope must use the shared retention helper directly");
assert.doesNotMatch(source, /const\s+zones:\s*CChartZone\[\]\s*=\s*\[/, "Microscope must not retain an unrendered advisory zone array");
assert.match(source, /\{!focused && <div className="ms-col">[\s\S]*?Market State[\s\S]*?<\/div>\}/, "focused home must not mount the legacy left context column");
assert.match(source, /\{!focused && <div className="ms-col">[\s\S]*?Context Now[\s\S]*?<\/div>\}/, "focused home must not mount the legacy right context column");

assert.doesNotMatch(source, /if (!adv && !focused)/, "Microscope must not retain an unreachable loading branch after advice is normalized to an object");

console.log("focused compute cleanup contract: ok");
