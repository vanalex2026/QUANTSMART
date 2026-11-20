import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const component = readFileSync(new URL("../mfe_ux_lab/cockpit/src/shell/ConnectionStatus.tsx", import.meta.url), "utf8");
const connectionCss = readFileSync(new URL("../mfe_ux_lab/cockpit/src/shell/mt5-connection.css", import.meta.url), "utf8");
const workspaceCss = readFileSync(new URL("../mfe_ux_lab/cockpit/src/shell/workspace.css", import.meta.url), "utf8");

assert.match(component, /<dialog ref=\{dialog\} className="mt5-connect-dialog" aria-labelledby="mt5-dialog-title"/,
  "connection dialog must expose its title to assistive technology");
assert.match(component, /<button className="mt5-close" aria-label=\{copy.close\}/,
  "connection dialog close control must have an accessible name");
assert.match(component, /<button className="mt5-auto-attach" disabled=\{busy \|\| account\?\.supported === false\}/,
  "auto-attach control must remain a real disabled button while busy or unsupported");
assert.match(component, /\{busy && <p role="status" className="mt5-connect-note">/,
  "auto-attach progress must be announced as a status update");
assert.match(component, /<button className=\{`connection-status \$\{state\}`} aria-label=\{`\$\{copy.connection\}: \$\{feedDescription\}`} aria-haspopup="dialog"/,
  "connection trigger must expose its current state and dialog relationship");
assert.match(connectionCss, /@media\(max-width:430px\)[\s\S]*?\.mt5-auto-attach \{ min-height:44px;/,
  "mobile auto-attach control must meet a 44px touch target");
assert.match(connectionCss, /@media\(max-width:430px\)[\s\S]*?\.mt5-close,\.mt5-secondary,\.mt5-advanced-toggle \{ min-height:44px; \}/,
  "mobile dialog controls must meet a 44px touch target");
assert.ok(workspaceCss.includes(".connection-status { display: flex; align-items: center; gap: 7px; min-height: 30px;"),
  "connection status keeps a compact desktop header geometry");

console.log("CONNECTION STATUS ACCESSIBILITY PASS: dialog labels, live auto-attach state, trigger semantics and mobile touch targets are covered.");
