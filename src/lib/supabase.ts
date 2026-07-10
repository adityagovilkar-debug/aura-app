// Supabase network layer. Everything here is optional: with no saved config the
// app runs exactly as before (local-only). The cloud holds a flat `aura_records`
// table (see supabase/schema.sql) that mirrors lib/sync.ts records.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { SyncRecord } from './sync';

const CONFIG_KEY = 'aura-supabase-config-v1';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export function loadConfig(): SupabaseConfig | null {
  try {
    const text = localStorage.getItem(CONFIG_KEY);
    if (text) {
      const c = JSON.parse(text);
      if (typeof c?.url === 'string' && typeof c?.anonKey === 'string' && c.url && c.anonKey) return c;
    }
  } catch { /* ignore and fall through to build-time defaults */ }
  // Build-time defaults (set in .env.web) so the hosted PWA comes pre-connected
  // and the phone only needs a sign-in — never anything secret, the publishable
  // key is meant to ship in client code.
  const env = import.meta.env as Record<string, string | undefined>;
  if (env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY) {
    return { url: env.VITE_SUPABASE_URL, anonKey: env.VITE_SUPABASE_ANON_KEY };
  }
  return null;
}

export function saveConfig(cfg: SupabaseConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
}

export function clearConfig(): void {
  localStorage.removeItem(CONFIG_KEY);
}

let client: SupabaseClient | null = null;
let clientKey = '';

/** A memoized client for the saved config, or null if not configured. */
export function getClient(): SupabaseClient | null {
  const cfg = loadConfig();
  if (!cfg) {
    client = null;
    clientKey = '';
    return null;
  }
  const key = `${cfg.url}|${cfg.anonKey}`;
  if (!client || clientKey !== key) {
    client = createClient(cfg.url, cfg.anonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
    clientKey = key;
  }
  return client;
}

const TABLE = 'aura_records';

interface Row {
  user_id: string;
  kind: SyncRecord['kind'];
  key: string;
  payload: SyncRecord['payload'];
  deleted: boolean;
  updated_at: string;
}

const toRecord = (r: Row): SyncRecord => ({
  kind: r.kind, key: r.key, payload: r.payload, deleted: r.deleted, updatedAt: r.updated_at,
});

const toRow = (userId: string, rec: SyncRecord): Row => ({
  user_id: userId, kind: rec.kind, key: rec.key, payload: rec.payload, deleted: rec.deleted, updated_at: rec.updatedAt,
});

/** Pull every record for the signed-in user. Data is small, so a full pull is fine. */
export async function pullAll(c: SupabaseClient, userId: string): Promise<SyncRecord[]> {
  const { data, error } = await c.from(TABLE).select('*').eq('user_id', userId);
  if (error) throw error;
  return (data as Row[]).map(toRecord);
}

export async function pushRecords(c: SupabaseClient, userId: string, records: SyncRecord[]): Promise<void> {
  if (records.length === 0) return;
  const rows = records.map((r) => toRow(userId, r));
  const { error } = await c.from(TABLE).upsert(rows, { onConflict: 'user_id,kind,key' });
  if (error) throw error;
}

/** Live updates: fire `onChange` whenever this user's rows change anywhere. */
export function subscribe(c: SupabaseClient, userId: string, onChange: () => void) {
  const channel = c
    .channel(`aura-${userId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: TABLE, filter: `user_id=eq.${userId}` }, onChange)
    .subscribe();
  return () => { c.removeChannel(channel); };
}
