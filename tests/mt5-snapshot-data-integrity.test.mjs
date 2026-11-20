import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const frames = { M5: 5, M15: 15, M30: 30, H1: 60 };
const roots = ["artifacts/mt5-history", "mfe_ux_lab/cockpit/public/data/sim"];
const hash = (value) => createHash("sha256").update(value).digest("hex");
const read = (root, tf) => readFileSync(`${root}/${root.includes("artifacts") ? "XAUUSD_" : "ohlc_XAUUSD_"}${tf}${root.includes("artifacts") ? "_3y" : ""}.json`);
const parse = (buffer) => JSON.parse(buffer.toString("utf8"));

for (const [tf, step] of Object.entries(frames)) {
  const artifact = read("artifacts/mt5-history", tf);
  const publicCopy = read("mfe_ux_lab/cockpit/public/data/sim", tf);
  assert.equal(hash(publicCopy), hash(artifact), `${tf} public snapshot must match the validated MT5 artifact`);
  const payload = parse(artifact);
  assert.equal(payload.symbol, "XAUUSD");
  assert.equal(payload.timeframe, tf);
  assert.equal(payload.source, "MT5_HISTORY");
  assert.equal(payload.closed_bar_provenance, "MT5_CLOSED_BARS");
  assert.equal(payload.forming_bar_included, false);
  assert.equal(payload.server_timezone, "UTC");
  assert.equal(payload.timestamp_basis, "UTC");
  assert.ok(["COMPLETE", "COMPLETE_BOUNDARY_GAPS", "PARTIAL_BOUNDARIES"].includes(payload.coverage_status));
  assert.equal(typeof payload.coverage_chunks, "number");
  assert.equal(payload.authority, "SHADOW_ONLY");
  assert.equal(payload.decision, "NO_DECISION");
  assert.equal(payload.n, payload.bars.length);
  assert.ok(payload.bars.length > 1000, `${tf} snapshot must contain substantial history`);
  let previous = 0;
  for (const [index, bar] of payload.bars.entries()) {
    assert.match(bar.t, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/, `${tf} row ${index} timestamp must be canonical UTC`);
    const stamp = Date.parse(bar.t);
    assert.ok(Number.isFinite(stamp), `${tf} row ${index} timestamp must be parseable UTC`);
    assert.equal(new Date(stamp).toISOString().slice(0, 19) + "Z", bar.t, `${tf} row ${index} timestamp must round-trip as canonical UTC`);
    assert.ok(stamp > previous, `${tf} timestamps must be strictly increasing`);
    assert.equal(new Date(stamp).getUTCMinutes() % step, 0, `${tf} row ${index} must align to its timeframe`);
    assert.ok([bar.o, bar.h, bar.l, bar.c].every(Number.isFinite), `${tf} row ${index} prices must be finite`);
    assert.ok(bar.h >= bar.l && bar.h >= bar.o && bar.h >= bar.c && bar.l <= bar.o && bar.l <= bar.c, `${tf} row ${index} OHLC must be ordered`);
    previous = stamp;
  }
}

console.log("MT5 SNAPSHOT INTEGRITY PASS: XAUUSD M5/M15/M30/H1 public copies match validated closed-bar artifacts and preserve UTC OHLC contracts.");
