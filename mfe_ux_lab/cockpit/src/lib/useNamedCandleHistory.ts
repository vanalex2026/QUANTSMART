import { useEffect, useMemo, useRef, useState } from "react";
import type { NamedCandleHistory } from "./namedCandleHistory.ts";
import type { NamedCandlePattern, PatternBar } from "./candlePatternAtlas.ts";
import { sameNamedCandleHistoryTape, startNamedCandleHistoryScan } from "./namedCandleHistoryScan.ts";

const EMPTY_PATTERN_TAPE: readonly PatternBar[] = [];

export function useNamedCandleHistory(
  bars: readonly PatternBar[], pattern: NamedCandlePattern | null | undefined, enabled = true,
) {
  const previous = useRef<readonly PatternBar[]>([]);
  const inputActive = enabled && !!pattern;
  const tape = useMemo(() => {
    if (!inputActive) {
      previous.current = EMPTY_PATTERN_TAPE;
      return EMPTY_PATTERN_TAPE;
    }
    if (!sameNamedCandleHistoryTape(previous.current, bars)) {
      previous.current = bars.map((bar, i) => ({ i, t: bar.t, o: bar.o, h: bar.h, l: bar.l, c: bar.c, closed: bar.closed }));
    }
    return previous.current;
  }, [bars, inputActive]);
  const active = enabled && !!pattern && tape.length >= 2;
  const [attempt, setAttempt] = useState(0);
  const [scan, setScan] = useState<{ tape: readonly PatternBar[]; pattern: NamedCandlePattern; attempt: number; result: NamedCandleHistory | null; status: "loading" | "ready" | "error" } | null>(null);
  useEffect(() => {
    if (!active || !pattern) { setScan(null); return; }
    const identity = { tape, pattern, attempt };
    setScan({ ...identity, result: null, status: "loading" });
    return startNamedCandleHistoryScan(tape, pattern,
      () => new Worker(new URL("./namedCandleHistory.worker.ts", import.meta.url), { type: "module" }),
      (result) => setScan({ ...identity, result, status: "ready" }),
      () => setScan({ ...identity, result: null, status: "error" }),
    );
  }, [tape, active, pattern, attempt]);
  const current = active && scan?.tape === tape && scan.pattern === pattern && scan.attempt === attempt;
  return { result: current ? scan.result : null, status: !active ? "idle" : current ? scan.status : "loading", retry: () => setAttempt((value) => value + 1) };
}
