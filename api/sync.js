// AURA cloud sync — a single Vercel serverless function.
//
// It stores one JSON document (a flat list of sync records, see src/lib/sync.ts)
// in Redis, and is gated by a shared password so only you can read/write it.
// The Redis token stays here on the server — devices only ever send the password.
//
// Required environment variables (set in the Vercel project):
//   SYNC_PASSWORD                             — the password each device enters
//   KV_REST_API_URL      / KV_REST_API_TOKEN  — injected by Vercel's Redis/KV store
//   (or UPSTASH_REDIS_REST_URL / _TOKEN)      — the Upstash equivalents also work

const REDIS_KEY = 'aura:records';

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

/** Pure request logic, decoupled from Redis/HTTP so it can be unit-tested. */
export async function handleSync({ method, password, body, store, env }) {
  if (!env.SYNC_PASSWORD) {
    return { status: 500, body: { error: 'Server not configured: SYNC_PASSWORD is missing.' } };
  }
  if (!password || password !== env.SYNC_PASSWORD) {
    return { status: 401, body: { error: 'Wrong sync password.' } };
  }
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

function redisStore(env) {
  const url = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error('Server not configured: no Redis/KV store is connected to this project.');
  }
  const key = encodeURIComponent(REDIS_KEY);
  const auth = { Authorization: `Bearer ${token}` };
  return {
    async get() {
      const r = await fetch(`${url}/get/${key}`, { headers: auth });
      if (!r.ok) throw new Error(`Redis GET failed (${r.status}).`);
      const { result } = await r.json();
      return result ? JSON.parse(result) : [];
    },
    async set(records) {
      const r = await fetch(`${url}/set/${key}`, { method: 'POST', headers: auth, body: JSON.stringify(records) });
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
      store: redisStore(process.env),
      env: process.env,
    });
    res.status(result.status).json(result.body);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
}
