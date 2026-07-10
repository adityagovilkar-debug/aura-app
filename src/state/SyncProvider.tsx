import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import type { ReactNode } from 'react';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { useApp } from './AppContext';
import {
  clearConfig, getClient, loadConfig, pullAll, pushRecords, saveConfig, subscribe,
  type SupabaseConfig,
} from '../lib/supabase';

export type SyncStatus =
  | 'local-only'  // no cloud configured — app works offline as before
  | 'signed-out'  // configured but not signed in
  | 'offline'     // signed in but the device has no network
  | 'syncing'
  | 'synced'
  | 'error';

interface SyncContextValue {
  status: SyncStatus;
  configured: boolean;
  email: string | null;
  lastSyncedAt: number | null;
  errorMessage: string | null;
  notice: string | null;

  saveSupabaseConfig: (cfg: SupabaseConfig) => void;
  disconnect: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  syncNow: () => Promise<void>;
}

const SyncContext = createContext<SyncContextValue | null>(null);

const PULL_INTERVAL_MS = 45_000;
const PUSH_DEBOUNCE_MS = 1200;

export function SyncProvider({ children }: { children: ReactNode }) {
  const { getDirtyRecords, applyRemoteRecords, markRecordsPushed, localRevision } = useApp();

  const [configured, setConfigured] = useState(() => loadConfig() !== null);
  const [configVersion, setConfigVersion] = useState(0);
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<SyncStatus>(() => (loadConfig() ? 'signed-out' : 'local-only'));
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [online, setOnline] = useState(() => navigator.onLine);

  const clientRef = useRef<SupabaseClient | null>(null);
  const userIdRef = useRef<string | null>(null);
  const syncingRef = useRef(false);

  // (re)build the client and watch auth whenever the saved config changes
  useEffect(() => {
    const client = getClient();
    clientRef.current = client;
    setConfigured(client !== null);
    if (!client) {
      setSession(null);
      setStatus('local-only');
      return;
    }
    let active = true;
    client.auth.getSession().then(({ data }) => {
      if (active) setSession(data.session);
    });
    const { data: sub } = client.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [configVersion]);

  useEffect(() => {
    userIdRef.current = session?.user.id ?? null;
  }, [session]);

  const fail = useCallback((e: unknown) => {
    setStatus('error');
    setErrorMessage(e instanceof Error ? e.message : String(e));
  }, []);

  const pushDirty = useCallback(async () => {
    const client = clientRef.current;
    const userId = userIdRef.current;
    if (!client || !userId || !navigator.onLine) return;
    const dirty = getDirtyRecords();
    if (dirty.length === 0) return;
    setStatus('syncing');
    try {
      await pushRecords(client, userId, dirty);
      markRecordsPushed(dirty);
      setLastSyncedAt(Date.now());
      setStatus('synced');
      setErrorMessage(null);
    } catch (e) {
      fail(e);
    }
  }, [getDirtyRecords, markRecordsPushed, fail]);

  const fullSync = useCallback(async () => {
    const client = clientRef.current;
    const userId = userIdRef.current;
    if (!client || !userId) return;
    if (!navigator.onLine) { setStatus('offline'); return; }
    if (syncingRef.current) return;
    syncingRef.current = true;
    setStatus('syncing');
    try {
      const remote = await pullAll(client, userId);
      applyRemoteRecords(remote);
      // push anything still dirty (local edits the cloud didn't supersede)
      const dirty = getDirtyRecords();
      if (dirty.length) await pushRecords(client, userId, dirty);
      if (dirty.length) markRecordsPushed(dirty);
      setLastSyncedAt(Date.now());
      setStatus('synced');
      setErrorMessage(null);
    } catch (e) {
      fail(e);
    } finally {
      syncingRef.current = false;
    }
  }, [applyRemoteRecords, getDirtyRecords, markRecordsPushed, fail]);

  // when signed in: initial sync + realtime + polling + focus/online triggers
  useEffect(() => {
    if (!session) {
      if (configured) setStatus('signed-out');
      return;
    }
    const client = clientRef.current;
    const userId = session.user.id;
    if (!client) return;

    void fullSync();
    const unsub = subscribe(client, userId, () => { void fullSync(); });
    const interval = window.setInterval(() => { void fullSync(); }, PULL_INTERVAL_MS);
    const onFocus = () => { void fullSync(); };
    const onOnline = () => { setOnline(true); void fullSync(); };
    const onOffline = () => { setOnline(false); setStatus('offline'); };
    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      unsub();
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, configured]);

  // push local edits (debounced) once signed in
  useEffect(() => {
    if (!session || localRevision === 0) return;
    const t = window.setTimeout(() => { void pushDirty(); }, PUSH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localRevision, session]);

  useEffect(() => {
    if (session && !online) setStatus('offline');
  }, [online, session]);

  const value = useMemo<SyncContextValue>(() => ({
    status,
    configured,
    email: session?.user.email ?? null,
    lastSyncedAt,
    errorMessage,
    notice,

    saveSupabaseConfig: (cfg) => {
      saveConfig(cfg);
      setErrorMessage(null);
      setNotice(null);
      setConfigVersion((v) => v + 1);
    },

    disconnect: async () => {
      try { await clientRef.current?.auth.signOut(); } catch { /* ignore */ }
      clearConfig();
      setSession(null);
      setNotice(null);
      setConfigVersion((v) => v + 1);
    },

    signIn: async (email, password) => {
      const client = clientRef.current;
      if (!client) return;
      setStatus('syncing');
      setNotice(null);
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) { fail(error); throw error; }
      setErrorMessage(null);
    },

    signUp: async (email, password) => {
      const client = clientRef.current;
      if (!client) return;
      setNotice(null);
      const { data, error } = await client.auth.signUp({ email, password });
      if (error) { fail(error); throw error; }
      if (!data.session) {
        setNotice('Account created. Check your email to confirm it, then sign in. (You can disable email confirmation in Supabase → Authentication → Sign In / Providers.)');
      }
      setErrorMessage(null);
    },

    signOut: async () => {
      try { await clientRef.current?.auth.signOut(); } catch { /* ignore */ }
      setSession(null);
    },

    syncNow: fullSync,
  }), [status, configured, session, lastSyncedAt, errorMessage, notice, fail, fullSync]);

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncContextValue {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync must be used inside <SyncProvider>');
  return ctx;
}
