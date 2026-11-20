# QUANTSMART AI session state

## Session 68 read-first checkpoint: backend detector queue boundary (2026-11-20)

Focused XAUUSD M5 price-action detection now uses the local backend research
queue first. The lightweight client polls the job, cancels it on cleanup,
validates the versioned schema and receipt metadata, and exposes only the
backend result to the chart. The browser worker remains an explicit
compatibility fallback for unavailable transport and legacy non-XAUUSD views.
Backend validation now rejects zero-range OHLC rows before queueing.

The focused startup graph still excludes the legacy `researchJobs.ts` module.
Backend-client receipt, worker lifecycle, queue, lazy-startup and typecheck
checks pass. PDF all-signal coverage, PDF statistics and inspector source
translation remain separate backend migration slices. Authority remains
`SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

## Session 67 read-first checkpoint: chart-only interaction and copy correction (2026-11-20)

The focused chart-only session preference now preserves explicit context mode
and the compact localized context toggle remains clickable below the shell
header. The mobile focused chart suppresses its duplicate outer OHLC legend,
while the SVG legend remains available inside the chart.

Chart accessibility copy no longer repeats the research-landmark heading and
uses Vietnamese forming/latest endpoint wording. Targeted chart-only,
accessibility, live-copy, research-line, typecheck and browser checks pass.
The authority remains `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

## Session 66 chart-first UI and startup cleanup (2026-11-20)

Focused home now opens as a reversible chart-only XAUUSD M5 surface. The
versioned session preference (`mfe_focused_chart_only_v1`) and Alt+C control
expose localized pressed and keyboard semantics, responsive phone sizing and a
stable chart viewport. Focused startup opens at the newest retained closed
candle, permits TradingView-style fractional pan with a bounded right rail and
keeps detector/provenance/status bands out of the chart-first viewport. PDF
coverage and statistics panels remain available from context mode or marker
inspection, while clicking or keyboard-selecting a signal opens its detailed
inspector.

The marker layer now uses stronger direction contrast, larger hit targets,
edge-safe labels and a separate outcome halo. EN/VI chart copy remains
localized and the focused surface retains `SHADOW_ONLY / NO_DECISION /
live_apply_allowed=false` with closed-bar-only evidence.

Focused chart-only, viewport, pan, latest-navigation, interaction, marker,
accessibility, toolbar, visible-copy, typecheck and production-build checks
pass. The production build retains the existing large-chunk warning.

Detector, verification and statistics backend-worker migration is still
pending. Browser workers remain compatibility paths until each hook has a
backend result contract and parity receipt. Do not claim backend-only compute
completion from this UI wave.

## Session 65 read-first checkpoint (2026-11-20)

The durable M5 store now accepts validated range-history rows with
`tick_volume` and `spread`, and restart recovery returns a contiguous rebased
tail. The focused `/bars?refresh=...` request bypasses the three-second bridge
cache, preventing an older in-process tail from masking a newly closed candle.
The restarted Exness-MT5Real39 scope contains 602 XAUUSD M5 rows through
`2026-11-20T04:00:00Z`; SQLite integrity check passes. Bridge/store tests pass
72/72 with `.venv-mfe`, and the focused refresh/viewport checks pass.

User requirement for the next wave: frontend is display-only. Move all detector,
verification and statistics computation into the backend worker queue and keep
the frontend responsible for rendering, interaction and versioned result
receipts. Browser workers are still present as a compatibility path until each
hook is migrated and its backend parity is verified.

## Session 64 read-first checkpoint (2026-11-20)

The browser user agent verified the focused XAUUSD M5 surface in a visible foreground tab during the long statistics scan. Actual Orca interactions kept Reset, PageUp, EN/VI, detector-row selection and replay usable. Inspector DOM latency for three real selections was 505.6 ms, 555.0 ms and 587.4 ms, median 555.0 ms. Selected anchors and OHLC were checked against the read-only MT5 feed at their exact UTC identities. This endpoint is DOM mutation, not paint.

The same pass reproduced a startup state where the visible chart ended at an older candle while MT5 history was still loading. `bridge/closed_candle_store.py` adds an account/server/broker-symbol/timezone-scoped SQLite store at `.mfe-state/closed-candles.sqlite3`, created on the first successful write, with `MFE_CLOSED_CANDLES_DB` as an override. It accepts only validated XAUUSD M5 closed-bar payloads, writes atomically, deduplicates by UTC candle identity and returns a bounded recent tail. `bridge/mt5_bridge.py` persists successful closed reads and uses the store only as a connected no-row fallback. `Microscope.tsx` requests the closed MT5 tail during full-history promotion and leaves the labelled local snapshot available until the verified multi-year history is promoted.

The statistics panel distinguishes invalid/forming/off-grid/OHLC data from a completed census and does not show a misleading all-zero table. Detector optimization was retained only after exact equivalence checks across statistics progress and detector receipts. No material scan speedup is claimed. The browser user agent found no new authority or future-row leakage. Replay, hover and source copy use readable English/Vietnamese labels.

Completed checks include the SQLite store (including override-path and first-write creation) and dependency-free bridge tests, targeted statistics/panel/hover/replay tests, cockpit typecheck and production build. The current running bridge process predates the SQLite integration and needs one restart before the durable fallback is active.

## Session 63 statistics progress and accessibility copy (2026-11-20)

The PDF statistics worker now emits bounded processed/total progress checkpoints
through the hook. The panel combines the checkpoint with elapsed time in EN/VI,
so a long scan exposes truthful work completed without sampling or shortening
the retained causal census. Marker and simulated-trade aria labels now use
readable Vietnamese copy. Full unit (`UNIT_EXIT=0`), targeted statistics,
lifecycle, panel, marker, footer, typecheck and production build checks pass.
The scan remains CPU-bound on the
141,598-bar tape and preserves `SHADOW_ONLY / NO_DECISION /
live_apply_allowed=false`.

## Session 62 end-user performance, locale and connection follow-up (2026-11-20)

The browser end-user pass rechecked the production chart after the marker and
copy changes. Three overlapping annotations on one candle were individually
selectable by pointer, and chart pan remained isolated from marker clicks. The
23-concept statistics worker reports elapsed seconds in English and Vietnamese
while the chart remains interactive. On the 141,598-bar retained tape the scan
was still pending after more than four minutes, which remains a performance
follow-up rather than a detector-authority change.

The focused chart now decodes Vietnamese session labels and localizes Magnet,
Lock and Clear controls. Connection status localizes account, health,
Auto-Attach, dialog and failure surfaces with locale-aware amount formatting.
The marker source keeps roving keyboard focus and descriptive button semantics.
All changes preserve closed-bar-only detector inputs and
`SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

Validation passed the full unit lane, cockpit typecheck, production build,
marker focus, bilingual shelf, focused copy/mojibake, Wave 48 runtime and
connection UI/accessibility tests after the final marker attribute ordering
update.

## Session 61 marker hit-testing and detector copy follow-up (2026-11-20)

The chart now keeps non-selectable SVG layers out of pointer hit testing and
gives detector and shadow-trade marker groups explicit pointer ownership. Marker
pointer-down stops before the chart pan handler, so a rectangle, grid, zone or
projection cannot steal a detector click. Vietnamese marker accessibility copy
was repaired for the saved-candle and research-annotation labels while UP,
DOWN, NEUTRAL and source-only authority remain stable.

Marker overlap, interaction, pan, accessibility, focused-copy and Wave 48
bilingual audits pass. Cockpit typecheck and `git diff --check` pass. Preserve
the elapsed statistics status and the `SHADOW_ONLY / NO_DECISION /
live_apply_allowed=false` boundary.

## Session 60 browser UX accuracy and readable-copy hardening (2026-11-20)

The browser end-user agent verified the focused XAUUSD M5 surface directly.
Interaction remained responsive during the long 23-concept statistics scan, and
EN/VI switching translated the chart and PDF shelf. The scan still needs an
elapsed indicator for a 141,598-bar retained tape. A historical marker can be
covered by a selectable rectangle on pointer input, so keyboard focus plus Enter
remains the dependable inspection path until hit-test layering is narrowed.

This pass added explicit episode direction labels, removed malformed trade and
strategy glyphs, localized the mobile candle/EMA legend, and changed MT5 status
copy to readable ellipsis/checking text. No detector inputs, denominators,
outcomes, order authority or source-only boundaries changed.

Validation completed with full unit tests, cockpit typecheck, production build,
bridge tests (`98/98`), focused copy/mojibake tests, Wave 48 bilingual surface
audit and `git diff --check`. Preserve
`SHADOW_ONLY / NO_DECISION / live_apply_allowed=false` and keep the pointer-hit
race and long scan progress as the next browser follow-up items.

## Session 59 browser end-user performance and accuracy follow-up (2026-11-20)

The independent browser user agent exercised the local XAUUSD M5 surface through
Reset, PageUp, End, keyboard and wheel zoom, drag-pan, EN/VI switching, live-feed
status and marker inspection. Ten synthetic wheel events dispatched in about
0.5 ms and the chart stayed interactive during the long statistics scan. Reload
still leaves the 23-concept statistics worker on a static scanning message for
more than 50 seconds over 141,598 retained closed bars. The statistics hook now
reports elapsed loading time to the panel so a slow scan is visible without
changing detector inputs, denominators or authority. Shift+wheel now pans the
retained tape without changing zoom width.

One historical marker click was rejected once because a chart rectangle covered
the pointer target. Keyboard focus plus Enter opened the same inspector. Broker
and research overlays remain pointer-transparent where they are not selectable.
The focused chart restored a locale-aware copy map for empty states, toolbar,
footer, sessions and chart accessibility descriptions. Preserve
`SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`, closed-bar-only detector
inputs and source-outcome withholding.

## Session 58 browser end-user performance and locale verification (2026-11-20)

The browser end-user stress pass measured wheel zoom and drag-pan at roughly
7 ms median with no runtime exceptions. A reset from an old viewport briefly
rendered only two bars before the recent 179-bar window returned. Reload and
Reset now restore the full recent window, and the browser snapshot confirms
141,598 retained closed XAUUSD M5 bars. Research landmark, broker evidence and
focus overlays use `pointer-events="none"` so they cannot intercept detector
marker selection. The focused surface switches EN/VI visibly, including the
23-concept PDF shelf and current pattern explanations.

The browser still reports a Vite Fast Refresh warning for
`microChartDrawingSelection`. This is a development-tool warning with no
observed runtime exception. Technical authority tokens remain explicit,
including `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

Validation for this checkpoint passed `npm run test:unit` (`UNIT_EXIT=0`),
cockpit typecheck, cockpit production build, bridge suite (`98/98`), and
`git diff --check`. The unit lane also caught and fixed a malformed replay JSX
label and updated locale-sensitive assertions for forecast gates and marker
provenance. Remaining follow-up is to remove or suppress the Fast Refresh
warning and remeasure the reset transition under a cold browser reload.

## Session 57 statistics worker stability and runtime verification (2026-11-19)

The focused PDF statistics worker no longer restarts on the 30-second focused
clock refresh. The census reruns when the retained bar tape or enabled state
changes, so a long all-23-concept scan can finish instead of being cancelled
by an unrelated age/readout update. The lifecycle regression and cockpit
typecheck pass. Browser verification reached the rendered 23-concept table,
then confirmed English/Vietnamese switching, live BID/ASK and the forming-bar
disclosure. Authority remains
`SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

Full unit tests passed with `UNIT_EXIT=0`, cockpit production build passed,
bridge tests passed `98/98`, and documentation/registration checks passed.

The fresh verifier receipt contains 5,000 closed XAUUSD M5 bars through
`2026-11-19T14:45:00Z` and was retrieved at `2026-11-19T14:53:31Z`. The neutral receipt records 6 detected, 10 abstain, 5 unavailable and 2 withheld observations.
The directional `UP` and `DOWN` cases each record 9 detected, 10 abstain, 4
unavailable and 0 withheld. Census accounting is 8 warm-up, 4,973 evaluated,
18 skipped session-gap and 1 terminal row. Deterministic repeat, future-row
invariance and per-concept reconciliation pass.

## Session 56 runtime and viewport verification (2026-11-19)

Fresh loopback probes returned healthy read-only MT5 data for account
`268115110 / Exness-MT5Real39`, broker kind `REAL`, with `trade_allowed=false`.
The XAUUSD M5 bars endpoint returned closed bars through `2026-11-19T14:00:00Z`.
`live_bundle` exposed a separate forming bar at `14:05:00Z`, and the proxied SSE
stream returned a real ordered XAUUSD/M5 tick. Temporary stream cleanup changed
the bridge count `6 -> 7 -> 6`, with a configured limit of 16. All authority
flags remained `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

The embedded Orca browser rendered the live forming context, current closed-bar
status, 23-concept PDF shelf and bilingual controls. Clicking Reset moved the
chart from the persisted historical viewport to the latest retained bars. The
saved historical viewport is intentionally preserved until Reset or an explicit
navigation action, while a tail-pinned live view follows new rows. This is
covered by the viewport persistence and re-anchor tests. Empty annotation and
drawing-visibility announcements now also follow the active EN/VI locale.

## Session 55 background realtime feed (2026-11-19)

Runtime inspection showed the focused chart's read-only SSE state as `Ticks
paused` whenever the page was backgrounded. `liveTickFeed.ts` now keeps the
subscription connected across `visibilitychange`; it still retires the source
on unmount, generation reset or no listeners, and the bridge's bounded stream
limit remains the resource guard. The new regression
`tests/live-tick-feed-background.test.mjs` passes alongside the generation-race,
focused-chart and forming-detection contracts. Cockpit typecheck passes.

This is a presentation/runtime freshness fix only. Closed-bar promotion,
detector/statistics inputs and `SHADOW_ONLY / NO_DECISION /
live_apply_allowed=false` are unchanged. The embedded Orca browser remains
`document.visibilityState=hidden`, so its own accessibility snapshot may still
show paused/stale presentation even though the source no longer intentionally
pauses background tabs. A visible browser tab is required for fresh visual QA.

## Session 54 bridge stream capacity and runtime verification (2026-11-19)

The bridge had reached its previous concurrent SSE stream ceiling during
runtime inspection. `bridge/mt5_bridge.py` now reads the bounded
`MFE_MAX_TICK_STREAMS` setting, defaults to 16, clamps the value to 64 and
reports both `active_tick_streams` and `tick_stream_limit` from `/health`.
`bridge/tests/test_mt5_bridge.py` covers the health contract and configuration
clamp. The full isolated bridge lane passes 98/98 tests.

The running local services were rechecked at `127.0.0.1:5090` and
`127.0.0.1:8791`. The broker reports account `268115110`, server
`Exness-MT5Real39`, kind `REAL`, `trade_allowed=false`, and read-only authority.
`/api/mt5/bars` serves canonical closed XAUUSD M5 rows, `live_bundle` carries a
separate forming-bar object, and the proxied SSE stream returns an ordered real
tick packet. The endpoint probes require the frontend same-origin proxy, while
direct bridge requests correctly require its local session token.

No fresh native browser screenshot was obtained because the CUA native pipe is
unavailable in this environment. Do not claim visual screenshot evidence for
this session. Preserve `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`
and keep source-only PDF outcomes, fills, orders and profitability withheld.

## Session 53 live bundle and fresh real-feed verification (2026-11-19)

The loopback runtime was rechecked. `/api/mt5/live_bundle` returns a closed
XAUUSD M5 tape and a separate `MT5_FORMING_BAR` object. `/api/mt5/history` keeps
the research tape closed-only and reports `PARTIAL` for the still-open current
day instead of promoting incomplete coverage. The real verifier was rerun on
5,000 closed bars through `2026-11-19T13:20:00Z`. All 23 concepts reconcile with
4 detected, 12 abstain, 5 unavailable and 2 withheld neutral observations,
deterministic repeat, and future-row invariance. No PDF narrative figure was
converted into XAUUSD OHLC, fills, outcomes or order authority.

## Session 52 PDF statistics worker lifecycle (2026-11-19)

The PDF statistics hook now invalidates stale generations on cleanup, clears
`onmessage`, `onerror` and `onmessageerror` before termination, handles worker
message errors, and converts constructor or `postMessage` failures to an
explicit error state. `tests/pdf-signal-statistics-hook-lifecycle.test.mjs` is
registered in the full unit runner. No detector, denominator, outcome or
authority semantics changed.

## Session 51 named-candle locale coverage (2026-11-19)

The focused analogue inspector now routes current named-candle group labels,
pattern and family filters, the `All` action, dynamic accessible names,
empty-state copy and retained-endpoint fallback text through the active EN/VI
locale. `tests/focused-named-candle-locale.test.mjs` is part of the full unit
runner. No detector, statistic, outcome or authority semantics changed.

## Session 50 live-feed race and mobile statistics readability (2026-11-19)

`liveTickFeed.ts` now guards every SSE callback by source identity and listener
ownership. Cleanup and reset retire `entry.source` before calling `close()`, so
late queued packets cannot repaint a reused slot or cross a terminal generation.
Regression `tests/live-tick-feed-generation-race.test.mjs` is registered in the
full unit lane. `PdfSignalStatisticsPanel` imports a dedicated stylesheet that
keeps table and provenance copy readable on phone widths, wraps long bilingual
labels and preserves source-status disclosure inside concept cells. Targeted
tests, typecheck, language audit and diff checks pass. Authority remains
`SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

## Session 49 responsiveness fix (2026-11-19)

The focused chart previously ran synchronous PDF detection and verification on
the full two-year M5 tape after MT5 promotion, which could freeze the browser
while the chart was still marked as verifying. `Microscope` now keeps the full
retained tape for the worker-backed census, statistics and replay paths while
the interactive PDF marker/receipt path uses the latest 6,000 closed bars. The
current marker index is translated back to the full tape so chart navigation
retains UTC identity.

Validation passed with the full unit lane, cockpit typecheck, strict language
audit, production build and `git diff --check`. Fresh browser inspection shows
the chart rendered with 141,598 closed XAUUSD M5 bars, current MT5 closed-bar
heartbeat, live BID/ASK and forming-candle disclosure. Authority remains
`SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

This file is the handoff point for the next engineering session. Read it before
changing the product surface. Start with [PROJECT_STATUS.md](PROJECT_STATUS.md)
for the requirement/evidence ledger and unresolved scope. Chronological entries
below describe completed increments; they do not prove the full goal complete.

User workflow preference: each working session should assign 10-15 independent agents, each with a distinct task. Run them in waves within the available concurrency limit, then integrate and validate their results.

## Read-first current checkpoint (2026-11-19)

Session 57 is the latest integrated continuation. The unified PDF
detector still covers all 23 concepts on XAUUSD M5, with 13 geometry proxies
and 10 source-note descriptors. The latest read-only MT5 receipt evaluates 5,000
closed bars through `2026-11-19T14:45:00Z` and records 6 detected, 10 abstain,
5 unavailable and 2 withheld observations for the neutral case. Its directional
`UP` and `DOWN` cases each record 9 detected, 10 abstain, 4 unavailable and 0
withheld observations.
The historical census accounts for 8 warm-up rows, 4,973 evaluated rows,
18 skipped session-gap rows and 1 terminal row without an H+1 candle.
Verification rejects bars that close after the retrieval clock,
retains closed-bar provenance, and preserves deterministic repeat plus
future-row invariance. The real-feed verifier now runs all 23 concepts under
`NEUTRAL`, `UP` and `DOWN` contexts, recording a complete directional state
matrix. The detector verifier rejects overridden feeds whose symbol or
timeframe is not XAUUSD/M5. The NEWS identity path now requires an explicit
validated `observedThrough` boundary for events after the selected candle.

The focused read-only SSE stream now remains subscribed while the browser tab
is backgrounded, and the bridge stream-capacity contract passes 98/98 isolated
tests. Independent holdout readiness remains `NOT_READY`; source-only
outcomes, fills, orders and live decisions remain withheld under
`SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

The current local runtime is reachable at `http://127.0.0.1:5090/` with the
read-only bridge enabled. The supplied Exness server `Exness-MT5Real39` reports
account `268115110` as `REAL`, not demo. The latest verifier receipt carries
verified XAUUSD M5 closed bars through `2026-11-19T14:45:00Z`. No order or
live-apply authority is enabled, and the bridge reports `trade_allowed=false`.

## Session 49 quality hardening (2026-11-19)

The focused chart now routes source-coverage metadata, forecast evidence,
named-candle evidence, pattern census explanations and pattern-window copy
through the English/Vietnamese locale contract. MicroChart footer labels,
keyboard help, visible session names, marker announcements and trade
annotations also follow the selected locale. The MT5 launcher now starts the
standalone bridge correctly on Windows when its package-relative imports are
invoked as scripts.

The PDF census receipt exposes explicit warm-up and terminal accounting,
clarifies `evaluated = DETECTED + ABSTAIN`, and preserves source-note outcome
withholding. The verifier rejects malformed payload age values and
non-canonical UTC timestamps before accepting a real XAUUSD M5 receipt.

Current receipts and regressions include
`artifacts/real-xauusd-m5-pdf-signal-verification.json`,
`artifacts/session45-pdf-detector-surface-audit.json`,
`artifacts/session46-browser-locale-pdf-receipt.json`,
`tests/session45-pdf-detector-surface-audit.test.mjs`,
`tests/session46-browser-locale-pdf-receipt.test.mjs`,
`tests/realtime-pdf-causal-boundary-audit.test.mjs`,
`tests/pdf-signal-verification.test.mjs`,
`tests/session47-documentation-consistency.test.mjs` and the bilingual
shelf/live-copy regressions. The strict language audit now reports zero remaining hits across
378 shipped files. A future duplicate outside the selected causal prefix is
ignored while duplicate selected identity remains fail-closed, covered by
`tests/pdf-signal-translation-future-duplicate.test.mjs`. Mobile knowledge
metadata now wraps at phone widths, and the live BID/ASK strip has localized
accessible labels. Continue from the remaining independent-label/holdout and
separately specified execution-model boundary.

The unified detector now falls back to the bounded local adverse-extreme
descriptor for `resistance_exit` when no validated external resistance event
is supplied. Explicit event identities still take precedence. This reconciles
the unified path with the six safe closed-OHLC source-note descriptors without
creating an exit decision or outcome. The focused PDF shelf and translation
evidence also localize previously uncovered dynamic detector reasons in both
languages.

Session 47 quality hardening then added strict UTC-alias and timeframe checks,
calendar revalidation, and fail-closed external event handling. Ambiguous
two-sided level tests now abstain rather than selecting a direction. The PDF
shelf and translation evidence retain native button semantics and complete
English/Vietnamese status copy. Drawing re-anchoring uses binary search on the
retained tape, with no per-refresh full-tape timestamp map. New receipts and
regressions are `artifacts/wave4-pdf-detector-contract-audit.json`,
`artifacts/wave4-pdf-external-contract-audit.json`,
`artifacts/wave5-pdf-source-map-coverage-audit.json`,
`artifacts/session47-browser-runtime-contract-audit.json`, and
`tests/session47-documentation-consistency.test.mjs`. Full unit, typecheck,
build and real XAUUSD PDF verification pass. Preserve the existing
`SHADOW_ONLY / NO_DECISION / live_apply_allowed=false` boundary.

## Wave 29 PDF input and assumptions surface (2026-11-19)

The focused `PdfAssumptionsPanel` now collects explicit user-supplied
quote-price bracket, sizing and reversal identities in both locales. `Microscope`
passes only complete groups into the unified detector and verification receipt,
while blank values remain unavailable. The source-note input contract rejects
non-positive bracket prices and non-finite derived risk or lot calculations.
Regressions are `tests/pdf-assumptions-panel.test.mjs` and
`tests/wave29-source-note-input-contract.test.mjs`. Authority remains
`SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

## Wave 12 handoff update (2026-11-19)

The ten source-note concepts and thirteen geometry proxies now share the
`detectAllPdfSignals` observation path for all 23 PDF concepts on XAUUSD M5.
The focused source-note panel reads the unified descriptors, preventing state
and reason drift from the legacy translation aggregate. Selected-prefix
identity is strict. Missing selections fail closed, canonical UTC aliases
match by instant, and future rows are withheld. Regressions are
`tests/wave12-source-note-ui-parity.test.mjs` and
`tests/wave12-pdf-selected-prefix-identity.test.mjs`. Keep
`SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`. Source-note
observations remain descriptive and cannot become source-qualified outcomes,
fills or orders without independent labels and an execution model.

Wave 13 source audit also verifies the 23-concept map, detector IDs, page
anchors, 36 source lenses/fixtures, bilingual source-note copy and explicit
withheld outcome/future-row status. Its receipt is
`artifacts/wave13-pdf-source-concept-audit.json` with regression
`tests/wave13-pdf-source-concept-audit.test.mjs`, registered in the unit lane.
`tests/wave13-pdf-detector-contract.test.mjs` also covers wrong-symbol and
duplicate-identity fail-closed behavior across the full concept set.

## Session 30 handoff (read first; 2026-11-19)

The current user direction is to implement missing PDF-derived ideas in a
controlled sequence, standardize visible copy and add English/Vietnamese
switching. `docs/FEATURE_IMPLEMENTATION_PLAN.md` defines the order and gates.
Session 30 audits found 13 geometry proxies and 10 source-only concepts. The
source-only concepts retain linked lenses and held-out
`SOURCE_REVIEW_ONLY / UNAVAILABLE / WITHHELD` fixtures. Reliability wording now
requires a fresh runtime receipt for current forecast claims. The bridge runtime
audit confirms hidden loopback startup is feasible, but a separately started
frontend must share the launcher token to reach the bridge.

Remaining scope starts with bilingual focused-surface copy and source-lens
navigation, then independently labelled XAUUSD M5 holdout intake. Only after
that intake can obstacle/failure, consecutive/low-volatility, sizing/cost and
manual/news/reversal studies be evaluated. Keep
`SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`; do not promote PDF
narrative figures to OHLC, fills, rates or orders.

## Session 31 handoff update (2026-11-19)

The locale foundation is integrated at the application root. English is the
safe fallback for isolated component tests, while the shell persists the
English/Vietnamese selection locally and exposes an accessible toggle. Source
notes now provide complete Vietnamese presentation copy for all 10
`SOURCE_NOTES` concepts, with the English wording and printed/PDF anchors still
available. The source status contract remains
`SOURCE_REVIEW_ONLY / data UNAVAILABLE / outcome WITHHELD`.

The holdout validator now requires a locked, distinct
TRAIN/VALIDATION/HOLDOUT partition identity and independent closed-M5 label
provenance with `pdf_illustrations_used=false`. Duplicate, missing, off-grid,
forming and future rows fail closed. Receipt tests are registered in both unit
lanes. Next work should implement only causal-prefix observational context,
starting with obstacle room and failure-selection review. Preserve
`SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

## Session 46 browser checkpoint (2026-11-19)

The local focused runtime is reachable through the Orca embedded browser. A
direct DOM observation confirms the locale transition from Vietnamese to
English, including `document.documentElement.lang`, the locale control text,
the chart accessibility label and the 23-tile PDF shelf. Receipt:
`artifacts/session46-browser-locale-pdf-receipt.json`; regression:
`tests/session46-browser-locale-pdf-receipt.test.mjs`. This is historical/local
runtime evidence and carries no live-market claim.

## Session 36 PDF all-signal XAUUSD translation wave (2026-11-19)

`pdfSignalDetector.ts` now evaluates all 23 PDF concepts against one selected
closed XAUUSD M5 prefix. Existing detector geometry remains separate from the
ten source-note translations. `sourceNoteDetectors.ts` and
`sourceNotesDetectors.ts` validate contiguous closed prefixes, ignore future
rows, and expose descriptive event, room, volatility, review and quote-price
observations. The focused chart exposes all 23 concepts through the inspectable
read-only PDF coverage shelf and a 23-concept status count. Only the 13 geometry assessments
contribute chart markers. The ten source-note descriptors remain shelf and
inspector observations.

The implementation keeps PDF narrative examples out of XAUUSD OHLC and keeps
source labels, measured outcomes, fills, orders and execution authority
withheld. All receipts retain `SOURCE_REVIEW_ONLY` where applicable and
`SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`. Targeted Wave 8 tests,
Wave 6/7 translation tests and cockpit typecheck pass. Next verification is a
full unit lane and live-browser check on a fresh verified MT5 closed-bar tape.

## Session 33 real XAUUSD M5 detector verification (2026-11-19)

The full detector was exercised against 5,000 real MT5 XAUUSD M5 bars from the
local Exness bridge. The receipt confirms `MT5_CLOSED_BARS`, UTC timestamps, no
forming bar, strict ordering and 4,981 contiguous M5 transitions with 18
session-gap transitions withheld from historical evaluation. All 13 concepts
were evaluated through the public detector and evidence scan. The run found
three current markers and retained per-concept occurrence histories. A second
identical run matched byte-for-byte, and appending a future-mutated bar left
all prior setup structures unchanged.

Receipt: `artifacts/real-xauusd-m5-detector-verification.json`; reproducible
command: `npm run verify:real-detectors`; regression:
`tests/real-xauusd-detector-verification.test.mjs`. This is a read-only runtime
observation, not an accuracy or profitability claim. All detector evidence
remains `SHADOW_ONLY / NO_DECISION` with `live_apply_allowed=false`.

The same lane exposed a derived `patternPullbackPressure` test that still
treated a uniformly shifted but evenly spaced tape as valid. The regression now
requires UTC-grid identity for both the direct observer and pressure receipt.

## Session 34 PDF signal translation and coverage UI (2026-11-19)

All ten previously source-only PDF concepts now have a bounded XAUUSD M5
translation receipt. Six expose local closed-prefix geometry when the required
direction and context exist. `bracket_costs`, `news_exit` and
`position_sizing` remain explicitly unavailable without external execution or
user assumptions. `reversal_exit` remains withheld without a validated event or
trade label. Every descriptor keeps source pages, future-row withholding,
outcome withholding and `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

Receipt: `artifacts/wave6-pdf-signal-translation.json`; regression:
`tests/wave6-pdf-signal-translation.test.mjs`.

The focused PDF panel now shows all 23 concepts as 13 local geometry proxies
and 10 source-note translations with bilingual scope badges and responsive
XAUUSD M5 coverage copy. Receipt: `artifacts/wave6-pdf-signal-ui-audit.json`;
regression: `tests/wave6-pdf-signal-ui-audit.test.mjs`.

The selected pattern inspector now renders the ten translation descriptors
directly beside the chart evidence, so source-note coverage is visible at the
same XAUUSD M5 occurrence rather than only in the book index. The real-data
receipt also persists current marker geometry and the quality audit verifies
each marker against its source OHLC row. Keep the distinction between local
descriptive geometry and source/execution evidence explicit in future waves.

## Session 35 complete PDF-to-XAUUSD observation pass (2026-11-19)

The focused chart now presents all 23 PDF concepts on the XAUUSD M5 surface.
The 13 deterministic geometry proxies remain available through the public
closed-bar detector. The ten previously source-only concepts now have a unified
translation receipt that evaluates bounded causal-prefix geometry when the
required closed data exists and otherwise reports an explicit unavailable or
withheld state. Optional quote-price bracket assumptions, calendar identities,
adverse-event identities and sizing inputs remain descriptive inputs only.

Wave 7 adds bilingual, semantic and mobile-readable rendering for every one of
the ten translation cards, including visible `SOURCE_REVIEW_ONLY`, data status,
outcome withholding and the full `SHADOW_ONLY / NO_DECISION /
live_apply_allowed=false` authority boundary. The refreshed live receipt runs
twice against MT5 and reconciles up to 5,000 closed XAUUSD M5 bars, three current
markers, marker-to-OHLC geometry and stable per-concept denominators.

Regressions are `tests/wave6-pdf-signal-translation.test.mjs`,
`tests/wave6-pdf-signal-ui-audit.test.mjs`,
`tests/wave6-real-detector-quality.test.mjs`,
`tests/wave7-pdf-signal-inputs.test.mjs`,
`tests/wave7-pdf-translation-accessibility.test.mjs` and
`tests/wave7-real-receipt-refresh.test.mjs`. The full `npm run test:unit`
lane and cockpit production build pass. This completes PDF idea translation at
the observation layer. It does not create PDF-derived XAUUSD OHLC labels,
fills, orders, rates, accuracy claims or live-apply authority.

## Session 32 handoff update (2026-11-19)

The obstacle-room and failure-selection waves now expose separate bounded
causal-prefix receipts. They retain source-only status, unavailable data or
withheld outcomes where evidence is insufficient, and never read future rows.
The responsive locale audit keeps English/Vietnamese switching reachable at
320px and 390px with zero horizontal overflow.

The MT5 SSE path now validates symbol/timeframe and account-generation identity,
updates the visible forming M5 candle and lightweight indicator tail from
validated ticks, and shows `PROVISIONAL`, `STALE` or `WAIT` current-candle
detection. Closed-bar markers, statistics and forecast gates remain unchanged
until the M5 candle closes. Bridge tests cover malformed tick rows, cursor
resets, forming/closed rollover and read-only authority. Focused typecheck,
production build, full unit lane and managed bridge checks pass. Continue with
the next planned observational study, while preserving
`SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

## Session 32 Wave 4 continuation (read first; 2026-11-19)

The focused header now shows an explicit `EN / VI` language control. The PDF
knowledge panel localizes its coverage, search, relationship, setup-family,
provenance and accessibility copy while preserving source and authority
identifiers. Browser QA confirms the control at 320px, 390px and desktop
widths. A scoped mobile rule reserves a 200px plot and bounds realtime receipts
with independent scrolling. Receipt:
`artifacts/session32-wave4-realtime-mobile-qa.json`.

## Session 32 Phase 3 continuation (read first; 2026-11-19)

The next Phase 3 increments are bounded observational receipts. The local
low-volatility/consecutive-review descriptor now reports a canonical selected
closed-prefix identity, its 48-bar baseline and 12-bar recent median-range
comparison, explicit future-row withholding, local-data status and withheld
outcomes. Invalid, forming, off-grid, gapped and insufficient prefixes remain
unavailable. Source pages stay `SOURCE_REVIEW_ONLY` with unavailable data and
withheld outcomes. Receipt: `artifacts/session32-low-volatility-observational-audit.json`;
tests: `tests/pattern-low-volatility-context.test.mjs`,
`tests/pattern-low-volatility-evidence.test.mjs` and
`tests/pattern-low-volatility-causal-prefix-observability.test.mjs`.

Sizing and bracket-cost work stops at an explicit assumptions shape in
`docs/PHASE3_SIZING_COST_ASSUMPTIONS_RECEIPT.json`. It records provisional
percent-equity sizing, spread, commission, slippage and swap fields in
quote-price units. It does not assert that a caller supplied those values and
does not produce bracket results, fills, orders, rates or outcomes. PDF EUR/USD
pip examples are not translated to XAUUSD distances. Regression:
`tests/phase3-sizing-cost-assumptions-receipt.test.mjs`.

News, resistance and reversal work exposes only event identities from a
validated calendar timestamp, supplied structural level touch or supplied
adverse close break. The identity builder ignores rows after `observedThrough`
and fails closed for malformed, duplicate, off-grid, forming or gapped
prefixes. A valid prefix without an observed event remains withheld. Receipt:
`artifacts/phase3-exit-event-identity-audit.json`; regression:
`tests/pattern-exit-event-identity.test.mjs`.

The real-time browser receipt records validated MT5 SSE ticks updating a
forming XAUUSD M5 candle at 1440x900 and 390x844 with zero horizontal overflow
and `PROVISIONAL` detection. Closed-bar markers, statistics and forecast gates
remain unchanged. Receipt: `artifacts/session32-browser-realtime-receipt.json`;
regression: `tests/session32-browser-realtime-receipt.test.mjs`.

The post-integration full unit lane, strict language audit, cockpit typecheck,
production build and managed bridge suite pass. Preserve
`SHADOW_ONLY / NO_DECISION / live_apply_allowed=false` and do not promote any
receipt into detector, denominator, rate, OHLC, fill, order or execution
authority. Next work is independent holdout readiness and a separately
specified execution-model boundary. Do not expose fill-like output while the
holdout, denominator and intrabar/spread/slippage definitions remain
unspecified.

## Session 19 checkpoint (read first; 2026-11-18)

Session 19 completed twelve bounded tasks in four waves covering reconnect
hardening, source-gap review, focused startup/lazy loading, legacy cleanup,
inspector accessibility, worker lifecycle, retention identity, runtime evidence,
documentation and integration checks. Automatic reconnect now permits only the
transient `TERMINAL_DISCONNECTED` and `ACCOUNT_UNAVAILABLE` cases within the
existing three-attempt 20/40-second budget. Focused startup remains chart-first
and lazy-loads legacy research and knowledge modules. The source audit keeps
`trade_selection_failure` source-only with `SOURCE_REVIEW_ONLY`, `UNAVAILABLE`
and `WITHHELD` evidence. Accessibility and worker lifecycle audits pass without
fixes. Retention promotion now validates every supplied row for canonical UTC,
M5 alignment, unique identity, finite OHLC and high/low geometry. The orphan
`BeastBuilderPanel.tsx` wrapper was removed after reachability analysis while
shared Beast services remain.

Receipts are `artifacts/wave1-source-gap-audit.json`,
`artifacts/wave2-accessibility-audit.json`,
`artifacts/session19-runtime-startup-audit.json`,
`artifacts/session19-worker-lifecycle-audit.json`,
`artifacts/session19-browser-runtime-evidence-audit.json`,
`artifacts/wave3-retention-identity-audit.json` and
`artifacts/session19-legacy-beast-builder-audit.json`. The browser/runtime
receipt explicitly records an unavailable browser host and no fresh live-market
claim. The latest non-empty full-lane receipts are
`artifacts/session19-final-unit.log` and `artifacts/session19-final-build.log`.
`artifacts/session20-final-unit.log` is a partial rerun with no verified final
status and must not be treated as a passing verification. Rerun the complete
unit lane after parent integration. The focused authority remains
`SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

## Session 27 legacy release-manifest reachability audit checkpoint (2026-11-18)

The bounded legacy reachability audit found no dead page or component leaves in
the current supported route graph. The focused Microscope eager graph remains
chart-first, with legacy research and knowledge modules behind lazy boundaries.
The tracked historical `RELEASE_MANIFEST.json` retains 20 stale paths for
retired wrappers, routes, shell files and tests. That generated artifact stays
unchanged. Fresh release roots continue to come from the current import graph
and explicit public roots in `scripts/package-release.mjs`. Receipt:
`artifacts/session27-legacy-release-manifest-audit.json`; regression:
`tests/session27-legacy-release-manifest-audit.test.mjs`. No route, detector,
retained data, occurrence, count, denominator, rate, fill, order or authority
change is claimed. Preserve `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

## Session 28 statistics and causality audit checkpoint (2026-11-19)

The statistics audit found and fixed one concrete denominator inconsistency.
`priceActionDetector` previously accepted zero-range OHLC rows
(`high === low`) while the selected context census and target/obstacle studies
already rejected them. Those degenerate rows could therefore enter historical
detector evaluation and H+1 occurrence denominators. The shared detector bar
validator now requires `high > low`, and the existing detector contract plus
`tests/session28-statistics-causality-audit.test.mjs` prove fail-closed behavior.

The focused audit also rechecked selected-occurrence H+1 direction, preserving
FLAT in the denominator and refusing future OHLC reads, technical obstacle
first-touch rates that exclude unresolved rows, and identity-only causal replay
that carries no retrospective statistics or unrevealed prices. Obstacle-room
source material remains `SOURCE_REVIEW_ONLY / UNAVAILABLE / WITHHELD`.
Receipt: `artifacts/session28-statistics-causality-audit.json`. The focused
authority remains `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

## Session 28 focused chart paging checkpoint (2026-11-19)

`PageUp` and `PageDown` now retain the current visible width when a requested
page reaches either retained-tape boundary. The mobile sequence `End`, `Home`,
`PageUp`, `PageDown` stays at 40/41/41/41 visible bars instead of collapsing to
two bars. Desktop and mobile browser checks retain zero horizontal overflow,
responsive toolbar orientation and the visible research-only authority.
Receipt: `artifacts/session28-chart-interaction-audit.json`; regression:
`tests/microchart-page-navigation.test.mjs`.

## Wave 9 knowledge-navigation source-label checkpoint (2026-11-19)

The lazy `PriceActionBookIndex` navigation now renders the shared
`SOURCE_REVIEW_ONLY / data UNAVAILABLE / outcome WITHHELD` status beside each
source lens, matching the focused inspector without promoting source material.
Receipt:
`artifacts/wave9-knowledge-navigation-source-label-audit.json`; regression:
`tests/wave9-knowledge-navigation-source-label-audit.test.mjs`. Preserve
`SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

## Session 28 chart typography readability checkpoint (2026-11-19)

The focused chart readability pass raises observation-facing SVG labels to a
9px minimum. Forecast, provenance and pattern receipts use 11px desktop text,
10px on standard phones and an 8px bounded fallback on very short compact
phones. The phone price legend is 11px with a 12px heading, and the footer
authority receipt is 11px. The changes are presentation-only and preserve
`SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

Regressions pass in `tests/microchart-typography.test.mjs`,
`tests/microchart-status-hierarchy.test.mjs`,
`tests/microchart-provenance-phone.test.mjs`,
`tests/microchart-responsive.test.mjs`,
`tests/focused-mobile-pattern-stack.test.mjs`,
`tests/focused-mobile-toolbar-touch-target.test.mjs` and
`tests/test-runner-registration.test.mjs`. Cockpit typecheck and production
build pass. No detector, denominator, rate, OHLC fixture, outcome, fill, order
or authority change is claimed.

## Session 29 focused feature wave checkpoint (2026-11-19)

The selected pattern inspector now renders a causal local activity receipt
from closed M5 bars. It reports bounded baseline/recent median ranges and
directional efficiency while retaining `SOURCE_REVIEW_ONLY / data UNAVAILABLE /
outcome WITHHELD` and `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.
The chart `End` shortcut preserves the active zoom width when moving to the
latest retained window. Focused MT5 refresh failures after a verified
promotion retain the last verified tape and expose a bounded read-only reason
separately from initial history fallback.

Receipt: `artifacts/session29-feature-wave-audit.json`; refresh receipt:
`artifacts/session29-focused-refresh-observability-audit.json`. The complete
`node scripts/test.mjs` lane, cockpit typecheck and production build pass. The
build has the existing Rollup chunk-size warning. No detector, denominator,
rate, OHLC fixture, outcome, fill, order, retained identity or authority
change is claimed. Continue independently labelled XAUUSD holdout work and
source-only inspectability.

## Session 30 MT5 runtime/data identity checkpoint (2026-11-19)

The loopback bridge at `127.0.0.1:8791/health` returned HTTP 200 with
`mfe-mt5-readonly`, history contract v2, no active tick streams and the explicit
`SHADOW_ONLY / NO_DECISION / live_apply_allowed=false` markers. Launcher review
confirms bridge-before-frontend startup, one per-process token shared by both
children, loopback binding and hidden child windows. Hidden browser tabs pause
recurring account and closed-M5 health polling and resume on visibility changes.
Auto-Attach remains empty-settings only, cancelable and bounded to three attempts
with 20/40-second backoff. Account/server/generation namespace and canonical
symbol/timeframe/UTC/closed-bar identity markers remain the cache boundary.

The separately started frontend previously returned `LOCAL_BRIDGE_NOT_STARTED`
because it had no launcher token, and its later endpoint was unavailable. The
proxy fail-closed behavior prevents a live-market claim in either case. Receipt:
`artifacts/session30-runtime-data-identity-audit.json`; regression:
`tests/session30-runtime-data-identity-audit.test.mjs`. Targeted proxy,
Auto-Attach, connection-health, runner-registration and cockpit typecheck checks
pass, including 56 isolated Python bridge integration tests under `.venv-mfe`.
The global Python interpreter lacks FastAPI. No detector, denominator, rate, OHLC
fixture, outcome, fill, order or authority change is claimed.

## Session 18 checkpoint (read first; 2026-11-18)

Session 18 planned **11 independent child-agent tasks** in waves. This checkpoint records the bounded forecast, viewport, closed-boundary, focused pattern, mobile and source-only contracts; the browser/runtime wave is recorded in `artifacts/session18-browser-runtime-qa.json`. The focused surface remains one XAUUSD M5 chart with `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

Forecast evidence keeps verified MT5 history and fresh closed-bar age as separate gates. Walk-forward coverage, effective causal support, independent analogue coverage, consensus margin and support metadata remain separate gates too. If any gate fails, descriptive distributions remain inspectable but the directional landmark is `WAIT`, with the failed gate named and the read-only authority retained. Contracts: `tests/focused-m5-forecast-freshness.test.mjs`, `tests/focused-forecast-gate-chip-clarity.test.mjs`, `tests/focused-forecast-gate-explanation.test.mjs` and `tests/focused-current-pattern-chart-status.test.mjs`.

Viewport refreshes avoid a full retained-tape timestamp map when visible UTC topology is unchanged; retention shifts still re-anchor by exact timestamp. Inclusive slices preserve endpoints and duplicate order, and persisted symbol/timeframe viewports prefer canonical UTC identities. Contracts: `tests/microchart-viewport-performance.test.mjs`, `tests/microchart-viewport-range.test.mjs`, `tests/microchart-viewport-reanchor.test.mjs` and `tests/microchart-viewport-persistence.test.mjs`.

Focused M5 refresh uses a unique transport nonce and promotes only through the latest proven closed boundary. A row opening at that boundary is still forming and rejects promotion; account changes, malformed provenance, cancellation and disconnects fail closed (`tests/focused-m5-refresh.test.mjs`).

Current pattern chips retain exact concept/UTC identity and explicitly say `SHADOW_ONLY; NO_DECISION; no order authority`. At phone widths through 430px, the evidence shelf is a bounded 112px local scroll region; its authority line stays sticky and visible while chips and `Why / PDF` remain available (`tests/focused-mobile-pattern-stack.test.mjs`).

Browser QA observed Exness REAL read-only XAUUSD M5 with `MT5 / 2Y CLOSED`, current FALSE HIGH LOW and DOUBLE PRESSURE chips, successful Why/PDF inspection, forecast `RESEARCH LANDMARK READY · UP` with all gates passing (walk-forward 80/12, support 47/8, analogues 41/4, margin 5.2%/5.0%, fresh verified MT5 history), zero horizontal overflow at 320/390/1440px and no runtime errors. Receipt: `artifacts/session18-browser-runtime-qa.json`.

The bounded source-only audit in `artifacts/session18-source-only-concepts-audit.json` and `tests/session18-source-only-concepts-audit.test.mjs` rechecked `trade_selection_failure`, `low_volatility`, `obstacle_room`, `news_exit`, `resistance_exit` and `reversal_exit`. Anchors, cues and abstentions remain `SOURCE_REVIEW_ONLY` / `UNAVAILABLE` / `WITHHELD`; no PDF narrative is treated as XAUUSD OHLC, a fill, an order or a measured outcome.
## Session 17 checkpoint (read first; 2026-11-18)

Session 17 assigned 13 independent child-agent tasks in waves and remains chart-first and read-only: the focused surface is one XAUUSD
M5 chart with `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`. Auto-Attach
sends an empty settings object only, is cancelable, and is bounded to three
visible attempts with 20/40-second backoff; explicit detach stops automatic
retries. The badge says **MT5 Sync** only after a fresh, attested closed M5 feed
is observed.

Focused refresh probes two closed M5 rows with a unique `refresh=` nonce, then
catches up only to that probe's proven close boundary. Equal tails reuse the same
tape identity. Account namespace, symbol, UTC/M5, closed-bar, read-only and
authority markers are rechecked around async work. The bridge fails closed for
unsupported frames, malformed/duplicate/off-grid rows, invalid OHLC, invalid
timezone, stale/untrusted cache entries and terminal restarts; lost sessions
invalidate their account namespace and cached values.

Chart letter, bracket and deletion shortcuts are modifier-safe: Ctrl/Meta/Alt
combinations remain native while unmodified tool letters and undo/redo continue
to work. An AST reachability audit removed orphan `BeastDeckBoard.tsx` and kept
shared Beast stores/services. No detector counts, outcomes, fills, orders, source
qualification or authority changed. Targeted checks pass:
`tests/mt5-auto-attach.test.mjs`, `tests/focused-m5-refresh.test.mjs`,
`tests/microchart-modifier-shortcuts.test.mjs` and
`tests/legacy-beast-deck-cleanup.test.mjs`. Full-unit/build baselines are
`artifacts/session17-baseline-unit.log` and
`artifacts/session17-baseline-build.log`; rerun after integration, with the
existing large-chunk warning expected. Remaining scope is independently labelled
XAUUSD OHLC/outcome holdouts, execution/fill/cost/news/manual-exit models and
source-only concepts.

## Historical Session 16 checkpoint (2026-11-18)

Session 16 kept the product chart-first:
the focused surface remains one XAUUSD M5 chart with `SHADOW_ONLY / NO_DECISION /
live_apply_allowed=false` authority. Saved drawings can be selected with Cursor,
cycled with `[` / `]`, moved by body or endpoint handles, and removed with
Delete/Backspace; Escape cancels or clears selection without changing the UTC
anchored drawing identities. The keyboard help and accessibility contracts expose
these controls, and the bounded drawing history remains local and
symbol/timeframe scoped. The focused home route also keeps the unrelated command
palette and workspace navigation unavailable while preserving the diagnostic-route
palette elsewhere. A scoped monochrome palette guard keeps chart and focused
evidence chrome black/white while retaining the explicit teal/red candle colors.
These are presentation and interaction changes only; detector counts, outcomes,
fills, source qualification and order authority are unchanged. Targeted checks are
`tests/microchart-drawing-selection.test.mjs`,
`tests/microchart-accessibility.test.mjs`,
`tests/focused-command-palette-guard.test.mjs`, and
`tests/focused-m5-surface.test.mjs`.

Session 15 historical evidence: twelve independent tasks ran in waves. The final Chapter 9 source review covers printed pp.373-382/PDF pp.383-392, including visual confirmation that printed p.382/PDF p.392 is a blank divider. Coverage is **419/419**, Chapter 9 **138/138**, with 36 source lenses and 36 held-out provenance-only fixtures, 23 concepts and 30 relationships. The context-selection census now groups receipt-backed setups into existing local review buckets, recomputes each context through the confirmation candle, keeps FLAT in aligned-direction denominators, and runs in a lazy cancelable worker only after the inspector section expands. It is descriptive `SHADOW_ONLY / NO_DECISION`; it does not alter detector counts, rates, fills, source qualification or order authority. Receipts include `artifacts/chapter9-final-august-source-review-373-382.json` and `artifacts/session15-legacy-cleanup.json`; focused census tests cover model, worker lifecycle, UI, exact UTC navigation and future-leak boundaries.

The orphan `BeastArenaPanel.tsx` wrapper is removed with shared Beast services preserved. Session 15 runtime, accessibility, retention and statistics audits pass; final unit/build evidence is recorded in `artifacts/session15-final-unit.log` and `artifacts/session15-final-build.log`. Post-fix browser QA measured 76 total occurrences, 50 measured and 26 unavailable with all seven buckets reconciled, exact UTC keyboard navigation, replay unmounting and no overflow at 320/390/1440px (`artifacts/session15-context-census-browser-qa.json`). Remaining scope includes independently labelled XAUUSD OHLC/outcome holdouts, execution/fill/cost/news/manual-exit models and source concepts intentionally kept as `SOURCE_NOTES`.

Session 14 assigns **12 independent child-agent tasks** in waves: causal replay/bookmark model, source review pp.363-372, legacy BeastLab audit, persistence, UI, accessibility, MT5 identity, statistics, source consistency, runtime/startup, browser and documentation. Ten full-page reviews cover printed pp.363-372/PDF pp.373-382 after attested source SHA-256 verification. Coverage is now **409/419**, leaving **10** indexed chapter pages; Chapter 9 is **128/138**. Totals are **35 source lenses** and **35 held-out provenance-only fixtures**, with 23 concepts and 30 relationships. Receipt: `artifacts/chapter9-august-source-review-363-372.json`. The next source gap is printed **p.373/PDF p.383**, through printed p.382/PDF p.392; p.382 has no OCR and requires visual review.

The selected-occurrence inspector now saves, restores and deletes an identity-only causal replay bookmark. The canonical payload records occurrence/concept/read/mode/revealed UTC identities without candles, prices, outcome payloads, statistics, fills or orders. Restore resolves the exact current retained closed-M5 occurrence and recomputes its causal prefix; expired, malformed, unavailable or mismatched evidence remains unavailable without substituting an occurrence. Persistence uses the MT5 cache/account-plus-symbol scope when verified, and a separate local-snapshot scope otherwise; verifying history provides no scope. Native buttons, polite atomic status and visible focus remain; the focused bookmark shelf now bounds and wraps long names with minimum targets. Replay hides unrevealed future candles and retrospective evidence, retaining `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

Existing Session14 receipts support bounded checks: `artifacts/session14-bookmark-replay-accessibility-audit.json` records component/accessibility checks and typecheck; `artifacts/session14-statistics-replay-bookmark-audit.json` records two adversarial leakage regressions and the combined 35/35 suite. `artifacts/session14-runtime-startup-audit.json` records 28/28 focused checks and cockpit typecheck, and confirms the standalone BeastLab wrapper/aliases are retired while shared Beast data and services remain. `artifacts/session14-source-consistency-audit.json` verifies source PDF SHA-256, 10 render/OCR hashes, 438-page index semantic rebuild and exact compact-map parity at 409/419 and 35 lenses/fixtures.

Session 15 final unit, production build and bounded 320px census/browser evidence are recorded; the runtime, accessibility, retention and statistics audits cover the current census integration. Rerun focused checks after future changes. No detector occurrence, denominator, rate, execution or authority expansion is claimed, and no narrative figure is converted into OHLC or outcome evidence.

## Historical Session 13 checkpoint (superseded by Session 14 above)

Session 13 assigns **11 independent child-agent tasks** in waves: causal replay model, source review pp.353-362, legacy/Playbook retirement, replay controls UI, accessibility, identity/retention, statistics, runtime/startup, browser, documentation and independent source consistency. The source wave visually reviewed printed pp.353-362/PDF pp.363-372 after attested SHA-256 verification, adding 10 curated pages. Coverage is now **399/419**, leaving **20** indexed chapter pages; Chapter 9 is **118/138**. The map has **34 source lenses** and **34 held-out provenance-only fixtures**, with 23 concepts and 30 relationships. Receipt: `artifacts/chapter9-late-july-source-review-353-362.json`; next review starts at printed **p.363/PDF p.373**, continuing through p.382, whose OCR is unavailable.

The causal replay model and UI controls are integrated for selected occurrences. Replay exposes only a causal prefix and keeps future/outcome statistics hidden while active; it preserves `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`. The public detector now rejects off-grid historical M5 rows. The legacy Playbook route is retired and its alias resolves to focused home while shared data remains. Receipts: `artifacts/session13-pattern-causal-replay-controls-ui.json`, `artifacts/session13-replay-accessibility-audit.json`, `artifacts/session13-mt5-identity-retention-audit.json`, `artifacts/session13-statistics-audit.json`, `artifacts/session13-runtime-startup-audit.json`, and `artifacts/session13-legacy-playbook-retirement.json`. The bounded audit is against known git commit `4b54af7`, which includes pre-existing owned files; no reset was performed. Final full unit and cockpit typecheck pass in `artifacts/session13-final-unit.log`; production build passes in `artifacts/session13-final-build.log` with the existing large-chunk warning. Post-fix browser QA passes 53/53 checks across 320/390/1440px and Setup/Context/Outcome, with no horizontal overflow (`artifacts/session13-causal-reveal-browser-qa.json`, nine screenshots). Actual retained fallback has 141,178 closed M5 bars and MT5 Offline; occurrence75 reaches H+24, while occurrence76 stops at its real six-bar contiguous/session boundary. Exit and occurrence switches reset safely, Enter/Space controls work, and replay hides retrospective statistics. Legacy #playbook resolves home and the dedicated QA tab is closed. Independent source consistency verifies PDF SHA, 10 render/OCR hashes and exact 438-page index rebuild (`artifacts/session13-source-consistency-audit.json`).

## Historical Session 12 checkpoint (superseded by later sessions above)

Session 12 assigns **10 independent child-agent tasks** in waves: source reviews pp.333-342 and pp.343-352, selected-occurrence comparison, comparison accessibility, Governance/Analysis retirement, browser, identity/retention, source consistency, runtime/startup and documentation. The two source waves add **20** full-page reviews, printed pp.333-352/PDF pp.343-362. Coverage is now **389/419**, leaving **30** indexed chapter pages; Chapter 9 is **108/138**. The map has **33 source lenses** and **33 held-out provenance-only fixtures**, 23 concepts and 30 relationships. Receipts: `artifacts/chapter9-july-source-review-333-342.json` and `artifacts/chapter9-mid-july-source-review-343-352.json`; next review starts at printed **p.353/PDF p.363**, continuing through p.382, whose OCR is unavailable. The selected inspector now compares raw H+1 direction with the separate local ATR barrier path while retaining context withholding and `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`; receipt `artifacts/session12-feature-audit.json`. The Governance/Analysis route retirement preserves shared payloads and aliases legacy hashes to focused home; receipt `artifacts/session12-legacy-retirement.json`. Targeted source/index, comparison/accessibility/navigation/startup and identity/retention checks pass. Final full unit and cockpit production build pass in `artifacts/session12-final-unit.log` and `artifacts/session12-final-build.log` (existing >500 kB chunk warning). Source consistency passes attested PDF SHA-256, 10 render/OCR hashes and all 438 page records (`artifacts/session12-source-consistency-audit.json`). Browser QA passes 9/9 width/mode combinations and 36 event checks on the actual local-fallback tape (141,178 closed M5 bars, MT5 Offline), with zero overflow/overlap, 108px rail, 18px minimum label spacing and zero true-price-Y error (`artifacts/session12-outcome-comparison-browser-qa.json`). The `#analysis` alias resolves to `#home`, title QUANTSMART, and the dedicated QA tab is closed. Broker alias scope is rechecked after async MT5 work before either canonical or broker cache writes; no stale alias response can populate the new key. No detector, occurrence, denominator, rate, fill or order changes were added.

## Historical Session 11 checkpoint (superseded by later sessions above)

Session 11 assigns **10 independent child-agent tasks**, run in waves within the three-child runtime limit: level-selection UI, source review pp.313-322, StrategyRanking retirement, identity hardening, source review pp.323-332, accessibility, browser, runtime, source consistency and documentation. This session adds **20** full-page reviews, printed pp.313-332/PDF pp.323-342. Coverage is **369/419**, leaving **50** indexed chapter pages; Chapter 9 is **88/138**. The map has **31 source lenses** and **31 held-out provenance-only fixtures**, 23 concepts and 30 relationships. Receipts: `artifacts/chapter9-late-may-source-review-313-322.json` and `artifacts/chapter9-june-source-review-323-332.json`. Next review starts at printed **p.333/PDF p.343**, through p.382, whose OCR is unavailable. Independent source consistency passes 20/20 actual render/OCR hashes, source PDF SHA-256, printed/PDF anchors and source-only states (`artifacts/session11-source-consistency-audit.json`).

Seven native rail/legend selectors identify ATR entry/target/invalidation (**AE/AT/AI**), technical protection/obstacle (**TP/TO**) and setup break/protection (**SB/SP**) by exact descriptor ID. Selecting or toggling a role updates live meaning/status and the matching line highlight; coincident prices remain distinct. Strict UTC/M5 alias normalization and omission of derived study/technical `exitIndex` preserve selection through retention/backfill reindexing. Semantic receipt changes clear selection on first render and do not resurrect it. Three identity tests and five selection tests pass and are registered. Existing stationary 108px rail, label spacing and true-price geometry are retained.

StrategyRanking's standalone component/route is retired; old hashes resolve to focused home while shared Card data, storage and receipt artifacts remain (`artifacts/session11-strategy-ranking-retirement.json`). Final full unit and cockpit typecheck pass in `artifacts/session11-final-unit.log`; production build passes in `artifacts/session11-final-build.log` with the existing >500 kB chunk warning. Independent runtime/selection checks pass 46/46 plus 7/7 startup checks (51 distinct checks, two repeated) without product edits (`artifacts/session11-level-selection-runtime-audit.json`); accessibility passes 19/19 with no fix justified (`artifacts/session11-level-accessibility-audit.json`).

Dedicated browser QA passes **9/9** width/mode combinations (320/390/1440px across setup/outcome/context) on actual retained local-fallback Pattern break **76/76**, **141,178 closed M5 bars**, **MT5 Offline**. It passes **63 legend select/clear pairs**, **63 rail select/clear pairs**, **14 native Enter/Space pairs** and **36 Arrow event checks**. Minimum plot width is **158px**, rail width **108px**, minimum label spacing **18px**; horizontal overflow and rail text overlap are zero and true-price-Y maximum error is **0**. Receipt: `artifacts/session11-level-selection-browser-qa.json`, with **11 PNGs**. Separate `artifacts/session11-level-selection-320-selected-tp.png` and `artifacts/session11-level-selection-320-selected-sp.png` show independent TP/SP meanings at the coincident **4,032.28** price. No issues were recorded. The retired alias #strategy-ranking resolves to #home with title QUANTSMART and no load error; the dedicated QA tab was closed.

No source notes or provenance-only fixtures establish XAUUSD OHLC, detector behavior, executable fills or measured outcomes. No detector occurrence, count, denominator, rate, fill or order changes were added. Preserve `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`. Full PDF implementation and independently labeled OHLC/outcome holdouts remain unfinished.

## Historical checkpoints (superseded by the read-first checkpoint)

Previous source increment: Chapter 3 printed pp. 52-66 / PDF pp. 62-76 were visually reviewed, completing its full printed pp. 33-66 interval (34/34). Page 66 is a confirmed blank divider, with no concept anchor. The source-only `chapter3_practice_buildup_break_context` lens now covers printed pp. 36-65, adding doji caution, flag/pole harmony, adverse M/W exit versus countertrend entry, relative powerbars, flat-EMA squeeze, pre-perforation barrier placement, conservative two-bar buildup and technical-test triples. Loose book two-doji variants remain distinct from the strict local detector. Concept anchors and the compact chart lookup were regenerated. No EUR/USD narrative became XAUUSD OHLC, outcome labels or execution logic. Chapter 12 printed p. 421 / PDF p. 431 and Chapter 11 printed pp. 395-420 / PDF pp. 405-430 remain visually reviewed as source-only notes. Chapter 2's full printed pp. 5-32 interval also has five source-only lenses:
`false_break_participation_context`, `false_high_low_followthrough`,
`pullback_reversal_patience`, `tease_ceiling_test_selection` and
`round_number_magnet_selection`. Chapter 3 adds the source-only
`chapter3_practice_buildup_break_context` lens on printed pp. 36-65 and the
`final_study_edge_discipline` lens belongs to Chapter 12 printed p. 421. The map now has 202
curated-page metadata records, 30 anchored relationships, sixteen source lenses
and sixteen held-out source fixtures. Source-specific tick/pip/cost
examples and the Chapter 2 schematic examples remain descriptive notes; they
do not change the XAUUSD M5 detector or produce market-data/outcome fixtures.
Receipts are `artifacts/chapter2-principles-source-review.json`,
`artifacts/chapter3-practice-source-review.json`, `artifacts/chapter4-divider-source-review.json`,
`artifacts/chapter5-pattern-break-source-review.json`, `artifacts/chapter5-pattern-break-source-review-86-96.json` and
`artifacts/chapter11-low-volatility-source-review.json`; the persistent
`docs/price_action_page_index.json` records the source SHA-256, page hashes,
printed/PDF anchors and review status for all 438 pages (425 with OCR). Run
`node scripts/price-action-coverage.mjs --chapter 2` or `--chapter 11` for an
attested review backlog, including OCR gaps, before choosing the next pages.
These reports reuse strict index/OCR/hash validation and do not extract the
PDF or write files.

The knowledge panel now exposes the reviewed source-only lens notes inside each chapter's book index. Notes are collapsed by default, scroll within a bounded keyboard-focusable region, show printed/PDF anchors, and state that they add no detector occurrences or measured outcomes. Concept search includes linked source-lens names, cues, abstain notes and page references, so terms such as `squeeze` and `page 43` resolve to the relevant indexed concepts without creating new detector identities. Added book-index and source-search regressions; chart-only startup remains lazy.

Restart recovery also fixed the MT5 shell badge when Auto-Attach completes while
the browser tab is hidden: one forced account/closed-M5 health receipt is now
allowed on mount or terminal-generation change, while recurring hidden-tab
polling still pauses. The regression covers feed failure, recovery, historical
mode, transport failure and hidden-tab reattachment. Live Exness QA showed
`MT5 Sync`, `MT5 / 2Y CLOSED`, 141,000+ verified retained bars and the focused
chart at 1419/1419 client/scroll width. A new pan probe attempt was inconclusive:
the visible Orca browser's idle RAF itself exhibited approximately one-second
gaps, so the diagnostic now classifies scheduler throttling and cancels its
page-side synthetic gesture on timeout rather than attributing that delay to
MicroChart. No new renderer fix was justified by the static pan audit.

The focused startup graph now lazy-loads the full knowledge panel, page index
and source map only after chart context is opened. Compact concept labels and
attestation remain exact, and nested Suspense keeps the chart visible while the
panel loads. The retained pattern census is a bounded, keyboard-focusable scroll
region so its 13 quantified rows cannot stretch adjacent mini-chart cards.
Snapshot validation accepts a sorted subset of currently attested concept pages,
preserving older exports after source coverage grows while rejecting unknown,
duplicate or unsorted anchors. MT5 `rates()` invalidates the terminal session
when the bridge returns an empty payload after disconnect. Source/lazy (23/23),
bridge (56), full unit, language audit, typecheck and production build checks
pass. The latest short visible-tab pan receipt moved exactly 36px with zero Y
drift; frame timing remains inconclusive because the browser scheduler stalled.
The full PDF strategy remains unfinished: 228 indexed chapter pages still need
source review, followed by faithful chart translation and independent validation.

Legacy forensic `owner.css` now loads with StrategyLab/StrategyCanvas rather
than eager `main.tsx`. Production entry CSS shrank from 70,606 to 61,912 bytes;
the owning legacy routes keep their stylesheet. Source/index/book/navigation
and focused CSS/chart contracts, the full unit lane with final TypeScript,
and production build all pass. Logs: `artifacts/unit-after-coverage-owner.log`
and `artifacts/build-after-coverage-owner.log`. Browser visual QA retained the
focused Exness chart; Reset restored the latest 180-bar window with visible
teal/red candles and no additional side panel.

Latest pan-smoothness refinement: the focused chart now renders candles and
EMA/VWAP polylines through memoized `CandleSeries`/`IndicatorSeries` children
under one fractional `translate()` transform. Long saved brush geometry is a
memoized child as well, so fractional pointer frames reuse the 2,500-candle /
10,000-point geometry instead of serializing it again. A browser React DOM probe
confirmed 25 fractional frames reused all geometry, moved exactly 2.5 px, and
kept Y unchanged. `tests/microchart-series.test.mjs` covers the real element
geometry, forming/cursor semantics, indicator tail fallback and brush output.
Full unit, cockpit TypeScript and production build passed. After the user made
the tab visible, the latest foreground probe passed at 180 bars: median 12.1 ms,
p95 18.3 ms, max 36.5 ms, one frame above 25 ms, 180.00000008 px displacement
for 180 px input, zero Y drift. These are local machine measurements, not a
guaranteed frame rate. `artifacts/chart-pan-profile-current.json` contains the
latest report; the earlier foreground receipt remains historical evidence. The
probe starts its timing baseline from the first RAF stamp instead of mixing
`performance.now()` with a possibly earlier RAF timestamp.

The appended entries at the end supersede older chronological notes. Current
chart candles are TradingView-style teal/red at full opacity. Focused chart-only
desktop is restored at http://127.0.0.1:5090/#home. The last observed runtime is MT5 Offline, using local fallback closed-bar history. Earlier Exness-MT5Real29 receipts are historical evidence, not current connection proof.
Keep the overall goal active; the complete PDF strategy is not implemented.

Knowledge now has 23 concepts, 12 chapter intervals, 191 curated-page notes,
six case-month ranges and 13 glossary terms. Thirteen concepts are geometry proxies;
ten are source-only notes, with 30 anchored relationships, sixteen source lenses
and sixteen held-out source fixtures. Regular pattern break, pattern break pullback (hanging
barrier fight and excursion/return variants), and close-confirmed combi have
source-structure receipts, all historical occurrences and mini-chart labels. Pullback
reversal now uses version3 dominant-leg/correction/EMA25/signal confirmation,
with a bounded first-break / opposing-return / second-break M/W sequence.
167 retained occurrences (97 LONG /70 SHORT;9 SECOND) have complete version3
receipts and endpoint-prefix parity. Mini charts label S1/C1/R/S/C and include their complete bounded detector context. Read docs/PRICE_ACTION_KNOWLEDGE_MAP.md and the JSON
map for exact scope. All438 page metadata records are in
`docs/price_action_page_index.json`; full OCR stays in the existing local artifact.
Use `node scripts/price-action-source-index.mjs --query "words" --chapter 5` or
`--printed-page 108 --text` to retrieve source without extracting the PDF again.
The index checks source/hash/metadata consistency. Figure mentions are references,
not proof of figure location or an outcome dataset. New annotations require an
intentional `--build` to update coverage metadata.

Wider obstacle-room context is implemented: up to96 causal closed bars, confirmed
swing zones, technical-risk distance and a separate50-unit XAUUSD round landmark.
The inspector has Setup / Outcome path / Context views; Context ends exactly at
the selected setup close. This is optional research context, not an entry filter.
Snapshot room receipts are informational and recomputed from current candles.

The latest inspector also exposes wider swing/range context: up to96 closed
bars with confirmed H1/H2/L1/L2, EMA25 slope, close efficiency and a repeated
floor/ceiling range when measured. Opposing progression and near-boundary
concerns are explanatory only; they do not filter the historical census or
qualify entries. Snapshot market-context receipts are recomputed. Read the
latest wider-context checkpoint near the tail for exact rules and verification.

Pullback strength and terminal-cluster evidence is also implemented for the
measured pattern-break-pullback family. It recomputes the canonical40-bar prefix,
shows local return depth, opposing bodies/powerbars, close speed/efficiency and
inside bars in a compact suffix ending at signal, and outlines that suffix on
the mini chart. Numerical definitions are local research choices; no acceptance
grade or filtering of historical occurrences. Snapshot pressure is informational.

Full unit/TypeScript and build passed for pullback setup, room, pressure and
reversal version2. Final reversal changes also passed28 related regressions.
Logs/artifacts: artifacts/ui-verification/pullback-*, pattern-break-*, combi-*, source-pages-*
and book-index-*; current logs reversal-unit.log, reversal-final-regression.log
and reversal-final-build.log. Source references show printed/PDF(+10) consistently. No pending
approval or user question; no tests or child agents remain running.
Next meaningful work: wider dominance/range and strength-aware setup selection,
source-grounded held-out fixtures and fuller figure/case review; actual MT5
source verification when available; continued legacy cleanup without changing
execution authority. Preserve SHADOW_ONLY / NO_DECISION / live_apply_allowed=false.

Latest responsiveness update: the complete price-action scan now runs in a
module Web Worker, with explicit pending/error/retry states and no synchronous
fallback. Equal closed-bar polls reuse results after full OHLC/UTC comparison;
tape/symbol changes hide stale evidence immediately and cancel queued replies.
Snapshot import during loading queues UTC occurrence restoration, including
same-concept imports. Full unit/TypeScript and production build passed. Read the
last checkpoint for runtime measurements and remaining latency limitations.

The separate6000-bar candle analogue/forecast calculation also now runs in a
worker, with pending/error/retry states, captured query clock and unchanged
60-match scope. Worker cancellation is shared through analysisWorkerTask.ts.
UTC analogue focus survives loading/idle/error and snapshot source-lens changes.
The long pending forecast receipt now wraps on desktop as well as phone.
Final unit suite passed before the last focus/CSS refinement; afterward11
related regressions, final TypeScript and build passed. See last checkpoint.

## Product objective

Focus the workspace on one readable XAUUSD M5 closed-bar chart. The chart should
occupy most of the viewport, use a dark TradingView-like theme with visible teal/red candles (latest user correction, 2026-11-13), preserve
interactive drawing and navigation, and expose explainable price-action pattern
evidence derived from the supplied Bob Volman PDF. Historical data is capped at
two years for the user-facing M5 view. Pattern explanations, recurrence and
win-rate statistics must remain research measurements with explicit provenance;
they must never become automatic order execution.

## Completed in this session

- The Microscope loading boundary now keeps an accessible black/white chart
  surface visible while a lazy panel is fetched. The previous null fallback
  could make a slow import look like a blank focused chart. The
  `tests/focused-suspense-fallback.test.mjs` contract protects the status copy,
  monochrome styling, and non-blank fallback.

- Focused home removes the non-actionable one-option timeframe segmented control;
  the fixed XAUUSD M5 surface now shows a static `M5 · FOCUSED` provenance badge,
  while the legacy `/microscope` route keeps its timeframe controls. The focused
  surface contract covers this distinction.
- Current focused price-action marker controls now expose their indexed PDF page
  anchors directly (`PDF pp. ...`) and repeat the anchors in accessible labels.
  The marker remains descriptive `OBSERVATION · SHADOW_ONLY` evidence with no
  order authority. `tests/current-marker-provenance.test.mjs` protects this
  source-to-chart link.
- The knowledge-panel search now indexes concept page numbers plus related
  directed-edge labels and page anchors. A later session can search a saved PDF
  page or graph term and reopen the same source-grounded lens without changing
  detector state; `tests/knowledge-search-network.test.mjs` protects this.
- The focused chart canvas now supports TradingView-style `End` navigation:
  pressing End jumps to the latest width-appropriate window of retained M5 candles and announces
  `Latest bars shown.` through the chart status region. The shortcut is listed
  in the chart's accessible keyboard help and covered by
  `tests/microchart-canvas-shortcuts.test.mjs`.
- Cursor-mode double-click now resets the viewport to recent bars, matching a
  familiar TradingView gesture; drawing tools intentionally ignore the gesture
  so two-point drawing remains safe. `tests/microchart-interaction.test.mjs`
  covers this behavior.
- Current chart marker controls now resolve raw detector IDs to human-readable
  PDF concept names while retaining direction, indexed PDF pages, and
  `SHADOW_ONLY` semantics. `tests/current-marker-source-name.test.mjs` covers
  the source-readable label.
- The focused route no longer statically imports the legacy KIDI scanner. KIDI
  loads and runs only on the full diagnostic route, preserving legacy behavior
  while removing unrelated focused startup work. The focused compute contract
  covers the guard and lazy import.
- Pointer cancellation is now explicit in MicroChart: interrupted touch/OS
  gestures clear the active pan/drawing draft and announce `Pointer gesture
  cancelled.`. This prevents an abandoned partial drawing from being committed
  after a mobile interruption; `tests/microchart-interaction.test.mjs` covers it.
- Current concept provenance now includes the latest closed-bar UTC timestamp
  and states that PDF pages are descriptive source references only. When no
  current marker exists, the live readout says source navigation is withheld;
  `tests/current-marker-bar-provenance.test.mjs` protects the boundary.
- Focused Microscope memoizes `researchOptions`, so disabled legacy backtest
  hooks do not observe a new options object on every focused render. Legacy
  behavior is unchanged and the focused compute contract covers the identity.
- Focused live-advice derivation now exits immediately on the read-only home
  route. Legacy Live Microscope still derives the advisory payload; the focused
  chart no longer processes an unrelated advisory path. The focused compute
  contract covers this guard.
- Current pattern controls now show the detector's bounded geometry score beside
  the human-readable source name, direction, and PDF pages. The score remains
  descriptive evidence and does not change forecast or order authority;
  `tests/current-marker-evidence-score.test.mjs` covers it.

- Latest focused UI cleanup keeps visible M5 geometry and source badges readable:
  chart landmark summaries use middle-dot separators, current concept abstention
  copy no longer falls back to question-mark glyphs, and the legacy live/replay
  badges retain valid Unicode symbols. `tests/focused-visible-copy.test.mjs`
  protects these user-facing strings.
- The focused forecast card now exposes one atomic `Forecast status` live region
  containing the same withholding/ready reason and WF/support/analogue/margin
  gates used by the chart. This keeps assistive technology aligned with the
  visual forecast landmark.
- On narrow screens the chart footer's evidence/authority status receives its
  own full-width row, so `SHADOW_ONLY · NO_DECISION` remains readable beside the
  session legend and viewport readout.
- Legacy Microscope routes no longer allocate the bounded M5 forecast slice;
  the 6,000-bar slice is created only for the focused XAUUSD M5 route.

- The Microscope chart now opens on M5 by default.
- The canonical home route now renders a focused Microscope surface: the chart
  gets the dominant viewport, side diagnostics/connectors are hidden there, and
  the timeframe control is fixed to M5. The full diagnostic Microscope route is
  still available separately.
- M5 display tapes are capped to the two-year interval ending at the latest
  available bar in the focused Microscope surface.
- `MicroChart` has a scoped monochrome TradingView skin (`microchart-tv`) with
  near-black canvas, light up candles, graphite down candles, neutral grid and
  axis treatment. Existing pan, zoom, crosshair, drawing tools, keyboard chart
  controls and annotation accessibility remain intact.
- Empty and one-bar states say exactly why a closed-bar chart cannot render.
- The PDF was verified locally (438 pages, 425 pages with text) and hashed. A
  curated theory/setup map and machine-readable JSON map are tracked in `docs/`.
  The source PDF and full OCR dump are intentionally not committed.
- A reproducible extractor is available at `scripts/extract_price_action_pdf.py`.
- Added a deterministic, read-only M5 detector for buildup, false break,
  pullback reversal, ceiling/floor test and round-number context. It emits
  source concept IDs/page anchors, chart markers and explicit ABSTAIN states.
- The focused chart now passes detector markers into the interactive chart;
  clicking a marker selects its source explanation in the knowledge panel.
  The focused surface also shows causal next-bar distribution, chronological
  hit-rate evidence and a nearest analogue mini preview.
- Detector concepts now expose bounded chronological recurrence and next-closed-bar
  outcome evidence with Wilson 95% intervals, split by LONG/SHORT observation
  direction. The focused readout adds a detailed closed-candle window and keeps
  setup labels separate from measured outcomes. Focused mode hides the unrelated
  strategy runner while retaining the full diagnostic route.
- Focused Live M5 now requests the existing bounded MT5 multi-year history
  adapter first. Only complete, UTC, closed-bar, read-only, account-scoped
  history is accepted; the chart then applies the explicit latest-two-year cap.
  Incomplete or unavailable broker history falls back to the labelled local
  snapshot, with source and retention provenance visible in the control bar and
  source-coverage panel.
- The canonical home shell now removes the desktop rail, sub-navigation, and
  status bar, and reclaims their height so the M5 chart truly occupies the
  viewport. Legacy routes retain the full research shell.
- Focused home is now fixed to XAUUSD at the shell boundary: the asset selector
  is disabled on that route and the Microscope also normalizes any stale active
  symbol back to XAUUSD before requesting history.
- Detector evidence now retains a bounded chronological occurrence tape per
  concept. The focused mini candlestick window follows the selected concept's
  historical occurrence, supports Earlier/Later browsing, labels LONG/SHORT
  observations separately from next-bar outcomes, and explicitly shows ABSTAIN
  when no detector window exists. Neutral context is labelled PATTERN rather
  than being misrepresented as LONG.
- Focused home now skips legacy co-trade payload/advisor initialization entirely;
  that diagnostic path remains available on the full `/microscope` route. This
  reduces unrelated work during the canonical chart startup without deleting
  route-compatible research code.
- The legacy co-trade adapter is now a runtime `import()` on the non-focused
  diagnostic path, so the focused route does not eagerly initialize or bundle
  that payload. A safe full page extraction was audited and deferred because
  the 856-line Microscope state/render graph is interleaved; duplicating it
  would be less maintainable and would not materially reduce the focused chunk.
- Live-terminal smoke evidence was captured on 2026-11-05 UTC through the local
  MT5 read-only proxy for `XAUUSD` `M5` (seven-day probe): the bridge returned
  1,367 bars with `source=MT5_HISTORY`, `MT5_CLOSED_BARS`, `UTC` timestamps and
  timezone, `forming_bar_included=false`, `authority=SHADOW_ONLY`,
  `decision=NO_DECISION`, and `read_only=true`. The probe was marked
  `coverage_status=PARTIAL`, so the focused three-year adapter correctly must
  fail closed to the labelled local snapshot until complete multi-year coverage
  is available.
- Focused chart forecast geometry now uses the causal M5 analogue consensus only
  when it is valid and directional. It draws a labelled `FORECAST / UP|DOWN /
  RESEARCH` landmark on the chart, using the first-horizon expected ATR and a
  bounded minimum distance. FLAT or unavailable evidence draws no forecast line.
  Neutral PDF observations also no longer create directional target or
  invalidation zones.
- The focused MT5 three-year promotion path now uses an explicit assembled
  provenance gate. It requires symbol/timeframe identity, complete chunk
  coverage, `MT5_HISTORY_3Y`, UTC timestamps and valid server timezone, closed
  bars with no forming candle, `SHADOW_ONLY / NO_DECISION`,
  `live_apply_allowed=false`, read-only authority,
  and a stable non-detached account cache namespace. Unattested or mixed-scope
  history remains on the labelled fallback path.
- The interactive chartâ€™s accessible SVG summary now announces every research
  landmark, including the causal `FORECAST / UP|DOWN / RESEARCH` line, so its
  direction is available without relying on visual color or position.
- The focused source-coverage panel now repeats the complete authority boundary
  (`SHADOW_ONLY · NO_DECISION · live_apply_allowed=false`) alongside the bar,
  retention, and UTC provenance rows.
- Historical detector mini-windows now draw a separate `NEXT UP`, `NEXT DOWN`,
  or `NEXT FLAT` marker on the following closed candle when an occurrence tape
  is selected. The setup marker remains LONG/SHORT/PATTERN observation-only;
  the next-bar marker is the measured outcome and is explicitly labelled apart
  from the setup.
- Selected concept evidence now exposes chronological evaluation support and
  the last occurrence timestamp alongside recurrence, Wilson interval, overall
  hit rate, and LONG/SHORT splits.
- Forecast chart landmarks now require a non-flat consensus with a visible
  margin, at least 12 chronological walk-forward evaluations, calibrated
  effective support of 8, and at least 4 independent selected analogue
  endpoints. If those gates are not met, the readout says
  `LANDMARK WITHHELD · INSUFFICIENT SUPPORT` and no directional line is drawn.
- Focused home now avoids unrelated diagnostic startup work: replay M1-year
  discovery, CSV preselection, strategy-card subscriptions/preselection,
  broker calibration, replay design-tape loading, multi-timeframe year loading,
  live advisory polling, and broker-deal polling are disabled there. The full
  `/microscope` route retains those behaviors.
- TradingView-style drawings now persist locally per symbol/timeframe under a
  bounded versioned key (maximum 200 drawings). Remounting or returning to the
  XAUUSD M5 chart restores the userâ€™s trend lines, levels, rectangles, text,
  brush, Fibonacci, and measurement annotations; clear/lock behavior remains
  unchanged.
- Interactive drawing additions now enforce the documented 200-drawing bound in React state as well as during localStorage writes; key-matched hydration still runs before persistence to avoid cross-symbol overwrites.
- Price-action recurrence evidence now scans the complete retained M5 tape
  supplied by the focused two-year window instead of silently truncating to a
  recent 2,400-bar sample; each detector still uses a bounded local context.
- Directional current-pattern observations now render explicit LONG/SHORT
  ENTRY, TARGET, and INVALIDATION research landmarks on the chart. They remain
  observation-only and are emitted only for a non-neutral closed-bar direction.
- Pattern evidence now reports its evaluation span and skipped continuity
  windows separately from detected occurrences. This keeps recurrence and
  sample coverage auditable when the retained M5 tape contains session gaps.
- The focused readout now includes a compact PDF concept lens for the selected
  marker: definition, source observation cues, abstain cues, page anchors, and
  the detector's current reason are visible beside the chart statistics.
- Focused home evidence chrome now inherits the chart's monochrome black/white
  palette, including the PDF knowledge panel, readout cards, selectors, and
  status borders; legacy diagnostic routes keep their existing semantic theme.
- Knowledge-panel setup-family separators now use explicit visible arrows on
  desktop and downward arrows on mobile, replacing the corrupted placeholder
  glyph that made the PDF study map look unfinished.
- Historical occurrence browsing now offers `Show on chart`. It moves the main
  chart viewport to the selected closed-bar occurrence through a dedicated
  visual focus index, leaving replay cursor semantics and research authority
  unchanged.
- The selected concept now also paints its bounded historical occurrence tape
  on the main chart as distinct `HIST · ...` annotations. Each historical
  marker carries its measured next-bar outcome separately from the setup label;
  current markers remain visually and semantically distinct.
- The historical overlay is user-toggleable with the accessible `HIST TAPE ON /
  HIST TAPE OFF` control. Turning it off only declutters the chart; evidence,
  mini-window browsing, and source-grounded statistics remain available.
- Selected concept evidence now reconciles detected occurrences into explicit
  next-bar `UP`, `DOWN`, and `FLAT` counts, making the win-rate denominator and
  neutral outcomes auditable without inferring from the chart labels.
- Chart marker selection is now two-way with the historical mini chart: clicking
  a `HIST · ...` marker selects its concept, selects the exact occurrence in
  the bounded history tape, and focuses the main chart at that bar.
- The next-bar forecast readout now exposes every directional landmark gate:
  walk-forward evaluations, calibrated effective support, independent analogue
  endpoints, and consensus margin. Withheld forecasts therefore explain the
  exact missing support instead of showing only a generic WAIT state.
- Historical `FLAT` outcomes now carry a dedicated `nextBarOutcome` field on
  chart annotations. Keyboard status, hover context, and marker semantics say
  `next closed bar FLAT` instead of incorrectly calling a known result pending.
- Focused readout now includes a clickable Pattern census for every measured
  concept in the retained M5 tape. Each row shows occurrences, next-bar hit
  rate, and reconciled UP/DOWN/FLAT counts; selecting a row drives the same
  PDF lens, mini chart, marker overlay, and chart focus state.
- Pattern census now discloses its quantified coverage boundary (`10/10`
  detector concepts), including fail-closed support/resistance repeated-level
  and role-test geometry, dominant-pressure swing structure, false-high/low
  opposite-break confirmation, double-pressure break/follow-through, and tease
  break premature-break/retest/second-break geometry.
- The PDF knowledge panel now has an accessible full-text search across concept
  names, definitions, observation cues, and abstain cues. No-match state is
  explicit and filtering does not alter detector or evidence state.
- Historical chart annotations now include the selected concept's PDF page
  anchors in their measures/tooltip text, preserving source provenance when a
  user inspects an occurrence directly on the main chart.
- Public `measurePriceActionEvidence` now fails closed on malformed, forming,
  duplicate, or out-of-order input instead of silently filtering invalid rows
  and producing apparently valid recurrence statistics.
- Focused home now exports a durable `quantsmart.focused-m5-research-snapshot/1`
  JSON containing source/coverage, selected PDF concept and evidence, detector
  markers, forecast gate values, and the explicit no-live-apply authority. The
  export contains research evidence only and no order instruction.
- Focused Live M5 initializes its source badge as `MT5 HISTORY · VERIFYING` on
  the first render, eliminating the brief misleading fallback label while the
  strict assembled-history promotion request is starting.
- Focused Microscope data requests now bind to a `requestedSymbol` constant of
  `XAUUSD` before the active-symbol normalization effect settles. This closes a
  first-render race where stale persisted symbol state could contaminate the
  MT5 history request or detector provenance.
- Focused research bookmark hydration and writes now share a fail-closed
  normalizer. It rejects malformed IDs, names, timestamps, snapshots, and
  cross-context records; trims names; enforces the 30-record and 2 MiB
  per-record bounds; and evicts oldest entries until the existing shelf is
  within the 6 MiB aggregate local-storage limit. A bookmark is only reported
  as saved when it survives those same checks. Hydration is gated to focused
  mode so the legacy diagnostic route cannot rewrite the focused shelf.
- Focused Source coverage now refreshes the displayed closed-bar age every 30
  seconds while the chart is open and idle. The bounded timer is scoped to the
  focused route and cleaned up on unmount; legacy diagnostic routes do not gain
  a background render loop.
- MicroChart signal hover/focus state is now keyed by candle index, timestamp,
  and concept/label. Multiple PDF concept annotations on the same candle can
  therefore open their own measured popup instead of colliding on a shared
  numeric index. The change is display-only and keeps the shadow/no-decision
  boundary intact.
- The nearest causal mini analogue preview now exposes its matched endpoint UTC,
  observed next closed-bar outcome, and an explicit research-only/no-order
  boundary in both visible copy and the SVG accessible label. A sparkline alone
  no longer looks like an unqualified forecast.
- Legacy Microscope widgets are now lazy-loaded (`PreEventWarning`, MT5 connect,
  CSV import/evidence panels, replay stepper, and realism/truth panels). The
  focused XAUUSD M5 route no longer eagerly includes those diagnostic modules;
  the full `/microscope` route keeps the same render paths behind a Suspense
  boundary. The focused route remains chart-first while legacy compatibility is
  preserved.

## Authoritative constraints

- Use closed OHLC bars only; never include a forming bar in a historical label.
- Keep `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false` visible in research
  surfaces. Do not add order APIs to Pattern Atlas or chart annotation code.
- Preserve MT5 provenance (UTC timestamps, source, coverage, timezone, account
  scope) and fail closed on gaps or malformed bars.
- Do not call the PDF's EUR/USD 20-pip/10-pip example a XAUUSD default. Refit
  costs, target and stop assumptions from XAUUSD evidence.
- Keep the two-year M5 retention boundary explicit in both loader and UI.

## Next implementation queue

1. Exercise the focused MT5-first path against a live terminal and capture one
   verified source-coverage observation; keep the fallback path tested offline.
2. When a dedicated shared view-model seam exists, split the focused chart page
   from legacy diagnostic imports without duplicating Microscope state or
   breaking the full `/microscope` route.
3. Exercise the rendered forecast landmark against a complete MT5 multi-year
   cache once the terminal supplies COMPLETE coverage; retain the current
   PARTIAL-coverage fallback evidence.

## Verification commands

```powershell
npm --prefix mfe_ux_lab/cockpit run typecheck
npm --prefix mfe_ux_lab/cockpit run build
node tests/micro-chart-empty-contract.test.mjs
node tests/microchart-accessibility.test.mjs
node tests/microscope-chart-empty-contract.test.mjs
node tests/pattern-atlas-contract.test.mjs
node tests/price-action-detector.test.mjs
node tests/price-action-knowledge-panel.test.mjs
node tests/focused-m5-surface.test.mjs
node tests/microchart-drawing-persistence.test.mjs
node tests/mt5-history-promotion-gate.test.mjs
node tests/mt5-history-restart-contract.test.mjs
```

Latest session evidence: full unit lane, focused snapshot/surface contracts,
TypeScript typecheck, and production build all passed after the bookmark
hardening. Browser automation was unavailable because the local browser access
host was not running; no runtime visual claim is made from that path.

Update this file at the end of every session with completed changes, evidence,
and the next smallest end-state-aligned step.




## Latest verification and focused-selection fix (2026-11-05)

- Verified the focused research snapshot export feedback. After export, the source-coverage card announces `Snapshot exported · <closed bars> closed bars · <concept count>/10 concepts` through an accessible live status region.
- Removed the selected-concept mini-window fallback that could display the first current marker when the chosen concept had no current marker. Historical concept selections now remain concept-scoped and render their own historical occurrence window or an explicit abstention state.
- Added a focused-surface contract assertion for the concept-scoped marker lookup.
- Verification passed: TypeScript typecheck, focused M5 surface contract (including export feedback and concept-scoped selection), and `git diff --check`.
- Full validation in this session also passed: price-action knowledge panel, microchart accessibility, deterministic detector, production build, and `node scripts/test.mjs --unit`.

Next smallest end-state-aligned step: obtain a real browser/runtime observation if the local browser host becomes available, then exercise the MT5 COMPLETE-coverage path and record its source/coverage badge without claiming visual verification when unavailable.
- Added `tests/focused-m5-snapshot.test.mjs` and included it in the unit lane. The contract protects the durable export schema, provenance and retention fields, forecast gates, and explicit no-order authority.

## Runtime provenance observation (2026-11-05)

- The local read-only MT5 bridge was reachable at `127.0.0.1:8791` and returned healthy authority metadata (`SHADOW_ONLY`, `NO_DECISION`, `live_apply_allowed=false`, `read_only=true`).
- A same-origin XAUUSD/M5 history request through the running cockpit gateway (`/api/mt5/history`) returned `ok=true`, `source=MT5_HISTORY`, `closed_bar_provenance=MT5_CLOSED_BARS`, `forming_bar_included=false`, `coverage_status=COMPLETE`, `server_timezone=UTC`, and `timestamp_basis=UTC` for a one-day request (276 returned closed bars; coverage ratio 0.958333 because the terminal supplied 276 of 288 requested slots).
- This confirms the live bridge contract and provenance path at the HTTP boundary. The browser access host remained unavailable, so no visual browser verification is claimed.

## MT5 provenance diagnostics in focused UI (2026-11-05)

- The focused Source coverage card now exposes assembled MT5 diagnostics after promotion: aggregate coverage ratio and returned/requested bars, chunk/cache hit counts, account cache scope, and actual UTC range.
- These values are rendered only when the strict `MT5_HISTORY_3Y` promotion gate is ready; fallback mode keeps the local snapshot label and does not imply broker completeness.
- Added focused-surface contract assertions for the new diagnostics.
- Verification passed: TypeScript typecheck, focused M5 surface contract, and `git diff --check`.

## Snapshot provenance parity (2026-11-05)

- Focused research snapshot exports now include the verified MT5 assembly diagnostics shown in the UI: promotion state, complete flag, coverage ratio, requested/returned bars, chunks, cache hits/misses, account scope, actual UTC range, server timezone, timestamp basis, closed-bar provenance, and forming-bar exclusion.
- Fallback exports retain a `null` diagnostics object rather than implying broker completeness.
- Verification passed: TypeScript typecheck, focused surface contract, snapshot contract, and production build.

## Historical chart jump inspection (2026-11-05)

- Historical occurrence jumps now center the selected closed bar inside a bounded 220-bar inspection window instead of placing it at the edge. This gives the mini-chart selection a TradingView-style main-chart context.
- The chart announces the focused UTC timestamp via its existing `aria-live` keyboard status and keeps the jump separate from replay cursor state.
- Added accessibility contract assertions for centered focus and timestamp announcement.
- Verification passed: TypeScript typecheck, MicroChart accessibility contract, focused M5 surface contract, and production build.

## Forecast state on chart chrome (2026-11-05)

- Focused MicroChart now accepts the causal forecast research status and renders it in a visible, screen-reader-announced chart status strip: `RESEARCH LANDMARK READY`, `LANDMARK WITHHELD · INSUFFICIENT SUPPORT`, or `WAITING FOR CAUSAL CLOSED-BAR EVIDENCE`.
- Unsupported forecasts still do not draw a price line; the status communicates the abstention while preserving the strict gates and no-order authority.
- Added MicroChart accessibility and focused-surface contract assertions.
- Verification passed: TypeScript typecheck, MicroChart accessibility contract, focused M5 surface contract, and production build.

## Directional mini-chart geometry (2026-11-05)

- The selected historical occurrence mini-chart now derives a local ATR from its closed-bar window and draws research-only ENTRY, TARGET, and INVALIDATION landmarks for directional UP/DOWN observations.
- Neutral observations retain only the pattern marker and measured next-bar outcome; they do not receive directional geometry.
- The mini-chart accessible label names the directional landmarks, and focused-surface contracts protect the geometry and neutral abstention rule.
- Verification passed: TypeScript typecheck, focused M5 surface contract, MicroChart accessibility contract, and production build.

## Pattern census uncertainty (2026-11-05)

- Pattern census rows now expose each concept's measured Wilson confidence interval (`CI95 lower-upper%`) beside occurrences, hit rate, and UP/DOWN/FLAT outcomes.
- Each row has an accessible label containing the same interval and outcome counts, so comparisons do not require opening the selected concept panel.
- Added focused-surface assertions for the interval fields and explanatory column copy.
- Verification passed: TypeScript typecheck, focused M5 surface contract, and production build.

## Directional census comparison (2026-11-05)

- Pattern census rows now include LONG and SHORT hit rates with occurrence counts, alongside CI95 and UP/DOWN/FLAT outcomes.
- Accessible row labels include the directional split, so historical comparison supports the same directional inspection workflow as the selected concept panel.
- Verification passed: TypeScript typecheck, focused M5 surface contract, and production build.

## Knowledge-map search affordance (2026-11-05)

- The PDF knowledge panel now reports the filtered count (`N of 10 indexed concepts`) through a live status region.
- A visible, keyboard-focusable `Clear search` action restores the complete concept map after filtering.
- The panel remains read-only and source-grounded; search state does not alter detector evidence.
- Added knowledge-panel contract coverage for the count and clear action.
- Verification passed: TypeScript typecheck, knowledge-panel contract, focused M5 surface contract, and production build.

## Full census in research snapshot (2026-11-05)

- Focused snapshot export now includes `pattern_census` for every measured concept, preserving name, occurrences, evaluations, hit rate, CI95 interval, recurrence, UP/DOWN/FLAT outcomes, and LONG/SHORT split evidence.
- This makes the exported handoff sufficient to resume historical pattern comparison without reconstructing the on-screen census.
- Snapshot contract now protects every census field.
- Verification passed: TypeScript typecheck, snapshot contract, focused M5 surface contract, and production build.

## Filtered knowledge selection consistency (2026-11-05)

- The PDF knowledge panel now keeps its detail pane aligned with the filtered concept list. If a query hides the chart-selected concept, the panel shows the first matching result instead of a stale hidden selection.
- This is view-only: chart detector selection and evidence state remain unchanged, and clearing search restores the full map.
- Added a contract assertion for filtered selection consistency.
- Verification passed: TypeScript typecheck, knowledge-panel contract, focused M5 surface contract, and production build.

## Historical FLAT outcome state (2026-11-05)

- Historical detector annotations now encode a measured `FLAT` next-bar outcome as `outcome: "flat"` rather than `"pending"`.
- `nextBarOutcome` remains the explicit UP/DOWN/FLAT measurement used by chart labels and mini-chart outcome markers; genuinely current observations continue to use `pending`.
- Added type and focused-surface/accessibility contracts for the distinct FLAT state.
- Verification passed: TypeScript typecheck, MicroChart accessibility contract, focused M5 surface contract, and production build.

## Neutral setup outcome semantics (2026-11-05)

- Historical price-action occurrences whose setup direction is `NEUTRAL` now remain `outcome: "neutral"` when the measured next closed bar is UP or DOWN. They are descriptive observations rather than directional misses, so MicroChart does not imply LONG or SHORT or label them `wrong`.
- A measured `FLAT` next bar remains the separate `outcome: "flat"` state and is rendered by CandleWindow as `NEXT FLAT`; current unresolved observations continue to use `pending`.
- This preserves the chart's `SHADOW_ONLY / NO_DECISION` authority boundary while keeping setup direction and next-bar outcome independent.
- Added focused surface assertions covering neutral, FLAT, and CandleWindow neutral-color rendering.

## Inspection context in snapshot (2026-11-05)

- Focused research exports now preserve the exact inspection context: historical tape visibility, main-chart focus index, preview occurrence index, and the selected occurrence's index/time/direction/next-bar/score.
- This complements the full pattern census and MT5 provenance, so a future session can reconstruct both the evidence and what the user was inspecting.
- Added snapshot contract coverage for every inspection field.
- Verification passed: TypeScript typecheck, snapshot contract, focused M5 surface contract, and production build.

## Calendar-aware M5 retention (2026-11-05)

- The focused M5 display cutoff now uses a UTC calendar two-year subtraction with end-of-month clamping, avoiding a one-day drift around leap years while retaining the explicit two-year boundary.
- Added focused-surface assertions for the calendar cutoff and target-month clamp.
- Verification passed: TypeScript typecheck, focused M5 surface contract, production build, and `git diff --check`.

## Forecast gate detail on chart (2026-11-05)

- Focused chart forecast chrome now includes direction when a landmark is ready and the quantitative gate state in every status: walk-forward evaluations, effective support, independent analogues, and consensus margin.
- Unsupported forecasts still render no price landmark; users can see exactly which support counts are available before interpreting the abstention.
- Added focused-surface contract coverage for the chart status gate context.
- Verification passed: TypeScript typecheck, focused M5 surface contract, MicroChart accessibility contract, and production build.

## Forecast source-health states (2026-11-05)

- Forecast status now distinguishes three abstention causes on the chart: no usable causal Atlas evidence, no retained causal analogues, and analogues present but insufficient support for the landmark gate.
- This keeps the visible research status honest without drawing an unsupported forecast line.
- Added focused-surface coverage for the no-analogue state.
- Verification passed: TypeScript typecheck, focused M5 surface contract, deterministic detector contract, and production build.

## Current-marker reset after historical inspection (2026-11-05)

- Selecting a current detector marker now clears the previous historical occurrence index and main-chart focus. This prevents a stale historical window from remaining centered while the detail pane describes the current setup.
- Added focused-surface coverage for the reset path.
- Verification passed: TypeScript typecheck, focused M5 surface contract, deterministic detector contract, and production build.
## MT5 fallback reason transparency (2026-11-05)

- Focused Live M5 history promotion now preserves a typed fallback reason for rejected/partial MT5 assemblies, offline bridge responses, and request failures.
- The source coverage card shows `Fallback reason` while retaining the explicit local historical fallback label; exported focused snapshots include `mt5_history_state` and `mt5_history_reason`.
- Focused M5 source precedence now reports multi-year verification/fallback state before current live-bar health, so a healthy latest bar cannot imply broker-complete retained history.
- Stable fallbacks include `MT5_HISTORY_PROMOTION_REJECTED` and `MT5_HISTORY_REQUEST_FAILED`; offline bridge errors retain their surfaced error text.
- Verification passed: TypeScript typecheck, focused M5 surface contract, focused snapshot contract, production build, unit suite, and `git diff --check`.
## Historical mini-chart selection guard (2026-11-05)

- Focused pattern inspection now shows a historical mini-chart only after an explicit occurrence selection; selecting a concept or current marker no longer silently previews the latest historical occurrence.
- Neutral detector observations keep a neutral `PATTERN` overlay label and never receive LONG/SHORT research geometry; cross-concept marker fallback remains disabled.
- Verification passed: TypeScript typecheck, focused surface contract, focused snapshot contract, and `git diff --check`.
## Current versus historical signal identity (2026-11-05)

- Chart selection now distinguishes current detector markers from `HIST` tape markers before resolving occurrence indices.
- A current marker cannot accidentally open a historical mini-chart when both signals share the same candle index; only explicit historical annotations open the occurrence preview.
- Added focused-surface coverage for this overlap guard.
- Verification passed: TypeScript typecheck, focused surface contract, focused snapshot contract, and `git diff --check`.
## Focused snapshot resume hardening (2026-11-05)

- Focused home now exposes a read-only `Import / resume snapshot JSON` action using the versioned `quantsmart.focused-m5-research-snapshot/1` parser.
- Resume validates exact XAUUSD/M5 context, rejects unknown PDF concepts, checks occurrence metadata against the loaded detector tape, and keeps imports bounded to 8 MiB.
- Restoration is deferred until detector evidence and closed bars are available; chart focus is clamped to the MicroChart-compatible range and is kept independent from historical occurrence selection.
- Snapshot export normalizes focus index zero to null so exported state can always be re-imported.
- Verification passed: TypeScript typecheck, production build, focused surface/snapshot contracts, detector, MicroChart accessibility, knowledge-panel tests, unit suite, and `git diff --check`.
## Timestamp-stable snapshot focus (2026-11-05)

- Focused snapshots now retain `inspection.chart_focus_time` alongside the chart focus index.
- Resume maps focus by the UTC candle timestamp first, then uses a bounded index fallback when the timestamp is unavailable; this prevents two-year retention changes from silently focusing a different candle.
- Snapshot parsing validates the focus timestamp, while occurrence restore continues to require matching time, direction, and next-bar outcome metadata.
- Verification passed: TypeScript typecheck, focused surface/snapshot contracts, production build, detector/accessibility regressions, unit suite, and `git diff --check`.


## Closed-bar freshness readout (2026-11-05)

- Focused M5 source coverage now shows the latest canonical UTC closed-bar timestamp and a read-only closed-bar age derived from the displayed tape. Malformed, non-UTC, or future timestamps fail closed as unavailable.
- Focused research snapshots export `latest_closed_bar_time` and `latest_closed_bar_age_ms`; the import parser validates both when present.
- Verification passed: focused surface/snapshot contracts, TypeScript typecheck, and `git diff --check`.

## Focused forecast freshness gate (2026-11-05)

- A valid historical fallback can remain available for inspection while its latest closed candle ages beyond the three-bar M5 freshness window. In that state, the focused next-bar direction and chart landmark show `WAITING FOR FRESH CLOSED-BAR EVIDENCE`; historical distributions remain visible as evidence.
- The gate measures age from candle close, rejects malformed, forming, and future timestamps, and applies only to the focused M5 current forecast. Historical replay evidence and `SHADOW_ONLY / NO_DECISION` authority are preserved.
- Verification passed: focused forecast freshness/readout contracts and TypeScript typecheck.

## Focused forecast freshness explanation (2026-11-05)

- The focused M5 next-bar card now spells out whether forecast freshness is `FRESH` or `WITHHELD`, the exact machine reason, latest closed-bar UTC timestamp, measured close age, and the 15-minute gate. This makes stale versus unavailable evidence reviewable at a glance while retaining historical analogue distributions and `SHADOW_ONLY / NO_DECISION` authority.
- Verification passed: `tests/focused-m5-forecast-freshness.test.mjs` and `git diff --check`.

## Drawing lock integrity (2026-11-05)

- Fixed the TradingView-style MicroChart drawing lock: when locked, cursor pan/crosshair remains available but trend, line, fib, rectangle, brush, text, and measure gestures are rejected before a draft is created.
- Added a persistence contract assertion for the lock boundary.
- Verification passed: drawing persistence, MicroChart accessibility, TypeScript typecheck, and `git diff --check`.

## Concept-switch inspection reset (2026-11-05)

- Fixed a focused M5 inspection bug where switching PDF concepts could reuse the prior concept's occurrence ordinal and chart focus, silently showing an unrelated historical candle.
- Changing the selected concept now clears the historical occurrence preview and main-chart focus; a new occurrence must be selected explicitly.
- Added focused-surface contract coverage.
- Verification passed: focused surface contract, TypeScript typecheck, and `git diff --check`.

## Forecast evidence scope transparency (2026-11-05)

- Causal analogue forecast remains bounded to the latest 6,000 closed M5 bars for interactive latency, while the deterministic PDF pattern census continues to scan the full retained two-year tape.
- The focused readout now states the forecast evidence count and UTC window, and snapshots export `forecast_evidence_bars` plus `forecast_evidence_window` so forecast support cannot be mistaken for full-retention coverage.
- Snapshot parsing validates the new scope metadata.
- Verification passed: focused surface/snapshot contracts, TypeScript typecheck, and `git diff --check`.

## Forecast truncation provenance (2026-11-05)

- Forecast scope now exposes retained-bar count, latest forecast-bar count, configured limit, omitted-bar count, truncation state, and UTC window in both the focused readout and exported snapshot.
- This keeps the interactive 6,000-bar latency guard explicit while preserving the full two-year tape for deterministic pattern census statistics.
- Verification passed: focused surface/snapshot contracts, TypeScript typecheck, and `git diff --check`.

## Snapshot focus fallback hardening (2026-11-05)

- Snapshot resume now uses `inspection.chart_focus_time` when that UTC candle exists and falls back to the exported bounded `chart_focus_index` when retention or source data has shifted and the timestamp is absent.
- Forecast scope metadata now includes both a human-readable scope string and explicit truncation compatibility fields; the parser validates them without granting execution authority.
- Verification passed: focused surface/snapshot contracts, TypeScript typecheck, and `git diff --check`.

## Snapshot timestamp equivalence (2026-11-05)

- Snapshot resume now compares focus and occurrence timestamps by UTC instant rather than raw string, so equivalent spellings such as `Z` and `+00:00` restore the same closed candle.
- Added a runtime integrity test and registered it in the focused unit lane.
- Verification passed: snapshot integrity, focused snapshot/surface contracts, TypeScript typecheck, and `git diff --check`.

## Timestamp-anchored chart drawings (2026-11-05)

- New drawings now retain the originating closed-bar UTC timestamp alongside the legacy index. When the retained M5 tape refreshes or its two-year window shifts, timestamped points re-anchor to the same candle; older index-only drawings remain readable.
- Escape now cancels an in-progress drawing draft and announces the cancellation through the chart status region. The interaction contract is registered in the focused unit lane.
- Verification passed: drawing persistence, interaction, accessibility, TypeScript typecheck, and `git diff --check`.

## Concept-scoped historical marker overlap (2026-11-05)

- Historical tape markers now suppress only the same concept at the same candle index. A different PDF concept may share the candle and remains visible, preserving multi-pattern observation instead of hiding it by raw index.
- Added focused-surface contract coverage for concept-scoped overlap.
- Verification passed: focused surface/snapshot contracts, MicroChart accessibility/drawing/interaction contracts, TypeScript typecheck, and `git diff --check`.

## Retention-safe occurrence focus (2026-11-05)

- Historical occurrence selection now tracks UTC identity through retained-tape refreshes, remaps the selected occurrence and main-chart focus when leading bars drop, and clears the preview when the selected candle expires.
- Deferred snapshot restoration now falls back from a missing focus timestamp to its saved bounded index instead of silently dropping chart focus.
- Verification passed: focused surface/snapshot contracts, TypeScript typecheck, and `git diff --check`.

## Deferred focus fallback after retention refresh (2026-11-05)

- Deferred snapshot occurrence restoration now always derives an index fallback from `focusIndex` or `barIndex` when the preferred UTC focus timestamp is unavailable. This preserves chart focus across retention/source refreshes instead of clearing it silently.
- Historical occurrence identity remains timestamp-based during tape refresh, with expiry clearing unrelated previews.
- Verification passed: focused surface/snapshot contracts, full unit lane, TypeScript typecheck, production build, and `git diff --check`.

## Focused MT5 fallback provenance and closed-bar gating (2026-11-05)

- Focused M5 research now filters detector and forecast inputs to completed candles; explicitly forming or future-open bars remain available only as chart presentation context.
- When MT5 three-year promotion is rejected, the focused source readout distinguishes broker retention rejection (`BROKER_RETENTION`) from a terminal Max Bars cap (`TERMINAL_MAX_BARS(<value>)`) while continuing to use the local fallback.
- Verification passed: focused surface/snapshot/integrity contracts, MicroChart persistence/interaction/accessibility contracts, TypeScript typecheck, production build, and `git diff --check`.

## Retention-safe drawing identity (2026-11-05)

- Timestamped MicroChart drawings now re-anchor only to the same retained closed-bar UTC timestamps.
- If a timestamped anchor or any freehand point expires from the retained two-year tape, the ambiguous drawing is removed instead of silently attaching to a different candle by stale index.
- Reconciliation waits for the matching symbol/timeframe drawing set to hydrate, preventing cross-context cleanup during source switches.
- Verification passed: drawing persistence, interaction, accessibility, focused surface/snapshot/integrity, closed-bar, and MT5 retention contracts; TypeScript typecheck; production build; and `git diff --check`.

## Focused MT5 history retry (2026-11-05)

- Focused Live XAUUSD M5 now exposes a read-only `Retry MT5 history` control when three-year closed-bar promotion falls back.
- Retry re-runs the verified promotion gate without reloading the page, remains disabled while verification is in flight, and keeps the local fallback visible until a complete, provenance-verified result is accepted.
- Verification passed: focused surface/snapshot/integrity contracts, MicroChart persistence/accessibility/interaction contracts, TypeScript typecheck, production build, full unit lane, and `git diff --check`.

## Named-candle family historical overlay filter (2026-11-05)

- Historical named-candle overlays can now be filtered by the descriptive family taxonomy (`SINGLE_CANDLE`, `TWO_CANDLE`, `THREE_CANDLE`, `MULTI_CANDLE`) derived from `namedCandleKnowledge`. Exact-pattern and family filters are mutually exclusive, reset the analogue ordinal, and persist as `inspection.analogue_family_filter`. The filter remains historical evidence only: `SHADOW_ONLY / NO_DECISION`.

## Named-pattern analogue snapshot restore (2026-11-05)

- Focused snapshot and bookmark restore retain the named candle filter and endpoint identity. If the saved endpoint is absent from the current bounded tape, the analogue ordinal resets to the first match under the restored filter instead of reusing a stale prior-session index. Evidence remains `SHADOW_ONLY / NO_DECISION`.

## Historical mini-chart navigation boundaries (2026-11-05)

- Earlier/Later controls now disable at the first and last retained occurrence. This makes the bounded historical tape explicit and prevents no-op clicks from silently re-selecting the same candle. The controls remain read-only `SHADOW_ONLY / NO_DECISION`.

## Neutral pattern outcome semantics (2026-11-05)

- Historical occurrences whose setup direction is `NEUTRAL` now use a distinct
  `neutral` marker outcome. A following UP or DOWN candle is descriptive data,
  not a failed directional prediction, so the chart no longer labels it
  `wrong` or implies LONG/SHORT authority.
- The marker popup states that the neutral setup outcome is descriptive only;
  measured `FLAT` outcomes remain separately represented.

## Historical mini-chart/main-chart UTC alignment (2026-11-05)

- Earlier/Later navigation in the selected concept mini-chart now resolves the chosen occurrence timestamp against the current closed M5 tape and moves the main chart focus to that same candle.
- This keeps the detailed historical mini-chart, marker overlay, and TradingView-style main-chart inspection context synchronized through retention shifts.
- Verification passed: focused surface/snapshot/integrity contracts, MicroChart persistence/interaction/accessibility contracts, knowledge-panel contract, TypeScript typecheck, production build, and `git diff --check`.

## Forecast direction fail-closed display (2026-11-05)

- The focused Next-bar observation card now shows `WAIT` until all forecast gates pass, even when a raw analogue consensus has an UP/DOWN majority.
- The underlying UP/FLAT/DOWN distribution and gate counts remain visible as research evidence, while chart landmarks and the directional readout use the same fail-closed readiness rule.
- Verification passed: focused surface/snapshot contracts, MicroChart accessibility, TypeScript typecheck, production build, and `git diff --check`.

## PDF concept relationship network (2026-11-05)

- The machine-readable price-action map now includes six source-anchored directed `relationships` edges connecting concepts such as dominant pressure, support/resistance, buildup, false breaks, tease breaks, pullback reversals, ceiling tests, and round-number magnets.
- The read-only knowledge panel exposes these edges as page-anchored Related concepts links, allowing a user or future AI session to traverse the study graph without rereading the PDF or creating an execution path.
- Verification passed: knowledge-panel relationship integrity/navigation tests, TypeScript typecheck, production build, and `git diff --check`.

## Knowledge-graph search navigation integrity (2026-11-05)

- Related-concept links now clear an active PDF search filter before selecting the destination node, so graph navigation always opens the actual linked explanation instead of leaving a hidden or mismatched detail pane.
- Added a knowledge-panel contract for filter-safe relationship navigation.
- Verification passed: knowledge-panel, focused surface/snapshot tests, TypeScript typecheck, production build, and `git diff --check`.

## Focused home skips legacy research initialization (2026-11-05)

- Added an explicit `enabled` gate to `useResearchBacktest`; focused XAUUSD M5 passes `enabled=false` so idle focused renders do not read legacy research storage or construct backtest requests.
- Legacy `/microscope` callers retain the prior behavior through the default `enabled=true` parameter.
- Added `tests/focused-research-init.test.mjs` covering the focused and legacy contracts.
- Verification passed: focused research-init/surface/snapshot/integrity contracts, TypeScript typecheck, production build, and `git diff --check`.

## PDF knowledge-map attestation in durable snapshots (2026-11-05)

- Focused research snapshot export now records the indexed price-action knowledge-map schema, source SHA-256, source title, and PDF page count alongside the selected concept.
- Snapshot import validates the attestation against the currently indexed map and rejects mismatched schema/hash revisions, preventing a later session from silently mixing notes from a different PDF extraction.
- The knowledge panel exposes the same provenance footer and contract coverage now exercises wrong-revision rejection.
- Verification passed: focused snapshot/snapshot-integrity contracts, knowledge-panel contracts, TypeScript typecheck, production build, and `git diff --check`.

## Focused route defers legacy diagnostic modules (2026-11-05)

- Removed static runtime imports of `brokerCalibration.ts` and `m1MasterData.ts` from `Microscope.tsx`.
- Focused XAUUSD M5 returns before loading either module; the full `/microscope` route dynamically loads calibration, while M1 replay dynamically loads the multi-timeframe master data only when requested.
- Added focused-surface assertions for the absence of static dependencies and the guarded dynamic-import conditions.
- Build now emits separate `brokerCalibration` and `m1MasterData` chunks, keeping those legacy diagnostics out of the focused route's initial module graph.
- Verification passed: focused init/surface/snapshot/integrity contracts, navigation compatibility, TypeScript typecheck, production build, and `git diff --check`.

## MicroChart reset announcement parity (2026-11-05)

- The visible Reset button now uses the same `reset()` path as the keyboard Home shortcut and announces `Recent bars shown.` through the chart live-status region.
- Pointer and keyboard users therefore receive identical confirmation without changing chart data or research authority.
- Added a regression assertion to `tests/microchart-interaction.test.mjs`.
- Verification passed: MicroChart interaction/accessibility contracts, TypeScript typecheck, and `git diff --check`.

## Timestamp-anchored chart viewport persistence (2026-11-05)

- MicroChart now persists the pan/zoom viewport per symbol and timeframe under a bounded, namespaced local key.
- Saved start/end candle timestamps take precedence over numeric indices when the retained two-year tape shifts, so returning to a session preserves the same historical candles when available.
- Malformed state fails closed, indices are clamped to the loaded tape, and writes wait until the matching symbol/timeframe tape has hydrated to avoid cross-context overwrites.
- Reset remains the explicit recent-window escape hatch and existing historical focus/cursor behavior remains authoritative when supplied.
- Added `tests/microchart-viewport-persistence.test.mjs`.
- Verification passed: viewport, drawing-persistence, interaction, accessibility contracts, TypeScript typecheck, and `git diff --check`.

## Durable MicroChart viewport in focused snapshots (2026-11-05)

- Focused research snapshots now retain MicroChart viewport start/end UTC candle timestamps plus bounded index compatibility fields.
- The mounted MicroChart reports its normalized viewport to the focused exporter and accepts a revisioned restore request; timestamp identity wins when retained bars shift, with index fallback for legacy or missing candles.
- Snapshot parsing validates the optional viewport timestamps and indices. The behavior remains read-only research context with no order authority.
- Verification passed: focused snapshot integrity/contract tests, MicroChart viewport persistence contract, TypeScript typecheck, and `git diff --check`.

## Focused UI UTF-8 cleanup (2026-11-05)

- Normalized the focused `Microscope` page and `MicroChart` source from mixed UTF-8/Windows-1252 mojibake to valid UTF-8. TradingView-style arrows, separators, status dots, long/short labels, and research copy now render as their intended characters.
- Added `tests/focused-ui-encoding.test.mjs` and included it in the dataset-free unit lane. The contract rejects replacement characters and common mojibake markers in the focused chart, page, and PDF knowledge-panel sources.
- Verification passed: focused UI encoding, focused M5 surface, MicroChart accessibility, PDF knowledge-panel contracts, TypeScript typecheck, production build, and the full `node scripts/test.mjs --unit` lane.

Next smallest end-state-aligned step: capture a real focused runtime observation when the browser host is available, then exercise the strict COMPLETE MT5 history promotion path without claiming visual verification from static tests.

## Fail-closed bookmark storage (2026-11-05)

- Bookmark hydration now validates every stored record through the focused snapshot parser and keeps only the active symbol/timeframe context. Corrupt, oversized, cross-context, or stale-schema records are removed before rendering.
- Bookmark writes are bounded to 30 records, 2 MiB per record, and 6 MiB aggregate storage. Old records are evicted when the aggregate limit is reached; oversized current research context is refused with an actionable status message.
- Added focused-surface assertions for parser-backed hydration and storage limits. Verification passed: focused surface/snapshot contracts, TypeScript typecheck, production build, and `git diff --check`.

Next smallest end-state-aligned step: capture a real focused runtime observation when the browser host is available, then exercise the strict COMPLETE MT5 history promotion path without claiming visual verification from static tests.

## Named focused research bookmarks (2026-11-05)

- Added a local-only bookmark shelf to the focused XAUUSD M5 surface. Users can name and save the current validated snapshot context, including viewport, drawings, selected PDF concept, historical occurrence, forecast evidence, and provenance state.
- Bookmarks are capped at 30 records, expose restore and accessible delete actions, and restore exclusively through `parseFocusedSnapshot`/`applyFocusedSnapshot`; they cannot bypass knowledge-map, drawing, or read-only authority validation.
- Added focused-surface and snapshot contract assertions. Verification passed: focused snapshot/surface tests, TypeScript typecheck, production build, and `git diff --check`.

Next smallest end-state-aligned step: capture a real focused runtime observation when the browser host is available, then exercise the strict COMPLETE MT5 history promotion path without claiming visual verification from static tests.

## UTC-stable drawing re-anchor (2026-11-05)

- Persisted drawing anchors now validate non-negative integer candle indices, finite prices, and parseable timestamps before hydration.
- Re-anchoring first checks the exact candle timestamp and then falls back to `Date.parse()` instant identity. Equivalent UTC spellings such as `Z` and `+00:00` therefore preserve a drawing on the same candle after snapshot import or tape refresh.
- Added contract coverage for equivalent timestamp identity and invalid negative indices. Verification passed: drawing persistence, focused snapshot contract/integrity tests, TypeScript typecheck, and `git diff --check`.

Next smallest end-state-aligned step: capture a real focused runtime observation when the browser host is available, then exercise the strict COMPLETE MT5 history promotion path without claiming visual verification from static tests.

## Snapshot drawing re-anchor on retained-tape shifts (2026-11-05)

- Focused snapshot drawing restores now run through the same timestamp-aware re-anchor path as local persistence before rendering. A snapshot imported after the retained M5 window advances therefore keeps drawings on their candle identities; expired timestamped anchors are discarded as ambiguous instead of landing on a different candle.
- Added a focused drawing persistence contract assertion for restore-time re-anchoring and retained-bar dependencies. Verification passed: drawing persistence contract, TypeScript typecheck, and `git diff --check`.

Next smallest end-state-aligned step: capture a real focused runtime observation when the browser host is available, then exercise the strict COMPLETE MT5 history promotion path without claiming visual verification from static tests.

## Drawing-aware focused snapshots (2026-11-05)

- Focused M5 snapshot export now includes the interactive MicroChart drawing layer, so trend lines, levels, rectangles, fibs, measures, brushes, and text labels can travel with a research session instead of remaining only in browser localStorage.
- Snapshot import validates drawing kinds, finite anchors, optional UTC candle identities, text/colour bounds, brush point arrays, and the 200-record / 10,000-point limits. Invalid drawing payloads fail closed before they reach the chart.
- MicroChart exposes a restore request and reports normalized drawing state back to Microscope; restored drawings announce `Snapshot drawings restored; SHADOW_ONLY; NO_DECISION.` and retain the read-only boundary.
- Added focused snapshot round-trip and malformed-drawing integrity assertions. Verification passed: snapshot contract/integrity tests, drawing persistence, TypeScript typecheck, production build, and `git diff --check`.

Next smallest end-state-aligned step: capture a real focused runtime observation when the browser host is available, then exercise the strict COMPLETE MT5 history promotion path without claiming visual verification from static tests.

## Fail-closed drawing persistence (2026-11-05)

- MicroChart persisted drawings now pass through a typed fail-closed parser before hydration. Unknown drawing kinds, invalid anchors, malformed freehand point arrays, invalid text payloads, and non-finite coordinates are discarded rather than reaching the re-anchor effect and crashing the chart.
- Freehand drawings are bounded to 10,000 points per record in addition to the 200-record drawing limit, preventing an oversized localStorage payload from degrading the focused chart.
- Clear drawings now announces `All drawings cleared.` through the chart live status while respecting the drawing lock.
- Added drawing persistence contract coverage. Verification passed: drawing persistence, interaction, accessibility, TypeScript typecheck, production build, and `git diff --check`.

Next smallest end-state-aligned step: capture a real focused runtime observation when the browser host is available, then exercise the strict COMPLETE MT5 history promotion path without claiming visual verification from static tests.

## Focused provenance separator cleanup (2026-11-05)

- Corrected focused snapshot import/resume status and chart provenance strings that had degraded to literal `?` separators. The UI now consistently uses readable middle-dot separators for MT5 verification, fallback provenance, and read-only snapshot context.
- Added a focused encoding regression assertion covering the provenance string and rejecting the previous question-mark form.
- Browser visual inspection was attempted, but the browser access host was unavailable; the running HTTP services still report the expected read-only authority health contract.
- Verification passed: focused UI encoding/surface contracts, TypeScript typecheck, production build, full dataset-free unit lane, and `git diff --check`.

Next smallest end-state-aligned step: capture a real focused runtime observation when the browser host is available, then exercise the strict COMPLETE MT5 history promotion path without claiming visual verification from static tests.

## MT5 authorization failure mapping (2026-11-05)

- The read-only bridge now inspects only the safe MetaTrader5 `last_error()` code after a failed `initialize()` call. Known authorization failures (`-6`, including the observed `Authorization failed` condition) map to the stable `MT5_AUTHORIZATION_FAILED` contract; raw SDK messages are never returned or logged.
- Connection status and focused M5 fallback guidance explain that the user should sign in to the broker account in MT5 and retry Auto-Attach. Generic initialization exceptions remain `MT5_INITIALIZE_FAILED`.
- Added bridge and UI contract coverage. Validation passed with the isolated `.venv-mfe` bridge tests, focused connection/surface tests, Python syntax compilation, TypeScript typecheck, production build, and `git diff --check`.

Next smallest end-state-aligned step: capture a real focused runtime observation when the browser host is available, then exercise the strict COMPLETE MT5 history promotion path without claiming visual verification from static tests.

## Focused header reclamation (2026-11-05)

- The canonical XAUUSD M5 home surface now hides the legacy workspace navigation row from the header. Sidebar, sub-navigation, and status bar were already suppressed; this removes the last unrelated navigation cluster and gives the dominant chart more usable horizontal space.
- Legacy routes keep their full workspace navigation unchanged.
- Added a focused-surface contract assertion for the scoped CSS rule.
- Verification passed: focused M5 surface contract, TypeScript typecheck, production build, and `git diff --check`.

Next smallest end-state-aligned step: capture a real focused runtime observation when the browser host is available, then exercise the strict COMPLETE MT5 history promotion path without claiming visual verification from static tests.

## Actionable MT5 fallback guidance (2026-11-05)

- Focused M5 source coverage now translates raw promotion failures into actionable guidance while preserving the original contract code. `MT5_INITIALIZE_FAILED`, `NOT_CONNECTED`, bridge outages, broker retention limits, and terminal Max Bars limits each explain the next recovery step.
- The chart remains explicitly labelled as local fallback until the strict broker-history gate passes; guidance never promotes incomplete data.
- Added focused-surface assertions for the recovery copy.
- Verification passed: focused M5 surface contract, focused UI encoding, TypeScript typecheck, production build, and `git diff --check`.

Next smallest end-state-aligned step: capture a real focused runtime observation when the browser host is available, then exercise the strict COMPLETE MT5 history promotion path without claiming visual verification from static tests.

## Connection status recovery contract (2026-11-05)

- Added `tests/connection-status-ui.test.mjs` and included it in the dataset-free unit lane.
- The shell connection status now has explicit, accessible guidance for initialization failure, auto-attach prerequisites, disconnected terminals, native tooltip state, and screen-reader labels. This keeps the MT5 failure path understandable while focused M5 remains on the labelled fallback tape.
- Verification passed: connection-status contract, full unit lane, TypeScript typecheck, and `git diff --check`.

Next smallest end-state-aligned step: capture a real focused runtime observation when the browser host is available, then exercise the strict COMPLETE MT5 history promotion path without claiming visual verification from static tests.

## Compound MT5 fallback guidance (2026-11-05)

- Focused history fallback guidance now handles compound promotion reasons such as `HISTORY_PARTIAL_CHUNKS · TERMINAL_MAX_BARS(100000)`: the complete raw reason remains visible while the actionable terminal or broker recovery instruction is selected from its detail segment.
- Extracted the mapping into a small pure helper and added a contract test covering terminal-cap, broker-retention, and request-failure paths.
- Verification passed: focused history-failure contract and TypeScript typecheck.

## Focused MT5 verification empty-state clarity (2026-11-05)

- The focused chart intentionally clears its displayed tape while strict MT5 multi-year history promotion is running. The empty chart state now says `Verifying MT5 closed-bar historyâ€¦` and exposes an accessible status label instead of implying that data is missing.
- Genuine empty or insufficient closed-bar data keeps the existing no-data wording. This preserves the fail-closed behavior while making the runtime state transition understandable to users and assistive technology.
- Added focused-surface assertions for the transient verification state. Verification passed: focused-surface contract, TypeScript typecheck, production build, and `git diff --check`.

## Focused forecast horizon binding (2026-11-05)

- The focused Next-bar observation readout now selects the causal H+1 prediction
  by its explicit `horizon` value, matching the forecast gate and consensus
  contract. It no longer assumes the prediction array's first element is H+1;
  this keeps the displayed UP/FLAT/DOWN distribution aligned with the gated
  research direction if horizon ordering changes.
- `tests/focused-m5-forecast-readout.test.mjs` protects the named H+1 binding
  and rejects an incidental `predictions[0]` readout path.

## Knowledge search selection synchronization (2026-11-05)

- Filtering the PDF knowledge panel now reports its first matching concept back
  to the focused Microscope when the chart-selected concept is hidden. The
  detail pane, selected-concept mini-window, and marker overlay therefore stay
  on one concept instead of leaving the chart on a hidden stale selection.
- Added a knowledge-panel contract assertion for the callback synchronization.
- Verification passed: knowledge-panel contract, TypeScript typecheck, and
  `git diff --check`.

## Focused forecast freshness gate (2026-11-05)

- Focused M5 forecast readiness now requires the latest closed candle to have a canonical UTC timestamp, be fully closed and non-future, and be no more than 15 minutes old (three M5 bars from candle close).
- A stale or local fallback tape remains available for historical pattern distributions and recurrence inspection, but its current directional forecast and chart landmark are withheld with `WAITING FOR FRESH CLOSED-BAR EVIDENCE`.
- Added the pure `focusedForecastFreshness` helper and focused freshness contract. Verification passed: forecast-freshness/readout contracts, focused surface contract, TypeScript typecheck, production build, and `git diff --check`.

## Forecast freshness attestation in snapshots (2026-11-05)

- Focused snapshot exports now retain the exact forecast freshness attestation: latest closed-bar UTC, close-age, maximum allowed age, pass/fail state, and reason.
- Snapshot parsing validates this metadata so a resumed research session can distinguish a historical distribution from a current forecast without silently upgrading stale evidence.
- Verification passed: focused snapshot and freshness contracts, TypeScript typecheck, production build, and `git diff --check`.

## Forecast freshness accessibility parity (2026-11-05)

- The focused Next-bar card now derives one complete forecast freshness readout
  and uses it for both visible text and the accessible name. Screen readers
  therefore receive the same `FRESH`/`WITHHELD` state, reason, latest close,
  measured age, and 15-minute gate shown on screen; the live status announces
  changes as the freshness clock advances.
- Extended the focused freshness contract to protect this visible/ARIA parity.

## Focused closed-tape memoization (2026-11-05)

- Memoized the focused closed-bar tape before detector and forecast analysis.
  Unrelated Microscope state updates no longer allocate a new filtered array or
  invalidate the expensive M5 detector and atlas calculations.
- Extended the focused-surface contract to keep the closed-only tape boundary
  and its memoization intact. Authority semantics are unchanged.

## Conflicting same-candle direction abstention (2026-11-05)

- Focused position landmarks now inspect every latest-candle price-action
  concept together. A LONG/SHORT overlay is created only when the latest
  directional concepts unanimously agree.
- If concepts disagree, or only neutral concepts are present, the chart keeps
  the descriptive markers and withholds arbitrary entry, target, and
  invalidation geometry. The focused control bar and price-action readout now
  expose `CONFLICTING DIRECTIONS · ABSTAIN` so the withholding reason is
  visible without inspecting source details. This preserves the read-only
  research boundary.

## Forming-candle cue and brush persistence (2026-11-05)

- The chart now detects a live forming candle even when the broker frame
  replaces the latest row at the same timestamp. It renders that candle
  dashed and faded, labels it `forming-context`, and announces that its OHLC
  is excluded from closed-bar research evidence.
- Freehand brush points now use integer closed-bar anchors plus UTC timestamps.
  Hydration, snapshot restore, and a shifted two-year retention window can
  therefore re-anchor strokes without dropping them or attaching them to an
  unrelated candle.
- Verification passed: MicroChart accessibility, drawing persistence,
  viewport persistence, snapshot integrity, interaction, empty-state,
  TypeScript typecheck, and production build.


## Focused provenance attestation readout (2026-11-05)

- Focused M5 Source coverage now exposes the strict MT5 runtime attestations already required by the promotion gate: `MT5_CLOSED_BARS`, `UTC` timestamp basis, terminal server timezone, and forming-bar exclusion.
- This keeps the chartâ€™s visible provenance aligned with the accepted history payload while preserving `SHADOW_ONLY / NO_DECISION` and the fail-closed fallback path.
- Verification passed: focused M5 surface contract and cockpit TypeScript typecheck.

## Knowledge graph endpoint validation (2026-11-05)

- The PDF knowledge panel now filters relationships unless both `from` and `to`
  IDs resolve to current concepts. Related-concept navigation also validates
  the destination before changing selection, so stale or malformed graph edges
  remain inert and cannot create a phantom detail view.
- Verification passed: `price-action-knowledge-panel` contract, focused surface
  and MicroChart accessibility contracts, cockpit TypeScript typecheck,
  production build, and runtime health (`SHADOW_ONLY / NO_DECISION`).

## Causal analogue mini-candles (2026-11-05)

- The focused nearest-analogue preview now uses a compact OHLC candlestick
  window instead of a close-only sparkline. It marks the matched endpoint and
  draws the measured `NEXT UP`, `NEXT DOWN`, or `NEXT FLAT` candle separately,
  keeping the historical setup and its outcome visually distinct.
- The preview remains descriptive research evidence and retains the
  `SHADOW_ONLY / NO_DECISION` boundary.
- Verification passed: focused M5 surface contract, cockpit TypeScript
  typecheck, and production build.

## Historical analogue position geometry (2026-11-05)

- The nearest analogue candle window now adds descriptive `OBS LONG` or
  `OBS SHORT` entry, target, and invalidation lines when its measured next bar
  is directional. A `FLAT` or unavailable outcome receives no fabricated
  position geometry, and the SVG accessible name states that the overlay is
  historical observation only.
- This keeps historical pattern inspection visually comparable to the main
  chart while preserving the fail-closed current-forecast and order boundary.
- Added focused-surface assertions for directional geometry and flat/outcome
  abstention. Verification passed: focused M5 contract, TypeScript typecheck,
  production build, and runtime health.

## Causal analogue tape navigation (2026-11-05)

- The focused mini analogue panel now keeps a bounded selector over the causal
  match tape instead of pinning the first match forever. Earlier/Later controls
  expose the ordinal and disable at both ends, so users can inspect multiple
  historical examples with their candles, observed outcome, and descriptive
  position geometry.
- Selection resets when the causal tape identity changes and remains
  observation-only under `SHADOW_ONLY / NO_DECISION`.
- Added focused-surface assertions for bounded navigation and edge disabling.

## Causal analogue main-chart focus (2026-11-05)

- Each selected causal analogue now has a `Show on chart` action. The focused
  surface resolves the match endpoint by UTC timestamp against the retained
  detector tape before moving the main chart focus, so retention shifts cannot
  attach the action to an unrelated candle.
- Added a focused-surface contract for timestamp-based mapping. The action
  remains inspection-only and carries no order authority.

## Causal analogue snapshot resume (2026-11-05)

- Focused snapshot exports now retain the selected causal analogue ordinal and
  endpoint UTC timestamp. Import restores by timestamp first and only falls
  back to the bounded ordinal, so a two-year retention shift cannot silently
  reopen a different historical match.
- Snapshot parsing rejects malformed analogue timestamps and negative ordinals;
  the restore remains read-only under `SHADOW_ONLY / NO_DECISION`.

## Forecast uncertainty disclosure (2026-11-05)

- The focused Next-bar card now shows H+1 Wilson 95% intervals for UP, FLAT,
  and DOWN alongside the point distribution and effective support. This makes
  forecast uncertainty visible without inventing a price band from categorical
  probabilities.
- The disclosure is descriptive calibration evidence; the existing freshness,
  support, and consensus gates still control whether a directional landmark is
  rendered.

## Filter changes clear chart endpoint focus (2026-11-05)

- The mini analogue panel now exposes a live status for preview-only, focused, and filter-mismatch states, so keyboard and screen-reader users can tell when the previous chart endpoint was cleared.

- Changing the named-pattern or family filter now clears the prior main-chart endpoint and its UTC focus identity before the new filter is rendered.
- Historical marker selection can immediately establish a new UTC focus after that reset, so the selected mini chart and main chart cannot silently refer to different endpoints.
- A normal closed-bar refresh preserves the selected filter, while UTC reconciliation re-finds the focused endpoint or clears it when retention no longer contains it.
- Added focused-surface regression assertions for the reset helper and UTC identity invalidation.

## Keyboard access for analogue preview (2026-11-05)

- The mini analogue preview is now a keyboard-focusable region with `ArrowLeft` / `ArrowRight` shortcuts and an explicit `aria-keyshortcuts` contract.
- Shortcuts run only when the region itself owns focus, so nested filter buttons and the Show-on-chart control keep their native keyboard behavior.
- The shortcut uses the same bounded UTC selector as Earlier/Later and preserves the read-only research boundary.

## Keyboard analogue navigation follows chart focus (2026-11-05)

- Earlier/Later controls now route through one bounded selector. When the analogue is already focused on the main chart, changing the occurrence updates the chart focus by UTC; preview-only navigation remains mini-chart-only.
- A missing endpoint clears both the UTC identity and chart index instead of leaving a stale focus visible.
- The focused surface contract covers active follow behavior and preserves the read-only research boundary.

## Focused analogue navigation follows UTC (2026-11-05)

- After `Show on chart` activates an analogue endpoint, Earlier/Later navigation now moves the main chart to the newly selected endpoint by UTC timestamp as well as updating the mini chart.
- If the next endpoint is unavailable in the retained detector tape, the chart focus identity is cleared and the panel returns to preview-only status.
- Added a focused-surface contract for this active-follow behavior.

## Causal analogue focus status (2026-11-05)

- The selected analogue control now exposes `aria-pressed` and a visible live
  status showing whether its endpoint is focused on the main chart or remains
  preview-only. The active state compares UTC timestamps, so a missing endpoint
  cannot be reported as focused merely because an old index happens to match.
- Added focused-surface assertions for the active/preview-only state and its
  accessible announcement.

## Causal analogue chart marker (2026-11-05)

- When a selected analogue is focused on the main chart, MicroChart now draws a
  dedicated dashed UTC context marker with its endpoint price, ordinal, and
  observed outcome. It is a separate annotation type from `SignalMarker`, so
  historical context cannot be mistaken for a current setup or order signal.
- The marker is screen-reader described as historical context only and
  disappears when the UTC focus no longer matches the selected analogue.

## Causal analogue match quality (2026-11-05)

- The mini analogue panel now discloses similarity, normalized distance, and
  whether the selected match shares the current regime and UTC session. A
  `regime fallback` or `session fallback` is visible instead of letting a
  distant historical match look equivalent to a close contextual match.
- The same quality text is included in the mini chart accessible name and
  remains descriptive research evidence under `SHADOW_ONLY / NO_DECISION`.

## Causal analogue named-pattern disclosure (2026-11-05)

- The mini analogue preview now exposes the named candlestick patterns carried
  by each causal match (for example `HAMMER`, `ENGULFING`, or `INSIDE_BAR`).
  This connects the historical OHLC window to the pattern taxonomy instead of
  showing an unlabeled candle sequence.
- When no named pattern was recorded, the panel says so explicitly; no pattern
  label is inferred from the chart image.

## Causal analogue named-pattern filter (2026-11-05)

- The focused mini analogue preview now exposes an observation-only filter row
  for named patterns present in the retained causal match tape, plus an `All`
  reset. Each filter uses `aria-pressed`, and changing it resets the bounded
  Earlier/Later selector to the first matching endpoint.
- Filtering only changes which historical analogue is inspected; it does not
  alter the forecast consensus, current pattern detector, chart marker
  semantics, or `SHADOW_ONLY / NO_DECISION` authority boundary.
- Verification passed: focused M5 surface, detector, microchart accessibility,
  snapshot/integrity contracts, TypeScript typecheck, production build, diff
  check, and runtime health.

## Causal analogue empty-filter handling (2026-11-05)

- Pattern-filter controls now remain visible even when the active named pattern
  has zero retained causal matches. The panel explains the empty result and
  keeps `All` available so the researcher can recover without refreshing.
- The empty state remains observation-only and does not change forecast,
  detector, or chart authority semantics.

## Causal analogue filtered outcome distribution (2026-11-05)

- The mini analogue panel now computes the observed H+1 outcome distribution
  for the active historical tape, showing UP, FLAT, and DOWN counts with
  percentages. When a named-pattern filter is active, this distribution is
  conditioned on that filtered analogue set.
- The readout is explicitly descriptive historical evidence and is excluded
  from the main causal forecast consensus and all order semantics.
- Verification passed: focused surface, detector, accessibility, snapshot,
  TypeScript, production build, diff check, and runtime health.

## Causal analogue filter snapshot persistence (2026-11-05)

- Focused research snapshots now retain `inspection.analogue_pattern_filter`
  alongside the selected analogue endpoint ordinal and UTC timestamp.
- Import validates the filter, restores it before resolving the endpoint, and
  keeps a valid empty filter visible if the current retained tape has no match.
  Timestamp identity still takes precedence over a stale ordinal.
- Snapshot integrity coverage rejects blank filters and accepts valid named
  patterns; the authority boundary remains read-only.

## Causal analogue filter-only resume fix (2026-11-05)

- Deferred snapshot restoration now keeps a named-pattern filter pending even
  when the snapshot has no saved analogue ordinal or endpoint timestamp. This
  preserves an empty historical filter state while the Atlas loads instead of
  silently reverting to `All`.
- Verification passed: focused surface, snapshot and integrity contracts,
  detector, accessibility, TypeScript, production build, diff check, and
  runtime health.

## Causal analogue outcome uncertainty intervals (2026-11-05)

- The active analogue tape's UP / FLAT / DOWN H+1 distribution now includes
  Wilson 95% intervals and an explicit observed sample size. This prevents a
  small named-pattern subset from reading like a precise forecast.
- The interval readout remains historical, descriptive evidence and does not
  alter the gated causal forecast consensus or any order semantics.
- Verification passed: focused surface, detector, accessibility, snapshot,
  TypeScript, production build, diff check, and runtime health.

## Causal analogue filter support counts (2026-11-05)

- Named-pattern filter chips now show the number of unique retained causal
  endpoints carrying each pattern and sort by that support count, then name.
  Accessible labels include the same endpoint count before filtering.
- Counts use one contribution per pattern per endpoint, so overlapping named
  detectors do not inflate a chip's support denominator.
- Verification passed: focused surface, detector, accessibility, snapshot,
  TypeScript, production build, diff check, and runtime health.

## Named-pattern snapshot taxonomy validation (2026-11-05)

- The candle analogue engine now exports its stable `NAMED_CANDLE_PATTERNS`
  registry for cross-module validation.
- Focused snapshot parsing rejects invented or misspelled
  `analogue_pattern_filter` values instead of accepting a filter that can never
  match the Atlas tape. Valid empty-result filters remain allowed when the
  taxonomy value is real but absent from the retained tape.
- Verification passed: snapshot integrity and contract tests, focused surface,
  detector, accessibility, TypeScript, production build, diff check, and
  runtime health.

## Named-pattern conditional lift readout (2026-11-05)

- When a named-pattern filter is active, the mini analogue panel now compares
  its observed UP and DOWN H+1 rates with the unfiltered retained analogue tape
  in percentage points. The comparison is labeled descriptive and reports
  unavailable when either tape has no observed outcomes.
- The conditional comparison is not fed into the main forecast consensus and
  cannot create a directional landmark or order authority.
- Verification passed: focused surface, detector, accessibility, snapshot,
  TypeScript, production build, diff check, and runtime health.

## Current closed-bar named-pattern shortcuts (2026-11-05)

- The focused mini analogue panel now lists the named candle patterns detected
  on the current closed M5 bar and exposes each as a one-click historical tape
  filter. The pressed state makes the active shortcut clear, and the existing
  pattern support counts remain visible in the adjacent full taxonomy row.
- When the current bar has no named pattern, the panel states that explicitly;
  no label is inferred from the chart image.
- The shortcut only changes historical inspection context and preserves the
  `SHADOW_ONLY / NO_DECISION` forecast and order boundary.
- Verification passed: focused surface, detector, accessibility, snapshot,
  TypeScript, production build, diff check, and runtime health.

## Current named-candle chart annotations (2026-11-05)

- The main focused XAUUSD M5 chart now annotates named candle patterns detected
  on the latest closed bar alongside the existing PDF price-action concepts and
  historical evidence markers.
- Named-candle markers use a distinct cyan presentation and `CANDLE · PATTERN`
  labels so the named taxonomy remains visually separate from deterministic
  PDF-concept annotations.
- Selecting a named-candle marker opens that pattern's causal analogue filter
  in the research panel; the action only changes historical inspection context.
- Marker labels and callbacks remain observation-only under
  `SHADOW_ONLY / NO_DECISION`; no marker can authorize an order or live apply.
- Verification passed: focused surface, detector, microchart accessibility,
  snapshot and integrity contracts, cockpit TypeScript typecheck, production
  build, diff check, and runtime health.

## Named candle marker semantics (2026-11-05)

- Focused MicroChart annotations for named candle patterns now display `CANDLE · OBS` instead of `LONG · OBS` or `SHORT · OBS`; the marker remains descriptive and carries no order direction.
- Their accessible label exposes the measured shape as UP, DOWN, or NEUTRAL while retaining the explicit `SHADOW_ONLY / NO_DECISION` boundary.
- Added focused-surface contract coverage for the visible and screen-reader marker semantics.

## Named-pattern conditional H+1 evidence readout (2026-11-05)

- The focused M5 readout now surfaces the candle-pattern Atlas posterior for
  every named pattern detected on the latest closed bar: UP / FLAT / DOWN H+1
  probabilities, Wilson intervals when available, raw sample support, effective
  support, and shrinkage.
- Each row is clickable and reuses the existing causal analogue filter, keeping
  chart inspection and the conditional evidence on the same pattern.
- The readout explicitly labels this as descriptive conditional evidence. Named
  pattern posteriors never vote into the aggregate forecast consensus and never
  create LONG/SHORT order authority; the surface remains `SHADOW_ONLY /
  NO_DECISION`.
- Named-candle chart annotations now use `CANDLE · OBS` labels and announce
  measured shape `UP`, `DOWN`, or `NEUTRAL`, avoiding an implied order direction.
- Verification passed: focused surface, detector, microchart accessibility and
  interaction contracts, cockpit TypeScript typecheck, production build, and
  diff check.

## Filtered historical named-pattern markers (2026-11-05)

- Selecting a named candle filter now adds its retained causal endpoints to the
  main focused chart as `HIST CANDLE · PATTERN` observation markers.
- Historical markers carry the measured next closed-bar outcome (UP, DOWN or
  FLAT). Selecting one aligns the mini analogue preview to that endpoint by UTC
  timestamp, so the chart marker, mini window and outcome record refer to one
  historical candle.
- The overlay is bounded by the selected named-pattern filter and remains
  descriptive evidence; it does not create an execution signal or contribute a
  vote to the aggregate forecast.

## Snapshot analogue ordinal reset (2026-11-05)

- Snapshot and bookmark restore now reset the analogue ordinal when a saved
  endpoint is expired, missing, or absent from the restored pattern filter.
  A no-match filter cannot inherit the prior session's selected analogue.
- This prevents a stale ordinal from silently displaying an unrelated historical
  window after retention shifts or filter changes.
- Verification passed: focused surface, snapshot, snapshot-integrity,
  detector, accessibility, interaction, knowledge-panel contracts, TypeScript,
  production build, diff check, and runtime health.

## Historical tape visibility applies to named-pattern overlays (2026-11-05)

- The shared `HIST TAPE ON/OFF` control now gates both PDF concept history and
  filtered `HIST CANDLE` named-pattern endpoints on the focused chart.
- Turning the tape off removes historical named-candle markers while preserving
  the current closed-bar pattern, conditional evidence readout, and analogue
  filter selection for inspection.
- The toggle remains local research presentation state and cannot change the
  forecast consensus or order authority.
- Verification passed: focused surface, snapshot/integrity contracts, cockpit
  TypeScript typecheck, production build, diff check, and runtime health.

## Named-candle taxonomy lens coverage (2026-11-05)

- The focused named-candle lens now derives structure, descriptive meaning, and abstain wording for every value in `NAMED_CANDLE_PATTERNS` (48 entries), including multi-candle gap and continuation families.
- Every entry states that the taxonomy is descriptive evidence only and has no order or decision authority; neutral, malformed, incomplete, or context-conflicted shapes remain abstention cases.
- Added focused contract coverage to keep the lens exhaustive as the runtime taxonomy evolves.

## Named-candle explanation lens (2026-11-05)

- Added a complete descriptive knowledge registry for every named candle in the
  Atlas taxonomy. Each entry carries family, OHLC structure, observational
  meaning, and explicit abstain guidance.
- The focused readout now shows the selected pattern's lens next to its
  conditional H+1 evidence and historical overlay count. The lens is resolved
  from a fail-closed lookup, so unknown or stale pattern IDs render no invented
  explanation.
- Wording deliberately describes pressure, balance, rejection, or compression
  as observations. It does not turn a candle label into a LONG/SHORT command,
  aggregate forecast vote, or execution authority.
- Verification passed: named-candle knowledge contract, focused surface,
  cockpit TypeScript typecheck, production build, diff check, and runtime health.

## Named-candle family classification correction (2026-11-05)

- Corrected the descriptive lens family for `ABANDONED_BABY`,
  `BULLISH_STICK_SANDWICH`, and `TASUKI_GAP` variants from two-candle to
  three-candle sequences.
- Added explicit taxonomy assertions so the lens cannot silently misdescribe
  these multi-candle structures while the detector registry evolves.
- No forecast, marker direction, or order semantics changed; this is metadata
  and explanation quality only.
- Verification passed: named-candle knowledge, focused surface, TypeScript,
  production build, diff check, and runtime health.

## Named-candle family filter validation (2026-11-05)

- Family controls use the typed taxonomy label helper across the mini analogue UI, preventing parser and TypeScript regressions while preserving readable `SINGLE CANDLE`, `TWO CANDLE`, `THREE CANDLE`, and `MULTI CANDLE` labels.
- Snapshot import applies pattern and family predicates consistently, including legacy snapshots that contain both fields; unresolved or expired endpoints reset to ordinal zero rather than inheriting stale selection.
- Verification passed: named-candle knowledge, focused surface, snapshot, snapshot-integrity, TypeScript typecheck, production build, `git diff --check`, and runtime health. Runtime remains `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

## Family analogue lift scope (2026-11-05)

- Family-filtered analogue outcomes now report `Family <label> vs all-tape lift` using the selected family denominator, matching the exact-pattern statistics semantics.
- The comparison remains descriptive evidence only and stays outside aggregate forecast consensus and order authority.
- Verification passed: focused surface and snapshot contracts, TypeScript typecheck, and `git diff --check`.

## Named-candle family explanation lens (2026-11-05)

- Added fail-closed descriptive metadata for all four named-candle families, including structure, meaning, and abstention guidance.
- The focused readout now shows the family lens when a family filter is active, so family-level statistics have an explanation context alongside the historical overlay and lift readout.
- Family wording explicitly remains `SHADOW_ONLY / NO_DECISION` and cannot establish LONG or SHORT authority.

## Named-pattern directional win-rate readout (2026-11-05)

- Current named-pattern evidence now includes a directional H+1 win-rate derived from the pattern's measured UP or DOWN orientation, with its Wilson interval when available.
- Neutral patterns explicitly report `directional win-rate N/A (neutral setup)` and retain the full UP / FLAT / DOWN distribution instead of being forced into a win/loss classification.
- The metric is descriptive historical evidence only and remains outside aggregate forecast consensus and order authority.

## Win-rate context carried into analogue preview (2026-11-05)

- The selected named-pattern directional win-rate now appears in the mini analogue readout and its accessible chart label, keeping the exact pattern statistic attached to the historical window being inspected.
- Family filters explicitly state that they use distribution-only evidence rather than a fabricated single directional win-rate.


## Shared directional readout contract (2026-11-05)

- Microscope historical filtered-tape statistics now call the same `namedPatternDirectionalReadout` helper as Pattern Atlas. The helper maps bullish patterns to UP, bearish patterns to DOWN, and neutral patterns to `N/A`.
- Microscope still reports the raw filtered endpoint distribution (`raw observed n`); Pattern Atlas still reports its shrinkage-aware posterior and effective Wilson support. The orientation semantics are shared without pretending the denominators are identical.
- Added a regression fixture for a bearish historical distribution with a DOWN interval, alongside the bullish, neutral, and unseen cases.

## Pattern Atlas directional win-rate parity (2026-11-05)

- Pattern Atlas current named-pattern rows now expose the same orientation-aware H+1 directional win-rate used by the focused Microscope panel, including the Wilson interval when available.
- Neutral named patterns explicitly report directional win-rate N/A (neutral setup); the accessible row label carries the rate, H+1 distribution, support state, and descriptive-only boundary.

## Historical marker win-rate context alignment (2026-11-05)

- Clicking a historical `HIST CANDLE` marker now computes directional win-rate from the active filtered analogue tape itself, so a pattern that is absent on the current bar still receives the correct historical statistic.
- Neutral patterns and empty H+1 support remain distribution-only with explicit `N/A` wording; no inferred order direction is created.

## Historical marker filtered-tape win-rate alignment (2026-11-05)

- Clicking a historical named-candle marker now computes directional win-rate from the active filtered analogue tape, so a pattern absent on the current bar still receives the correct historical statistic.
- Neutral patterns and empty H+1 support remain distribution-only with explicit `N/A` wording; no inferred order direction is created.
- Pattern Atlas rows share the same orientation-aware directional win-rate semantics and read-only boundary.

## Pattern Atlas directional win-rate parity (2026-11-05)

- Pattern Atlas named-pattern rows now use the same orientation mapping as the focused Microscope panel, with Atlas rates calculated from the six-observation empirical-Bayes posterior and Microscope filtered-tape rows retaining raw observed outcomes. Both expose Wilson intervals where available and explicit neutral `N/A` handling.
- Accessible labels include the directional rate, UP / FLAT / DOWN distribution, support and read-only evidence boundary.
- This is descriptive historical evidence only and remains outside forecast consensus and order authority.
- Row copy now discloses the denominator contract: `n` is matching named-pattern endpoints, the displayed rate is the six-observation empirical-Bayes posterior, and the Wilson 95% interval uses overlap-adjusted effective support plus that prior. Neutral rows remain `N/A`; all rows stay descriptive and excluded from timeframe vote.
## Current price-action geometry freshness gate (2026-11-05)

- Current PDF-derived LONG/SHORT research landmarks now resolve through `focusedPriceActionGeometry.ts`. On the focused XAUUSD M5 surface, a landmark requires one unanimous latest-candle direction, promoted `ready` MT5 history, and a fresh closed-bar tape under the existing 15-minute forecast gate.
- Local fallback and stale tapes continue to expose descriptive PDF markers and historical mini-chart evidence, but they cannot produce current entry, target, or invalidation geometry. Conflicting or neutral latest markers abstain.
- Historical analogue geometry remains descriptive and is intentionally unaffected by the current-tape gate.
- Added `tests/focused-price-action-geometry.test.mjs` covering stale/fallback withholding, unanimous fresh allowance, conflicting and neutral abstention, and unfocused diagnostic behavior.
- Verification passed: focused surface, snapshot, snapshot-integrity, named-candle knowledge, Pattern Atlas contract, focused geometry regression, cockpit typecheck, production build, and `git diff --check` (warnings are pre-existing line-ending notices).
## Forecast landmark promotion gate (2026-11-05)

- The focused M5 forecast line now requires both fresh closed-bar evidence and `verifiedM5HistoryState === "ready"`. A fresh local fallback can remain visible as historical evidence, but it cannot draw a current forecast landmark while MT5 history is loading or has fallen back.
- Forecast withholding now distinguishes `WAITING FOR VERIFIED MT5 HISTORY` from stale closed-bar evidence. The existing `WAIT` observation and read-only boundary remain intact.
- Added focused surface assertions for the promotion gate and explicit fallback status copy.
- Verification passed: focused forecast freshness, focused surface, TypeScript typecheck, production build, and `git diff --check`.
## Explicit current geometry abstention copy (2026-11-05)

- The focused Price-action readout now explains why current LONG/SHORT geometry is withheld: MT5 verification loading, local fallback, stale or unavailable closed bars, conflicting latest directions, or neutral/non-unanimous markers.
- When all gates pass, it states that the current research geometry is allowed from unanimous direction on fresh promoted MT5 history.
- This is a communication-only improvement over the existing fail-closed resolver; it preserves `SHADOW_ONLY / NO_DECISION` and does not change historical analogue geometry.
- Added focused surface contract coverage for the explicit fallback, stale, conflict, neutral, and allowed-state copy.
## Accessible current geometry summary (2026-11-05)

- The focused Price-action readout now exposes a live accessible status summary for current research geometry: direction, entry reference, target reference, and invalidation reference when all gates pass.
- When geometry is withheld, the same status announces the exact abstention reason through `role="status"` and `aria-label`, so chart-only lines do not hide the evidence state from keyboard and assistive-technology users.
- Values remain descriptive research references only; no execution authority or order action was added.
- Verification passed: focused surface, focused forecast freshness, focused geometry, TypeScript typecheck, production build, and `git diff --check`.
## Keyboard-accessible current concept navigator (2026-11-05)

- The focused Price-action readout now lists one button per currently detected PDF concept, ordered by its latest closed-bar occurrence. Each control exposes the measured direction and `inspect PDF lens` action.
- Activating a concept button reuses the same marker-selection path as chart clicks, keeping the PDF definition, evidence tape, historical mini-chart, and pattern window synchronized.
- This closes the pointer-only gap for current concept inspection while preserving the existing chart arrow-key navigation and descriptive-only boundary.
- Added focused surface assertions for the concept navigator and shared selection path.
## Snapshot selected-concept taxonomy validation (2026-11-05)

- Focused snapshot parsing now validates `selected_concept` against the indexed PDF knowledge-map IDs before any restore consumer can use it. Empty, malformed, or invented concept IDs fail closed.
- This hardens bookmark/import integrity for the keyboard concept navigator and keeps restored PDF lenses tied to the attested source graph.
- Added snapshot-integrity coverage for valid, unknown, and malformed selected-concept values.
## Delegated hardening and toolbar accessibility pass (2026-11-05)

- Delegated three parallel audits. The MicroChart agent added a roving tab stop for the vertical drawing toolbar, wrapped ArrowUp/ArrowDown navigation, Home/End jumps, synchronized focus after clicks, and explicit `aria-keyshortcuts`/tool titles. Regression coverage lives in `tests/microchart-toolbar.test.mjs`.
- The data/geometry agent closed a sub-second future-bar leak: focused M5 filtering and forecast freshness now require the candle close to be at or before the reference clock with no one-second grace window. This prevents a still-forming candle from entering detector or forecast evidence.
- The snapshot/knowledge agent added exact research-only authority validation, complete PDF source provenance checks, and selected-concept taxonomy binding. I tightened it further so selected-concept snapshots require indexed source title and page count, while legacy snapshots without a selected concept remain readable.
- Verification passed: toolbar, focused closed-bar, forecast freshness, snapshot contract/integrity, focused surface, price-action geometry, named-candle knowledge, Pattern Atlas, TypeScript, production build, and `git diff --check`.
## Parallel deep-audit pass (2026-11-05)

- Chart interaction agent fixed mouse marker selection drift: clicking a signal now synchronizes the roving annotation index, live status, keyboard navigation origin, and parent concept selection. Regression coverage is in `tests/microchart-interaction.test.mjs`.
- M5 data agent hardened closed-tape integrity: any eligible closed candle with non-finite or inconsistent OHLC geometry invalidates the focused research tape instead of silently splicing the row out of ATR, detector, or analogue calculations.
- Snapshot agent hardened optional `selected_concept_knowledge`: present payloads must match the selected indexed concept and exact PDF page anchors; legacy snapshots that omit the field remain readable.
- Shared snapshot authority is now exported from `focusedSnapshot.ts` and used by Microscope export, preventing authority-string drift.
- Verification passed: focused closed-bar, forecast freshness, snapshot contract/integrity, MicroChart interaction/toolbar, focused surface, price-action geometry, TypeScript, production build, and `git diff --check`.
## Parallel persistence and knowledge UX pass (2026-11-05)

- Drawing restore now waits for at least two retained closed bars before consuming a snapshot restore nonce. This prevents asynchronous retention shifts from applying drawings to stale numeric indices.
- The PDF knowledge panel now restores keyboard focus to the destination concept after relationship navigation rerenders the list, and exposes the active concept with `aria-current="page"`.
- Snapshot concept payloads remain source-attested by exact concept ID and PDF page anchors; the focused snapshot parser rejects tampered payloads while preserving legacy omission compatibility.
- Verification passed: drawing persistence, knowledge-panel contract, focused closed-bar, forecast freshness, snapshot contract/integrity, focused surface, price-action geometry, MicroChart interaction/toolbar, named-candle knowledge, Pattern Atlas, TypeScript, production build, and `git diff --check`.
## Parallel viewport, knowledge validation, and evidence pass (2026-11-05)

- Viewport persistence now refreshes when retained interior candle timestamps change, even if tape endpoints are unchanged. Nonce-less snapshot restores use a UTC/index restore key so retention rerenders cannot repeatedly reset user pan/zoom.
- Added `priceActionKnowledge.ts` as a fail-closed validator for the bundled PDF map: exact research-only authority, source hash/year/page bounds, concept cues and abstain fields, relationship endpoints/kinds/anchors, and setup-family structure. The knowledge panel refuses to render an invalid map.
- The forecast denominator audit found no additional safe change this pass; existing gates remain effective support, independent analogue count, walk-forward count, margin, MT5 promotion, and freshness.
- Verification passed: viewport persistence, knowledge-map validation/panel, focused closed-bar, forecast freshness, snapshot contract/integrity, focused surface, price-action geometry, MicroChart interaction/toolbar, named-candle knowledge, Pattern Atlas, TypeScript, production build, and `git diff --check`.
## Parallel responsive, graph-anchor, and MT5 contract pass (2026-11-05)

- At viewport widths up to 480px, the focused MicroChart now moves its drawing toolbar above the plot into a horizontally scrollable strip. Roving keyboard navigation and trailing controls remain available; the plot keeps full width.
- Knowledge-map relationship validation now requires each edge's cited PDF pages to overlap at least one endpoint concept's anchored pages, preventing globally valid but semantically unrelated citations.
- MT5 closed-history promotion now requires the current `MT5_HISTORY_CONTRACT_VERSION`; legacy bridge payloads cannot be promoted into the focused chart and fall back to the labelled local snapshot.
- Verification passed: responsive chart, knowledge-map validation/panel, MT5 promotion gate, viewport/drawing persistence, focused closed-bar, forecast freshness, snapshots, focused surface, geometry, MicroChart interaction/toolbar, named-candle knowledge, Pattern Atlas, TypeScript, production build, and `git diff --check`.

## Parallel provenance, graph rendering, and drawing integrity pass (2026-11-05)

- MT5 advisory and live-bundle responses now disclose `source: NONE` plus an explicit descriptive-only source message when no forecast provider is connected; `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false` remains attached. Frontend typings carry the disclosure fields.
- Knowledge graph relationship cards now render directed `From -> To` endpoints, edge label and kind, destination endpoint, and cited edge pages with accessible labels. Navigation still clears filters and restores keyboard focus.
- Timestamped chart drawing anchors now require timezone-bearing ISO values that are finite and not in the future. Snapshot and persisted drawing rehydration re-anchor by UTC identity and discard anchors newer than the retained tape; legacy index-only drawings remain supported.
- Verification passed: 55 bridge unit tests, focused UI/snapshot/knowledge/chart suites, cockpit TypeScript, production build, Python compile, and `git diff --check`.
## Focused route and monochrome toolbar pass (2026-11-05)

- Canonical hash normalization now rewrites blank, unknown, and legacy hashes to `#home`, while preserving explicit diagnostic routes. Browser history uses `replaceState`, so stale bookmarks do not create extra back-stack entries.
- Removed the hidden duplicate `research-atlas` Pattern Atlas route and its lazy App branch; legacy `research-atlas` links resolve to the focused XAUUSD M5 home surface.
- The MicroChart selected-tool state now uses a neutral black/white scoped token instead of saturated cyan, keeping the TradingView-like chart theme consistent while retaining readable semantic colors for market direction.
- Verification passed: navigation, focused M5 surface, chart empty/theme, accessibility, toolbar tests, TypeScript, and `git diff --check`.
## Canonical hash edge-case hardening (2026-11-05)

- Canonical route parsing now strips repeated leading/trailing slashes and whitespace before resolving aliases, so links such as `#/debugger/?panel=errors` preserve the valid diagnostic route while `#/pattern-atlas/` still resolves to the focused home chart.
- Added navigation regression coverage for trailing-slash legacy and valid routes.
## Inclusive MT5 backfill correction fix (2026-11-05)

- Fixed UTC normalization of timezone-less internal keys: canonical `YYYY-MM-DDTHH:mm:ss` values are already UTC and are no longer reparsed in the host's local timezone.
- MT5 backfill remains explicit-UTC and provenance-gated, but now merges the inclusive left boundary so broker OHLC corrections replace persisted rows deterministically.
- Verification passed: market-data sync, closed-bar validation, and live-tail provenance tests. The broad unit lane then reached the pre-existing focused UI encoding failure in `Microscope.tsx`.



## Data correction and encoding cleanup pass (2026-11-05)

- Inclusive MT5 backfill now retains the exact broker correction at the left boundary, with UTC-safe normalization for canonical timezone-less keys and strict closed-bar provenance unchanged.
- Repaired invalid CP1252 bytes and mojibake in the focused Microscope surface and replaced replacement characters in the session record, restoring UTF-8 integrity for visible research labels.
- Verification passed: full dataset-free unit lane, focused UI encoding, market-data sync, MT5 closed-bar/live-tail provenance, navigation, cockpit TypeScript, production build, bridge tests, and `git diff --check`.
## Chart density, retention integrity, and setup-lens graph pass (2026-11-05)

- Focused mobile layout now uses the 48px header budget directly: at <=640px the XAUUSD M5 chart uses `calc(100dvh - 94px)`, preserving a larger inspection area while the drawing toolbar remains accessible.
- M5 display retention moved to a dedicated UTC helper. Calendar subtraction clamps leap days correctly; malformed or noncanonical timestamps are excluded fail-closed and cannot disable the two-year cap. The helper is covered in the unit lane.
- PDF setup families now carry source-grounded `concept_ids`. The validator rejects unknown or duplicate links, and the knowledge panel exposes read-only Source concept lenses that navigate to the indexed definitions.
- Verification passed: full dataset-free unit lane, retention, focused surface, responsive chart, knowledge-map/panel, UI encoding, TypeScript, production build, and `git diff --check`.

## Focused chart-only and drawing history pass (2026-11-05)

- Focused XAUUSD M5 now offers a reversible chart-only mode through the control bar or `Alt+C`. The versioned session preference is scoped to the focused route, collapses surrounding evidence panels while retaining chart controls, and preserves `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.
- MicroChart drawing edits now have bounded, lock-safe session undo/redo (100 snapshots), accessible toolbar controls, and `Ctrl/Cmd+Z`, `Ctrl/Cmd+Shift+Z`, or `Ctrl/Cmd+Y` shortcuts. New edits clear the redo branch; persisted drawings remain namespaced per symbol/timeframe while edit history resets on reload or context switch and follows UTC re-anchoring.

## PDF source-anchor hardening (2026-11-05)

- The PDF knowledge validator now rejects out-of-range, duplicate, or descending concept and relationship pages, and requires every relationship citation to overlap and remain within its endpoint concept anchors. Setup families must resolve to indexed concept IDs.
- Focused snapshot provenance now binds selected concepts to the indexed map schema, PDF hash, title, page count, and exact concept page anchors; malformed or tampered source payloads fail closed while legacy snapshots that omit optional concept payloads remain readable.

## Latest validation status (2026-11-05)

- Passed focused chart-only, drawing history, drawing persistence, PDF knowledge-map, PDF knowledge-panel, focused snapshot, and snapshot-integrity contracts; cockpit TypeScript typecheck, production build, and `git diff --check` also passed.
- The build completed with existing large-chunk warnings. No browser visual observation was made in this pass.

## Focused shell cleanup and source protection pass (2026-11-05)

- The canonical XAUUSD M5 home now hides the unrelated workspace jump palette trigger while diagnostic routes retain it. Shell glyphs and labels are covered by the UTF-8 audit, and focused inline semantic colors are forced through a scoped grayscale guard so the TradingView-like black/white surface cannot drift chromatic.
- The PDF map's `buildup` concept now records the source-grounded protection rule from printed pp. 14â€“15: place protection beyond the last distinctive buildup high/low and abstain when that protection would require an unusually wide stop. This remains descriptive evidence under `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.
- Verification passed: full dataset-free unit lane, strict language audit (308 files, 0 remaining issues), focused UI/surface/chart-only/knowledge-map contracts, cockpit typecheck, production build, and `git diff --check`. Live browser inspection was unavailable because the environment URL verification gate blocked the browser surface.

## Canonical shell and snapshot restore hardening (2026-11-05)

- The home shell now exposes only the Cockpit group; legacy diagnostic workspaces remain reachable by direct hash and command search without competing with the single-purpose XAUUSD M5 surface.
- Snapshot import now clears stale transient viewport and drawing restore requests when the incoming schema-compatible snapshot omits those optional fields. A later retention refresh can no longer reapply an older session's pan or drawings.
- Verification passed: navigation compatibility, focused snapshot/integrity, drawing and viewport persistence, focused surface/chart-only contracts, and `git diff --check`.

## Forecast support fail-closed correction (2026-11-05)

- Focused next-bar direction and chart landmarks now require `validateForecastSupportDenominators(...).ok` in addition to the existing freshness, walk-forward, effective-support, independent-analogue, and margin gates. Incoherent persisted or replayed causal support remains inspectable as evidence but reports `WAITING · INCONSISTENT CAUSAL SUPPORT` and cannot expose LONG/SHORT geometry.
- Added focused surface regression coverage for the malformed-support path. Verification passed: forecast denominator, focused surface, cockpit typecheck, and `git diff --check`.

## Live-tail authority and analogue identity pass (2026-11-05)

- Pattern Atlas live-tail refreshes now require the complete read-only authority attestation (`SHADOW_ONLY`, `NO_DECISION`, `live_apply_allowed=false`, `read_only=true`) before extending the retained M5 research tape. Closed-bar and version checks remain mandatory.
- Historical mini-chart selection now reanchors its transient identity to the resolved UTC occurrence after a two-year retention shift, preventing an ordinal from jumping to a neighboring pattern window.
- Removed the unreachable focused co-trade initialization/render path and its dynamic legacy import; diagnostic routes keep their separate behavior. Verification passed: live-tail provenance, retention-alignment, focused research-init/surface, detector tests, typecheck, and `git diff --check`.

## Chart keyboard shortcuts and partial-tape fail-closed pass (2026-11-05)

- MicroChart letter shortcuts now work when the chart canvas itself has focus (`C/T/H/F/R/B/X/M`), while modified shortcuts remain reserved. Tool selection announces the read-only authority boundary and the canvas advertises the full shortcut set through `aria-keyshortcuts`.
- Pattern Atlas now withholds partial or provenance-failed live tapes from pattern census, H1 context, mini charts, tail counters, and loaded-bar metadata; incomplete coverage remains visible as diagnostics but cannot masquerade as usable evidence.
- Removed stale fixed-millisecond retention test assumptions after the focused page moved to the calendar-aware M5 retention helper. Full dataset-free unit lane, focused accessibility/Pattern Atlas/live-tail contracts, typecheck, and `git diff --check` passed.

## Live refresh provenance, viewport identity, and lens-clearing pass (2026-11-06)

- `/bars` refreshes now merge into an existing live bundle only when the response matches the requested symbol/timeframe and carries its own verified closed-bar attestation; wrong or unverified payloads clear the live surface instead of inheriting trusted metadata.
- M5 retention validates even a single row fail-closed, so malformed one-row inputs cannot bypass the calendar window. Valid single-row tapes remain supported.
- MicroChart viewport persistence now reanchors by UTC candle identity when retained rows shift and follows an appended live tail while preserving the visible width. Snapshot and drawing authority remain unchanged.
- Explicitly restored `selected_concept: null` now clears the PDF knowledge lens instead of falling back to the first marker; an undefined selection still seeds the initial marker for a fresh session.
- Verification passed: live-workspace provenance, M5 retention calendar, viewport reanchor/persistence, focused snapshot and knowledge-panel contracts, cockpit TypeScript, and the dataset-free unit lane. Production build and strict language audit remain queued for this pass.
- Pattern Atlas semantic audit confirmed directional readouts expose posterior/denominator/Wilson support and treat neutral/unseen cases as descriptive N/A; chart accessibility audit reconfirmed modifier-safe canvas shortcuts and live authority announcements.

## Knowledge-map title attestation and regression-lane completion (2026-11-06)

- The PDF knowledge-map validator now requires a non-empty top-level map title. A missing title weakens cross-session provenance and is rejected before any concept lens is rendered.
- The dataset-free unit runner now includes the live `/bars` provenance merge contract and viewport timestamp re-anchor contract, keeping the latest fail-closed fixes in the default regression lane.
- Verification passed: knowledge-map validation, live-workspace provenance, viewport re-anchor, full unit lane, cockpit typecheck, production build, strict language audit, and `git diff --check`.

## Focused position-geometry chart contract (2026-11-06)

- The focused Microscope still passes gated descriptive LONG/SHORT entry,
  target, and invalidation geometry into `MicroChart`; the chart labels those
  lines as research observations and keeps the `SHADOW_ONLY / NO_DECISION`
  boundary. This wiring is now protected by
  `tests/focused-position-geometry-chart.test.mjs`, alongside the existing
  freshness, MT5-promotion, and current-geometry abstention contracts.
- Verification passed: `node tests/focused-position-geometry-chart.test.mjs`.

## Position geometry overlay wiring pass (2026-11-06)

- Focused chart LONG/SHORT research geometry is now passed into MicroChart alongside existing analytical lines. When the direction gate is valid, the chart renders descriptive entry, target, and invalidation landmarks; when the gate is stale, conflicted, unsupported, or neutral, those lines remain withheld.
- Added `focused-position-geometry-chart` regression coverage and included it in the default unit lane. Authority remains `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.
- Verification passed: focused position geometry, full dataset-free unit lane, cockpit typecheck, production build, strict language audit, and `git diff --check`.

## Responsive chart rail breakpoint pass (2026-11-06)

- The focused MicroChart toolbar now stacks above the plot through 639px viewport width, rather than waiting until 479px. This preserves usable candle width on small tablets and large phones while keeping the control rail horizontally scrollable.
- Verification passed: MicroChart responsive contract and focused M5 surface contract.

## Current-marker analogue focus reset pass (2026-11-06)

- Selecting a current price-action or named-candle marker now clears both the historical chart index and the UTC analogue focus identity. Previously the index cleared but the retained identity could be reapplied by a later tape refresh, moving the chart back to stale historical context while the detail pane described the current setup.
- Added a focused-surface regression assertion. Verification passed: focused M5 surface contract and cockpit TypeScript typecheck.

## Forecast/analogue state cleanup pass (2026-11-06)

- Removed duplicate focused LONG/SHORT geometry lines from the MicroChart prop path; the shared `visLines` composition is now the single source of chart research lines and the regression rejects duplicate wiring.
- Clearing a current marker now clears both the historical chart index and the stored analogue UTC identity, preventing a later refresh from jumping back to a stale historical analogue while the panel describes the current setup.
- Forecast line gating was re-audited: stale, partial, fallback, or inconsistent causal support keeps `forecastDirection` null and exposes a WAITING status without chart geometry.
- Verification passed: focused position geometry, focused surface, responsive chart, cockpit typecheck, and HTTP smoke check against the running local server.

## Snapshot analogue preview/focus separation pass (2026-11-06)

- Snapshot restore now treats `analogue_match_time` as mini-chart preview identity only. The main chart analogue focus identity is restored only when it matches the serialized `chart_focus_time` and resolves to a valid retained UTC candle.
- Preview-only snapshots therefore cannot silently move the main chart to an old analogue after import or retention refresh.
- Verification passed: focused snapshot, focused surface, cockpit TypeScript, and `git diff --check`.

## Snapshot preview-only analogue isolation pass (2026-11-06)

- `analogue_match_time` in a saved snapshot now remains mini-chart preview identity. The main chart only restores an analogue endpoint when it also matches `chart_focus_time` and resolves to a valid retained candle, preventing preview snapshots from silently recentering the main chart.
- Current-marker selection continues to clear both index and UTC analogue focus state.
- Verification passed: full dataset-free unit lane, focused snapshot/surface/geometry contracts, cockpit typecheck, production build, strict language audit, HTTP smoke check, and `git diff --check`.

## Drawing localStorage bound hardening pass (2026-11-06)

- Local persisted drawing hydration now enforces the same 160-character color bound already required by focused snapshot parsing. Oversized or malformed localStorage records are discarded before they reach React state or SVG rendering.
- Added the bound to the MicroChart drawing persistence contract. Undo/redo, UTC re-anchoring, and read-only authority are unchanged.
- Verification passed: drawing persistence/history contracts, cockpit TypeScript, and `git diff --check`.

## Cross-context bookmark durability pass (2026-11-06)

- Focused bookmark hydration previously filtered the active symbol/timeframe and rewrote the shared local shelf, silently deleting valid bookmarks from other focused contexts. The shelf now validates and retains all contexts durably while rendering only the active context; save/delete operations also mutate the full shelf.
- Added `focused-bookmark-context` regression coverage and included it in the default unit lane. Snapshot validation and read-only authority remain unchanged.

## MT5 connector recovery and persistence hardening pass (2026-11-06)

- The live bridge had been running under the system Python interpreter while the project `.venv-mfe` contained the MetaTrader5 SDK. Restarting the MT5 launcher with the managed environment restored terminal attachment without touching the MT5 terminal or account.
- Verified live status: `connected=true`, account `218692591`, server `Exness-MT5Real29`; XAUUSD symbol resolution succeeds and `/live_bundle?symbol=XAUUSD&tf=M5` returns verified closed bars with `forming_bar_included=false` for research consumers.
- Drawing hydration now rejects oversized persisted color strings, and focused bookmarks preserve the full cross-context shelf while filtering only the visible active context. Both changes retain read-only authority.
- Verification passed: drawing persistence/history, focused bookmark context, cockpit typecheck, and live MT5 status/symbol/bundle smoke checks.

## Focused source badge state alignment (2026-11-06)

- The focused Live/M5 source indicators now follow promoted-history state independently of terminal attachment. While the bounded request is running, the history indicator is `MT5 HISTORY · VERIFYING`; on promotion it is `MT5 CLOSED · 2Y VIEW`; and on rejection or an unavailable request it is `LOCAL SNAPSHOT · FALLBACK`. This keeps fallback provenance visible even when the shell still has an attached terminal.
- The separate Live connection badge reports `MT5 / 2Y CLOSED` or `MT5 · HISTORY FALLBACK` when the terminal is attached, and `SIM · MT5 offline` only when it is not attached. These labels describe connection and history state; they do not change the forecast or geometry authority gates.
- The focused source indicator's color and tooltip carry the same state. The knowledge-map schema, source hash, and concept anchors are unchanged by this connector/UI fix.
- Verification passed: focused M5 surface contract and cockpit TypeScript typecheck.

## Focused MT5 fallback and analogue neutrality pass (2026-11-06)

- Focused live mode can intentionally disable the general live workspace poller while MT5 remains attached. The focused source badge now consults the shared terminal attachment state before labelling the surface `SIM · MT5 offline`, so a connected terminal with incomplete history is shown as MT5 history fallback.
- Historical analogue mini charts now map outcomes explicitly: UP uses the bullish accent, DOWN uses the bearish accent, and FLAT/UNAVAILABLE use a neutral text color so non-directional outcomes are not visually presented as wins.
- Verification passed: focused M5 surface contract, cockpit typecheck, production build, and dataset-free unit lane, plus targeted authority/provenance tests. Authority remains `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.


## Closed-bar authority attestation hardening (2026-11-06)

- `isVerifiedClosedBarWindow` now rejects live-tail payloads unless all four read-only markers are explicit: `SHADOW_ONLY`, `NO_DECISION`, `live_apply_allowed=false`, and `read_only=true`.
- This prevents connection-health and history catch-up paths from merging a payload with missing or contradictory execution authority into trusted research history.
- Regression coverage was added for missing and contradictory markers; targeted live-workspace, feed-health, catch-up, promotion, cache, and snapshot authority suites pass.

## Focused legacy status isolation pass (2026-11-06)

- The inactive `ResearchJobStatus` widget is now lazy-loaded and rendered only on the legacy full `/microscope` route. Focused XAUUSD M5 home no longer loads or renders that unrelated job surface while legacy diagnostics remain route-compatible.
- Focused architecture assertions cover the lazy import and `!focused` render boundary.

## Unused geometry overlay cleanup (2026-11-06)

- Removed an obsolete generic invalidation-line constant from `Microscope.tsx`; the focused chart now has one visible line composition source (`visLines`) for forecast, position geometry, and broker evidence.
- This removes dead overlay code without changing the gated descriptive geometry contract.

## Connection badge read-only semantics pass (2026-11-06)

- The shell connection badge and tooltip now say `read-only market data` and distinguish a current M15 closed-bar feed from terminal attachment alone. This prevents an attached MT5 terminal from being mistaken for an execution-capable or research-current feed.
- The health probe continues to validate the same closed-bar provenance contract used by research consumers.

## Named-candle family endpoint count pass (2026-11-06)

- Family overlays can attach multiple named-pattern labels to one historical UTC occurrence. The focused readout now reports unique family endpoints while preserving every descriptive marker; exact pattern filters retain their exact marker count.
- This keeps the displayed denominator aligned with historical family statistics and mini-chart navigation.

## Expired viewport anchor safety pass (2026-11-06)

- Timestamped MicroChart viewport restores now treat an expired `startTime` or `endTime` as an invalid identity and fall back to the recent retained edge. They no longer reuse the stale numeric index to focus an unrelated candle after the two-year retention window shifts.
- Legacy index-only viewport payloads continue to use bounded numeric fallback. Viewport persistence/reanchor, interaction, and responsive contracts pass.



## Unfiltered analogue denominator disclosure pass (2026-11-06)

- The mini analogue panel's unfiltered state now says `all causal analogues`; the denominator includes causal endpoints without named-pattern labels, so the UI no longer claims every endpoint is a named pattern.

## Future-dated live-tail cache rejection pass (2026-11-06)

- Pattern Atlas now rejects future-dated in-memory live-history cache entries instead of treating negative cache age as fresh after a clock rollback or tab suspension. Only finite, non-negative, TTL-valid cache age can reach tail merge.
- Live-tail provenance and viewport persistence/reanchor contracts pass.

## Screenshot-driven focused UI polish pass (2026-11-06)

- The focused XAUUSD M5 empty/verification state now renders a chart-grid card with explicit verification versus no-data copy, retained closed-bar count, and an inline accessible `Retry MT5 history` action. The retry control disables itself and announces progress while MT5 history promotion is running.
- The focused `Chart only` control now has a dedicated responsive class, compact text sizing on desktop, a visible keyboard focus ring, and a full-width 36px touch target on narrow screens. `Alt+C`, `aria-pressed`, and the read-only authority labels remain intact.
- Workspace render and service failures now use a route-aware fail-closed card with bounded technical details, explicit recovery actions, and a focused-chart escape route. Saved data remains untouched; diagnostics are disclosed behind `Technical details`.
- The analogue denominator contract was made encoding-stable so the unfiltered panel explicitly describes `all causal analogues` and its causal endpoint count.
- Verification passed: focused empty-chart, chart-only, focused M5 surface, workspace-error-boundary, MicroChart responsive contracts, cockpit TypeScript typecheck, production build, and `git diff --check`. Native/browser visual QA remains unavailable in this environment, so these UI claims are source/test verified only.

## Focused UTF-8 readability cleanup pass (2026-11-06)

- Repaired mojibake introduced in focused shell/page/knowledge labels, including arrows, separators, ellipses, status glyphs, and Vietnamese session notes. The UI encoding contract now passes across Layout, Microscope, MicroChart, PDF knowledge panel, and session state.
- This is presentation-only: chart data, authority gates, provenance, and live-readonly behavior are unchanged.
- Verification passed: full dataset-free unit lane, focused UI encoding, cockpit typecheck, production build, and `git diff --check`.

## Live MT5 reconnect smoke pass (2026-11-06)

- Reattached the managed `.venv-mfe` bridge through the local read-only request path. `/api/mt5/connect` returned a REAL account attachment for `218692591` on `Exness-MT5Real29`, with `trade_allowed=false` and the unchanged `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false` authority.
- `/api/mt5/live_bundle?symbol=XAUUSD&tf=M5&n=3` returned `ok=true`, broker symbol `XAUUSD`, three UTC closed bars, `source=MT5_CLOSED_BARS`, `forming_bar_included=false`, and read-only authority markers.

## Focused refresh and accessibility hardening pass (2026-11-06)

- During focused MT5 history promotion/retry, the chart now fails closed even if a previous two-bar tape is still present in React state. This prevents a stale chart flash before the new provenance is accepted.
- The empty chart surface is now a navigable `region` with a concise `M5 chart status` label. Only the explanatory copy is an atomic polite live region; the Retry button remains an independent keyboard control.
- Verification passed: full unit lane, focused empty/status/accessibility/chart-only/encoding contracts, responsive chart contract, workspace error contract, cockpit typecheck, production build, and `git diff --check`.
- Runtime smoke remains healthy: MT5 attached to account `218692591` / `Exness-MT5Real29`; XAUUSD M5 bundle returns closed UTC bars with no forming bar and read-only authority.

## Chart-first viewport reclaim pass (2026-11-06)

- Focused chart-only mode now uses the available viewport more aggressively: wide screens use `100dvh - 104px`, tablets use `100dvh - 108px`, and phones retain the safer `100dvh - 94px` control/header reserve.
- The change is scoped to `[data-focus-surface="m5-chart"]` and `[data-chart-only="true"]`; legacy routes and chart authority are unaffected.
- Responsive and focused-surface contracts, TypeScript, and production build pass. Native browser screenshot inspection was attempted through Orca but the browser access host was unavailable, so visual claims remain source/test verified.

## Signal-panel layout stability pass (2026-11-06)

- Focused `.ms-chart` is now isolated with `flex: 0 0 auto` and `contain: layout`, so expanding PDF concept details, historical statistics, or analogue readouts below the plot cannot shrink or jump the measured chart viewport.
- The change remains scoped to focused surface layout and does not alter signal evidence, forecast gates, or read-only authority.
- Verification passed: focused chart-only and M5 surface contracts plus cockpit TypeScript typecheck. Full validation is rerun below this session pass.

## Signal overlap and knowledge-panel density pass (2026-11-06)

- Multiple PDF/named-candle signals landing on one candle are now fanned horizontally by a bounded 16px offset and clamped inside the SVG plot. Screen readers receive an ordinal such as `overlapping marker 2 of 3`; roving keyboard order and shadow-only authority remain unchanged.
- The PDF knowledge panel now opens in a compact summary by default. `Show details` / `Hide details` exposes the searchable concept list, source-grounded lens, setup family steps, related graph edges, and attestation on demand, keeping the chart-first home visually focused.
- Verification passed: overlap accessibility, MicroChart accessibility, knowledge-panel, focused encoding, focused chart layout, cockpit typecheck, production build, and `git diff --check`.

## Focused interaction accessibility pass (2026-11-06)

- The drawing toolbar now points assistive technology to the chart's shared keyboard instructions and exposes a high-contrast `:focus-visible` ring on the dark chart skin.
- Narrow charts now clamp signal captions inside the plot, suppress crowded labels until a marker is hovered or focused, and keep the underlying marker hit target plus spoken overlap ordinal available.
- The PDF knowledge panel now labels its details region, restores focus to the details toggle when collapsed, closes with Escape, and keeps the authority/toggle row usable on narrow screens. Concept buttons also expose a visible keyboard focus ring.
- The focused panel and chart remain read-only `SHADOW_ONLY / NO_DECISION`; these changes affect presentation and keyboard navigation only.
- Verification passed: focused overlap/accessibility/responsive/encoding contracts, knowledge-panel contract, cockpit typecheck, and `git diff --check`.
# Focused snapshot clipboard handoff (2026-11-06)

- Focused Microscope now exposes `Copy snapshot JSON`, sending the exact validated research snapshot payload to the browser clipboard for a quick share or review handoff. Success and clipboard failure are announced through the existing status region; the payload remains `SHADOW_ONLY / NO_DECISION` and no execution path is added.
- Verification: focused surface contract and TypeScript typecheck.

## Focused status, provenance and handoff pass (2026-11-06)

- The forecast status strip now uses the chart skin stylesheet, wraps on narrow widths, and keeps one atomic accessible `role=status` announcement with the `SHADOW_ONLY · NO_DECISION` boundary.
- Analogue preview state now reports `On chart` only when its selected endpoint has an explicit matching UTC chart-focus identity; coincident detector focus cannot masquerade as an analogue focus.
- Focused Microscope exposes `Copy snapshot JSON` alongside export/import, using the same validated snapshot payload and announcing clipboard success or fallback without adding execution authority.
- Repaired remaining MicroChart mojibake and syntax regressions across empty states, live quote labels, marker captions, trade overlays, and keyboard readouts. The focused UTF-8 contract now scans the chart source successfully.
- Verification passed: focused surface, snapshot, analogue identity, MicroChart accessibility/status, focused encoding, cockpit typecheck, and `git diff --check`.

## Focused mobile and fail-closed architecture pass (2026-11-06)

- The chart drawing rail now switches its actual flex direction to horizontal on narrow screens, so the responsive scroll strip no longer gets overridden by the desktop inline column layout.
- Current price-action concepts now expose one atomic status derived from the same conflict, freshness, history and geometry gates as the chart overlays. Directional labels can remain descriptive while the status explicitly says `ABSTAIN`, `WAIT`, `STALE`, `NEUTRAL`, or `READY`.
- Broker deal polling was moved behind a lazy `LegacyBrokerEvidence` wrapper. The focused XAUUSD M5 home bypasses that unrelated broker overlay hook entirely; the legacy Live Microscope route keeps the previous deal/position behavior.
- Verification passed: focused surface, price-action readout/geometry, MicroChart responsive/accessibility/interaction, encoding, typecheck, production build and full unit lane. Authority remains read-only `SHADOW_ONLY / NO_DECISION`.

## Focused resume, mobile readout and invalidation cleanup pass (2026-11-06)

- Snapshot resume now rejects a saved `chart_focus_index` outside the retained closed-bar tape instead of restoring an invalid or unrelated candle.
- Pattern census rows wrap long metrics and stack label/metrics below 500px, removing horizontal overflow from the focused mobile readout while leaving forecast gates unchanged.
- The disabled focused `useLiveWorkspaceQuery` path no longer subscribes to terminal-generation invalidations; legacy callers keep the existing subscription behavior.
- Verification passed: focused snapshot-bounds, responsive/readout, research-init, surface, encoding, full unit lane, cockpit typecheck, production build and `git diff --check`.


## Focused provenance score and compute isolation pass (2026-11-06)

- Current PDF concept controls now show a bounded geometry evidence score (for example `82% geometry score`) in visible text and accessible labels, alongside the human-readable source concept and PDF page anchors.
- Focused XAUUSD M5 now exits before live-advice derivation; legacy Live Microscope behavior remains available behind its existing route path. This keeps the focused chart computation read-only and avoids unrelated advice work.
- Updated the source-name contract test to track the score-bearing accessible label. Full unit lane, cockpit TypeScript typecheck, and production build pass after the change.
- Authority remains `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`; no broker execution path was added.

## Focused chart navigation and analogue comparison pass (2026-11-06)

- Added TradingView-style `PageUp`/`PageDown` navigation to the focused chart. Each key moves one full visible viewport, preserves zoom, clamps to the retained two-year M5 tape, and announces the UTC range through the chart status region.
- Narrow-screen evidence popups now stay inside the chart plot, wrap long PDF/statistical copy, and use the monochrome chart elevated surface so the price axis remains visible.
- The mini analogue area now includes a side-by-side inspection strip for the current closed bar and selected historical endpoint, including concept, direction, geometry score, PDF pages, UTC/H+1 outcome, similarity, and an explicit preview-only versus main-chart focus state.
- Registered `knowledge-panel-compare` in the full unit lane. Targeted contracts, full unit lane, cockpit typecheck, production build, and `git diff --check` pass. Authority remains `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

## Focused touch, forecast and legacy-graph cleanup pass (2026-11-06)

- Added bounded two-finger pinch zoom to the focused MicroChart. The initial midpoint anchors the candle identity, pinch distance changes zoom, midpoint drift pans, and pointer cancellation/lift clears drafts without changing read-only authority.
- The focused next-bar card now has explicit UP/DOWN/WAIT direction, H+1 UP/FLAT/DOWN probability meters, confidence margin, and individually scannable walk-forward/support/analogue/margin gate chips. The existing atomic freshness and `SHADOW_ONLY / NO_DECISION` statuses remain authoritative.
- Removed eager CSV parser/storage imports from the focused Microscope graph. Legacy CSV metadata and view loading dynamically import only behind non-focused CSV guards; the production build emits a separate `csvImports` chunk.
- Added and registered focused contracts for touch gestures, forecast overlay clarity, and CSV lazy loading. Full unit lane, cockpit typecheck, production build, targeted contracts, and `git diff --check` pass.

## Focused provenance, touch cancellation and text cleanup pass (2026-11-06)

- Added an accessible closed-bar provenance strip directly above the focused chart. It reports exact latest UTC, source, forecast withheld/pass state, and WF/support/analogue/margin gates while retaining `SHADOW_ONLY / NO_DECISION` semantics.
- Cancelled pinch gestures now announce their cancellation explicitly to screen readers and clear drafts safely.
- Removed another eager focused-route dependency: the legacy CH episode builder is now loaded only when a non-focused card explicitly requests the episode lens; the chart keeps presentation colors locally.
- Repaired remaining focused Microscope/MicroChart mojibake and restored readable separators, arrows, dashes, and legacy stage glyphs. Full unit lane, targeted contracts, typecheck, build, and `git diff --check` pass.
- Follow-up build verification moved the CH episode builder into its own `chEpisodeSegments` chunk by changing MicroChart to a type-only episode import plus local presentation colors; the focused chart no longer keeps that legacy runtime module in its eager chunk.

## Focused chart polish and current-pattern explanation pass (2026-11-06)

- The canonical XAUUSD M5 focused home no longer shows the global theme toggle; the chart-only surface keeps its fixed scope while legacy diagnostic routes retain theme switching.
- The MicroChart Measure tool now uses a cancellable ref-backed timer. Starting a second measurement cancels the first expiry, and unmount cleanup prevents stale callbacks from clearing a newer preview.
- Current pattern readout now explains the detected human-readable PDF concept, detector reason, indexed source pages, and explicit ABSTAIN copy when no closed-bar concept is active. The readout remains descriptive and `SHADOW_ONLY / NO_DECISION`.
- Registered `pattern-census-focus`, `microchart-measurement`, and `current-pattern-explanation` in the default unit runner so future sessions verify these behaviors automatically.
- Verification passed: targeted tests, full `npm test`, cockpit typecheck, production build, and runtime suites. Native browser visual inspection remains unavailable in this environment.

## Chart-only default, focused mount cleanup and test-lane hygiene pass (2026-11-06)

- Focused home now defaults to chart-only on first render. An explicit session value of `0` restores the research context; the versioned preference and toggle remain reversible.
- Focused Microscope no longer mounts the legacy left/right context columns at all. Market State, KIDI, liquidity, quick actions, context-now, indicators and active-zones remain available only on the full diagnostic route, reducing startup work and keeping the chart dominant.
- Current marker controls now show the human-readable PDF concept, normalized detector reason, geometry score and source pages. The LONG/SHORT research geometry readout keeps entry, target and invalidation in a readable sequence and states that the entry is the latest closed-bar close.
- Registered `current-marker-explanation-detail`, `workspace-error-boundary`, and `test-runner-registration` in the default unit lane; the release allowlist includes the same contracts.
- Verification passed: full `npm test`, focused chart-only/compute-cleanup/current-marker/visible-copy contracts, cockpit typecheck, production runtime suites, and `git diff --check`.

## Focused provenance, drawing visibility and dead-compute cleanup pass (2026-11-06)

- Current concept provenance now includes the closed-bar UTC anchor, descriptive PDF boundary, knowledge-map schema, indexed source title, and SHA-256 attestation. This makes a saved signal explainable across sessions without re-reading the PDF.
- MicroChart drawing visibility now announces `Drawings hidden; annotations remain saved.` or `Drawings shown.` with the `SHADOW_ONLY / NO_DECISION` boundary. The eye toggle changes presentation only and never deletes persisted drawings.
- Removed an unused multi-timeframe advice assignment and an unreachable advisor-loading branch from Microscope; focused and legacy route behavior stays unchanged.
- Registered the source-attestation contract in the default test runner. Full `npm test`, focused interaction/provenance/cleanup tests, cockpit typecheck and runtime suites pass.

## Focused forecast gate breakdown pass (2026-11-06)

- The focused XAUUSD M5 next-bar overlay now names each readiness gate directly: HISTORY, FRESHNESS, walk-forward, support, independent analogues, margin, and CAUSAL META. This makes withheld evidence diagnosable without implying a tradable signal.
- Gate readiness booleans are computed once and reused by the visible chips; stale, fallback, incomplete, or denominator-incoherent evidence remains `WAIT` and fail-closed.
- Added `focused-forecast-overlay-clarity` assertions and kept the overlay `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.
- Verification passed: focused forecast overlay/status/readout/freshness contracts, full `npm test`, cockpit typecheck, production build, and `git diff --check`.

## Focused empty-chart keyboard pass (2026-11-06)

- When verified closed-bar history is unavailable, the focused M5 chart placeholder is now keyboard focusable and exposes a visible focus ring. This keeps the fail-closed loading/no-data state discoverable without adding live-region noise to the chart shell.
- Legacy diagnostic empty states keep their existing status behavior, and the focused copy still states `SHADOW_ONLY | NO_DECISION`.
- Added and registered `focused-empty-chart-focus`; targeted accessibility contracts, cockpit typecheck, and `git diff --check` pass.

## Focused chart inspection pass (2026-11-06)

- SVG pattern and shadow-trade annotations now retain roving keyboard focus with a visible monochrome focus ring, making TradingView-style evidence navigation discoverable without changing the read-only boundary.
- Historical pattern mini-windows now expose each retained closed candle's UTC timestamp and exact OHLC values through `data-candle-*` attributes and an SVG title. This makes the mini chart inspectable in browser tooling and assistive technology while preserving `SHADOW_ONLY · NO_DECISION`.
- Added and registered `microchart-annotation-focus` and `focused-pattern-window-ohlc` contracts. Targeted tests, full runner registration checks, cockpit typecheck, and `git diff --check` pass.

## Focused historical pattern OHLC inspection pass (2026-11-06)

- Historical `CandleWindow` mini charts now retain each closed candle's UTC timestamp and OHLC values as inspectable SVG metadata. Hovering or assistive inspection exposes the exact candle values and UP/DOWN state instead of only showing geometry.
- The mini chart remains tied to the retained M5 tape, preserves the entry/target/invalidation research landmarks, and keeps `SHADOW_ONLY / NO_DECISION` authority.
- Added and registered `focused-pattern-window-ohlc`; targeted pattern surface tests, cockpit typecheck, and `git diff --check` pass.

## Focused retention and analogue navigation pass (2026-11-06)

- Source coverage now exposes the exact calendar-aware `M5 cutoff (UTC)` beside the coverage window, retained count, latest closed bar, and closed-bar contract. The displayed cutoff is computed by the same helper that enforces the two-year M5 boundary.
- The mini analogue preview now supports `ArrowLeft`, `ArrowRight`, `Home`, and `End`, including when focus is on its child controls. Keyboard movement preserves UTC endpoint identity and the research-only boundary.
- Added and registered `focused-retention-cutoff-readout` and `focused-analogue-keyboard-navigation`. Targeted tests, cockpit typecheck, and `git diff --check` pass.

## Focused forecast gate explanation pass (2026-11-06)

- The next-bar forecast card now explains the first unmet evidence gates in one atomic status, including verified MT5 history, fresh closed-bar evidence, walk-forward coverage, causal support, independent analogues, margin, metadata integrity, and causal Atlas evidence.
- When every gate passes, the same status says the landmark is descriptive research evidence. The direction remains fail-closed and retains `SHADOW_ONLY / NO_DECISION`.
- Added and registered `focused-forecast-gate-explanation`; targeted forecast contracts and cockpit typecheck pass.

## Focused retention cutoff provenance pass (2026-11-06)

- Source coverage now shows the exact calendar-aware `M5 cutoff (UTC)` beside the retained range and bar count. The displayed boundary is derived from the same leap-day-safe helper that filters the focused two-year tape.
- The readout keeps the UTC, closed-candle-only, no-forming-bar and `SHADOW_ONLY · NO_DECISION` provenance contract visible.
- Added and registered `focused-retention-cutoff-readout`; targeted contract, cockpit typecheck, and `git diff --check` pass.

## Focused canonical retention provenance fix (2026-11-06)

- The displayed M5 cutoff now derives from `latestCanonicalUtc`, shared with the retention parser, so offset or malformed tail rows cannot change the provenance boundary after being rejected from the two-year tape.
- Extended the retention calendar contract for canonical-only latest-row selection and the no-valid-row fail-closed case. Targeted retention/cutoff tests, cockpit typecheck, and `git diff --check` pass.

## Focused forecast explanation and graph isolation pass (2026-11-06)

- The focused next-bar card now exposes one atomic `m5-forecast-gate-explanation` status that names the first unmet gates: verified MT5 history, fresh closed-bar evidence, walk-forward coverage, causal support, independent analogues, margin, metadata integrity, and Atlas evidence. A fully passing state remains explicitly descriptive research evidence.
- Legacy custom-module registry loading is now dynamic and guarded behind the non-focused route. The focused XAUUSD M5 graph keeps custom module state empty, reducing unrelated startup work while preserving legacy diagnostics.
- Added and registered `focused-forecast-gate-explanation` and `focused-custom-module-lazy-contract`. Targeted tests, cockpit typecheck, and `git diff --check` pass; authority remains `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

## Focused analogue summary and canonical cutoff fix (2026-11-06)

- Mini analogue preview now announces the active pattern/family/all filter, retained endpoint count, and selected occurrence index in one atomic status. This makes historical pattern discovery legible before opening a mini chart or moving the main chart focus.
- Fixed a retention provenance edge case: the visible M5 cutoff now uses the same canonical-UTC parser and maximum-valid timestamp as the two-year display filter. Offset or malformed tail rows cannot move the displayed boundary after being rejected from the tape.
- Added and registered `focused-analogue-selection-summary`; expanded the M5 retention calendar contract for offset, malformed-tail, and no-valid-row cases. Targeted tests, typecheck, build, full `npm test`, and `git diff --check` pass.

## Focused research landmark accessibility pass (2026-11-06)

- LONG/SHORT entry, target, and invalidation lines rendered inside the focused SVG now expose individual accessible research landmarks with their exact price and the explicit `SHADOW_ONLY; NO_DECISION` boundary. Assistive technology can inspect the same geometry that is visible on the chart.
- Added and registered `microchart-research-line-accessibility`; targeted geometry/accessibility checks pass. No execution authority was added.

## Focused geometry accessibility and M1 graph cleanup pass (2026-11-06)

- Research entry, target, and invalidation lines now expose individual SVG landmarks with exact prices and explicit `research landmark only; SHADOW_ONLY; NO_DECISION` semantics for assistive inspection.
- Legacy M1 archive loaders (`loadM1Years`, `loadM1Range`, `loadSimM1Year`) are now dynamic imports behind non-focused replay/intrabar guards. The focused XAUUSD M5 graph no longer eagerly carries unrelated M1 archives.
- Added and registered `microchart-research-line-accessibility` and `focused-m1-loader-lazy-contract`. Targeted tests, cockpit typecheck, and `git diff --check` pass.

## Focused research geometry accessibility pass (2026-11-06)

- LONG/SHORT research landmark lines on the SVG chart now expose their exact price, label, and `SHADOW_ONLY / NO_DECISION` boundary through accessible landmark groups. Screen readers can inspect entry, target, and invalidation lines without inferring meaning from color or position alone.
- Added and registered `microchart-research-line-accessibility`; focused geometry, cockpit typecheck, and `git diff --check` pass.
## Focused legacy error mapper cleanup pass (2026-11-06)

- Removed the eager `researchErrors.ts` import from `Microscope.tsx`; the focused XAUUSD M5 route no longer carries the legacy CSV error mapper in its startup graph.
- Legacy CSV errors dynamically load the mapper only when an error is visible, with the raw error retained as a synchronous fallback if loading fails.
- Added and registered `focused-research-error-lazy-contract`; targeted contract, cockpit typecheck, and `git diff --check` pass. Authority remains `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

## Focused forecast receipt and dependency isolation pass (2026-11-06)

- Added a compact forecast evidence receipt with direction, distribution, latest closed UTC bar, gate state, and explicit `SHADOW_ONLY / NO_DECISION` authority. The receipt is atomic and screen-reader readable.
- Focused XAUUSD M5 now keeps the legacy strategy-card artifact registry and CSV research-error mapper out of the startup graph; both load dynamically only on legacy paths that need them. The focused detector/research tape also keeps the closed-bar `bars ?? []` fallback and a safe empty pattern-window center.
- Added and registered `focused-forecast-evidence-receipt`, `focused-artifact-registry-lazy-contract`, and `focused-research-error-lazy-contract`.
- Repaired an intermediate encoding/ternary corruption in `Microscope.tsx`, removed the replacement glyph, and re-ran focused surface, forecast, encoding, lazy-load, typecheck, build, full `npm test`, and `git diff --check` successfully.

## Focused mobile controls and legacy overlay graph pass (2026-11-06)

- Phone focused charts now expose a 48px horizontal tool strip with 36px square touch targets while preserving horizontal scrolling across all TradingView-style drawing tools.
- Legacy Card zone geometry, replay persistence, and honesty scoring now dynamic-load only behind non-focused replay guards; focused XAUUSD M5 startup remains chart-first and M5-only.
- Replaced a corrupted reset glyph in the chart footer with a readable `? Reset` label and added a regression assertion for the visible control copy.
- Added and registered `focused-mobile-toolbar-touch-target` and `focused-legacy-overlay-lazy-contract`; targeted tests, typecheck, and `git diff --check` pass.


## Focused legacy overlay lazy-load pass (2026-11-06)

- Card-zone geometry and legacy replay result persistence/trust scoring now load only behind non-focused replay guards. The focused XAUUSD M5 graph no longer eagerly carries `cardZones`, `cardRunStore`, or `simHonesty` dependencies.
- Focused mode clears card-zone state and never records legacy replay windows; the full `/microscope` route preserves those overlays and result receipts through guarded dynamic imports.
- Added and registered `focused-legacy-overlay-lazy-contract`; the contract checks the absence of static imports, guarded dynamic imports, and the existing `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false` authority boundary.

## Focused mobile toolbar touch target pass (2026-11-06)

- The focused XAUUSD M5 chart's phone drawing rail now reserves a 48px horizontal strip and renders 36px square tool buttons. The rail remains horizontally scrollable so every drawing control, including Clear, stays reachable without shrinking the chart plot.
- Added and registered `focused-mobile-toolbar-touch-target`; the targeted contract passes and cockpit typecheck remains clean. The change is presentation-only and preserves the chart's `SHADOW_ONLY / NO_DECISION` authority boundary.

## Focused Home navigation semantics pass (2026-11-06)

- Fixed TradingView-style keyboard semantics in `MicroChart`: `Home` now reaches the earliest retained M5 window at the current zoom, while `End` remains pinned to the latest bars.
- Added and registered `microchart-home-navigation`; pure bounded viewport cases and existing canvas interaction contracts pass.
- The navigation change is visual/read-only and preserves `SHADOW_ONLY / NO_DECISION`.

## Critical focused render recovery pass (2026-11-06)

- Fixed the fatal `RangeError: Maximum call stack size exceeded` that stopped the focused XAUUSD M5 page before chart controls mounted. The cause was spreading a two-year M5 tape into `Math.min`/`Math.max` during retention and chart range calculations.
- Added iterative `finiteMinMax` aggregation for large chart tapes and changed M5 retention latest-row aggregation to a loop. The focused chart now handles 250,000-row inputs without argument-spread overflow.
- Added and registered `microchart-large-tape-range`; the large-tape regression, M5 retention contract, focused lazy graph contract, TypeScript check, and `git diff --check` pass.
- This recovery takes priority over visual polish; all chart/research authority remains `SHADOW_ONLY / NO_DECISION`.
- Extended the same protection into `mt5DemoAdapter`: 45k/50k history chunks now aggregate timestamp bounds iteratively instead of spreading broker rows into `Math.min`/`Math.max`. Production build and MT5 history contracts remain green.
- Closed the remaining large-tape path in `CockpitChart`: its full-bar Y-domain now uses the same iterative range helper. Added and registered `cockpit-chart-large-tape-range`, including a 250,000-value regression, so fallback chart surfaces cannot reintroduce the startup stack overflow.
- Fixed the focused home layout after visual inspection exposed the chart in a narrow left grid track with the rest of the viewport blank. The shared responsive three-column rule now collapses `.ms-focused .ms-grid` to a full-width block and forces `.ms-focused .ms-chart` to `width: 100%`; the focused surface again uses the full available chart width.
- Replaced the remaining cache-age `Math.min`/`Math.max` spreads in `mt5DemoAdapter` with `finiteMinMax`, keeping history aggregation stack-safe end to end.

## Focused inspection and startup slimming pass (2026-11-06)

- Focused chart toolbar buttons now keep a persistent monochrome selected edge (`aria-pressed`) after keyboard focus moves into the plot, so the active TradingView-style drawing tool remains visible.
- The focused Pattern window now exposes the selected closed candle's exact UTC/OHLC values and bounded mini-window UTC range as an accessible read-only inspection line. It remains `SHADOW_ONLY / NO_DECISION` and does not alter chart or broker state.
- Removed the eager legacy `loadSimOhlcTail` dependency from `Microscope.tsx`; only non-focused diagnostic fallback dynamically loads it. Focused XAUUSD M5 continues through the verified full-history path.
- Added and registered `focused-pattern-window-inspection` and `focused-tail-loader-lazy-contract`; toolbar, responsive, chart-only, typecheck, and diff checks pass.


## Actual UI inspection and candle visibility recovery (2026-11-13)

- Latest user priority is observable runtime/UI correctness. User explicitly rejected dark, barely visible candles and requested TradingView-like visibility. Candles now use teal `#26a69a` and red `#ef5350`, with matching directional wicks/borders. Removed the ancestor `.ms-focused { filter:grayscale(1) }` that otherwise stripped all candle colors even when their computed fill was correct. Surrounding chart tools retain their neutral dark skin.
- Default/reset/End zoom now chooses 24-180 recent candles from plot width, rather than compressing 400 candles into every screen. Saved user zoom and timestamp anchors remain preserved. Reset applies the new readable zoom to an older saved viewport.
- Time ticks derive from actual candle spacing with an 80px minimum separation and edge-label padding. Verified at both ordinary and extreme zoom ranges with an executable helper test.
- Chart-only layout now sizes the complete control/chart column with flex; wrapped controls consume their actual height and the chart/footer take the remainder. Actual browser measurements: 1419x921 footer bottom 907.98; 800x900 bottom 887; 390x844 bottom 831; 320x700 bottom 687. No horizontal document overflow at any of these sizes; phone time labels no longer overlap. Observed 390px candle bodies approximately 4.07px after Reset. Screenshots visually inspected, including 320px.
- Browser access is functional through the Orca CLI embedded browser. Page `1b7f5818-7934-4288-a397-86b8dc3ede48`, dev URL `http://127.0.0.1:5090/#home`; managed terminal `term_a9666b05-ef2e-44d3-9b21-c3ce3af832ca`. This process was explicitly launched with `--historical --dev --no-browser`; `/api/mt5/account` returns HISTORICAL_MODE. This is historical UI verification, **not live MT5 verification**. Local audit found no running MT5/python bridge, although EXNESS MT5 and Python dependencies are installed. Do not report successful live attachment.
- Fixed a separate connection badge defect: a rejected `/bars` health probe used to clear a successfully connected account and falsely show Offline. It now retains MT5 Connected with stale feed health and retries; historical sessions visibly say Historical mode. Executable component regression covers failure/recovery, historical mode and genuine account transport failure. No broker attachment/execution changes.
- Fixed historical mini-window lookahead: ATR/entry/target/invalidation now use only bars at/before the marker via `candleWindowGeometry`. Future display rows remain available for outcome inspection, without affecting setup prices. Regression mutates/removes/appends future bars and verifies identical geometry; insufficient evidence withholds target/invalidation.
- Validation: full `npm test` passed, including TypeScript/public runtime lanes; after the final ancestor-filter removal, focused theme/surface/layout, connection polling and causal-window tests passed again. Production build passed (existing bundle-size warning). `git diff --check` passed. Evidence saved under ignored `artifacts/ui-verification/`.
- Authority remains SHADOW_ONLY / NO_DECISION / live_apply_allowed=false. Broad PDF coverage, further UI simplification and legacy cleanup remain ongoing; do not mark the overall goal complete.


## Pattern inspector, stable rendering and candle verification (2026-11-14)

- Added `ChartPatternInspector`: clicking a chart marker opens a nonmodal overlay
  with UTC/OHLC, larger candle window, PDF references or named-candle taxonomy,
  explanations and available historical statistics. Earlier/Later previews do
  not move the main chart until Show-on-chart. Escape closes and restores focus.
  Mobile actions stay outside the scrolling body and inside the viewport.
- Crosshair SVG overlay now ignores pointer events; drawing/pan handlers exclude
  signal and trade markers so actual pointer clicks can open the inspector.
- Historical analogue geometry uses an explicit setup endpoint and setup pattern
  direction rather than the future outcome. Regressions mutate future bars and
  verify setup prices remain unchanged.
- Fixed competing PDF/analogue focus effects by clearing opposite ownership refs.
  Executable regression reproduces the old alternating focus loop and verifies
  convergence. Fixed a second startup loop with stable EMPTY_OHLC_BARS identity
  and no-op preservation when disabled card zones are already empty.
- Focused connection fallback uses proven terminal attachment, rather than the
  disabled legacy account poller, and otherwise reports local history unavailable.
- Latest actual browser inspection confirms teal rgb(38,166,154) and red
  rgb(239,83,80), opacity 1 for closed main-chart candles, and filter:none on all
  chart ancestors. Historical mini-chart candles now use the same palette at full
  opacity. Desktop evidence: artifacts/ui-verification/candle-color-current.png.
- Earlier verification: inspector pointer click, Earlier, explicit Show-on-chart,
  Escape/focus return; mobile 390x844 without document overflow; cold-load console
  had no entries and SVG had no NaN attributes. Full unit lane passed after the
  startup fixes (inspector-final-unit.log).
- Runtime remains historical, not live MT5: managed terminal
  term_4f14786a-3934-4f6d-80f0-c720ec6350e8; page
  1b7f5818-7934-4288-a397-86b8dc3ede48 at http://127.0.0.1:5090/#home.
- Next functional defect found: detectM5PriceAction globally rejects a retained
  tape if any old short archive gap exists, suppressing all PDF census evidence
  even when the recent setup is complete. Scope current continuity to its actual
  trailing context while preserving fail-closed current-gap behavior and the
  historical per-window skipped denominators. Do not relax MT5 promotion gates.
- Overall goal stays active; SHADOW_ONLY / NO_DECISION / live_apply_allowed=false.

- Final color pass validation: production build passed (existing large-chunk
  warning); focused surface/theme/layout and both causal mini-window tests passed;
  git diff --check passed. Actual mini-chart computed fills match the main chart
  at opacity 1. Restored chart-only presentation and Reset to recent readable
  candles. Final desktop screenshot: candle-color-final.png. Browser console
  contains only the Vite hot-update debug entry.


## Recover historical PDF census and readable rows (2026-11-14)

- Previous goal turn was progress: directional colors, mini-chart consistency,
  production build and actual browser evidence were completed.
- Fixed `detectM5PriceAction` globally rejecting an archive due to any old short
  gap. Current setup continuity now checks its actual 14-bar context (median
  range lookback; all structural detectors use fewer bars). A recent context gap
  still returns NON_CONTIGUOUS_M5_TAPE with no current markers. Valid historical
  evidence is returned independently, even when the current setup abstains.
- Historical measurement checks the same 14-bar context plus the next-bar
  transition; a single interior omitted candle excludes exactly 14 candidates.
  Malformed OHLC, forming candles, duplicate or reversed times still reject the
  whole archive. Existing >=2h session-closure policy and all MT5 history promotion
  requirements remain unchanged.
- Expanded executable detector regressions: old-gap current geometry equality,
  exact skipped/evaluated denominators, current-gap abstention retaining evidence,
  both sides of the 14-bar boundary, retained occurrences around a local gap,
  prefix-by-prefix current/history consistency and future-outcome mutations.
- Real UI now reports 10/10 quantified detector groups instead of 0/10 and three
  current PDF observations. Snapshot example: Support and resistance 64,250
  occurrences / 136,006 evaluations, 49.9% next-bar directional hit rate,
  95% Wilson 49.5-50.3%, 5,643 excluded windows. This is historical local fallback
  data, not verified live MT5 history or a target-before-stop trade win rate.
- Fixed census numeric columns squeezing the pattern name to zero width in
  narrow desktop context cards. Name/count/rate occupy the heading; CI, side
  splits and outcome counts wrap below. Use one decimal rather than rounding
  both interval bounds to the same integer. Inspector explains skipped windows.
- Real PDF inspector verified: select census row, Earlier from 15:35 to 15:30 UTC,
  explicit Show-on-chart focuses 15:30, Escape closes. Mini-chart and PDF pages
  are shown and all prices remain causal illustrative research geometry.
- Phone context exposed unbroken SHA-256 provenance overflowing its card. Added
  overflow-wrap:anywhere to the evidence grid. Focused mobile header now hides
  the unrelated workspace switcher/brand and constrains header width. Verified
  at 390x844: inner/client/document widths 390, visual scale 1, inspector bounds
  x8..382 / bottom836, actions bottom835. No SVG NaN attributes.
- Validation: full npm run test:unit passed (continuity-unit.log); after the final
  layout edits, detector, responsive, focus ownership, census, encoding and
  focused surface tests passed, as did TypeScript and production build. Existing
  build chunk-size warning remains. git diff --check passes.
- Browser evidence: pdf-census-readable.png and pdf-census-mobile-fixed.png under
  ignored artifacts/ui-verification/. Restored desktop chart-only presentation.
  /api/mt5/account explicitly returns HISTORICAL_MODE and read-only authority.
- Delegation was attempted, but collaboration.spawn_agent rejected the inherited
  model cx/gpt-6.1-sol. Work continued locally; no child results are claimed.
- Remaining: inspector previews still cap at the latest 80 occurrences, although
  totals scan the complete retained tape. Build paging/search to reach all past
  occurrences without allocating unbounded UI markers. True trade outcomes,
  broader PDF geometry coverage, legacy cleanup and live MT5 verification remain.
- Overall goal remains active. SHADOW_ONLY / NO_DECISION / live_apply_allowed=false.


## Browse every measured PDF occurrence (2026-11-14)

- Previous goal turn was progress: recovered all ten census groups, strict
  per-window gap accounting and real responsive PDF inspection.
- Removed the latest-80 truncation from detector evidence.history. It now retains
  every measured chronological occurrence in the caller-capped two-year tape;
  history.length equals occurrences. Statistics and causal detector labels are
  unchanged. Only the optional SVG history layer slices the latest 80 records.
- The inspector reuses the measured history array directly. It no longer maps
  the full PDF history to rich SignalMarker objects. One signal is created when
  an ordinal is selected; a binary UTC lookup resolves Earlier/Later and the
  current position. Named-candle navigation remains explicitly a filtered
  analogue subset, without a full-history or PDF attribution claim.
- Added First / Latest and an accessible numeric Occurrence + Go control. All
  preview actions leave the main chart in place; Show-on-chart resolves the
  historical row through the existing UTC ownership/focus path. An explicitly
  focused old PDF occurrence gets one marker even with HIST TAPE OFF. Duplicate
  markers are suppressed when it is already in the optional overlay.
- Fixed Escape after First/Latest disables its own focused button: a scoped
  document keyboard listener dismisses the inspector even if focus falls back to
  the body, and is removed on unmount. The existing focus return stays in place.
- New registered pattern-occurrence-navigation regression exercises 500,000
  virtual rows with fewer than 25 record reads; real oldest/middle/latest labels
  match causal prefixes; actual extracted UI callbacks reuse index identity,
  create one signal per selection, bound overlays to 80, keep a selected old
  marker and reject invalid ordinals. Actual Escape effect is executed against
  document events and listener cleanup is checked.
- Browser: Support/resistance 64,250/64,250 -> First 1/64,250 at
  2024-11-04T17:05:00Z. Show-on-chart focuses bars 1-221 and shows its UP marker.
  Jump to 32,000 previews 2025-11-04T03:55:00Z without moving the main chart;
  explicit Show focuses bars 70,536-70,756 and shows the matching historical
  marker. Latest returns to 2026-11-04T15:35:00Z; edge buttons correctly disable.
- Verified 390x844 and 320x700: document widths exactly 390/320; panels x8..382
  and x8..312; action bottoms835/691 remain inside each viewport. Numeric input
  remains usable. Screenshot evidence: all-occurrences-mobile.png,
  all-occurrences-small-phone.png, occurrence-jump-desktop.png under ignored
  artifacts/ui-verification/. Escape verified closed the panel on the live page.
- Full unit lane passed (all-occurrences-unit.log), including TypeScript. After
  the final keyboard fix, navigation regression passed again; final production
  build passed (existing chunk-size warning). Snapshot integrity, focus ownership,
  census tests and git diff --check passed. TypeScript rerun is recorded below.
- Product tour now describes the current focused home and full occurrence browser;
  old multi-workspace screenshots are identified as a legacy gallery.
- Restored desktop chart-only view and Reset to recent candles. Runtime remains
  historical local fallback; no live MT5 or order-execution claims.
- Next: distinguish historical viewport endpoint from the chart's current NOW
  label (it currently labels the end of any visible window). Audit forecast
  receipt source wording: historical fallback can still show a verified-history
  phrase in a context card. Implement causal, explicit target/invalidation
  outcome measurements separately from next-bar direction statistics. Broader
  PDF geometry coverage, named-candle full-history census and legacy cleanup
  remain. Overall goal active; SHADOW_ONLY / NO_DECISION / live_apply_allowed=false.
- Final TypeScript rerun completed with exit 0 after the keyboard fix.


## Historical viewport truth and modeled barrier outcomes (2026-11-14)

- Previous goal turn was progress: every measured PDF occurrence became browsable
  and actual first/middle/latest UTC focus and phone controls were verified.
- Fixed the chart labeling every visible right endpoint NOW. Endpoint badges now
  say VIEW for a historical viewport, LAST for the retained closed tail, and LIVE
  only for a visible forming candle. Accessible OHLC readouts/closed-bar status
  no longer call a past candle forming merely because a live tail exists offscreen.
  Price badges now follow the endpoint candle's teal/red direction.
- Fixed forecast receipt missing-gate copy that showed bare 'verified MT5 history'
  while data was local fallback. It now states withheld: missing <all gates>,
  includes explicit source wording, and retains WAIT until the actual gates pass.
  Replaced the erroneous visible question-mark separator with a middle dot.
- Added patternBarrierOutcomes.ts and PatternBarrierEvidence.tsx in the PDF
  inspector. Fixed illustrative policy: hypothetical anchor-close entry, target
  2.2 ATR, invalidation 1 ATR, at most 24 consecutive closed M5 future bars. ATR
  uses the existing causal candleWindowGeometry: up to six true ranges through
  the setup, never the future display window.
- Engine buckets: TARGET_FIRST, INVALIDATION_FIRST, AMBIGUOUS, TIMEOUT, INCOMPLETE,
  DATA_GAP, INVALID_DATA, NEUTRAL, INVALID_SETUP. A known next opening print beyond
  one barrier establishes its first observation; otherwise a same-candle double
  touch is ambiguous. Missing M5 transitions (including session closures), forming
  rows and invalid data cannot establish a win. Invalid data after an already
  resolved first touch cannot undo that observation. UTC identity is checked
  before a retained occurrence ordinal is used.
- The rate denominator is only target-first + invalidation-first. Every supplied
  occurrence enters exactly one visible bucket. Ambiguity, timeout and missing
  paths remain explicit, not wins/losses. LONG/SHORT counts are separate. UI
  states that observations may overlap and do not model costs or executable fills;
  this illustrative policy is separate from PDF discretionary rules and next-bar
  direction statistics. It does not alter execution or forecast authority.
- Regression tests registered: pattern-barrier-outcomes covers long/short/exact
  touches, known gap opens, ambiguity, timeout/forming/gapped/malformed paths,
  fixed future-independent prices, stale ordinals and denominator reconciliation.
  chart-endpoint-context executes actual readout/receipt expressions across
  historical/retained/forming and verified/fallback cases. Existing accessibility
  footer contract now checks formingInViewport.
- Real historical snapshot: Support/resistance 64,250 occurrences; target first
  17,887, invalidation first 41,770, ambiguous70, timeout2,438, gap1,888, invalid
  setup/data197, incomplete0. Known paths59,657 -> target-first rate30.0%; 4,593
  excluded paths. Earliest selected setup at 2024-11-04T17:05Z resolves target first
  at17:25Z. Main historical viewport announces VIEW with the 2024 UTC endpoint;
  Reset restores LAST. Receipt explicitly says local fallback and missing gates.
- Visual QA: barrier-study-mobile-visible.png and barrier-study-desktop-visible.png
  show the actual rendered study. Initial desktop screenshot was blank while the
  embedded page was hidden; tab switch plus a fresh capture produced valid images.
  DOM checks: no SVG NaN; phone width390 with panel x8..382, bottom836 and pinned
  actions bottom835; desktop no horizontal overflow. Screenshots are in ignored
  artifacts/ui-verification/. Restored desktop chart-only and recent-bar Reset.
- Validation: full npm run test:unit passed including TypeScript
  (barrier-study-unit.log); production build passed (barrier-study-build.log),
  existing large-chunk warning remains. git diff --check passed before docs.
- Remaining: main historical selection currently shows the pattern marker but
  should also show its entry/target/invalidation position geometry; preview should
  optionally show the full 24-bar outcome path. Named-candle full-history census,
  broader source-grounded PDF detection, live MT5 verification and legacy cleanup
  remain. Preserve read-only authority; do not treat illustrative barrier studies
  as verified PDF strategy performance. Overall goal active.


## Restart recovery, candle brightness and historical positions (2026-11-15)

- Previous goal turn was progress: endpoint/receipt truth and the modeled barrier
  study were saved and verified before interruption. Checked those files and
  logs after Orca restarted, without repeating their completed implementation.
  Collaboration list now contains only the root agent; no live children remain.
- The restored terminal was at a PowerShell prompt and port5090 had no listener.
  Restarted the existing managed shell with npm run mfe -- --historical --dev
  --no-browser. New terminal handle:
  term_25ba2ff3-9c3a-4f9f-aa2b-51a5d1361a1a. Reopened the existing browser page
  1b7f5818-7934-4288-a397-86b8dc3ede48 at http://127.0.0.1:5090/#home.
  No pending user confirmation or unfinished test handle needed resuming.
- Actual browser inspection confirmed closed candles render rgb(38,166,154) /
  rgb(239,83,80), opacity1, with no grayscale/filter/dimmed ancestor. The earlier
  grayscale removal and TradingView teal/red palette are still present.
- Fixed remaining forming-candle dimming: group0.72 times body0.45 made it only
  32.4% opaque. Forming candles now keep full directional body/wick/border colors;
  dashed edges, data-candle-state, title and LIVE endpoint distinguish context.
  This was not a live-MT5 feed validation; runtime remains explicitly historical.
- Added historicalPatternPosition.ts and HistoricalPositionOverlay.tsx. The main
  chart receives only focusedHistoricalSignal (PDF occurrence focus owner), never
  the inspector's independent preview selection. UTC binary lookup ignores stale
  numeric indices. Current-tail, neutral, malformed or gapped setup prefixes
  withhold the historical position. Inspector and main chart share the existing
  causal barrier policy: setup-close entry, 2.2 setup ATR target, 1 ATR invalidation.
- Historical boxes shade the actually observed closed-bar path through the first
  touch/ambiguity, timeout24 or last usable bar before a gap/incomplete/invalid
  future row. Future outcomes may change extent/state, never fixed setup prices.
  Replay cursors cannot reveal a study before its observed endpoint is reached.
  Prices enter chart bounds only while the position intersects the viewport.
- Background areas render below candles; level labels/leader lines render above
  other chart overlays. Crowded labels use arrangeZoneLabels and stay inside the
  plot. One accessible position announcement exposes UTC, prices, outcome and
  SHADOW_ONLY / NO_DECISION / no order authority. Pointer-events:none preserves
  chart pan/drawing and pattern-marker interactions.
- Added landmarksAtLatestOnly for focused home. Latest-source position/forecast
  lines and zones are hidden when panning to past bars, and yield to a visible
  historical position even if the retained tail also fits in the viewport. Reset
  restores current-source overlays once the historical box leaves view. Legacy
  replay overlay semantics remain unchanged.
- Actual browser verification: recent historical SHORT at2026-11-04T03:55Z shows
  entry3934.397 / target3924.393233 / invalidation3938.944167. First previews
  2024-11-04T17:05Z while the main chart stays on the SHORT. Explicit Show then
  displays historical LONG entry2733.466 / target2737.9155 / invalidation2731.4435,
  target-first after4 observed bars. Closing inspector preserves the chart study.
  Reset restores LAST and removes the offscreen historical position.
- Visual QA: inspected historical-position-desktop.png and
  historical-position-mobile.png under ignored artifacts/ui-verification/.
  At390x844, document width390; all three labels stay inside the phone plot; no
  SVG NaN/Infinity. Desktop1419x921 document width1419. Final browser returned to
  desktop, chart-only, recent bars, inspector closed. restart-candle-colors.png
  captures the restored teal/red chart before this turn's additions.
- Registered historical-pattern-position.test.mjs exercises timestamp reanchoring,
  causal long/short prices under future mutation, stopped gap/forming paths,
  ambiguous first touches, viewport/current-source ownership, replay bounds and
  actual server-rendered SVG layers. Full npm run test:unit exit0 including
  TypeScript (historical-position-unit.log). Production build exit0
  (historical-position-build.log), existing large-chunk warning. git diff --check
  passed before these doc edits. No broker execution changes.
- Next: let the inspector mini chart show the complete modeled outcome path
  (currently only four future bars despite a24-bar study). Named-candle history
  was still the filtered analogue subset at this checkpoint; the later full
  retained named-candle history section supersedes that limitation.
  Broader PDF deterministic coverage, live MT5 verification and legacy cleanup
  remain incomplete. Overall goal active; preserve read-only authority.


## Complete observed outcome paths in the inspector (2026-11-15)

- Previous goal turn was progress: full-brightness candles and historical main
  positions were implemented, verified and saved. Re-read current files and
  terminal/browser state. Existing dev runtime is still running in historical
  mode; no duplicate server or child agent was started.
- Added PatternInspectionChart.tsx, extracting mini-chart rendering and candle
  interaction from ChartPatternInspector. Setup mode keeps eight context candles
  plus at most four subsequent closed M5 candles. Outcome path mode shows every
  observed study candle through first touch/ambiguity, 24-bar timeout, incomplete
  path, missing transition or invalid data. Maximum chart window is33 candles.
- Extended patternInspectionWindow with an optional setup/outcome mode. Both
  modes exclude malformed/forming future rows and stop at non-consecutive M5
  transitions. Context begins after any unusable/gapped prefix. Raw next-close
  direction requires a valid consecutive closed next row. Directional geometry
  is now withheld when the study's strict setup prefix fails, so the mini chart
  cannot show levels which the barrier study rejects. Display mode does not
  reprice setup geometry, and source/freshness authority is unchanged.
- Outcome mode is disabled for neutral, invalid or source-withheld geometry.
  The user's view preference persists while navigating occurrences; the actual
  view falls back to Setup when the new selection cannot support a study.
  Named-candle previews can inspect the same illustrative geometry when allowed,
  without acquiring a PDF strategy or full-history performance attribution.
- Plot width grows to552px for33 candles instead of squeezing them into232px.
  Horizontal scrolling keeps a separate fixed68px price axis visible. Shaded
  target/invalidation areas begin at the setup, stop at the observed endpoint and
  render behind candles. A dashed event/last-observation column keeps AMBIGUOUS,
  TIMEOUT and missing paths distinct from target/invalidation-first outcomes.
- Each candle supports pointer/touch OHLC inspection. The scroll region is a
  keyboard focus target; Left/Right/Home/End update a UTC/OHLC live readout and
  scroll the selected candle into view. End of path selects the final observed
  row. Plot state resets by occurrence UTC + mode. These interactions neither
  change main-chart focus nor rescan full historical statistics.
- Shared BARRIER_OUTCOME_LABELS in patternBarrierOutcomes.ts replaces duplicate
  state wording in PatternBarrierEvidence and the new chart. The mini chart's
  status includes the last observed UTC even for timeout, gap or incomplete paths.
- Actual Support/resistance UI verification:
  * Ordinal1, 2024-11-04T17:05Z: target first at17:25Z after4 bars.
  * Ordinal3, 17:35Z: timeout24 at19:35Z; all33 candles rendered; desktop plot
    width260 / scrollWidth552. End of path selected19:35Z, Home16:55Z,
    End+Left19:30Z. Main position remained at17:05Z throughout preview actions.
  * Ordinal27, 20:45Z: DATA_GAP after14 observed bars, last21:55Z;23 plotted
    candles and no connection across the missing transition.
  * Ordinal2964, 2024-12-06T13:25Z: AMBIGUOUS at13:30Z after1 bar. UI states
    both barriers touched and order unknown; it does not claim a win.
- Visual QA images in ignored artifacts/ui-verification/: outcome-mini-
  desktop-first.png, outcome-mini-desktop-24.png, outcome-mini-mobile-24.png,
  outcome-mini-small-ambiguous-visible.png. At390x844, document width390,
  panel x8..382/bottom836, actions bottom835 and price axis x300..368. At320x700,
  document width320, panel x8..312/bottom692, actions bottom691; scrolling its
  body reveals the full plot while controls remain pinned. No SVG NaN/Infinity.
- Registered pattern-inspection-outcome-chart.test.mjs exercises complete24-bar
  paths, late first touches, causal prices under future mutation, strict context,
  stopped missing/forming/invalid rows, ambiguity, source withholding, retention
  and actual server-rendered SVG/scroll/readout semantics. Full unit lane exit0
  including TypeScript (outcome-mini-unit.log). After final status-copy wording,
  the focused regression passed and production build exit0 (outcome-mini-build.log).
  Existing bundle-size warning remains. git diff --check passed before docs.
- Remaining priorities at this checkpoint: full-history named-candle census
  (implemented in the later section), broader PDF deterministic detection, live MT5
  verification and legacy cleanup. The broader goal remains active and incomplete.
  SHADOW_ONLY / NO_DECISION / live_apply_allowed=false; no order execution changes.

## Full retained named-candle history (2026-11-15)

- Restart recovery confirmed the saved implementation and completed unit/build
  logs. Port5090 and the managed historical dev terminal survived; no duplicate
  server, tests or agent launches were needed. No user confirmation was pending.
- Added namedCandleHistory.ts: selected-pattern exhaustive scan of every evaluable
  retained M5 endpoint, using the existing Atlas classifier, ATR14 and exact
  +/-0.12 ATR H+1 direction rule. Invalid global timestamps/order fail closed;
  setup context and next-bar outcomes respect gaps, invalid OHLC and forming rows.
  Missing future outcomes remain browsable, outside the hit-rate denominator.
  Neutral shapes have no directional hit rate. Scan is memoized by tape/pattern.
- NamedCandleHistoryEvidence shows match count, evaluated/excluded setup windows,
  UP/FLAT/DOWN outcomes, directional rate and missing-outcome buckets. The
  inspector now navigates the full selected shape history rather than the maximum
  60 similarity-filtered analogues. Analogue forecasts retain their own sample
  contract; this taxonomy census is separate from PDF strategy attribution and
  target-before-invalidation outcomes. There is no all-48-pattern census table yet.
- Microscope keeps independent named-history chart selection. Only the selected
  record becomes a SignalMarker, anchored by UTC rather than stale ordinal.
  Preview navigation leaves the main chart in place; explicit Show can focus a
  named occurrence outside the analogue sample, including retained index0.
  Directional historical geometry reuses the illustrative barrier study when
  valid. Switching PDF/analogue evidence or applying a valid snapshot clears the
  independent selection. Snapshot/bookmark persistence was missing at this
  checkpoint; the later durable-focus section implements it.
- Actual browser evidence on the local fallback tape (141,658 retained candles):
  134,371 valid setup endpoints and7,287 excluded windows. SPINNING_TOP has19,863
  occurrences,19,786 observed H+1 outcomes (UP8,133 / FLAT3,550 / DOWN8,103),
  tail1/gap76 missing. Its first occurrence is2024-11-04T17:40Z; no neutral rate.
  BULLISH_HARAMI has6,402 occurrences,6,372 observed outcomes
  (UP2,669 / FLAT1,087 / DOWN2,616),41.9% UP H+1 rate, tail1/gap29 missing.
  First is2024-11-04T17:35Z; Show renders LONG entry2736.7, target2740.704,
  invalidation2734.88, illustrative TIMEOUT. These are descriptive observations.
- Visually checked named-history-first-desktop.png and
  named-history-mobile-evidence.png in ignored artifacts/ui-verification/.
  At390x844 document width390, inspector x8..382/bottom836, pinned actions835;
  no SVG NaN/Infinity. No render-depth errors were observed.
- Registered named-candle-history.test.mjs covers real detector/evidence rendering,
  >60 matches, causal prefixes and future mutation, exact H+1 thresholds, missing
  context/outcomes, denominator policy, UTC reanchoring, index0, selection callbacks
  and independent chart focus. Full npm run test:unit including TypeScript passed
  (named-history-unit.log); production build passed (named-history-build.log),
  with the existing chunk-size warning. Focus fixtures were updated as needed.
- After restart, restored desktop1419x921, closed inspector, Reset to recent bars
  and scrolled to top. Inspected named-history-restored-desktop.png: teal/red
  candles are visible, LAST endpoint, no inspector or horizontal page overflow.
  Browser styles confirm rgb(38,166,154) / rgb(239,83,80), opacity1 and filter:none.
  git diff --check passed after the documentation updates.
- Next priorities at this checkpoint: snapshot/bookmark support (implemented below); check
  whether data refresh can reapply old focus after Reset; broader PDF deterministic
  coverage, live MT5 provenance verification and legacy cleanup. Historical runtime
  does not prove a live connection. Overall goal remains active and incomplete;
  SHADOW_ONLY / NO_DECISION / live_apply_allowed=false is preserved.

## Durable named focus and working two-year bookmarks (2026-11-15)

- Previous turns made progress: added named focus persistence and passing tests,
  then completed full unit lane/TypeScript and production build. Restart recovery
  inspected existing files/logs and port5090 rather than repeating those checks.
  The historical dev server survived outside the restored shell. No user approval
  was pending; native bookmark prompts were QA input, not user decisions.
- inspection.named_candle_focus is optional schema-1 metadata {pattern,time}.
  Parser requires a known Atlas pattern and timezone-qualified, non-future M5
  timestamp. Legacy snapshots remain readable. resolveNamedCandleFocus reanchors
  UTC in current bars, validates causal setup context and reruns the classifier.
  Saved outcomes/ordinals never determine the restored named marker.
- Named focus suppresses stale legacy PDF/analogue chart/preview ordinals and
  closes a stale inspector on import. Pending identities survive an empty loading
  tape. A populated tape with no matching valid shape clears selection and reports
  unavailable; it never substitutes a neighbour. Current first retained index0
  works. Named marker recomputation also drops stale shape labels after refresh.
- Actual UI revealed a further bug: the default support_resistance evidence had
  64,250 historical rows. The 2 MiB bookmark guard rejected an ordinary snapshot
  even with no drawings. focusedBookmarkSnapshot now keeps statistics and source/
  inspection/drawing metadata while omitting duplicate history rows, recording
  history_retained_count and explicit recomputation copy. Full export is unchanged
  in scope. A tested bookmark is9,115 bytes and carries BULLISH_HARAMI UTC identity.
- Actual UI also revealed pretty JSON exports exceeded the 8 MiB importer:
  9,724,367 bytes with whitespace vs roughly5.6 MB compact. Download and copy now
  use compact JSON, preserving every evidence row. A fresh5,607,875-byte download
  was imported successfully through the real file input (support_resistance lens).
- Actual bookmark flow: selected first BULLISH_HARAMI occurrence at
  2024-11-04T17:35Z, saved through native prompt, reloaded page, Reset to LAST,
  restored bookmark. UI confirmed named marker plus historical LONG entry2736.7,
  target2740.704, invalidation2734.88, TIMEOUT24. Snapshot status identified the
  same pattern/UTC, inspector closed. Desktop and390px page widths had no overflow.
  Visually inspected named-snapshot-restored-desktop.png and the phone capture.
- Registered named-candle-snapshot.test.mjs executes actual UI callbacks/export
  literal, strict parser, current classifier, retention/index0, loading/unavailable,
  future-outcome recomputation, old/wrong-context imports and bookmark compaction.
  It reproduces >2 MiB history bookmarks and >8 MiB pretty exports, then verifies
  real download/copy callbacks retain65,000 rows and parse under the limit.
  Updated named-history fixture for shared resolver. Full unit lane passed before
  UI-discovered size fixes (named-snapshot-unit.log); affected snapshot/history/
  bookmark tests passed after fixes. TypeScript and final build passed; existing
  chunk-size warning remains (named-snapshot-build.log).
- Removed the two QA-created bookmarks through their UI delete buttons, preserving
  the original empty shelf. Returned to desktop1419x921, chart-only, recent LAST
  endpoint and scroll top. No inspector, no page overflow; console had only normal
  Vite/React messages. git diff --check passed after documentation updates.
- Broader goal remains active: deterministic PDF coverage, live MT5 verification,
  legacy architecture cleanup and Reset/refresh focus ownership remain unfinished.
  All new snapshot/bookmark paths preserve SHADOW_ONLY / NO_DECISION /
  live_apply_allowed=false and do not touch broker execution.

## Focus jumps no longer undo Reset on refresh (2026-11-15)

- Previous turn completed durable named snapshots/bookmarks and their size fixes;
  this turn confirmed the saved state before working on the next remaining bug.
  Read-only process inventory found no running terminal64/terminal MT5 process.
  This does not validate live connection; current app remains historical fallback.
- MicroChart's focus effect previously depended on bars/n and repeated a mounted
  old focus after a data-array refresh, undoing Reset, pan or zoom. It now consumes
  a request keyed by symbol/timeframe, UTC candle and explicit request ordinal.
  A stable focusTime resolves before comparing keys, so an interim stale numeric
  index during retention cannot issue an unrelated jump. Missing UTC has no index
  fallback. Empty loading tapes do not consume a request; clearing focus resets it.
- Microscope increments chartFocusRequest for explicit PDF/census/marker/analogue
  selections and valid snapshot restore, including repeated selection of the same
  endpoint. UTC reconciliation alone does not increment it. Thus Reset/pan survive
  refresh while another Show action can still return to the same occurrence.
- Added/registered microchart-focus-refresh.test.mjs, executing actual effect,
  Reset callback and UTC resolver. Covers cloned arrays, retention before/after
  parent index reconciliation, pan/zoom, repeat Show, selection clearing, index0,
  missing endpoint and loading. Updated callback fixtures for request setter.
- Actual UI in QA tab e0c72b1f-20d2-4c7c-b2e6-082b978cc96c: first retained
  BULLISH_HARAMI, Show, Reset to2026 LAST, Show again to2024-11-04T17:35Z
  historical LONG with unchanged entry2736.7/target2740.704/invalidation2734.88.
  Closed inspector and Reset to LAST; visually inspected the resulting1419px
  desktop chart, no overflow or dialog. Saved focus-refresh-reset-desktop.png.
- Full unit attempt caught an obsolete formatting-only assertion from the prior
  compact-JSON change. Updated it to require full compact payload (behavioral
  roundtrip remains covered by named-candle-snapshot). Full unit/TypeScript run
  passed (focus-refresh-unit.log); production build passed (focus-refresh-build.log),
  with existing chunk-size warning. No broker execution paths changed.
- Next: broader source-grounded PDF detector coverage and knowledge map expansion,
  live MT5 verification when the terminal/source is available, and legacy cleanup.
  Overall user objective remains active and incomplete.


## Curated full-book navigation and corrected combi source notes (2026-11-15)

- Restart recovery confirmed the previous focus/Reset fix and passing logs. No
  subagents or test commands survived; the existing historical Vite server and
  browser page remained available, so neither was relaunched. No approval pending.
- Expanded docs/price_action_knowledge_map.json from 10 to 20 concepts, keeping
  original IDs/page anchors and schema/source hash for snapshot compatibility.
  Original ten are GEOMETRY_PROXY; ten new lenses are SOURCE_NOTES with no
  detector/performance attribution. Added management, entry-bar, combi, failure,
  consecutive-review, size and volatility notes, 14 directed relationships total.
- Corrected pattern_break_combination family (stable ID) to the source's
  directional powerbar + inside-bar combi; the old false/tease/internal-test
  description was wrong. Verified source visually using PDF pages118/119, plus
  TOC5/6, resistance158 and reversal166. Source check artifact:
  artifacts/ui-verification/pdf-coverage-source-check.png.
- Added all 12 chapter intervals, 53 explicitly reviewed printed pages, six
  March-August2012 case ranges and 13 anchored glossary terms. Coverage remains
  PARTIAL_CURATED_NOTES. Printed Arabic n = PDF n+10; all figures/daily cases are
  not yet transcribed. Chapter navigation is not a complete review claim.
- PriceActionBookIndex is integrated into expanded knowledge details. Chapter
  navigation exposes notes/ranges/source lenses; chapter9 opens the glossary.
  Source-only vs local geometry-proxy scope is explicit in panel and host lens.
  Replaced misleading438-source-pages-indexed footer with partial coverage copy.
  Collapsed details hide the book and its controls. Long footer hash wraps.
- Actual desktop inspection caught setup step counters displaying0; replaced
  implicit CSS counters with explicit numbered badges1-8, aria-hidden within ol.
  Actual mobile computed style caught global min-height0 overriding chapter
  select; scoped specificity now gives44px touch targets on390px screens.
- tests/price-action-book-index.test.mjs executes actual component chapter/select
  and lens callbacks for all12 chapters, verifies six months/glossary/corrected
  combi and no detector attribution. Expanded validator tests reject malformed
  chapters/months, wrong offsets/coverage/scope/glossary. Registered in unit lane.
- Full npm run test:unit including TypeScript passed (book-index-unit.log).
  After final numbering/CSS edits, affected book/panel/UTF8 tests passed and final
  production build passed (book-index-build.log), with existing chunk warning.
  git diff --check passed. No broker execution routes changed.
- Actual UI: chapters5/6/9, source-only combi and13 glossary entries verified.
  Desktop and390px widths had no horizontal overflow. Collapsing details leaves
  book height0 and no visible controls. Artifacts: book-index-combi-desktop.png,
  book-index-glossary-mobile.png, book-index-restored-chart-desktop.png. Original
  browser restored to1419x921 chart-only, Reset LAST, scroll top. Teal/red candles
  visually inspected. Console contained normal Vite HMR messages only.
- Live remains unverified: no terminal64/terminal process; current server has
  historical mode enabled. Do not interpret local fallback as a live source.
- Overall goal remains active: deterministic setup coverage beyond ten proxies,
  individual source figure/case indexing, live MT5 evidence when available, and
  continued legacy cleanup. Preserve SHADOW_ONLY / NO_DECISION / live_apply_allowed=false.


## Persistent page metadata and local OCR retrieval (2026-11-15)

- Added docs/price_action_page_index.json:438 ordered page records,425 OCR pages,
  53 curated pages; every page retains OCR hash/character count, chapter/printed
  identity, review status, concept anchors, figure mentions and case month.
  No original page text or excerpts are committed in this metadata index.
- scripts/price-action-source-index.mjs builds from existing local extraction and
  queries terms/chapter/printed page/PDF page/figure. All query terms required,
  normalized OCR, chronological order, bounded1-100 results; --text returns only
  selected original local OCR pages. No PDF open/extraction on the query path.
- Query checks source attestation, extraction page order/count/OCR flags and all
  derived index metadata/hashes. Stale index or changed extraction fails closed.
  --build deliberately regenerates metadata after curated coverage changes.
- Real queries for powerbar/inside-bar chapter5, figure5.10 and printed108 worked
  against saved OCR. Figure5.10 mentions appear at PDF118/119; a cross-reference
  does not claim the figure is drawn on both pages. Source query evidence saved
  locally at artifacts/ui-verification/source-index-combi-query.json.
- Five behavioral tests cover full page metadata/coverage, bounded combined search,
  original-text retrieval, blank pages, source/hash/metadata drift and actual CLI
  build/query in an isolated temporary folder without any source PDF. New test is
  registered in the default unit lane. All five, runner registration and installer
  tests passed; final TypeScript exit0 and package script syntax check passed.
- Added tracked-file exception and source-release allowlist for metadata/tool/tests
  and curated guide. Full PDF/OCR artifacts remain excluded. Updated README and
  knowledge guide with commands and partial-coverage/figure/OCR limitations.
- This is durable source retrieval, not complete PDF interpretation. Remaining
  source figures/cases and deterministic setup implementations still need work.

- Follow-up source-label audit: several older chart controls/inspector still call
  printed page anchors "PDF pp." (for example marker.pageAnchors8/9/10). The new
  knowledge panel/book/index explicitly show printed vs PDF(+10), but the legacy
  marker/inspection labels should be aligned next using a shared formatter and
  updated behavioral/source-label tests. Do not change stored anchors to PDF
  indexes: that would invalidate source contracts and older snapshots.


## Printed/PDF page provenance correction (2026-11-15)

- Completed the source-label audit immediately above: added shared
  formatPriceActionSourcePages with verified+10 offset. Stored detector/map/
  snapshot anchors remain printed page numbers. Formatter preserves every anchor
  via grouped ranges, canonicalizes without mutation and rejects invalid pages.
- Current/historical marker measures, visible and accessible marker controls,
  current explanation, comparison pane, compact source lens, expanded panel and
  pattern inspector now distinguish printed and PDF numbers. Example: support/
  resistance Printed8-10 / PDF18-20. Knowledge-list/edge page labels explicitly
  say Printed, while the full source citation supplies both conventions.
- Added/registered price-action-source-pages.test.mjs. Behavioral tests exercise
  actual current/historical converters and formatter (noncontiguous ranges,
  singleton, last page, duplicates/order, invalid input, readonly anchors).
  Updated four older marker source/score/name/explanation contracts accordingly.
- Full npm run test:unit including TypeScript passed (source-pages-unit.log).
  Production build passed (source-pages-build.log), existing chunk warning only.
  Actual source controls/explanation and inspector show8-10 /18-20 consistently.
  Inspected desktop/mobile screenshots, no horizontal overflow. Artifacts:
  source-pages-inspector-label-desktop.png, source-pages-inspector-mobile.png,
  source-pages-restored-chart.png. Browser restored1419x921 chart-only LAST, no
  inspector, scroll top. Teal/red candles still visible. No execution changes.


## Close-confirmed pattern-break combi and structural mini chart (2026-11-16)

- Prior turn made concrete progress: knowledge20/chapters12/page-index438 and source
  page-label fix were saved and verified. Inspected current files/logs and reused
  existing historical server/browser; did not rerun completed source extraction.
- Added lib/patternBreakCombi.ts, a pure causal classifier for a deliberately
  narrow OHLC proxy: six-bar aligned context boundary break, directional powerbar,
  one/two nested inside bars at the directional end, subsequent close confirmation.
  Exact numerical thresholds/version exclusions are in PRICE_ACTION_KNOWLEDGE_MAP.
  Red inside after green powerbar (and inverse) is allowed. Wick-only, same-bar
  break/protection double touch, gaps/session boundaries, invalid/forming candles,
  weak powerbar and wrong-end inside bars are withheld. Doji/reversed source
  variants are explicitly not covered, so this is not the complete book method.
- Promoted pattern_break_combi (stable knowledge ID/printed108-110 anchors) from
  SOURCE_NOTES to GEOMETRY_PROXY. Knowledge scopes now11 proxies/9 source notes;
  total20 remains. Added detector/assessment/marker/full-history integration.
  Current and historical paths share classifier and preserve setup-only score/
  receipt regardless of future outcomes. Detector census/export denominator now
  comes from implemented registry11 instead of hardcoded10.
- Optional setup receipt retains UTC context/powerbar/inside/confirmation times,
  context boundary, breakout and technical protection reference. Signal converters
  carry it for both current and historical inspection. Mini chart marks P/I1/I2/C
  and separate amber break / blue technical-reference lines. Inspector explains
  measured structure and local rules, excluding volume/cost/fill claims. ATR
  LONG/SHORT geometry still enters at confirmation close with2.2/1 ATR/24 bars;
  technical references are not substituted into that existing study's statistics.
- Real fallback tape measured164 occurrences (82 LONG/82 SHORT), including first
  at2024-11-08T00:15Z and latest2026-10-27T23:30Z. Verified census11/11, first/
  latest navigation, main-chart focus, historical LONG/SHORT and outcome path.
  Source/coverage remains local historical fallback, not live MT5 validation.
- Actual export produced86,597-byte combi snapshot with all164 setup receipts;
  import through real file input resumed selected first occurrence/UTC and
  dismissed inspector. Export status correctly says11/11 concepts. Download:
  C:/Users/nngov/Downloads/quantsmart_XAUUSD_M5_2026-11-15T16-05-12-429Z.json.
- Five pattern-break-combi tests cover both directions/one-two variants, optional
  color, abstentions/ambiguity/gaps, causality under future mutation, >80 history
  retention, actual SSR mini-chart P/I1/I2/C and technical lines. Added unit-lane
  registration and source-release test allowlist. Updated scope/detector tests.
  Initial full test attempt exposed missing registry constant in the extracted
  snapshot callback fixture; corrected fixture, then full unit/TypeScript passed
  (combi-unit.log). Final affected detector/mini/history/source tests and build
  passed (combi-final-tests.log/combi-build.log). React SSR title warning caught
  by rendered test was fixed by single-string title children. Existing chunk
  warning only. git diff --check passed after documentation edits.
- Visual QA desktop/mobile: combi-inspection-chart-desktop.png,
  combi-first-outcome-mobile.png, combi-structure-receipt-desktop.png. No page
  overflow. Browser restored1419x921 chart-only, LAST recent bars, scroll top,
  no inspector; combi-restored-chart-desktop.png. Console only Vite HMR messages.
- Overall goal still active. Next: source-grounded regular pattern-break and
  pattern-break-pullback definitions/fixtures, broader source figure/case review,
  live MT5 evidence when available, legacy architecture cleanup. No execution
  changes; retain SHADOW_ONLY / NO_DECISION / live_apply_allowed=false.


## 2026-11-16: recovered regular pattern break and verified the actual UI

Resumed the interrupted work without restarting PID8812 or duplicating completed
combi work. No child agents or tests were running on recovery. Earlier delegation
failed on the inherited model; do not retry the same failing spawn or override
models merely to bypass it. The active goal remains incomplete.

Added `patternBreak.ts`: local horizontal boundary + compact alternating buildup
proxy, version `pattern-break-close-confirmation/1`, printed73-77 / PDF83-87.
Four context bars, four-to-six buildup bars, at least three near-boundary touches,
at least two color changes, directional signal bar and a subsequent close beyond
both signal edge and boundary. All thresholds and exclusions are documented in
PRICE_ACTION_KNOWLEDGE_MAP.md and the inspector. This does not implement wider
obstacle room, sloped setups or the complete source method. Confirmation close
is the observation time, not an inferred executable entry.

Shared `PriceActionSetup` is the typed regular/combi structural receipt union.
Current markers, full historical census, inspector, mini chart, ATR study and
snapshot/bookmarks use the same receipt path. Mini chart B1... / S / C labels and
amber break / blue protection references remain distinct from ATR policy levels.
Fixed question-mark separators from the interrupted edit. Fixed mini-chart
lookback: complete detector context is shown (bounded to13 previous candles),
while malformed/forming/gapped context still stops the window. A receipt for a
different confirmation candle cannot expand its context. Structure reference
prices are included in vertical chart bounds.

Knowledge coverage:21 concepts =12 GEOMETRY_PROXY +9 SOURCE_NOTES,12 chapters,
54 reviewed pages,6 case months,13 glossary terms and16 relationships. Metadata
index rebuilt for all438 PDF pages /425 OCR pages. Printed73-78 text retrieved;
PDF84,86,87 visually checked. Printed77 intentionally added to reviewed notes;
printed78 remains navigation/source reading only, no curated fixture claim.

Verification:
- Full `npm run test:unit` including TypeScript passed before the final context
  fix: `artifacts/ui-verification/pattern-break-unit.log`.
- After that fix, regular/combi behavioral and actual SSR tests, mini-window,
  outcome chart and focused-window regressions passed; final TypeScript passed
  (`pattern-break-final-typecheck.log`), production build passed
  (`pattern-break-build.log`, existing large-chunk warning only).
- Real retained tape141,658 bars:76 regular occurrences (44 LONG,32 SHORT),
  first2024-11-11T21:30Z, latest2026-11-04T06:50Z. Next-bar hit rate42.1%
  (CI95 31.6-53.3%); illustrative target-first18/74 =24.3%. These are local
  historical measurements, without costs or complete source-method validation.
- UI census12/12; knowledge21 concepts /54 reviewed pages. First/latest,
  setup/outcome, main chart LONG/SHORT, receipts, printed/PDF anchors verified.
- Mobile390x844: root scroll width390, inspector within viewport. Complete
  six-bar buildup context starts2024-11-11T20:40Z after the final context fix.
- Actual61,026-byte snapshot export/import resumed `pattern_break`; all76
  occurrences carry their PATTERN_BREAK receipts. Export:
  `C:/Users/nngov/Downloads/quantsmart_XAUUSD_M5_2026-11-15T16-12-56-380Z.json`.
- Screenshots visually inspected: `pattern-break-source-check.png`,
  `pattern-break-first-outcome-mobile.png`, `pattern-break-short-chart-desktop.png`,
  `pattern-break-long-chart-desktop.png`, `pattern-break-structure-desktop.png`.
  Stored beneath artifacts/ui-verification. No new runtime errors in latest
  browser console entries. `git -c core.safecrlf=false diff --check` passed.

Runtime remains historical fallback; no terminal64.exe/terminal.exe process was
found on the recovery check. Live MT5 and fresh broker history are unverified;
forecast stays withheld. Preserve SHADOW_ONLY / NO_DECISION /
live_apply_allowed=false. Next work: pattern-break-pullback source review,
explicit obstacle/room context, held-out source figures, actual MT5 availability
and continued legacy cleanup. Do not claim the complete438-page method is done.

Final UI restored desktop1419x921, chart-only, Reset LAST, scroll0, inspector closed. Visually checked pattern-break-restored-chart-desktop.png; teal/red candles remain fully visible.


## 2026-11-16: pattern break pullback, both post-break variants

Previous goal turn was progress: regular Pattern Break shipped and actual UI
was verified. This turn adds source-grounded pattern-break-pullback; goal remains
active because full PDF coverage, wider context, live MT5 and cleanup are incomplete.

Read printed97,99-102,104 via the existing source index; visually inspected
PDF107,109,111,112,114 in pullback-source-check.png. Printed99,101,102,104 added
as reviewed notes (97 already reviewed); printed100 read but not newly curated.
No source figure was converted to a labeled fixture. Map now22 concepts =13
GEOMETRY_PROXY /9 SOURCE_NOTES,58 reviewed pages and19 anchored relationships;
12 chapters,6 month ranges and13 glossary terms unchanged. Rebuilt all438 page
metadata records without re-extracting the PDF. Original hash/schema unchanged.

Implementation `patternBreakPullback.ts`, version
`pattern-break-pullback-close-confirmation/1`: repeated six-bar horizontal
boundary, original break, one-to-six post-break bars, signal at barrier/EMA25,
then subsequent close confirmation. Both HANGING (compact alternating fight)
and RETURN_TEST (excursion/retracement) variants measured. All exact thresholds
are local study rules documented in PRICE_ACTION_KNOWLEDGE_MAP.md. This does
not require the original break to pass the regular Pattern Break classifier;
the source specifically allows skipped initial breaks.

EMA25 is an explicit bounded estimate: SMA25 seed in the last40 consecutive
valid closed M5 bars, update through the signal. Seed UTC and signal value are
retained in each receipt. Main chart EMA10/34 display lines are different.
Original14-bar detector/ATR/evidence behavior preserved; only the new classifier
gets a separate40-bar prefix. No future bars feed any setup label or EMA seed.
Mini chart X/T/S/C labels, old-boundary dashed line and amber EMA-at-signal dot
expose the structure. Setup context is the six-bar boundary through confirmation
(up to13 prior bars), while the longer EMA seed is disclosed in inspector copy.
Both structure references and EMA/boundary prices affect plot range. Technical
references remain separate from the2.2/1 ATR confirmation-close24-bar study.

Actual retained tape141,658 bars:236 measured occurrences,133 LONG /103 SHORT;
38 HANGING /198 RETURN_TEST, first2024-11-05T18:35Z, latest2026-11-03T21:25Z.
Next-bar hit rate52.54% is descriptive and does not establish source-method
profitability. Wider dominance, obstacle room, magnets, strength-dependent
buildup, costs and executable intrabar entries are not yet assessed.

Verification:
- Full npm run test:unit including TypeScript passed (pullback-unit.log).
  Initial failure was a combi source-text test looking for legend copy that now
  lives in shared helper; moved that assertion to the actual SSR output and reran
  the complete suite successfully. Production build passed (pullback-build.log),
  existing chunk-size warning only.
- New behavioral/SSR tests cover both directions/variants,1-6 post-break lengths,
  incomplete/forming/invalid/gapped data, undone initial break, missing barrier
  or EMA test, wick-only/gap-open/double-touch confirmation, stable causal labels,
  bounded EMA seed, >80 complete retained occurrences and actual X/T/S/C chart.
- UI census13/13, book22 concepts /58 reviewed pages; first/latest navigation,
  main chart LONG/SHORT, hanging and return examples, outcome path and phone
  layout verified. Mobile390x844 root scroll width390, inspector within viewport.
- Actual172,286-byte export contains all236 receipts. Upload resumed
  pattern_break_pullback and its historical chart focus:
  C:/Users/nngov/Downloads/quantsmart_XAUUSD_M5_2026-11-15T16-21-18-232Z.json.
- Visually inspected artifacts/ui-verification/pullback-return-long-desktop.png,
  pullback-hanging-short-desktop.png, pullback-first-outcome-mobile.png and
  pullback-source-check.png. Latest console entries contain HMR debug only.
- Fixed knowledge-panel compact page labels that truncated noncontiguous anchors
  after four pages: use shared grouping formatter, keep all printed anchors.
  Relevant source-pages/knowledge-panel regressions passed after this copy fix.

Live runtime still historical fallback. Do not mark complete or enable execution.
Next: assess wider obstacle room and pullback strength, source figure/case review,
MT5 live availability, and continued focused-route legacy cleanup. Preserve
SHADOW_ONLY / NO_DECISION / live_apply_allowed=false.

After compact source-label fix, final TypeScript and build passed. Actual UI label now shows all printed anchors97,99,101-102,104. Browser restored desktop1419x921, chart-only, inspector closed, Reset LAST, scroll0; see pullback-restored-chart-desktop.png. No tests or background jobs left running.

## 2026-11-16: causal obstacle room and restart recovery

Recovered the existing runtime/page after restart; Vite PID8812 and browser
1b7f5818-7934-4288-a397-86b8dc3ede48 remained alive. No child agents or interrupted
tests were running. Existing changes were preserved. Goal remains active.

Reviewed printed13,51,107 with the existing OCR index and visually checked
PDF23,61,117 (room-source-check.png). Added obstacle_room as SOURCE_NOTES,
two source-anchored relationships and three reviewed page notes. Knowledge now
23 concepts =13 geometry proxies +10 source notes,61 reviewed pages and21
relationships. All438 page metadata records regenerated;425 OCR pages retained.
The new numerical context measurement does not count as a new setup detector.

patternRoomContext.ts version pattern-room-context/1 measures at most96
consecutive valid closed M5 bars through the selected UTC. Fewer than24 bars,
neutral observations or unverified current evidence withhold measurement. Gaps
truncate context. A swing requires two left and two already-known right bars;
zones cluster within0.25 of the median last14-bar range, retire after a decisive
close through the far edge, and retain at most three nearest zones ahead.
Distance is measured from confirmation close to the near zone edge, including
zero while inside a zone. Technical risk uses the source-structure protection
reference, separately from the fixed2.2/1 ATR outcome study. The next strictly
ahead50-unit XAUUSD round landmark is listed separately. These are local study
rules, not book-prescribed thresholds or a setup qualification / history filter.
No confirmed swing zone does not establish a clear path.

Inspector now has Setup / Outcome path / Context modes. Context includes the
full causal local prefix and ends exactly at setup close, with amber confirmed
swing zones and zero observed future path bars. Full-context price scaling is
intentional; use Setup to examine narrow signal candles in detail. The existing
horizontal scrolling and Home/End OHLC inspection remain available. Room evidence
shows source anchors, confirmation time, technical protection and distance.
Snapshot exports selected_setup_room_context as an informational receipt; imports
never supply trusted room levels and UI always recomputes from current candles.

Validation completed before restart: full unit suite including TypeScript and
production build passed (room-unit.log, room-build.log). Recovery validation:
-17 related tests passed covering context, outcomes, snapshot integrity and
 source index/knowledge consistency. Added explicit SSR assertion that Context
 reports data-inspection-path-bars=0; all four room tests pass afterward in
 room-recovery-regression.log. Final TypeScript and production build passed
 (room-recovery-build.log), existing bundle size warning only. Diff check passed.
-Actual UI: latest UP pullback at2026-11-03T21:25Z has96 context bars and nearest
 resistance3935.378, distance7.973 /1.7953 technical-risk units. First DOWN
 pullback at2024-11-05T18:35Z displays support2738.21, distance1.58 /1.03
 technical-risk units. Context excludes later candles in both.
-Phone390x844 has root scroll width390, inspector within viewport and all three
 mode buttons36px tall. Home and End select first context / setup candle with
 correct OHLC. Candles use teal #26a69a and red #ef5350. Visually inspected
 room-readout-desktop.png, room-short-context-mobile.png,
 room-short-readout-mobile.png and room-recovery-context-desktop.png.
-Export C:/Users/nngov/Downloads/quantsmart_XAUUSD_M5_2026-11-15T16-31-37-599Z.json
 is173608 bytes. Copied and intentionally altered only its optional room receipt
 to999999 / zero distance in artifacts/ui-verification/room-stale-receipt-import.json.
 Actual upload resumed read-only context; reopening the census recomputed
 resistance3935.378 and BEYOND_ONE_TECHNICAL_RISK, with no fake level displayed.
-Actual book panel reports23 indexed concepts /61 reviewed pages; census remains
13/13. Latest console entries are Vite HMR debug messages only.

Browser restored desktop1419x921, chart-only, inspector closed, knowledge
collapsed, Reset LAST and scroll0. Visually checked room-restored-chart-desktop.png:
large readable teal/red XAUUSD M5 chart, no viewport overflow. Runtime remains
historical fallback; connection control explicitly reports historical launch mode
(restart without --historical enables the connector). No terminal64/terminal
process found in recovery check. No runtime restart was performed. Live MT5 is
unverified; forecast withheld and SHADOW_ONLY / NO_DECISION /
live_apply_allowed=false retained. No test/build jobs left running; existing Vite
server remains available.

Next meaningful work: source-grounded wider dominance/range and pullback strength,
held-out figures/cases, MT5 live availability and focused-route legacy cleanup.
The complete438-page method is not implemented; keep the goal active.

## 2026-11-16: pullback strength and terminal turn evidence

Previous goal turn made verified progress on obstacle room. This turn adds
source-grounded correction pressure and turn buildup for the existing pullback
family. Goal remains active; no completed/blocked claim is justified.

Read printed100-102 fully and visually inspected PDF110-112, including Figure5.7
on printed100 (pullback-pressure-source.png). Also read105,106,88 for surrounding
context; these were not added as curated coverage. Added printed100 to the
existing pullback concept and chapter5 reviewed notes, with one buildup->pullback
relationship anchored101-102. Map now23 concepts (13 proxies /10 notes),62
reviewed pages,22 relationships;438 page metadata records rebuilt,425 OCR pages.
Detector source anchors now97,99-102,104; detector thresholds and counts unchanged.
No figure OHLC fixture or labeled historical trade was transcribed.

New patternPullbackPressure.ts version pattern-pullback-pressure/1 recomputes
the canonical pullback from40 consecutive valid closed M5 bars at selected UTC.
Unverified/current evidence, absent setup, mismatched identity or irreproducible
geometry withholds. Numerical saved setup fields never supply the measurement.
Six pre-break ranges provide median baseline. Local leg runs from their opposite
extreme to the last equal directional extreme from original break through the
pre-signal bar. Correction runs strictly afterward through signal, excluding
confirmation/future. Its deepest adverse wick supplies return depth/local leg.
This local leg is explicitly narrower than a full source-chart swing.

Receipt shows opposing body and powerbar count, longest opposing run, largest
opposing body/baseline, opposing net close speed per bar/baseline, and opposing
net / absolute close-path efficiency. Powerbar definition is local: range>=1.25
baseline, body>=60%, adverse outer25% close. Terminal compact suffix ends at
signal, total span<=1.3 baseline, adjacent overlap>=50% of smaller range. Empty
suffix is allowed. Inside-bar count and non-doji color changes are disclosed.
All exact definitions are in PRICE_ACTION_KNOWLEDGE_MAP.md. These observations
do not issue a strength grade, accept/skip entries, filter history or alter ATR
levels. The full method's strength-aware selection is still incomplete.

PatternPullbackEvidence.tsx shows values and source/local scope in the inspector.
Mini chart outlines the terminal suffix before confirmation in all modes.
Saved selected_setup_pullback_pressure is informational; imports recompute.
Updated product tour, source index, test runner and release test manifest.

Verification:
-Full npm run test:unit including TypeScript passed (pressure-unit.log).
 Production build passed (pressure-final-build.log), existing chunk-size warning
 only. After final copy changes,13 pullback/room/pressure regressions passed
 (pressure-final-regression.log). Diff check passed.
-Five new pressure behavioral/SSR tests cover mirrored LONG/SHORT, strong versus
 mild correction, two adverse powerbars, extra inside-bar buildup, hanging
 variant, empty terminal cluster, canonical saved-geometry revalidation,
 future/old-prefix independence, gaps/forming/invalid/unverified withholding,
 and actual chart/source rendering. No future candle enters pressure/cluster.
-All236 retained pullback receipts reproduced against the existing full local
 tape:11 contain opposing powerbars,21 contain terminal inside bars,25 have no
 compact terminal cluster. Stored pressure-real-receipts.json locally under
 artifacts/ui-verification. These are descriptive counts, not performance groups.
-Actual UI ordinal14 (UP,2024-11-26T19:30Z):44.8% local return,2 opposing bodies,
1 opposing powerbar,2-bar outlined terminal cluster;0.28 ranges/bar close speed.
 Ordinal42 (DOWN,2025-03-19T17:15Z):41.2% local return,4 correction bars,
2 opposing bodies,1 terminal inside bar in a2-bar cluster. Desktop and phone
 screenshots visually checked: pressure-long-chart-desktop.png,
 pressure-long-readout-desktop.png, pressure-short-inside-mobile.png,
 pressure-short-readout-mobile.png. Phone390x844 root width390; inspector body
 client/scroll widths both372. Candles remain teal/red and labels readable.
-Actual ordinal5(2024-11-08T10:20Z) has zero cluster, no outline, and explicit
 "No compact terminal cluster was measured." Both computational and UI checked.
-Actual174751-byte export:
 C:/Users/nngov/Downloads/quantsmart_XAUUSD_M5_2026-11-15T16-42-25-716Z.json.
 It saved the selected latest occurrence (preview navigation alone does not
 change main-chart selection). Copied to pressure-stale-receipt-import.json
 with optional pressure fraction/inside count set999. Actual upload resumed
 read-only context; reopened UI recomputed37.0% and0 inside bars, fake values
 absent. Source knowledge/hash and execution authority were untouched.
-Some browser commands temporarily returned no output/OS timeout. Same existing
 tab remained alive; screenshot and snapshot recovered, no server/tab restart.
 Latest console entries contain HMR debug only.

Final browser1419x921, chart-only, inspector closed, knowledge collapsed, Reset
LAST and scroll0; visually verified pressure-restored-chart-desktop.png.
Existing Vite PID8812 remains available. No tests/builds/agents left running.
MT5 terminal process still absent; runtime historical mode, live source not
verified, forecast withheld. Preserve SHADOW_ONLY / NO_DECISION /
live_apply_allowed=false. Next: wider source-grounded dominance/range context,
strength-aware setup selection, held-out source figures/cases, live availability
and focused legacy cleanup. Do not claim complete source-method implementation.

## 2026-11-16: pullback reversal version 2, recovered checkpoint

Replaced the nine-bar retracement proxy with a bounded 40-bar dominant-leg,
correction, EMA25, signal and separate close-confirmation structure. Read printed
125-129 and visually checked PDF135-139 including Figure5.16. Exact local rules
and partial-method limits are in PRICE_ACTION_KNOWLEDGE_MAP.md. Knowledge now
has66 reviewed pages and25 relationships;23 concepts remain13 geometry proxies
and10 source notes. Page index rebuilt438 records /425 OCR pages.

Version pullback-reversal-close-confirmation/2 requires a5-8-bar aligned leg,
2-8-bar correction,50-65% return (40-65% for locally strong legs), correction
average range no larger than leg, a seeded local EMA25 test, separate signal
and confirmation, and untouched opposite correction protection. Optional nearby
prior wick is descriptive. First-correction preference, complete M/W second
break, wider dominance and source-strength selection remain incomplete.

All164 retained occurrences (94 LONG /70 SHORT;43.29% next-bar hit rate)
reproduced from their causal prefixes. Other structural families unchanged:
combi164, regular break76, break pullback236. Mini chart shows full bounded leg,
origin/extreme/correction/turn/signal/confirmation labels and local EMA25;
inspector explains thresholds and migration. Saved receipts recompute on import.

Full unit suite passed before final detector refinements; afterward28 related
regressions, all4 final reversal tests, TypeScript and production build passed.
Logs: reversal-unit.log, reversal-final-regression.log,
reversal-final-detector.log, reversal-final-build.log (chunk-size warning only).
Real tape receipts: reversal-real-history.json. Desktop/mobile UI, ordinal2 UP,
latest DOWN, context ending at setup, Home keyboard and main-chart selection
were exercised. Phone390x844 had no overflow. Actual210778-byte snapshot export
quantsmart_XAUUSD_M5_2026-11-15T16-55-12-862Z.json imported successfully.

Visual artifacts under artifacts/ui-verification: reversal-source-check.png,
reversal-short-chart-desktop.png, reversal-structure-desktop.png,
reversal-long-mobile.png, reversal-long-main-desktop.png and visually verified
reversal-restored-chart-desktop.png. Restored1419x921 chart-only, inspector closed,
knowledge collapsed, LAST and scroll0. Same Vite PID8812 remains available;
historical launch mode, no MT5 terminal process seen, live source unverified.
No pending user question or running tests/agents at recovery. Preserve
SHADOW_ONLY / NO_DECISION / live_apply_allowed=false.

Remaining responsiveness issue: full retained141658-bar detector still takes
about16.48s synchronously (reversal alone2.8s). Next work moves history scanning
off the UI thread while preserving exact evidence and guarding stale responses.

## 2026-11-16: exhaustive price-action scan moved off UI thread

Recovered the prior reversal checkpoint without repeating source extraction or
restarting existing Vite. No child agents were running; prior failed child
launches were not retried. Existing changes were preserved.

Added priceAction.worker.ts, priceActionScan.ts and usePriceActionAnalysis.ts.
The page no longer calls detectM5PriceAction during render. The exact detector
now runs with the complete retained tape in a module worker. All13 concepts,
source metadata, full occurrence lists and setup receipts remain unchanged.
Each attempt owns a worker; change/unmount/error/success terminates it and
invalidates queued replies. Tape/symbol/attempt identity suppresses old evidence
in the render before effect cleanup. No blocking synchronous fallback.

Closed-bar polling dedup compares every UTC/OHLC/closed field, including interior
archive corrections, and copies detector inputs. Loading/error status is visible
in chart-only mode; failed startup/runtime/decode/clone has explicit retry.
PDF inspector pending evidence no longer claims similarity-filtered analogue
statistics. Current PDF markers wait for the complete scan. The separate bounded
6000-bar candle atlas remains on the main thread and can still cost about3s on
history reload; full app responsiveness is not completely optimized.

Snapshot imports now defer UTC occurrence restoration even when importing the
currently selected concept before evidence is ready. Both desktop and mobile
actual upload during scanning recovered pullback_reversal ordinal2/164 at
2024-11-07T08:10:00Z after completion; no saved geometry substitutes current data.

Verification:
-4 new worker tests passed: actual worker exact parity on2600 bars, complete
 evidence, gaps/forming refusal, cancelled queued replies, constructor/clone/
 runtime/decode/reported failures, retry and interior-correction dedup.
-Full npm run test:unit including final TypeScript passed (worker-unit.log).
 Production build passed (worker-build.log), separate24156-byte worker asset;
 existing chunk-size warning only. Snapshot contract assertion updated for the
 stronger async wait and rerun after adding same-concept coverage. Diff clean.
-Actual141658-bar scan:12.896s worker elapsed,243 ticks at50ms heartbeat, max gap
322.6ms during that scan while toggling chart context. This is one measured
 run, not a benchmark guarantee. It removes the former16s full-scan main-thread
 block, not all main-thread atlas/render work or scan CPU cost.
-Deliberately failed one browser worker constructor: statistics cleared to0
 census rows, explicit failure/retry visible. Restored native worker and actual
 Retry recovered13/13 with unchanged reversal164 /94 LONG /70 SHORT /43.3%.
-Phone390x844: root/scroll widths390, readable pending notice and candles;
 no horizontal page overflow. Desktop1419x921 restored chart-only, inspector
 closed, knowledge collapsed, Reset LAST and scroll0. Worker constructor and
 probe timers restored/cleared. Latest console entries HMR debug only.

Artifacts: worker-tests.log, worker-unit.log, worker-typecheck.log,
worker-build.log, worker-scanning-chart-desktop.png, worker-scanning-mobile.png,
worker-error-desktop.png and visually verified worker-restored-chart-desktop.png.
Actual failure screenshot is scrolled to source/census; failure text/retry was
also confirmed by DOM snapshot. PRODUCT_TOUR and knowledge-map docs updated.

Runtime still historical --dev --no-browser, Vite PID8812, URL5090/#home.
No tests/builds/child agents remain running. MT5 not live-verified; no server
restart or execution changes. Preserve SHADOW_ONLY / NO_DECISION /
live_apply_allowed=false. Goal remains active: complete source method, wider
dominance/strength, held-out figures, live MT5 verification and legacy cleanup
are unfinished. Next performance work may move the separate atlas off-thread
and measure structured-clone/render latency without shortening evidence history.

## 2026-11-16: analogue calculation worker and async focus recovery

Previous goal turn made verified progress by moving the full PDF detector
off-thread. This turn moves the separate focused6000-bar candle atlas off the
render thread, without changing detector mathematics, forecast gates or scope.
Added candleAtlas.worker.ts /useCandleAtlas.ts. The module worker uses exactly
analyzeCandlePattern(M5, adaptive:false,maxMatches:60); query time is captured
on dispatch so queue delay cannot change forming admission/freshness. Identical
closed tapes reuse results after full UTC/OHLC/closed comparison; changed tape,
symbol or retry hides old results immediately. Legacy routes do not enable it.

Extracted the existing cancel/error lifecycle to analysisWorkerTask.ts; the PDF
scanner delegates to it. Each job owns its worker; stop invalidates even queued
callbacks and detaches handlers. Constructor/clone/runtime/decode/reported
failures remain unavailable with explicit retry and no synchronous fallback.
Atlas pending/error has a visible notice and chart status. PDF history remains
complete two-year scanning; analogue forecast remains transparently capped6000
bars,60matches. Source coverage unchanged23 concepts /66 pages /25 relationships.

Actual UI QA exposed additional focus bugs: temporary empty matches must not
erase explicit analogue UTC focus even when the chart briefly has no tape
(idle); automatic PDF marker defaults cannot take that focus during independent
scans; and importing a snapshot from a different PDF lens cannot clear its
restored analogue ref while a pending occurrence restore owns the operation.
Fixed these in actual source effects and extended the executable ownership
regression. Explicit user concept selection still changes inspection context.

Desktop context mode had horizontal overflow only while many forecast gates
were missing: the unwrapped receipt span extended to1744px in a1412px client.
Changed receipt spans to min-width0/max-width100%/normal wrapping. Actual pending
client/scroll widths now1412/1412; phone390/390. No overflow hidden workaround.

Verification:
-7 worker tests passed, including real Node worker exact atlas parity with the
 captured clock, predictions/uncertainty/matches/walk-forward/current patterns,
 gaps/forming bars, cancelled replies and full PDF scan parity/failure cases.
-Full npm run test:unit with TypeScript passed (atlas-worker-final-unit.log)
 before last snapshot-focus guard/CSS changes. After those changes11 related
 regressions passed (atlas-worker-final-regression.log), final TypeScript and
 production build passed (atlas-worker-final-typecheck.log,
 atlas-worker-final-build.log). Existing chunk-size warning only. Newly updated
 focused-compute-cleanup test now runs in unit/release manifest. Diff check clean.
-Actual native concurrent run: atlas2348.5ms, PDF10807.7ms;197 ticks of a50ms
 heartbeat, max gap674.8ms across both jobs. One run, not a benchmark guarantee.
 Heavy scans no longer execute in React render; structured clone, chart render
 and all other main-thread work are not completely optimized.
-Deliberate atlas constructor failure yielded explicit unavailable/retry,
 forecast WAIT, no previous distribution. Restoring native Worker and clicking
 Retry recovered original H+1 UP40% /FLAT25% /DOWN35%, WF81, support21,
 independent analogues17. Local historical data still withholds live forecast.
-BULLISH_HARAMI filter retained3 endpoints, selected1/3. Normal history refresh
 restored its main-chart active focus. Actual snapshot export/import:
 C:/Users/nngov/Downloads/quantsmart_XAUUSD_M5_2026-11-15T17-12-08-598Z.json.
 Saved analogue UTC2026-10-09T17:30Z. During a deliberate5s delivery delay,
 imported it while atlas pending and from a different Support/resistance lens;
 completion restored BULLISH_HARAMI3,1/3 and active main-chart focus. This delay
 is an async edge-case test, not included in the native timing measurement.
-Desktop and mobile screenshots inspected. Artifacts under ui-verification:
 atlas-worker-error-desktop.png, atlas-worker-pending-import-desktop.png,
 atlas-worker-pending-desktop.png (context scrolled to wrapped receipt),
 atlas-worker-pending-mobile.png (final screenshot, scroll0) and
 atlas-worker-restored-chart-desktop.png. Prior pending-import screenshot
 predates overflow fix; final pending desktop shows corrected wrapping.

Browser restored1419x921 chart-only, inspector closed, knowledge collapsed,
Reset LAST,scroll0; teal/red candles clearly visible. Native Worker restored,
probe timers cleared; latest console entries HMR debug only. Same historical
bootstrap PID6240 /Vite PID8812 remains; no restart. No tests/builds/agents
remain running. MT5 live remains unverified; authority unchanged SHADOW_ONLY /
NO_DECISION /live_apply_allowed=false. PRODUCT_TOUR updated.

Goal remains active. Next meaningful work: source-grounded wider dominance /
range and strength-aware selection, held-out source figures/case fixtures,
actual live MT5 when available, further focused legacy cleanup. Do not claim
the complete438-page source method or all app responsiveness is implemented.

## 2026-11-16: wider swing and range context

Added `patternMarketContext.ts` and `PatternMarketEvidence.tsx` to inspect up to96
causal closed M5 bars ending at the selected setup. The context detects five-bar
confirmed highs/lows (two later closed candles required), reports higher/lower/mixed
swing progression, bounded EMA25 slope, net close movement and close-path efficiency,
and measures repeated floor/ceiling bands only when there are at least four alternating
visits, eight-bar touch spacing, a four-median-range width and24-bar containment.
It flags a setup opposing the confirmed progression, an UP setup in a range's upper
quarter, or a DOWN setup in its lower quarter. These are explanatory measurements,
not setup filters or entry authority; gaps, forming bars, neutral/unverified evidence
and future pivots fail closed. Context view draws H1/H2/L1/L2 and an amber range box,
ending exactly at the setup close. Snapshot exports now retain an informational
`selected_setup_market_context` receipt and recompute it on resume.

Source anchors are printed pp.9-11 and130-131 (PDF19-21 and140-141). The map now
has27 anchored relationships, adding wider dominance and obstacle-room links to
pullback reversal; coverage remains23 concepts /68 reviewed pages. Actual UI QA on
2026-10-29T15:45Z showed a DOWN setup at19.1% of a repeated 4.90-median-range band,
with two floor and three ceiling touches, mixed swing steps, negative EMA slope and
an explicit lower-quarter concern. Desktop client/scroll widths were1412/1412 after
inspector open; chart-only was restored at1412/1412. A mobile responsive check from
the preceding version remains390/390. Tests: market-context5/5 plus32 targeted
regressions, TypeScript, production build and full unit suite passed. Existing
historical fallback and SHADOW_ONLY / NO_DECISION / live_apply_allowed=false remain.

## 2026-11-16: pullback reversal version3 second close break

This checkpoint extends the source-grounded pullback-reversal study from version2 to version3. The source review covered printed pages129-131 (PDF139-141), plus a visual check of Figure5.16 on printed126 and Figure5.17 on printed130. Printed129 describes a first reversal break, opposing return and second break (W in a bearish pullback / M in a bullish pullback). Printed130-131 warn that trend versus range, competing wider structure and continuation near a range boundary can invalidate an attractive local turn. Curated coverage is now23 concepts /68 reviewed pages /25 relationships; `docs/price_action_page_index.json` was rebuilt from the existing OCR metadata. No new PDF extraction was performed.

`pullbackReversal.ts` now emits `pullback-reversal-close-confirmation/3` and a `breakSequence`: `FIRST_CLOSE_BREAK` or a bounded `SECOND_CLOSE_BREAK`. The second variant requires a prior EMA/extreme-tested signal, a separate confirmed first close break, an adverse-body opposing return that closes back behind the first edge, and a later signal/close break within local wick bounds. It is a close-only M/W proxy; it does not infer double pressure, intrabar order, the global attempt count, wider range selection, or source discretion. The UI labels S1/C1/R/S/C, shows the earlier edge, EMA and protection, and discloses all limitations. `priceActionDetector.ts` now exposes printed125-131 anchors.

Actual retained tape verification used141658 closed XAUUSD M5 bars from2024-11-04T16:10Z through2026-11-04T16:10Z. Version3 found167 occurrences:97 LONG /70 SHORT,158 FIRST and9 SECOND (7 LONG /2 SHORT). Next-bar observations were41/97 LONG and32/70 SHORT; this is separate from the2.2/1 ATR24-bar study. Every receipt reproduced exactly from its endpoint prefix. Full receipt report: `artifacts/ui-verification/second-break-real-history.json`.

Tests and UI verification: pullback-reversal tests5/5; focused/source/detector/worker regression23/23; TypeScript passed; production build passed (`artifacts/ui-verification/second-break-final-build.log`); diff check clean. Actual desktop inspected LONG and SHORT second occurrences, chart SVG contains the dashed first-break edge and S1/C1/R/S/C labels. Mobile390x844 had client/scroll widths390/390 with readable mini chart and no horizontal page overflow. Snapshot export/import resumed `pullback_reversal` and the selected UTC viewport. Runtime remains historical fallback; MT5 live is not verified; SHADOW_ONLY / NO_DECISION / live_apply_allowed=false remains unchanged.

Additional completion receipts: `npm run test:unit` finished exit0, including its TypeScript check, before the last small description/protection-copy edits. The final23-test regression and final production build passed after those edits. Source-range/count updates are covered by the source/detector parity tests. Screenshots saved as second-break-short-desktop.png, second-break-long-desktop.png, second-break-long-mobile.png and second-break-restored-chart-desktop.png under artifacts/ui-verification. Exported snapshot: C:/Users/nngov/Downloads/quantsmart_XAUUSD_M5_2026-11-16T04-37-38-222Z.json; import restored selected concept and main viewport2025-05-15T09:50Z through2025-05-16T05:10Z, including focus2025-05-15T19:00Z. Inspector itself remains closed after import; this is not proof that it automatically reopens. Desktop restored1419x921,chart-only,Reset LAST,scroll0; client/scroll width1419/1419,inspector closed. Console shows Vite debug/devtools info only. No test/build jobs or child agents remain; existing bootstrap6240/Vite8812 were preserved.

One subagent launch failed because the inherited model alias cx/gpt-6.1-sol was unavailable. No model override or repeated launch was attempted. Manual audit and executable tests were completed directly. Goal remains active: wider trend/range and dominance/strength selection, held-out PDF figure/case fixtures, full source-method coverage, actual MT5 live verification and further legacy cleanup are unfinished.

Final wider-context receipts: mobile390x844 was tested on the current code with client/scroll widths390/390; rendered evidence wraps correctly. Export C:/Users/nngov/Downloads/quantsmart_XAUUSD_M5_2026-11-16T04-48-05-215Z.json retains selected_setup_market_context at2026-10-29T15:45Z, MIXED swings, DOWN_NEAR_REPEATED_FLOOR, position0.1914845686 and source pages9,10,11,130,131. Screenshot artifacts: market-context-chart-desktop.png, market-context-evidence-mobile.png, market-context-restored-chart-desktop.png. Full unit suite passed before the last snapshot type/map/caption changes; final15 targeted snapshot/context/source/map tests, final TypeScript and build passed after them (market-context-final-{tests,typecheck,build}.log). No claims of full source dominance or automated setup filtering; broader selection, source fixtures, live MT5 and legacy cleanup remain incomplete.


## 2026-11-16: focused loading layout QA

The focused M5 empty/loading surface was corrected in `mfe_ux_lab/cockpit/src/responsive.css`. The chart now owns the available flex height, while the loading card is width constrained (maximum 440px), padded, and its atomic status content uses a vertical layout with wrapping. This prevents the prior inline status run-on and collapsed 130px chart during a slow MT5 history request.

Actual browser QA held the real `/mt5/history` request at 390x844 and 1419x921. Mobile client/scroll widths were 390/390; the card measured 332px wide and 211px high inside a 366px chart. Desktop chart measured 1386px wide and 781px high; client/scroll widths were 1419/1419. Chart-only mode showed the same centered card over the full black grid. The original fetch was restored and the held request released; the app recovered to 141658 closed fallback bars with teal/red candles. Artifacts: `artifacts/ui-verification/loading-layout-mobile.png`, `loading-layout-desktop.png`, and `loading-layout-restored-chart.png`.

Validation passed: focused empty/chart status/accessibility/render-stability/chart-only/responsive contracts (7/7) and the production build (`artifacts/ui-verification/loading-layout-build.log`). No execution authority changed: SHADOW_ONLY / NO_DECISION / `live_apply_allowed=false`. MT5 live remains unverified.

The focused Live header also had a small UI duplication: the generic history chip and the focused connection badge both rendered fallback state, producing two nearly identical `LOCAL SNAPSHOT` labels. `Microscope.tsx` now suppresses the generic chip when `focusedLiveBadge` is present; the connection badge remains the single source of focused Live history provenance. Focused M5 surface, connection badge, chart-only and status accessibility tests pass; TypeScript and diff check pass. Mobile browser QA remains 390/390 with one fallback badge and readable teal/red chart.

## 2026-11-16: mobile OHLC legend separation

Mobile browser inspection showed the SVG OHLC/EMA legend competing with candle bodies and session labels in the 390px chart. `MicroChart.tsx` now renders a compact, responsive price legend above the plot below 480px; the SVG overlay remains for desktop. The legend exposes O/H/L/C, timestamp, EMA10 and EMA34, and uses the hovered candle's index so historical inspection does not report the endpoint EMA. The desktop overlay now uses the same indexed EMA values.

Actual browser QA: mobile plot width 364px, price legend 364px with no horizontal overflow (document width 390/390); hover changed the legend from the endpoint 11-04 16:10 candle to the selected 11-04 13:45 candle and updated both EMA values. Teal/red candles remained clear below the legend. Tests: chart endpoint/legend, responsive, phone provenance and layout passed (4/4); production build passed (`artifacts/ui-verification/chart-legend-build.log`); diff check clean. Execution boundary unchanged.

## 2026-11-16: Exness MT5 live promotion and closed-bar refresh

The user opened the Exness terminal. The owned historical launcher was stopped after verifying its PID/parent, and the workspace was restarted with `scripts/bootstrap.mjs --mt5 --dev --no-browser`. The read-only bridge connected to `Exness-MT5Real29` (`Exness Technologies Ltd`, account kind `REAL`) and resolved broker symbol `XAUUSD` exactly. No credentials were written or passed in a URL.

The authorized MT5 fetch returned XAUUSD M5 history with `MT5_CLOSED_BARS`, UTC timestamps, `forming_bar_included=false`, `read_only=true`, `SHADOW_ONLY`, `NO_DECISION`, and `live_apply_allowed=false`. The browser promoted `MT5 / 2Y CLOSED`; actual UI readout showed 141,178 closed bars, latest close `2026-11-16T04:55:00Z`, source `MT5_HISTORY_3Y - verified closed bars - read-only - latest two-year M5 view`, and a green `MT5 Sync` connection badge. Screenshot artifact: `artifacts/ui-verification/exness-mt5-2y-closed.png`.

A missing runtime behavior was fixed: focused M5 previously loaded the long tape only on mount. New `focusedM5Refresh.ts` probes the current account and two closed M5 bars every 60 seconds after promotion, then heals the exact gap through the account-scoped `catchUpMt5History` contract. It rejects account changes, forming bars, mismatched UTC/timezone/provenance, partial ranges and stale data, preserving the last verified tape until a complete update is available. `mt5HistoryCatchUp.ts` now accepts an AbortSignal and enforces all authority markers on refresh responses.

Validation: focused M5 surface, history catch-up and live-tail provenance tests passed; TypeScript passed (`artifacts/ui-verification/exness-refresh-typecheck.log`); production build passed (`artifacts/ui-verification/exness-refresh-build.log`); diff check clean. Runtime remains read-only and never enables execution.

The refresh was observed live: after the first promotion at `2026-11-16T04:55:00Z`, the focused chart advanced to `2026-11-16T05:00:00Z` and displayed 141,179 closed bars while retaining `MT5 / 2Y CLOSED`. The final desktop QA was reset to the latest visible window; client/scroll widths remained 1419/1419. Screenshot: `artifacts/ui-verification/exness-mt5-refresh-latest.png`.


## Current runtime override (2026-11-16 restart recovery)

The current runtime is connected to the authorized Exness MT5 terminal in read-only mode (Exness-MT5Real29). Focused XAUUSD M5 is verified closed-bar history with two-year display retention; auto-refresh advances only on newly closed bars. Candles use full-opacity TradingView-style teal/red. Position geometry retains translucent bands and renders ENTRY/TARGET/INVALIDATION captions once on the right-edge lines; duplicate zone captions are suppressed. Preserve SHADOW_ONLY / NO_DECISION / live_apply_allowed=false.


## Pan smoothness checkpoint (2026-11-16)

Focused MicroChart cursor pan now uses fractional pixel displacement coalesced through requestAnimationFrame, captures the stable SVG target, freezes the price domain during the gesture, and keeps integer UTC evidence bounds on release. Viewport reporting uses a ref so parent Microscope renders do not run on every pointer step; local storage writes are delayed 150ms. Empty/unrelated broker evidence skips full retained-tape timestamp parsing. Regression coverage is in tests/microchart-pan.test.mjs plus the viewport/interaction lanes. Real browser probe confirmed 1px pointer movement produces 1px candle movement, unchanged Y coordinates, and only five Date.parse calls during the short interaction.


## Pattern refocus checkpoint (2026-11-16)

The Pattern window's Show on chart action now resolves the selected occurrence by UTC identity, clears competing analogue/named-history focus ownership, and increments chartFocusRequest even when the same occurrence was already selected. Repeated clicks after Reset/manual pan return to the same retained candle; expired timestamps are ignored rather than mapped to a stale ordinal. Cursor updates are also gated while manual pan/pinch is active. Verified through browser interaction and focused-history tests. Final chart restored to chart-only latest view; runtime remains Exness read-only, SHADOW_ONLY / NO_DECISION / live_apply_allowed=false.

## 2026-11-16: post-restart pan and UTC identity verification

After Orca restart, the Exness-connected runtime recovered at `http://127.0.0.1:5090/#home` with the focused XAUUSD M5 chart and the read-only boundary intact. Browser QA restored chart-only/latest state: 180 visible closed bars, the newest retained M5 candle at the right edge, and full-opacity teal/red candles.

The cursor pan path was rechecked against the live SVG. Pointer movement is coalesced into one requestAnimationFrame, fractional pixel offset is preserved between integer candle bounds, and the Y-domain remains frozen for the gesture. The viewport keeps its integer UTC evidence bounds on release; Reset returns to the latest 180-bar view. Existing `microchart-pan`, viewport reanchor/persistence and interaction tests pass.

A retention identity audit also fixed historical PDF marker selection in `Microscope.tsx`: stale occurrence ordinals now resolve by UTC timestamp before opening the inspector or moving the main chart. Missing/expired UTC identities fail closed. Regression coverage passes in `pattern-occurrence-navigation`, `price-action-source-pages`, and `focused-m5-surface`; cockpit TypeScript passes.

Execution remains read-only: `SHADOW_ONLY`, `NO_DECISION`, `live_apply_allowed=false`.

## 2026-11-16: shell timeframe alignment

The global connection health probe previously checked M15 while the focused product surface displayed only XAUUSD M5. `ConnectionStatus.tsx` now probes the same verified closed M5 contract and describes the badge as `current M5 closed-bar feed`; its age window is five minutes plus the existing tolerance. This removes a misleading timeframe mismatch from the header while preserving account and attachment semantics and read-only behavior. Connection status UI, focused badge, cockpit typecheck and the focused browser snapshot passed after the change.

## 2026-11-16: technical protection and legacy graph cleanup

Added `patternTechnicalObstacleOutcomes.ts` and its focused regression. For the four implemented source-structure setup families, the study freezes the recorded `protectionReference` at confirmation, derives the nearest confirmed swing obstacle from a bounded 96-bar causal room context, and classifies obstacle-first, protection-first, same-candle ambiguity, timeout, incomplete, gap, invalid-data and unavailable paths. Aggregate and per-family denominators only include setup receipts with the supported technical structure; named/PDF concepts without that receipt remain in the existing H+1/ATR studies. The inspector now shows this study separately with explicit source/denominator and `SHADOW_ONLY / NO_DECISION` copy.

The unreachable standalone Pattern Atlas page and stylesheet were removed. Legacy hashes remain aliases to the focused home route, and stale MT5/Atlas test contracts now assert against the focused adapter, refresh and Microscope surfaces. The global connection badge was aligned from M15 to the focused M5 closed-bar probe. Focused outcome, barrier, room, inspector, navigation, connection, TypeScript and production build checks passed.
The technical study was then narrowed at the UI boundary to `evidence.history` rows carrying one of the four supported setup receipts, so a current named/PDF concept without `protectionReference` reports zero applicable setup observations rather than a misleading unavailable-rate denominator. Added `pattern-technical-obstacle-ui.test.mjs` and registered both technical tests in the default unit lane. Browser inspector QA showed the separate technical section, then the inspector was closed and chart-only/latest state restored.

## 2026-11-16: chart axis and focused-shell cleanup

The chart now has a dedicated near-black right price-scale gutter with a subtle divider, keeping axis labels separate from candle bodies and overlays while preserving the TradingView-like black canvas and teal/red candles. On the focused XAUUSD M5 home surface, the redundant `M5 · FOCUSED` identity chip is scoped out of the shell; the chart legend, header route and MT5 provenance still expose the timeframe. `MicroChart.tsx` also clears its cached pointer rect when generic pan cancellation owns the gesture; the pan harness was updated with the isolated ref fixture.

Validation passed: focused M5 surface/chart-only/compute-cleanup, microchart theme/responsive/status, interaction and fractional-pan contracts, cockpit TypeScript, and browser QA. Final browser state is chart-only/latest with 180 visible closed bars and `MT5 / 2Y CLOSED`; authority remains `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

## 2026-11-16: cached pointer geometry for smoother pan

The focused chart's pointer move path now caches the plot `DOMRect` once at gesture start and clears it on release or cancellation. Drag-pan no longer calls `getBoundingClientRect()` on every pointer event, avoiding synchronous layout measurement while the SVG is being repainted. Existing fractional-pan/RAF batching and frozen Y-domain behavior remain unchanged. Added a regression contract to `tests/microchart-interaction.test.mjs`; microchart pan/interaction, technical inspection/chart, source-map, TypeScript, production build and full `npm run test:unit` passed. Runtime remains Exness read-only with `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

## 2026-11-16: pan frame render reduction

The remaining drag hitch came from updating the crosshair/legend hover state inside every pan animation frame. `MicroChart.tsx` now keeps pan frames limited to the fractional viewport and offset, restores the final hover point once the pointer is released, and memoizes visible candle/marker slices so fractional movement does not repeat filtering work. The chart still preserves fractional pixel motion, frozen Y-domain and integer UTC bounds.

Validation passed: `node tests/microchart-pan.test.mjs`, microchart interaction/focus-refresh tests, cockpit TypeScript, production build and `git diff --check`. Browser QA confirmed the focused XAUUSD M5 chart remains chart-only/latest with `MT5 / 2Y CLOSED`; runtime remains Exness read-only, `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

## 2026-11-16: current pattern chart status

Focused XAUUSD M5 now renders a compact `Current pattern` strip directly above the plot. It carries the source-grounded concept name, deterministic detector explanation and printed PDF page anchors without requiring a marker hover, while its aria label and chart copy retain the descriptive `SHADOW_ONLY / NO_DECISION` boundary. The strip is only passed on the focused surface, so legacy routes do not gain another status layer.

Validation passed: focused current-pattern chart-status contract, full `npm run test:unit`, cockpit TypeScript, production build and browser QA with Exness `MT5 / 2Y CLOSED`. The final chart remains chart-only/latest.

## 2026-11-16: signal overlap render optimization

Visible signal overlap ordinals are now precomputed with a memoized count/seen pass. Fractional pan frames no longer rescan the full visible signal array for every marker while preserving fanned hit targets, stable overlap labels and keyboard position semantics. The focused interaction remains read-only.

Validation passed: microchart overlap accessibility, fractional-pan, interaction and full unit tests; cockpit TypeScript and production build remain green.

## 2026-11-16: clickable current-pattern chips

The focused chart's current-pattern strip now exposes one compact button per detected closed-bar concept. Clicking a chip routes through the existing read-only `onSignalSelect` path to open the PDF/source explanation, mini chart and historical statistics for that exact concept. The longer detector/PDF explanation is behind a compact `Why / PDF` disclosure so the chart keeps most of its vertical area. When no concept is present, the strip remains an explicit abstention message.

Validation passed: focused current-pattern chart-status, overlap accessibility, interaction, cockpit TypeScript, production build and diff check. Browser QA retained the black/white XAUUSD M5 chart with Exness `MT5 / 2Y CLOSED`; no execution authority changed.

## 2026-11-16: held-out chapter 7 failure-selection lens

Visually reviewed source pages printed 180, 184, 185 and 186 (PDF 190, 194, 195 and 196), including Figures 7.1 and 7.2. Added the source-only `trade_for_failure_selection` lens to the knowledge map, linking barrier reclaim and first-versus-mature reversal context to the existing `trade_selection_failure` concept. No numeric detector, outcome statistic or order path was added. The persistent page index now carries 72 curated pages and the source-index fixture verifies a Figure 7.2 OCR query. Authority remains `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

Final clickable-pattern verification: actual JSX regression executes both concept buttons and verifies exact marker identity is delivered to the inspector. Browser at 390x844 showed wrapped chips; desktop click on BUILDUP opened Buildup / Pre-Breakout Tension at 2026-11-16T09:35:00Z with the corresponding closed-bar mini chart. Inspector was closed and Reset returned to latest. Knowledge/source index/book regressions passed after the chapter 7 update. TypeScript and production build passed; unit runner finished its test lanes and final TypeScript without logged failures.

## 2026-11-16: drag-pan jitter follow-up

MicroChart drag-pan now keeps viewport-only filtering memoized for pivots, broker markers and replay markers, so fractional RAF frames no longer scan retained collections. Quote-only forming updates no longer rebuild the 141k-row timestamp identity or reconcile drawings/undo history; empty drawing sets return before timestamp maps are built. The executable drawing persistence regression covers 100 forming quote updates, closed-tape reanchor, and empty-set fast path.

Live browser QA on the Exness XAUUSD M5 surface measured a 120px drag as a 120px candle translation with unchanged Y coordinate and no crosshair during the gesture; Reset returned to the latest window. Desktop client/scroll width remained 1419/1419; iPhone 15 emulation remained 393/393 with a 367px chart. Current-pattern chips still include named candles and open the read-only inspector. Pan, interaction, overlap, drawing persistence/history, viewport reanchor, TypeScript, production build and full unit lane passed. Authority remains SHADOW_ONLY / NO_DECISION / live_apply_allowed=false.

## 2026-11-16: projection-filter pan follow-up

A focused jitter audit found one remaining hot-path scan in `MicroChart.tsx`: every fractional pan frame filtered the full `signals` array for projection overlays and recomputed pairwise caption collisions. The chart now memoizes `visibleProjectionSignals` from the already viewport-bounded signal set and memoizes nearby caption collisions by viewport/spacing. This keeps drag frames focused on pixel geometry while preserving projection and label behavior. Targeted pan/interaction/overlap tests, cockpit typecheck, production build and the full unit lane passed. Live Exness QA still measured a 120px drag as a 120px candle translation with unchanged Y; final browser state is desktop chart-only/latest XAUUSD M5, `MT5 / 2Y CLOSED`, read-only `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

## 2026-11-16: named-candle chip evidence and legacy renderer removal

Focused chart chips now expose observed H+1 UP / FLAT / DOWN distribution, explicit Atlas support state and observed H+1 sample for current named-candle concepts. The label intentionally uses the H+1 row only; it does not fall back to another horizon or convert a smoothed posterior into a directional win claim. The longer current-pattern explanation links the same causal posterior to the source lens and keeps exhaustive retained-history statistics in the inspector.

The unreachable legacy `CockpitChart.tsx` renderer was removed. Shared `ChartGlyph`, `CChartZone` and `CChartLine` primitives now live in `chartPrimitives.tsx`; MicroChart, Microscope, broker markers and card-zone/type consumers use that module. Renderer-specific tests now assert the focused MicroChart empty and large-tape contracts. This deletes the unused countdown/EMA/VWAP/pivot SVG renderer without changing read-only authority or the focused chart surface.

Validation passed: focused named-chip/status, named knowledge, focused M5 surface, candle evidence, empty/large-tape, position geometry, cockpit TypeScript, production build and the full unit lane; final browser chip showed `CANDLE · OUTSIDE_BAR · H+1 UP 37% / FLAT 17% / DOWN 46% · SUPPORTED n=7 · posterior`, desktop width/scroll width 1419/1419. Runtime remains Exness MT5 read-only, `MT5 / 2Y CLOSED`, `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

## 2026-11-16: absolute time-axis identity during fractional pan

The time-axis helper now chooses tick candles from absolute retained indices rather than rebasing the first label to each viewport. Adjacent fractional/integer pan frames therefore keep labels attached to the same UTC candle until the tick naturally leaves the plot, removing another visible axis jump while preserving bounded label spacing and phone readability. Layout and pan regressions plus cockpit TypeScript pass. Final browser state restored to desktop latest chart-only XAUUSD M5, with inspector closed and 1419/1419 client/scroll widths.
## 2026-11-16: binary viewport queries for drag-pan markers

The focused chart no longer filters the full retained pivot, price-action signal, broker-marker or replay-marker collections at each integer candle boundary during a drag. Pivots use an inclusive binary range slice; marker collections build a private sorted index once per source identity and query only the visible range while preserving source order and duplicate-marker keyboard semantics. Fractional RAF motion remains pixel-continuous and Y-locked. Added viewport/index regression contracts, including a 141k-row no-rescan check. XAUUSD M5 remains Exness read-only with SHADOW_ONLY / NO_DECISION / live_apply_allowed=false.
## 2026-11-16: directional labels and March case-study coverage

Historical pattern mini charts now render bounded, collision-safe LONG/SHORT ENTRY, TARGET and INVALIDATION captions with formatted prices for valid directional geometry. Labels remain withheld for neutral or unsupported geometry and carry the historical illustrative SHADOW_ONLY / NO_DECISION boundary. The outcome-chart regression covers both directions, neutral withholding and narrow-edge placement; browser QA opened a live Ceiling Test inspection and confirmed the captions and prices in the SVG accessibility tree.

The PDF knowledge map now curates printed pp. 250â€“253 (PDF pp. 260â€“263), Chapter 9 March 2012 case-study notes. Added source-only march_session_context links to ceiling tests, trade selection failure, round-number magnets, false highs/lows and consecutive review. This expands curated coverage to 76 pages without adding detector statistics or execution behavior. Source-index, knowledge-map and book-index tests, cockpit typecheck and production build pass.

## 2026-11-16: atomic pan frame state

The focused chart now commits the integer viewport and fractional pixel pan offset in one state cell. Crossing a candle boundary cannot render an intermediate combination of a new viewport with the previous offset, removing a remaining one-frame drag snap while retaining RAF coalescing, frozen Y-domain and timestamp-stable evidence bounds. The pan regression now exercises the atomic frame update and cancelled-gesture cleanup.

Validation passed: microchart pan, interaction, index, focused forecast-chip clarity and mobile-toolbar contracts; cockpit typecheck; production build; and the full `npm run test:unit` lane. Browser QA restored the desktop chart-only/latest Exness XAUUSD M5 surface with `MT5 / 2Y CLOSED`; authority remains `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

## 2026-11-16: current-bar readout and chart startup cleanup

The focused XAUUSD M5 price-action readout now includes the latest verified closed candle's UTC timestamp, OHLC values and descriptive body direction (`UP`, `DOWN` or `FLAT`). History and freshness gates control the direction; unavailable or unverified evidence remains `WAIT`. The readout keeps `SHADOW_ONLY / NO_DECISION` and does not create a forecast or execution path.

Mobile chart tooling now keeps the horizontal rail inside the measured chart width (`box-sizing: border-box`), eliminating the 8px content-box overflow that could create page-level horizontal scrolling. Legacy coefficient-table CSS is route-local instead of eager on chart startup, producing a separate legacy CSS chunk while keeping the focused chart entry smaller.

Validation passed: current-bar, mobile-toolbar, legacy-CSS lazy, forecast-overlay and pan regressions; cockpit typecheck; production build; and browser QA at 390px and desktop. Mobile measured `document.scrollWidth === 390` with a 364px tool rail; desktop restored to chart-only/latest XAUUSD M5 with Exness `MT5 / 2Y CLOSED`. Authority remains `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

## 2026-11-16: held-out source review registry

Added an optional `held_out_source_fixtures` registry to the price-action knowledge map for three already reviewed source cases: Figure 5.17 wider-context pages (printed 130-131), Figure 7.2 failure-selection pages (printed 184-185), and the March 2012 consecutive-session notes (printed 250-253). These records point to existing `SOURCE_NOTES` lenses and are validated as `SOURCE_REVIEW_ONLY` with `data_status=UNAVAILABLE` and `outcome_status=WITHHELD`; unknown fields, duplicate IDs, invalid page order/ranges, unknown lenses, and pages outside the lens fail closed. The source-index regression resolves each registry page to curated metadata without copying OCR prose.

This is provenance/coverage infrastructure only. It does not add PDF-derived OHLC labels, detector occurrences, outcomes, or execution authority. Source-index retrieval tests continue to use synthetic OCR snippets for mechanics; independent source figure/case OHLC transcription remains unfinished. Validation passed: price-action knowledge, source-index, book-index and source-page tests (14/14), cockpit TypeScript typecheck, and production build. Authority remains `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

## 2026-11-16: strength-aware setup review and source fixture registry

The historical pattern inspector now adds a descriptive strength/context review
lens. It combines each supported detector's bounded geometry score with the
causal wider swing/range receipt: local score buckets are strong at >=70%,
moderate at >=45%, and weak below that; pressure agreement requires local EMA
slope/net-close/efficiency checks. These are explicitly local review thresholds,
not PDF dominance definitions, probabilities, or cross-detector comparisons.
Opposing confirmed swings and repeated-range edge concerns take precedence over
the score, and pressure conflict is disclosed separately. Missing setup identity,
neutral direction, stale/mismatched UTC, invalid score or withheld context stays
WITHHELD. The census, historical denominators, forecast gates and order authority
do not change. `pattern-setup-selection` includes an integrated causal test that
mutates future bars and confirms the review receipt is unchanged.

The knowledge map now carries three provenance-only `held_out_source_fixtures`
for already reviewed Figure 5.17, Figure 7.2 and March 2012 session notes. They
link only to curated SOURCE_NOTES lenses and are hard-validated as
SOURCE_REVIEW_ONLY with market data UNAVAILABLE and outcomes WITHHELD. They do
not pretend that narrative PDF figures are XAUUSD OHLC labels. Independent
figure OHLC/outcome fixtures remain unfinished.

Added `docs/PROJECT_STATUS.md`, a compact requirement/evidence ledger for future
sessions. It records the focused chart contract, verification commands and the
remaining work without claiming that the full PDF method is implemented.

Validation after this checkpoint: focused setup-selection, wider market-context,
source map/index/fixture, pan/viewport/touch tests; cockpit TypeScript and
production build. Runtime remains Exness MT5 read-only, `MT5 / 2Y CLOSED`,
`SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

## 2026-11-16: final drag release and topology fast path

Drag-pan now commits the exact pointer-up coordinate, so coalesced pointer events cannot leave the chart short of the release point. Deferred refresh reconciliation skips the 141k-row timestamp map for quote-only copies with unchanged closed UTC topology; retention shifts, interior identity changes, and forming-tail append still re-anchor by UTC. Fractional offsets, frozen Y-domain, atomic viewport state, and read-only authority remain intact.

Validation passed: microchart pan (pointer-up harness and zero-scan quote refresh assertions), interaction, touch gestures, viewport re-anchor/persistence, cockpit TypeScript, production build, and browser QA on Exness XAUUSD M5. Measured drag geometry followed pointer displacement with unchanged Y. Authority remains SHADOW_ONLY / NO_DECISION / live_apply_allowed=false.

## 2026-11-16: editable chart drawings and source coverage expansion

The focused TradingView-like chart now supports selecting saved drawings with Cursor, dragging a shape body, dragging endpoint handles for trend/rectangle/Fib/measure shapes, moving horizontal lines/text/brush strokes, and deleting the selected shape with Delete or Backspace. Edits are preview-only until pointer-up and create one bounded undo snapshot; Escape cancels/deselects. Signal markers keep priority, empty chart pan and two-finger pinch remain intact, and drawing anchors stay integer closed-bar UTC identities so retention refreshes cannot silently move them.

Added `scripts/profile-chart-pan.mjs` and `tests/chart-pan-profile.test.mjs`, a foreground-tab diagnostic that records frame timings separately from geometry. It refuses hidden-tab samples, and the report requires exact displacement and frozen Y before declaring continuous geometry. Browser QA selected, moved and deleted a trend drawing; the final chart returned to latest XAUUSD M5 with no horizontal overflow.

The source map now includes the independently reviewed Chapter 10 printed pp. 387-390 (PDF pp. 397-400) as `compounding_sizing_cautions`, raising reviewed-note coverage to 80 pages. The lens stays SOURCE_NOTES with market data unavailable and outcomes withheld; it records cautions about hypothetical compounding, uneven weekly paths, account currency, stop distance and broker units without creating a sizing rule.

Focused startup cleanup moved shared orientation rules out of eager `guide.css`; Guide-only styles now load in the lazy HelpManual CSS chunk. Validation passed targeted drawing/pan/gesture tests, the full `npm run test:unit` lane, cockpit TypeScript, production build, source/index regressions and browser QA. Authority remains `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.


## 2026-11-17: Chapter 3 review completed

Chapter 3 is now 34/34 reviewed interval pages: pp. 33-65 content plus blank66.
The existing source lens spans36-65 and retains per-page cues and abstain limits.
Coverage is153/419, leaving266 chapter pages; the next chronological backlog is
Chapter4 printed72/PDF82 (no OCR; visual check required), then Chapter5 printed78.
Review receipt fixes earlier nonexistent render paths instead of claiming files exist.
No detector thresholds, historical counts, forecast policy or order authority changed.
Keep the overall goal active; source review is not complete strategy implementation.


## 2026-11-17: Chapter 4 divider and Chapter 5 entry context

Previous turn was progress: Chapter3 review completed at 34/34. This increment
visually confirms Chapter4 blank72 and reviews Chapter5 printed78-85, taking
coverage to162/419 (257 remaining), Chapter4 to6/6 and Chapter5 to30/70.
The new source-only chapter5_pattern_break_entry_context lens and its held-out
source receipt retain separate signal/entry bars, non-front-running discipline,
squeeze, false extremes, technical-test triples, magnets, obstacles, still-picture
intrabar uncertainty and tail-only reversal caution. There are13 source lenses
and13 provenance-only fixtures; still23 concepts,13 proxies/10 source notes.
Book index fixes misleading incomplete-review copy on complete chapters and
formats reviewed anchors as compact printed/PDF ranges with counts.
Receipts: artifacts/chapter4-divider-source-review.json and artifacts/chapter5-pattern-break-source-review.json. Source SHA and
438-page count verified; rendered individual pages are under tmp/pdfs/ch4ch5.
Next source backlog is printed86/PDF96. Keep full goal active.


Validation for Chapter4/5 increment:26 source/index/book/search/coverage/lazy
checks plus5 source-page/current-marker/snapshot/copy checks passed. TypeScript
and production build passed. Browser source-note snapshot confirms162 pages,
Chapter5 30/70, printed78-85/PDF88-95, front-running and tail-only cautions.
Receipt: artifacts/chapter5-browser-source-notes.json. Runtime remains MT5
Offline on the local fallback tape; no live-feed recovery is claimed.


## 2026-11-17: Chapter 5 regular-break review completed through96

Previous turn was progress: Chapter4 completed and Chapter5 source notes began.
Visually reviewed individual full-page renders for printed86-96/PDF96-106,
including Figures5.3-5.5 and surrounding text. The source-only Chapter5 lens
now covers78-96 with arch progression, non-fixed buildup counts, barrier
adjustment, signal protection, adverse magnets, flag/pole balance, borderline
selection, counterbreak caution, mature squeeze and matching two-bar extremes.
Coverage173/419 leaves246 pages; Chapter5 is41/70. The next pending page is98
(PDF108); do not rereview97 by assuming the chapter is a contiguous backlog.
Review receipt: artifacts/chapter5-pattern-break-source-review-86-96.json.
Existing individual renders: tmp/pdfs/ch4ch5/printed_86.png through printed_96.png.
Still23 concepts,13 proxies/10 source notes,13 source lenses/fixtures,30 edges.
The source examples add no OHLC, fills, win rates or execution authority.

## Latest checkpoint: five-agent incremental workflow and Chapter 5 pullback/combi review

This session used five disjoint workstreams in two waves because the runtime supports four concurrent agents including the root: source review, focused UI accessibility, MT5 data integrity, historical-statistics audit, and startup-graph cleanup. The source-review wave visually inspected printed pp. 97-107 and 111-124 / PDF pp. 107-117 and 121-134 after verifying the supplied PDF SHA-256. Chapter 5 is now 59/70 and global curated coverage is 191/419, leaving 228 indexed chapter pages; the next chronological gap is printed p. 132 / PDF p. 142.

The new source-only lenses are `chapter5_pattern_break_pullback_context` (printed pp. 97-107) and `chapter5_pattern_break_combi_context` (printed pp. 111-124), with matching held-out fixtures. They distinguish skipped first breaks, barrier/EMA tests, correction strength, angular versus blocky pullbacks, time correction, chart aspect-ratio limits, thin versus substantial combis, stale conditions, adverse magnets and news-sized environment changes. Narrative EUR/USD figures remain `UNAVAILABLE` / `WITHHELD`; no detector threshold, XAUUSD OHLC outcome, win rate, forecast gate or order authority changed. The map has 15 source lenses and 15 provenance-only fixtures. The page index was rebuilt from the attested 438-page extraction and now records 191 curated pages.

The focused chart now preserves the visible keyboard focus ring for SVG signal markers; the inline outline reset was removed and the regression passes. `marketDataSync.backfillFromMt5` now captures the account/server/generation cache scope before awaiting MT5 and rechecks it before persisting, preventing a detached response from contaminating a newly selected account namespace. Targeted UI, MT5, retention, merge and catch-up tests pass. Continue to preserve `SHADOW_ONLY`, `NO_DECISION` and `live_apply_allowed=false`.

Source receipts: `artifacts/chapter5-pattern-break-pullback-source-review-97-107.json`, `artifacts/chapter5-pattern-break-combi-source-review-111-124.json`; pullback page renders are under `tmp/pdfs/ch5-pullback`. The next source increment should review printed pp. 132-142. All five child agents have finished. Historical-statistics audit passed barrier, position, named-history and obstacle tests without a justified code change. Startup audit found legacy panels already lazy; isolating the disabled researchJobs hook remains a broader refactor. Full unit lane including TypeScript and production build passed; no test process or child agent remains running.

## Agent operating rule (updated user instruction)

For future continuation turns, split work into **10-15 independent child agents**, each with a separate task and disjoint file ownership. The runtime permits four concurrent agents including the root, so execute three children at a time across multiple waves. Cover source review, chart interaction/accessibility, MT5/data identity, retention, historical statistics/geometry, forecast, worker lifecycle, knowledge navigation, snapshots and cleanup as the backlog warrants. Audits may conclude without edits when evidence does not justify a change. The parent integrates results, runs full unit/typecheck/build, and updates this checkpoint and acceptance ledger. This supersedes the earlier five-agent rule.

## Latest checkpoint: Chapter 5 complete and focused startup cleanup

Printed pp.132-142/PDF pp.142-152 were rendered and reviewed after verifying the attested source SHA-256. Printed p.142/PDF p.152 is blank and has no concept/lens anchor. The source-only `chapter5_pullback_reversal_selection_context` lens covers pp.132-141 and preserves range-edge, flag/pole harmony, EMA lag, obstacle/magnet and selective-entry cautions. Its fixture is `SOURCE_REVIEW_ONLY`, `UNAVAILABLE`, `WITHHELD`. Receipt: `artifacts/chapter5-final-pullback-reversal-source-review-132-142.json`.

The compact source lookup is now generated and checked by `node scripts/price-action-source-index.mjs --compact-lookup` and `--check`; the source-index regression refuses stale output and invalid provenance. The focused route loads `LegacyResearchJobsController` lazily only for legacy diagnostics, so the focused chart no longer imports `researchJobs.ts`. The controller publishes results after render and the parent hides stale identity-mismatched results.

UI marker navigation consumes Arrow/Home/End/Enter/Space events and wraps at the ends. MT5 backfill requires matching broker symbol/timeframe and current alias scope. Historical barrier and technical-obstacle studies require UTC M5 grid alignment; off-grid bars are excluded from resolved denominators.

## Latest checkpoint: five-agent Chapter 6 and provenance audit (2026-11-17)

This session completed five disjoint tasks in two waves: Chapter 6 source review, focused chart accessibility, MT5 data integrity, historical-statistics correctness, and startup-graph cleanup. The source wave verified the supplied PDF SHA-256 and rendered printed pp.146-150 / PDF pp.156-160. The source-only `chapter6_manual_exit_context` lens and held-out fixture cover news slippage/spread, preplanned resistance exits, trend/range checks, and full-target comparison; narrative examples remain `UNAVAILABLE` / `WITHHELD`. Receipt: `artifacts/chapter6-manual-exit-source-review-146-150.json`. Global curated coverage is now 205/419, leaving 214 pages; Chapter 6 is 10/34 and the next gap is printed p.151 / PDF p.161. The map has 17 source lenses and 17 held-out fixtures, with 23 concepts and 30 relationships.

The focused chart's clickable signal markers now expose `role="button"` and `aria-haspopup="dialog"`, matching their Enter/Space inspector behavior while keeping the visible focus ring. MT5 backfill and multi-year history reject explicit `decision` values other than `NO_DECISION` and explicit `live_apply_allowed=true`; history cache version 5 forces re-attestation of v4 data that lacked these raw markers. Historical technical-obstacle studies now require setup confirmation UTC identity to equal the selected occurrence bar; stale, missing, malformed, or mismatched receipts stay out of resolved denominators. The focused startup import-graph regression proves `researchJobs.ts` and `LegacyResearchJobsController` remain outside the eager `#home` graph; no further cleanup was justified.

Verification passed: full `node scripts/test.mjs --unit`, cockpit `npm run typecheck`, production `npm run build`, compact source lookup `--check`, Chapter 6/source-map/index regressions, focused marker accessibility, MT5 authority/cache/retention tests, historical obstacle/barrier/position tests, and startup lazy-graph contracts. Preserve `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`; the next source review starts at printed p.151.

## Latest checkpoint: five-agent Chapter 6 continuation and UTC evidence hardening (2026-11-18)

This session completed five separate tasks in two waves. Source review verified the PDF SHA-256 and full-page renders for printed pp.151-157 / PDF pp.161-167; five newly curated pages raise global coverage to **210/419**, leaving **209**, and Chapter 6 to **15/34**. The next source gap is printed **p.158 / PDF p.168**. Lens/fixture totals are **18/18**. Receipt: `artifacts/chapter6-resistance-reversal-source-review-151-157.json`; renders are under `tmp/pdfs/ch6-manual-exits-151-157`.

The focused chart SVG now uses `role="group"`, preserving semantic child marker buttons and keyboard activation. Focused closed-bar research rejects malformed, offset, noncanonical and off-grid M5 timestamps, and invalid clocks fail closed rather than splicing unknown rows. Historical inspection-window, room and market-context helpers now reject uniformly shifted M5 tapes, matching outcome-study UTC-grid rules. Startup graph tests verify all App routes remain lazy and removed legacy route identifiers do not return.

Validation passed: full `node scripts/test.mjs --unit` (including TypeScript), production `npm run build`, source index/compact lookup checks, Chapter 6/map/panel tests, focused closed-bar and accessibility tests, historical context/outcome tests and startup graph contracts. Preserve `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`; full PDF translation and independently labeled OHLC holdouts remain unfinished. Next source review begins at printed p.158.

## Latest checkpoint: Chapter 6 resistance transition and focused UTC hardening (2026-11-18)

Five independent child tasks completed in two waves. PDF review covered printed pp.151-157 / PDF pp.161-167, with full-page renders and attested SHA-256; newly curated pp.151-155 raise coverage to 210/419 and Chapter 6 to 15/34. The source-only `chapter6_resistance_reversal_transition` lens and fixture cover resistance objectives, buildup/triangle transition, proactive resistance exits, reactive reversal development and M/W distinctions. Narrative examples remain `SOURCE_REVIEW_ONLY`, `UNAVAILABLE`, `WITHHELD`. Receipt: `artifacts/chapter6-resistance-reversal-source-review-151-157.json`; next page is printed 158/PDF 168.

The focused chart changed its root SVG to `role="group"` so interactive marker buttons are exposed correctly. `closedBarsForFocusedResearch` now rejects malformed, offset, noncanonical and off-grid M5 timestamps and invalid clocks. Inspection-window, room and market-context helpers reject shifted M5 tapes. The startup audit added an AST contract proving every App route remains lazy and removed legacy route modules stay absent. Full unit, typecheck, build, source-index and coverage checks passed. Preserve read-only `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false` authority.


## Latest checkpoint: Chapter 6 completed, drawing release fix and MT5 identity cache hardening (2026-11-18)

This session completed five separate tasks in two waves. Chapter 6 printed pp.158-176 / PDF pp.168-186 were rendered and visually reviewed after source SHA verification. Printed pp.158-175 add a source-only reversal/exit lens; printed p.176/PDF186 is a confirmed blank divider. Coverage is **229/419**, leaving **190** indexed chapter pages; Chapter 6 is **34/34** complete. The next backlog is Chapter 7 printed p.181/PDF p.191. Receipt: `artifacts/chapter6-reversal-exit-source-review-158-176.json`; totals are 19 source lenses and 19 held-out fixtures.

MicroChart drawing finalization now uses the actual pointer-up coordinate for trend, rectangle, Fib, brush and measure tools. Browser QA created a trend from synthetic down/move/up events, observed the persisted endpoint at the release coordinate, verified zero horizontal overflow, then undid the test drawing. Historical setup selection requires `market.contextEnd` to match confirmation UTC. MT5 multi-year range responses require exact symbol/timeframe identity markers; cache version 6 stores and validates timeframe and forces v5 refetch. Startup cleanup removed dead Microscope retention/advisory computations while preserving active overlay geometry and lazy diagnostics.

Verification: full unit lane, cockpit typecheck, production build, 25 MT5 tests plus retention/data-sync tests, source-map/coverage tests, focused drawing/context/startup regressions and browser QA. Preserve `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`; independently labeled PDF OHLC/outcome holdouts and complete source implementation remain unfinished.

## 2026-11-18: Chapter 8 review and evidence/interaction hardening

The source wave visually reviewed Chapter 8 printed pp.212-220 / PDF pp.222-230 after attested source verification. Nine newly curated pages raise global coverage to **265/419**, leaving **154** indexed chapter pages; Chapter 8 is **10/34** reviewed overall, through printed p.220. The map now has **21 source lenses** and **21 provenance-only held-out fixtures**. Receipt: `artifacts/chapter8-recap-source-review-212-220.json`; renders are under `tmp/pdfs/ch8-212-220`. The next source gap is printed p.221/PDF p.231; Figure 8.4 continues there, so its complete review remains pending. Narrative PDF examples remain `SOURCE_REVIEW_ONLY`, `UNAVAILABLE`, `WITHHELD`; no XAUUSD OHLC, win rate or execution authority was inferred.

Evidence contracts keep continuity and observed H+1 outcomes strict, and named-candle receipts are `INVALID` when identity or source verification is insufficient. The walk-forward gap fix prevents stale or gapped histories from passing freshness gates. Escape cancellation now clears active drawing and pinch gestures. Snapshot restoration validates sparse arrays and preserves explicit UTC identity without falling back to a stale index. The focused chart authority remains `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

Targeted source, forecast, drawing, snapshot and interaction checks pass. The later integration pass completed the full unit lane and cockpit typecheck/build; see `artifacts/session7-followup-integration.log` and `artifacts/session7-followup-build.log`.

## 2026-11-18: Chapter 8 continuation and integration hardening

The current source increment reviews printed pp.221-229 / PDF pp.231-239, adding nine curated pages. Chapter 8 is **19/34** reviewed through printed p.229; global coverage is **274/419**, with **145** indexed chapter pages remaining. There are **22 source lenses** and **22 provenance-only held-out fixtures**, with 23 concepts and 30 relationships. Receipt: `artifacts/chapter8-recap-source-review-221-229.json`. The source-only `chapter8_recap_session_examples_context` lens covers the Figure 8.4 continuation and Figures 8.5-8.8, retaining blocky/angular correction, UK Open technical-test, false-high/50-level, manual-exit and conservative-entry context. Source examples remain `SOURCE_REVIEW_ONLY`, `UNAVAILABLE`, `WITHHELD`. The next gap is printed **p.230/PDF p.240**.

Integration work addresses duplicate/chronological retention handling, exposes the inspector's scrollable details as a named keyboard-focusable region, strengthens drawing timestamp validation, gives the forecast readout an accessible status role and registers regression checks in the default unit runner. These changes preserve causal evidence and the focused `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false` boundary. Source review remains separate from detector implementation and measured outcomes.

Full unit, cockpit typecheck and production build checks pass; logs: `artifacts/session6-final-unit.log` and `artifacts/session6-final-build.log`. Full PDF translation and independently labeled XAUUSD OHLC/outcome holdouts remain unfinished.

## 2026-11-18: Chapter 8 complete and selected-inspector source notes

The source wave verified the attested PDF and visually reviewed printed pp.230-244/PDF pp.240-254. Printed pp.242/244 are blank and p.243 is a Part 2 divider; the new `chapter8_recap_harmony_and_patience` lens and matching provenance-only fixture cover pp.230-241. Chapter 8 is **34/34** complete, global reviewed coverage is **289/419**, and **130** indexed chapter pages remain. Totals are **23 source lenses** and **23 held-out source fixtures**, with 23 concepts and 30 relationships. Receipt: `artifacts/chapter8-recap-source-review-230-244.json`; renders: `tmp/pdfs/ch8-230-244`. Chapter 9 is 8/138 reviewed; next review is printed **p.249/PDF p.259**, then pp.254-382. Printed p.382 has no OCR and needs visual review. Narrative examples remain `SOURCE_REVIEW_ONLY`, `UNAVAILABLE`, `WITHHELD`.

This session completed ten independent child tasks. The implementation gap audit in `docs/PRICE_ACTION_IMPLEMENTATION_GAPS.md` led to the selected inspector's collapsed reviewed-source-notes feature. It loads the full map on expansion, filters lenses by concept ID and shows printed/PDF anchors, cues, abstain notes and explicit source-only limits within a bounded keyboard-accessible region. Loading/error/retry handling and Escape focus restoration are included. Browser QA at 320, 390 and desktop widths confirms zero horizontal overflow, a bounded 448px notes region, keyboard scrolling and restored toggle focus. Source notes add no detector rules, occurrences, XAUUSD OHLC or measured outcomes.

The current integration also hardens forecast support denominators, viewport timestamp validation, duplicate technical-obstacle evidence and worker error handling. Exact source-page search no longer lets `page 24` match p.240, and explicit PDF page queries convert to printed anchors using the verified 10-page offset; targeted search regressions pass. Preserve causal evidence and `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`. Current-session full unit and cockpit typecheck pass in `artifacts/session7-followup-integration.log`; production build passes in `artifacts/session7-followup-build.log`, with the existing large-chunk warning. Older session6 logs are historical evidence only. Full PDF translation and independently labeled XAUUSD OHLC/outcome holdouts remain unfinished.


## 2026-11-18: Session 9 event navigation, Chapter 9 April review and route retirement

This session assigns ten independent child tasks in waves. The attested PDF was visually reviewed for printed pp.273-292/PDF pp.283-302, adding the source-only `chapter9_april_context_and_conditional_management` and `chapter9_late_april_range_edges_and_patience` lenses and matching provenance-only fixtures. Global coverage is **329/419**, leaving **90** indexed chapter pages; Chapter 9 is **48/138**, with **27 lenses/fixtures**, 23 concepts and 30 relationships. Source receipts: `artifacts/chapter9-april-source-review-273-282.json` and `artifacts/chapter9-late-april-source-review-283-292.json`. Next review starts at printed **p.293/PDF p.303**; printed p.382 has no OCR and requires visual review. Narrative examples remain `SOURCE_REVIEW_ONLY`, `UNAVAILABLE`, `WITHHELD`.

The selected mini chart adds four attested event controls, candle highlighting, UTC/OHLC readout, scroll positioning and accessible status support in all three modes. Actual confirmation close and outcome origin map to the confirmation candle's open identity rather than the next candle. Window validation now requires real canonical UTC/M5 identities, a unique anchor and closed evidence; bounded 96+24 study input replaces unavailable identities with sentinels before OHLC reads and remaps exit indices after retention shifts. The selected UTC instant remaps across prefix/backfill changes, retention shifts and supported seconds aliases; expiry falls back to the anchor, clears the event and reanchors scrolling. Targeted selection/event/window checks pass 16/16 (7 behavior, 8 navigation and 1 window). Event navigation changes no occurrence count, outcome denominator, rate or executable fill.

The retired standalone KIDI Events hash resolves to home; navigation, package screenshot eligibility and the tour are updated while the shared Microscope witness remains (`artifacts/session9-kidi-retirement.json`). Browser acceptance passes 36/36 event selections and 36/36 keyboard clears across all three modes at 320px/390px/1440px, with zero horizontal overflow, a stationary price axis, a clear event footer/tag lane and a visible 2px focus ring. Retained local-fallback pattern-break occurrence 76/76 has confirmation open 21:25 UTC and actual close 21:30 UTC, with MT5 Offline. The retired hash resolves to home. Receipt: `artifacts/session9-mini-event-browser-qa.json`, with nine screenshots. Production build passes in `artifacts/session9-final-build.log`, with the existing large-chunk warning. Final full unit lane and cockpit typecheck pass in `artifacts/session9-final-unit.log`; prior logs are historical only. Preserve `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`; full PDF translation and independent market-data/outcome holdouts remain unfinished.


## 2026-11-18: Session 10 price rail, Chapter 9 May review and summary-route retirement

This session assigns ten independent child tasks with disjoint ownership, in waves within the three-child runtime limit. Twenty full-page source reviews cover printed pp.293-312/PDF pp.303-322. New source-only lenses `chapter9_early_may_selection_and_news_context` and `chapter9_mid_may_patience_and_conditional_exits` have matching provenance-only fixtures. Global coverage is **349/419**, with **70** indexed chapter pages remaining; Chapter 9 is **68/138** and totals are **29 lenses/fixtures**, 23 concepts and 30 relationships. Receipts: `artifacts/chapter9-early-may-source-review-293-302.json`, `artifacts/chapter9-mid-may-source-review-303-312.json`. The next gap is printed **p.313/PDF p.323**; p.382 still requires visual review because OCR is unavailable. Narrative figures remain `SOURCE_REVIEW_ONLY`, `UNAVAILABLE`, `WITHHELD`.

The selected mini chart replaces crowded inline ATR text with a stationary 108px price rail. Seven distinct AE/AT/AI/TP/TO/SB/SP labels show exact levels with an ATR / TECHNICAL / SETUP legend, minimum 18px text separation and label Y bounded to 14..178. Price geometry remains unchanged. Out-of-range labels explicitly mark their status with an asterisk and omit off-plot leaders. Rail, plot overlays and captions share validated evidence; unique closed UTC/M5 signal identities, exact signal edges and matching technical protection receipts reject stale references. Existing candle event controls and keyboard behavior remain. No detector, occurrence, outcome denominator, rate or execution authority changes. Independent source audit confirms all 20 render hashes, source SHA-256, anchors and statuses; the four new source-review/level-rail regressions are registered and pass.

Final browser QA passes 9/9 width/mode combinations at 320px/390px/1440px with seven labels, minimum 18px spacing, zero text overlap/horizontal overflow, a stationary 108px rail, exact true-price-Y matching and a 158px plot at 320px. Retained pattern-break occurrence 76/76 remains MT5 Offline. All 36 event selections and 36 Arrow clears pass with visible 2px focus; 18 close/origin checks preserve 21:25 candle/21:30 actual close. Final post-update 320px context Enter/Arrow and both retired aliases pass. Receipt: `artifacts/session10-price-rail-browser-qa.json`, with ten PNGs. Runtime/startup audit passes 37/37 (`artifacts/session10-price-rail-runtime-audit.json`); synthetic helper timings are bounded audit evidence only. The previous next-visual-cleanup item is implemented and browser-verified.

Entry & Danger and Weekly Audit pages are removed from App/navigation and future package screenshot eligibility; their tour sections are retired, old hashes resolve home, and shared backends/helpers and stored data remain. Receipt: `artifacts/session10-summary-route-retirement.json`. Final build after the last consistency fix passes in `artifacts/session10-final-build.log`, with the existing large-chunk warning. Final exact-state full unit lane and cockpit typecheck pass in `artifacts/session10-final-unit.log`. Older logs are historical only. Preserve `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`; full PDF translation and independent XAUUSD OHLC/outcome holdouts remain unfinished.


## 2026-11-18: Session 11 selected-level identity, Chapter 9 late-May/June review and StrategyRanking retirement

Session 11 assigns **10 independent child-agent tasks**, run in waves within the three-child runtime limit: level-selection UI, source review pp.313-322, StrategyRanking retirement, identity hardening, source review pp.323-332, accessibility, browser, runtime, source consistency and documentation. This session adds **20** full-page reviews, printed pp.313-332/PDF pp.323-342. Coverage is **369/419**, leaving **50** indexed chapter pages; Chapter 9 is **88/138**. The map has **31 source lenses** and **31 held-out provenance-only fixtures**, 23 concepts and 30 relationships. Receipts: `artifacts/chapter9-late-may-source-review-313-322.json` and `artifacts/chapter9-june-source-review-323-332.json`. Next review starts at printed **p.333/PDF p.343**, through p.382, whose OCR is unavailable. Independent source consistency passes 20/20 actual render/OCR hashes, source PDF SHA-256, printed/PDF anchors and source-only states (`artifacts/session11-source-consistency-audit.json`).

Seven native rail/legend selectors identify ATR entry/target/invalidation (**AE/AT/AI**), technical protection/obstacle (**TP/TO**) and setup break/protection (**SB/SP**) by exact descriptor ID. Selecting or toggling a role updates live meaning/status and the matching line highlight; coincident prices remain distinct. Strict UTC/M5 alias normalization and omission of derived study/technical `exitIndex` preserve selection through retention/backfill reindexing. Semantic receipt changes clear selection on first render and do not resurrect it. Three identity tests and five selection tests pass and are registered. Existing stationary 108px rail, label spacing and true-price geometry are retained.

StrategyRanking's standalone component/route is retired; old hashes resolve to focused home while shared Card data, storage and receipt artifacts remain (`artifacts/session11-strategy-ranking-retirement.json`). Final full unit and cockpit typecheck pass in `artifacts/session11-final-unit.log`; production build passes in `artifacts/session11-final-build.log` with the existing >500 kB chunk warning. Independent runtime/selection checks pass 46/46 plus 7/7 startup checks (51 distinct checks, two repeated) without product edits (`artifacts/session11-level-selection-runtime-audit.json`); accessibility passes 19/19 with no fix justified (`artifacts/session11-level-accessibility-audit.json`).

Dedicated browser QA passes **9/9** width/mode combinations (320/390/1440px across setup/outcome/context) on actual retained local-fallback Pattern break **76/76**, **141,178 closed M5 bars**, **MT5 Offline**. It passes **63 legend select/clear pairs**, **63 rail select/clear pairs**, **14 native Enter/Space pairs** and **36 Arrow event checks**. Minimum plot width is **158px**, rail width **108px**, minimum label spacing **18px**; horizontal overflow and rail text overlap are zero and true-price-Y maximum error is **0**. Receipt: `artifacts/session11-level-selection-browser-qa.json`, with **11 PNGs**. Separate `artifacts/session11-level-selection-320-selected-tp.png` and `artifacts/session11-level-selection-320-selected-sp.png` show independent TP/SP meanings at the coincident **4,032.28** price. No issues were recorded. The retired alias #strategy-ranking resolves to #home with title QUANTSMART and no load error; the dedicated QA tab was closed.

No source notes or provenance-only fixtures establish XAUUSD OHLC, detector behavior, executable fills or measured outcomes. No detector occurrence, count, denominator, rate, fill or order changes were added. Preserve `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`. Full PDF implementation and independently labeled OHLC/outcome holdouts remain unfinished.

## Session 12 bounded legacy route audit â€” Governance / Analysis (2026-11-18)

Standalone `#analysis` Governance summary was audited and retired. Its App lazy binding, hidden workspace registration, future release screenshot eligibility, and tour screenshot were removed; old hashes canonicalize to focused home via an explicit alias. Shared health/workspace/archive payload paths, analysis data files, CSS and research services remain available through their existing consumers (Debugger, backend and shared libraries). Receipt: `artifacts/session12-legacy-retirement.json`. Targeted navigation and focused lazy/startup contract tests pass; the final full-unit/typecheck/build and dedicated browser receipts above now complete parent integration. Authority remains `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

## Session 12 selected-outcome comparison and July source review (2026-11-18)

The source waves reviewed printed pp.333-352/PDF pp.343-362 in full-page renders after verifying the attested source SHA-256. New source-only lenses `chapter9_july_context_and_exit_ambiguity` and `chapter9_mid_july_context_and_selectivity` add 20 curated pages. Coverage is **389/419**, leaving **30** indexed chapter pages; Chapter 9 is **108/138**. Totals are **33 source lenses** and **33 held-out provenance-only fixtures**, with 23 concepts and 30 relationships. Receipts: `artifacts/chapter9-july-source-review-333-342.json` and `artifacts/chapter9-mid-july-source-review-343-352.json`; the next gap is printed **p.353/PDF p.363**, through p.382, with p.382 still requiring visual review because OCR is unavailable. Narrative figures remain `SOURCE_REVIEW_ONLY`, `UNAVAILABLE`, `WITHHELD`.

The selected inspector now presents two already-computed observations together: raw adjacent closed-bar H+1 direction and the separate local ATR target/invalidation path. It distinguishes agreement/opposition, target or invalidation first, unresolved same-candle/timeout paths, unavailable evidence and context-mode withholding. This is observational UI only: no detector occurrence, denominator, rate, fill, order or authority change. Receipts: `artifacts/session12-feature-audit.json`, `artifacts/session12-a11y-audit.json`, `artifacts/session12-outcome-comparison-tests.log`. Targeted comparison/accessibility/navigation/startup, source/index and identity/retention checks pass. Final full-unit/typecheck/build and browser receipts above complete parent integration; browser QA covers all 9 width/mode combinations and 36 event checks with no issues. Broker alias capture/revalidation prevents late MT5 responses writing under a changed broker key. Preserve `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.


### Session 17 final verification addendum

The integrated Session 17 lane now also includes the account-namespace race guard: a canonical account/server/generation transition invalidates an in-flight Auto-Attach response before it can restore an older cache scope. The focused mobile pattern shelf is bounded to a local 112px scroll region at widths up to 430px, retaining every chip, native keyboard control and `Why / PDF` explanation while keeping the plot visible. The mobile connection dialog controls use 44px minimum targets.

Final targeted checks pass: `mt5-auto-attach`, `connection-status-ui`, `connection-status-accessibility`, `session17-retention-identity-audit`, `focused-m5-refresh`, `focused-mobile-pattern-stack`, `microchart-modifier-shortcuts`, `legacy-beast-deck-cleanup`, `pattern-inspection-window`, `test-runner-registration`, and focused retention/identity suites. The full unit lane is recorded in `artifacts/session17-final-unit.log`; production build is recorded in `artifacts/session17-final-build.log` and retains only the existing large-chunk warning. Live Exness QA observed 141,660 verified closed M5 bars, a tail advancing through 04:45 UTC, zero horizontal overflow at 320/390/1440px, and `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`. At 390px the pattern shelf issue found by QA is addressed by the bounded scrolling shelf.

## Session 18 runtime connection diagnosis (2026-11-18)

Live read-only probes confirmed terminal64.exe, bridge :8791 and app :5090 are running. `/api/mt5/account` is connected to REAL Exness-MT5Real29 (read-only), and `/api/mt5/bars?symbol=XAUUSD&tf=M5&n=2` returns UTC verified MT5_CLOSED_BARS with no forming candle; the latest closed bar advanced during probing. The user-visible no-auto-connect symptom is explained by bounded frontend behavior: auto-attach runs only for NOT_ATTACHED, skips recurring hidden-tab polls, stops after three attempts with 20s/40s backoff, and stays paused after explicit Detach. A brief MT5 authorization/access-point reconnect was present in today's log. The shell has MT5_SERVER=Exness-MT5Real28 while the active terminal is Exness-MT5Real29; Auto-Attach ignores those credential defaults, but Advanced connection must use the exact active server/account. Focused M5 history refresh is 60 seconds and closed-bar-only, so the forming candle is intentionally withheld until its five-minute close. No product fix was justified in this diagnosis; authority remains SHADOW_ONLY / NO_DECISION / live_apply_allowed=false.

## Session 19 detailed reconnect implementation record (2026-11-18)

This session assigned **12 independent child-agent tasks** in four waves: reconnect implementation, reason taxonomy, UI regression, cache/retention review, accessibility, live runtime probe, focused refresh regression, documentation audit, full unit, production build and browser QA. The implementation is intentionally small and read-only: `canAutoAttachTerminal` now permits bounded empty-settings Auto-Attach for transient `TERMINAL_DISCONNECTED` and `ACCOUNT_UNAVAILABLE` responses as well as `NOT_ATTACHED`. `MT5_AUTHORIZATION_FAILED`, invalid terminal paths, account-switch validation errors, unsupported environments, connected accounts and explicit Detach remain manual-only or blocked. The existing three-attempt 20s/40s budget, visibility cancellation, operation-token race guard and `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false` boundary remain unchanged.

Added regressions cover both transient reasons, successful `/connect {}` followed by verified closed M5 health and `MT5 Sync`, rejection of authorization/unsupported/connected states, explicit-detach pause, cancellation and credential-free request bodies (`tests/mt5-auto-attach.test.mjs`, `tests/connection-status-ui.test.mjs`). Focused refresh/retention audits pass without broadening forming-bar, future-row or account-cache promotion. Live read-only evidence at roughly 05:42Z shows terminal64.exe, bridge :8791 and app :5090 healthy; account REAL `Exness-MT5Real29`, XAUUSD, latest closed M5 bars through 05:35Z, UTC provenance, no forming candle. Full unit `node scripts/test.mjs --unit`, cockpit typecheck and production build pass; the build retains the existing large-chunk warning only. No detector, denominator, win-rate, OHLC fixture, PDF qualification, fill, order or execution authority changed.

Next work remains the broader product objective: continue source-grounded PDF concept translation with independently labelled XAUUSD holdouts, improve focused browser evidence for reconnect transitions, and audit further legacy leaves only after reachability evidence. Preserve closed-bar fail-closed semantics and the explicit research-only authority boundary.

Receipts: `artifacts/session19-browser-reconnect-qa.json`, `artifacts/session19-final-unit.log` and `artifacts/session19-final-build.log`.

## Session 20 verified continuation (2026-11-18)

The continuation ran 12 independent tasks in waves. It added strict zero-range and malformed-row rejection to causal statistics and MT5 promotion, removed the unreachable BeastBuilder wrapper, added source-only knowledge labels, and registered the new audit regressions in `scripts/test.mjs`. Full unit, cockpit typecheck and production build now pass. Browser/runtime audit evidence remains contract-only because the local browser host was unavailable.

## Session 21 continuation (2026-11-18)

Three independent tasks covered source translation, holdout readiness and execution boundaries. The low-activity descriptor is causal and descriptive-only. Holdout readiness remains `NOT_READY` until a sealed independent XAUUSD M5 OHLC plus keyed outcome manifest exists. Manual demo receipts now fail closed on malformed broker payloads and expose a stable resolution taxonomy without adding live order authority. Full unit, typecheck and build pass.

## Session 22 bridge testability continuation (2026-11-18)

The bridge testability task added `bridge/tests/test_dependency_free_contract.py`
and narrowed optional-dependency skips to FastAPI, Pydantic, Starlette and
httpx import failures. `scripts/test.mjs` now honors `MFE_PYTHON`, runs
stdlib-only bridge contracts without installing packages, and still runs the
full integration lane in `.venv-mfe`. Receipt:
`artifacts/wave6-bridge-dependency-free-audit.json`.

Verification passed with system Python at 13 discovered tests, 9 passed and 4
optional modules skipped. The managed environment passed 92/92. The final
product lanes also passed `node scripts/test.mjs --unit`, cockpit typecheck and
production build. No runtime, detector, source qualification, OHLC fixture,
fill, order or authority claim changed. Independent XAUUSD holdouts and full
PDF translation remain unfinished.

## Session 23 candidate-source and holdout-contract continuation (2026-11-18)

The session verified one public Dukascopy XAUUSD tick source and recorded its URI, digest, BI5 format, UTC record window and MID-derived M5 rules in `docs/independent_xauusd_source_probe.json`. The source is a candidate only. Its partition is `CANDIDATE_ONLY`, selection lock and outcome definition are unset, and no OHLC rows or outcome labels are included.

The new `xauusdM5HoldoutValidator.ts` validates the future sealed manifest contract without bundling market data. It reuses strict closed-bar validation, enforces exact canonical label keys, source digest agreement, frozen outcome metadata and `SHADOW_ONLY` authority. `tests/xauusd-m5-holdout-validator.test.mjs` passes. Reviewed source notes now show an explicit review-only, unavailable-data and withheld-outcome descriptor. Independent holdout readiness remains incomplete until a sealed dataset and independently keyed labels exist.

## Session 24 checkpoint (2026-11-18)

The independent XAUUSD holdout path now has a dataset-free intake command at
`scripts/validate-xauusd-m5-holdout.mjs`. It requires a sealed manifest, keyed
labels and the raw source bytes, then delegates to the strict TypeScript
validator and emits a `READY` or `NOT_READY` JSON report. Running it against
`docs/independent_xauusd_source_probe.json` remains `NOT_READY` because the
probe is `CANDIDATE_ONLY` and contains no OHLC bars, selection lock or outcome
labels. Receipt: `artifacts/session24-xauusd-holdout-intake-audit.json`.

Regression `tests/xauusd-m5-holdout-intake.test.mjs` covers candidate rejection,
report authority and the no-bundled-data boundary. No bars, labels, rates, fills
or orders were generated. Preserve `SHADOW_ONLY / NO_DECISION /
live_apply_allowed=false`; the next verifiable artifact is a sealed XAUUSD M5
manifest plus independently keyed labels checked against the verified source
bytes.

## Session 24 documentation consistency addendum (2026-11-18)

The handoff and acceptance ledgers now use the Session 24 intake as the latest
continuation. The Dukascopy probe remains `CANDIDATE_ONLY` and `NOT_READY`, with
no bundled OHLC rows, selection lock or outcome labels. The Session 19
browser/runtime receipt still records an unavailable browser host, so Session 18
remains the visual baseline and no new live-market claim is made. The repository
has no `artifacts/session20-final-build.log`; the Session 20 unit log is not
treated as current acceptance evidence. Receipt:
`artifacts/session24-documentation-consistency-audit.json`; regression:
`tests/session24-documentation-consistency-audit.test.mjs`. Preserve
`SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

## Session 24 product hardening continuation (2026-11-18)

The chart accessibility pass hides dense candle, wick and indicator geometry
from the SVG accessibility tree while preserving semantic summaries,
annotations and controls. The knowledge book adds reviewed/pending/in-review
chapter navigation. Reachability review removes the unused `CockpitTelemetry`
wrapper and standalone instrument test while keeping shared telemetry services.

Calendar imports are now validated for bounded canonical UTC event identities,
duplicate rejection and deterministic ordering. Invalid configured API payloads
remain unavailable. Manual demo receipt normalization rejects successful
fill-like payloads with non-positive broker identifiers and requires
`ok=false` for unknown states. No live execution, detector, denominator, rate,
OHLC fixture or source qualification authority was added.

The complete unit lane, cockpit typecheck/build, 94-test managed bridge lane
and four built public-runtime checks pass. The local app endpoint was not
listening during the runtime audit, so no fresh browser or live-market claim is
made. Receipt: `artifacts/session24-runtime-browser-evidence-audit.json`.
## Session 25 source identity and runtime evidence continuation (2026-11-18)

The independent-source audit validates the retained raw probe bytes against its
attested SHA-256, HTTPS Dukascopy XAUUSD hourly BI5 identity, UTC hour bounds,
MID derivation and `CANDIDATE_ONLY` holdout state. It rejects a tampered tick
window and never creates OHLC or outcome labels. Receipt:
`artifacts/session25-independent-source-probe-identity-audit.json`.

The browser/runtime audit had no available browser host and no local listeners
on 5090 or 8791. Historical visual evidence remains layout-only and cannot
carry a current live claim. Receipt:
`artifacts/session25-runtime-browser-evidence-audit.json`; regressions are
registered in `scripts/test.mjs`. Preserve
`SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

The bounded `obstacle_room` audit confirms its linked source lenses and
fixtures remain `SOURCE_NOTES`, `SOURCE_REVIEW_ONLY`, `UNAVAILABLE` and
`WITHHELD`. `patternRoomContext` remains optional descriptive context and is
not promoted into detector qualification, forecast gates, outcomes or orders.
Receipt: `artifacts/wave6-obstacle-room-source-audit.json`; regression:
`tests/wave6-obstacle-room-source-audit.test.mjs`.

The focused snapshot staleness and Session 25 statistics denominator contracts
remain in the same deterministic unit lane. The registration regression checks
that focused snapshot staleness, obstacle room, independent-source identity,
runtime/browser evidence and statistics denominator each appear exactly once
in `scripts/test.mjs`.

The focused mobile accessibility audit raises phone chart reset, Why/PDF,
inspector action and disclosure controls to thumb-sized targets while preserving
bounded local overflow and focus restoration. Receipt:
`artifacts/session25-focused-mobile-accessibility-audit.json`; regression:
`tests/session25-focused-mobile-accessibility-audit.test.mjs`. The legacy
FirstRun wrapper and stylesheet are removed, and packaging and doctor references
now point to the shared Microscope CSV importer. Regression:
`tests/legacy-first-run-reachability.test.mjs`.

## Session 26 browser/runtime receipt (2026-11-18)

Fresh Orca browser evidence at `http://127.0.0.1:5090/#home` passes at desktop
1440x900 and mobile 390x844. Both viewports report `scrollWidth === clientWidth`
and the focused `XAUUSD M5` surface shows 141,178 closed bars ending at
`2026-11-11T07:35:00Z UTC`. Mobile toolbar and inspector controls retain 36px
minimum heights. Opening the Double Pressure inspector and closing it restores
focus to its invoking pattern button, with zero horizontal overflow while open.
The connection state is `MT5 Offline`, history is `LOCAL SNAPSHOT · HISTORY
UNAVAILABLE`, and provenance names the local historical fallback. The receipt
claims no live market data and preserves `SHADOW_ONLY / NO_DECISION /
live_apply_allowed=false`. Receipt: `artifacts/session26-browser-runtime-receipt.json`;
regression: `tests/session26-browser-runtime-receipt.test.mjs`.

## Wave 8 retention and snapshot identity audit (2026-11-19)

The focused XAUUSD M5 audit exercises equivalent UTC offset aliases, stale
snapshot age, future and off-grid snapshot/current identities, inclusive
calendar retention and malformed-tail rejection. Snapshot parsing keeps the
explicit research-only authority attestation. The audit cross-checks the
dataset-free holdout intake and Session 26 local-fallback browser receipt.
Receipt: `artifacts/wave8-retention-snapshot-identity-audit.json`;
regression: `tests/wave8-retention-snapshot-identity-audit.test.mjs`.
No detector, denominator, rate, fill, order, statistics or source
qualification change was made. Preserve
`SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

## Wave 10-11 continuation (2026-11-19)

Descriptor and observation state parity is now enforced by `tests/wave10-pdf-all-signal-concept-parity.test.mjs`. The unified result uses the bounded source-note detector descriptors for local context concepts, selected-candle/review descriptors for two concepts, and the translation contract for `position_sizing`. This keeps sizing unavailable until explicit user-supplied account and contract assumptions exist. Future rows, source outcomes, fills and orders remain withheld.

The performance boundary receipt verifies deterministic 23-concept evaluation over a 5,120-row closed synthetic XAUUSD M5 tape with bounded source prefixes. The live tick identity path now rejects cursor generation mismatches, invalid timeframe buckets, non-positive tick timestamps and malformed closed/forming relationships while allowing integral multi-period session gaps.

The bilingual chart shelf follow-up is complete. Compact headings, disclosure copy and chip accessible labels now follow the active English/Vietnamese locale. The focused shelf remains read-only and keeps the same authority receipt.

Receipts and regressions are `artifacts/wave10-pdf-all-signal-concept-parity.json`, `artifacts/wave10-pdf-all-signal-performance-boundary.json`, `artifacts/wave11-bilingual-chart-label-audit.json`, `tests/wave10-pdf-all-signal-concept-parity.test.mjs`, `tests/wave10-pdf-all-signal-performance-boundary.test.mjs`, `tests/live-forming-detection.test.mjs`, `tests/wave5-live-tick-freshness.test.mjs` and `tests/microchart-bilingual-shelf.test.mjs`.

Preserve `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

A fresh read-only MT5 run now verifies the unified PDF adapter on 4,999 closed XAUUSD M5 bars. Because the latest feed tail contains a broker session gap, the script selects the latest 96-bar contiguous causal prefix and records both feed-last and selected timestamps. All 23 concepts are returned, with source-only unavailable/withheld states where direction, event, bracket or account inputs are absent. Receipt: `artifacts/real-xauusd-m5-pdf-signal-verification.json`; command: `node scripts/verify-real-xauusd-pdf-signals.mjs`; regression: `tests/real-xauusd-pdf-signal-verification.test.mjs`. No outcome, rate, fill, order or execution claim is made.

Session 37 completed the final integration check. The full unit lane passes, including the real XAUUSD PDF verification receipt, wave 10 parity/performance tests, bilingual shelf regression and realtime freshness checks. Cockpit typecheck, production build and the managed bridge lane (97 tests) pass. The current live receipt uses 4,999 MT5 closed XAUUSD M5 rows and a latest 96-bar contiguous prefix before a session gap. Preserve the explicit research-only authority boundary.


## Session 38 handoff (2026-11-19)

The focused live browser verified the language toggle in both directions. The
English and Vietnamese shell, chart status, forecast status and source-note
surfaces update together. Focused readouts replaced ambiguous question-mark
separators with middle dots. The newest verified SSE tick now drives BID/ASK
readout even when a batch arrives out of order. Regressions include
`tests/live-ticks.test.mjs`, `tests/focused-live-tick-chart.test.mjs`,
`tests/current-marker-source-name.test.mjs` and
`tests/current-pattern-explanation.test.mjs`.

The unit runner registration typo for the 23-signal shelf was corrected. The
complete unit lane and production build pass. The 13 geometry-proxy concepts now have Vietnamese presentation copy, and
chart-local forecast/provenance headings follow EN/VI. English source
attestation, detector semantics and authority remain unchanged.
Preserve `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

## Session 39 handoff (2026-11-19)

Realtime copy and identity hardening are complete. `MicroChart` formats live
quotes by locale and replaces question-mark placeholders with readable
English/Vietnamese labels. The live forming readout remains observational and
localized across `PROVISIONAL`, `STALE` and `WAIT`. Browser DOM verification
confirmed no literal `\u00b7` escape remains and the separator is a real middle
dot. `liveTickModel` now rejects an off-grid `closed_bar` even without a
forming tail. Current-pattern CI95 and observed-outcome summaries use readable slash separators without question-mark placeholders. Receipt: `artifacts/session39-realtime-copy-audit.json`.

Targeted realtime tests, the full unit lane, cockpit typecheck, production
build and the managed bridge lane (97 tests) pass. All 23 PDF concepts remain
on the XAUUSD M5 observation surface. The 13 geometry proxies are deterministic
closed-bar observations. The 10 source-note concepts remain descriptive,
unavailable or withheld until independent labels and execution inputs exist.
No PDF narrative OHLC, outcome, fill, order or live-decision claim is made.
Preserve `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

## Wave 22 independent holdout readiness audit (2026-11-19)

The sealed XAUUSD M5 intake audit found a concrete validator gap. The holdout
path reused focused closed-bar validation that allowed `high === low`, so a
degenerate manifest row could pass as `READY`. The validator now requires
finite OHLC geometry with `high > low` and open/close inside the high-low
range. The regression is in `tests/xauusd-m5-holdout-validator.test.mjs` and
the receipt is `artifacts/wave22-holdout-readiness-audit.json`, registered by
`tests/wave22-holdout-readiness-audit.test.mjs`.

The independent Dukascopy probe remains candidate-only and no sealed holdout
or source-qualified accuracy exists. PDF narrative remains provenance-only.
No bars, labels, rates, fills, orders or execution authority were added.
Preserve `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

## Session 40 handoff (2026-11-19)

The PDF-to-XAUUSD observation surface now has a consistent disabled-state contract. `detectAllPdfSignals({ enabled: false })` withholds all 23 observations and reports 23 withheld rows. Wave 23 added detector and focused-copy regressions. The shelf accepts every concept state and routes non-detected concepts to the knowledge panel without manufacturing chart markers.

Source-note Vietnamese copy uses encoding-safe presentation strings. The focused pattern status accessible name, chip titles and authority copy follow EN/VI. Real MT5 receipt evidence remains read-only and closed-bar-only. Keep source review, detector geometry and measured outcomes separate. Independent holdout remains `NOT_READY`.

## Session 41 handoff (2026-11-19)

Wave25 acceptance closes four documentation gaps. The PDF shelf regression
ensures localized state labels remain complete strings in tile text and
accessible names (`tests/wave25-pdf-shelf-render-contract.test.mjs`). The
source-note localization receipt passes all 10 `SOURCE_NOTES` concepts while
preserving English source wording, ordered PDF anchors and
`SOURCE_REVIEW_ONLY / data UNAVAILABLE / outcome WITHHELD`:
`artifacts/wave25-source-notes-localization-audit.json` and
`tests/source-notes-localization.test.mjs`.

Realtime forming-bar handling now refuses to overwrite a promoted closed candle
when a delayed forming packet reuses the same M5 timestamp. The chart labels a
row as mutable context only when a genuinely newer forming row is appended.
Regression: `tests/live-ticks.test.mjs`. The existing overlap-accessibility
contract remains covered by `tests/microchart-overlap-accessibility.test.mjs`.

The fresh read-only MT5 receipt evaluates all 23 PDF concepts on 4,999 closed
XAUUSD M5 bars and a 96-bar contiguous causal prefix. Counts are 5 detected,
11 abstain, 5 unavailable and 2 withheld. Deterministic repeat and future-row
invariance pass. Evidence is `artifacts/real-xauusd-m5-pdf-signal-verification.json`,
`artifacts/session40-pdf-to-xauusd-audit.json` and
`tests/real-xauusd-pdf-signal-verification.test.mjs`.

All four targeted regressions pass. Preserve the distinction between source
review, detector geometry and measured outcomes, together with
`SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`. Independent holdout
readiness remains `NOT_READY`.

## Session 42 continuation (2026-11-19)

The focused copy audit is green after routing forecast receipt/status and
historical analogue labels through the locale map and replacing the last two
question-mark separators. Regressions are
`tests/focused-copy-runtime-audit.test.mjs`,
`tests/focused-forecast-status-a11y.test.mjs`,
`tests/microscope-bilingual-focused-copy.test.mjs` and
`tests/pdf-signal-coverage-shelf.test.mjs`.

The realtime feed boundary now requires canonical `symbol` and `timeframe`
identity whenever `parseLiveTickFrame` is called with expected feed scope.
Missing or mismatched identity fails closed. `tests/live-ticks.test.mjs`
covers missing identity, correct identity, wrong symbol, closed-only rollover
and stale same-timestamp forming packets.

The PDF parity, real-XAUUSD verification, realtime identity, full unit,
typecheck and production build lanes pass. Keep all source-only concepts
descriptive or withheld until independent XAUUSD labels and a separate
execution model are available. Preserve
`SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

Wave 27 contract review findings were resolved in the compatibility paths.
`pdfSignalTranslation` rejects duplicate selected UTC identities and invalid
quote-price bracket assumptions. `patternFailureSelectionContext` limits OHLC
validation to its 96-bar causal prefix while rejecting duplicate selected
identities. Geometry `ABSTAIN` now reports `dataStatus: AVAILABLE` when a
valid tape was evaluated. Regressions are covered by the wave 6 translation,
failure-selection and wave 10 parity tests. Broker aliases remain flexible,
while feed-scoped canonical `symbol` and `timeframe` are required before
forming presentation.

Wave 28 adds `pdfSignalVerification.ts`, which checks deterministic repeat,
23-row count reconciliation and future-row invariance on the unified scan. The
focused PDF shelf renders its EN/VI receipt. `detectAllPdfSignals` now forwards
validated `newsEvent` input and accepts an explicit later `observedThrough`
closed boundary for identity-only exit observations. `selectedTime` remains the
setup anchor and all outcomes stay withheld. Wave 28 source-note and holdout
audits pass. Holdout remains `NOT_READY`, with warm-up and terminal no-H+1
components retained as explicit evidence gaps.

## Session 43 continuation (2026-11-19)

The focused `MicroChart` now routes empty and insufficient-data states, drawing
toolbar labels, chart descriptions, live/closed-bar readouts and authority copy
through the shared English/Vietnamese locale. Technical identifiers remain
stable, and the chart continues to expose only the read-only
`SHADOW_ONLY / NO_DECISION / live_apply_allowed=false` surface. Targeted
MicroChart localization and PDF shelf contracts pass.

`pdfSignalVerification.ts` remains the deterministic receipt for the unified
23-concept scan. The latest read-only MT5 receipt evaluates 4,999 closed
XAUUSD M5 bars and records 5 detected, 11 abstain, 5 unavailable and 2
withheld observations. Repeatability, count reconciliation, future-row
invariance and UTC closed-bar identity pass. Identity-only exit observations
accept a validated later `observedThrough` closed boundary while
`selectedTime` remains the setup anchor. No outcome, fill, order or source
qualification is inferred. Receipt:
`artifacts/real-xauusd-m5-pdf-signal-verification.json`.

Cockpit typecheck, production build and the complete unit lane pass with the
existing large-chunk warning. Locale-aware empty-state, endpoint-context,
UTF-8, drawing-history, interaction and research-line contracts are green. The
real-feed causal-boundary receipt now mutates the first row excluded from the
selected causal prefix and confirms the 23-concept result is unchanged. The
Wave 28 holdout audit still records `NOT_READY` and retains warm-up and
terminal no-H+1 evidence gaps.

## Session 44 PDF verification provenance hardening (2026-11-19)

The PDF verification receipt now validates its source provenance at runtime.
Unsupported JavaScript source tags fail closed with
`UNSUPPORTED_VERIFICATION_SOURCE` before any detector run. Regression:
`tests/pdf-signal-verification.test.mjs`; cockpit typecheck passes. The
verification remains observational and preserves
`SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`. Independent holdout
readiness remains `NOT_READY`.

## Session 44 runtime and copy hardening (2026-11-19)

The disabled `useLiveTickFeed` path now opts out of terminal-generation
subscriptions while retaining the existing enabled-feed behavior. Regression:
`tests/live-tick-feed-disabled-generation.test.mjs`.

The PDF coverage shelf translates descriptor reason codes into complete
English/Vietnamese labels for direction, causal-prefix, event, bracket,
sizing and low-volatility states. Vietnamese accessible names no longer expose
raw uppercase reason codes. Regressions are
`tests/pdf-signal-coverage-shelf.test.mjs`,
`tests/wave25-pdf-shelf-render-contract.test.mjs` and
`tests/microchart-bilingual-shelf.test.mjs`.

These changes remain presentation/runtime quality fixes only. Preserve
`SHADOW_ONLY / NO_DECISION / live_apply_allowed=false` and the explicit
source-only outcome boundary.

## Session 45 read-first checkpoint (2026-11-19)

The detector-surface audit covers all 23 unified PDF concepts on XAUUSD M5 and
records the source/geometry split, disabled-state withholding, future-row
invariance and the fixed NEWS causal boundary. Without `observedThrough`, NEWS
events after the selected occurrence remain withheld. Receipt:
`artifacts/session45-pdf-detector-surface-audit.json`; regression:
`tests/session45-pdf-detector-surface-audit.test.mjs`.

The real PDF and 13-concept detector verification scripts now enforce the
retrieval-clock closed-bar boundary and retain closed-bar provenance, server
timezone and read-only markers. The realtime causal-boundary test validates
per-receipt identity relationships because the live selected ordinal can move
between refreshes. Counts remain observational, outcomes remain withheld,
holdout readiness remains `NOT_READY`, and the authority remains
`SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

## Wave 2 external-input coverage (2026-11-19)

The focused PDF detector now reads only the explicitly imported, validated
calendar from `mfe_calendar_events` for NEWS identity observations. Missing or
malformed storage remains unavailable. Bracket costs still require explicit
quote-price assumptions, reversal exits still require a validated adverse event
identity or level, and position sizing still requires explicit risk and stop
inputs. MT5 account and symbol-spec data alone do not supply those missing
inputs, so no inferred bracket, reversal, lot, fill or order is created.
Regression: `tests/pdf-external-input-coverage-wave2.test.mjs`. Preserve
`SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

## Session 48 handoff: all-23 historical census

`pdfSignalStatistics.ts`, `pdfSignalStatistics.worker.ts` and
`usePdfSignalStatistics.ts` now scan retained closed XAUUSD M5 rows in a bounded
causal prefix and aggregate every one of the 23 PDF concepts. The focused page
renders `PdfSignalStatisticsPanel` beside the 23-state coverage shelf. Geometry
proxy rows retain local detection frequency, direction counts and contiguous H+1
descriptive movement. Source-note rows remain descriptive, with rate,
directional and source-outcome claims withheld. English/Vietnamese labels and
loading/error states are present, and the phone layout bounds the table.

Passing checks are `tests/pdf-signal-statistics.test.mjs`, cockpit typecheck,
production build and strict language audit. The real XAUUSD verifier receipt now includes a timestamped all-23 census summary
from the latest closed MT5 read. The full unit lane was rerun after integration
and passed with the existing production chunk warning.


## Session 49 handoff: focused model panel and public-release preparation (2026-11-20)

Completed the focused chart presentation wave. `Microscope.tsx` now derives an orientation-aware named-pattern rate and renders bounded named causal history beside the chart. Neutral named patterns expose an explicit non-directional N/A state. Focused legacy sections are hidden with scoped CSS while context mode keeps the right-side model panel available. `responsive.css` keeps the focused shell header compact without contaminating the phone evidence-shelf contract.

Verified checks include `npm run typecheck`, `npm run build`, `tests/focused-chart-only-contract.test.mjs`, `tests/focused-m5-surface.test.mjs`, `tests/focused-current-pattern-chart-status.test.mjs`, `tests/focused-mobile-pattern-stack.test.mjs`, `tests/microchart-responsive.test.mjs`, `tests/microchart-pan.test.mjs`, `tests/microchart-marker-hover.test.mjs`, `tests/microchart-interaction.test.mjs`, `tests/microchart-overlap-accessibility.test.mjs`, `tests/pattern-atlas-contract.test.mjs` and `tests/named-candle-history.test.mjs`. `git diff --check` reports only normal Git line-ending warnings.

Next work remains source-qualified independent XAUUSD holdout validation, performance profiling on the public build and any future pointer-level browser reproduction with a live BUY/SELL replay marker. These remain separate from the descriptive focused panel.
