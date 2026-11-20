# Price-action implementation gaps

## Session 68 backend detector queue boundary (2026-11-20)

The focused XAUUSD M5 price-action detector now submits to the local research
queue through a focused-safe client. The result carries schema, engine/input
hashes, tape hash, symbol/timeframe, bar count, transitional browser-supplied
scope and the unchanged `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`
authority. The browser worker remains a compatibility path for unavailable
backend transport and non-XAUUSD legacy views.

This does not complete the backend migration. `detectAllPdfSignals` still runs
synchronously for the focused PDF shelf and inspector translation, while PDF
statistics and verification retain their browser worker contracts. The next
slice must move those results behind backend queue operations with parity
receipts before the frontend can be display-only for all detector surfaces.

## Session 33 PDF coverage and navigation audit (2026-11-19)

The attested page index still covers **419/419 indexed chapter pages** across
the 12 chapter intervals. All 23 concept page lists and all 36 source-lens
page lists resolve to curated page records. The 36 held-out provenance fixtures
also resolve to curated pages and retain
`SOURCE_REVIEW_ONLY / UNAVAILABLE / WITHHELD` status. The machine-readable
receipt is `artifacts/session33-pdf-coverage-next-wave-audit.json`.

The remaining 19 PDF pages are front/back matter without printed chapter
anchors (PDF pp. 1-12 and 432-438), so they remain outside strategy concept
navigation. Eight indexed chapter pages are blank or divider pages with no OCR
or concept anchor: printed pp. 66, 72, 142, 176, 210, 242, 244 and 382
(PDF pp. 76, 82, 152, 186, 220, 252, 254 and 392). They remain navigable page
identities and must not receive inferred source concepts or outcomes.

The ten `SOURCE_NOTES` concepts now have a concrete observation-layer
implementation through the unified `detectAllPdfSignals` path:
`signal_entry_bar`, `bracket_costs`, `news_exit`, `resistance_exit`,
`reversal_exit`, `trade_selection_failure`, `consecutive_review`,
`position_sizing`, `low_volatility` and `obstacle_room`. Each exposes a bounded
XAUUSD M5 descriptor, bilingual source context and explicit data/outcome state.
Independent source labels, causal denominators and any execution or exit model
are still absent, so these observations cannot be promoted to source-qualified
detectors, rates, fills or orders.

The audit confirms parity between the 23 knowledge-map concepts and the focused
observation path. No source-qualified outcome or execution authority is added.
Preserve `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

_Date: 2026-11-19 · audit scope: source-reviewed concepts/lenses versus the focused XAUUSD M5 observation path, context receipts, and pattern inspector._

This audit follows the source/implementation boundary in [`PROJECT_STATUS.md`](PROJECT_STATUS.md) and [`AI_SESSION_STATE.md`](AI_SESSION_STATE.md). The PDF is a qualitative EUR/USD M5 study. Its narrative figures are not XAUUSD OHLC labels, fills, or outcomes. A `GEOMETRY_PROXY` result therefore means a local, deterministic OHLC approximation; a `SOURCE_NOTES` result means the source idea is indexed and reviewable with a bounded descriptive descriptor, while source-qualified detector attribution and measured outcomes remain unavailable.

## Wave 4 documentation consistency addendum (2026-11-18)

The source-gap wave reviewed `trade_selection_failure` and its linked lenses.
It remains `SOURCE_NOTES` with `SOURCE_REVIEW_ONLY`, `UNAVAILABLE` data and
`WITHHELD` outcomes. Existing `false_break` geometry cannot establish the
source's later selective counterbreak without a causal pre-entry label and
independently labelled XAUUSD M5 validation. The safe next step is a held-out
walk-forward study design, not a detector or statistic (`artifacts/wave1-source-gap-audit.json`,
`tests/wave1-source-gap-audit.test.mjs`).

The retention, worker, accessibility, startup and legacy audits changed no
price-action concept status, detector count, denominator, rate, fill, order or
authority. The browser/runtime receipt `artifacts/session19-browser-runtime-evidence-audit.json`
had no fresh browser host, so the Session 18 visual receipt remains the current
visual baseline. The partial, unverified
`artifacts/session20-final-unit.log` is not a passing acceptance receipt. Keep
the focused boundary `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false` and
do not convert PDF narrative figures into XAUUSD OHLC or outcomes.

## Session 27 legacy release-manifest reachability audit (2026-11-18)

The current supported route graph has no remaining dead page or component
leaves. Focused Microscope startup remains chart-first, and legacy research and
knowledge modules stay behind lazy boundaries. The historical generated
`RELEASE_MANIFEST.json` contains 20 stale paths for retired wrappers, routes,
shell files and tests. It remains preserved for historical provenance while
`scripts/package-release.mjs` supplies fresh release roots from the current
source graph. Receipt: `artifacts/session27-legacy-release-manifest-audit.json`;
regression: `tests/session27-legacy-release-manifest-audit.test.mjs`. No
detector, denominator, rate, OHLC fixture, fill, order or authority change is
claimed. Preserve `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

## Session 26 source-only concept audit (2026-11-18)

