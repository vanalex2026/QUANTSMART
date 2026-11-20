# QUANTSMART project status

## Session 68 backend detector queue boundary (2026-11-20)

The focused XAUUSD M5 price-action hook now submits detector work to the
local backend research queue and consumes a versioned, hash-attested result
receipt. The client validates schema, operation, symbol/timeframe, authority,
and transitional browser-supplied tape scope before exposing markers. It keeps
the browser worker only as a compatibility fallback for unavailable backend
transport or legacy non-XAUUSD surfaces. Backend preflight now rejects
zero-range OHLC rows consistently with the detector.

The focused startup graph remains free of the legacy `researchJobs.ts` module.
Backend-client receipt, worker lifecycle, backend queue, lazy-startup and
typecheck checks pass. This is the first detector migration slice. PDF signal
coverage, PDF statistics and inspector source translation still require their
own backend contracts. Authority remains `SHADOW_ONLY / NO_DECISION /
live_apply_allowed=false`.

## Session 67 chart-only interaction and copy correction (2026-11-20)

The chart-only preference now preserves an explicit context choice across the
focused session instead of deleting it during read. A compact `Hiện ngữ cảnh` /
`Show context` control remains reachable below the fixed shell header, so the
large context surface can be restored without relying on Alt+C. Focused mobile
charts no longer render a duplicate OHLC header outside the SVG chart.

The chart accessibility summary now avoids duplicated research-landmark text
and uses Vietnamese wording for forming/latest endpoint readouts. Targeted
chart-only, accessibility, live-copy, research-line, typecheck and browser
checks pass. The authority remains `SHADOW_ONLY / NO_DECISION /
live_apply_allowed=false`.

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

## Session 65 durable-tail and backend-compute boundary (2026-11-20)

The durable M5 path now persists both `/bars` and `/history` responses. Range
history rows retain validated `tick_volume` and `spread`, so a successful M5
history assembly can seed SQLite before a restart. Restart recovery rebases the
returned tail to contiguous indices and remains scoped by account, server,
broker symbol and server timezone. The focused refresh nonce now bypasses the
three-second bridge tail cache, so a newly closed candle cannot be hidden by an
older in-process response. The running bridge was restarted and the live
Exness-MT5Real39 XAUUSD store contains 602 validated rows through
`2026-11-20T04:00:00Z`; SQLite integrity check is `ok`.

Bridge/store validation passed 72 tests with `.venv-mfe`, focused refresh and
viewport regressions pass, and `git diff --check` is clean. The authority stays
`SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

The requested compute boundary is recorded for the next implementation wave.
Detector, verification and statistics work must execute in the backend worker
queue, with the frontend limited to chart rendering, interaction and display of
versioned results. The current browser workers remain a compatibility path until
each detector hook has a backend result contract and parity receipt.

## Session 64 browser accuracy and durable candle storage (2026-11-20)

An independent end-user browser pass used the visible Orca tab while the 141,598-row statistics worker was running. Reset, PageUp, locale switching, detector-row selection and replay controls remained usable. Three foreground marker selections opened the inspector after 505.6 ms, 555.0 ms and 587.4 ms to the first inspector DOM mutation, median 555.0 ms. The selected rows exposed readable Vietnamese copy, exact UTC anchors and source-only outcome withholding. No paint timing claim is made.

The pass reproduced a stale startup chart while MT5 history was `LOADING`. A read-only SQLite store now persists validated XAUUSD M5 closed candles in `.mfe-state/closed-candles.sqlite3`, scoped by account, server, broker symbol and server timezone. The file is created on the first successful write; `MFE_CLOSED_CANDLES_DB` can select another path. The bridge atomically upserts successful MT5 bars/history and can serve a recent scoped tail when a connected terminal read returns no rows. The focused chart also probes the MT5 closed tail during history promotion and replaces the local snapshot when that tail passes the existing closed-bar contract. The store never saves credentials and never promotes a partial tail to `VERIFIED_MT5_CLOSED`.

The historical statistics panel now reports the rejected candle row and typed validation reason instead of rendering 23 zero rows when the complete tape is invalid. Detector-path optimization produced deep-equal results, progress checkpoints and receipts across the bounded equivalence sample. The measured mean change was within run variance, so no material speedup is claimed. Hover and replay inspector copy remain localized in EN/VI. Authority remains `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

Validation passed the SQLite store and dependency-free bridge contracts, statistics, panel, marker-hover, targeted replay/locale checks, cockpit typecheck, production build and `git diff --check`. Production retains the existing large-chunk warning. The running bridge process must be restarted once to load the new SQLite fallback code.

## Session 63 statistics progress and accessibility copy (2026-11-20)

The end-user scan now reports processed/total candidate rows alongside elapsed
time in both English and Vietnamese. Progress is emitted from the worker at
bounded checkpoints and does not change the complete closed-bar census,
causal-prefix length, denominators or source-outcome withholding. Marker and
trade aria labels use readable Vietnamese strings for saved candles, research
annotations and simulated observations.

Full unit (`UNIT_EXIT=0`), targeted statistics, lifecycle, panel, marker,
footer, typecheck and production build checks pass. The full retained
141,598-bar scan remains CPU-bound and can
still take more than four minutes. Authority remains
`SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

## Session 62 end-user performance, locale and connection follow-up (2026-11-20)

The direct browser pass now selects overlapping same-candle markers by pointer
without rectangle interception and keeps the chart responsive during the
23-concept scan. English and Vietnamese copy is readable across the focused
chart, current detections, session legend and Magnet/Lock/Clear controls. The
statistics panel reports elapsed scan time in both locales. A retained tape of
141,598 closed bars can still take more than four minutes to finish, so elapsed
time is exposed while the worker remains asynchronous.

Connection status now localizes account, health, Auto-Attach, dialog and failure
copy, including `vi-VN` amount formatting, while preserving the focused M5
closed-bar health probe. Marker focus semantics retain roving `tabIndex`, button
inspection and `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

Validation passed the full unit lane, cockpit typecheck, production build,
focused marker and bilingual audits, focused mojibake/runtime audits,
connection UI/accessibility tests and `git diff --check`. The long statistics
scan remains the only observed browser performance limitation.

## Session 61 marker hit-testing and detector copy follow-up (2026-11-20)

The browser marker race is narrowed at the SVG layer. Grid, sessions, zones,
projection bands and non-selectable overlays are pointer-transparent. Detector
and shadow-trade marker groups explicitly receive pointer input and stop event
propagation before chart pan begins. Vietnamese marker accessibility text now
uses readable labels for the saved candle, research annotation, measured shape,
next closed bar and withheld authority wording.

Regression coverage passes the marker overlap, interaction, pan, accessibility,
focused copy and bilingual runtime audits, plus cockpit typecheck. The long
statistics scan remains worker-bound and continues to expose elapsed time while
preserving closed-bar inputs and descriptive-only authority.

## Session 60 browser UX accuracy and readable-copy hardening (2026-11-20)

The independent end-user browser pass remains the source for interaction
findings. It confirmed pan, drag, Reset, keyboard and wheel zoom, EN/VI
switching, marker inspection and a responsive chart while the all-23 statistics
worker scans. A long scan over 141,598 retained closed bars still needs visible
elapsed progress, which is now exposed by the statistics panel. One pointer
marker hit can still be covered by a selectable chart rectangle, while keyboard
focus and Enter remain reliable.

The focused chart now exposes readable episode direction titles (`UP`, `DOWN`,
`FLAT`), removes corrupted BUY/SELL and TP/SL glyphs, routes the mobile candle
legend through the active locale, and keeps MT5 attaching/checking states
readable. The chart and connection status retain
`SHADOW_ONLY / NO_DECISION / live_apply_allowed=false` and closed-bar-only
detector authority.

Validation passed the full unit lane, cockpit typecheck, production build,
bridge suite (`98/98`), focused copy/mojibake audit, Wave 48 bilingual runtime
surface audit and `git diff --check`.

## Session 59 browser end-user follow-up (2026-11-20)

An independent browser user pass verified Reset, PageUp, End, keyboard and wheel
zoom, drag-pan, EN/VI switching, live-feed disclosure and marker inspection.
Wheel dispatch was approximately 0.5 ms for ten synthetic events and the chart
remained interactive while the 23-concept statistics worker scanned. The worker
still presents a static scanning message for more than 50 seconds on the retained
141,598-bar tape, so the UI now exposes elapsed scan time while preserving the
descriptive-only statistics boundary. Shift+wheel now pans horizontally while
preserving the zoom width. Research and broker overlays are non-interactive so
marker hit testing remains available to the focused chart.

The browser pass also found one stale pointer-hit race where a historical marker
was covered by a chart rectangle. Keyboard focus plus Enter remains reliable and
the overlay layers now use `pointer-events: none` where they cannot be selected.
The chart copy map restores bilingual empty states, toolbar labels, footer help,
session names and chart accessibility descriptions. Authority remains
`SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

## Session 58 browser end-user performance and locale verification (2026-11-20)

The direct browser UX pass measured wheel zoom and drag-pan at roughly 7 ms
median. Reload and Reset restore the recent 179-bar viewport over the retained
141,598 closed XAUUSD M5 tape. Research landmark, broker evidence and focus
overlays are non-interactive, so pointer selection reaches detector markers.
EN/VI switching was verified on the chart, current pattern explanation and all
23 PDF concept rows. Authority remains
`SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

Validation passed `npm run test:unit` (`UNIT_EXIT=0`), cockpit typecheck,
production build, bridge suite (`98/98`) and `git diff --check`. The browser
still emits a development-only Vite Fast Refresh warning for
`microChartDrawingSelection`. A cold-reset timing remeasurement remains next.

## Session 57 statistics worker stability and runtime verification (2026-11-19)

The focused PDF statistics worker no longer restarts on the 30-second focused
clock refresh. The census reruns when the retained bar tape or enabled state
changes, so a long all-23-concept scan can finish instead of being cancelled
by an unrelated age/readout update. The lifecycle regression and cockpit
typecheck pass. Browser verification reached the rendered 23-concept table,
then confirmed English/Vietnamese switching, live BID/ASK and the forming-bar
disclosure. Authority remains
`SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

Session 57 validation also passed the full unit lane (`UNIT_EXIT=0`), cockpit
production build, bridge suite (`98/98`), documentation consistency,
test-runner registration and `git diff --check`.

The fresh runtime verifier returned 5,000 closed XAUUSD M5 bars through
`2026-11-19T14:45:00Z`, with receipt retrieval at `2026-11-19T14:53:31Z`.
The neutral receipt records 6 `DETECTED`, 10 `ABSTAIN`, 5 `UNAVAILABLE` and 2
`WITHHELD` observations. In plain status terms, the neutral receipt records 6 detected, 10 abstain, 5 unavailable and 2 withheld. The `UP` and `DOWN` cases each record 9 `DETECTED`,
10 `ABSTAIN`, 4 `UNAVAILABLE` and 0 `WITHHELD`. Census accounting is 8 warm-up,
4,973 evaluated, 18 skipped session-gap and 1 terminal row. A separate forming
bar and real ordered proxied SSE tick remain available, while bridge stream
usage stays bounded at `5/16`. The account remains broker-reported `REAL` with
`trade_allowed=false`.

## Session 56 runtime and viewport verification (2026-11-19)

Fresh runtime probes verified account `268115110 / Exness-MT5Real39` as a
connected `REAL` account with `trade_allowed=false`, closed XAUUSD M5 data
through `2026-11-19T14:00:00Z`, a separate forming bar at `14:05:00Z`, and a
real ordered proxied SSE tick. The bounded stream count cleaned up from `6 -> 7
-> 6` under a limit of 16. Browser inspection confirmed live BID/ASK,
forming-bar disclosure, the 23-concept PDF surface and EN/VI switching. Reset
returns a persisted historical viewport to the latest retained bars. Authority
remains `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`. Empty
annotation and drawing-visibility announcements follow the active locale.

## Session 55 background realtime feed (2026-11-19)

The focused XAUUSD M5 chart no longer pauses its read-only SSE tick stream
when the browser tab is backgrounded. The stream remains bounded by the bridge
capacity guard and is still closed when the chart subscription is released.
This keeps BID/ASK and the forming-bar context available when the user returns
to the chart, while closed-bar detectors and statistics retain their existing
causal boundary. Targeted realtime, forming-bar and generation-race contracts,
plus cockpit typecheck, pass. Authority remains
`SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

## Session 54 bridge stream capacity and runtime verification (2026-11-19)

