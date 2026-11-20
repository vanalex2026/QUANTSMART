# Price-action knowledge map

This is a compact, machine-oriented study map derived from **Bob Volman,
_Understanding Price Action: Practical Analysis of the 5-Minute Time Frame_
(2014)**. It is a research aid, not a trading signal, investment advice, or a
claim that the source method is profitable. The supplied PDF is not stored in
this repository. The map records its local source path, hash, and page anchors
so a future session can verify provenance before using the notes.

Source: `C:\Users\nngov\Downloads\kupdf.net_understanding-price-actionpdf.pdf`  
SHA-256: `A566B445A611D8EDA9365BEB77A24F2E86E46FB0A0F55A048BB3C3153F37C6C8`  
Extraction: 438 PDF pages; 425 pages contained OCR text. The PDF's printed page
numbers are used below where they differ from the PDF index.

## Core model

Session 15 completes full-page review of printed pp.373-382 / PDF pp.383-392
after verifying the attested SHA-256. The source-only
`chapter9_final_august_context_and_selectivity` lens retains Figures 9.124-9.132:
round-number and range conflicts, buildup and ceiling tests, conditional exits,
combi selectivity, stale-session restraint and supertrend/news caution. Coverage
is **419/419** indexed chapter pages; Chapter 9 is **138/138**, with **36 source
lenses** and **36 provenance-only held-out fixtures**. Receipt:
`artifacts/chapter9-final-august-source-review-373-382.json`. Printed p.382/PDF
p.392 was directly visually confirmed blank, with no OCR or concept anchor.
These narrative examples remain `SOURCE_REVIEW_ONLY / UNAVAILABLE / WITHHELD`;
they establish no XAUUSD OHLC, detector accuracy, execution or measured outcome.
Complete indexed chapter-page review does not complete faithful detector
translation or independent market-data/outcome validation.

The source treats a chart as a contest between pressure, defense, and the
participants who join or abandon a move. A continuation is more plausible when
the break is aligned with the current dominant pressure, preceded by a compact
fight at the level (`buildup` / `pre-breakout tension`), and has room to travel
before an obstacle or adverse magnet. These are qualitative hypotheses to
measure on completed OHLC data; they are not executable definitions by
themselves.

| Concept | Operational reading for a study journal | Common trap / abstain cue | Source |
|---|---|---|---|
| Double pressure | A move recruits traders in its direction while traders on the other side exit or are forced to cover; look for follow-through after a defended level gives way. | A break alone is not evidence of double pressure. | pp. 6–8 |
| Dominant pressure | Relative sequence of highs/lows, slope, and inability of corrections to cross significant prior swings; trade with it or wait for a neutral base. | Do not infer a reversal from the first counter swing against a strong move. | pp. 9–11 |
| Support / resistance | Prior reaction levels are information; a broken level may reverse role when retested. | Blindly fade old highs/lows or chase a fresh high/low. | pp. 8–10 |
| Buildup / tension | Several alternating bars push and bounce in a tight vertical span at the boundary; the last signal bar and the last distinctive buildup high/low should define technically defensible protection for the break. | No buildup (false-break trap), buildup away from the actual boundary (tease-break risk), or a protection level that requires an unusually wide stop. | pp. 7–8, 13–16 |
| False break | A poorly prepared pattern break is quickly reversed/undone; outcome labels should be assigned from setup conditions, not hindsight. | Treating every failed good break as proof the setup was bad. | pp. 11–16 |
| Tease break | A slightly premature break may attract entries, retreat inside the range, test an internal ceiling/floor, and later re-break. | Tight stops can be hit before the second attempt; decline the first break unless the follow-up sets up. | pp. 13–16, 26–29 |
| False high / low | A single-bar break fails and the opposite bar breaks back; at a key level this can demoralize one side and support a later setup. | The event is a clue, not an entry; wait for a subsequent buildup. | pp. 16–20 |
| Pullback reversal | A correction reaches a technical level (often a 40–60% retracement or former S/R), stalls, builds tension, then breaks back with the dominant side. | Buying/selling directly into a retracement or test without evidence of stalling. | pp. 20–25 |
| Ceiling test / magnet | The last internal floor/ceiling of an arch or range can attract a pullback and become a bounce/re-break platform. | Entering at the obvious outer boundary while the nearer internal magnet remains untested. | pp. 25–30 |
| Round number | 00/50 levels on the reference EUR/USD 5-minute chart are recurring magnets and battle zones; lower-volatility sessions may emphasize 20 levels. | Assuming a round number must reject or break; assess the fight first. | pp. 30–32 |

## Setup grammar

Use this sequence for a journal or replay label. `context`, `boundary`,
`buildup`, `signal_bar`, `entry_bar`, `stop_basis`, `target_basis`, and
`outcome` should be recorded separately so hindsight cannot silently fill in
missing evidence.

1. **Context:** instrument, timeframe, session, data source, spread/cost,
   current pressure, range/trend state, nearby obstacles and magnets.
2. **Boundary:** one line or box around the level currently under attack.
3. **Buildup:** alternating bars in a tight span at that boundary; note touches,
   false highs/lows, and which side appears to be losing ground.
4. **Signal bar:** the final bar whose break would invalidate the local defense;
   mark direction and the technical level that protects the idea.
5. **Entry bar:** enter only when the signal bar is actually broken, subject to
   the study's slippage and order model.
6. **Protection and objective:** define the invalidation level and target before
   entry; record whether the target is blocked by S/R or an adverse magnet.
7. **Outcome:** record MFE/MAE, exit reason, and whether the setup label matched
   the pre-entry evidence. Never relabel from the outcome alone.

### Four setup families in the source

The machine-readable `setup_families` entries retain the ordered journal steps
and now also list `concept_ids`. These IDs point to the source concepts that
the family names directly (for example, a pullback reversal links dominant
pressure, support/resistance, buildup, and pullback reversal). The focused
panel exposes those links as read-only concept lenses; they are explanatory
cross-references and do not create a signal or order path.

- **Pattern break:** a boundary is attacked, defended, compressed into a
  buildup, then a signal bar breaks in the direction of pressure.
- **Pattern-break pullback:** after a break, a pullback tests the broken level
  (role reversal) and resumes; the retest supplies a new, tighter setup.
- **Pattern-break combi:** a directional powerbar followed by an inside bar
  (sometimes a second inside bar), read in breakout context. Source pp. 108-110
  explain the signal-bar break; the two-bar shape alone does not justify entry.
- **Pullback reversal:** a corrective swing reaches support/resistance, stalls in
  a small buildup, and breaks against the correction back toward the dominant
  move.

## Concept relationships

The machine-readable map also includes a small, source-anchored relationship
network. Each `relationships` entry names a directed `from` and `to` concept,
gives a qualitative `kind` and reader-facing `label`, and carries the printed
page anchors that support the connection. The panel exposes these edges as
read-only related-concept links; following a link changes the explanation in
the panel and never creates an order or decision path.

## Risk and management notes

The book's reference example is EUR/USD on a 5-minute chart with a 20-pip
target and 10-pip stop (nominal 1:2 reward/risk), but these are historical
example settings, not repository defaults. Costs, volatility, instrument,
broker execution, and session must be measured before any parameter is reused.
Manual exits discussed by the source include news, resistance, and reversal
exits. A failed setup, missing buildup, or unacceptably wide technical stop is
an explicit `ABSTAIN` candidate. Position size and compounding are separate
management decisions; they do not improve the edge of an unvalidated setup.

## Research translation for this repository

The map is compatible with the project's shadow research boundary:

- Treat each concept as a **descriptive feature or label** over completed OHLC
  bars, never as an automatic order instruction.
- Freeze the exact definition and source window before testing. Keep a separate
  chronological holdout or walk-forward period; log rejected variants.
- Preserve source provenance, timezone, gaps, costs, and ambiguous intrabar
  paths. Do not infer ticks, order book, or multi-timeframe evidence from an
  OHLC-only series.
- Store `ABSTAIN` when context, buildup, or room-to-target is absent. A valid
  JSON/module import is not evidence of statistical validity.
- Compare outcome-blind labels with the eventual outcome; report sample size,
  expectancy uncertainty, and selection bias. The source's charts are examples,
  not an independent labeled dataset.

The machine-readable companion is
[`price_action_knowledge_map.json`](price_action_knowledge_map.json). To
re-extract page text from an available copy of the PDF, run:

```powershell
python scripts/extract_price_action_pdf.py --pdf C:\path\to\book.pdf --output artifacts\price_action_pages_audit.json
```

Focused research snapshots carry the map schema and source SHA-256 as a
knowledge-map attestation. Snapshot import rejects a supplied attestation when
it does not match this indexed JSON map, so a durable session cannot silently
combine concept notes from a different PDF revision.


## Book navigation and review coverage

The map now indexes all 12 chapter boundaries and 23 curated concepts. Indexed
chapter-page review is complete at **419/419**; the notes remain partial curation,
not a transcription or implementation of all 438 PDF pages. In the current copy,
chapter ranges map printed Arabic pages to PDF
pages with a +10 offset; tooling derives this from each attested chapter range
rather than assuming a universal offset for every source copy.
The exact reviewed pages per chapter are recorded in `book_index` in the JSON;
chapter ranges are navigation references, not reviewed-page claims.

