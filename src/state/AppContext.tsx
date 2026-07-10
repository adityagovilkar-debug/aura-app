import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type {
  AppData, DayLog, ExerciseEntry, MealEntry, MealTemplate, Settings, WaterEntry,
} from '../types';
import { loadData, loadSyncMeta, saveData, saveSyncMeta, uid } from '../lib/storage';
import {
  bumpDay, bumpDeletedTemplate, bumpSettings, bumpTemplate, clearPushed, collectDirty,
  markAllDirty, mergeRemote, type SyncRecord, type SyncState,
} from '../lib/sync';
import { emptyDay } from '../lib/stats';
import { nowTime, todayKey } from '../lib/dates';

export type View = 'dashboard' | 'log' | 'calendar' | 'library' | 'reports' | 'settings';

interface AppContextValue {
  data: AppData;
  view: View;
  setView: (v: View) => void;
  selectedDate: string;
  setSelectedDate: (key: string) => void;
  /** Jump to the daily log of a specific date (used by the calendar). */
  openDay: (key: string) => void;

  addMeal: (date: string, entry: Omit<MealEntry, 'id'>) => void;
  removeMeal: (date: string, id: string) => void;
  addWater: (date: string, amountMl: number) => void;
  removeWater: (date: string, id: string) => void;
  addExercise: (date: string, entry: Omit<ExerciseEntry, 'id'>) => void;
  removeExercise: (date: string, id: string) => void;
  setDayMeta: (date: string, patch: Partial<Pick<DayLog, 'weightKg' | 'notes'>>) => void;

  upsertTemplate: (t: MealTemplate) => void;
  deleteTemplate: (id: string) => void;

  updateSettings: (patch: Partial<Settings>) => void;
  replaceData: (d: AppData) => void;

  // ---- sync surface (used by SyncProvider, not by views) ----
  /** Records changed locally that still need uploading. */
  getDirtyRecords: () => SyncRecord[];
  /** Merge records pulled from the cloud (newer-per-record wins). */
  applyRemoteRecords: (records: SyncRecord[]) => void;
  /** Clear dirty flags for records we just uploaded. */
  markRecordsPushed: (records: SyncRecord[]) => void;
  /** Bump for a change-counter the engine watches to push after local edits. */
  localRevision: number;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SyncState>(() => {
    const data = loadData();
    const { meta, dirty } = loadSyncMeta();
    return { data, meta, dirty };
  });
  const [view, setView] = useState<View>('dashboard');
  const [selectedDate, setSelectedDate] = useState<string>(todayKey);
  // Bumped on every local (user) mutation so the sync engine knows to push.
  const [localRevision, setLocalRevision] = useState(0);

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
    saveData(state.data);
    saveSyncMeta(state.meta, state.dirty);
  }, [state]);

  const value = useMemo<AppContextValue>(() => {
    // A local (user-initiated) edit: bumps the revision so the engine pushes.
    const localEdit = (fn: (s: SyncState) => SyncState) => {
      setState(fn);
      setLocalRevision((r) => r + 1);
    };

    const mutateDay = (date: string, dayFn: (day: DayLog) => DayLog) =>
      localEdit((s) => {
        const day = s.data.days[date] ?? emptyDay(date);
        const data = { ...s.data, days: { ...s.data.days, [date]: dayFn(day) } };
        const { meta, dirty } = bumpDay(s.meta, s.dirty, date);
        return { data, meta, dirty };
      });

    return {
      data: state.data,
      view,
      setView,
      selectedDate,
      setSelectedDate,
      openDay: (key) => {
        setSelectedDate(key);
        setView('log');
      },

      addMeal: (date, entry) =>
        mutateDay(date, (day) => ({ ...day, meals: [...day.meals, { ...entry, id: uid() }] })),
      removeMeal: (date, id) =>
        mutateDay(date, (day) => ({ ...day, meals: day.meals.filter((m) => m.id !== id) })),

      addWater: (date, amountMl) =>
        mutateDay(date, (day) => ({
          ...day,
          water: [...day.water, { id: uid(), amountMl, time: nowTime() } satisfies WaterEntry],
        })),
      removeWater: (date, id) =>
        mutateDay(date, (day) => ({ ...day, water: day.water.filter((w) => w.id !== id) })),

      addExercise: (date, entry) =>
        mutateDay(date, (day) => ({ ...day, exercises: [...day.exercises, { ...entry, id: uid() }] })),
      removeExercise: (date, id) =>
        mutateDay(date, (day) => ({ ...day, exercises: day.exercises.filter((e) => e.id !== id) })),

      setDayMeta: (date, patch) => mutateDay(date, (day) => ({ ...day, ...patch })),

      upsertTemplate: (t) =>
        localEdit((s) => {
          const exists = s.data.library.some((x) => x.id === t.id);
          const library = exists ? s.data.library.map((x) => (x.id === t.id ? t : x)) : [...s.data.library, t];
          const { meta, dirty } = bumpTemplate(s.meta, s.dirty, t.id);
          return { ...s, data: { ...s.data, library }, meta, dirty };
        }),
      deleteTemplate: (id) =>
        localEdit((s) => {
          const library = s.data.library.filter((x) => x.id !== id);
          const { meta, dirty } = bumpDeletedTemplate(s.meta, s.dirty, id);
          return { ...s, data: { ...s.data, library }, meta, dirty };
        }),

      updateSettings: (patch) =>
        localEdit((s) => {
          const settings = { ...s.data.settings, ...patch };
          const { meta, dirty } = bumpSettings(s.meta, s.dirty);
          return { ...s, data: { ...s.data, settings }, meta, dirty };
        }),

      replaceData: (d) => localEdit((s) => markAllDirty({ ...s, data: d })),

      getDirtyRecords: () => collectDirty(stateRef.current),
      applyRemoteRecords: (records) => setState((s) => mergeRemote(s, records)),
      markRecordsPushed: (records) => setState((s) => clearPushed(s, records)),
      localRevision,
    };
  }, [state, view, selectedDate, localRevision]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}