The local read-only bridge now bounds concurrent SSE tick streams with
`MFE_MAX_TICK_STREAMS`, defaulting to 16 and clamped to 64. `/health` exposes
the active count and configured limit, and excess streams fail with a typed
`TICK_STREAM_LIMIT` response instead of destabilizing the bridge. The current
runtime reports `active_tick_streams=3` during the live probe and successfully
serves a real `XAUUSD/M5` SSE tick packet. The connected account remains
`268115110 / Exness-MT5Real39`, broker kind `REAL`, with `trade_allowed=false`.
Bridge contract coverage is 98/98, cockpit typecheck and production build
pass. Authority remains `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

The two-year history route remains closed-bar only. `/api/mt5/live_bundle`
returns closed XAUUSD M5 bars plus a separate `MT5_FORMING_BAR` object, while
the research history path excludes forming rows. No PDF narrative figure is
converted into XAUUSD OHLC, fills, outcomes, rates, orders or live authority.

## Session 53 live bundle and fresh real-feed verification (2026-11-19)

The current loopback runtime returns a read-only XAUUSD M5 live bundle with
600 closed bars plus a separate `MT5_FORMING_BAR` payload. The sampled
full-day history endpoint correctly reports `PARTIAL` while the trading day is
still in progress, with `forming_bar_included=false` on the research tape.
The refreshed real verifier evaluated 5,000 closed bars through
`2026-11-19T13:20:00Z` across all 23 concepts. This historical Session 53
snapshot was superseded by the Session 57 receipt above. The receipt is
`artifacts/real-xauusd-m5-pdf-signal-verification.json`. Authority remains
`SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

## Session 52 PDF statistics worker lifecycle (2026-11-19)

`usePdfSignalStatistics` now invalidates its generation during cleanup, clears
all worker handlers before termination, handles `messageerror`, and fails
closed when worker construction or `postMessage` throws. Regression
`tests/pdf-signal-statistics-hook-lifecycle.test.mjs` is registered in the full
unit lane. Statistics remain descriptive and preserve
`SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

## Session 51 named-candle locale coverage (2026-11-19)

The focused analogue inspector now localizes current named-candle group labels,
pattern and family filters, the `All` control, dynamic filter announcements,
empty-state copy and retained-endpoint fallback text. Regression
`tests/focused-named-candle-locale.test.mjs` is registered in the full unit
lane. The change is presentation-only and preserves descriptive statistics and
`SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

## Session 50 live-feed race and mobile statistics readability (2026-11-19)

The read-only live tick feed now retires the previous EventSource before
closing it and ignores queued packets, status, reset and error callbacks from
replaced sources. Regression `tests/live-tick-feed-generation-race.test.mjs`
keeps stale bridge generations from repainting the focused XAUUSD M5 surface.
The statistics panel adds a dedicated responsive stylesheet with an 11px mobile
text floor, wrapped provenance labels and bilingual source-status visibility.
The panel remains descriptive and preserves `SHADOW_ONLY / NO_DECISION /
live_apply_allowed=false`. Targeted live-tick and PDF statistics contracts pass.

## Session 49 runtime responsiveness follow-up (2026-11-19)

The focused XAUUSD M5 surface now bounds synchronous PDF marker and receipt
verification to the latest 6,000 closed bars. The complete retained two-year
display tape remains available to the asynchronous PDF census, statistics
worker, replay and UTC navigation. This prevents the browser main thread from
freezing while preserving `SHADOW_ONLY / NO_DECISION /
live_apply_allowed=false`.

Unit, typecheck, strict language audit, production build and `git diff --check`
pass after the change. Runtime browser inspection confirms 141,598 retained
closed XAUUSD M5 bars, live BID/ASK, forming-bar disclosure and the 23-concept
PDF surface.

This file is the short acceptance ledger for future sessions. Read it together
with [`AI_SESSION_STATE.md`](AI_SESSION_STATE.md), which contains the detailed
chronological handoff and implementation notes.

## Product contract

| Requirement | Current evidence | Status |
|---|---|---|
| Black/white TradingView-like chart | `MicroChart.tsx`, `microchart.css`, focused browser snapshot and Session 46 local DOM receipt; teal/red candles per latest user correction | Implemented; continue visual QA |
| One focused XAUUSD M5 surface | `App.tsx` renders `<Microscope focused />` on `#home`; focused surface fixes M5 | Complete |
| Chart-dominant interactive drawing | Pointer pan/zoom, crosshair, trend/H-line/Fib/rectangle/brush/text/measure, touch pinch, bounded undo/redo, saved-shape selection, body/endpoint edits and Delete/Backspace; `microchart-*` tests | Implemented; full TradingView interaction parity is unproven |
| Smooth drag pan | Fractional offset + RAF batching + frozen Y-domain + memoized candle/indicator/brush geometry; `tests/microchart-pan.test.mjs`, `tests/microchart-series.test.mjs`, foreground profile | Last valid 180-bar probe: median 12.1 ms, p95 18.3 ms, max 36.5 ms, 180 px exact movement, zero Y drift. Restart remeasurement inconclusive: visible browser also showed approximately one-second idle RAF gaps. Timings are machine-specific. |
| Exness/MT5 closed-bar data | Verified account-scoped UTC closed-bar promotion and focused `MT5 / 2Y CLOSED` runtime badge | Complete when broker is connected; fail-closed when unavailable |
| Two-year M5 retention | `m5Retention.ts`, focused history contracts, runtime provenance readout | Complete |
| PDF knowledge map | `price_action_knowledge_map.json`, page metadata for all 438 pages, source-index CLI, 419 curated pages, 36 source lenses and 36 held-out provenance-only fixtures, 23 concepts and 30 relationships; printed p.382/PDF p.392 was visually confirmed blank | Complete for indexed chapter intervals; the source remains qualitative and does not supply XAUUSD OHLC/outcomes |
| Current pattern markers and explanations | Source-named chips, PDF anchors, clickable inspector, named-candle and geometry-proxy evidence | Complete for implemented concepts |
| Historical occurrence statistics and mini charts | Worker-backed all-23 XAUUSD M5 census, UTC causal rows, geometry H+1 descriptions and explicit source-note withholding | Complete at descriptive observation layer |
| Phase 3 causal-prefix context | Obstacle-room, failure-selection and low-volatility receipts expose bounded closed-prefix identity, data status, future-row withholding and withheld outcomes | Implemented observationally; no detector or rate qualification |
| Phase 3 sizing and bracket-cost assumptions | `docs/PHASE3_SIZING_COST_ASSUMPTIONS_RECEIPT.json` records provisional user-input shape in quote-price units | Receipt only; no inferred bracket, fill, order or outcome |
| Phase 3 news/resistance/reversal event identities | `patternExitEventIdentity` and `artifacts/phase3-exit-event-identity-audit.json` expose validated calendar, structural-touch and adverse-close-break identities | Implemented identity-only; no exit decision or outcome |
| Selected setup event identity | Signal, first later strict OHLC break/gap observation, actual M5 confirmation close and outcome origin for all four setup kinds; strict UTC/M5/closed-OHLC/edge validation; four mini-chart controls select the attested event candle | Implemented observational timeline and navigation; no fill or source execution model; counts and rates unchanged |
| Selected level inspection | Seven exact descriptor IDs, native rail/legend toggle controls, live meaning/status, matching-line highlight and strict UTC identity retention; coincident prices retain separate roles | Implemented for existing attested receipts; no fills, detector or count changes |
| Selected occurrence outcome comparison | Inspector comparison keeps adjacent closed-bar H+1 direction separate from the local ATR target/invalidation path, with explicit unavailable, unresolved and context-withheld states | Implemented observational comparison; no detector, denominator, rate, fill or order changes |
| Causal replay bookmark | Canonical UTC/M5 identity-only save/restore/delete, exact retained-occurrence resolution and account/symbol or separate local-snapshot scope | Integrated and browser-verified |
| LONG/SHORT chart geometry | Causal entry/target/invalidation overlays with explicit historical illustrative authority | Complete for supported directional receipts |
| Next-direction forecast | Gated analogue/forecast readout with freshness, walk-forward, support and consensus gates | Research-only; withheld when gates fail |
| PDF examples as labelled OHLC fixtures | Existing PDF pages are narrative examples and do not contain a verified XAUUSD OHLC/outcome dataset | Intentionally unavailable; do not fabricate fixtures |
| Full PDF ideas translated into explainable XAUUSD chart observations | All 23 concepts are visible on the focused XAUUSD M5 surface. The 13 deterministic geometry proxies and 10 source-note translations expose bounded closed-prefix descriptors with bilingual labels, PDF anchors and explicit data/outcome status | Complete at observation layer; source-only and execution-dependent concepts remain `SOURCE_REVIEW_ONLY / UNAVAILABLE / WITHHELD` |
| Real XAUUSD detector verification and refresh | Timestamped MT5 closed-bar reads verify up to 5,000-bar XAUUSD M5 tapes, UTC identity, marker geometry and per-concept denominator reconciliation | Complete as read-only evidence; no accuracy, profitability or execution claim |
| Legacy code removal | Focused startup graph is lazy; unreachable standalone Atlas/old chart renderer, standalone KIDI Events, Entry & Danger, Weekly Audit, StrategyRanking, Governance/Analysis, Playbook and BeastLab wrappers/routes and audited dead leaves including `BeastArenaPanel.tsx`, `quant-cockpit.css`, `cardEvidence.ts`, `cardLiveSignal.ts` removed; shared services preserved | Ongoing; audit before deleting another route |

## Session 47 real XAUUSD all-concept verification (historical receipt, 2026-11-19)

The real MT5 verifier now evaluates all 23 PDF concepts on one closed XAUUSD
M5 tape under `NEUTRAL`, `UP` and `DOWN` directional contexts. Each case
records 23 states, deterministic repeat and future-row invariance in
The historical Session 47 receipt was superseded by the Session 48 refresh in
`artifacts/real-xauusd-m5-pdf-signal-verification.json`. The Session 47 receipt
contains 5,000 closed bars (`feed_last_bar` `2026-11-19T06:55:00Z`, selected
causal prefix ending at the latest closed bar) and a 96-bar contiguous causal
prefix ending before the broker's session gap. Its neutral case is 5 detected,
11 abstain, 5 unavailable and 2 withheld. The `UP` and `DOWN` cases each are
8 detected, 11 abstain, 4 unavailable and 0 withheld. The detector verifier
rejects overridden symbol/timeframe identities before labelling a receipt
XAUUSD M5.

Source-only concepts still become descriptive, unavailable or withheld when
their validated calendar, event, bracket, sizing or directional inputs are not
present. This is the complete observable XAUUSD implementation boundary and
does not create PDF-derived OHLC, fills, orders, outcomes, rates or live
authority. Holdout readiness remains `NOT_READY` and the authority remains
`SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

The unified detector now uses the bounded local adverse-extreme descriptor for
`resistance_exit` when no validated external resistance event is supplied,
while explicit event identities retain precedence. Dynamic detector reasons on
the PDF shelf and translation evidence now have localized English/Vietnamese
copy.

The Session 47 verified increments preserve keyboard-visible focus rings and isolated marker navigation, reject MT5 backfills with wrong identity or stale alias scope, and reject off-grid historical M5 rows. The strict language audit reports zero remaining hits across 378 shipped files. A future duplicate outside the selected causal prefix is ignored while duplicate selected identity remains fail-closed. Nested `bar` and `closed_bar` metadata now must match the expected XAUUSD/M5 scope, while older payloads without nested metadata remain compatible. Mobile knowledge metadata wraps at phone widths and the live BID/ASK strip has localized accessible labels. Legacy research hooks now load only through a lazy controller outside focused startup. All changes preserve causal statistics and the SHADOW_ONLY / NO_DECISION boundary.

## Session 48 all-23 historical PDF census (2026-11-19)

The focused XAUUSD M5 surface now includes a worker-backed historical census for
all 23 PDF concepts. Each retained closed row is evaluated from a bounded causal
prefix, session gaps are counted as skipped rows, and the panel reconciles
DETECTED, ABSTAIN, UNAVAILABLE and WITHHELD states per concept. GEOMETRY_PROXY
rows expose local detection frequency, direction counts and descriptive H+1
movement when the next M5 candle is contiguous. SOURCE_REVIEW_ONLY rows expose
descriptive availability and occurrence counts only, with numeric rates,
directional claims and source outcomes withheld. The panel has localized
English/Vietnamese labels, loading/error status, semantic table metadata and a
bounded mobile layout.

Regression `tests/pdf-signal-statistics.test.mjs` passes with 23 concepts,
state reconciliation, source outcome withholding and invalid-tape rejection.
Cockpit typecheck, production build and strict language audit pass. The worker
does not create OHLC fixtures, fills, orders, profitability claims or live
authority. `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false` remains exact.

## Session 49 current receipt and bilingual quality (2026-11-19)

The latest read-only verifier receipt contains 5,000 closed XAUUSD M5 bars
through `2026-11-19T11:45:00Z`. The neutral matrix remains 4 `DETECTED`, 12
`ABSTAIN`, 5 `UNAVAILABLE` and 2 `WITHHELD`, with deterministic repeat and
future-row invariance. The embedded census accounts for 8 warm-up rows, 4,973
evaluated rows, 18 skipped session-gap rows and 1 terminal row without H+1.
Its accounting is explicit as
`bars = warmupRows + evaluatedRows + skippedRows + terminalRowsWithoutH1`, and
each concept defines `evaluated = DETECTED + ABSTAIN`.

Focused English/Vietnamese copy now covers source metadata, forecast evidence,
named-candle evidence, pattern census/window explanations, MicroChart footer
labels, keyboard help, marker announcements and simulated-trade labels. The
focused statistics table repeats source status inside each concept cell on
mobile so `SOURCE_REVIEW_ONLY` remains visible when the source column collapses.
The bridge launcher accepts standalone Windows execution and the current
runtime is connected read-only to `Exness-MT5Real39`, account `268115110`,
which is identified by the broker as `REAL`. Authority remains
`SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