| Chapter | Printed pages | PDF pages | Review focus |
|---|---|---|---|
| 1. A Time to Trade and a Time to Study | 3-4 | 13-14 | Preparation and personal study precede methodology adoption. Build a database of context and recurring price behaviour; no shortcut establishes an edge. |
| 2. Price Action Principles - Theory | 5-32 | 15-42 | Pressure, defended boundaries, tension, false/tease breaks, pullbacks and magnets form the core vocabulary. |
| 3. Price Action Principles - Practice | 33-66 | 43-76 | Worked chart examples apply the theory in combinations. The chapter opening warns that historical preparation does not reproduce live experience; individual figures remain unindexed. |
| 4. Orders, Target and Stop | 67-72 | 77-82 | Illustrative EURUSD bracket and order mechanics, slippage, cost models and periodic reassessment of distances. Blank divider may occur at the chapter end. |
| 5. Trade Setups | 73-142 | 83-152 | Four named setup families: pattern break, pattern break pullback, pattern break combi and pullback reversal. The combi is the powerbar/inside-bar variant. |
| 6. Manual Exits | 143-176 | 153-186 | News, preplanned resistance objectives and adverse reversal development are distinct reasons for intervention; discretionary exits require comparison with the unaltered bracket. |
| 7. Skipping Trades and Trading Breaks for Failure | 177-210 | 187-220 | Context can invalidate an otherwise tidy setup. A counterbreak of a failed counter-dominance attempt differs from indiscriminately fading breaks. |
| 8. Recap Part 1 | 211-244 | 221-254 | Recap asks the reader to assess the whole pressure/conditions/setup picture. The remaining paired chart examples have not been individually catalogued. |
| 9. Consecutive Intraday Charts | 245-382 | 255-392 | March-August 2012 session corpus and its annotation vocabulary. Calendar-month ranges are indexed below; individual chart outcomes remain untranscribed. |
| 10. Trade Size - Compounding | 383-390 | 393-400 | Account arithmetic and unit changes are separated from technical selection. Example growth paths do not forecast returns. |
| 11. Adapting to Low Volatility | 391-420 | 401-430 | Adaptation discusses strategic selectivity, objectives, multiple markets and genuine tick frames. The current product scope stays one XAUUSD M5 chart. |
| 12. Final Words | 421-421 | 431-431 | The closing page returns to study and establishing an edge before committing capital. |

The six consecutive case-study month ranges (March-August 2012) and 13 annotation
terms from printed p. 247 are also persisted. Four March 2012 candidate pages
(printed pp. 250-253 / PDF pp. 260-263) now have curated source notes. The OCR
labels identify a ceiling-test resistance exit, a selective “short for failure”
example beside a choppy round-number skirmish, a false high in a signal bar, and
sideways action that defies a 00-level magnet. These observations remain session
context only: they do not establish fills, timing rules, trade counts, outcomes,
or a detector. The source's daily chart examples are not an exact OHLC/outcome
dataset for XAUUSD. Individual figures and entry/exit labels remain to be
transcribed and checked before they can become test fixtures.

Each concept records an explicit implementation scope:

- `GEOMETRY_PROXY`: thirteen local deterministic OHLC approximations, including
  the original ten concepts, regular pattern break, its post-break pullback and close-confirmed combi.
  Detector statistics concern these definitions, not the complete source method.
- `SOURCE_NOTES`: ten additional lenses for signal/entry bars, bracket/cost
  examples, news/resistance/reversal exits, trade for failure,
  consecutive review, position sizing and low volatility. These have no detector
  or measured outcome attribution.

The map also carries source-only `source_lenses` entries. `trend_range_selection`
(printed pp. 130-131 / PDF pp. 140-141) links the
source's warning about local pullbacks that run into a wider range boundary or
competing structure to `dominant_pressure`, `pullback_reversal`, and
`obstacle_room`. This is a `SOURCE_NOTES` review lens: it records what must be
checked or withheld when wider context is unavailable, and deliberately adds no
numeric cutoff, detector occurrence, or performance denominator. The held-out
Figure 5.17 mention on printed p. 130 is covered by the local OCR index fixture;
the figure remains a source reference rather than a transcribed OHLC case.

The machine-readable `held_out_source_fixtures` registry preserves ten already
reviewed cases: the Figure 5.17 wider-context pages, the Figure 7.2 failure-selection
pages, the March consecutive-session notes, the Chapter 10 sizing cautions, the
Chapter 11 low-volatility box review, and five Chapter 2 principles reviews
(false-break participation, false-high/low follow-through, pullback-reversal
patience, tease/ceiling-test selection, and round-number magnets).
Each points to a `SOURCE_NOTES` lens and its printed-page subset. Validation requires
`SOURCE_REVIEW_ONLY`, `data_status=UNAVAILABLE`, and `outcome_status=WITHHELD`;
extra market-data or label fields are rejected. Source-index regressions resolve
each case to curated metadata in the committed page index. Figure identifiers
remain references, not assertions about the figure's precise location.

This registry holds these review cases outside the detector/outcome corpus. It
does not supply independent human OHLC labels, a chronological market holdout,
or a performance test. The source-index tests use synthetic OCR snippets to test
retrieval mechanics; they do not validate source interpretation. Transcribing
and checking independent OHLC examples remains unfinished.

The `march_session_context` lens (printed pp. 250-253 / PDF pp. 260-263) links
`ceiling_test`, `trade_selection_failure`, `round_number`, `false_high_low`, and
`consecutive_review`. It preserves the chapter 9 annotations as review cues and
explicitly withholds detector logic, execution, universal session filters,
fill assumptions, and statistics.

## Chapter 2: principles review and source-index provenance

Chapter 2's full printed pp. 5-32 interval has been visually reviewed in the
attested local source using existing OCR; no PDF re-extraction was performed.
Five source-only lenses cover the reviewed principles: `false_break_participation_context`
records the poorly built break and contrarian participation on p. 12;
`false_high_low_followthrough` records false-high/low pressure context and the
need for later buildup confirmation, while `pullback_reversal_patience`
records the theory chapter's conservative technical-test and stalling guidance;
`tease_ceiling_test_selection` records declining slightly premature breaks and
watching for a ceiling-test pullback before any later attack; `round_number_magnet_selection`
records favorable/adverse magnet context and low-volatility 20-level adaptation.
None of these lenses creates a detector, entry rule, target/stop, outcome label or
XAUUSD OHLC fixture. Their reviewed pages remain `SOURCE_REVIEW_ONLY` with
`data_status=UNAVAILABLE` and `outcome_status=WITHHELD`.

The review receipt is
`artifacts/chapter2-principles-source-review.json`; rendered evidence is under
`tmp/pdfs/ch2/` and `tmp/pdfs/coverage/` (reviewed page renders). The receipt
carries the source SHA-256, per-page OCR hashes,
printed/PDF anchors and lens IDs. `docs/price_action_page_index.json` remains
the provenance index with 438 page records, 425 OCR pages and 191 curated pages;
source-index retrieval validates those hashes and metadata before returning
local excerpts. Chapter 2 has all 28 interval pages reviewed; no printed Chapter 2 pages remain in this indexed interval.

The JSON map currently contains twelve source lenses and twelve held-out source
fixtures. These are provenance and review-scope records only; they remain
outside the detector and outcome corpus.


## Chapter 3: practice examples and buildup context

Printed pp. 34-39 / PDF pp. 44-49 were visually reviewed in the attested
local source using existing OCR. The new `chapter3_practice_buildup_break_context`
lens covers the chart setup, double-pressure, technical-test, box and nested
buildup discussion. It remains `SOURCE_NOTES`; the EUR/USD M5 figures are not
OHLC or outcome fixtures.

- pp. 34-35 establish the EUR/USD M5 reference, relative 25EMA pressure gauge,
  compact chart window and session-clock presentation.
- p. 36 distinguishes personal pattern-line interpretation from a bar break and
  introduces double-pressure context.
- p. 37 prefers technical testing plus settling/build-up over retracement alone;
  boxes and false lows help inspect pullback tension.
- pp. 38-39 show confluence across box, pullback line, EMA25 and round number,
  then emphasize extra tension and repeated false lows without guaranteeing
  follow-through.

## Chapter 12: final study discipline

Printed p. 421 / PDF p. 431 was reviewed with existing OCR. The
`final_study_edge_discipline` lens records the closing call for diligent chart
study and personal edge validation. It adds no performance claim, market data or
execution rule.

## Chapter 11: low-volatility box and pace adaptation

Printed pp. 395-420 / PDF pp. 405-430 were visually reviewed in the attested
local source and added to the `low_volatility_box_context` source-only lens. The
pages preserve a useful boundary for the focused product: the source keeps its
pressure and buildup principles, but changes the strategic review when
follow-through is brittle.

- Printed p. 395 / PDF p. 405: tick settings depend on the provider; a new
  market or pace should be studied with representative screenshots rather than
  assumed equivalent data.
- Printed p. 396 / PDF p. 406: the source discusses a 200-tick frame, 20-levels
  and EUR/USD-style bracket examples. These are contextual source examples, not
  XAUUSD M5 defaults.
- Printed p. 397 / PDF p. 407: a lengthy box progression and meaningful buildup
  are preferred over a quick continuation from little buildup; protection and
  room still require review.
- Printed p. 398 / PDF p. 408: thin lunch-hour continuation is more failure-prone;
  faster frames still require patience, trade selection and review of losing
  examples.
- Printed p. 399 / PDF p. 409: a lengthy box fight can offer a nearby favorable
  magnet, while an adverse round number can hurt a failed break; too little
  buildup makes the first break a tease and persistence warrants a technical
  recheck before a second attempt.
- Printed p. 400 / PDF p. 410: distinguish false, premature and later squeeze
  behavior; limited room to the 00-level and box width inform review without
  creating a universal pip target.
- Printed p. 401 / PDF p. 411: a round number through the box center acts as an
  adverse magnet in slow conditions; avoid hasty continuation until the level
  has firm footing and a debatable boundary has had more time.
- Printed p. 402 / PDF p. 412: a barrier/EMA25 squeeze can be a continuation
  context, yet a nearby adverse magnet remains a protection and reversal-exit
  concern; no executable exit rule is inferred.
