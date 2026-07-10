import { useState } from 'react';
import { useSync } from '../../state/SyncProvider';
import { loadConfig } from '../../lib/supabase';
import { SyncBadge } from '../ui/SyncBadge';

function timeAgo(ts: number | null): string {
  if (!ts) return 'never';
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  return `${Math.round(s / 3600)}h ago`;
}

/** Configure Supabase, sign in, and see sync status. Optional — skip it for local-only use. */
export function CloudSyncCard() {
  const sync = useSync();
  const existing = loadConfig();

  const [url, setUrl] = useState(existing?.url ?? '');
  const [anonKey, setAnonKey] = useState(existing?.anonKey ?? '');
  const [email, setEmail] = useState(sync.email ?? '');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const saveConfig = () => {
    if (!url.trim() || !anonKey.trim()) return;
    sync.saveSupabaseConfig({ url: url.trim(), anonKey: anonKey.trim() });
  };

  const run = (fn: () => Promise<void>) => async () => {
    setBusy(true);
    try { await fn(); } catch { /* surfaced via sync.errorMessage */ } finally { setBusy(false); }
  };

  return (
    <div className="card">
      <h2 className="card-title">
        <span>Cloud sync · phone access</span>
        <SyncBadge />
      </h2>

      {!sync.configured ? (
        <>
          <p className="small muted" style={{ marginTop: 0 }}>
            Connect your own free <strong>Supabase</strong> project to share data with your phone (and the
            installable web app). Create a project at supabase.com, run the setup SQL from
            <span className="mono"> supabase/schema.sql</span>, then paste its URL and anon key below.
            Leave this blank to keep AURA fully local.
          </p>
          <div className="grid" style={{ gap: 10 }}>
            <div className="field">
              <span className="field-label">Project URL</span>
              <input className="input mono" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://xxxxxxxx.supabase.co" />
            </div>
            <div className="field">
              <span className="field-label">Anon / public key</span>
              <input className="input mono" value={anonKey} onChange={(e) => setAnonKey(e.target.value)} placeholder="eyJhbGciOi…" />
            </div>
            <div className="row">
              <div className="spacer" />
              <button className="btn btn-primary" disabled={!url.trim() || !anonKey.trim()} onClick={saveConfig}>
                Connect project
              </button>
            </div>
          </div>
        </>
      ) : !sync.email ? (
        <>
          <p className="small muted" style={{ marginTop: 0 }}>
            Project connected. Sign in with the same account on every device to sync. New here?
            Create an account, then use it on your phone too.
          </p>
          <div className="grid" style={{ gap: 10 }}>
            <div className="field">
              <span className="field-label">Email</span>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div className="field">
              <span className="field-label">Password</span>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <div className="row wrap">
              <button className="btn btn-primary" disabled={busy || !email || !password} onClick={run(() => sync.signIn(email, password))}>
                Sign in
              </button>
              <button className="btn" disabled={busy || !email || !password} onClick={run(() => sync.signUp(email, password))}>
                Create account
              </button>
              <div className="spacer" />
              <button className="btn btn-sm" disabled={busy} onClick={run(sync.disconnect)}>
                Change project
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="row-between" style={{ marginBottom: 12 }}>
            <div className="stat">
              <span className="stat-label">Signed in</span>
              <span style={{ fontWeight: 600 }}>{sync.email}</span>
            </div>
            <div className="stat" style={{ alignItems: 'flex-end' }}>
              <span className="stat-label">Last synced</span>
              <span className="mono small">{timeAgo(sync.lastSyncedAt)}</span>
            </div>
          </div>
          <p className="small muted" style={{ marginTop: 0 }}>
            Every change syncs automatically. Open the installable web app on your phone, sign in with this
            same account, and your days, meals and workouts appear there too.
          </p>
          <div className="row wrap">
            <button className="btn btn-primary" disabled={busy} onClick={run(sync.syncNow)}>Sync now</button>
            <button className="btn" disabled={busy} onClick={run(sync.signOut)}>Sign out</button>
            <div className="spacer" />
            <button className="btn btn-sm" disabled={busy} onClick={run(sync.disconnect)}>Disconnect project</button>
          </div>
        </>
      )}

      {sync.notice && (
        <p className="small" style={{ color: 'var(--amber)', marginBottom: 0 }}>{sync.notice}</p>
      )}
      {sync.errorMessage && (
        <p className="small" style={{ color: 'var(--red)', marginBottom: 0 }}>{sync.errorMessage}</p>
      )}
    </div>
  );
}
