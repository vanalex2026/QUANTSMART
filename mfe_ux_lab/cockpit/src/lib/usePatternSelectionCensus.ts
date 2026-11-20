import { useEffect, useMemo, useRef, useState } from "react";
import type { M5PriceBar, PriceActionConceptEvidence } from "./priceActionDetector.ts";
import type { PatternContextSelectionCensus } from "./patternContextSelectionCensus.ts";
import { samePatternSelectionCensusTape, startPatternSelectionCensusScan } from "./patternSelectionCensusScan.ts";

const EMPTY_TAPE: readonly M5PriceBar[] = [];

/**
 * Run context-selection census work only while the inspector asks for it.
 * Results are keyed by the complete tape, evidence object, symbol, concept and
 * retry attempt; a changed key is hidden synchronously during render so a
 * superseded result cannot flash in the inspector before effect cleanup runs.
 */
export function usePatternSelectionCensus(
  bars: readonly M5PriceBar[],
  evidence: PriceActionConceptEvidence | null | undefined,
  symbol: string,
  enabled = true,
) {
  const previous = useRef<readonly M5PriceBar[]>(EMPTY_TAPE);
  const inputActive = enabled && !!evidence;
  const tape = useMemo(() => {
    if (!inputActive) {
      previous.current = EMPTY_TAPE;
      return EMPTY_TAPE;
    }
    if (!samePatternSelectionCensusTape(previous.current, bars)) {
      previous.current = bars.map((bar, i) => ({ i, t: bar.t, o: bar.o, h: bar.h, l: bar.l, c: bar.c, closed: bar.closed }));
    }
    return previous.current;
  }, [bars, inputActive]);

  const active = inputActive && tape.length > 0 && !!evidence;
  const conceptId = evidence?.conceptId ?? "";
  const [attempt, setAttempt] = useState(0);
  const [scan, setScan] = useState<{
    tape: readonly M5PriceBar[];
    evidence: PriceActionConceptEvidence;
    symbol: string;
    conceptId: string;
    attempt: number;
    result: PatternContextSelectionCensus | null;
    status: "loading" | "ready" | "error";
  } | null>(null);

  useEffect(() => {
    if (!active || !evidence) {
      setScan(null);
      return;
    }
    const identity = { tape, evidence, symbol, conceptId, attempt };
    setScan({ ...identity, result: null, status: "loading" });
    return startPatternSelectionCensusScan(
      { bars: tape, occurrences: evidence.history, conceptId: evidence.conceptId, nowMs: Date.now() },
      () => new Worker(new URL("./patternSelectionCensus.worker.ts", import.meta.url), { type: "module" }),
      (result) => setScan({ ...identity, result, status: "ready" }),
      () => setScan({ ...identity, result: null, status: "error" }),
    );
  }, [tape, active, evidence, symbol, conceptId, attempt]);

  const current = active && !!evidence && scan?.tape === tape && scan.evidence === evidence
    && scan.symbol === symbol && scan.conceptId === conceptId && scan.attempt === attempt;
  return {
    result: current ? scan.result : null,
    status: !active ? "idle" : current ? scan.status : "loading",
    retry: () => setAttempt((value) => value + 1),
  };
}