- Printed p. 403 / PDF p. 413: the first break toward a fresh round-number
  barrier has limited appeal even with a farther favorable magnet; a later
  squeeze and false bull-side break change the source's review.
- Printed p. 404 / PDF p. 414: follow-through after that squeeze informs the
  target discussion; a separate lower-top squeeze has the round number
  immediately underfoot, making its response a key concern.
- Printed p. 405 / PDF p. 415: the session can stay quiet through an open; a
  flag break near overhead 20-level resistance differs from a later attempt
  after extra buildup and an unsuccessful counterattack.
- Printed p. 406 / PDF p. 416: stalling near resistance invites a cautious
  objective review. A separate AUD/USD M-pattern lacks visible bullish
  dominance for the proposed trade-for-failure interpretation.
- Printed p. 407 / PDF p. 417: failure to reach one round number can draw
  attention to the opposite magnet; first-touch bounce and late continuation
  near the 00-level/away from EMA25 demand caution.
- Printed p. 408 / PDF p. 418: 30-level opposition and a 20-level test frame
  resistance and reversal-exit discussion. Figure 11.10 begins here; its
  follow-up explanation continues on the next page.
- Printed p. 409 / PDF p. 419: Figure 11.10 continues with a sideways-cluster
  and W-pattern warning; Figure 11.11 shows that a favorable magnet does not
  rescue very thin 200-tick action.
- Printed p. 410 / PDF p. 420: a longer tug-of-war and triple top differ from
  the thin early flag break; a separate AUD/USD flag retains dominant-pressure,
  EMA25 and favorable-magnet checks.
- Printed p. 411 / PDF p. 421: a tease, ceiling-test pullback and later break
  are reviewed together; follow-through does not justify pushing far beyond
  a newly broken round number in tight conditions.
- Printed p. 412 / PDF p. 422: a Nasdaq 100 e-mini 200-tick example introduces
  futures session hours, variable activity and faster-frame context; its setup
  discussion continues on p. 413.
- Printed p. 413 / PDF p. 423: false and tease breaks are contrasted with later
  buildup supported by technical footing; mid-range placement and a possible
  ceiling test constrain the source target discussion.
- Printed p. 414 / PDF p. 424: a Dow mini 400-tick example shows how sparse
  after-hours bars can create an activity illusion; 00/50 levels and regular-close
  context remain source-specific.
- Printed p. 415 / PDF p. 425: an S&P 500 e-mini 2000-tick example skips a premature break near round-number resistance and a wide technical stop, then reviews later buildup and regular-close context.
- Printed p. 416 / PDF p. 426: false lows and fine buildup improve a later combi; point levels, tick settings and close times remain futures-specific, and cross-market correlation is context only.
- Printed p. 417 / PDF p. 427: a Nasdaq pullback-reversal review rejects a long into the prior close and round-number danger, then uses a mature bear flag, false high and EMA25 proximity for separate short context.
- Printed p. 418 / PDF p. 428: a Dow mini range and 50-level retracement show that overall pressure can change the quality of a technical break; the ceiling-test and adverse-magnet review continues.
- Printed p. 419 / PDF p. 429: a Nasdaq 100 e-mini 400-tick round-number fight favors patience; false-high resistance and later bearish flag buildup frame a separate short context.
- Printed p. 420 / PDF p. 430: even a well-set short can face an adverse round-number or flag-cluster magnet; cashing in at resistance remains discretionary source context.

The lens explicitly withholds synthesized ticks, provider-independent thresholds,
EUR/USD or AUD/USD pip transfers, universal 20-level, 6-7 pip, 8-10 pip, 10 pip
or 12/10 pip rules, session-open times, and any detector, outcome or execution
claim. The focused chart remains one XAUUSD M5 surface. The page index now
carries 121 curated pages overall (30 in Chapter 11);
the visual/OCR receipts are recorded in
`artifacts/chapter11-low-volatility-source-review.json`.

The app's setup-close 2.2/1 ATR study differs from the source's subsequent
signal-bar break and historical EURUSD 20/10-pip illustration. Resistance exits
require pre-entry room/obstacle assessment; reversal exits depend on the adverse
cluster and context. A news exit requires actual dated event information, which
OHLC cannot supply. Position-sizing examples cannot establish edge. Low-volatility
notes describe source adaptations, while this app's focused chart remains M5.

In the expanded knowledge panel, use the chapter selector, follow a source lens,
or open the chapter 9 glossary. Following a lens clears prior concept search so
the destination remains visible. Source-only lenses explicitly disclose their
scope; the census measures the thirteen implemented detector concepts.

## Persistent page index and local source retrieval

`price_action_page_index.json` records all 438 PDF pages, including 13 pages
without OCR. Each record carries printed/PDF page identity, chapter, OCR character
count and SHA-256, review status, directly anchored concept IDs, case month and
figure mentions. This is metadata, not copied book prose. `figure_mentions` means
that OCR mentions a figure: it can be a cross-reference to another page and does
not prove where that figure is drawn. Damaged OCR labels may be missed.

The local extraction at `artifacts/price_action_pages_audit.json` remains the
searchable text source. The CLI reads that existing file without reopening the
PDF or extracting all pages again. It verifies source identity, every page hash
and derived metadata before returning any excerpt. Examples from repo root:

```powershell
node scripts/price-action-source-index.mjs --query "powerbar inside bar" --chapter 5
node scripts/price-action-source-index.mjs --figure 5.10
node scripts/price-action-source-index.mjs --printed-page 108 --text
node scripts/price-action-source-index.mjs --pdf-page 119 --text
```

Search uses all query terms, case-insensitive normalized OCR text, in PDF order.
It is not semantic interpretation, and OCR can miss line-broken or damaged words.
Default output is at most ten short excerpts; `--limit` accepts 1-100. `--text`
returns the original OCR only for selected pages. `--chapter`, `--printed-page`,
`--pdf-page` and `--figure` combine as filters.

Printed anchors are derived from each attested chapter's `printed_range` and
`pdf_range`, including a span check; retrieval does not assume that every copy
uses one fixed PDF offset. Chapter and printed-page bounds are therefore taken
from the map that was validated alongside the extraction.

After intentionally revising reviewed coverage or recreating local extraction:

```powershell
node scripts/price-action-source-index.mjs --build
```

The script rejects a mismatched PDF hash, missing/reordered page, inconsistent
OCR count or stale page index. If the local extraction is absent, the committed
metadata and curated map remain usable; retrieve the authorized PDF and run the
existing extraction utility once with output `artifacts/price_action_pages_audit.json`
before using full-text search. The PDF and full OCR text remain local and are not
included in a source release. Do not silently promote OCR matches to reviewed
notes, labeled setups or outcome statistics.

Chart markers, inspector and source lenses use a shared formatter to show both
printed and PDF page numbers. Stored page anchors remain printed numbers for
snapshot compatibility; do not migrate them to PDF indexes. For example printed
pp. 8-10 corresponds to PDF pp. 18-20. Noncontiguous source anchors remain fully
listed through grouped ranges.

## Measured pattern-break combi: combi-close-confirmation/1

The source describes a powerbar + inside bar in breakout context (printed
108-110 / PDF118-120), optionally a second inside bar. Matching colors and equal
breaking extremes are preferences, not requirements. It also discusses reversed
and doji variants. The app now measures a narrower **GEOMETRY_PROXY**; the exact
numbers below are local research choices, not attributed book prescriptions.

1. Use six completed consecutive M5 context bars before the powerbar. Their
   median high-low range is the local baseline. All context/setup bars must have
   valid positive ranges; any missing transition (including session boundaries)
   withholds this setup.
2. Powerbar range is at least1.25 baseline; body at least60% of its range; close
   in the directional outer25%. Its close exceeds the prior six-bar high/low by
   more than0.05 baseline. Its open is no farther than0.5 baseline beyond that
   boundary. Context net close movement may oppose it by at most0.25 baseline.
3. One or two inside bars must be nested inside their immediate parent, at most
   70% of powerbar range, with midpoint in the directional55%/45% region of the
   powerbar. Red inside bars after green powerbars (and the inverse) are allowed.
   The second inside bar cannot already have broken the first directional edge.
4. The next closed candle opens on or behind the last inside-bar break reference
   and closes strictly beyond it. It must not also reach the opposite protective
   extreme of the inside-bar cluster. A wick-only break or both-side touch is
   excluded. The occurrence time is this **confirmation close**, not an inferred
   intrabar fill or early unbroken signal bar.

Measured receipts retain context/powerbar/inside/confirmation UTC identities,
context boundary, last-inside breakout level and cluster protection reference.
Both live-prefix and historical scans use the same bounded classifier. The
historical tape retains every evaluable match; future candles can alter outcomes
but cannot change a past label, its score or structural receipt.

The inspector mini chart marks P (powerbar), I1/I2 (inside bars), C (confirmation),
and draws amber break / blue technical-protection reference lines. These are
source-structure references; the separately labeled historical LONG/SHORT study
still enters at confirmation close with2.2/1 ATR levels and24-bar horizon.
Next-bar hit rate remains a close-to-close measurement. No spread, volume, costs,
news calendar, doji/reversed variants or executable fill path is inferred.

`pattern_break_combi` shares the current marker, complete history, census,
inspection, barrier study, snapshot/bookmark and main-chart navigation paths.
Census/export detector counts derive from the implemented registry (13), not a
hardcoded denominator. The broader source map still contains23 concepts; ten
remain source notes only. Source-only concepts never acquire statistics merely
because their explanation is indexed.


## Measured regular pattern break: pattern-break-close-confirmation/1

Printed73-77 / PDF83-87 distinguish dominant pressure, a repeatedly attacked
boundary, alternating buildup, a directional signal bar and a subsequent entry
bar. The following **GEOMETRY_PROXY** uses local numerical choices; it does not
implement every discretionary condition or claim source-prescribed thresholds.