## Session 47 quality hardening addendum (2026-11-19)

The follow-up quality wave rejects two-sided support/resistance and ceiling/floor
tests instead of choosing a direction from an ambiguous candle. The unified PDF
contract now canonicalizes equivalent UTC aliases, validates the optional M5
timeframe identity, revalidates imported calendar objects, and fails closed for
malformed, duplicate, off-grid or future external identities. Imported
`mfe_calendar_events` data is wired into NEWS identity observations only.

The focused PDF shelf keeps native button semantics, translates source/data and
outcome status in both locales, and localizes aggregate detector reasons. Large
retained drawing tapes now re-anchor by binary search without full-tape map
allocation. Regressions include the Wave 4/5 PDF contract and source-map audits,
the Session 47 browser/runtime and documentation receipts, the drawing-anchor
performance contract, and the false-positive ambiguity coverage. Typecheck,
production build, full unit lane and real XAUUSD verification pass. Authority
remains `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

## Wave 29 PDF input and assumptions surface (2026-11-19)

The focused XAUUSD M5 surface now exposes a bilingual, responsive assumptions
panel for explicit quote-price bracket, sizing and externally validated reversal
inputs. Blank or malformed values remain unavailable. The panel records
`USER_SUPPLIED` provenance and does not infer pip distances, lots, fills,
outcomes or orders. Detector inputs now reject non-positive quote prices and
non-finite derived sizing arithmetic. Regression coverage is
`tests/pdf-assumptions-panel.test.mjs` and
`tests/wave29-source-note-input-contract.test.mjs`.

## Wave 12 selected-prefix and source-note parity audit (2026-11-19)

The unified PDF observation panel now derives its state attribute from the same
`detectAllPdfSignals` descriptors used by the cards and counts. This removes a
legacy aggregate mismatch for the ten source-note concepts. A missing selected
UTC/M5 candle now fails closed, canonical UTC aliases resolve by instant, and
future rows remain excluded from the causal prefix. Regressions are
`tests/wave12-source-note-ui-parity.test.mjs` and
`tests/wave12-pdf-selected-prefix-identity.test.mjs`; both pass with the PDF
parity, realtime identity and typecheck lanes. The observation layer covers all
23 concepts on XAUUSD M5. Source-qualified labels, fills, outcomes and live
execution authority remain withheld.

Wave 13 source-concept audit adds
`artifacts/wave13-pdf-source-concept-audit.json` and
`tests/wave13-pdf-source-concept-audit.test.mjs`. It verifies 23 concepts,
13 geometry proxies, 10 source-note descriptors, all concept anchors, 36
source lenses and fixtures, Vietnamese source-note parity, and the unchanged
`SHADOW_ONLY / NO_DECISION / live_apply_allowed=false` contract.

The detector-contract regression additionally rejects non-XAUUSD input and
equivalent-timestamp duplicate identities across all 23 concepts.

## Wave 4 documentation consistency addendum (2026-11-18)

The latest completed wave audits reconnect behavior, focused startup/lazy loading,
source-only gaps, inspector accessibility, retention identity, worker cleanup and
legacy Beast reachability. The reconnect implementation remains bounded and
read-only for `TERMINAL_DISCONNECTED` and `ACCOUNT_UNAVAILABLE`; authorization,
unsupported, connected and explicit-detach states remain outside automatic retry.
The focused graph remains chart-first, with legacy research and knowledge modules
behind lazy boundaries. The source-gap audit keeps
`trade_selection_failure` as `SOURCE_NOTES` with unavailable data and withheld
outcomes. Accessibility and worker audits found no justified product fix. The
retention audit fixed row-level promotion validation for off-grid, duplicate,
noncanonical, and invalid-OHLC rows (`artifacts/wave3-retention-identity-audit.json`).
The unreachable `BeastBuilderPanel.tsx` wrapper was removed while shared Beast
services remain (`artifacts/session19-legacy-beast-builder-audit.json`).

Targeted wave receipts and tests pass: `wave1-source-gap-audit`,
`wave2-accessibility-audit`, `session19-runtime-startup-audit`,
`session19-worker-lifecycle-audit`, `session19-browser-runtime-evidence-audit`,
`wave3-retention-identity-audit` and their corresponding `tests/*` contracts.
The browser/runtime audit could not obtain a fresh browser host or app endpoint,
so Session 18 remains the visual baseline and no new live-market claim is made.
`artifacts/session19-final-unit.log` and `artifacts/session19-final-build.log`
are the latest passing full-lane receipts. The later
`artifacts/session20-final-unit.log` is a partial rerun with no verified final
status and is not acceptance evidence until a complete lane passes. No detector, denominator,
rate, OHLC fixture, fill, order, source qualification or authority change is
claimed. Preserve `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

## Session 27 legacy release-manifest reachability audit (2026-11-18)

The current source graph has no remaining dead page or component leaves across
the supported route roots, and focused Microscope startup remains chart-first
with legacy research panels behind lazy boundaries. The tracked historical
`RELEASE_MANIFEST.json` contains 20 stale paths for already retired wrappers,
routes, shell files and tests. It is preserved as a generated historical
artifact. `scripts/package-release.mjs` remains the authority for fresh release
graphs and does not enumerate those paths. Receipt:
`artifacts/session27-legacy-release-manifest-audit.json`; regression:
`tests/session27-legacy-release-manifest-audit.test.mjs`. No route, detector,
retained data, occurrence, count, denominator, rate, fill, order or authority
change is claimed. Preserve `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

## Session 28 statistics and causality audit (2026-11-19)

The statistics audit found and fixed one concrete denominator inconsistency.
`priceActionDetector` accepted zero-range OHLC rows (`high === low`) while the
selected context census and target/obstacle studies rejected them. The shared
detector validator now requires `high > low`, preventing degenerate rows from
entering historical evaluation or H+1 occurrence denominators.

Selected-occurrence H+1 direction remains close-to-close with FLAT included in
the denominator and no future OHLC reads. Technical obstacle first-touch rates
exclude unresolved rows. Identity-only causal replay carries no retrospective
statistics or unrevealed future prices. Obstacle-room source material remains
`SOURCE_REVIEW_ONLY / UNAVAILABLE / WITHHELD`.

Receipt: `artifacts/session28-statistics-causality-audit.json`; regression:
`tests/session28-statistics-causality-audit.test.mjs`. The focused authority
remains `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

## Session 28 focused chart paging audit (2026-11-19)

Focused `PageUp` and `PageDown` navigation now preserve the visible bar width
when paging clamps at either retained-tape boundary. The mobile regression
reproduced the prior two-bar collapse after `Home` then `PageUp`; the corrected
sequence retains 41 visible bars and announces the UTC range. Desktop and
mobile checks retain zero horizontal overflow and visible research-only
authority. Receipt: `artifacts/session28-chart-interaction-audit.json`;
regression: `tests/microchart-page-navigation.test.mjs`.

## Wave 9 knowledge-navigation source-label audit (2026-11-19)

The lazy `PriceActionBookIndex` source-lens navigation now uses the shared
status contract and shows `SOURCE_REVIEW_ONLY / data UNAVAILABLE / outcome
WITHHELD` alongside the existing authority copy. Receipt:
`artifacts/wave9-knowledge-navigation-source-label-audit.json`; regression:
`tests/wave9-knowledge-navigation-source-label-audit.test.mjs`. Source notes
remain descriptive and do not become detector evidence. Preserve
`SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

## Session 30 feature roadmap (2026-11-19)

The PDF coverage audit confirms 13 `GEOMETRY_PROXY` concepts match the focused
detector and 10 concepts remain `SOURCE_NOTES` with
`SOURCE_REVIEW_ONLY / UNAVAILABLE / WITHHELD` fixtures. Reliability review
corrected forecast wording so historical evidence requires a fresh runtime
receipt before any current claim. Runtime review confirms the bridge can run
hidden with loopback-only, read-only authority, while the separately started
frontend requires one matched launcher token to reach it. Receipt files are
`artifacts/session30-pdf-feature-coverage-audit.json`,
`artifacts/pdf-chart-reliability-audit.json` and
`artifacts/session30-runtime-data-identity-audit.json`.

The ordered implementation plan is in
[`docs/FEATURE_IMPLEMENTATION_PLAN.md`](FEATURE_IMPLEMENTATION_PLAN.md).
Next work starts with readable bilingual focused-surface copy, then source-lens
navigation, independently labelled XAUUSD M5 holdout intake, observational
studies and a separately specified execution-model boundary. No source-only
concept is promoted until its data, labels, denominator and authority gates are
verified.

## Session 31 bilingual source and holdout wave (2026-11-19)

Phase 0 now has a persisted English/Vietnamese locale provider, keyboard
accessible shell toggle, translated workspace labels and localized loading,
search, theme and status copy. Technical identifiers remain stable. Phase 1
adds Vietnamese source readings for all 10 `SOURCE_NOTES` concepts while
retaining English source wording, page anchors and explicit
`SOURCE_REVIEW_ONLY / data UNAVAILABLE / outcome WITHHELD` status. Phase 2
extends the sealed XAUUSD M5 holdout validator with locked distinct
TRAIN/VALIDATION/HOLDOUT references, independent closed-M5 label provenance and
fail-closed duplicate, gap, off-grid, forming and future-row checks.

Receipts and regressions are `tests/locale-foundation.test.mjs`,
`tests/source-notes-localization.test.mjs`,
`tests/session31-xauusd-holdout-schema-receipt.test.mjs` and the corresponding
artifacts under `artifacts/`. Focused typecheck and production build pass with
the existing large-chunk warning. No detector, OHLC, outcome, fill, order or
authority claim was added. The next phase is observational obstacle/failure
context using only validated causal prefixes.

## Session 32 causal-prefix and real-time observation wave (2026-11-19)

Obstacle-room context now exposes a bounded causal-prefix receipt with explicit
source-only, local-data, withheld-outcome and no-live-apply status. Failure
selection has a separate 96-bar causal-prefix receipt for the selected candle
and prior range. Neither receipt reads future rows or qualifies a detector,
denominator, rate, fill or order. The narrow bilingual shell audit keeps the
language toggle reachable at 320px and 390px with zero horizontal overflow.

The live MT5 path now validates tick identity and generation, updates the
forming M5 candle and lightweight indicator tail on each SSE tick, and exposes
`PROVISIONAL`, `STALE` or `WAIT` current-candle detection. Official markers,
statistics and forecast evidence remain closed-bar-only. Bridge tests cover
malformed tick payloads, cursor resets, rollover and forming-tail validation.

Receipts and regressions include
`tests/pattern-room-causal-prefix-observability.test.mjs`,
`tests/pattern-failure-selection-context.test.mjs`,
`tests/live-forming-detection.test.mjs`,
`tests/microchart-responsive.test.mjs` and the bridge MT5 contract lane.
The full unit lane, cockpit typecheck, production build and managed bridge
tests pass. Preserve `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

## Session 32 Phase 3 completion addendum (2026-11-19)

The remaining bounded Phase 3 increments are now represented in the acceptance
ledger. The low-volatility/consecutive-review descriptor exposes a selected
closed-prefix receipt with canonical identity, explicit future-row withholding,
local-data status and withheld outcomes. Its 48-bar baseline and 12-bar recent
median-range comparison remain descriptive and do not qualify a detector or
rate. Receipt: `artifacts/session32-low-volatility-observational-audit.json`;
regressions: `tests/pattern-low-volatility-context.test.mjs`,
`tests/pattern-low-volatility-evidence.test.mjs` and
`tests/pattern-low-volatility-causal-prefix-observability.test.mjs`.

Sizing and bracket-cost work is limited to an explicit assumptions receipt.
The current shape records provisional sizing, spread, commission, slippage and
swap inputs in quote-price units, with no user-supplied assertion, PDF pip
translation, bracket result, fill, order or outcome. Receipt:
`docs/PHASE3_SIZING_COST_ASSUMPTIONS_RECEIPT.json`; regression:
`tests/phase3-sizing-cost-assumptions-receipt.test.mjs`.

News, resistance and reversal exit work exposes only validated event identities
from a supplied calendar event, structural level touch or adverse close break.
Rows after the observed causal boundary are ignored, and malformed, duplicate,
off-grid, forming or gapped prefixes fail closed. A valid prefix without an
observed event stays withheld. Receipt:
`artifacts/phase3-exit-event-identity-audit.json`; regression:
`tests/pattern-exit-event-identity.test.mjs`.

The browser receipt confirms tick-driven forming-candle presentation at
1440x900 and 390x844 with zero horizontal overflow and `PROVISIONAL` detection.
Closed-bar markers, statistics and forecast evidence remain separate from the
forming tail. Receipt: `artifacts/session32-browser-realtime-receipt.json`;
regression: `tests/session32-browser-realtime-receipt.test.mjs`.

Current targeted Phase 3, responsive and registration tests pass. The final
post-integration lane in `artifacts/session32-final-unit.log` passes, including
the managed bridge suite. No detector, denominator, rate, OHLC fixture, fill,
order or authority change is claimed. Preserve
`SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

## Session 32 Wave 4 bilingual/mobile quality pass (2026-11-19)

The focused header keeps a visible `VI Â· Vietnamese` / `EN Â· Tiáº¿ng Anh`
language switch with stable technical identifiers and authority labels. The
PDF knowledge panel now uses
locale-keyed English/Vietnamese copy for coverage, search, relationship edges,
setup families, provenance and accessible labels. Browser QA verified the
switch at 320px, 390px and desktop widths with no horizontal overflow.

The same QA pass reserved a 200px focused mobile plot and bounded realtime
forecast/provenance receipts with local scrolling. The live forming candle
remains `PROVISIONAL` until the M5 close, while closed-bar markers and
statistics remain separate. Receipt:
`artifacts/session32-wave4-realtime-mobile-qa.json`; regressions:
`tests/microchart-responsive.test.mjs`, `tests/price-action-knowledge-panel.test.mjs`.
The strict shipped-source language audit reports zero remaining untranslated
runtime literals after intentional bilingual copy files are accounted for.
Full unit, cockpit typecheck and production build pass. Preserve
`SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

## Session 28 chart typography readability follow-up (2026-11-19)

Observation-facing chart labels now use a 9px SVG floor. Forecast, provenance
and pattern receipts use 11px desktop typography, 10px on standard phones and
the bounded 8px fallback on very short compact phones so the plot remains
inspectable. The phone price legend is 11px with a 12px heading, and the footer
authority receipt is 11px. These are presentation-only changes and preserve
`SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

Targeted regressions pass: `tests/microchart-typography.test.mjs`,
`tests/microchart-status-hierarchy.test.mjs`,
`tests/microchart-provenance-phone.test.mjs`,
`tests/microchart-responsive.test.mjs`,
`tests/focused-mobile-pattern-stack.test.mjs`,
`tests/focused-mobile-toolbar-touch-target.test.mjs` and
`tests/test-runner-registration.test.mjs`. Cockpit typecheck and production
build pass. No detector, denominator, rate, OHLC fixture, outcome, fill, order
or authority change is claimed.

## Session 29 focused feature wave (2026-11-19)

The selected pattern inspector now exposes a bounded local activity receipt
from the closed M5 prefix. It compares recent and baseline median ranges and
directional efficiency, with explicit withheld states and source-only limits.
The chart `End` key now reaches the latest retained bars while preserving the
current zoom width. Post-promotion MT5 refresh failures retain the last
verified tape and expose a bounded read-only reason in the focused status and
source-coverage surfaces. Receipt: `artifacts/session29-feature-wave-audit.json`;
refresh detail: `artifacts/session29-focused-refresh-observability-audit.json`.

The full `node scripts/test.mjs` lane, cockpit typecheck and production build
pass. The build retains the existing Rollup warning for chunks over 500 kB.
No detector, denominator, rate, OHLC fixture, outcome, fill, order, retained
tape identity or authority change is claimed. Preserve
`SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

## Session 30 MT5 runtime/data identity audit (2026-11-19)

The live loopback bridge health probe returned HTTP 200 with history contract v2,
zero active tick streams and `SHADOW_ONLY / NO_DECISION /
live_apply_allowed=false`. Startup review confirms bridge-before-frontend launch,
one per-process token shared by both children, loopback binding and hidden child
windows. Focused account and closed-M5 health polling pauses while a browser tab is
hidden and resumes on `visibilitychange`. Auto-Attach sends empty settings only,
is cancelable and is bounded to three attempts with 20/40-second backoff.

A separately started frontend was observed fail-closed as `LOCAL_BRIDGE_NOT_STARTED`
because it lacked the launcher's token. Its later endpoint was unavailable. This
is a runtime wiring note, not a bridge or authority change. Account/server/
generation namespace, canonical XAUUSD/M5 UTC closed-bar markers and no-order
authority remain required. Receipt: `artifacts/session30-runtime-data-identity-audit.json`;
regression: `tests/session30-runtime-data-identity-audit.test.mjs`. Targeted
proxy, Auto-Attach, connection-health, cockpit typecheck and 56 isolated Python
bridge integration tests pass. The global Python interpreter lacks FastAPI, while
the supported `.venv-mfe` interpreter passes the bridge lane. Preserve
`SHADOW_ONLY / NO_DECISION /
live_apply_allowed=false`.

## Session 18 current evidence (2026-11-18)

Session 18 planned **11 independent child-agent tasks** in waves. Forecast gates now separate verified MT5 history from fresh closed-bar evidence, then check walk-forward coverage, effective causal support, independent analogue coverage, consensus margin and support metadata. A failed gate leaves descriptive distributions inspectable but withholds the directional landmark as `WAIT`; the explanation names the failed gate and preserves `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

Viewport work avoids a full retained-tape timestamp-map allocation for unchanged same-index quote refreshes while retaining exact UTC re-anchoring for retention shifts. Inclusive range slicing, duplicate ordering and timestamp-first symbol/timeframe persistence are covered by the four `microchart-viewport-*` tests. Focused refresh adds a unique probe nonce and promotes only through the latest proven closed boundary; a boundary-opening forming row is rejected by `tests/focused-m5-refresh.test.mjs`.

Current pattern chips expose exact concept/UTC identity and the explicit `SHADOW_ONLY; NO_DECISION; no order authority` label. At widths up to 430px, the focused evidence shelf keeps that authority line sticky and visible in a bounded 112px local scroll region while retaining chips and `Why / PDF` details (`tests/focused-mobile-pattern-stack.test.mjs`).

Session18 browser QA observed Exness REAL read-only XAUUSD M5 with current FALSE HIGH LOW and DOUBLE PRESSURE chips, Why/PDF anchors, `RESEARCH LANDMARK READY Â· UP` with all gates passing (walk-forward 80/12, support 47/8, analogues 41/4, margin 5.2%/5.0%, fresh verified MT5 history), plot sizes 287x200 at 320px, 364x215 at 390px and 1364.9x609 at 1440px, zero overflow and no runtime errors (`artifacts/session18-browser-runtime-qa.json`). The source-only audit receipt `artifacts/session18-source-only-concepts-audit.json` and regression `tests/session18-source-only-concepts-audit.test.mjs` reconfirm six concepts remain `SOURCE_REVIEW_ONLY`, `UNAVAILABLE` and `WITHHELD`. No detector, denominator, rate, OHLC fixture, fill, order, source qualification or authority change is claimed.
## Session 17 current evidence (2026-11-18)

Session 17 hardens the focused XAUUSD M5 data boundary and removes one more
unreachable legacy wrapper. On mount or a visible-tab account poll, the shell may
make at most three bounded, read-only Auto-Attach attempts (empty settings only,
cancelable, with 20/40-second backoff); explicit detach pauses automatic retries.
The connection badge becomes **MT5 Sync** only after the same verified closed M5
feed used by the focused chart passes its freshness check.

Focused M5 refresh adds a unique transport nonce to every two-row closed-bar
probe, so cache reuse cannot hide a newly closed candle. A changed tail promotes
only through a bounded catch-up ending at the latest proven closed boundary;
equal tails retain the existing tape identity. Account namespace, symbol, UTC/M5,
closed-bar, read-only and `SHADOW_ONLY` provenance are rechecked around async
work. The bridge rejects unsupported frames, malformed/duplicate/off-grid rows,
invalid OHLC, timezone mismatches and stale/untrusted cache entries, and clears
terminal state after restart or transport loss.

Modifier-safe chart shortcuts leave Ctrl/Meta/Alt combinations native; the
unmodified tool letters and undo/redo bindings remain available. `BeastDeckBoard`
is removed after an AST reachability audit while shared Beast stores/services
remain. These changes add no detector, denominator, rate, fill, order or source
qualification claim and preserve `SHADOW_ONLY / NO_DECISION /
live_apply_allowed=false`.

Targeted checks pass: `tests/mt5-auto-attach.test.mjs`,
`tests/focused-m5-refresh.test.mjs`, `tests/microchart-modifier-shortcuts.test.mjs`
and `tests/legacy-beast-deck-cleanup.test.mjs`. Pre-integration full-unit and
production-build/typecheck baselines are recorded in
`artifacts/session17-baseline-unit.log` and `artifacts/session17-baseline-build.log`;
rerun complete lanes after parent integration. Remaining scope includes
independently labelled XAUUSD OHLC/outcome holdouts, execution/fill/cost/news/
manual-exit models and source concepts intentionally kept as `SOURCE_NOTES`.

## Session 16 current evidence

The focused home remains a single XAUUSD M5 chart. Cursor now selects saved
drawings; `[` and `]` cycle them, body/endpoint handles edit them, and
Delete/Backspace removes the selected shape. Escape cancels an active gesture or
deselects a saved shape. Timestamped anchors stay tied to retained closed-bar UTC
identities, while edits remain bounded by the local symbol/timeframe drawing and
undo limits. The focused route suppresses the unrelated workspace jump palette
and navigation chrome; diagnostic routes retain their palette. A scoped palette
guard keeps focused evidence chrome monochrome while teal/red candles remain
explicit. These interaction and presentation changes add no detector,
denominator, rate, fill, order or authority claim. Targeted contracts are
`tests/microchart-drawing-selection.test.mjs`,
`tests/microchart-drawing-edit.test.mjs`,
`tests/microchart-accessibility.test.mjs`,
`tests/focused-command-palette-guard.test.mjs`, and
`tests/focused-m5-surface.test.mjs`.

## Session 15 current evidence

Session 15 assigns **12 independent child-agent tasks** in waves: final Chapter 9 source review, context-selection census design/model, cancelable census worker, census UI, orphan Beast cleanup, retention audit, accessibility audit, runtime audit, statistics audit, browser QA, documentation consistency and integration verification. The final source wave reviewed printed pp.373-382/PDF pp.383-392, visually confirming printed p.382/PDF p.392 as a blank divider. Coverage is now **419/419**, Chapter 9 **138/138**, with **36 source lenses and 36 held-out provenance-only fixtures**, 23 concepts and 30 relationships. Receipt: `artifacts/chapter9-final-august-source-review-373-382.json`; test: `tests/chapter9-final-august-source-review.test.mjs`.

The new descriptive context-selection census groups the four receipt-backed setup families into the existing six local review buckets plus an explicit unavailable bucket. It recomputes context only through each occurrence's confirmation candle, checks the current adjacent closed M5 H+1 bar, keeps FLAT in the aligned-direction denominator, and never changes detector counts, base rates or source authority. The cancelable worker/hook starts only when the inspector section is expanded and is hidden during causal replay. The UI exposes exact UTC occurrence navigation, bucket counts, unavailable reasons and `Observed H+1 aligned-direction rate`; it makes no fill, probability, win-rate or source-qualification claim. Receipts/tests: `tests/pattern-context-selection-census.test.mjs`, `tests/pattern-selection-census-worker.test.mjs`, `tests/pattern-context-selection-evidence.test.mjs`.

The orphan `BeastArenaPanel.tsx` wrapper was removed after an AST reachability audit; shared Beast stores, data and simulation services remain (`artifacts/session15-legacy-cleanup.json`). All source notes remain `SOURCE_REVIEW_ONLY`, and the authority boundary remains `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

## Session 14 current evidence

Session 14 assigns **12 independent child-agent tasks** in waves: causal replay/bookmark model, source review pp.363-372, legacy BeastLab audit, persistence, UI, accessibility, MT5 identity, statistics, source consistency, runtime/startup, browser and documentation. The source wave adds 10 full-page reviews, printed pp.363-372/PDF pp.373-382, after verifying the attested source SHA-256. Coverage is now **409/419**, leaving **10** indexed chapter pages; Chapter 9 is **128/138**. The map has **35 source lenses** and **35 held-out provenance-only fixtures**, 23 concepts and 30 relationships. Receipt: `artifacts/chapter9-august-source-review-363-372.json`; the next review starts at printed **p.373/PDF p.383** and continues through p.382, whose OCR is unavailable (printed p.382/PDF p.392).

Selected-occurrence causal replay now has identity-only bookmark save, restore and delete controls. Bookmarks carry only canonical UTC/M5 occurrence and replay-prefix identity; restore revalidates the exact retained closed occurrence and recomputes read-only evidence. Storage is scoped to the MT5 cache/account-plus-symbol identity, or to a separate local snapshot scope when MT5 is unavailable; no substitute occurrence is selected. Replay continues to hide unrevealed candles, retrospective statistics and outcome payloads, preserving `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`. The focused UI audit bounded long names and keyboard targets; the statistics audit found no future leakage. Receipts: `artifacts/session14-bookmark-replay-accessibility-audit.json` and `artifacts/session14-statistics-replay-bookmark-audit.json`.

The standalone BeastLab wrapper is retired and its legacy aliases resolve to focused home; shared Beast data/helpers remain available. Session15 then removed the orphan BeastArenaPanel after AST reachability verification. Session14 runtime/source receipts remain historical evidence for 409/419; the final Chapter 9 wave raises current coverage to 419/419 and is recorded in `artifacts/chapter9-final-august-source-review-373-382.json`.

## Session 11 historical evidence

Session 11 assigns **10 independent child-agent tasks**, run in waves within the three-child runtime limit: level-selection UI, source review pp.313-322, StrategyRanking retirement, identity hardening, source review pp.323-332, accessibility, browser, runtime, source consistency and documentation. This session adds **20** full-page reviews, printed pp.313-332/PDF pp.323-342. Coverage is **369/419**, leaving **50** indexed chapter pages; Chapter 9 is **88/138**. The map has **31 source lenses** and **31 held-out provenance-only fixtures**, 23 concepts and 30 relationships. Receipts: `artifacts/chapter9-late-may-source-review-313-322.json` and `artifacts/chapter9-june-source-review-323-332.json`. Next review starts at printed **p.333/PDF p.343**, through p.382, whose OCR is unavailable. Independent source consistency passes 20/20 actual render/OCR hashes, source PDF SHA-256, printed/PDF anchors and source-only states (`artifacts/session11-source-consistency-audit.json`).

Seven native rail/legend selectors identify ATR entry/target/invalidation (**AE/AT/AI**), technical protection/obstacle (**TP/TO**) and setup break/protection (**SB/SP**) by exact descriptor ID. Selecting or toggling a role updates live meaning/status and the matching line highlight; coincident prices remain distinct. Strict UTC/M5 alias normalization and omission of derived study/technical `exitIndex` preserve selection through retention/backfill reindexing. Semantic receipt changes clear selection on first render and do not resurrect it. Three identity tests and five selection tests pass and are registered. Existing stationary 108px rail, label spacing and true-price geometry are retained.

StrategyRanking's standalone component/route is retired; old hashes resolve to focused home while shared Card data, storage and receipt artifacts remain (`artifacts/session11-strategy-ranking-retirement.json`). Final full unit and cockpit typecheck pass in `artifacts/session11-final-unit.log`; production build passes in `artifacts/session11-final-build.log` with the existing >500 kB chunk warning. Independent runtime/selection checks pass 46/46 plus 7/7 startup checks (51 distinct checks, two repeated) without product edits (`artifacts/session11-level-selection-runtime-audit.json`); accessibility passes 19/19 with no fix justified (`artifacts/session11-level-accessibility-audit.json`).

Dedicated browser QA passes **9/9** width/mode combinations (320/390/1440px across setup/outcome/context) on actual retained local-fallback Pattern break **76/76**, **141,178 closed M5 bars**, **MT5 Offline**. It passes **63 legend select/clear pairs**, **63 rail select/clear pairs**, **14 native Enter/Space pairs** and **36 Arrow event checks**. Minimum plot width is **158px**, rail width **108px**, minimum label spacing **18px**; horizontal overflow and rail text overlap are zero and true-price-Y maximum error is **0**. Receipt: `artifacts/session11-level-selection-browser-qa.json`, with **11 PNGs**. Separate `artifacts/session11-level-selection-320-selected-tp.png` and `artifacts/session11-level-selection-320-selected-sp.png` show independent TP/SP meanings at the coincident **4,032.28** price. No issues were recorded. The retired alias #strategy-ranking resolves to #home with title QUANTSMART and no load error; the dedicated QA tab was closed.

No source notes or provenance-only fixtures establish XAUUSD OHLC, detector behavior, executable fills or measured outcomes. No detector occurrence, count, denominator, rate, fill or order changes were added. Preserve `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`. Full PDF implementation and independently labeled OHLC/outcome holdouts remain unfinished.

## Session 13 historical evidence

Session 13 assigns **11 independent child-agent tasks** in waves: causal replay model, source review pp.353-362, legacy/Playbook retirement, replay controls UI, accessibility, identity/retention, statistics, runtime/startup, browser, documentation and independent source consistency. The source wave adds **10** full-page reviews, printed pp.353-362/PDF pp.363-372. Coverage is now **399/419**, leaving **20** indexed chapter pages; Chapter 9 is **118/138**. The map has **34 source lenses** and **34 held-out provenance-only fixtures**, 23 concepts and 30 relationships. Receipt: `artifacts/chapter9-late-july-source-review-353-362.json`; next review starts at printed **p.363/PDF p.373**, continuing through p.382, whose OCR is unavailable.

The causal replay model and UI controls are integrated for selected occurrences. Replay reveals only a causal prefix, keeps outcome/future statistics hidden while replay is active, and preserves `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`. The public detector now rejects off-grid historical M5 rows. The legacy Playbook route is retired and its alias resolves to focused home while shared data remains. Receipts: `artifacts/session13-pattern-causal-replay-controls-ui.json`, `artifacts/session13-replay-accessibility-audit.json`, `artifacts/session13-mt5-identity-retention-audit.json`, `artifacts/session13-statistics-audit.json`, `artifacts/session13-runtime-startup-audit.json`, and `artifacts/session13-legacy-playbook-retirement.json`. The bounded audit was performed against known git commit `4b54af7`, which includes pre-existing owned files; no reset was performed. Final full unit and cockpit typecheck pass in `artifacts/session13-final-unit.log`; production build passes in `artifacts/session13-final-build.log` with the existing large-chunk warning. Post-fix browser QA passes 53/53 checks across 320/390/1440px and Setup/Context/Outcome, with no horizontal overflow (`artifacts/session13-causal-reveal-browser-qa.json`, nine screenshots). Actual retained fallback has 141,178 closed M5 bars and MT5 Offline; occurrence75 reaches H+24, while occurrence76 stops at its real six-bar contiguous/session boundary. Exit and occurrence switches reset safely, Enter/Space controls work, and replay hides retrospective statistics. Legacy #playbook resolves home and the dedicated QA tab is closed. Independent source consistency verifies PDF SHA, 10 render/OCR hashes and exact 438-page index rebuild (`artifacts/session13-source-consistency-audit.json`).

## Session 12 historical evidence

Session 12 assigns **10 independent child-agent tasks** in waves: source reviews pp.333-342 and pp.343-352, selected-occurrence comparison, comparison accessibility, Governance/Analysis retirement, browser, identity/retention, source consistency, runtime/startup and documentation. The two source waves add **20** full-page reviews, printed pp.333-352/PDF pp.343-362. Coverage is now **389/419**, leaving **30** indexed chapter pages; Chapter 9 is **108/138**. The map has **33 source lenses** and **33 held-out provenance-only fixtures**, 23 concepts and 30 relationships. Receipts: `artifacts/chapter9-july-source-review-333-342.json` and `artifacts/chapter9-mid-july-source-review-343-352.json`; next review starts at printed **p.353/PDF p.363**, continuing through p.382, whose OCR is unavailable. The selected inspector now compares raw H+1 direction with the separate local ATR barrier path while retaining context withholding and `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`; receipt `artifacts/session12-feature-audit.json`. The Governance/Analysis route retirement preserves shared payloads and aliases legacy hashes to focused home; receipt `artifacts/session12-legacy-retirement.json`. Targeted source/index, comparison/accessibility/navigation/startup and identity/retention checks pass. Final full unit and cockpit production build pass in `artifacts/session12-final-unit.log` and `artifacts/session12-final-build.log` (existing >500 kB chunk warning). Source consistency passes attested PDF SHA-256, 10 render/OCR hashes and all 438 page records (`artifacts/session12-source-consistency-audit.json`). Browser QA passes 9/9 width/mode combinations and 36 event checks on the actual local-fallback tape (141,178 closed M5 bars, MT5 Offline), with zero overflow/overlap, 108px rail, 18px minimum label spacing and zero true-price-Y error (`artifacts/session12-outcome-comparison-browser-qa.json`). The `#analysis` alias resolves to `#home`, title QUANTSMART, and the dedicated QA tab is closed. Broker alias scope is rechecked after async MT5 work before either canonical or broker cache writes; no stale alias response can populate the new key. No detector, occurrence, denominator, rate, fill or order changes were added.

The prior responsive fix restored a 287 x 200 px plot at 320 x 700 (previously 66 px high), with zero horizontal overflow at 320 px, 390 px and desktop widths. Its targeted tests and final full unit, cockpit typecheck and production build passed; historical logs: `artifacts/session5-final-unit.log` and `artifacts/session5-final-build.log`. These logs do not validate the current increment.

## Verification commands

Run from the repository root:

```powershell
node tests/microchart-pan.test.mjs
node tests/microchart-interaction.test.mjs
node scripts/test.mjs --unit
node scripts/price-action-coverage.mjs
```

The coverage command checks the existing local OCR against the source index,
then reports reviewed/remaining chapter pages, pending printed-page ranges and
OCR gaps. Use `--chapter 9` to plan the next bounded review without rereading the
whole PDF. Page review is separate from implementation or outcome validation.

Run the focused application checks from `mfe_ux_lab/cockpit`:

```powershell
npm run typecheck
npm run build
```

The browser acceptance target is `http://127.0.0.1:5090/#home`. A connected
runtime must show XAUUSD, M5, verified closed bars, `MT5 / 2Y CLOSED`, and the
authority boundary `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

## Next work, in order

1. Maintain source-map consistency and review any future source claims deliberately: Chapter 2 has 28/28 interval pages
   curated, Chapter 11 has 30/30, and Chapter 12 has 1/1. Chapter 3 now has
   34/34 reviewed interval pages (printed pp. 33-66, including blank66).
   Chapter4 is complete at6/6 after blank72 was visually checked (`artifacts/chapter4-divider-source-review.json`). Chapter5
   is70/70 after reviewing printed73-142 (p.142 is a confirmed blank divider); Chapter6 is complete at 34/34 after reviewing printed143-176 (p.176 is a confirmed blank divider); Chapter7 is complete at 34/34 (blank210 confirmed), and Chapter8 is complete at 34/34 through printed244/PDF254. Chapter 9 is now 138/138 after the final visual review of printed373-382/PDF383-392; printed382 was confirmed blank. Run the coverage report to verify current source totals. Extend the
   strength-aware lens with independently reviewed pages while keeping local
   thresholds separate from source claims.
2. Add independently sourced OHLC/outcome holdouts only when actual market data
   and labels exist; keep narrative PDF examples `UNAVAILABLE`.
3. Continue legacy graph cleanup only after checking the focused startup graph
   and its route contracts.
4. Expand source review deliberately; every new claim needs printed/PDF page
   anchors and a regression that prevents it becoming an invented statistic.

## Non-negotiable boundaries

No PDF narrative is an OHLC dataset. No marker, win rate, forecast, mini chart
or position overlay may send an order. Forming candles, missing bars, stale
history, unsupported concepts and unverified source claims must remain explicit
`WAIT`, `ABSTAIN`, `UNAVAILABLE` or equivalent fail-closed states.



## Session 17 final verification

Auto-Attach now performs a bounded, cancelable, credential-free `POST /connect {}` when a supported visible runtime reports `NOT_ATTACHED`; explicit detach pauses it. Account namespace changes cancel late responses. Closed M5 refresh probes use a unique nonce and only promote data through an attested close boundary. The focused mobile pattern evidence shelf is bounded and scrollable at widths up to 430px, and connection dialog controls meet 44px mobile targets. These changes preserve `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

Final evidence: full unit `artifacts/session17-final-unit.log` passed; production build `artifacts/session17-final-build.log` passed with the existing >500 kB chunk warning; typecheck, focused refresh, auto-attach, accessibility, mobile pattern, identity, data-boundary and runner checks passed. Live Exness QA observed 141,660 verified closed M5 bars, advancing live tail through 04:45 UTC, and zero document/body horizontal overflow at 320/390/1440px.

### Session 18 runtime connection diagnosis (2026-11-18)

A read-only live probe found the Exness terminal and local bridge healthy: terminal64.exe is running, the bridge health endpoint is up, the attached account is REAL Exness-MT5Real29, XAUUSD resolves exactly, and `/api/mt5/bars?symbol=XAUUSD&tf=M5&n=2` returns verified UTC MT5_CLOSED_BARS with `forming_bar_included=false`. The newest probe advanced to 2026-11-18T05:25:00Z; no code fix was justified.

The apparent no-auto-connect path is bounded by design: the UI auto-posts `/connect {}` only after `/account` reports `NOT_ATTACHED`, skips recurring polls while the tab is hidden, stops after three attempts (20s/40s backoff), and remains paused after an explicit Detach until a manual attach or page restart. MT5 logs also showed a short authorization/access-point reconnect, while the shell environment contains a different `MT5_SERVER` (Exness-MT5Real28) than the running terminal (Exness-MT5Real29); Auto-Attach uses the already signed-in terminal, but Advanced connection must not reuse the mismatched server/login. The focused chart refreshes every 60 seconds and intentionally excludes the forming M5 candle, so a visible price change is expected only after the next five-minute close.

## Session 19 current evidence (2026-11-18)

Session 19 hardened MT5 reconnect behavior through **12 independent child-agent tasks** in four waves. The focused connector now retries only transient `TERMINAL_DISCONNECTED` and `ACCOUNT_UNAVAILABLE` states through the existing bounded, cancelable, credential-free Auto-Attach path; explicit Detach, authorization failures, invalid paths, unsupported environments and account-switch errors remain manual-only. UI regressions verify successful reconnect reaches a verified closed M5 health probe and `MT5 Sync`, while rejection/cancellation/hidden-tab semantics remain covered. No market-data authority or execution capability was expanded.

Evidence: `node scripts/test.mjs --unit` exit 0 with typecheck, targeted Auto-Attach/connection/accessibility/refresh/retention suites passing; production build exit 0 with the known large-chunk warning; live read-only runtime probe shows terminal64.exe, bridge :8791 and app :5090 active, REAL Exness-MT5Real29, XAUUSD M5 UTC `MT5_CLOSED_BARS`, no forming candle and tail through 05:35Z. The reconnect feature does not promote forming/future rows or cross account cache namespaces. Remaining goal work includes source-grounded PDF expansion, independent XAUUSD holdouts, browser transition evidence and cautious legacy cleanup.

Receipts: `artifacts/session19-browser-reconnect-qa.json`, `artifacts/session19-final-unit.log` and `artifacts/session19-final-build.log`.

## Session 20 historical continuation (2026-11-18)

Wave work completed with disjoint audits for source gaps, startup/runtime, legacy reachability, accessibility, statistics, retention identity, browser evidence, worker lifecycle, knowledge navigation and documentation. Real fixes include strict OHLC geometry in `patternBarrierOutcomes.ts`, complete row validation in `mt5DemoAdapter.ts`, explicit `SOURCE_NOTES` labels in the knowledge UI, and orphan `BeastBuilderPanel.tsx` removal.

The repository retains `artifacts/session20-final-unit.log`, but no
`artifacts/session20-final-build.log` is present. The earlier full-lane wording
is therefore historical and is not current acceptance evidence. Fresh
browser-host evidence was unavailable in the Wave 3 audit and is explicitly
excluded from live visual claims. The focused authority remains
`SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

## Session 21 source descriptor, holdout readiness and execution receipt (2026-11-18)

A bounded `patternLowVolatilityContext.ts` descriptor now measures recent 12-bar median M5 range against a prior 48-bar contiguous closed prefix. It returns `LOW_ACTIVITY_CONTEXT`, `TYPICAL_ACTIVITY_CONTEXT`, or explicit `WITHHELD` states with `lowActivityThreshold=0.65`, causal timestamps and descriptive-only authority. It is not connected to detector qualification, forecast gates, statistics or UI.

The independent holdout audit records `NOT_READY`: current MT5 history is account-scoped and not independent, available CSV evidence has the wrong symbol or unverified conversion, and PDF fixtures remain provenance-only. The next verifiable artifact is a sealed XAUUSD M5 OHLC manifest with keyed outcome labels.

Manual demo execution now normalizes broker receipts through a fail-closed taxonomy with explicit `PENDING`, `CONFIRMED`, `PARTIAL`, `ACCEPTED`, `REJECTED` and `UNAVAILABLE` states. Authority remains `MANUAL_DEMO_ONLY`, `real_execution_allowed=false`, `live_apply_allowed=false`.

Session 21 verification passes `node scripts/test.mjs --unit`, cockpit typecheck and production build. Targeted receipts are `artifacts/session20-xauusd-holdout-readiness-audit.json` and `artifacts/wave5-low-volatility-descriptor-audit.json`; bridge execution receipt tests pass independently. FastAPI-dependent full bridge discovery remains environment-dependent.

## Session 22 bridge testability continuation (2026-11-18)

Bridge test discovery now runs dependency-free source and receipt contracts when
FastAPI/httpx are unavailable, while optional FastAPI-bound modules skip only for
the allowlisted missing dependencies and re-raise unrelated import errors. The
runner accepts `MFE_PYTHON`, avoids installation or network attempts, and keeps
the managed environment's full integration lane available. Receipt:
`artifacts/wave6-bridge-dependency-free-audit.json`.

The system-Python bridge lane passed 9 dependency-free tests with 4 optional
modules skipped. The managed `.venv-mfe` lane passed 92/92 tests. Node syntax,
Python compilation, and `git diff --check` passed. The focused authority remains
`SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

## Session 23 candidate-source and holdout-contract continuation (2026-11-18)

A public Dukascopy XAUUSD tick endpoint was independently verified and recorded in `docs/independent_xauusd_source_probe.json`. The retained probe has a SHA-256 digest, decoded BI5 record count and UTC window, plus explicit MID-to-M5 derivation rules. It remains `SOURCE_VERIFIED_NO_HOLDOUT` and `CANDIDATE_ONLY` because no frozen selection lock or keyed outcome labels are included. No OHLC rows, rates, fills or orders were bundled.

`xauusdM5HoldoutValidator.ts` now validates a future `SEALED_HOLDOUT` manifest and keyed labels. It requires strict canonical UTC/M5 closed bars, valid OHLC geometry, exact label parity, matching source digests, frozen outcome metadata and `SHADOW_ONLY` authority. `UNAVAILABLE` and `AMBIGUOUS` labels require reasons. Receipt: `artifacts/session21-xauusd-holdout-validator.json`; focused regression: `tests/xauusd-m5-holdout-validator.test.mjs`.

Expanded reviewed source notes now expose `SOURCE_REVIEW_ONLY / data UNAVAILABLE / outcome WITHHELD` for `SOURCE_NOTES` concepts, while retaining the authority boundary. Receipt: `artifacts/session20-source-translation-audit.json`. These changes do not promote source prose to detector rules, XAUUSD outcomes or execution authority.

## Session 24 sealed-holdout intake continuation (2026-11-18)

The sealed-manifest contract now has a repeatable dataset-free intake command,
`node scripts/validate-xauusd-m5-holdout.mjs`. It requires a manifest, keyed
outcome labels and the raw source bytes, computes the source digest through the
existing strict validator, emits a machine-readable `READY` or `NOT_READY`
report, and preserves `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.
The current Dukascopy probe is rejected by this intake because it remains
`CANDIDATE_ONLY` and carries no OHLC rows, selection lock or outcome labels.

Receipt: `artifacts/session24-xauusd-holdout-intake-audit.json`; regression:
`tests/xauusd-m5-holdout-intake.test.mjs`. No market-data rows, outcome labels,
rates, fills or orders were generated or bundled. The next artifact remains a
sealed XAUUSD M5 manifest plus independently keyed labels derived from the
verified source bytes.

## Session 24 documentation consistency addendum (2026-11-18)

The acceptance ledger, handoff and implementation-gaps ledger now agree that
the Session 24 intake is the latest continuation. The candidate probe remains
`CANDIDATE_ONLY` and `NOT_READY`; it contains no OHLC rows, selection lock or
outcome labels. The Session 19 browser/runtime receipt still records an
unavailable browser host, so Session 18 remains the visual baseline and no new
live-market claim is made. The missing Session 20 build receipt is not cited as
acceptance evidence. Receipt:
`artifacts/session24-documentation-consistency-audit.json`; regression:
`tests/session24-documentation-consistency-audit.test.mjs`. Preserve
`SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

## Session 24 product hardening continuation (2026-11-18)

The focused chart now marks dense candle, wick and indicator geometry as
decorative SVG content while retaining the semantic chart summary, endpoint,
annotations and controls. The source knowledge book exposes reviewed, pending
and in-review chapter filters without changing source status or detector data.
The unreachable `CockpitTelemetry` wrapper and standalone instrument test were
removed after reachability review; shared telemetry services remain.

Economic-calendar imports now require bounded canonical UTC timestamps, unique
event identities, bounded text and deterministic ordering. Invalid configured
API payloads fail closed before a countdown is shown. Manual demo receipts
require explicit unsuccessful unknown states and positive broker identifiers
before a fill-like resolution is exposed. These changes preserve
`SHADOW_ONLY / NO_DECISION / live_apply_allowed=false` and
`MANUAL_DEMO_ONLY / real_execution_allowed=false`.

Verification passed `node scripts/test.mjs --unit`, cockpit `npm run typecheck`,
cockpit `npm run build`, `npm run test:bridge` with 94/94 managed tests, and
the four built public-runtime lanes. Browser runtime evidence remains
unavailable at the local endpoint, recorded in
`artifacts/session24-runtime-browser-evidence-audit.json`.
## Session 25 source identity and runtime evidence continuation (2026-11-18)

The retained Dukascopy probe now has a repeatable identity audit that checks
the raw-byte digest, XAUUSD hourly BI5 URI, UTC hour boundaries, MID-only
derivation and candidate-only holdout contract without generating OHLC bars or
outcome labels. Receipt: `artifacts/session25-independent-source-probe-identity-audit.json`;
regression: `tests/session25-independent-source-probe-identity.test.mjs`.

The fresh runtime audit found no browser host and no listeners on ports 5090 or
8791. Session 18 remains a historical layout reference only, with stale visual
and live-market claims suppressed. Receipt:
`artifacts/session25-runtime-browser-evidence-audit.json`; regression:
`tests/session25-runtime-browser-evidence-audit.test.mjs`. The focused authority
remains `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

The `obstacle_room` source lens remains explicitly `SOURCE_NOTES` with
`SOURCE_REVIEW_ONLY / UNAVAILABLE / WITHHELD` status. `patternRoomContext` stays
an optional causal observation and does not qualify detector occurrences,
forecast gates, fills or orders. Receipt:
`artifacts/wave6-obstacle-room-source-audit.json`; regression:
`tests/wave6-obstacle-room-source-audit.test.mjs`.

The focused snapshot staleness contract and Session 25 statistics denominator
audit remain in the deterministic unit lane alongside the independent-source,
runtime/browser and obstacle-room regressions. `tests/test-runner-registration.test.mjs`
asserts each of those five registrations occurs exactly once in `scripts/test.mjs`.
The denominator audit preserves FLAT in selected-occurrence support and rejects
future-mutated queries without creating a win-rate, fill or order claim.

The focused mobile accessibility audit raises phone chart reset, Why/PDF,
inspector action and disclosure controls to thumb-sized targets while preserving
bounded local overflow and focus restoration. Receipt:
`artifacts/session25-focused-mobile-accessibility-audit.json`; regression:
`tests/session25-focused-mobile-accessibility-audit.test.mjs`. The legacy
FirstRun wrapper and stylesheet are removed, and release, portable-package and
doctor references now point to the shared Microscope CSV importer. Regression:
`tests/legacy-first-run-reachability.test.mjs`.

## Session 26 browser/runtime receipt (2026-11-18)

Fresh Orca browser evidence at `http://127.0.0.1:5090/#home` passes at desktop
1440x900 and mobile 390x844. Both viewports have zero horizontal overflow and
retain the focused `XAUUSD M5` chart with 141,178 closed bars ending at
`2026-11-11T07:35:00Z UTC`. Mobile toolbar, reset, inspector and disclosure
controls retain 36px targets. Opening and closing the Double Pressure inspector
restores focus to its invoking pattern button. The observed state is `MT5
Offline`, `LOCAL SNAPSHOT Â· HISTORY UNAVAILABLE`, and local historical fallback
provenance. The receipt claims no live market data and preserves
`SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`. Receipt:
`artifacts/session26-browser-runtime-receipt.json`; regression:
`tests/session26-browser-runtime-receipt.test.mjs`.

## Wave 8 retention and snapshot identity audit (2026-11-19)

The focused XAUUSD M5 retention audit covers UTC offset aliases for current and
stale snapshots, future and off-grid fail-closed identities, the inclusive
calendar cutoff, malformed retention tails and research-only authority on
snapshot restore. It cross-checks the latest holdout-intake and browser
receipts. No detector, occurrence, denominator, rate, fill, order or
statistics change was made. Receipt:
`artifacts/wave8-retention-snapshot-identity-audit.json`; regression:
`tests/wave8-retention-snapshot-identity-audit.test.mjs`. Preserve
`SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

## Session 33 detector exhaustive audit and bilingual quality pass (2026-11-19)

The exhaustive detector audit now covers all 13 price-action concepts, their
public and direct entry points, causal windows, duplicate/off-grid/forming-row
handling, direction edges, workers and scan lifecycle. It fixed two reproduced
defects: a two-sided `false_break` sweep could be assigned DOWN by branch order,
and direct pattern observers accepted uniformly shifted five-minute timestamps.
Both now fail closed. Receipt: `artifacts/wave5-detector-exhaustive-audit.json`;
regression: `tests/wave5-detector-exhaustive-audit.test.mjs`.

The focused Microscope surface adds locale-aware English/Vietnamese labels for
source coverage, snapshot actions, bookmarks, retry status and price-action
readouts. Receipt regression: `tests/microscope-bilingual-focused-copy.test.mjs`.
PDF navigation coverage is complete for all 419 indexed chapter pages and 36
held-out provenance fixtures. Nineteen front/back-matter pages and eight blank
or divider pages remain identity-only. Receipt:
`artifacts/session33-pdf-coverage-next-wave-audit.json`.

No source-only concept became executable, and no detector outcome, denominator,
OHLC fixture, fill, order or authority claim was added. Preserve
`SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

The full unit lane also caught and closed an off-grid path in the local
`patternPullbackPressure` observer. Shifted five-minute timestamps now remain
withheld, matching the public M5 identity contract. Regression coverage is in
`tests/pattern-pullback-pressure.test.mjs`; final unit, typecheck and build
receipts are `artifacts/session33-final-unit.log` and
`artifacts/session33-final-build.log`.

The real detector receipt now persists each current marker's bar index, UTC
time, price, direction, above/below position and source OHLC row. The quality
audit verifies marker time identity, in-range price and side-anchor consistency
alongside the closed-bar denominator checks. Receipt:
`artifacts/wave6-real-detector-quality.json`; regression:
`tests/wave6-real-detector-quality.test.mjs`.

## Session 34 all-PDF-signal translation and inspector coverage (2026-11-19)

The ten concepts previously marked `SOURCE_NOTES` now have a unified
`pdfSignalTranslation` receipt on the selected XAUUSD M5 closed prefix. Six
produce bounded descriptive local geometry. Bracket/cost, news and sizing
concepts remain `UNAVAILABLE` without the required external inputs, and
reversal exit remains `WITHHELD` without a validated event label. All ten keep
source-review status, withheld outcomes and the research-only authority.

The focused inspector now renders all ten translation descriptors beside the
existing 13 geometry proxies, with English/Vietnamese labels and explicit
descriptive, unavailable or withheld states. The knowledge panel also exposes
the complete 23-concept implementation split. Receipts and regressions are
`artifacts/wave6-pdf-signal-translation.json`,
`tests/wave6-pdf-signal-translation.test.mjs`,
`artifacts/wave6-pdf-signal-ui-audit.json` and
`tests/wave6-pdf-signal-ui-audit.test.mjs`.

No PDF illustration became XAUUSD OHLC, a fill, an order, a win rate or a live
decision. Preserve `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

## Session 36 PDF all-signal XAUUSD translation wave (2026-11-19)

The focused surface now has a unified `detectAllPdfSignals` adapter covering
all 23 PDF concepts on the XAUUSD M5 tape. The 13 existing detector concepts
retain their closed-bar geometry assessments. The ten source-note concepts now
resolve through bounded source-note detectors for selected-candle geometry,
review coverage, quote-price bracket context, event identities, resistance,
failure selection, low-volatility and obstacle-room observations. Every
descriptor preserves `SOURCE_REVIEW_ONLY`, future-row withholding, withheld
outcomes and `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

The chart reports all 23 concepts in the inspectable read-only PDF coverage
shelf and a 23-concept status count. Only the 13 geometry assessments contribute chart markers. The ten
source-note descriptors remain shelf and inspector observations. No PDF EUR/USD
figure is converted into XAUUSD OHLC, source label, rate, fill, order or execution authority. Receipts
and regressions are `artifacts/wave8-pdf-all-signal-detector.json`,
`artifacts/wave8-pdf-all-signal-coverage-audit.json`,
`artifacts/wave8-source-note-detectors.json`,
`tests/wave8-pdf-all-signal-detector.test.mjs`,
`tests/wave8-pdf-all-signal-coverage-audit.test.mjs`,
`tests/source-note-detectors.test.mjs` and
`tests/wave8-source-notes-detectors.test.mjs`.

## Wave 10-11 all-signal parity and realtime quality (2026-11-19)

The unified adapter now returns source-note descriptors from the same bounded detectors used to create observations. `position_sizing` remains unavailable without explicit account, risk and contract assumptions, so it cannot become a false OHLC-only chart marker. The 23-concept parity regression checks that every descriptor state matches its observation and that all ten source-note concepts retain withheld outcomes and research-only authority.

The live tick parser now requires cursor/frame generation agreement, canonical timeframe identity, valid closed/forming-bar ordering, and the newest tick to be inside the forming candle bucket. Integral multi-period session gaps remain valid. Invalid or late packets fail closed without changing the closed-bar detector tape.

The compact chart shelf now localizes headings, disclosure text and chip accessible labels in English and Vietnamese. Receipts and regressions are `artifacts/wave10-pdf-all-signal-concept-parity.json`, `artifacts/wave10-pdf-all-signal-performance-boundary.json`, `artifacts/wave11-bilingual-chart-label-audit.json`, `tests/wave10-pdf-all-signal-concept-parity.test.mjs`, `tests/wave10-pdf-all-signal-performance-boundary.test.mjs`, `tests/live-forming-detection.test.mjs`, `tests/wave5-live-tick-freshness.test.mjs` and `tests/microchart-bilingual-shelf.test.mjs`.

No PDF narrative figure becomes XAUUSD OHLC, a source label, outcome, rate, fill, order or execution decision. Preserve `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

The read-only MT5 verification script `scripts/verify-real-xauusd-pdf-signals.mjs` was run against the latest 4,999 closed XAUUSD M5 bars. It selected the latest 96-bar contiguous causal prefix available before a broker session gap and evaluated all 23 concepts. Receipt: `artifacts/real-xauusd-m5-pdf-signal-verification.json`; regression: `tests/real-xauusd-pdf-signal-verification.test.mjs`. The neutral case records five detected observations, explicit unavailable/withheld states for concepts requiring direction or external inputs, deterministic repeat, future-row invariance, UTC closed-bar identity and the unchanged authority boundary.

## Session 37 final verification (2026-11-19)

The unified source-note descriptor is now the single UI/API source, so the focused PDF panel cannot show a stale state or reason. Full `node scripts/test.mjs --unit` passes after the locale, realtime, descriptor-parity and real-MT5 verification changes. Cockpit typecheck, production build and managed bridge lane (97 tests) pass. Receipts: `artifacts/session37-final-unit.log` and `artifacts/session37-final-build.log`; the build retains only the existing large-chunk warning.

## Session 38 focused readability and realtime quote verification (2026-11-19)

The focused chart readouts now use readable middle-dot separators in the
current-pattern, provenance, analogue, recurrence and replay summaries. The
language toggle was verified in the live browser in both directions. English
and Vietnamese shell copy, chart status, forecast status and source-note
surfaces update together. The live quote readout now selects the newest
verified SSE tick even when transport order is out of sequence.

The unit runner registration typo introduced with the 23-signal shelf was
fixed. The complete unit lane (`artifacts/session38-final-unit.log`), cockpit typecheck and production build (`artifacts/session38-final-build.log`) pass. The managed bridge lane also passes 97 tests.
The 13 geometry-proxy display names and definitions now have Vietnamese
presentation copy while the English PDF map remains the source attestation.
Chart-local forecast and closed-bar provenance headings also follow EN/VI. No detector, OHLC, outcome, fill, order or authority claim
was changed. Preserve `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

## Session 39 realtime copy and boundary hardening (2026-11-19)

The focused live strip now uses locale-aware quote formatting (`en-US` and
`vi-VN`), readable quote-unavailable labels and localized forming-candle
states. A browser audit found and removed a literal `\u00b7` escape that was
visible in the Vietnamese DOM. The live strip now renders a real middle dot,
keeps `BID`, `ASK`, `PROVISIONAL`, `STALE`, `WAIT` and the research-only
authority tokens stable. The realtime parser also rejects an off-grid closed
bar when no forming bar is present. Current-pattern CI95 and observed-outcome summaries also use readable slash separators without question-mark placeholders.

Receipt: `artifacts/session39-realtime-copy-audit.json`. Regressions are
`tests/microchart-live-copy.test.mjs` and `tests/live-forming-detection.test.mjs`.
Cockpit typecheck, production build, full unit lane and managed bridge lane
(97 tests) pass. No detector outcome, OHLC fixture, fill, order or authority
claim changed. Preserve `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

## Wave 22 independent holdout readiness audit (2026-11-19)

The sealed XAUUSD M5 intake had one concrete geometry gap. Its validator
delegated to the focused closed-bar helper, which permitted `high === low` and
could therefore report a degenerate manifest as `READY`. Holdout validation now
requires finite OHLC with `high > low` and open/close inside the high-low range.
The zero-range regression is covered by
`tests/xauusd-m5-holdout-validator.test.mjs`; the audit receipt is
`artifacts/wave22-holdout-readiness-audit.json` and its receipt regression is
`tests/wave22-holdout-readiness-audit.test.mjs`.

The independent source probe remains `CANDIDATE_ONLY` and `NOT_READY`. PDF
narrative remains provenance-only, with no XAUUSD OHLC, labels, rates, fills,
orders or source-qualified accuracy claim. Preserve
`SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

## Session 40 PDF-to-XAUUSD completion and audit wave (2026-11-19)

The focused XAUUSD M5 surface continues to expose all 23 PDF concepts through the unified detector. A disabled detector request now withholds every observation and reconciles counts to 23 withheld rows. Wave 22 refreshed the real MT5 receipt with up to 5,000 closed XAUUSD M5 bars and deterministic/future-row checks. Wave 22 also made every PDF coverage tile selectable, including ABSTAIN, UNAVAILABLE and WITHHELD concepts, without creating chart markers.

Vietnamese source-note presentation was rewritten with encoding-safe labels and complete source-preserving copy. The PDF shelf no longer emits literal escaped separators. Wave 23 regressions cover focused PDF copy encoding, all 23 detector identities and disabled-state withholding. The focused chart pattern status now localizes its accessible name, chip titles and authority text in Vietnamese. No PDF narrative OHLC, source-qualified outcome, fill, order or live-apply claim was added. Preserve `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

Independent XAUUSD holdout readiness remains `NOT_READY` until sealed bars and independently keyed labels exist.

## Session 42 PDF implementation, copy and realtime identity hardening (2026-11-19)

The focused XAUUSD M5 surface still evaluates all 23 PDF concepts through the
unified observation adapter. The latest read-only MT5 receipt contains 4,999
closed bars with the neutral case at `5 DETECTED`, `11 ABSTAIN`, `5 UNAVAILABLE`
and `2 WITHHELD`.
The parity, deterministic-repeat and future-row invariance lanes pass. The 13
geometry proxies remain local closed-bar observations. The 10 source-note
concepts retain descriptive or explicit unavailable/withheld states until
independent labels and an execution model exist.

Focused runtime copy now routes the forecast receipt, forecast status and
historical analogue labels through the shared English/Vietnamese copy map.
The remaining question-mark separators were replaced with readable `|`
separators. Regression coverage is in
`tests/focused-copy-runtime-audit.test.mjs`,
`tests/focused-forecast-status-a11y.test.mjs`,
`tests/microscope-bilingual-focused-copy.test.mjs` and
`tests/pdf-signal-coverage-shelf.test.mjs`.

Feed-scoped realtime parsing now requires the expected canonical `symbol` and
`timeframe` fields when the SSE consumer supplies them. Missing or mismatched
identity fails closed before forming-candle presentation. Standalone legacy
fixtures remain compatible when no expected identity is supplied. Regression:
`tests/live-ticks.test.mjs`.

The targeted PDF, realtime, parity, full unit, cockpit typecheck and production
build lanes pass. The build retains the existing large-chunk warning. No PDF
narrative figure became XAUUSD OHLC, a source-qualified outcome, rate, fill,
order or live decision. Preserve
`SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

Wave 27 source-contract review also hardened the lower-level compatibility paths.
The PDF translator now rejects duplicate selected identities and non-quote or
negative bracket assumptions. Failure-selection context validates only its
bounded 96-bar causal prefix while rejecting duplicate selected identities.
Valid geometry `ABSTAIN` observations now report available data when a valid
closed tape was evaluated, keeping no-match separate from missing data.
Regressions extend `tests/wave6-pdf-signal-translation.test.mjs`,
`tests/pattern-failure-selection-context.test.mjs` and
`tests/wave10-pdf-all-signal-concept-parity.test.mjs`.

## Wave 28 verification and source-note completion (2026-11-19)

The focused PDF shelf now receives a deterministic verification receipt for the
same 23-concept unified scan. It reports repeatability, count reconciliation,
future-row invariance, source provenance and the unchanged authority boundary.
The receipt is implemented in `pdfSignalVerification.ts` and covered by
`tests/pdf-signal-verification.test.mjs`.

The unified detector now forwards validated `newsEvent` input and supports an
explicit later `observedThrough` closed boundary for resistance/reversal/news
identity-only observations. `selectedTime` remains the setup anchor. No event
identity becomes an exit decision, fill, order, outcome or source-qualified
rate.

Wave 28 audits confirm all 10 source-note concepts retain bounded inputs,
bilingual labels, ordered anchors and explicit unavailable/withheld states.
Independent XAUUSD holdout readiness remains `NOT_READY`; warm-up and terminal
no-H+1 denominator components remain explicit evidence gaps.

## Session 41 wave25 acceptance handoff (2026-11-19)

The PDF coverage shelf fix keeps each localized state label as one complete
English or Vietnamese string in tile text and accessible names. Regression:
`tests/wave25-pdf-shelf-render-contract.test.mjs`.

Source-note localization now has a passing receipt for all 10 `SOURCE_NOTES`
concepts. Vietnamese presentation labels and readings are complete, English
source wording and ordered PDF anchors remain preserved, and the source-only
contract remains `SOURCE_REVIEW_ONLY / data UNAVAILABLE / outcome WITHHELD`.
Receipt: `artifacts/wave25-source-notes-localization-audit.json`; regression:
`tests/source-notes-localization.test.mjs`.

Realtime forming-bar handling now refuses to overwrite a promoted closed candle
when a delayed forming packet reuses the same M5 timestamp. The chart labels a
row as mutable context only when a genuinely newer forming row is appended.
Regression: `tests/live-ticks.test.mjs`; the existing overlap-accessibility
contract remains covered by `tests/microchart-overlap-accessibility.test.mjs`.

The read-only MT5 verification receipt evaluates all 23 PDF concepts on 4,999
closed XAUUSD M5 bars and a 96-bar contiguous causal prefix. It records 5
detected, 11 abstain, 5 unavailable and 2 withheld observations, with
deterministic repeat and future-row invariance. Receipt:
`artifacts/real-xauusd-m5-pdf-signal-verification.json`; aggregate audit:
`artifacts/session40-pdf-to-xauusd-audit.json`; regression:
`tests/real-xauusd-pdf-signal-verification.test.mjs`.

The four targeted regressions pass. No PDF narrative figure became XAUUSD
OHLC, an outcome, rate, fill, order or live decision. Preserve
`SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

## Session 43 continuation (2026-11-19)

Focused `MicroChart` copy now localizes empty/insufficient-data states, drawing
toolbar labels, chart descriptions, live/closed-bar readouts and authority copy
through the English/Vietnamese locale. The chart remains XAUUSD M5 and
preserves `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`. Targeted
MicroChart localization and PDF shelf regressions pass.

The unified PDF verification receipt remains read-only and evaluates 23 concepts
on 4,999 closed XAUUSD M5 bars. The latest receipt records 5 detected,
11 abstain, 5 unavailable and 2 withheld observations, with deterministic repeat,
count reconciliation, future-row invariance and UTC closed-bar identity. No PDF
narrative figure becomes OHLC or outcome evidence. Identity-only news,
resistance and reversal observations may use a validated later
`observedThrough` boundary while `selectedTime` remains the setup anchor and
outcomes stay withheld. Receipt:
`artifacts/real-xauusd-m5-pdf-signal-verification.json`.

Cockpit typecheck, production build and the complete unit lane pass with the
existing large-chunk warning. The empty-state, endpoint-context, UTF-8, drawing
history, interaction and research-line contracts were updated to assert the
locale-aware implementation. The real-feed causal-boundary audit now mutates
the first excluded row after `selectedTime` and confirms the 23-concept result
is unchanged. Independent holdout readiness remains `NOT_READY`.

## Session 44 PDF verification provenance hardening (2026-11-19)

`verifyPdfSignalReceipt` now validates its verification-source tag at runtime,
so JavaScript callers that bypass the TypeScript union fail closed with
`UNSUPPORTED_VERIFICATION_SOURCE`. The receipt remains read-only and keeps the
`SHADOW_ONLY / NO_DECISION / live_apply_allowed=false` authority boundary.
Regression: `tests/pdf-signal-verification.test.mjs`; cockpit typecheck passes.
No PDF narrative figure became XAUUSD OHLC, outcome, fill, order or source-
qualified evidence. Independent holdout readiness remains `NOT_READY`.

## Session 44 runtime and copy hardening (2026-11-19)

Disabled live-tick feeds now pass their enabled state to terminal-generation
subscription logic, so chart surfaces that do not display realtime data avoid
unnecessary MT5 invalidation rerenders and SSE setup. Regression:
`tests/live-tick-feed-disabled-generation.test.mjs`.

The PDF coverage shelf now translates unified descriptor reason codes into
readable English/Vietnamese labels, including direction, causal-prefix, event,
bracket, sizing and low-volatility states. Raw uppercase reason codes no longer
leak into Vietnamese tile text or accessible names. Regressions:
`tests/pdf-signal-coverage-shelf.test.mjs`,
`tests/wave25-pdf-shelf-render-contract.test.mjs` and
`tests/microchart-bilingual-shelf.test.mjs`.

Both changes preserve `SHADOW_ONLY / NO_DECISION /
live_apply_allowed=false` and do not alter detector counts, outcomes or order
authority.

## Focused live-quote copy follow-up (2026-11-19)

The final locale-aware `MicroChart` copy pass preserves readable middle-dot
separators in the broker/forming context and timestamp/reason line. BID/ASK,
`PROVISIONAL`, `STALE`, `WAIT` and the closed-bar authority wording remain
stable in English and Vietnamese. Regressions are
`tests/microchart-live-copy.test.mjs`,
`tests/live-forming-detection.test.mjs` and
`tests/focused-live-tick-chart.test.mjs`. This is a presentation-only fix and
does not change detector counts, outcomes, execution behavior or authority.

## Session 45 detector and verification hardening (2026-11-19)

The PDF detector surface now has an explicit audit receipt covering all 23
XAUUSD M5 concepts, 13 geometry proxies and 10 source-note descriptors. A
calendar NEWS identity cannot observe an event after the selected occurrence
unless the caller supplies a validated `observedThrough` closed-M5 boundary.
The audit regression is `tests/session45-pdf-detector-surface-audit.test.mjs`
with receipt `artifacts/session45-pdf-detector-surface-audit.json`.

Real XAUUSD verification scripts now reject bars whose five-minute close is
after the retrieval clock and persist closed-bar provenance, server timezone
and read-only markers in their receipts. The realtime causal-boundary test no
longer couples independently refreshed live ordinals while retaining identity
and future-row invariance checks. Independent holdout readiness remains
`NOT_READY`. Preserve `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

## Session 46 browser locale and PDF shelf receipt (2026-11-19)

The focused local runtime was inspected through the Orca browser. The initial
Vietnamese surface exposed `EN Â· Tiáº¿ng Anh`; after activation the document
language became `en`, the control became `VI Â· Vietnamese`, the chart
accessibility label switched to English, and the PDF shelf retained 23 concept
tiles. Receipt: `artifacts/session46-browser-locale-pdf-receipt.json`;
regression: `tests/session46-browser-locale-pdf-receipt.test.mjs`.
The receipt is a UI observation only and makes no live-market claim.

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

The Session 48 real verifier rerun refreshed `artifacts/real-xauusd-m5-pdf-signal-verification.json` from 4,999 closed MT5 XAUUSD M5 bars through `2026-11-19T08:00:00Z`. The embedded all-23 census reports 4,972 evaluated rows and 18 skipped gap rows. Geometry-proxy frequencies and descriptive H+1 buckets are present. Source-note rates, directional claims and outcomes remain withheld. Full unit receipt: `artifacts/session48-final-unit.log`; build receipt: `artifacts/session48-final-build.log`.


## Session 49 focused chart layout and model panel (2026-11-20)

The focused XAUUSD M5 home surface now keeps the chart as the primary workspace and provides a two-column context mode with an approximately 2/3 chart and 1/3 model panel layout. The focused panel shows the current detected model, a plain-language explanation, bounded historical examples, and an orientation-aware next closed-bar rate. Named candle rates use UP for bullish patterns, DOWN for bearish patterns, and explicit N/A for neutral setups. Named causal analogue rows are clickable and carry a descriptive-only authority disclosure.

Focused legacy diagnostics are hidden from the visible surface, including source coverage, research bookmarks, the old price-action readout, PDF statistics and the learning map. The chart-only toggle remains reversible through session storage. Focused controls retain only the context toggle while the global locale and connection controls remain available in the shell. The chart continues to start at the latest closed XAUUSD M5 candle, supports fractional pan and overscroll, and keeps marker hit targets above non-interactive grid/session layers.

Buy/sell position text remains descriptive chart geometry only. Detector authority remains `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`; no order path was added.

Acceptance checks passed: cockpit typecheck, production build, focused chart-only, focused M5 surface, focused current-pattern status, focused mobile pattern stack, MicroChart responsive, pan, marker hover, interaction, overlap accessibility, Pattern Atlas contract and named-candle history. The production build retains the existing large-chunk warning.

Runtime browser inspection confirmed the focused panel and chart geometry, hidden legacy sections, latest-candle startup and bilingual Vietnamese rendering. The browser session was observed against the local MT5-backed read-only surface. This is UI evidence and does not add market validation.
