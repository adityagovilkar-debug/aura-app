// Client side of cloud sync. Talks to the Vercel serverless function (api/sync.js).
// With no saved config the app is local-only. The only thing stored per device is
// the sync password (and, for the desktop app, the API URL) — never any server key.

import type { SyncRecord } from './sync';

const CONFIG_KEY = 'aura-sync-config-v1';

export interface SyncConfig {
  /** Base URL of the deployment hosting /api/sync. Empty = same origin (hosted PWA). */
  apiBaseUrl: string;
  password: string;
}

export function loadSyncConfig(): SyncConfig | null {
  try {
    const text = localStorage.getItem(CONFIG_KEY);
    if (text) {
      const c = JSON.parse(text);
      if (typeof c?.password === 'string' && c.password) {
        return { apiBaseUrl: typeof c.apiBaseUrl === 'string' ? c.apiBaseUrl : '', password: c.password };
      }
    }
  } catch { /* fall through */ }
  // Only the API URL may come from the build (never the password — that would
  // expose a shared secret in the client bundle).
  const env = import.meta.env as Record<string, string | undefined>;
  if (env.VITE_SYNC_API_URL) return { apiBaseUrl: env.VITE_SYNC_API_URL, password: '' };
  return null;
}

export function saveSyncConfig(cfg: SyncConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
}

export function clearSyncConfig(): void {
  localStorage.removeItem(CONFIG_KEY);
}

/** True once we have both an endpoint and a password to actually sync. */
export function isSyncReady(cfg: SyncConfig | null): cfg is SyncConfig {
  return !!cfg && !!cfg.password;
}

function endpoint(cfg: SyncConfig): string {
  return `${cfg.apiBaseUrl.replace(/\/$/, '')}/api/sync`;
}

async function parse(r: Response): Promise<SyncRecord[]> {
  if (r.status === 401) throw new Error('Wrong sync password.');
  if (r.status === 500) {
    const msg = await r.json().catch(() => null);
    throw new Error(msg?.error ?? 'The sync server is not set up yet.');
  }
  if (!r.ok) throw new Error(`Sync server error (${r.status}).`);
  const j = await r.json();
  return Array.isArray(j?.records) ? j.records : [];
}

export async function pull(cfg: SyncConfig): Promise<SyncRecord[]> {
  return parse(await fetch(endpoint(cfg), { headers: { 'x-sync-password': cfg.password } }));
}

export async function push(cfg: SyncConfig, records: SyncRecord[]): Promise<SyncRecord[]> {
  return parse(await fetch(endpoint(cfg), {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-sync-password': cfg.password },
    body: JSON.stringify({ records }),
  }));
}