1. Four consecutive completed M5 context bars establish the horizontal high/low
   boundary and a median-range baseline. Net context close movement must agree
   with the break by at least0.3 baseline.
2. Try six, five then four buildup bars, preferring the longest valid structure.
   The cluster spans at most1.2 baseline, stays no more than0.1 beyond the
   boundary and1.2 behind it, contains at least three wick touches within0.2
   baseline of the boundary and at least two adjacent non-doji color changes.
3. The last buildup bar is the directional signal bar. Its close is within0.2
   baseline of the boundary and its wick qualifies as a boundary touch.
4. The following confirmation opens on or behind the signal edge and closes
   more than0.05 baseline beyond both that edge and the context boundary.
   A confirmation that touches the opposite buildup protection is excluded.
   Missing M5 transitions, forming/invalid/zero-range bars and wick-only breaks
   are excluded. Each occurrence belongs to the confirmation close.

The receipt preserves context, all buildup bars, boundary touches, signal and
confirmation UTC identities, context boundary, signal-edge breakout level and
opposite buildup protection reference. Both directions use the same causal
classifier; later outcomes cannot alter the receipt or score. The mini chart
marks B1... (buildup), S (signal) and C (confirmation), with amber signal-edge
and blue protection reference lines. ATR outcome levels remain separate and
begin at confirmation close under the existing2.2/1 ATR,24-bar study policy.

This proxy covers only compact horizontal four-to-six-bar variants. It does not
assess wider dominance, sloping patterns, obstacle room, volume, spread, costs,
news or executable intrabar entries. It is distinct from a mere boundary
perforation and from the powerbar/inside-bar combi. The source map now contains
23 concepts (13 proxies and 10 source notes), 419 curated indexed chapter pages
across 12 chapters, six month ranges and 13 annotation terms. Indexed chapter-page
review is complete; source examples remain qualitative and untranscribed.


## Pattern break pullback: pattern-break-pullback-close-confirmation/1

Printed97,99-102,104 / PDF107,109-112,114 describe two post-break
situations: a fight clinging to a broken barrier, or an excursion followed by a
return to test that barrier. The original break can have been skipped; it need
not qualify as a regular pattern-break entry. A new signal at the barrier and
preferably EMA25 supplies the later break reference. The stronger a pullback,
the more buildup the source may require; obstacle and magnet context matters.

The local GEOMETRY_PROXY measures both HANGING and RETURN_TEST variants:

1. Exactly40 consecutive valid, positive-range, closed M5 bars are the bounded
   input. EMA25 at the signal is seeded with the first25 closes' SMA then
   updated through the signal (alpha2/26). It is explicitly a bounded estimate,
   not an infinite-history EMA or the white EMA10/34 lines on the main chart.
2. A six-bar horizontal high/low boundary has at least two wick touches within
   0.2 median range. Its net close movement may oppose the break by at most0.25
   baseline. Original break opens no farther than0.25 baseline outside the
   barrier and closes more than0.1 beyond it in its candle direction.
3. Try six to one post-break bars, longest valid structure first. Post-break
   closes stay within0.2 baseline of the original break side; adverse wicks may
   penetrate no farther than0.6 baseline. The final signal's testing extreme
   is within0.35 of the boundary, its range is at most1.5 baseline, and its
   directional/doji close lies in the outer45% on the continuation side.
   EMA25 must intersect its range expanded by0.25 baseline.
4. RETURN_TEST requires an earlier excursion of at least0.8 baseline beyond
   the barrier, followed by at least0.35 retracement to the signal extreme.
   HANGING has a smaller excursion, at least two post-break bars with an
   adjacent non-doji color change, and a cluster spanning at most1.3 baseline.
5. The next candle opens on/behind the signal edge and closes more than0.05
   baseline beyond both edge and old barrier. A simultaneous opposite
   protection touch excludes the setup. The occurrence time is that close.

Receipts preserve context, original break, post-break tests, signal,
confirmation and EMA seed UTCs plus boundary/EMA/break/protection prices.
Mini chart X/T/S/C labels, dashed old boundary and amber EMA-at-signal dot make
those distinctions visible. Its bounded setup window includes the full six-bar
pattern context (up to13 bars before confirmation), not all40 EMA seed bars;
EMA seed provenance is disclosed in the inspector. The existing full history,
next-bar and ATR barrier studies, snapshots/bookmarks and chart navigation apply.

These exact numbers are local research choices. Six-bar horizontal boundaries,
one-to-six-bar post-break variants and bounded EMA do not reproduce the full
source method, wider dominance, sloping patterns, strength-dependent buildup,
obstacle room, adverse magnets, costs or executable intrabar entries. ATR levels
remain2.2/1 ATR at confirmation close with24-bar observation. Pattern quality or
original-break skip/trade decisions are not inferred from subsequent outcomes.


## Obstacles and room: optional context receipt

Printed13,51,107 / PDF23,61,117 emphasize dominant pressure, range/trend
conditions, obstacle room, technical protection and adverse magnets. A neat
turnaround immediately below prior swing resistance may offer poor room; an
average is not support/resistance by itself; apparent room cannot establish a
trade. `obstacle_room` is a SOURCE_NOTES lens with optional context measurements,
not a fourteenth pattern detector and not a filtered performance claim.

`pattern-room-context/1` measures at most96 consecutive valid positive-range
closed M5 bars ending at the selected setup. Missing/invalid/forming transitions
truncate context, with fewer than24 bars withholding the measurement. Each
swing needs two left and two already available right candles. UP uses swing
highs; DOWN uses lows. Nearby pivots cluster within0.25 of the last14 bars'
median range, without chained clusters wider than that threshold. A close
beyond the far edge plus tolerance retires a zone; a later confirmed pivot may
establish a new one. Only zones overlapping or ahead of confirmation close are
retained, nearest first (up to three), with pivot UTCs and confirmation time.

Room is distance to the near edge, zero when already inside the zone. When the
setup supplies valid protection on the opposite side, technical-risk units use
confirmation close to that reference. They do not use the separate ATR outcome
study. Less than or equal to one technical-risk unit is disclosed explicitly;
more than one never becomes an acceptance signal. No zone found means only
that this bounded scan found none. The next strictly ahead50-quote-unit XAUUSD
round landmark is listed separately; it is a local reference, not a transferred
EURUSD pip rule or confirmed support/resistance. Slopes, older levels, broader
dominance, news and liquidity remain outside the calculation.

In the inspector, **Context** or **Inspect wider context** opens the wider mini
chart ending at setup close, with amber known swing zones and all retained
candles horizontally inspectable. Future outcome candles are excluded from
that mode. Setup and Outcome path retain their earlier behavior. Unverified
current geometry withholds context; historical fallback is labeled descriptive.
Exports include an informational `selected_setup_room_context` receipt; on
resume the UI recomputes from the current tape and never trusts saved levels as
qualification or chart authority. Pattern labels, all occurrences, census and
ATR policy remain unchanged. Source coverage is 23 concepts (13 geometry proxies,
10 source notes), 419 curated indexed chapter pages and 30 relationships.

## Pullback strength and turn buildup: optional pressure receipt

Printed100-102 / PDF110-112 distinguishes a gentle angular correction from a
blocky fight and an aggressive V-shaped response. Stronger corrections can
require more fighting at the turn. The inside-bar example on printed102
illustrates why extra tension can matter; it supplies no universal bar count
or numerical cutoff. These pages are source context, not labeled XAUUSD trades.

`pattern-pullback-pressure/1` recomputes the selected pattern-break-pullback
from its40-bar closed prefix. Missing, invalid, forming, gapped, unverified or
identity-mismatched evidence withholds the receipt. Saved numerical geometry
is never trusted. The same six pre-break bars define median-range baseline.
The local break leg starts at their opposite wick extreme and ends at the last
equal directional peak from the original break through the pre-signal bar.
Correction bars start strictly after that peak and end at the signal; the
confirmation and all future candles are excluded. Return depth uses their
deepest adverse wick, divided by the local leg. This is not a reconstruction
of the longer source-chart swing and must not be compared directly with the
source's50% /100% examples as if endpoints matched.

The receipt exposes opposing body count, longest opposing run, largest opposing
body / baseline, and opposing powerbars (range>=1.25 baseline, body>=60% of
range, close in adverse outer25%). Opposing close speed is adverse net movement
from peak close to signal close / correction bar count / baseline. Efficiency
is that adverse net close movement / sum of absolute close transitions, zero
when there is no adverse net movement. Wick depth is intentionally separate.

A terminal compact suffix ends at signal, spans at most1.3 baseline and requires
each adjacent pair to overlap by at least50% of its smaller range. It may be
empty, includes at most the detector's six post-break bars, and excludes the
confirmation. Inside bars and adjacent non-doji body-color changes within that
suffix are disclosed. The mini chart outlines this exact UTC span; the inspector
shows all measured values and their definitions. This descriptive receipt does
not supply strong/weak grades, entry qualification, filtered win-rates or new
detector occurrences. Original detector labels, census and ATR study are intact.

Exports include informational `selected_setup_pullback_pressure`; imports
recompute pressure from current candles. Source coverage remains 23 concepts
(13 proxies / 10 source notes), now 419 curated indexed chapter pages and 30
relationships.

## Pullback reversal: pullback-reversal-close-confirmation/2

Printed125-129 / PDF135-139 describes price corrections toward EMA25, proportion
with the latest dominant swing, prior technical tests, a signal and subsequent
break. Typical source guidance is50-60% correction, sometimes40% in a strong
trend; average correction bars should not exceed dominant bars. A turn can be
one bar or a longer fight, and a second M/W break can improve the structure.
The source presents guidelines in wider context, not numerical universal gates.

