# QUANTSMART

**Build a strategy you can explain. Test it on data you can inspect.**

A trading idea is easy to describe. Turning it into precise rules—and understanding
what happened when those rules were tested—takes more work.

QUANTSMART brings that process into one local-first research workspace. Start with a feature or
formula, assemble it into a Strategy Card, then replay the price history and inspect
the results. The visual editors expose the calculations; the research tools keep the
dataset, costs and validation windows attached to the experiment.

![QUANTSMART Cockpit with six telemetry gauges, live price chart, structural zones, timeframe observations and Strategy Card controls](docs/screenshots/cockpit-overview.png)

*Cockpit: the supplied full-screen capture shows actual MT5 prices, six telemetry
gauges, timeframe observations and structural reference zones. Entry assessment and
Card evidence remain unavailable until their respective sources exist. [Open the
full-resolution image](docs/screenshots/cockpit-overview.png).*

[Get started](#quick-start) · [Explore the product tour](docs/PRODUCT_TOUR.md) ·
[Build custom modules](docs/CUSTOM_MODULES.md) · [Video tutorials](docs/TUTORIALS.md) ·
[Watch the tutorial video](https://drive.google.com/drive/folders/1QuFV7GtY4ttnVvgeeI0HlnZDH2hOpVAu?usp=sharing) · [Connect MT5](#connect-xm--another-mt5-broker)

## Tutorial video

📹 Watch the step-by-step walkthrough and demo videos here:
[QUANTSMART tutorial videos on Google Drive](https://drive.google.com/drive/folders/1QuFV7GtY4ttnVvgeeI0HlnZDH2hOpVAu?usp=sharing)

## Make the rules your own

Build a candle measurement from primitive blocks, combine indicators into a formula,
or add context and strategy logic in Canvas. Inspect the connections and intermediate
values before saving a component to your library. Templates give you somewhere to
start; your definitions determine the experiment. You can also combine Cards into
role-based ensembles and inspect how their members contribute.

![Strategy Canvas with module library, L0–L6 composition lanes and dependency checks](docs/screenshots/strategy-canvas.jpg)

[See the Custom Module walkthrough](docs/CUSTOM_MODULES.md) for a worked feature-graph
example and formula inspection in Coordinate Lab.

## Understand the result, trade by trade

A backtest total is only the beginning. Microscope lets you inspect the price action
around individual observations. Strategy Lab keeps the Card's composition and saved
results together; Compatibility Map shows which historical, out-of-sample and holdout
windows have actually been tested.

![Strategy Lab with saved Cards, measured backtest evidence and run controls](docs/screenshots/strategy-lab.jpg)

Change a hypothesis, run it again, and compare the evidence. Review sample size,
execution costs and fill assumptions alongside the result. A valid graph or a positive
backtest does not establish future performance.

## Use your own data

Import authorized OHLC history for research, or connect an installed MT5 terminal on
Windows to inspect broker prices and tick updates. Historical replay remains available
without MT5. The source release includes no account credentials, private workspace or
market-history files; your local installation supplies those inputs.

QUANTSMART is open source under **Apache-2.0**. Research jobs never place broker
orders. An optional, separately enabled manual ticket workflow supports MT5 **Demo**
accounts with review and confirmation. Real accounts cannot use that execution path.
The separate, opt-in [Card Demo runner preview](docs/DEMO_AUTOMATION.md) can evaluate
newly closed candles and execute supported Card rules on Demo after an explicit Start.
See [verification and limits](docs/VERIFICATION.md), [LICENSE](LICENSE) and
[SECURITY.md](SECURITY.md).

### Candle Pattern Atlas

The **Pattern Atlas** workspace adds a causal candle-analogue study for XAUUSD on
M5, M15 and M30, with H1 retained as broker context. A live MT5 session requests
three years of closed bars in bounded range chunks; M1 is never requested by this
workflow. It normalizes candle geometry by ATR, finds non-overlapping
historical windows that ended before the current window, and reports the observed
UP / DOWN / FLAT distribution for the next one, two and three closed candles.
It also answers exact recurrence directly: whether the complete recent sequence
has appeared before, how many times, when it last appeared and its median repeat
distance.
Each loop refreshes the closed-bar tape, reruns the walk-forward diagnostic and
shows sample size, majority baseline and lift. Later loops also classify the
current volatility/trend regime, score pattern novelty and persist a local
evolution ledger so a new market shape is visible instead of being silently
forced into an old label. The result is a shadow research measurement; it does
not produce an order or a promise of future performance.

## Quick start

Windows download: [current portable preview, default port 5090](https://github.com/Jokejoker-designer/QUANTSMART/releases/download/v1.2.0-rc.7/QUANTSMART-1.2.0-rc.7-windows-x64.zip). Historical re[...]

### Demo Card execution preview

The opt-in Card runner evaluates newly closed candles, binds a frozen Card definition to the connected Demo account, and never resumes automatically. Broker deal markers distinguish entries from c[...]

### Requirements

- Node.js 22.12 or newer and npm
- Optional for MT5 on Windows: Python 3.11+ 64-bit
- Installed MetaTrader 5 terminal if you want live broker data
- Historical research works without Python / MT5 using CSV or local data files

### 1) Clone and install

```bash
git clone https://github.com/Jokejoker-designer/QUANTSMART.git
cd QUANTSMART
npm install
```

If you are using Windows and want the setup script to prepare the project for you, run:

```bash
npm run setup -- --historical
```

This step creates `.env` from `.env.example` if needed, installs the project deps,
builds the app once, and prepares the local runtime.

### 2) Run QUANTSMART locally

```bash
npm run mfe:doctor
npm start
```

Normal source and portable startup use port **5090**. If it is occupied, startup reports the conflict and preserves the existing process. There is no automatic alternate-port search. Only an expl[...]

The app opens:

```text
http://localhost:5090/
```

Useful commands:

```bash
npm run mfe -- --historical       # historical/research mode
npm run mfe -- --production       # production build + served runtime
npm run mfe -- --dev --historical # explicit development mode
npm run mfe -- --no-browser       # do not auto-open browser
npm run mfe -- --port 5090 --bridge-port 8791
npm run mfe:check                 # read-only environment check
npm run mfe:doctor -- --json --offline
npm run test:public               # public tests without private dataset or Python
```

### 3) MT5 setup (Windows only)

Install Python 3.11+ 64-bit and your broker's MT5 desktop terminal. Then run:

```bash
npm run setup -- --mt5
npm run mfe -- --mt5
```

Open your broker MT5 terminal and sign in. In the app, choose **MT5 Offline →
Auto-Attach Running MT5**.

If you have multiple MT5 installations, use **Advanced connection** and select the
exact `terminal64.exe` path. The launcher keeps the connector in an isolated
`.venv-mfe` environment and does not overwrite an existing research virtualenv.

### 4) Development workflow

```bash
npm run setup -- --historical --dev-deps
npm run mfe -- --dev --historical
npm run test:mfe
npm --prefix mfe_ux_lab/cockpit run typecheck
npm --prefix mfe_ux_lab/cockpit run build
```

### 5) Optional manual Demo tickets

If you want manual MT5 Demo trading support:

```bash
# in your local .env
MFE_ENABLE_MANUAL_DEMO=true
```

Restart the launcher afterward. Only Demo accounts are allowed for this feature.
Research runs never place orders automatically.

## Connect XM / another MT5 broker

1. Open the broker's MT5 desktop application and sign in there normally.
2. Start QUANTSMART with `npm run mfe` on the same Windows machine. Use the root
   launcher so the frontend and authenticated MT5 bridge start together; running
   `tools/productServer.mjs` alone does not start the connector.
3. Click **MT5 Offline → Auto-Attach Running MT5**. Inspect the detected broker,
   account ID, Demo/Real type, balance and equity before using Live feed.

QUANTSMART's Auto-Attach does not ask for a password. The official SDK can discover a
terminal automatically and use the account saved there. It may launch that
terminal when needed; it does not guarantee the most recently focused terminal.
When several MT5 installations exist, use **Advanced connection** and enter the
full path to the intended `terminal64.exe`. Optional login/password/server fields
are available when you intentionally want to switch that terminal's account.
QUANTSMART never saves the password. [SDK initialization documentation](https://www.mql5.com/en/docs/python_metatrader5/mt5initialize_py)

The bridge scans the connected broker's symbol catalog. For XAUUSD it prioritizes
XAUUSD, GOLD, GOLD#, XAUUSDm, XAUUSD.a, XAUUSD.pro and GOLDmicro, then compatible
suffix variants such as GOLD.i#. Choose a different detected symbol in the
connection dialog if required. The selected symbol is enabled in Market Watch.
A changed terminal/account clears cached data and the previous mapping.

For the three-year Pattern Atlas pull, set MT5 **Tools → Options → Charts → Max
bars in chart** above the expected M5 history size (for example `400000`), then
restart or reconnect MT5. The app reports partial broker coverage with an
asterisk and never fills missing history silently.
If Pattern Atlas reports `HISTORY_CONTRACT_MISMATCH`, `OUTSIDE_REQUESTED_WINDOW`
or `HISTORY_PROVENANCE_MISSING`, restart the local read-only bridge so its
history contract is reloaded before retrying the pull.

### Durable closed-candle restart recovery

Successful, validated XAUUSD M5 closed-bar reads are also written to the local
SQLite state file `.mfe-state/closed-candles.sqlite3`. The file is created on
the first successful write; a normal launcher start does not populate it with
market data. To place it elsewhere, set `MFE_CLOSED_CANDLES_DB` to a writable
SQLite path before starting the launcher. The database contains no MT5 login,
password or access token. Rows are separated by account ID, broker server,
broker symbol and configured server timezone, so a reconnect or account switch
cannot reuse another account's tail.

After a bridge restart, a connected M5 read that returns no rows may use the
previously written, scope-matching tail and reports
`CLOSED_CANDLE_STORE_FALLBACK`. This is a recovery aid, not a fresh broker
confirmation: the chart keeps its labelled local/verified status until a new
closed-bar read satisfies the normal MT5 contract. The bridge never stores a
forming candle or promotes a partial history response through this path.

Bridge responses expose `latest_closed_bar_age_seconds`; the focused chart's
connection/history status mirrors the newest accepted closed-bar UTC time and
its freshness. If the latest time stops advancing,
check the status before relying on the displayed tail, reconnect MT5, and
restart the local launcher after changing the timezone or database path.

If the terminal emits broker wall-clock fields instead of UTC, configure
`MFE_MT5_SERVER_TIMEZONE` in your local `.env` and restart the launcher. This defaults
to `UTC`. The XM Global installation verified here uses `Europe/Athens`, with
GMT+2 winter and GMT+3 summer. Check your broker's clock before choosing a zone;
do not copy another broker's setting. The bridge converts candles to UTC using
historical DST rules and translates UTC history requests back to the server clock.

Broker access, installed history, market hours, suffixes and account permissions
vary. A stale feed is marked as stale. No candle, account balance or entry score
is invented when a source is absent. The connector provides prices and observed
EMA/ATR measurements; it does not fabricate advisory verdicts or a Trade Plan.

Live charts use a separate server-sent event stream. The bridge reads terminal
tick history in 100 ms batches with millisecond/ordinal cursors, then pushes real
Bid/Ask ticks and the terminal's forming candle. Chart rendering may combine ticks
in the same batch. It does not interpolate or invent price movement. Cockpit's
price and tick counter use this stream; research diagnostics continue to consume
closed candles. Hidden tabs suspend their subscription, and disconnected feeds
show a waiting/reconnecting state. Catch-up reads are bounded at 8,192 rows per
batch; an unprogressable backlog reports an error rather than a false live state.

## Card controls and optional Demo execution

In Cockpit or Strategy Lab, select a saved Card and choose **Card backtest**.
Choose local history or a frozen sample of MT5 closed candles, then **Run backtest**.
Progress, cancellation and saved evidence stay beside that Card. **Open chart**
opens its market view. Full multi-window validation remains under Advanced validation.

Manual Demo execution is opt-in. Set `MFE_ENABLE_MANUAL_DEMO=true` in the local
`.env` and restart the launcher. Choose **MT5 Demo → Manual Demo ticket & positions**, verify the account, enter
volume/direction, and review the broker-checked ticket. Only **Confirm Demo BUY/SELL**
submits it. Each position has **Review close**, followed by a separate confirmation.
Real/contest/unknown accounts are rejected. Research runs never call execution.
QUANTSMART does not change the terminal's Algo Trading or external Python API settings.
If a response is unknown, check MT5 before creating another request.

For the opt-in automatic preview, set `MFE_ENABLE_CARD_DEMO=true`, select a Card,
then use **Check Card support** before **Start Card on Demo**. This is a separate
process-local session with fixed lots, a maximum entry count and a frozen definition.
Stop prevents future requests; it does not liquidate an existing broker position.
See the [supported behavior and pending acceptance](docs/DEMO_AUTOMATION.md).

## Historical research without MT5

No private or broker-licensed market histories are bundled. Open **Microscope**,
choose **CSV**, and import your own OHLC file. Existing chart/history tools handle
source selection, chronological replay and research validation. For dataset-backed
research jobs, place authorized files named `ohlc_<SYMBOL>_<TF>.json` in
`mfe_ux_lab/cockpit/public/data/sim/`, with an object containing a `bars` array.
Each bar has `t` (UTC ISO timestamp), `o`, `h`, `l`, and `c`; use actual source data.

A fresh release with no imported dataset shows a clear unavailable-data state.
It starts successfully and does not substitute demonstration market results.

## Local privacy

All application endpoints bind to loopback. Browser requests use one local origin;
the MT5 process requires an ephemeral internal token. Passwords are not written
to browser storage, .env, local workspaces, exports or logs. MT5 itself handles
broker authentication. Read [SECURITY.md](SECURITY.md) for the boundary and limits.
`.env.example` contains ports/mode only. Keep actual .env and user data private.

## Development and verification

The default launcher runs the built frontend,
bundled research worker and durable workspace server. Use `--dev` for Vite. Python and JavaScript tests
use isolated fixtures; fixture prices are never shipped as market history.

```sh
npm run test:mfe
npm --prefix mfe_ux_lab/cockpit run typecheck
npm --prefix mfe_ux_lab/cockpit run build
```

The HTTP research tests under `tools/test-*-product.mjs` additionally require an
authorized local historical dataset. They are not a promise of live readiness.
Python API tests use `httpx`; install `requirements-dev.txt` into the virtual
environment before testing on a clean machine. The test runner automatically uses
that same `.venv-mfe`, so it does not rely on globally installed Python packages.
On Windows: `.venv-mfe\Scripts\python.exe -m pip install -r requirements-dev.txt`.
On macOS/Linux, create `.venv-mfe` with Python 3.11+ for development tests and use
`.venv-mfe/bin/python -m pip install -r requirements-dev.txt`.

## Prepare a public source release

This working checkout may also contain private research. Do not upload it wholesale.

```sh
npm run package:mfe
```

The exporter follows the application's runtime **and type-only** source imports,
adds only approved scripts/docs/tests, rejects private paths and obvious embedded
credentials, and writes a separate source directory, ZIP and SHA-256 manifest in
`release_artifacts/`. It omits node_modules, .venv-mfe, .env, workspaces, account data,
market histories and archives. Review that directory and its manifest, then create
your public repository from it. The command does not upload or publish anything.

## Quantitative methodology audit

The [methodology audit](docs/QUANT_METHODOLOGY_AUDIT.md) documents reproduced gap-fill and custom-ablation defects, their regression tests, causal measurement checks, and the observed search-tria[...]

### Entry chronology corrections in 1.1.2

The [follow-up audit](docs/QUANT_CHRONOLOGY_AUDIT.md) reproduces and fixes next-open ATR/Auto R:R look-ahead, missed exits in the intrabar entry candle, and tick-exact labels inferred from metada[...]

## Durable CSV research and matched controls

Import historical prices in the [CSV workflow](docs/CSV_IMPORT.md), review strict validation and reopen local datasets after restart. The same stored bars feed chart aggregation and supported Car[...]

Current downloadable preview: [1.2.0-rc.7](https://github.com/Jokejoker-designer/QUANTSMART/releases/tag/v1.2.0-rc.7). Default URL: **http://localhost:5090/**. CSV file-chooser acceptance and cus[...]

## Inspect decision and outcome evidence

In Microscope, select a saved CSV and Strategy Card, then open **Decision & outcome evidence**. Build a local journal to link observed engine signals, policy blocks, modeled fills and completed t[...]

The journal covers observed canonical signals on 61–5,000 design bars. It does not invent structural-thesis identity, missing veto events, exact excursions or calibrated probabilities. See the [...]

### Focused M5 chart direction

The chart inspection surface now opens on **XAUUSD M5** and uses a scoped
black/white TradingView-like canvas with pan, zoom, crosshair and drawing tools.
Drawings and pan/zoom state are namespaced by symbol and timeframe. Brush
strokes are anchored to closed-bar timestamps, so a refreshed two-year M5 tape
re-anchors the inspection without silently moving annotations to another bar.
Use Cursor to select saved drawings, `[` / `]` to cycle them, drag their bodies
or handles to edit, and Delete/Backspace to remove one; Escape cancels or clears
selection. The focused route keeps the unrelated workspace jump palette hidden,
and a scoped palette guard keeps focused evidence chrome monochrome while
directional candles retain their explicit teal/red colors.
The chart remains SHADOW_ONLY and has no decision or order authority.
Current pattern chips retain exact concept and closed-bar UTC identity and state `SHADOW_ONLY; NO_DECISION; no order authority`. The focused forecast keeps verified MT5 history, fresh closed-bar evidence, walk-forward coverage, causal support, independent analogue coverage, consensus margin and support metadata as separate gates; any failed gate is shown as `WAIT` with its reason. A historical verified read-only runtime captured all gates passing and reported `RESEARCH LANDMARK READY / UP`; this remains descriptive research evidence, not a current live-market claim. Current runtime evidence must come from a fresh receipt, and unavailable or unverified MT5 history keeps the forecast at `WAIT`. Refreshes promote only through a verified closed boundary, and forming or malformed rows fail closed. On phones through 430px, the pattern evidence shelf scrolls within a bounded region while its authority line remains visible beside the chips and `Why / PDF` explanation.
When MT5 is already open, the shell performs a bounded read-only Auto-Attach
check without sending credentials; it cancels on teardown, stops after three
attempts and pauses after explicit detach. Focused M5 refresh adds a unique
cache-busting probe and promotes new data only through a verified closed bar,
preserving account/symbol namespace and UTC provenance. Malformed, duplicate,
off-grid or forming-bar responses fail closed. Modified chart shortcuts retain
native browser behavior. The orphan BeastDeck wrapper is removed while shared
Beast research services remain.
The durable handoff state for future AI sessions is tracked in
[`docs/AI_SESSION_STATE.md`](docs/AI_SESSION_STATE.md). The PDF-derived
price-action concepts are summarized in
[`docs/PRICE_ACTION_KNOWLEDGE_MAP.md`](docs/PRICE_ACTION_KNOWLEDGE_MAP.md),
with a machine-readable companion at
[`docs/price_action_knowledge_map.json`](docs/price_action_knowledge_map.json).
The concise requirement and evidence ledger is maintained in
[`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md).

All 12 source chapters and 36 curated source lenses are indexed; the indexed
chapter interval is fully reviewed at 419/419 pages, while the metadata-only
index of all 438 PDF pages remains available at
[`docs/price_action_page_index.json`](docs/price_action_page_index.json). Use
`node scripts/price-action-source-index.mjs --help` to query the existing local
OCR by terms, chapter, printed/PDF page or figure mention without extracting the
book again. Geometry proxies and source-only notes remain distinct.