The bounded source review for `signal_entry_bar`, `consecutive_review`, and
`position_sizing` confirms that all three remain `SOURCE_NOTES`. Signal and
entry-bar language does not recover an executable fill or intrabar crossing,
consecutive-session annotations do not provide an XAUUSD study denominator, and
hypothetical sizing or compounding examples do not transfer to an XAUUSD
contract. Their linked lenses and held-out fixtures remain
`SOURCE_REVIEW_ONLY`, `UNAVAILABLE`, and `WITHHELD`.

Receipt: `artifacts/session26-source-only-concepts-audit.json`.
Regression: `tests/session26-source-only-concepts-audit.test.mjs`.
No detector, denominator, rate, OHLC fixture, fill, order path, or authority
change is claimed. Preserve `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

## Session 28 boundary and navigation audits (2026-11-19)

The detector now rejects zero-range OHLC rows before historical evaluation, so
degenerate rows cannot enter occurrence or H+1 denominators. Selected census,
obstacle and identity-only replay checks retain FLAT-inclusive, future-isolated
and unresolved-row handling. Receipt:
`artifacts/session28-statistics-causality-audit.json`; regression:
`tests/session28-statistics-causality-audit.test.mjs`.

Focused chart paging preserves the visible width at retained-tape boundaries.
The lazy `PriceActionBookIndex` now uses the shared source-status contract and
shows explicit `SOURCE_REVIEW_ONLY / data UNAVAILABLE / outcome WITHHELD`
wording for every source lens. Receipt:
`artifacts/session28-chart-interaction-audit.json` and
`artifacts/wave9-knowledge-navigation-source-label-audit.json`; regressions:
`tests/microchart-page-navigation.test.mjs` and
`tests/wave9-knowledge-navigation-source-label-audit.test.mjs`. No source note
was promoted to a detector, outcome, or authority claim.

## Session 29 bounded inspectability and refresh wave (2026-11-19)

The selected inspector now shows the existing local low-volatility descriptor
for the causal closed M5 prefix. Baseline/recent median ranges and directional
efficiency remain descriptive study measurements. The receipt is explicitly
`SOURCE_REVIEW_ONLY / data UNAVAILABLE / outcome WITHHELD` and does not filter
detectors, alter denominators, or create a win-rate claim. The chart `End`
shortcut preserves the current zoom width at the latest retained bars.

Focused MT5 refresh failures after a successful promotion now retain the last
verified tape and expose a bounded read-only reason. This improves observability
without changing symbol/timeframe identity, retained rows, detector evidence,
statistics, fills, orders or authority. Receipt:
`artifacts/session29-feature-wave-audit.json`.

## Session 24 documentation consistency addendum (2026-11-18)

The latest intake evidence is dataset-free and remains `NOT_READY`: the
`CANDIDATE_ONLY` source probe has no OHLC rows, selection lock or keyed outcome
labels. The Session 19 browser/runtime receipt still records an unavailable browser host, so Session 18 remains the visual baseline. No
`artifacts/session20-final-build.log` exists, and the absent receipt is not used
to claim a completed build. Receipt:
`artifacts/session24-documentation-consistency-audit.json`; regression:
`tests/session24-documentation-consistency-audit.test.mjs`. Preserve
`SHADOW_ONLY / NO_DECISION / live_apply_allowed=false` and the
`SOURCE_REVIEW_ONLY` / `UNAVAILABLE` / `WITHHELD` source boundary.

## Session 18 current evidence (2026-11-18)

Session 18 planned **11 independent child-agent tasks** in waves. Forecast gates now separate verified MT5 history from fresh closed-bar evidence, then check walk-forward coverage, effective causal support, independent analogue coverage, consensus margin and support metadata. A failed gate leaves descriptive distributions inspectable but withholds the directional landmark as `WAIT`; the explanation names the failed gate and preserves `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

Viewport work avoids a full retained-tape timestamp-map allocation for unchanged same-index quote refreshes while retaining exact UTC re-anchoring for retention shifts. Inclusive range slicing, duplicate ordering and timestamp-first symbol/timeframe persistence are covered by the four `microchart-viewport-*` tests. Focused refresh adds a unique probe nonce and promotes only through the latest proven closed boundary; a boundary-opening forming row is rejected by `tests/focused-m5-refresh.test.mjs`.

Current pattern chips expose exact concept/UTC identity and the explicit `SHADOW_ONLY; NO_DECISION; no order authority` label. At widths up to 430px, the focused evidence shelf keeps that authority line sticky and visible in a bounded 112px local scroll region while retaining chips and `Why / PDF` details (`tests/focused-mobile-pattern-stack.test.mjs`).

Session18 browser QA observed Exness REAL read-only XAUUSD M5 with current FALSE HIGH LOW and DOUBLE PRESSURE chips, Why/PDF anchors, `RESEARCH LANDMARK READY · UP` with all gates passing (walk-forward 80/12, support 47/8, analogues 41/4, margin 5.2%/5.0%, fresh verified MT5 history), plot sizes 287x200 at 320px, 364x215 at 390px and 1364.9x609 at 1440px, zero overflow and no runtime errors (`artifacts/session18-browser-runtime-qa.json`). The source-only audit receipt `artifacts/session18-source-only-concepts-audit.json` and regression `tests/session18-source-only-concepts-audit.test.mjs` reconfirm six concepts remain `SOURCE_REVIEW_ONLY`, `UNAVAILABLE` and `WITHHELD`. No detector, denominator, rate, OHLC fixture, fill, order, source qualification or authority change is claimed.
## Session 17 data-boundary checkpoint