This replaces the earlier nine-bar retracement-only proxy under the existing
`pullback_reversal` ID. All occurrences and outcomes are recomputed; old counts
and saved shape-only receipts do not define version2 occurrences. The concept
retains principles20-25 and adds125-129. There are still13 detector concepts.

Local deterministic rules:

1. Use40 consecutive positive-range valid closed M5 bars. Seed EMA25 with SMA25
   of the first25 closes and update through the signal. EMA must be seeded at
   the leg start. Try2-8 correction bars (longest first), then5-8 dominant bars
   (longest first) within that prefix. One-bar-only and time corrections remain
   outside this proxy, though the source allows them in appropriate context.
2. Dominant net move>=2 median leg ranges; at least length-2 bodies align;
   at least ceil(0.6*(length-1)) high/low steps align; net close efficiency>=0.6.
   Last leg candle supplies its directional extreme. Origin is the opposite
   extreme among the first two bars and must be the opposite extreme of the
   entire leg. EMA must slope at least0.1 median range in the leg direction.
3. Correction must not exceed the leg's directional extreme. Deepest adverse
   wick retraces50-65% of origin-to-extreme;40-65% is allowed only for local
   strong legs (efficiency>=0.8 and aligned bodies>=ceil(0.8*length)). Correction
   average range<=dominant average, with adverse close movement before signal.
4. Signal tests EMA25 within0.2 baseline and is within0.35 of the correction
   extreme. Its range<=1.5 baseline, body aligns (doji allowed), close lies in
   the directional outer45%. Subsequent candle opens on/behind signal edge,
   closes>0.05 baseline beyond it and must not touch opposite correction
   protection in that same bar. Confirmation close timestamps the occurrence.
5. Disclose the longest1-3-bar terminal turn (span<=1.5 baseline; adjacent
   overlap>=40% of the smaller range). This is a description, not a separate
   acceptance rule. Optional prior dominant-leg wick proximity<=0.25 baseline
   is recorded with UTC/edge/distance; its significance is not established.

Receipts retain leg/correction/turn UTCs, origin/extreme, retracement, range ratio,
bounded EMA seed/prices and technical break/protection. Mini chart A/E/T/B/S/C
labels display the full bounded leg and correction. EMA-at-signal is amber;
optional prior wick reference is grey. Inspector explains every scope and the
version change. Wider dominance, line slope, first-correction priority, full
M/W second-break sequences, costs and executable intrabar entries are incomplete.
ATR outcomes remain2.2/1 ATR,24 bars from confirmation close, separately labeled.
Knowledge now has 23 concepts / 419 curated indexed chapter pages / 30 relationships,
with 13 proxies and 10 source notes. Figure5.16 was viewed, not transcribed into
OHLC fixtures.

## Full-history scan scheduling

The UI runs the unchanged exhaustive `detectM5PriceAction` in a module Web
Worker. All retained candles,13 concepts, source references, structural receipts
and chronological next-bar outcomes are preserved. No shorter history sample is
substituted. During loading/error no previous tape/symbol result is displayed.
Worker startup, message decoding and runtime failures expose unavailable
statistics and an explicit retry; there is no blocking synchronous fallback.
Unmount/tape/symbol/retry changes terminate the worker and invalidate queued
replies. Equal closed tapes reuse the result only after comparing every UTC,
OHLC and closed flag, so an interior archive correction triggers a new scan.
Current PDF markers are also pending until the complete scan returns; chart
navigation/drawings and the separately bounded candle atlas remain available.

## Pullback reversal version3: bounded second close break

Printed129 (PDF139) describes a first turnaround break, opposing pressure
returning, and a later second break: W in a bearish correction, M in a bullish
correction. Printed130-131 (PDF140-141, Figure5.17) explain trend versus range,
competing wider structure and continuation near the far boundary of a range.
The existing OCR was reused; source pages128-131 and Figure5.16 on printed126
were visually inspected. Pages130-131 now have curated notes, bringing coverage
to 23 concepts / 419 curated indexed chapter pages / 30 relationships. Figure
outcomes remain untranscribed.

Version3 preserves the dominant-leg/correction and final close-confirmation
rules above. It searches backward within that correction for the latest earlier
signal meeting the original directional/range/EMA/extreme tests, followed by a
separate next-bar close break without touching its prefix protection. At least
one distinct adverse-body candle after that first confirmation and before the
final signal must close behind the first edge and at least0.1 baseline ranges
back from the first confirmation close. The final signal must be within0.75
baseline ranges of the first adverse wick and cannot close more than0.1 baseline
ranges ahead of the first confirmation. This may supply the EMA/extreme test
through the first signal when the second signal itself no longer meets it.
The complete correction proportion/range and final protection tests still apply.

Receipts distinguish FIRST_CLOSE_BREAK / SECOND_CLOSE_BREAK; S1/C1/R identify
the earlier signal, first confirmation and deepest qualifying adverse return,
with S/C for the final signal/confirmation. First means no qualifying earlier
sequence was found within the bounded correction; second is a local close-only
proxy relative to the latest qualifying prior attempt, not a global attempt
count. These are not proof of double pressure, intrabar execution or a complete
M/W classifier. Both attempts may appear in history and are correlated. No
performance advantage of second attempts is claimed. Trend/range selection,
first-correction priority and wider competing structure remain source guidance,
not implemented filters.

Actual retained141658 bars (2024-11-04T16:10Z to2026-11-04T16:10Z) yield167
occurrences:97 LONG /70 SHORT;158 FIRST and9 SECOND (7 LONG /2 SHORT). All167
receipts exactly reproduce from their endpoint prefix. Next-bar hit counts
41/97 LONG and32/70 SHORT are distinct from the separate2.2/1 ATR24-bar study.
Prior version2 counts do not define version3 results; snapshots recompute them.


## Wider context measurements (local proxy)

`patternMarketContext.ts` measures up to96 consecutive closed M5 bars at a
selected setup close, with a minimum40. Two right-hand closed candles must exist
before a five-bar pivot is confirmed. The last two confirmed highs/lows expose
higher, lower, mixed or insufficient progression using0.25 median-range tolerance.
EMA25 is SMA25-seeded within that context; its12-bar change and net-close/path
efficiency describe pressure, rather than classify source dominance.

Repeated ranges require two confirmed touches per floor and ceiling cluster,
at least8 bars between repeated touches, four alternating visits, width at least
4 median ranges, span24 bars and all intervening closes contained within0.25
median range. Wider/sloping/older ranges remain outside the proxy. An UP setup
in the upper quarter, DOWN in the lower quarter, or setup opposing both confirmed
swing steps gets an explanatory context concern. Absence is unknown, never a
clear-path or trend label. These measurements do not filter the occurrence census
or alter ATR studies. Context charts show H1/H2/L1/L2 and an amber range outline
with a blue floor; all end at the setup close.

The source principles are printed9-11 and130-131, with two new graph edges
from dominant pressure and obstacle room to pullback reversal. Current coverage
is 23 concepts / 419 curated indexed chapter pages / 30 anchored relationships. Snapshot receipts
are informational; resumed evidence is recomputed from the current closed tape.

## Chapter 3 practice review: buildup, squeeze and technical tests

Rendered PDF pages 50-76 (printed pp. 40-66) were visually checked against the attested 438-page source, together with the earlier pp. 33-39 review. Chapter3 now has34/34 reviewed interval pages; p.66 is a visually confirmed blank divider and receives no concept anchors. The source-only `chapter3_practice_buildup_break_context` lens spans printed pp.36-65 and records:

- selective pressure, false breaks without buildup, boundary clusters, squeeze, W/M and flag variants;
- technical-test pullbacks, round magnets, false extremes, ceiling tests and available room;
- doji caution, flag/pole harmony, relative powerbars and slow sideways absorption;
- adverse M/W middle-break exit pressure versus a fresh countertrend entry;
- pattern-line/round-level squeeze even with a flat EMA, and a barrier initially placed before a false perforation unless later tests support adjustment;
- conservative rejection of broad two-bar buildup, technical-test triples versus weak doubles, and loose source two-doji variants versus the strict local inside-bar detector.

These EUR/USD M5 examples remain source notes, not XAUUSD OHLC or labelled outcomes. The review changes no detector thresholds, historical denominators, forecast gates or execution authority. Coverage is153/419 reviewed chapter pages,266 remaining. Next chronological backlog: Chapter4 printed72/PDF82 (no OCR, needs visual review), then Chapter5 printed78.

## Held-out chapter 7 failure-selection lens

A visual review of printed pages 180, 184, 185 and 186 (PDF pages 190, 194, 195 and 196) adds the source-only `trade_for_failure_selection` lens. Figure 7.1 contrasts reversal breaks into a trending 25EMA with continuation breaks away from the average. Figure 7.2 shows a mature reversal structure, failed continuation pressure and a later barrier reclaim; the notes emphasize that a first reversal attempt in a fresh dominant swing differs from a later, blockier structure.

The lens records barrier reclaim, dominant-pressure maturity, buildup, magnets and room as review cues. It explicitly withholds universal attempt counts, timing, profitability, intrabar fills and any automatic counterbreak. It links only to `trade_selection_failure`, remains `SOURCE_NOTES`, and therefore adds no detector occurrence or win-rate denominator. The persistent page index carries those four chapter 7 pages plus four curated March pages; source-index regression coverage includes held-out Figure 7.2 and March session queries.

## March consecutive-session curation

A source-only `march_session_context` lens now covers printed pages 250-253
(PDF pages 260-263). The local OCR labels a ceiling-test resistance exit,
“short for failure” beside a choppy round-number skirmish, a false high in the
signal bar, and sideways action despite a 00-level magnet. The lens links
`ceiling_test`, `trade_selection_failure`, `round_number`, `false_high_low`, and
`consecutive_review`; it preserves the annotations as review cues while
withholding detector logic, execution assumptions, timing filters, and outcome
statistics.

