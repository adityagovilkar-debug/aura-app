// AURA cloud sync — a single Vercel serverless function.
//
// It stores each person's data (a flat list of sync records, see src/lib/sync.ts)
// under its own Redis key, gated by that person's password. Redis tokens stay
// here on the server — devices only ever send a password.
//
// Required environment variables (set in the Vercel project):
//   SYNC_PASSWORD                             — your password (primary account)
//   SYNC_PASSWORD_2 .. SYNC_PASSWORD_10       — optional: more people, separate data
//   KV_REST_API_URL      / KV_REST_API_TOKEN  — injected by Vercel's Redis/KV store
//   (or UPSTASH_REDIS_REST_URL / _TOKEN)      — the Upstash equivalents also work

const PRIMARY_KEY = 'aura:records';

/** Merge two record sets, keeping the newest (by updatedAt) for each kind+key. */
export function mergeSets(stored, incoming) {
  const map = new Map();
  for (const r of stored) map.set(`${r.kind}|${r.key}`, r);
  for (const r of incoming) {
    const id = `${r.kind}|${r.key}`;
    const existing = map.get(id);
    if (!existing || String(r.updatedAt) > String(existing.updatedAt)) map.set(id, r);
  }
  return [...map.values()];
}

/**
 * The allowed accounts: each a { password, key } pair with its own dataset.
 * SYNC_PASSWORD keeps the original key so existing data is preserved; each
 * SYNC_PASSWORD_N gets a separate key, so family members never see each other's data.
 */
export function accounts(env) {
  const list = [];
  if (env.SYNC_PASSWORD) list.push({ password: env.SYNC_PASSWORD, key: PRIMARY_KEY });
  for (let i = 2; i <= 10; i++) {
    const password = env[`SYNC_PASSWORD_${i}`];
    if (password) list.push({ password, key: `${PRIMARY_KEY}:${i}` });
  }
  return list;
}

/** Pure request logic, decoupled from Redis/HTTP so it can be unit-tested. */
export async function handleSync({ method, password, body, env, openStore }) {
  const list = accounts(env);
  if (list.length === 0) {
    return { status: 500, body: { error: 'Server not configured: SYNC_PASSWORD is missing.' } };
  }
  const account = password ? list.find((a) => a.password === password) : null;
  if (!account) {
    return { status: 401, body: { error: 'Wrong sync password.' } };
  }
  const store = openStore(account.key);
  if (method === 'GET') {
    return { status: 200, body: { records: await store.get() } };
  }
  if (method === 'POST') {
    const incoming = Array.isArray(body?.records) ? body.records : [];
    const merged = mergeSets(await store.get(), incoming);
    await store.set(merged);
    return { status: 200, body: { records: merged } };
  }
  return { status: 405, body: { error: 'Method not allowed.' } };
}

function redisStore(env, key) {
  const url = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error('Server not configured: no Redis/KV store is connected to this project.');
  }
  const k = encodeURIComponent(key);
  const auth = { Authorization: `Bearer ${token}` };
  return {
    async get() {
      const r = await fetch(`${url}/get/${k}`, { headers: auth });
      if (!r.ok) throw new Error(`Redis GET failed (${r.status}).`);
      const { result } = await r.json();
      return result ? JSON.parse(result) : [];
    },
    async set(records) {
      const r = await fetch(`${url}/set/${k}`, { method: 'POST', headers: auth, body: JSON.stringify(records) });
      if (!r.ok) throw new Error(`Redis SET failed (${r.status}).`);
    },
  };
}

export default async function handler(req, res) {
  // Allow the Electron desktop app and localhost dev to call this cross-origin.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type, x-sync-password');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }

  try {
    const result = await handleSync({
      method: req.method,
      password: req.headers['x-sync-password'],
      body,
      env: process.env,
      openStore: (key) => redisStore(process.env, key),
    });
    res.status(result.status).json(result.body);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
}