The focused surface remains `SHADOW_ONLY / NO_DECISION /
live_apply_allowed=false`. Session 17 adds bounded read-only Auto-Attach (empty
settings, cancellation, three-attempt cap and explicit-detach pause), a closed-M5
health badge, and a cache-busting refresh probe. New data is promoted only
through the latest proven closed boundary; an unchanged tail retains the current
tape. Account/symbol/cache namespace, UTC/M5 identity, closed-bar provenance,
read-only and authority are revalidated around asynchronous work.

The bridge fails closed on unsupported frames, malformed or duplicate rows,
off-grid timestamps, invalid OHLC, invalid timezone and stale/unattested cache
entries; terminal restart or transport loss clears its namespace. Modifier
combinations remain native for chart controls, and the unreachable BeastDeck
wrapper was removed while shared research services remain. These transport,
lifecycle, presentation and cleanup changes add no source lens, detector
occurrence, denominator, rate, OHLC fixture, fill, order or outcome claim.
Targeted checks pass: `tests/mt5-auto-attach.test.mjs`,
`tests/focused-m5-refresh.test.mjs`, `tests/microchart-modifier-shortcuts.test.mjs`
and `tests/legacy-beast-deck-cleanup.test.mjs`. Full-unit/build baseline logs are
`artifacts/session17-baseline-unit.log` and `artifacts/session17-baseline-build.log`;
complete post-integration lanes remain the next verification step.

## Session 16 current evidence

The chart-first interaction increment adds saved-drawing selection and editing to
the focused XAUUSD M5 surface: Cursor selection, bracket-key cycling, body and
endpoint movement, Delete/Backspace removal, and Escape cancellation. Drawing
anchors remain closed-bar UTC identities and edits stay within bounded local
history. The focused home route keeps the command palette and legacy workspace
navigation suppressed, while diagnostic routes retain their palette. A scoped
black/white palette guard covers focused evidence chrome and leaves the explicit
teal/red candle colors intact. These are presentation and navigation contracts;
they do not qualify source concepts, add OHLC/outcome fixtures, change detector
counts or rates, or grant decision/order authority. Relevant checks are
`tests/microchart-drawing-selection.test.mjs`,
`tests/microchart-drawing-edit.test.mjs`,
`tests/microchart-accessibility.test.mjs`,
`tests/focused-command-palette-guard.test.mjs`, and
`tests/focused-m5-surface.test.mjs`.

## Session 15 current evidence

The final Chapter 9 review covers printed pp.373-382/PDF pp.383-392; coverage is **419/419**, Chapter 9 **138/138**, with 36 source lenses and 36 held-out provenance-only fixtures, 23 concepts and 30 relationships. Printed p.382/PDF p.392 was visually confirmed blank. The context-selection census is a descriptive local bucket study for receipt-backed setups; it recomputes causal context through confirmation, verifies current closed M5 H+1, keeps FLAT in the aligned denominator, and runs only after explicit inspector expansion in a cancelable worker. It does not change detector counts or establish source qualification, fills, probabilities or orders. Model, worker, retention, statistics and evidence checks are recorded in `tests/pattern-context-selection-census.test.mjs`, `tests/pattern-selection-census-worker.test.mjs`, `tests/pattern-context-selection-census-retention.test.mjs`, `tests/pattern-context-selection-statistics.test.mjs` and `tests/pattern-context-selection-evidence.test.mjs`. The orphan BeastArenaPanel wrapper was removed with shared Beast services preserved. 

## Session 14 current evidence

Session 14 assigns **12 independent child-agent tasks** in waves: causal replay/bookmark model, source review pp.363-372, legacy BeastLab audit, persistence, UI, accessibility, MT5 identity, statistics, source consistency, runtime/startup, browser and documentation. The source wave adds ten full-page reviews, printed pp.363-372/PDF pp.373-382, after verifying the attested source SHA-256. Coverage is now **409/419**, leaving **10** indexed chapter pages; Chapter 9 is **128/138**. The map has **35 source lenses** and **35 held-out provenance-only fixtures**, 23 concepts and 30 relationships. Receipt: `artifacts/chapter9-august-source-review-363-372.json`. The next review starts at printed **p.373/PDF p.383** and continues through p.382/PDF p.392; printed p.382 has no OCR and remains a visual-review gap. The August pages and fixture remain `SOURCE_REVIEW_ONLY`, `UNAVAILABLE`, and `WITHHELD`.