## Chapter 10: compounding projections and sizing checks

Visually reviewed printed pp. 387-390 / PDF pp. 397-400 in the attested local
438-page source. All four pages were previously uncurated. The new
`compounding_sizing_cautions` source-only lens links to `position_sizing`:

- Printed p. 387 / PDF p. 397: calculator arithmetic and a chosen risk percentage
  are illustrative inputs, not a return forecast or a universal risk preference.
- Printed p. 388 / PDF p. 398: equal monthly points can compound differently when
  weekly paths differ; smooth projections overlook uneven and losing weeks.
- Printed p. 389 / PDF p. 399: the EUR/USD unit example depends on account balance,
  risk, stop distance and account-currency conversion.
- Printed p. 390 / PDF p. 400: verify actual risk, quote decimals and broker
  order-ticket units rather than assuming a standard contract display.

The EUR/USD pip values, stop factors and risk percentages are not XAUUSD defaults.
Unavailable contract specifications, currency conversion or broker unit steps
withhold an executable-size claim. This curation adds no sizing calculator,
market observations, outcome labels, detector or order path. At the earlier Chapter 10 checkpoint the page index had 138 curated pages;
current coverage is recorded in the latest Chapter 3 checkpoint below. Concept
counts remain 13 geometry proxies and 10 source notes. The new review registry entry explicitly keeps data unavailable
and outcomes withheld. Local rendering evidence is retained under
`tmp/pdfs/coverage/printed_387.png` through `printed_390.png`; PDF hash and
438-page count match the existing map. Full OCR stays local.




## Latest review checkpoint: Chapter 5 pattern-break entry context

Chapter4 printed72/PDF82 was visually confirmed blank, completing6/6 interval
pages without adding a concept anchor. Chapter5 printed78-85/PDF88-95 were
reviewed in full-page renders, taking that chapter to30/70 and global coverage
to162/419 (257 remaining). The new `chapter5_pattern_break_entry_context`
SOURCE_NOTES lens and matching provenance-only fixture cover Figure5.1/5.2:

- track pressure around the average, failed round-magnet attempts and technical tests;
- distinguish signal bar, subsequent entry-bar break and actual non-front-running;
- evaluate squeeze, false extremes, aligned close, tail-only reversal caution and room;
- preserve the source's uncertainty about intrabar order from a printed still;
- separate source pip brackets/retracements/session clocks from XAUUSD defaults.

These notes change no detector or measured outcome. There are13 source lenses
and13 source-only fixtures, while concepts remain23 (13 proxies/10 notes).
Book navigation now shows compact reviewed page ranges and per-chapter counts,
with complete-review copy that does not imply implementation or outcome proof.
Next chronological review: printed86/PDF96. Earlier checkpoint counts are history.


## Latest checkpoint: Chapter 5 regular pattern breaks through96

Visually reviewed printed86-96/PDF96-106, including Figures5.3-5.5.
The existing `chapter5_pattern_break_entry_context` SOURCE_NOTES lens now spans
printed78-96. This review adds11 pages: Chapter5 is41/70 and total source review
is173/419, leaving246. The next chronological gap is98/PDF108;97 was reviewed earlier.

The notes connect EMA/swing context with shrinking arches, a final squeeze,
false extremes and round-level defense. Preparation depends on the pattern and
barrier: there is no fixed minimum buildup count, and a mature squeeze need
not wait for an extra bar. A tall signal or an entry far outside the barrier
can undermine technical protection. Moving away from a contested round magnet
requires different evidence from moving toward one. Sudden non-buildup turns,
small flags on large poles and later longer flags illustrate selection limits.
A false break against dominance does not automatically qualify a countertrade;
a large opposing powerbar at a market extreme can be poor signal material.
Matching two-bar extremes add source-described tension without proving a result.

No source price, pip distance, session clock, target narrative or claimed reaction
becomes XAUUSD OHLC, a detector threshold or an outcome label. There remain23
concepts (13 geometry proxies/10 notes),13 source lenses,13 provenance-only
fixtures and30 relationships. Source fixtures remain UNAVAILABLE/WITHHELD.


## Latest checkpoint: Chapter 5 combi context through124

Visually reviewed printed111-124/PDF121-134 in fourteen individual full-page
renders, including Figures5.12-5.15 and the surrounding text. The source hash
was verified before rendering; existing attested OCR was reused without
re-extraction. Chapter5 now has59/70 reviewed interval pages; global source
coverage is191/419, leaving228. The next gap is printed132/PDF142 through142,
including the OCR-empty printed142 divider which must be visually checked.

The new `chapter5_pattern_break_combi_context` SOURCE_NOTES lens retains:

- thin/fat buildup, EMA25 possession, technical support, obstacles and adverse
  magnets as separate review criteria; a recognized candlestick name or classic
  head-and-shoulders shape cannot establish a trade on its own;
- tiny opposite-color inside bodies, extra-bar tension, double-bar breaks,
  reversed and loose three-bar combis as contextual variants; strict local
  detector geometry is unchanged;
- round-number fickleness, repeated false/tease breaks, shallow unfinished
  pullbacks, incomplete technical tests and poor flag lines as skip evidence;
- missed-break recovery versus a fresh neutral re-evaluation, and an existing
  position's technical test versus a new counter-position entry;
- session-open, lunch-hour and news-spike observations as source descriptions,
  requiring separate dated evidence before any real event or activity claim.

No source pip distance, target narrative, outcome, fill, news cause or pole
projection becomes XAUUSD OHLC or a local detector threshold. The knowledge map
still has23 concepts (13 geometry proxies/10 notes) and30 relationships, with15
source lenses and15 provenance-only fixtures. The added fixture stays
SOURCE_REVIEW_ONLY / UNAVAILABLE / WITHHELD. Receipt:
`artifacts/chapter5-pattern-break-combi-source-review-111-124.json`.

## Latest checkpoint: Chapter 5 source review completed through142

Individually inspected printed132-142/PDF142-152 after verifying the attested
source SHA-256. Printed142/PDF152 is a blank divider: reviewed metadata is
retained, but it has no source-lens or concept anchor. All70 Chapter5 interval
pages now have review metadata. Global coverage is202/419, leaving217 chapter
pages; the next chronological source gap is printed146/PDF156 in Chapter6.

The new `chapter5_pullback_reversal_selection_context` SOURCE_NOTES lens and
`chapter-5-final-pullback-reversal-review` provenance fixture cover printed132-141:

- range-edge traps, extraordinary bars and hindsight/overtrading discipline;
- EMA25 lag and a selective first-flag exception without licensing later inferior
  entries or changing this product's fixed XAUUSD M5 scope;
- flag ripeness relative to pole strength rather than an absolute bar count;
- adverse magnets toward protection versus obstacles toward the objective;
- flat-EMA range context and why equal prices can imply different quality after
  pressure, buildup and barrier clearance change;
- an inside-range offer, tease/ceiling test and later post-break pullback all
  require their own signal, technical protection and current context;
- source management alternatives remain discretionary notes, not executable
  target/stop adjustments or a default multi-market workflow.

Receipt: `artifacts/chapter5-final-pullback-reversal-source-review-132-142.json`.
Renders: `tmp/pdfs/ch5-final/printed_132.png` through `printed_142.png`.
There are16 source lenses/fixtures,23 concepts (13 proxies/10 notes) and30
relationships. No detector threshold, causal outcome, forecast gate, OHLC data,
fill, profit statistic or order authority changed. Source fixtures remain
`UNAVAILABLE`/`WITHHELD`; complete Chapter5 review does not prove complete method
implementation.

## Latest checkpoint: Chapter 6 manual-exit review printed146-150

Visually reviewed printed pp.146-150 / PDF pp.156-160 after verifying the
attested source SHA-256. The new `chapter6_manual_exit_context` SOURCE_NOTES lens
and `chapter-6-manual-exit-review-146-150` fixture preserve the distinction
between news-spike slippage and spread risk, preplanned resistance exits,
trend/range checks, technical levels, full-target checks and comparison with an
untouched bracket. EUR/USD pip examples, release/session clocks and Figure6.1
remain source context only; market data and outcomes are `UNAVAILABLE` /
`WITHHELD`.

Chapter 6 now has10/34 reviewed pages (new pages146,147,150; 148-149 were
already curated). Global coverage is205/419, leaving214 indexed chapter pages.
The next chronological gap is printed151/PDF161. Receipt:
`artifacts/chapter6-manual-exit-source-review-146-150.json`. Rendered pages are
under `tmp/pdfs/ch6-manual-exits-146-150`.

## Latest checkpoint: Chapter 9 introduction gap and March charts through 262

Verified the attested source SHA-256 and visually inspected ten full-page
renders: printed p.249 / PDF p.259 and printed pp.254-262 / PDF pp.264-272.
The new `chapter9_march_context_and_selection` source lens and matching
provenance-only fixture retain the introduction's explicitly hypothetical
compounding conditions and Figures 9.5-9.13 (March 7-19, 2012 EUR/USD).
Visual review recovers annotations absent from OCR, including equally valid
entries, a bar explicitly excluded as a signal, conditional test/trigger order,
and an entry described as weak despite its attractive later outcome.

