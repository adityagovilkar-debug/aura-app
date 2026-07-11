// Tests the serverless sync logic without a real Redis. Run with: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { handleSync, mergeSets } from './sync.js';

function memStore(initial = []) {
  let data = initial;
  return {
    get: async () => data,
    set: async (records) => { data = records; },
    peek: () => data,
  };
}
const env = { SYNC_PASSWORD: 'hunter2', KV_REST_API_URL: 'x', KV_REST_API_TOKEN: 'y' };
const rec = (kind, key, updatedAt, extra = {}) => ({ kind, key, updatedAt, payload: extra, deleted: false });

test('mergeSets keeps the newest record per kind+key', () => {
  const out = mergeSets(
    [rec('day', '2026-06-10', '2026-06-10T08:00:00Z')],
    [rec('day', '2026-06-10', '2026-06-10T09:00:00Z'), rec('day', '2026-06-11', '2026-06-11T07:00:00Z')],
  );
  assert.equal(out.length, 2);
  assert.equal(out.find((r) => r.key === '2026-06-10').updatedAt, '2026-06-10T09:00:00Z');
});

test('mergeSets ignores an older incoming record', () => {
  const out = mergeSets(
    [rec('settings', 'settings', '2026-06-10T12:00:00Z')],
    [rec('settings', 'settings', '2026-06-10T11:00:00Z')],
  );
  assert.equal(out[0].updatedAt, '2026-06-10T12:00:00Z');
});

test('missing password is rejected with 401', async () => {
  const r = await handleSync({ method: 'GET', password: undefined, store: memStore(), env });
  assert.equal(r.status, 401);
});

test('wrong password is rejected with 401', async () => {
  const r = await handleSync({ method: 'GET', password: 'nope', store: memStore(), env });
  assert.equal(r.status, 401);
});

test('unconfigured server returns 500', async () => {
  const r = await handleSync({ method: 'GET', password: 'x', store: memStore(), env: {} });
  assert.equal(r.status, 500);
});

test('GET returns stored records with the right password', async () => {
  const store = memStore([rec('day', '2026-06-10', '2026-06-10T08:00:00Z')]);
  const r = await handleSync({ method: 'GET', password: 'hunter2', store, env });
  assert.equal(r.status, 200);
  assert.equal(r.body.records.length, 1);
});

test('POST merges incoming into stored and persists', async () => {
  const store = memStore([rec('day', '2026-06-10', '2026-06-10T08:00:00Z')]);
  const r = await handleSync({
    method: 'POST', password: 'hunter2', store, env,
    body: { records: [rec('day', '2026-06-10', '2026-06-10T10:00:00Z'), rec('day', '2026-06-12', '2026-06-12T09:00:00Z')] },
  });
  assert.equal(r.status, 200);
  assert.equal(r.body.records.length, 2);
  assert.equal(store.peek().find((x) => x.key === '2026-06-10').updatedAt, '2026-06-10T10:00:00Z');
});
