import { useState } from 'react';
import { useSync } from '../../state/SyncProvider';
import { loadSyncConfig } from '../../lib/syncBackend';
import { SyncBadge } from '../ui/SyncBadge';

function timeAgo(ts: number | null): string {
  if (!ts) return 'never';
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  return `${Math.round(s / 3600)}h ago`;
}

const isDesktop = typeof location !== 'undefined' && location.protocol === 'file:';

/** Connect the device to cloud sync with a sync password. Optional — skip for local-only use. */
export function CloudSyncCard() {
  const sync = useSync();
  const existing = loadSyncConfig();

  // On the hosted PWA the API is same-origin, so the URL field defaults to blank.
  const [apiBaseUrl, setApiBaseUrl] = useState(existing?.apiBaseUrl ?? '');
  const [password, setPassword] = useState('');

  const connect = () => {
    if (!password.trim()) return;
    sync.saveConfig({ apiBaseUrl: apiBaseUrl.trim(), password: password.trim() });
    setPassword('');
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
            Sync your days, meals and workouts across devices through your own Vercel deployment —
            no third-party database account. Set up the sync store once (see
            <span className="mono"> README → Cloud sync</span>), then enter your sync password below.
            Leave this blank to keep AURA fully local.
          </p>
          <div className="grid" style={{ gap: 10 }}>
            {isDesktop && (
              <div className="field">
                <span className="field-label">Sync URL (your deployed app)</span>
                <input
                  className="input mono" value={apiBaseUrl}
                  onChange={(e) => setApiBaseUrl(e.target.value)}
                  placeholder="https://aura-health-omega.vercel.app"
                />
              </div>
            )}
            <div className="field">
              <span className="field-label">Sync password</span>
              <input
                className="input" type="password" value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="the password you set on the server"
                onKeyDown={(e) => { if (e.key === 'Enter') connect(); }}
              />
            </div>
            <div className="row">
              <div className="spacer" />
              <button className="btn btn-primary" disabled={!password.trim()} onClick={connect}>
                Connect
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="row-between" style={{ marginBottom: 12 }}>
            <div className="stat">
              <span className="stat-label">Connected to</span>
              <span style={{ fontWeight: 600 }}>{sync.apiHost}</span>
            </div>
            <div className="stat" style={{ alignItems: 'flex-end' }}>
              <span className="stat-label">Last synced</span>
              <span className="mono small">{timeAgo(sync.lastSyncedAt)}</span>
            </div>
          </div>
          <p className="small muted" style={{ marginTop: 0 }}>
            Every change syncs automatically. Open the installable web app on your phone, enter this
            same sync password, and your data appears there too.
          </p>
          <div className="row wrap">
            <button className="btn btn-primary" onClick={() => { void sync.syncNow(); }}>Sync now</button>
            <div className="spacer" />
            <button className="btn btn-sm" onClick={sync.disconnect}>Disconnect</button>
          </div>
        </>
      )}

      {sync.errorMessage && (
        <p className="small" style={{ color: 'var(--red)', marginBottom: 0 }}>{sync.errorMessage}</p>
      )}
    </div>
  );
}