Contextual skips, adverse magnets, ambiguous reversal blocks/flags and manual
exits remain source notes. Source growth arithmetic supplies no measured return
or risk recommendation; source clocks and EUR/USD levels do not establish
XAUUSD schedules or thresholds. No detector rule, OHLC, fill, stop/target event
or win rate was inferred. The fixture remains
`SOURCE_REVIEW_ONLY / UNAVAILABLE / WITHHELD`, preserving
`SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

Global reviewed coverage is **299/419**, leaving **120** indexed chapter pages;
Chapter 9 is **18/138**. There are **24** source lenses and **24** matching
provenance fixtures, with 23 concepts and 30 relationships. The next source gap
is printed **263 / PDF 273**; printed 382 remains an OCR gap requiring visual
review. Receipt: `artifacts/chapter9-march-source-review-249-254-262.json`.
Renders are under `tmp/pdfs/ch9-249-262`.

## Latest checkpoint: Chapter 9 late March and April opening through 272

Verified the attested source SHA-256 and visually inspected ten full-page
renders, printed pp.263-272 / PDF pp.273-282. The new
`chapter9_late_march_risk_and_room` source lens and matching provenance fixture
retain Figures 9.14-9.23: adverse magnets, weak/tall signals, pullback strength,
unresolved round-level fights, room limits and exits for existing positions.
Printed p.272 is dated April 2, 2012 despite the March running header.

The p.270 entry-bar shakeout remains conditional on unobserved intrabar order;
the p.271 possible scalp versus 20-pip wager remains a source-specific room
comparison. Neither establishes a fill, stop, measured profit or XAUUSD rule.
Visual labels missing from OCR were checked directly, without reconstructing
OHLC or labeling subsequent outcomes. Fixtures remain
`SOURCE_REVIEW_ONLY / UNAVAILABLE / WITHHELD`; authority remains
`SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

Global reviewed coverage is **309/419**, leaving **110** indexed chapter pages;
Chapter 9 is **28/138**. There are **25** source lenses and matching provenance
fixtures, with 23 concepts and 30 relationships. The next source gap is printed
**273 / PDF 283**; printed382 remains an OCR gap requiring visual review.
Receipt: `artifacts/chapter9-late-march-source-review-263-272.json`.
Renders are under `tmp/pdfs/ch9-263-272`.


## Latest checkpoint: Chapter 9 April through 282

Verified the attested source SHA-256 and visually inspected ten full-page
renders, printed pp.273-282 / PDF pp.283-292. The new
`chapter9_april_context_and_conditional_management` source lens and matching
provenance fixture preserve Figures 9.24-9.33 as EUR/USD narrative annotations.
Visual review includes the premature W/combi long on p.273, dated ECB context
on p.274, the news-driven chart flip on p.276, conditional break-even exit on
p.277, countertrend/reversal-exit tactics on p.278, higher-bottom versus
range-high/lunch cautions on p.280, overhead resistance and shakeout on p.281,
and optional resistance-bounce management after a stronger breakout on p.282.

No chart pixels became XAUUSD OHLC, fills, outcome labels, win rates or detector
rules. News participation and conditional existing-position management remain
source reasoning. The focused chart retains
`SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

Global reviewed coverage is **319/419**, leaving **100** indexed chapter pages;
Chapter 9 is **38/138**. There are **26** source lenses and matching provenance
fixtures, with the same 23 concepts and 30 relationships. Next review starts at
printed **p.283/PDF p.293**; pending Chapter 9 is printed pp.283-382, including
p.382 without OCR, which needs full-page visual review.
Receipt: `artifacts/chapter9-april-source-review-273-282.json`.
Renders are under `tmp/pdfs/ch9-273-282`.

## Latest checkpoint: Chapter 9 late April through 292

Verified the attested source SHA-256 and visually inspected ten full-page
renders, printed pp.283-292 / PDF pp.293-302. The new
`chapter9_late_april_range_edges_and_patience` source lens and matching
provenance fixture preserve Figures 9.34-9.43 as EUR/USD narrative annotations.
Notes retain the missing second pullback-reversal entry on p.284, range-edge
resistance and inadequate buildup on p.285, first-pullback failure context on
p.286, thin squeeze and double-bar break on p.287, tight UK-hour objective
caution on p.288, optional resistance exits on p.289, tall-signal and premature
continuation cautions on p.290, dated news avoidance on p.291, and uncertain
round-level reach with conditional reversal exit on p.292. Combi anchors are
limited to the explicit labels on pp.285, 286 and 290.

No chart pixels became XAUUSD OHLC, fills, outcome labels, win rates or detector
rules. Thin-session expectations, source 20-pip objectives and exits for an
existing position remain conditional source reasoning. Fixtures remain
`SOURCE_REVIEW_ONLY / UNAVAILABLE / WITHHELD`; the focused chart retains
`SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

Global reviewed coverage is **329/419**, leaving **90** indexed chapter pages;
Chapter 9 is **48/138**. There are **27** source lenses and matching provenance
fixtures, with the same 23 concepts and 30 relationships. Next review starts at
printed **p.293/PDF p.303**; pending Chapter 9 is printed pp.293-382, including
p.382 without OCR, which needs full-page visual review.
Receipt: `artifacts/chapter9-late-april-source-review-283-292.json`.
Renders are under `tmp/pdfs/ch9-283-292`.


## Chapter 9 early May source review: printed pp.293-302

Verified the attested source SHA-256 and inspected ten full-page 1.5x renders,
printed pp.293-302 / PDF pp.303-312. The new
`chapter9_early_may_selection_and_news_context` source lens and matching
provenance-only fixture retain Figures 9.44-9.53: timid round-number sessions,
missing squeeze, adverse magnets, technically valid trades skipped for dated
news, aggressive entries with conditional reversal-exit tactics, and re-entry
only after an earlier accepted trade and shakeout. Combi anchors are limited
to the explicit labels on pp.297 and 301.

The ECB/US/EU event times remain May 2012 source context. Conditional exits,
personal recovery choices, valid-entry labels and no-trade annotations supply
no XAUUSD OHLC, fill, target event, measured outcome or detector rule. Source
fixtures remain `SOURCE_REVIEW_ONLY`, `UNAVAILABLE`, `WITHHELD`; preserve
`SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

Global reviewed coverage is **339/419**, leaving **80** indexed chapter pages;
Chapter 9 is **58/138**. There are **28** source lenses and matching provenance
fixtures, with 23 concepts and 30 relationships. The next review starts at
printed **p.303/PDF p.313**; pending Chapter 9 is printed pp.303-382, including
p.382 with no OCR. Receipt:
`artifacts/chapter9-early-may-source-review-293-302.json`.
Renders are under `tmp/pdfs/ch9-293-302`.

## Chapter 9 mid May source review: printed pp.303-312

The verified source SHA-256 was checked before full-page 1.5x rendering and
visual inspection of printed pp.303-312 / PDF pp.313-322. The new
`chapter9_mid_may_patience_and_conditional_exits` source lens and matching
provenance-only fixture cover Figures 9.54-9.63. Notes preserve the untradable
evening-star and aggressive bear entries on p.303, resistance without a short
on p.304, shallow pullback and delayed-exit caution on p.305, skipped flag
continuation and existing-position exits on p.306, optional stalling exit and
conditional re-entry on p.307, conservative-entry and evening-star distinctions
on p.308, persistent bulls and later let-go instruction on p.309, the prior
M-pattern exception to first-pullback exit patience on p.310, aggressive second
attempt on p.311, and nonaligned squeeze versus valid pullback/combi annotations
on p.312. Combi provenance is limited to explicit labels on pp.303, 304, 305,
311 and 312.

EUR/USD narrative examples remain `SOURCE_REVIEW_ONLY`, `UNAVAILABLE`,
`WITHHELD`. Conditional exits require an existing position; chart annotations
do not establish a prior fill, intrabar execution, XAUUSD OHLC, detector rule,
measured probability or win rate. Source-named morning/evening-star comparisons
do not validate the local named-candle detector. Preserve
`SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

Global reviewed coverage is **349/419**, leaving **70** indexed chapter pages;
Chapter 9 is **68/138**. There are **29** source lenses and matching provenance
fixtures, with 23 concepts and 30 relationships. Next review starts at printed
**p.313/PDF p.323**; pending Chapter 9 is printed pp.313-382, including the
p.382 OCR gap requiring full-page visual review. Receipt:
`artifacts/chapter9-mid-may-source-review-303-312.json`.
Renders are under `tmp/pdfs/ch9-303-312`.

## Chapter 9 late May and early June source review: printed pp.313-322

The verified source SHA-256 was checked before full-page 1.5x rendering and
visual inspection of printed pp.313-322 / PDF pp.323-332. The new
`chapter9_late_may_early_june_context_and_selectivity` source lens and matching
provenance-only fixture cover Figures 9.64-9.73, dated May 29-June 11, 2012.
Notes preserve no-trend and technically protected but aggressive entry context
on p.313, shallow-pullback caution on p.314, tall-bar abstention on p.315,
existing-position news exits and skipped post-news continuation on p.316,
premature attempts and first-barrier-test context on p.317, context-sensitive
failure trading and aggressive pullback selection on p.318, counterfactual
buildup wishes and news abstention on p.319, false-low/ceiling/50-level tests
on p.320, debatable barriers and a hypothetical double-low reversal exit on
p.321, and a counterfactual combi wish versus an accepted contextual pullback
reversal on p.322. Several annotations, especially on pp.315-318 and 320-321,
were absent from OCR and were read directly from the full-page renders.