The selected-occurrence causal replay inspector now supports identity-only bookmark save, restore and delete. A bookmark carries canonical UTC/M5 occurrence, concept/read identity and replay prefix state only; it contains no future candles, prices, outcome, statistics, fills or orders. Restore requires the exact current retained closed occurrence and recomputes the causal evidence; malformed, expired, unavailable or mismatched records do not select a substitute. Persistence is scoped to the verified MT5 cache/account-plus-symbol identity or a separate local-snapshot scope when MT5 is unavailable. Replay hides unrevealed candles and retrospective statistics, retaining `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

Session14 receipts remain historical bounded checks. Session15 completes the indexed source interval at 419/419 and adds the causal context-selection census, worker lifecycle, UI and orphan cleanup. Current full unit/build/browser evidence should be regenerated after each integration change; no detector, denominator, rate, fill, order or authority change is claimed.

## Session 13 historical evidence

The source wave reviewed printed pp.353-362/PDF pp.363-372 after verifying the attested source SHA-256. Receipt: `artifacts/chapter9-late-july-source-review-353-362.json`. Coverage is **399/419**, leaving **20** indexed chapter pages; Chapter 9 is **118/138**. The map now has **34 source lenses** and **34 held-out provenance-only fixtures**, 23 concepts and 30 relationships. The next gap is printed **p.363/PDF p.373**, continuing through p.382, whose OCR is unavailable. These narrative pages remain `SOURCE_REVIEW_ONLY`, `UNAVAILABLE`, and `WITHHELD`.

Session 13 assigns **11 independent child-agent tasks** in waves: causal replay model, source review, legacy retirement, controls UI, accessibility, identity/retention, statistics, runtime/startup, browser, documentation and independent source consistency. The integrated causal replay model and controls reveal only a causal prefix and hide future/outcome statistics while active; the focused authority remains `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`. The public detector rejects off-grid historical M5 rows. The legacy Playbook route is retired with its alias resolving to focused home. Receipts: `artifacts/session13-pattern-causal-replay-controls-ui.json`, `artifacts/session13-replay-accessibility-audit.json`, `artifacts/session13-mt5-identity-retention-audit.json`, `artifacts/session13-statistics-audit.json`, `artifacts/session13-runtime-startup-audit.json`, and `artifacts/session13-legacy-playbook-retirement.json`. The bounded audit used known commit `4b54af7`, including pre-existing owned files; no reset was performed. Final full unit and cockpit typecheck pass in `artifacts/session13-final-unit.log`; production build passes in `artifacts/session13-final-build.log` with the existing large-chunk warning. Post-fix browser QA passes 53/53 checks across 320/390/1440px and Setup/Context/Outcome, with no horizontal overflow (`artifacts/session13-causal-reveal-browser-qa.json`, nine screenshots). Actual retained fallback has 141,178 closed M5 bars and MT5 Offline; occurrence75 reaches H+24, while occurrence76 stops at its real six-bar contiguous/session boundary. Exit and occurrence switches reset safely, Enter/Space controls work, and replay hides retrospective statistics. Legacy #playbook resolves home and the dedicated QA tab is closed. Independent source consistency verifies PDF SHA, 10 render/OCR hashes and exact 438-page index rebuild (`artifacts/session13-source-consistency-audit.json`).

## Ranked gaps

### Session 18 bounded source-only audit — no implementation justified

The bounded audit in `artifacts/session18-source-only-concepts-audit.json` and
`tests/session18-source-only-concepts-audit.test.mjs` rechecked the remaining
source-only concepts `trade_selection_failure`, `low_volatility`,
`obstacle_room`, `news_exit`, `resistance_exit`, and `reversal_exit`. Their
printed-page anchors, review cues and abstain language remain present in the
attested map. The linked lenses and held-out fixtures remain
`SOURCE_REVIEW_ONLY`, `UNAVAILABLE`, and `WITHHELD`; no PDF figure is treated as
XAUUSD OHLC, a fill, an order, a measured outcome or a source-qualified rate.

The audit specifically preserves selective barrier-reclaim and dominance review
for failure trades; provider/tick provenance and no synthetic faster-frame rule
for low-volatility notes; contextual-only obstacle/room measurements; and
event-identity, pre-entry rationale, matched-bracket and intrabar-path
abstentions for manual/news/reversal exits. The focused authority remains
`SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`. This is the historical
pre-translation boundary. Sessions 34-37 now expose bounded descriptive
observations for all ten concepts, while source labels, outcomes and execution
semantics remain withheld.

### P0 — inspector source-lens navigation implemented and integration-tested

`ChartPatternInspector.tsx` now exposes a collapsed **Reviewed source notes** section for selected PDF concepts. `ReviewedSourceNotes.tsx` loads `ChartPatternSourceNotes.tsx` and the validated full source map only on expansion, filtering `source_lenses` by `lens.concept_ids.includes(knowledge.id)`. The bounded keyboard-accessible region shows names, printed/PDF anchors, definitions, cues, abstain notes and explicit `SOURCE_NOTES` limits. Loading/error/retry states and Escape focus restoration preserve access. Named-candle inspections stay unchanged. This closes the navigation/evidence gap without promoting a source lens to a detector.

The implemented slice is integration-tested for concept-to-lens filtering, printed/PDF anchors, source-only authority and unchanged occurrence/evidence behavior. Its session7 unit/typecheck and build logs are historical receipts (`artifacts/session7-followup-integration.log`, `artifacts/session7-followup-build.log`). Session 8 added the observational timeline below; its logs (`artifacts/session8-final-unit.log`, `artifacts/session8-final-build.log`) are historical evidence. Session 9 adds event navigation and evidence hardening. Its production build passes in `artifacts/session9-final-build.log`, with the existing large-chunk warning; final full unit lane and cockpit typecheck pass in `artifacts/session9-final-unit.log`.

StrategyRanking's standalone component/route is retired; old hashes resolve to focused home while shared Card data, storage and receipt artifacts remain (`artifacts/session11-strategy-ranking-retirement.json`). Final full unit and cockpit typecheck pass in `artifacts/session11-final-unit.log`; production build passes in `artifacts/session11-final-build.log` with the existing >500 kB chunk warning. Independent runtime/selection checks pass 46/46 plus 7/7 startup checks (51 distinct checks, two repeated) without product edits (`artifacts/session11-level-selection-runtime-audit.json`); accessibility passes 19/19 with no fix justified (`artifacts/session11-level-accessibility-audit.json`).

Dedicated browser QA passes **9/9** width/mode combinations (320/390/1440px across setup/outcome/context) on actual retained local-fallback Pattern break **76/76**, **141,178 closed M5 bars**, **MT5 Offline**. It passes **63 legend select/clear pairs**, **63 rail select/clear pairs**, **14 native Enter/Space pairs** and **36 Arrow event checks**. Minimum plot width is **158px**, rail width **108px**, minimum label spacing **18px**; horizontal overflow and rail text overlap are zero and true-price-Y maximum error is **0**. Receipt: `artifacts/session11-level-selection-browser-qa.json`, with **11 PNGs**. Separate `artifacts/session11-level-selection-320-selected-tp.png` and `artifacts/session11-level-selection-320-selected-sp.png` show independent TP/SP meanings at the coincident **4,032.28** price. No issues were recorded. The retired alias #strategy-ranking resolves to #home with title QUANTSMART and no load error; the dedicated QA tab was closed.

This is useful immediately because it puts the reviewed qualification beside the exact occurrence while making no unsupported numerical or execution claim.

### P1 — observed setup timeline implemented; source entry execution remains unimplemented

The source's `signal_entry_bar` concept remains `SOURCE_NOTES`. The selected inspector now shows a separate local observational receipt for all four supported setup kinds: pattern break, pattern-break pullback, combi and pullback reversal. `patternSetupTimeline.ts` separates signal candle, first later strict directional OHLC break (or open beyond the level), actual M5 confirmation close at candle open plus five minutes, and outcome measurement origin at that close. Combi uses the last inside bar as its signal reference. `PatternSetupTimeline.tsx` labels candle-open identities separately from actual close instants and states that intrabar crossing time and executable fills are unknown.

The receipt withholds invalid or unverified evidence: canonical UTC/M5 identities and unique ordered retained past identities are required; the signal-to-confirmation path must be consecutive, closed and valid OHLC; the breakout level must equal the signal's directional edge; and confirmation must close strictly beyond that level. Future OHLC is not consulted. This adds no detector occurrence, outcome denominator, rate or fill. Browser QA on retained local-fallback data observed a 21:20 UTC signal, a first later break candle opening at 21:25 UTC and actual confirmation close/outcome origin at 21:30 UTC, with zero horizontal overflow at 320, 390 and 1440px widths. Runtime was MT5 Offline. A 150,000-row synthetic scale audit reduced local timeline validation from approximately 169-172ms to 11-13ms; these are bounded audit timings, not market evidence or a universal performance guarantee.

Session 9 adds four mini-chart event controls using an attested timeline and UTC `candleTime` mapping. Selecting signal, break observation, confirmation close or outcome origin highlights the corresponding candle, updates the OHLC/accessibility status and scrolls it into view across setup, outcome and wider-context modes. Close and origin deliberately map to the same confirmation candle, while showing the actual close instant separately. Invalid or mismatched receipts withhold navigation. Inspection-window validation additionally rejects impossible calendar dates, duplicate/off-grid anchors, forming/future evidence and invalid closed flags; study input is bounded to 96 causal plus 24 outcome bars with unavailable-identity sentinels and retained-index remapping. Selected UTC instants remap across prefix/backfill changes, retention shifts and supported seconds aliases; expired selections fall back to the anchor, clear the selected event and reanchor scrolling. Targeted selection/event/window checks pass 16/16 (7 behavior, 8 navigation and 1 window). Browser QA passes 36/36 event selections and 36/36 keyboard clears across all three modes at 320px, 390px and 1440px, with zero horizontal overflow, a stationary price axis, a clear event footer/tag lane and a visible 2px focus ring. It uses retained local-fallback pattern-break occurrence 76/76, confirmation candle open 21:25 UTC and actual close 21:30 UTC, with MT5 Offline. Receipt: `artifacts/session9-mini-event-browser-qa.json`, with nine screenshots. Final full unit/typecheck and production build pass in `artifacts/session9-final-unit.log` and `artifacts/session9-final-build.log`. These changes add no detector qualification, fill, occurrence, denominator or rate.

Session 10 implements the prior 320px crowded-text cleanup with a stationary 108px price rail. ATR entry/target/invalidation (AE/AT/AI), technical protection/obstacle (TP/TO), and setup break/protection (SB/SP) remain seven distinct roles with exact prices and an ATR / TECHNICAL / SETUP legend, including coincident levels. Labels stay within Y=14..178 at least 18px apart; only text is displaced, preserving actual price Y and candle/level geometry. Inline ATR text is removed. Out-of-range levels have an explicit asterisk and explanation without an off-plot leader. Rail, plot and captions consume the same evidence gates: unique closed canonical UTC/M5 signal identity, exact directional signal edge, and matching setup kind/direction/technical protection receipt. Stale or mismatched references remain withheld. Four existing candle-event controls and keyboard behavior are unchanged.

Final retained local-fallback pattern-break 76/76 browser QA passes 9/9 width/mode combinations at 320px/390px/1440px with seven labels, minimum 18px spacing, no text overlap/horizontal overflow, a stationary 108px rail, exact true-price-Y matching and a 158px plot at 320px (140px acceptance floor). All 36 event selections and 36 Arrow clears pass with 2px focus; 18 close/origin checks preserve 21:25 candle/21:30 actual close. Final post-update 320px context Enter/Arrow and both retired route aliases pass. Runtime is MT5 Offline. Receipt: `artifacts/session10-price-rail-browser-qa.json`, with ten PNGs. Independent runtime/startup audit passes 37/37 in `artifacts/session10-price-rail-runtime-audit.json`; its synthetic helper timings do not measure browser or market performance. Final production build, exact-state full unit lane and cockpit typecheck pass in `artifacts/session10-final-build.log` and `artifacts/session10-final-unit.log`. This improves the presentation and attestation of existing evidence; it creates no detector rule, fill, occurrence, denominator or rate.

Session 11 adds seven native rail/legend selectors identify ATR entry/target/invalidation (**AE/AT/AI**), technical protection/obstacle (**TP/TO**) and setup break/protection (**SB/SP**) by exact descriptor ID. Selecting or toggling a role updates live meaning/status and the matching line highlight; coincident prices remain distinct. Strict UTC/M5 alias normalization and omission of derived study/technical `exitIndex` preserve selection through retention/backfill reindexing. Semantic receipt changes clear selection on first render and do not resurrect it. Three identity tests and five selection tests pass and are registered. Existing stationary 108px rail, label spacing and true-price geometry are retained. StrategyRanking's standalone component/route is retired; old hashes resolve to focused home while shared Card data, storage and receipt artifacts remain (`artifacts/session11-strategy-ranking-retirement.json`). Final full unit and cockpit typecheck pass in `artifacts/session11-final-unit.log`; production build passes in `artifacts/session11-final-build.log` with the existing >500 kB chunk warning. Independent runtime/selection checks pass 46/46 plus 7/7 startup checks (51 distinct checks, two repeated) without product edits (`artifacts/session11-level-selection-runtime-audit.json`); accessibility passes 19/19 with no fix justified (`artifacts/session11-level-accessibility-audit.json`). Dedicated browser QA passes **9/9** width/mode combinations (320/390/1440px across setup/outcome/context) on actual retained local-fallback Pattern break **76/76**, **141,178 closed M5 bars**, **MT5 Offline**. It passes **63 legend select/clear pairs**, **63 rail select/clear pairs**, **14 native Enter/Space pairs** and **36 Arrow event checks**. Minimum plot width is **158px**, rail width **108px**, minimum label spacing **18px**; horizontal overflow and rail text overlap are zero and true-price-Y maximum error is **0**. Receipt: `artifacts/session11-level-selection-browser-qa.json`, with **11 PNGs**. Separate `artifacts/session11-level-selection-320-selected-tp.png` and `artifacts/session11-level-selection-320-selected-sp.png` show independent TP/SP meanings at the coincident **4,032.28** price. No issues were recorded. The retired alias #strategy-ranking resolves to #home with title QUANTSMART and no load error; the dedicated QA tab was closed.

Source-style entry execution, order path, costs and fills remain unimplemented. An observed OHLC break is not an executable trade. Do not copy the book's EUR/USD 20/10 pip bracket into XAUUSD or infer source-qualified win rates from this timeline.

### P1 — trade-for-failure selection has a descriptive descriptor but no source-qualified outcome study

The reviewed `trade_selection_failure` / `trade_for_failure_selection` and `chapter7_skip_failure_conditions` lenses describe selective counterbreaks after a failed attempt, requiring established dominance, buildup, room, and rejection of indiscriminate fading. The unified `detectAllPdfSignals` path now exposes a bounded descriptive descriptor when directional causal context is available. It does not measure the source's later counterbreak selection or distinguish a good failed setup from a poor initial break. A source-qualified study still needs a pre-entry timestamp, an independent label, and held-out walk-forward validation, so it remains shadow research.

### P1 — manual exit, news exit, and adverse reversal expose identities without outcome authority

`news_exit`, `resistance_exit`, `reversal_exit`, and `bracket_costs` remain `SOURCE_NOTES`, with bounded identity or quote-price assumption descriptors available through `detectAllPdfSignals`. `patternRoomContext` and `patternPullbackPressure` provide causal context, while `PatternBarrierEvidence` studies obstacles and ATR landmarks. Session 12 adds `PatternOutcomeComparison.tsx` and `patternOutcomeComparison.ts` to place the selected occurrence's raw adjacent closed-bar H+1 direction beside its already-computed local ATR target/invalidation path. Agreement with H+1 can coexist with invalidation first; opposing H+1 can coexist with target first. Same-candle double touches and unfinished paths remain unresolved, missing evidence remains unavailable, and context mode withholds both future observations. This comparison and the identity/assumption descriptors add no detector qualification, occurrence, denominator, rate, fill or order. Receipts: `artifacts/session12-feature-audit.json`, `artifacts/session12-a11y-audit.json`, `artifacts/session12-outcome-comparison-tests.log`. There is still no spread/slippage receipt, intrabar path, manual-exit decision timestamp or source execution model. Keep these lenses descriptive until independently labelled XAUUSD data and an explicit execution/exit model exist.

### P1 — wider trend/range and obstacle concepts are not detector qualifiers

`patternMarketContext` measures up to 96 consecutive closed bars, swing progression, EMA slope, efficiency, and a repeated range. `patternRoomContext` and the unified source-note path expose confirmed swing zones and a local XAUUSD round landmark for `obstacle_room`. `patternSetupSelection` buckets these receipts into review lenses. They intentionally do not alter the detector census, forecast gates, or outcome denominator. This faithfully preserves the authority boundary, but it leaves the source's “skip when wider dominance/range edge/room is adverse” ideas unimplemented as setup labels. The map records `obstacle_room` as a `SOURCE_NOTES` concept and `trend_range_selection` as a source-only review lens; no “qualified source setup” win rate may be inferred from current buckets.

### P2 — geometry proxies cover 13 concepts, while ten source concepts remain descriptive

The detector's `CONCEPTS` list contains 13 local geometry IDs: the ten original geometry proxies plus `pattern_break`, `pattern_break_pullback`, and `pattern_break_combi`. The map has 23 concepts. The remaining ten (`signal_entry_bar`, `bracket_costs`, `news_exit`, `resistance_exit`, `reversal_exit`, `trade_selection_failure`, `consecutive_review`, `position_sizing`, `low_volatility`, and `obstacle_room`) are handled by the unified `detectAllPdfSignals` observation path. Their descriptors remain source-review-only and cannot become source-qualified markers, rates, fills or orders without independently labelled XAUUSD data and a declared execution model.

### P2 — local thresholds are narrower than the source's qualitative method

Several detectors inspect short windows and local ATR-like medians (`detectDominantPressure`, `detectBuildup`, `detectFalseBreak`, `detectTeaseBreak`, `detectCeilingTest`). Setup modules use bounded bars, close confirmation, and local EMA estimates. The source discusses chart-wide pressure, session context, obstacles, costs, and discretionary selection. These rules are useful reproducible proxies, but their scores and hit rates describe repository definitions only. The inspector and knowledge panel state this in places; exports and any future comparisons should continue carrying the proxy version and exact definition.

### P2 — XAUUSD round-number geometry is a local landmark, not a source translation

The source's round-number discussion is anchored to EUR/USD 5-minute 00/50 (and low-volatility 20) levels. `patternRoomContext` intentionally uses a 50 quote-unit XAUUSD landmark; `detectRoundNumber` accepts a configurable increment. This is a useful XAUUSD context measurement, not a sourced 00/50 rule. It should remain labelled local and never be counted as a source-validated round-number setup.

### P3 — independent validation remains incomplete after indexed source coverage

Session 11 assigns **10 independent child-agent tasks**, run in waves within the three-child runtime limit: level-selection UI, source review pp.313-322, StrategyRanking retirement, identity hardening, source review pp.323-332, accessibility, browser, runtime, source consistency and documentation. This session adds **20** full-page reviews, printed pp.313-332/PDF pp.323-342. Coverage is **369/419**, leaving **50** indexed chapter pages; Chapter 9 is **88/138**. The map has **31 source lenses** and **31 held-out provenance-only fixtures**, 23 concepts and 30 relationships. Receipts: `artifacts/chapter9-late-may-source-review-313-322.json` and `artifacts/chapter9-june-source-review-323-332.json`. Next review starts at printed **p.333/PDF p.343**, through p.382, whose OCR is unavailable. Independent source consistency passes 20/20 actual render/OCR hashes, source PDF SHA-256, printed/PDF anchors and source-only states (`artifacts/session11-source-consistency-audit.json`). Those provenance-only fixtures remain `SOURCE_REVIEW_ONLY`, `UNAVAILABLE` and `WITHHELD`. Full strategy translation and independent XAUUSD OHLC/outcome labels remain unfinished.

Session 12 source review adds 20 full-page reviews, printed pp.333-352/PDF pp.343-362, with the separate source-only lenses `chapter9_july_context_and_exit_ambiguity` and `chapter9_mid_july_context_and_selectivity`. Coverage is now **389/419**, leaving **30** indexed chapter pages; Chapter 9 is **108/138**, with **33 source lenses** and **33 held-out provenance-only fixtures**, 23 concepts and 30 relationships. Receipts: `artifacts/chapter9-july-source-review-333-342.json` and `artifacts/chapter9-mid-july-source-review-343-352.json`. Next review starts at printed **p.353/PDF p.363**, through p.382, whose OCR is unavailable. Targeted July/mid-July/map/coverage/comparison/accessibility checks pass, and the generated compact lookup is current. Final full unit/typecheck and production build pass in `artifacts/session12-final-unit.log` and `artifacts/session12-final-build.log` (existing >500 kB chunk warning). Source consistency passes attested PDF SHA-256, 10 render/OCR hashes and all 438 page records (`artifacts/session12-source-consistency-audit.json`). Dedicated browser QA passes 9/9 width/mode combinations and 36 event checks with zero overflow/overlap and no issues (`artifacts/session12-outcome-comparison-browser-qa.json`); retained local-fallback runtime is MT5 Offline. Legacy `#analysis` resolves to focused home while shared data remains; receipt `artifacts/session12-legacy-retirement.json`. Broker alias keys are captured and revalidated after async work, preserving cache identity without changing statistical scope. The source reviews remain `SOURCE_REVIEW_ONLY`, `UNAVAILABLE`, `WITHHELD`; they establish no XAUUSD OHLC, detector behavior, fills or measured outcomes.

