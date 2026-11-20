import assert from "node:assert/strict";
import { createServer } from "node:http";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname.replace(/^\//, "").replaceAll("/", "\\");
const script = join(root, "scripts", "fetch_mt5_history.mjs");

async function run(timestamp, extra = {}, failureTf = null, seedExisting = false) {
  const server = createServer((request, response) => {
    const tf = new URL(request.url, "http://localhost").searchParams.get("tf");
    response.setHeader("content-type", "application/json");
    if (tf === failureTf) {
      response.statusCode = 503;
      response.end(JSON.stringify({ ok: false, reason: "UPSTREAM_TIMEOUT" }));
      return;
    }
    response.end(JSON.stringify({
      ok: true, symbol: "XAUUSD", timeframe: tf, source: "MT5_HISTORY",
      closed_bar_provenance: "MT5_CLOSED_BARS", forming_bar_included: false,
      server_timezone: "UTC", timestamp_basis: "UTC", authority: "SHADOW_ONLY", coverage_status: "COMPLETE", ...extra,
      bars: [{ t: timestamp, o: 1, h: 2, l: 0, c: 1 }],
    }));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const out = mkdtempSync(join(tmpdir(), "mt5-fetch-"));
  if (seedExisting) {
    const artifacts = join(out, "artifacts");
    const publicData = join(out, "public");
    mkdirSync(artifacts, { recursive: true });
    mkdirSync(publicData, { recursive: true });
    writeFileSync(join(artifacts, "XAUUSD_M5_3y.json"), "previous-artifact");
    writeFileSync(join(publicData, "ohlc_XAUUSD_M5.json"), "previous-public");
  }
  const child = spawn(process.execPath, [script], {
    cwd: root,
    env: { ...process.env, MT5_APP_URL: `http://127.0.0.1:${address.port}`, MT5_FROM: "2026-01-01T00:00:00Z", MT5_TO: "2026-01-02T00:00:00Z", MT5_OUT: join(out, "artifacts"), MT5_PUBLIC_OUT: join(out, "public") },
  });
  const stdout = [], stderr = [];
  child.stdout.on("data", (chunk) => stdout.push(String(chunk)));
  child.stderr.on("data", (chunk) => stderr.push(String(chunk)));
  const status = await new Promise((resolve) => child.on("close", resolve));
  server.close();
  return { result: { status, stdout: stdout.join(""), stderr: stderr.join("") }, out };
}

const accepted = await run("2026-01-01T00:00:00Z");
assert.equal(accepted.result.status, 0, accepted.result.stderr);
const saved = JSON.parse(readFileSync(join(accepted.out, "artifacts", "XAUUSD_M5_3y.json"), "utf8"));
assert.equal(saved.bars[0].t, "2026-01-01T00:00:00Z");
assert.equal(saved.server_timezone, "UTC");
rmSync(accepted.out, { recursive: true, force: true });

const rejected = await run("2026-01-01T00:00:00+00:00");
assert.notEqual(rejected.result.status, 0, "offset timestamps must not be silently normalized into a UTC artifact");
assert.match(`${rejected.result.stdout}\n${rejected.result.stderr}`, /NON_CANONICAL_UTC_TIMESTAMP/);
rmSync(rejected.out, { recursive: true, force: true });

const retained = await run("2026-01-01T00:00:00Z", { coverage_status: "PARTIAL", history_limit: "BROKER_RETENTION" });
assert.equal(retained.result.status, 0, retained.result.stderr);
const retainedPayload = JSON.parse(readFileSync(join(retained.out, "artifacts", "XAUUSD_M5_3y.json"), "utf8"));
assert.equal(retainedPayload.coverage_status, "PARTIAL", "broker retention must never be relabeled as boundary-only completeness");
rmSync(retained.out, { recursive: true, force: true });

const invalidOut = mkdtempSync(join(tmpdir(), "mt5-fetch-invalid-"));
const invalid = spawnSync(process.execPath, [script], {
  cwd: root,
  env: {
    ...process.env,
    MT5_FROM: "not-a-timestamp",
    MT5_TO: "2026-01-02T00:00:00Z",
    MT5_OUT: join(invalidOut, "artifacts"),
    MT5_PUBLIC_OUT: join(invalidOut, "public"),
  },
  encoding: "utf8",
  windowsHide: true,
});
assert.notEqual(invalid.status, 0, "invalid date bounds must fail before writing an empty history artifact");
assert.match(`${invalid.stdout}\n${invalid.stderr}`, /MT5_FROM and MT5_TO must be valid timestamps/);
assert.equal(existsSync(join(invalidOut, "artifacts", "XAUUSD_3y_manifest.json")), false);
rmSync(invalidOut, { recursive: true, force: true });

const partial = await run("2026-01-01T00:00:00Z", {}, "M15", true);
assert.notEqual(partial.result.status, 0, "a later timeframe failure must fail the fetch");
assert.equal(readFileSync(join(partial.out, "artifacts", "XAUUSD_M5_3y.json"), "utf8"), "previous-artifact", "validated earlier frames must not replace an existing artifact on a partial run");
assert.equal(readFileSync(join(partial.out, "public", "ohlc_XAUUSD_M5.json"), "utf8"), "previous-public", "public snapshots must not be replaced by a partial run");
const leftovers = readdirSync(partial.out).filter((name) => name.includes(".staging-") || name.includes(".backup-"));
assert.deepEqual(leftovers, [], "failed runs must clean staging and rollback artifacts");
rmSync(partial.out, { recursive: true, force: true });

console.log("MT5 FETCH TIMESTAMP PASS: saved bars retain canonical UTC Z and noncanonical timestamps fail closed.");
