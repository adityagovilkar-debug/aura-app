import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import type { ReactNode } from 'react';
import { useApp } from './AppContext';
import {
  clearSyncConfig, isSyncReady, loadSyncConfig, pull, push, saveSyncConfig,
  type SyncConfig,
} from '../lib/syncBackend';

export type SyncStatus =
  | 'local-only' // no sync configured — app works offline as before
  | 'offline'    // configured but the device has no network
  | 'syncing'
  | 'synced'
  | 'error';

interface SyncContextValue {
  status: SyncStatus;
  configured: boolean;
  apiHost: string | null;
  lastSyncedAt: number | null;
  errorMessage: string | null;

  saveConfig: (cfg: SyncConfig) => void;
  disconnect: () => void;
  syncNow: () => Promise<void>;
}

const SyncContext = createContext<SyncContextValue | null>(null);

const POLL_INTERVAL_MS = 30_000;
const PUSH_DEBOUNCE_MS = 1200;

export function SyncProvider({ children }: { children: ReactNode }) {
  const { getDirtyRecords, applyRemoteRecords, markRecordsPushed, localRevision } = useApp();

  const [configVersion, setConfigVersion] = useState(0);
  const [configured, setConfigured] = useState(() => isSyncReady(loadSyncConfig()));
  const [status, setStatus] = useState<SyncStatus>(() => (isSyncReady(loadSyncConfig()) ? 'syncing' : 'local-only'));
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const cfgRef = useRef<SyncConfig | null>(loadSyncConfig());
  const busyRef = useRef(false);

  const fail = useCallback((e: unknown) => {
    setStatus('error');
    setErrorMessage(e instanceof Error ? e.message : String(e));
  }, []);

  const fullSync = useCallback(async () => {
    const cfg = cfgRef.current;
    if (!isSyncReady(cfg)) return;
    if (!navigator.onLine) { setStatus('offline'); return; }
    if (busyRef.current) return;
    busyRef.current = true;
    setStatus('syncing');
    try {
      applyRemoteRecords(await pull(cfg));
      // push whatever the cloud didn't already supersede, then fold in the merged result
      const dirty = getDirtyRecords();
      if (dirty.length) {
        applyRemoteRecords(await push(cfg, dirty));
        markRecordsPushed(dirty);
      }
      setLastSyncedAt(Date.now());
      setErrorMessage(null);
      setStatus('synced');
    } catch (e) {
      fail(e);
    } finally {
      busyRef.current = false;
    }
  }, [applyRemoteRecords, getDirtyRecords, markRecordsPushed, fail]);

  const pushDirty = useCallback(async () => {
    const cfg = cfgRef.current;
    if (!isSyncReady(cfg) || !navigator.onLine) return;
    const dirty = getDirtyRecords();
    if (dirty.length === 0) return;
    setStatus('syncing');
    try {
      applyRemoteRecords(await push(cfg, dirty));
      markRecordsPushed(dirty);
      setLastSyncedAt(Date.now());
      setErrorMessage(null);
      setStatus('synced');
    } catch (e) {
      fail(e);
    }
  }, [applyRemoteRecords, getDirtyRecords, markRecordsPushed, fail]);

  // (re)connect whenever the saved config changes; poll + react to focus/online
  useEffect(() => {
    cfgRef.current = loadSyncConfig();
    const ready = isSyncReady(cfgRef.current);
    setConfigured(ready);
    if (!ready) { setStatus('local-only'); return; }

    void fullSync();
    const interval = window.setInterval(() => { void fullSync(); }, POLL_INTERVAL_MS);
    const onFocus = () => { void fullSync(); };
    const onOnline = () => { void fullSync(); };
    const onOffline = () => setStatus('offline');
    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configVersion]);

  // push local edits (debounced) once connected
  useEffect(() => {
    if (!configured || localRevision === 0) return;
    const t = window.setTimeout(() => { void pushDirty(); }, PUSH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localRevision, configured]);

  const value = useMemo<SyncContextValue>(() => {
    let apiHost: string | null = null;
    const cfg = cfgRef.current;
    if (cfg) {
      try { apiHost = cfg.apiBaseUrl ? new URL(cfg.apiBaseUrl).host : 'this site'; } catch { apiHost = cfg.apiBaseUrl; }
    }
    return {
      status,
      configured,
      apiHost,
      lastSyncedAt,
      errorMessage,
      saveConfig: (cfg2) => {
        saveSyncConfig(cfg2);
        setErrorMessage(null);
        setConfigVersion((v) => v + 1);
      },
      disconnect: () => {
        clearSyncConfig();
        setConfigVersion((v) => v + 1);
      },
      syncNow: fullSync,
    };
  }, [status, configured, lastSyncedAt, errorMessage, fullSync, configVersion]);

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncContextValue {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync must be used inside <SyncProvider>');
  return ctx;
}