Actual combi-label provenance is restricted to pp.317, 318 and 321 in this
review. Wishes for another buildup bar on pp.319 and 322 do not make those
pattern breaks combi setups. Skipped trades remain skipped despite subsequent
price movement. Conditional and hypothetical exit annotations establish no
prior fill, executable exit or measured outcome. Dated EU/ECB/US news is not a
live calendar. Named candles and 50-percent examples add no detector threshold.
EUR/USD narrative examples remain `SOURCE_REVIEW_ONLY`, `UNAVAILABLE`,
`WITHHELD`; preserve `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

At this increment global reviewed coverage is **359/419**, leaving **60** indexed
chapter pages; Chapter 9 is **78/138**. There are **30** source lenses and matching
provenance fixtures, with 23 concepts and 30 relationships. Next review starts
at printed **p.323/PDF p.333**; pending Chapter 9 is printed pp.323-382, including
the p.382 OCR gap requiring full-page visual review. Receipt:
`artifacts/chapter9-late-may-source-review-313-322.json`.
Renders are under `tmp/pdfs/ch9-313-322`.


## Chapter 9 June source review: printed pp.323-332

The verified source SHA-256 was checked before full-page 1.5x rendering and
visual inspection of printed pp.323-332 / PDF pp.333-342. The new
`chapter9_june_context_and_exit_ambiguity` source lens and matching
provenance-only fixture cover Figures 9.74-9.83, dated June 12-25, 2012.
Notes preserve the aggressive UK Open combi and 00-level opposition on p.323,
weak-setup and extra-buildup caution on p.324, premature turns and adverse
magnets on p.325, explicitly ambiguous reversal exits on p.326, hindsight
versus conservative participation on p.327, stronger bulls inside a range
on p.328, short-failure opportunity and conditional exits on p.329,
bullish-signal-bar rejection on p.330, 50-level tug-of-war on p.331, and
pressure without a provided setup on p.332. All ten full pages were inspected;
chart annotations omitted by OCR were retained from the renders.

Actual combi-label provenance is restricted to pp.323 and 329 in this review.
Ww labels alone do not establish combi setups. The uncertain p.326 statement
that a short probably made 20 pip does not establish a target touch or measured
outcome, and its bar-1/bar-2/no-exit questions remain unresolved source choices.
Existing-position and counterfactual exit notes establish no prior fill or
executable exit. Skips and no-setup annotations retain their meaning despite
later price movement. Dated US/EU news is historical context. EUR/USD narrative
examples remain `SOURCE_REVIEW_ONLY`, `UNAVAILABLE`, `WITHHELD`; preserve
`SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

At this increment global reviewed coverage is **369/419**, leaving **50** indexed
chapter pages; Chapter 9 is **88/138**. There are **31** source lenses and matching
provenance fixtures, with 23 concepts and 30 relationships. Next review starts
at printed **p.333/PDF p.343**; pending Chapter 9 is printed pp.333-382, including
the p.382 OCR gap requiring full-page visual review. Receipt:
`artifacts/chapter9-june-source-review-323-332.json`.
Renders are under `tmp/pdfs/ch9-323-332`.


## Chapter 9 June-July source review: printed pp.333-342

The verified source SHA-256 was checked before full-page 1.5x rendering and
visual inspection of all ten printed pp.333-342 / PDF pp.343-352. The new
`chapter9_july_context_and_exit_ambiguity` source lens and matching
provenance-only fixture cover Figures 9.84-9.93, dated June 26-July 9, 2012.
The running header crosses June/July on p.337; chart dates and existing month
intervals agree on p.337 as July 2. Existing attested OCR was compared with each
render, without re-extraction. Numerous skip, entry and exit annotations absent
from OCR were read directly from the full pages.

Notes preserve contrarian magnet context and an explicitly skipped 10 pip scalp
on p.333, an aggressive evening-star and pattern-line-extension exit caution on
p.334, unsuitable post-selloff pullback and untradable chop on p.335, a mega bull
rally that supplies neither a short nor a failure long on p.336, safe-base and
conditional news-triggered skips on p.337, a tall signal/adverse-triple skip and
counterfactual entry-bar test order on p.338, follow-up after failed reversal
exits on p.339, existing-position re-entry/exit and dated ECB context on p.340,
round-number and pre-report abstention on p.341, and unsafe/ranging-market
entries followed by an explicit combi on p.342. Actual combi-label provenance is
restricted to p.342 within this review.

The p.338 hypothetical entry-bar test sequence is not recovered intrabar data.
The p.333 10 pip idea is skipped, and p.339 target/resistance language proves no
target touch, fill or profit. Conditional exits and re-entry discussion require
an existing accepted position; they establish no prior fill or measured result.
Dated June/July news is historical context. Source notes add no XAUUSD OHLC,
detector occurrence, threshold, executable fill or win rate. The fixture remains
`SOURCE_REVIEW_ONLY`, `UNAVAILABLE`, `WITHHELD`; preserve
`SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

At this increment global reviewed coverage is **379/419**, leaving **40** indexed
chapter pages; Chapter 9 is **98/138**. There are **32** source lenses and matching
provenance fixtures, with 23 concepts and 30 relationships. Next review starts
at printed **p.343/PDF p.353**; pending Chapter 9 is printed pp.343-382, including
the p.382 OCR gap requiring full-page visual review. Receipt:
`artifacts/chapter9-july-source-review-333-342.json`.
Renders are under `tmp/pdfs/ch9-333-342`.


## Chapter 9 mid-July source review: printed pp.343-352

The verified source SHA-256 was checked before full-page 1.5x rendering and visual inspection of all ten printed pp.343-352 / PDF pp.353-362. The new `chapter9_mid_july_context_and_selectivity` source lens and matching provenance-only fixture cover Figures 9.94-9.103, July 10-23, 2012. Existing attested OCR was compared with each render without re-extraction; chart annotations absent from OCR were read directly from the full pages.

Notes preserve pattern-line-first entry timing and false-high/low context on p.343, triple-bottom and contrarian M-pattern selectivity on p.344, repeated 50-level failures and conditional reversal-exit monitoring on p.345, weak-squeeze/unclear-barrier skips on p.346, second-pullback and pre-news abstention on p.347, round-number and report exits on p.348, conditional reversal exits after demoralization on p.349, W/SHS combi and ceiling-test patience on p.350, adverse 50/25EMA magnets on p.351, and thin-buildup backfire/re-entry questions with later skips on p.352.

The July charts are EUR/USD narrative examples. Their OHLC, fills, stop/target events and win rates remain `UNAVAILABLE` / `WITHHELD`; conditional exits require an existing accepted position and establish no prior fill or measured result. Dated session/news labels are source context, not a live calendar. Source notes add no XAUUSD OHLC, detector occurrence, threshold, executable fill or outcome. Preserve `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

At this increment global reviewed coverage is **389/419**, leaving **30** indexed chapter pages; Chapter 9 is **108/138**. There are **33** source lenses and matching provenance fixtures, with 23 concepts and 30 relationships. Next review starts at printed **p.353/PDF p.363**; pending Chapter 9 is printed pp.353-382, including the p.382 OCR gap requiring full-page visual review. Receipt: `artifacts/chapter9-mid-july-source-review-343-352.json`. Renders are under `tmp/pdfs/ch9-343-352`.


## Chapter 9 late July-August source review: printed pp.353-362

The verified source SHA-256 was checked before full-page 1.5x rendering and visual inspection of all ten printed pp.353-362 / PDF pp.363-372. The new `chapter9_late_july_context_and_timing` source lens and matching provenance-only fixture cover Figures 9.104-9.113, July 24-August 6, 2012. Existing attested OCR was compared with each render without re-extraction; chart annotations absent from OCR were read directly from the full pages.

Notes preserve optional reversal exits and magnet/ceiling-test conflict on p.353, stop-slippage and false-low timing on p.354, tall-signal and EMA25 protection on p.355, aggressive shallow pullbacks on p.356, UK Open and diagonal-exit timing on p.357, insufficient scalps and unconvincing lunch-hour reversal on p.358, aggressive continuation and round-number support on p.359, tease-break/ECB abstention on p.360, range-break hindsight and EMA25 distance caution on p.361, and ranging-market pullback-reversal selectivity on p.362.

The July/August charts are EUR/USD narrative examples. Their OHLC, fills, stop/target events and win rates remain `UNAVAILABLE` / `WITHHELD`; conditional exits require an existing accepted position and establish no prior fill or measured result. Dated session/news labels are source context, not a live calendar. Source notes add no XAUUSD OHLC, detector occurrence, threshold, executable fill or outcome. Preserve `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

At this increment global reviewed coverage is **399/419**, leaving **20** indexed chapter pages; Chapter 9 is **118/138**. There are **34** source lenses and matching provenance fixtures, with 23 concepts and 30 relationships. Next review starts at printed **p.363/PDF p.373**; pending Chapter 9 is printed pp.363-382, including the p.382 OCR gap requiring full-page visual review. Receipt: `artifacts/chapter9-late-july-source-review-353-362.json`. Renders are under `tmp/pdfs/ch9-353-362`.


## Chapter 9 final August source review: printed pp.373-382

The source SHA-256 was verified before rendering and visually inspecting all ten final Chapter 9 pages, printed pp.373-382 / PDF pp.383-392. The new `chapter9_final_august_context_and_selectivity` source lens covers Figures 9.124-9.132 on pp.373-381: skipped M/SHS/W setups, buildup and ceiling tests, round-number and 50-level magnets, conditional resistance/reversal exits, stale-session restraint, combi selectivity, and supertrend/news caution. Printed p.382/PDF p.392 was inspected directly and is a confirmed blank divider with no OCR, concept anchor or inferred text.

The August charts are EUR/USD narrative examples. Their OHLC, fills, stop/target events and win rates remain `UNAVAILABLE` / `WITHHELD`; conditional exits require an already accepted position and establish no prior fill or measured result. Session labels, 00/50 levels, 25EMA and average-span language are source context, not local XAUUSD M5 thresholds or a live calendar. Explicit skips remain skips despite subsequent movement. Source notes add no detector occurrence, denominator, rate, fill or order. Preserve `SHADOW_ONLY / NO_DECISION / live_apply_allowed=false`.

At this increment global reviewed coverage is **419/419** indexed chapter pages; Chapter 9 is **138/138**. There are **36 source lenses** and matching provenance-only fixtures, with 23 concepts and 30 relationships. Receipt: `artifacts/chapter9-final-august-source-review-373-382.json`. Renders are under `tmp/pdfs/ch9-373-382`.