## Implemented inspector slice and remaining boundary

The P0 slice links the selected inspector to reviewed source lenses with these acceptance requirements:

1. Reuse the attested map types (`SourceLens`) and existing full-map validation; do not duplicate lens text in detector code.
2. Resolve only lenses linked by the selected concept ID and keep the section collapsed by default.
3. Show each lens's printed/PDF anchors, definition, review cues, and abstain/limits cues.
4. Display `SOURCE_NOTES · no source-qualified detector or measured outcome statistics` on every lens block.
5. Preserve the existing occurrence/evidence values and `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false` authority.
6. Add a regression proving an inspector for a geometry proxy can show linked source notes without changing `PriceActionConceptEvidence`, markers, or occurrence navigation.

The session 8 timeline, session 9 event navigation, session 10 rail, session 11 level selection, session 12 outcome comparison, session 13 causal replay, session 14 identity-only replay bookmark and Sessions 34-37 all-signal translation extend the inspector with local event identity, candle inspection, attested level references, source-note descriptors and exact retained-prefix restoration. Source-qualified entry fills, manual exits, news timing, trade-for-failure qualification, low-volatility adaptation and a new win-rate denominator remain outside these implemented slices. They require independently labelled market data and a predeclared causal study protocol.

## Evidence checked

- Detector concepts and local assessment/evidence path: `mfe_ux_lab/cockpit/src/lib/priceActionDetector.ts`.
- Setup identity and separate signal/confirmation timestamps: `mfe_ux_lab/cockpit/src/lib/priceActionSetup.ts`, `patternBreak.ts`, `patternBreakPullback.ts`, `patternBreakCombi.ts`, `pullbackReversal.ts`; strict observational event receipt: `patternSetupTimeline.ts` and `tests/pattern-setup-timeline.test.mjs`.
- Causal wider context and review buckets: `patternMarketContext.ts`, `patternRoomContext.ts`, `patternPullbackPressure.ts`, `patternSetupSelection.ts`.
- Selected occurrence UI and explicit outcome limitation: `mfe_ux_lab/cockpit/src/components/ChartPatternInspector.tsx`, `PatternSetupTimeline.tsx`, `PatternInspectionChart.tsx`, `PatternOutcomeComparison.tsx`, `patternOutcomeComparison.ts`, `patternSetupEventNavigation.ts`, `patternInspectionWindow.ts` and their comparison/timeline/navigation/window regressions.
- Full source-lens display lives in the lazy book index and expanded inspector notes: `mfe_ux_lab/cockpit/src/components/PriceActionBookIndex.tsx`, `ReviewedSourceNotes.tsx`, and `ChartPatternSourceNotes.tsx`.
- Source concepts, implementation status, anchors, and held-out fixture statuses: `docs/price_action_knowledge_map.json`, `docs/PRICE_ACTION_KNOWLEDGE_MAP.md`.

This document is an implementation audit and status record. It does not add detector rules, alter statistics, create OHLC fixtures, or change authority.




## Session 48 all-23 census update (2026-11-19)

The historical-statistics gap is closed at the bounded observation layer. A
worker-backed census now evaluates all 23 concepts on retained closed XAUUSD M5
rows and reports per-concept state counts, evaluated rows, observed rows and
local geometry H+1 direction buckets. Ten `SOURCE_REVIEW_ONLY` concepts remain
descriptive only. Their numeric rates, directional claims and source outcomes
stay withheld because the PDF does not provide independent XAUUSD labels or an
execution model. The remaining gap is source-qualified validation, not chart
coverage or local descriptive census coverage.

## Session 49 UI gap update (2026-11-20)

The focused chart-only and context surfaces now expose the requested current-model explanation, bounded historical examples and orientation-aware named-candle rate. This closes the presentation gap for the focused panel. The rate is descriptive evidence from retained local/causal rows and is not a source-qualified trading win rate. Neutral patterns remain distribution-only.

The remaining gaps are independent XAUUSD holdout validation, source-qualified outcomes for the ten source-note concepts, and a separately declared execution model. The large production chunks and the lack of a live replay marker in the current browser fixture remain follow-up performance and interaction checks.
