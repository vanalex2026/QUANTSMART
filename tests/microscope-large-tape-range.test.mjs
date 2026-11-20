import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url), "utf8");
assert.match(source, /import \{ finiteMinMax \} from "\.\.\/lib\/finiteMinMax\.ts"/);
assert.equal((source.match(/finiteMinMax\(\(function\* \(\)/g) || []).length, 2, "Microscope mini charts must aggregate both large tape ranges iteratively");
assert.doesNotMatch(source, /Math\.min\(\.\.\.bars\.map|Math\.max\(\.\.\.bars\.map/, "analogue previews must not spread a full M5 tape");
assert.doesNotMatch(source, /Math\.min\(\.\.\.rows\.map|Math\.max\(\.\.\.rows\.map/, "pattern previews must not spread a full M5 tape");
console.log("MICROSCOPE LARGE TAPE PASS: M5 preview ranges avoid spread-based stack overflow.");
