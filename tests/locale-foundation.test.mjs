import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const appRoot = new URL("../mfe_ux_lab/cockpit/", import.meta.url);
const { build } = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url))("esbuild");
const localeSource = readFileSync(new URL("src/lib/locale.ts", appRoot), "utf8");
const providerSource = readFileSync(new URL("src/lib/locale.tsx", appRoot), "utf8");
const mainSource = readFileSync(new URL("src/main.tsx", appRoot), "utf8");
const appSource = readFileSync(new URL("src/App.tsx", appRoot), "utf8");
const layoutSource = readFileSync(new URL("src/shell/Layout.tsx", appRoot), "utf8");

assert.match(providerSource, /export function LocaleProvider/);
assert.match(providerSource, /export function useLocale/);
assert.match(mainSource, /<LocaleProvider><WorkspaceGate><App \/><\/WorkspaceGate><\/LocaleProvider>/);
assert.match(appSource, /t\("loadingWorkspace"\)/);
assert.match(layoutSource, /locale-toggle/);
assert.match(layoutSource, /onClick=\{toggleLocale\}/);
assert.match(layoutSource, /locale === "en" \? `VI · \$\{t\("languageVietnamese"\)\}` : `EN · \$\{t\("languageEnglish"\)\}`/,
  "the visible language control must change its label after toggling",
);
assert.match(localeSource, /SHADOW \/ NO DECISION/);
assert.match(localeSource, /XAUUSD M5/);

const bundled = await build({
  stdin: { contents: localeSource, sourcefile: "locale.ts", loader: "ts" },
  bundle: true,
  format: "esm",
  platform: "node",
  write: false,
  logLevel: "silent",
});
const locale = await import("data:text/javascript;base64," + Buffer.from(bundled.outputFiles[0].text).toString("base64"));

assert.equal(locale.getLocaleMessage("en", "loadingWorkspace"), "Loading workspace...");
assert.match(locale.getLocaleMessage("vi", "loadingWorkspace"), /^Đang tải/);
assert.equal(locale.getWorkspaceLabel("en", "home"), "XAUUSD M5 Chart");
assert.equal(locale.getWorkspaceLabel("vi", "home"), "Biểu đồ XAUUSD M5");
assert.equal(locale.getWorkspaceLabel("vi", "unknown"), undefined);
assert.equal(locale.readStoredLocale({ getItem: () => "vi" }), "vi");
assert.equal(locale.readStoredLocale({ getItem: () => "fr" }), "en");

console.log("LOCALE FOUNDATION PASS: English/Vietnamese shell state, keyboard toggle wiring and stable technical identifiers are covered.");
