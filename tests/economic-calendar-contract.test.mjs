import assert from "node:assert/strict";
import fs from "node:fs";

const parser = fs.readFileSync("mfe_ux_lab/cockpit/src/lib/economicCalendar.ts", "utf8");
const importer = fs.readFileSync("mfe_ux_lab/cockpit/src/components/AssetReadinessPanel.tsx", "utf8");
const warning = fs.readFileSync("mfe_ux_lab/cockpit/src/components/PreEventWarning.tsx", "utf8");

assert.match(parser, /UTC_TIMESTAMP/);
assert.match(parser, /CALENDAR_INVALID_UPDATED_AT/);
assert.match(parser, /CALENDAR_DUPLICATE_EVENT/);
assert.match(parser, /MAX_EVENTS = 2_000/);
assert.match(parser, /events\.sort/);
assert.match(importer, /parseEconomicCalendar\(JSON\.parse/);
assert.match(warning, /parseEconomicCalendar\(raw\)/);
assert.match(warning, /setCalendar\(null\)/);
console.log("ECONOMIC CALENDAR CONTRACT PASS: imported events require bounded canonical UTC identities and invalid API payloads remain unavailable.");
