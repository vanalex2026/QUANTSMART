// Read-only terminal connection manager. Account credentials are never persisted.
import { useEffect, useRef, useState } from "react";
import { getActiveSymbol, SYMBOL_CHANGED_EVENT } from "../lib/activeSymbolStore.ts";
import { attachTerminal, autoAttachTerminal, canAutoAttachTerminal, detachTerminal, invalidateTerminalData, observeTerminalAccount, terminalRequest, useTerminalGeneration, MT5_OPEN_DIALOG_EVENT, type SymbolResolution, type TerminalAccount, type TerminalSettings } from "../lib/mt5Connection.ts";
import { isVerifiedClosedBarWindow, type Mt5BarsResult } from "../lib/mt5DemoAdapter.ts";
import { Glyph } from "../components/ui/Glyph.tsx";
import type { Locale } from "../lib/locale.ts";
import "./mt5-connection.css";

const CONNECTION_HEALTH_TF = "M5" as const;
const CONNECTION_HEALTH_TF_MS = 5 * 60_000;
const CONNECTION_HEALTH_MAX_AGE_MS = 2 * CONNECTION_HEALTH_TF_MS + 3 * 60_000;

const reasonText: Record<string, string> = {
  HISTORICAL_MODE: "Historical mode is active. Restart without --historical to enable the Windows MT5 connector.",
  PYTHON_311_REQUIRED: "Install 64-bit Python 3.11 or newer, then restart with npm run mfe to enable MT5.",
  BRIDGE_SETUP_FAILED: "The optional connector installation failed. Check the launcher output and restart when its dependencies are available. Historical research remains available.",
  NOT_ATTACHED: "Open and sign in to your MT5 desktop terminal. A bounded read-only Auto-Attach check will run; you can retry manually.",
  ACCOUNT_UNAVAILABLE: "The broker account is temporarily unavailable. Check the signed-in MT5 terminal and retry Auto-Attach.",
  NATIVE_MT5_REQUIRES_WINDOWS: "Native MT5 connectivity requires Windows. Historical research and CSV import remain available.",
  MT5_PACKAGE_UNAVAILABLE: "The MT5 Python package is unavailable. Start the workspace with npm run mfe on Windows.",
  LOCAL_BRIDGE_NOT_STARTED: "Start the local connector with npm run mfe. Historical research remains available.",
  LOCAL_BRIDGE_UNAVAILABLE: "The local connector is not responding. Check the terminal running npm run mfe.",
  MT5_INITIALIZE_FAILED: "MT5 could not be attached. Open a signed-in terminal or select its executable in Advanced connection.",
  MT5_AUTHORIZATION_FAILED: "MT5 rejected the terminal session. Sign in to the broker account in MT5, then retry Auto-Attach.",
  INVALID_TERMINAL_PATH: "Enter an absolute path to an installed local MT5 terminal executable.",
  SERVER_REQUIRED_FOR_ACCOUNT_SWITCH: "Enter the exact broker server name when selecting a login.",
  LOGIN_REQUIRED_FOR_ACCOUNT_SWITCH: "Enter a login ID to use account credentials, or leave all credential fields blank for Auto-Attach.",
  TERMINAL_DISCONNECTED: "The terminal is attached but its broker connection is unavailable.",
  SYMBOL_NOT_FOUND: "No matching symbol was found. Check the selected asset and the broker's Market Watch.",
  HISTORY_UNAVAILABLE: "Closed-bar history is unavailable for the selected broker symbol.",
  SYMBOL_SELECTION_FAILED: "The selected broker symbol could not be activated.",
  NO_MARKET_DATA: "No closed-bar market data is available for the selected broker symbol.",
};
const vi = (encoded: string) => decodeURIComponent(encoded);
const reasonTextVi: Record<string, string> = {
  HISTORICAL_MODE: vi("%C4%90ang%20%E1%BB%9F%20ch%E1%BA%BF%20%C4%91%E1%BB%99%20l%E1%BB%8Bch%20s%E1%BB%AD.%20Kh%E1%BB%9Fi%20%C4%91%E1%BB%99ng%20l%E1%BA%A1i%20kh%C3%B4ng%20c%C3%B3%20--historical%20%C4%91%E1%BB%83%20b%E1%BA%ADt%20k%E1%BA%BFt%20n%E1%BB%91i%20MT5."),
  PYTHON_311_REQUIRED: vi("C%C3%A0i%20%C4%91%E1%BA%B7t%20Python%203.11%2064-bit%20ho%E1%BA%B7c%20m%E1%BB%9Bi%20h%C6%A1n%2C%20sau%20%C4%91%C3%B3%20kh%E1%BB%9Fi%20%C4%91%E1%BB%99ng%20l%E1%BA%A1i%20b%E1%BA%B1ng%20npm%20run%20mfe%20%C4%91%E1%BB%83%20b%E1%BA%ADt%20MT5."),
  BRIDGE_SETUP_FAILED: vi("C%C3%A0i%20%C4%91%E1%BA%B7t%20b%E1%BB%99%20k%E1%BA%BFt%20n%E1%BB%91i%20t%C3%B9y%20ch%E1%BB%8Dn%20kh%C3%B4ng%20th%C3%A0nh%20c%C3%B4ng.%20Ki%E1%BB%83m%20tra%20%C4%91%E1%BA%A7u%20ra%20launcher%20r%E1%BB%93i%20kh%E1%BB%9Fi%20%C4%91%E1%BB%99ng%20l%E1%BA%A1i.%20Nghi%C3%AAn%20c%E1%BB%A9u%20l%E1%BB%8Bch%20s%E1%BB%AD%20v%E1%BA%ABn%20kh%E1%BA%A3%20d%E1%BB%A5ng."),
  NOT_ATTACHED: vi("H%C3%A3y%20m%E1%BB%9F%20terminal%20MT5%20v%C3%A0%20%C4%91%C4%83ng%20nh%E1%BA%ADp.%20Auto-Attach%20s%E1%BA%BD%20ki%E1%BB%83m%20tra%20k%E1%BA%BFt%20n%E1%BB%91i%20ch%E1%BB%89%20%C4%91%E1%BB%8Dc%20trong%20gi%E1%BB%9Bi%20h%E1%BA%A1n%3B%20b%E1%BA%A1n%20c%C3%B3%20th%E1%BB%83%20th%E1%BB%AD%20l%E1%BA%A1i%20th%E1%BB%A7%20c%C3%B4ng."),
  ACCOUNT_UNAVAILABLE: vi("T%C3%A0i%20kho%E1%BA%A3n%20broker%20t%E1%BA%A1m%20th%E1%BB%9Di%20kh%C3%B4ng%20d%C3%B9ng%20%C4%91%C6%B0%E1%BB%A3c.%20Ki%E1%BB%83m%20tra%20terminal%20MT5%20%C4%91%C3%A3%20%C4%91%C4%83ng%20nh%E1%BA%ADp%20v%C3%A0%20th%E1%BB%AD%20l%E1%BA%A1i%20Auto-Attach."),
  NATIVE_MT5_REQUIRES_WINDOWS: vi("K%E1%BA%BFt%20n%E1%BB%91i%20MT5%20g%E1%BB%91c%20c%E1%BA%A7n%20Windows.%20Nghi%C3%AAn%20c%E1%BB%A9u%20l%E1%BB%8Bch%20s%E1%BB%AD%20v%C3%A0%20nh%E1%BA%ADp%20CSV%20v%E1%BA%ABn%20kh%E1%BA%A3%20d%E1%BB%A5ng."),
  MT5_PACKAGE_UNAVAILABLE: vi("G%C3%B3i%20Python%20MT5%20kh%C3%B4ng%20kh%E1%BA%A3%20d%E1%BB%A5ng.%20Kh%E1%BB%9Fi%20%C4%91%E1%BB%99ng%20workspace%20b%E1%BA%B1ng%20npm%20run%20mfe%20tr%C3%AAn%20Windows."),
  LOCAL_BRIDGE_NOT_STARTED: vi("H%C3%A3y%20kh%E1%BB%9Fi%20%C4%91%E1%BB%99ng%20b%E1%BB%99%20k%E1%BA%BFt%20n%E1%BB%91i%20c%E1%BB%A5c%20b%E1%BB%99%20b%E1%BA%B1ng%20npm%20run%20mfe.%20Nghi%C3%AAn%20c%E1%BB%A9u%20l%E1%BB%8Bch%20s%E1%BB%AD%20v%E1%BA%ABn%20kh%E1%BA%A3%20d%E1%BB%A5ng."),
  LOCAL_BRIDGE_UNAVAILABLE: vi("B%E1%BB%99%20k%E1%BA%BFt%20n%E1%BB%91i%20c%E1%BB%A5c%20b%E1%BB%99%20kh%C3%B4ng%20ph%E1%BA%A3n%20h%E1%BB%93i.%20Ki%E1%BB%83m%20tra%20c%E1%BB%ADa%20s%E1%BB%95%20ch%E1%BA%A1y%20npm%20run%20mfe."),
  MT5_INITIALIZE_FAILED: vi("Kh%C3%B4ng%20th%E1%BB%83%20g%E1%BA%AFn%20MT5.%20M%E1%BB%9F%20terminal%20%C4%91%C3%A3%20%C4%91%C4%83ng%20nh%E1%BA%ADp%20ho%E1%BA%B7c%20ch%E1%BB%8Dn%20t%E1%BB%87p%20th%E1%BB%B1c%20thi%20trong%20K%E1%BA%BFt%20n%E1%BB%91i%20n%C3%A2ng%20cao."),
  MT5_AUTHORIZATION_FAILED: vi("MT5%20t%E1%BB%AB%20ch%E1%BB%91i%20phi%C3%AAn%20terminal.%20%C4%90%C4%83ng%20nh%E1%BA%ADp%20t%C3%A0i%20kho%E1%BA%A3n%20m%C3%B4i%20gi%E1%BB%9Bi%20trong%20MT5%20r%E1%BB%93i%20th%E1%BB%AD%20l%E1%BA%A1i%20Auto-Attach."),
  INVALID_TERMINAL_PATH: vi("Nh%E1%BA%ADp%20%C4%91%C6%B0%E1%BB%9Dng%20d%E1%BA%ABn%20tuy%E1%BB%87t%20%C4%91%E1%BB%91i%20%C4%91%E1%BA%BFn%20t%E1%BB%87p%20th%E1%BB%B1c%20thi%20MT5%20%C4%91%C3%A3%20c%C3%A0i%20%C4%91%E1%BA%B7t."),
  SERVER_REQUIRED_FOR_ACCOUNT_SWITCH: vi("Nh%E1%BA%ADp%20%C4%91%C3%BAng%20t%C3%AAn%20broker%20server%20khi%20ch%E1%BB%8Dn%20%C4%91%C4%83ng%20nh%E1%BA%ADp."),
  LOGIN_REQUIRED_FOR_ACCOUNT_SWITCH: vi("Nh%E1%BA%ADp%20m%C3%A3%20%C4%91%C4%83ng%20nh%E1%BA%ADp%20%C4%91%E1%BB%83%20d%C3%B9ng%20th%C3%B4ng%20tin%20t%C3%A0i%20kho%E1%BA%A3n%2C%20ho%E1%BA%B7c%20%C4%91%E1%BB%83%20tr%E1%BB%91ng%20to%C3%A0n%20b%E1%BB%99%20tr%C6%B0%E1%BB%9Dng%20%C4%91%E1%BB%83%20d%C3%B9ng%20Auto-Attach."),
  TERMINAL_DISCONNECTED: vi("Terminal%20%C4%91%C3%A3%20g%E1%BA%AFn%20nh%C6%B0ng%20k%E1%BA%BFt%20n%E1%BB%91i%20broker%20kh%C3%B4ng%20kh%E1%BA%A3%20d%E1%BB%A5ng."),
  SYMBOL_NOT_FOUND: vi("Kh%C3%B4ng%20t%C3%ACm%20th%E1%BA%A5y%20m%C3%A3%20ph%C3%B9%20h%E1%BB%A3p.%20Ki%E1%BB%83m%20tra%20t%C3%A0i%20s%E1%BA%A3n%20%C4%91%C3%A3%20ch%E1%BB%8Dn%20v%C3%A0%20Market%20Watch%20c%E1%BB%A7a%20broker."),
  HISTORY_UNAVAILABLE: vi("L%E1%BB%8Bch%20s%E1%BB%AD%20n%E1%BA%BFn%20%C4%91%C3%B3ng%20kh%C3%B4ng%20d%C3%B9ng%20%C4%91%C6%B0%E1%BB%A3c%20cho%20m%C3%A3%20broker%20%C4%91%C3%A3%20ch%E1%BB%8Dn."),
  SYMBOL_SELECTION_FAILED: vi("Kh%C3%B4ng%20th%E1%BB%83%20k%C3%ADch%20ho%E1%BA%A1t%20m%C3%A3%20broker%20%C4%91%C3%A3%20ch%E1%BB%8Dn."),
  NO_MARKET_DATA: vi("Kh%C3%B4ng%20c%C3%B3%20d%E1%BB%AF%20li%E1%BB%87u%20th%E1%BB%8B%20tr%C6%B0%E1%BB%9Dng%20n%E1%BA%BFn%20%C4%91%C3%B3ng%20cho%20m%C3%A3%20broker%20%C4%91%C3%A3%20ch%E1%BB%8Dn."),
};
const explanation = (reason?: string, locale: Locale = "en") => locale === "vi" ? reasonTextVi[reason || ""] || reason || vi("Ch%C6%B0a%20c%C3%B3%20k%E1%BA%BFt%20n%E1%BB%91i%20terminal%20hi%E1%BB%87n%20t%E1%BA%A1i.") : reasonText[reason || ""] || reason || "No current terminal connection.";
const amount = (value?: number | null, locale: Locale = "en") => typeof value === "number" && Number.isFinite(value) ? value.toLocaleString(locale === "vi" ? "vi-VN" : "en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—";

function ConnectionDialog({ account, close, locale }: { account: TerminalAccount | null; close: () => void; locale: Locale }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [advanced, setAdvanced] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [path, setPath] = useState(""), [login, setLogin] = useState(""), [password, setPassword] = useState(""), [server, setServer] = useState("");
  const [resolution, setResolution] = useState<SymbolResolution | null>(null);
  const symbol = getActiveSymbol();
  const copy = locale === "vi" ? {
    title: vi("K%E1%BA%BFt%20n%E1%BB%91i%20MetaTrader%205"),
    subtitle: vi("Terminal%20c%E1%BB%A5c%20b%E1%BB%99%20-%20d%E1%BB%AF%20li%E1%BB%87u%20th%E1%BB%8B%20tr%C6%B0%E1%BB%9Dng%20ch%E1%BB%89%20%C4%91%E1%BB%8Dc"),
    close: vi("%C4%90%C3%B3ng%20k%E1%BA%BFt%20n%E1%BB%91i%20MT5"),
    intro: vi("M%E1%BB%9F%20terminal%20MT5%20c%E1%BB%A7a%20m%C3%B4i%20gi%E1%BB%9Bi%20v%C3%A0%20%C4%91%C4%83ng%20nh%E1%BA%ADp%20t%E1%BA%A1i%20%C4%91%C3%B3.%20Auto-Attach%20d%C3%B9ng%20phi%C3%AAn%20terminal%20m%C3%A0%20kh%C3%B4ng%20y%C3%AAu%20c%E1%BA%A7u%20m%E1%BA%ADt%20kh%E1%BA%A9u."),
    connecting: vi("%C4%90ang%20k%E1%BA%BFt%20n%E1%BB%91i%E2%80%A6"), autoAttach: vi("Ch%E1%BA%A1y%20Auto-Attach%20MT5"), waiting: vi("%C4%90ang%20ch%E1%BB%9D%20terminal%20c%E1%BB%A5c%20b%E1%BB%99.%20M%E1%BA%ADt%20kh%E1%BA%A9u%20kh%C3%B4ng%20%C4%91%C6%B0%E1%BB%A3c%20l%C6%B0u."),
    connected: vi("T%C3%A0i%20kho%E1%BA%A3n%20%C4%91%C3%A3%20k%E1%BA%BFt%20n%E1%BB%91i"), readOnly: vi("Ch%E1%BB%89%20%C4%91%E1%BB%8Dc"), broker: vi("M%C3%B4i%20gi%E1%BB%9Bi%20%2F%20m%C3%A1y%20ch%E1%BB%A7"), login: vi("M%C3%A3%20%C4%91%C4%83ng%20nh%E1%BA%ADp"), balance: vi("S%E1%BB%91%20d%C6%B0"), equity: vi("V%E1%BB%91n%20ch%E1%BB%A7%20s%E1%BB%9F%20h%E1%BB%AFu"),
    mapping: vi("M%C3%A3%20m%C3%B4i%20gi%E1%BB%9Bi%20cho"), mappingAria: vi("%C3%81nh%20x%E1%BA%A1%20m%C3%A3%20m%C3%B4i%20gi%E1%BB%9Bi"), resolving: vi("%C4%90ang%20ph%C3%A2n%20gi%E1%BA%A3i%20m%C3%A3%20m%C3%B4i%20gi%E1%BB%9Bi%E2%80%A6"),
    resolver: vi("B%E1%BB%99%20ph%C3%A2n%20gi%E1%BA%A3i%20k%C3%ADch%20ho%E1%BA%A1t%20m%C3%A3%20%C4%91%C3%A3%20ch%E1%BB%8Dn%20trong%20Market%20Watch.%20Thay%20%C4%91%E1%BB%95i%20terminal%20ho%E1%BA%B7c%20t%C3%A0i%20kho%E1%BA%A3n%20s%E1%BA%BD%20x%C3%B3a%20%C3%A1nh%20x%E1%BA%A1%20tr%C6%B0%E1%BB%9Bc%20%C4%91%C3%B3."),
    detach: vi("Ng%E1%BA%AFt%20k%E1%BA%BFt%20n%E1%BB%91i%20d%E1%BB%AF%20li%E1%BB%87u"), advanced: vi("K%E1%BA%BFt%20n%E1%BB%91i%20n%C3%A2ng%20cao"),
    advancedNote: vi("Ch%E1%BB%8Dn%20terminal%20khi%20m%C3%A1y%20c%C3%B3%20nhi%E1%BB%81u%20b%E1%BA%A3n%20c%C3%A0i.%20Th%C3%B4ng%20tin%20%C4%91%C4%83ng%20nh%E1%BA%ADp%20t%C3%B9y%20ch%E1%BB%8Dn%20c%C3%B3%20th%E1%BB%83%20chuy%E1%BB%83n%20t%C3%A0i%20kho%E1%BA%A3n%20%C4%91ang%20ho%E1%BA%A1t%20%C4%91%E1%BB%99ng."),
    path: vi("%C4%90%C6%B0%E1%BB%9Dng%20d%E1%BA%ABn%20t%E1%BB%87p%20th%E1%BB%B1c%20thi%20MT5"), pathPlaceholder: vi("C:\\Program%20Files\\Broker%20MT5\\terminal64.exe"), password: vi("M%E1%BA%ADt%20kh%E1%BA%A9u"), passwordAria: vi("M%E1%BA%ADt%20kh%E1%BA%A9u%20MT5"), server: vi("M%C3%A1y%20ch%E1%BB%A7%20m%C3%B4i%20gi%E1%BB%9Bi"), serverPlaceholder: vi("D%C3%B9ng%20%C4%91%C3%BAng%20t%C3%AAn%20m%C3%A1y%20ch%E1%BB%A7%20hi%E1%BB%83n%20th%E1%BB%8B%20trong%20MT5"),
    security: vi("QUANTSMART%20ch%E1%BB%89%20g%E1%BB%ADi%20c%C3%A1c%20tr%C6%B0%E1%BB%9Dng%20n%C3%A0y%20%C4%91%E1%BA%BFn%20b%E1%BB%99%20k%E1%BA%BFt%20n%E1%BB%91i%20c%E1%BB%A5c%20b%E1%BB%99.%20MT5%20x%E1%BB%AD%20l%C3%BD%20x%C3%A1c%20th%E1%BB%B1c%20m%C3%B4i%20gi%E1%BB%9Bi.%20QUANTSMART%20kh%C3%B4ng%20l%C6%B0u%20m%E1%BA%ADt%20kh%E1%BA%A9u%20v%C3%A0o%20b%E1%BB%99%20nh%E1%BB%9B%20tr%C3%ACnh%20duy%E1%BB%87t%2C%20.env%2C%20t%E1%BB%87p%20workspace%20ho%E1%BA%B7c%20log."),
    unknownAccount: vi("Terminal%20ch%C6%B0a%20x%C3%A1c%20%C4%91%E1%BB%8Bnh%20%C4%91%C3%A2y%20l%C3%A0%20t%C3%A0i%20kho%E1%BA%A3n%20Demo%20hay%20Real.%20D%E1%BB%AF%20li%E1%BB%87u%20n%E1%BA%BFn%20%C4%91%C3%B3ng%20v%E1%BA%ABn%20ch%E1%BB%89%20%C4%91%E1%BB%8Dc%20v%C3%A0%20g%E1%BA%AFn%20v%E1%BB%9Bi%20t%C3%A0i%20kho%E1%BA%A3n%20cho%20%C4%91%E1%BA%BFn%20khi%20broker%20b%C3%A1o%20lo%E1%BA%A1i%20t%C3%A0i%20kho%E1%BA%A3n%20%C4%91%C3%A3%20bi%E1%BA%BFt."),
    submit: vi("K%E1%BA%BFt%20n%E1%BB%91i%20terminal%20%2F%20t%C3%A0i%20kho%E1%BA%A3n%20%C4%91%C3%A3%20ch%E1%BB%8Dn")
  } : {
    title: "Connect MetaTrader 5", subtitle: "Local terminal - read-only market data", close: "Close MT5 connection", intro: "Open your broker's MT5 terminal and sign in there. Auto-Attach uses the terminal session without asking for your password.", connecting: "Connecting…", autoAttach: "Auto-Attach Running MT5", waiting: "Waiting for the local terminal. No password is being saved.",
    connected: "Connected account", readOnly: "Read only", broker: "Broker / server", login: "Login ID", balance: "Balance", equity: "Equity", mapping: "Broker symbol for", mappingAria: "Broker symbol mapping", resolving: "Resolving broker symbols…", resolver: "The resolver activates the selected symbol in Market Watch. A terminal or account change clears the previous mapping.", detach: "Detach data connection", advanced: "Advanced connection", advancedNote: "Choose a terminal when several are installed. Optional credentials can switch that terminal's active account. Use the terminal and account you intend to inspect.",
    path: "MT5 executable path", pathPlaceholder: "C:\\Program Files\\Your Broker MT5\\terminal64.exe", password: "Password", passwordAria: "MT5 password", server: "Broker server", serverPlaceholder: "Use the exact server name shown in MT5", security: "QUANTSMART sends these fields only to its local bridge. MT5 handles broker authentication. QUANTSMART never saves the password to browser storage, .env, workspace files or logs.", unknownAccount: "The terminal did not identify this account as Demo or Real. Closed-bar data remains read-only and account-scoped until the broker reports a known account kind.", submit: "Connect selected terminal / account"
  };
  useEffect(() => { const previous = document.activeElement as HTMLElement | null; dialog.current?.showModal(); return () => { dialog.current?.close(); previous?.focus(); }; }, []);
  useEffect(() => {
    if (!account?.connected) { setResolution(null); return; }
    const controller = new AbortController();
    terminalRequest<SymbolResolution>(`/symbols?symbol=${encodeURIComponent(symbol)}`, undefined, controller.signal).then(setResolution).catch(() => { if (!controller.signal.aborted) setError(locale === "vi" ? vi("Danh%20s%C3%A1ch%20m%C3%A3%20c%E1%BB%A7a%20m%C3%B4i%20gi%E1%BB%9Bi%20kh%C3%B4ng%20kh%E1%BA%A3%20d%E1%BB%A5ng.") : "The broker symbol list is unavailable."); });
    return () => controller.abort();
  }, [account?.connected, account?.generation, symbol, locale]);
  const dismiss = () => { setPassword(""); close(); };
  async function connect(settings: TerminalSettings) {
    setBusy(true); setError("");
    try { const result = await attachTerminal(settings); if (!result.connected) setError(explanation(result.reason, locale)); }
    catch (e) { setError(explanation((e as Error).message, locale)); }
    finally { setPassword(""); setBusy(false); }
  }
  async function disconnect() { setBusy(true); setError(""); try { await detachTerminal(); } catch { setError(locale === "vi" ? vi("Kh%C3%B4ng%20th%E1%BB%83%20ng%E1%BA%AFt%20b%E1%BB%99%20k%E1%BA%BFt%20n%E1%BB%91i%20c%E1%BB%A5c%20b%E1%BB%99.") : "The local connector could not be detached."); } finally { setBusy(false); } }
  async function chooseSymbol(name: string) {
    setBusy(true); setError(""); invalidateTerminalData();
    try { const next = await terminalRequest<SymbolResolution>("/resolve", { symbol, broker_symbol: name }); setResolution(next); if (!next.ok) setError(explanation(next.reason, locale)); }
    catch { setError(locale === "vi" ? vi("Kh%C3%B4ng%20th%E1%BB%83%20k%C3%ADch%20ho%E1%BA%A1t%20m%C3%A3%20m%C3%B4i%20gi%E1%BB%9Bi%20%C4%91%C3%A3%20ch%E1%BB%8Dn.") : "The selected broker symbol could not be activated."); }
    finally { invalidateTerminalData(); setBusy(false); }
  }
  return <dialog ref={dialog} className="mt5-connect-dialog" aria-labelledby="mt5-dialog-title" onCancel={e => { e.preventDefault(); dismiss(); }} onClick={e => { if (e.target === e.currentTarget) dismiss(); }}>
    <header><div><h2 id="mt5-dialog-title">{copy.title}</h2><p>{copy.subtitle}</p></div><button className="mt5-close" aria-label={copy.close} onClick={dismiss}><Glyph name="x" size={18} /></button></header>
    <div className="mt5-dialog-body">
      <p className="mt5-connect-intro">{copy.intro}</p>
      <button className="mt5-auto-attach" disabled={busy || account?.supported === false} onClick={() => connect({})}><Glyph name="bolt" size={18} />{busy ? copy.connecting : copy.autoAttach}</button>
      {account?.supported === false && <p className="mt5-connect-note">{explanation(account.reason, locale)}</p>}
      {error && <p className="mt5-connect-error" role="alert">{error}</p>}
      {busy && <p role="status" className="mt5-connect-note">{copy.waiting}</p>}
      {account?.connected && <section className="mt5-account-info" aria-label={`${copy.connected} MT5`}><h3>{copy.connected} <span>{account.account_kind} · {copy.readOnly}</span></h3>{account.account_kind === "UNKNOWN" && <p className="mt5-connect-note" role="status">{copy.unknownAccount}</p>}{/* Keep unknown account data account-scoped until broker identity is known. */}<dl>
        <div><dt>{copy.broker}</dt><dd>{account.server || account.broker || "—"}</dd></div><div><dt>{copy.login}</dt><dd>{account.account_id || "—"}</dd></div><div><dt>{copy.balance}</dt><dd>{amount(account.balance, locale)} {account.currency}</dd></div><div><dt>{copy.equity}</dt><dd>{amount(account.equity, locale)} {account.currency}</dd></div>
      </dl><label className="mt5-input-label">{copy.mapping} {symbol}<select aria-label={copy.mappingAria} disabled={busy || !resolution?.candidates.length} value={resolution?.broker_symbol || ""} onChange={e => chooseSymbol(e.target.value)}><option value="">{resolution?.reason ? explanation(resolution.reason, locale) : copy.resolving}</option>{resolution?.candidates.map(item => <option key={item.name} value={item.name}>{item.name}{item.quote ? ` · ${item.quote}` : ""}</option>)}</select></label><p className="mt5-connect-note">{copy.resolver}</p><button className="mt5-secondary" disabled={busy} onClick={disconnect}>{copy.detach}</button></section>}
      <button className="mt5-advanced-toggle" aria-expanded={advanced} aria-controls="mt5-advanced-form" onClick={() => setAdvanced(!advanced)}><Glyph name="gear" size={15} />{copy.advanced}</button>
      {advanced && <form id="mt5-advanced-form" onSubmit={e => { e.preventDefault(); void connect({ terminal_path: path.trim(), login: login.trim(), password: password || undefined, server: server.trim() }); }}>
        <p className="mt5-connect-note">{copy.advancedNote}</p>
        <label className="mt5-input-label">{copy.path}<input disabled={busy} aria-label={copy.path} autoComplete="off" value={path} onChange={e => setPath(e.target.value)} placeholder={copy.pathPlaceholder} /></label>
        <div className="mt5-input-pair"><label className="mt5-input-label">{copy.login}<input disabled={busy} aria-label={copy.login} inputMode="numeric" autoComplete="off" value={login} onChange={e => setLogin(e.target.value)} maxLength={24} /></label><label className="mt5-input-label">{copy.password}<input disabled={busy} aria-label={copy.passwordAria} type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} /></label></div>
        <label className="mt5-input-label">{copy.server}<input disabled={busy} aria-label={copy.server} autoComplete="off" value={server} onChange={e => setServer(e.target.value)} placeholder={copy.serverPlaceholder} /></label>
        <p className="mt5-connect-note">{copy.security}</p><button className="mt5-secondary" disabled={busy || account?.supported === false} type="submit">{copy.submit}</button>
      </form>}
    </div>
  </dialog>;
}

