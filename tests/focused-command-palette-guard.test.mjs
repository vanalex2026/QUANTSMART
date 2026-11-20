import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const layout = readFileSync(new URL("../mfe_ux_lab/cockpit/src/shell/Layout.tsx", import.meta.url), "utf8");

assert.match(
  layout,
  /const key = \(e: KeyboardEvent\) => \{[\s\S]*?if \(\(e\.ctrlKey \|\| e\.metaKey\) && e\.key\.toLowerCase\(\) === "k"\) \{ if \(current === "home"\) return; e\.preventDefault\(\); setPalette\(/,
  "focused home must keep Ctrl/Cmd+K from opening the hidden command palette",
);
assert.match(
  layout,
  /window\.addEventListener\("keydown", key\)[\s\S]*?\}, \[current\]\);/,
  "the keyboard listener must refresh when navigation changes so non-home routes retain Ctrl/Cmd+K",
);
assert.match(
  layout,
  /data-focus-surface=\{current === "home" \? "m5-chart" : undefined\}/,
  "the keyboard guard must remain aligned with the focused m5-chart route marker",
);
assert.match(
  layout,
  /\{palette && current !== "home" && <CommandPalette /,
  "a palette opened on a diagnostic route must unmount when navigation reaches focused home",
);

console.log("FOCUSED COMMAND PALETTE GUARD PASS: Ctrl/Cmd+K stays inert on focused home and remains route-compatible elsewhere.");
