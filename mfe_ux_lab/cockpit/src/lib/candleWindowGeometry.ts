interface CandleWindowBar {
  h: number;
  l: number;
  c: number;
}

interface CandleWindowMarker {
  i: number;
  price: number;
  direction: string;
}

/** Price historical landmarks from the setup prefix, never its observed outcome. */
export function candleWindowGeometry(bars: readonly CandleWindowBar[], marker: CandleWindowMarker) {
  const entry = marker.price;
  const withheld = { entry, target: null, invalidation: null, localAtr: null };
  if (!Number.isInteger(marker.i) || marker.i < 1 || marker.i >= bars.length || !Number.isFinite(entry)) return withheld;
  // Match the mini-chart's six-bar lead-in while fixing the endpoint at the
  // detector anchor. A later display center must not change setup geometry.
  const prefix = bars.slice(Math.max(0, marker.i - 6), marker.i + 1);
  if (prefix.some((bar) => ![bar.h, bar.l, bar.c].every(Number.isFinite) || bar.h < bar.l || bar.c < bar.l || bar.c > bar.h)) return withheld;
  const localAtr = prefix.slice(1).reduce((sum, bar, index) => {
    const previous = prefix[index];
    return sum + Math.max(bar.h - bar.l, Math.abs(bar.h - previous.c), Math.abs(bar.l - previous.c));
  }, 0) / (prefix.length - 1);
  const signed = marker.direction === "UP" ? 1 : marker.direction === "DOWN" ? -1 : 0;
  return {
    entry,
    localAtr,
    target: signed && localAtr > 0 ? entry + signed * 2.2 * localAtr : null,
    invalidation: signed && localAtr > 0 ? entry - signed * localAtr : null,
  };
}