export function ConnectionStatus({ onSynced, locale = "en" }: { onSynced?: (synced: boolean) => void; locale?: Locale }) {
  const [account, setAccount] = useState<TerminalAccount | null>(null);
  const [state, setState] = useState("checking"), [open, setOpen] = useState(false), [reason, setReason] = useState("");
  const generation = useTerminalGeneration();
  const autoAttach = useRef({ attempts: 0, nextAt: 0 });
  useEffect(() => { const show = () => setOpen(true); window.addEventListener(MT5_OPEN_DIALOG_EVENT, show); return () => window.removeEventListener(MT5_OPEN_DIALOG_EVENT, show); }, []);
  useEffect(() => { onSynced?.(state === "synced"); }, [state, onSynced]);
  useEffect(() => {
    let stopped = false, controller: AbortController | null = null, timer: ReturnType<typeof setTimeout>;
    const maxAutoAttachAttempts = 3;
    const pull = async (force = false) => {
      clearTimeout(timer); controller?.abort(); if (document.hidden && !force) return;
      controller = new AbortController(); const current = controller;
      try {
        let next = await terminalRequest<TerminalAccount>("/account", undefined, current.signal);
        if (stopped || current.signal.aborted) return;
        if (canAutoAttachTerminal?.(next) && autoAttach.current.attempts < maxAutoAttachAttempts && Date.now() >= autoAttach.current.nextAt && !document.hidden) {
          autoAttach.current.attempts += 1;
          autoAttach.current.nextAt = Date.now() + 20000 * 2 ** (autoAttach.current.attempts - 1);
          setAccount(next); setState("attaching");
          setReason(locale === "vi" ? `${vi("%C4%90ang%20th%E1%BB%AD%20Auto-Attach%20ch%E1%BB%89%20%C4%91%E1%BB%8Dc")} (${autoAttach.current.attempts}/${maxAutoAttachAttempts}). ${vi("Kh%C3%B4ng%20c%C3%B3%20quy%E1%BB%81n%20%C4%91%C4%83ng%20nh%E1%BA%ADp%20ho%E1%BA%B7c%20%C4%91%E1%BA%B7t%20l%E1%BB%87nh.")}` : `Trying read-only Auto-Attach (${autoAttach.current.attempts}/${maxAutoAttachAttempts}). No credentials or order access.`);
          try { next = await autoAttachTerminal(current.signal); }
          catch (error) { if (stopped || current.signal.aborted) return; setAccount(next); setState("offline"); setReason(`${explanation((error as Error).message, locale)} ${locale === "vi" ? vi("Auto-Attach%20c%C3%B3%20gi%E1%BB%9Bi%20h%E1%BA%A1n%3B%20m%E1%BB%9F%20c%C3%A0i%20%C4%91%E1%BA%B7t%20k%E1%BA%BFt%20n%E1%BB%91i%20%C4%91%E1%BB%83%20th%E1%BB%AD%20l%E1%BA%A1i%20th%E1%BB%A7%20c%C3%B4ng.") : "Auto-Attach is bounded; open connection settings to retry manually."}`); return; }
        }
        observeTerminalAccount(next); setAccount(next); setReason(next.connected ? "" : explanation(next.reason, locale));
        if (next.connected) { autoAttach.current.attempts = 0; autoAttach.current.nextAt = 0; }
        let nextState = next.connected ? "stale" : "offline";
        if (next.connected) {
          try {
            const bars = await terminalRequest<Mt5BarsResult>(`/bars?symbol=${encodeURIComponent(getActiveSymbol())}&tf=${CONNECTION_HEALTH_TF}&n=2`, undefined, current.signal);
            const latest = Array.isArray(bars.bars) && bars.bars.length ? bars.bars.reduce((a, b) => Date.parse(a.t) >= Date.parse(b.t) ? a : b) : undefined;
            const age = latest ? Date.now() - (Date.parse(latest.t) + CONNECTION_HEALTH_TF_MS) : Number.NaN;
            if (isVerifiedClosedBarWindow(bars, CONNECTION_HEALTH_TF) && Number.isFinite(age) && age >= -60000 && age < CONNECTION_HEALTH_MAX_AGE_MS) nextState = "synced";
          } catch { if (!stopped && !current.signal.aborted) setReason(locale === "vi" ? vi("Kh%C3%B4ng%20th%E1%BB%83%20ki%E1%BB%83m%20tra%20d%E1%BB%AF%20li%E1%BB%87u%20n%E1%BA%BFn%20%C4%91%C3%B3ng%20M5%3B%20%C4%91ang%20th%E1%BB%AD%20l%E1%BA%A1i.") : `The ${CONNECTION_HEALTH_TF} closed-bar feed check is unavailable; retrying.`); }
        }
        if (!stopped && !current.signal.aborted) setState(nextState);
      } catch { if (!stopped && !current.signal.aborted) { setAccount(null); setState("offline"); setReason(explanation("LOCAL_BRIDGE_UNAVAILABLE", locale)); } }
      finally { if (!stopped) timer = setTimeout(pull, 20000); }
    };
    const refresh = () => { if (document.hidden) { clearTimeout(timer); controller?.abort(); } else void pull(); };
    void pull(true); document.addEventListener("visibilitychange", refresh); window.addEventListener(SYMBOL_CHANGED_EVENT, refresh);
    return () => { stopped = true; clearTimeout(timer); controller?.abort(); document.removeEventListener("visibilitychange", refresh); window.removeEventListener(SYMBOL_CHANGED_EVENT, refresh); };
  }, [generation, locale]);
  // Account identifiers and balances belong in the explicit connection dialog.
  const copy = locale === "vi" ? { sync: vi("MT5%20%C4%91%C3%A3%20%C4%91%E1%BB%93ng%20b%E1%BB%99"), connected: vi("MT5%20%C4%91%C3%A3%20k%E1%BA%BFt%20n%E1%BB%91i"), historical: vi("Ch%E1%BA%BF%20%C4%91%E1%BB%99%20l%E1%BB%8Bch%20s%E1%BB%AD"), attaching: vi("MT5%20%C4%91ang%20g%E1%BA%AFn"), checking: vi("MT5%20%C4%91ang%20ki%E1%BB%83m%20tra"), offline: vi("MT5%20ngo%E1%BA%A1i%20tuy%E1%BA%BFn"), account: vi("t%C3%A0i%20kho%E1%BA%A3n"), readonly: vi("d%E1%BB%AF%20li%E1%BB%87u%20th%E1%BB%8B%20tr%C6%B0%E1%BB%9Dng%20ch%E1%BB%89%20%C4%91%E1%BB%8Dc"), connection: vi("K%E1%BA%BFt%20n%E1%BB%91i") } : { sync: "MT5 Sync", connected: "MT5 Connected", historical: "Historical mode", attaching: "MT5 Attaching…", checking: "Checking MT5…", offline: "MT5 Offline", account: "account", readonly: "read-only market data", connection: "Connection" };
  const label = account?.connected ? state === "synced" ? copy.sync : copy.connected : account?.reason === "HISTORICAL_MODE" ? copy.historical : state === "attaching" ? copy.attaching : state === "checking" ? copy.checking : copy.offline;
  const feedDescription = account?.connected ? `${label} - ${account.account_kind} ${copy.account} - ${copy.readonly} - ${state === "synced" ? (locale === "vi" ? vi("ngu%E1%BB%93n%20n%E1%BA%BFn%20%C4%91%C3%B3ng%20M5%20hi%E1%BB%87n%20t%E1%BA%A1i") : `current ${CONNECTION_HEALTH_TF} closed-bar feed`) : (locale === "vi" ? vi("kh%C3%B4ng%20c%C3%B3%20ngu%E1%BB%93n%20n%E1%BA%BFn%20%C4%91%C3%B3ng%20M5%20hi%E1%BB%87n%20t%E1%BA%A1i") : `no current ${CONNECTION_HEALTH_TF} closed-bar feed`)}${reason ? ` - ${reason}` : ""}` : reason || (state === "checking" ? (locale === "vi" ? vi("%C4%91ang%20ki%E1%BB%83m%20tra%20k%E1%BA%BFt%20n%E1%BB%91i%20MT5") : "checking MT5 connection") : "");
  return <div className="connection-wrap"><button className={`connection-status ${state}`} aria-label={`${copy.connection}: ${feedDescription}`} aria-haspopup="dialog" title={feedDescription} onClick={() => setOpen(true)}><span className="connection-dot" /><span className="connection-label">{label}</span><span className="connection-chevron">▾</span></button>{open && <ConnectionDialog account={account} locale={locale} close={() => setOpen(false)} />}</div>;
}
