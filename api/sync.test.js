// Tests the serverless sync logic without a real Redis. Run with: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { accounts, handleSync, mergeSets } from './sync.js';

/** In-memory stand-in for Redis: a keyed set of stores, so we can prove isolation. */
function stores(seed = {}) {
  const data = new Map(Object.entries(seed));
  return {
    open: (key) => ({
      get: async () => data.get(key) ?? [],
      set: async (records) => { data.set(key, records); },
    }),
    peek: (key) => data.get(key) ?? [],
  };
}

const env = { SYNC_PASSWORD: 'his', SYNC_PASSWORD_2: 'hers' };
const rec = (kind, key, updatedAt) => ({ kind, key, updatedAt, payload: {}, deleted: false });

test('mergeSets keeps the newest record per kind+key', () => {
  const out = mergeSets(
    [rec('day', '2026-06-10', '2026-06-10T08:00:00Z')],
    [rec('day', '2026-06-10', '2026-06-10T09:00:00Z'), rec('day', '2026-06-11', '2026-06-11T07:00:00Z')],
  );
  assert.equal(out.length, 2);
  assert.equal(out.find((r) => r.key === '2026-06-10').updatedAt, '2026-06-10T09:00:00Z');
});

test('accounts maps SYNC_PASSWORD to the primary key and SYNC_PASSWORD_N to separate keys', () => {
  const list = accounts(env);
  assert.deepEqual(list, [
    { password: 'his', key: 'aura:records' },
    { password: 'hers', key: 'aura:records:2' },
  ]);
});

test('missing password is rejected with 401', async () => {
  const r = await handleSync({ method: 'GET', password: undefined, env, openStore: stores().open });
  assert.equal(r.status, 401);
});

test('an unknown password is rejected with 401', async () => {
  const r = await handleSync({ method: 'GET', password: 'stranger', env, openStore: stores().open });
  assert.equal(r.status, 401);
});

test('unconfigured server returns 500', async () => {
  const r = await handleSync({ method: 'GET', password: 'x', env: {}, openStore: stores().open });
  assert.equal(r.status, 500);
});

test('two people get completely separate datasets', async () => {
  const s = stores();
  // his device writes a day
  await handleSync({ method: 'POST', password: 'his', env, openStore: s.open,
    body: { records: [rec('day', '2026-06-10', '2026-06-10T08:00:00Z')] } });
  // her device writes a different day
  await handleSync({ method: 'POST', password: 'hers', env, openStore: s.open,
    body: { records: [rec('day', '2026-06-11', '2026-06-11T08:00:00Z')] } });

  const his = await handleSync({ method: 'GET', password: 'his', env, openStore: s.open });
  const hers = await handleSync({ method: 'GET', password: 'hers', env, openStore: s.open });

  assert.deepEqual(his.body.records.map((r) => r.key), ['2026-06-10']);
  assert.deepEqual(hers.body.records.map((r) => r.key), ['2026-06-11']);
  // stored under distinct Redis keys
  assert.equal(s.peek('aura:records').length, 1);
  assert.equal(s.peek('aura:records:2').length, 1);
});

test('POST merges incoming into the caller\'s own dataset', async () => {
  const s = stores({ 'aura:records': [rec('day', '2026-06-10', '2026-06-10T08:00:00Z')] });
  const r = await handleSync({ method: 'POST', password: 'his', env, openStore: s.open,
    body: { records: [rec('day', '2026-06-10', '2026-06-10T10:00:00Z'), rec('day', '2026-06-12', '2026-06-12T09:00:00Z')] } });
  assert.equal(r.status, 200);
  assert.equal(r.body.records.length, 2);
  assert.equal(s.peek('aura:records').find((x) => x.key === '2026-06-10').updatedAt, '2026-06-10T10:00:00Z');
});
