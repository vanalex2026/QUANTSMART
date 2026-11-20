import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createResearchBackend } from './researchBackend.mjs';

const backend = await createResearchBackend({ workspaceDirectory: mkdtempSync(join(tmpdir(), 'mfe-price-action-')) });
const server = http.createServer((req, res) => backend.middleware(req, res, () => { res.statusCode = 404; res.end(); }));
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const call = async (path, body, method = body ? 'POST' : 'GET') => {
  const response = await fetch(base + path, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
  return { code: response.status, data: await response.json() };
};
const complete = async (id) => {
  for (let i = 0; i < 300; i++) {
    const result = await call(`/api/research/jobs/${id}`);
    if (!['queued', 'running'].includes(result.data.status)) return result.data;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error('price action backend test timeout');
};

const bars = Array.from({ length: 24 }, (_, i) => {
  const t = new Date(Date.UTC(2026, 0, 1, 0, i * 5)).toISOString();
  const o = 2000 + i * 0.2;
  return { i, t, o, h: o + 0.7, l: o - 0.2, c: o + (i % 2 ? -0.1 : 0.5) };
});
const request = { kind: 'detector', analysis: 'price_action', bars, options: { symbol: 'XAUUSD', timeframe: 'M5' } };

try {
  assert.equal((await call('/api/research/jobs', { ...request, analysis: 'other' })).code, 400);
  assert.equal((await call('/api/research/jobs', { ...request, options: { symbol: 'EURUSD', timeframe: 'M5' } })).code, 400);
  assert.equal((await call('/api/research/jobs', { ...request, bars: [{ ...bars[0], closed: false }] })).code, 400);

  const submitted = await call('/api/research/jobs', request);
  assert.equal(submitted.code, 202);
  const duplicate = await call('/api/research/jobs', request);
  assert.equal(duplicate.code, 200);
  assert.equal(duplicate.data.id, submitted.data.id);
  assert.equal((await complete(submitted.data.id)).status, 'done');
  const response = await call(`/api/research/jobs/${submitted.data.id}/result`);
  assert.equal(response.code, 200);
  const result = response.data.result;
  assert.equal(result.schema, 'quantsmart.research.price-action/1');
  assert.equal(result.operation, 'price_action');
  assert.match(result.result_hash, /^[a-f0-9]{64}$/);
  assert.equal(result.provenance.tape_hash, response.data.provenance.tape_hash);
  assert.equal(result.provenance.canonical_scope, 'BROWSER_SUPPLIED_BARS_TRANSITIONAL');
  assert.equal(result.provenance.canonical_scope_pending, true);
  assert.equal(result.live_apply_allowed, false);
  assert.equal(response.data.authority, 'SHADOW_ONLY');

  const largeBars = Array.from({ length: 20000 }, (_, i) => ({ ...bars[i % bars.length], i, t: new Date(Date.UTC(2026, 0, 1) + i * 300000).toISOString() }));
  const running = await call('/api/research/jobs', { ...request, bars: largeBars, options: { ...request.options, roundStep: 1 } });
  const queued = await call('/api/research/jobs', { ...request, bars: largeBars, options: { ...request.options, roundStep: 2 } });
  const cancelled = await call(`/api/research/jobs/${queued.data.id}`, undefined, 'DELETE');
  assert.equal(cancelled.data.status, 'cancelled');
  await complete(running.data.id);
  console.log('PRICE ACTION BACKEND PASS: strict identity and closed-bar validation, deterministic receipt hash/provenance, dedupe and cancellation.');
} finally {
  backend.close();
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
}
