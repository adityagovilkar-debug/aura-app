// Persistence layer. All app state is one versioned JSON document stored in
// localStorage, exportable/importable as a file — swap this module out to
// migrate to a different backend later.

import type { AppData, MealTemplate, Nutrition, Settings } from '../types';
import type { Dirty, SyncMeta } from './sync';
import { emptyDirty, emptyMeta } from './sync';
import { todayKey } from './dates';

const STORAGE_KEY = 'aura-health-data-v1';
const SYNC_META_KEY = 'aura-sync-meta-v1';

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function nutrition(calories: number, protein: number, carbs: number, fat: number, fiber = 0, sugar = 0): Nutrition {
  return { calories, protein, carbs, fat, fiber, sugar };
}

function starterLibrary(): MealTemplate[] {
  const now = new Date().toISOString();
  const t = (name: string, serving: string, tags: string[], n: Nutrition): MealTemplate => ({
    id: uid(), name, serving, tags, nutrition: n, createdAt: now,
  });
  return [
    t('Oatmeal with Banana', '1 bowl (250 g)', ['breakfast', 'veg', 'quick'], nutrition(290, 8, 55, 5, 6, 14)),
    t('Masala Omelette (2 eggs)', '2 eggs', ['breakfast', 'high-protein'], nutrition(220, 14, 4, 16, 1, 2)),
    t('Grilled Chicken Salad', '1 large plate', ['lunch', 'high-protein', 'low-carb'], nutrition(380, 35, 12, 20, 4, 5)),
    t('Dal, Rice & Sabzi', '1 thali', ['lunch', 'dinner', 'veg'], nutrition(520, 18, 80, 14, 9, 6)),
    t('Paneer Wrap', '1 wrap', ['lunch', 'veg', 'high-protein'], nutrition(420, 19, 45, 18, 5, 4)),
    t('Whey Protein Shake', '1 scoop + water', ['snack', 'high-protein', 'quick'], nutrition(130, 25, 4, 2, 0, 2)),
    t('Mixed Fruit Bowl', '1 bowl (200 g)', ['snack', 'veg', 'quick'], nutrition(110, 1, 27, 0, 4, 20)),
    t('Greek Yogurt', '1 cup (170 g)', ['snack', 'high-protein'], nutrition(100, 17, 6, 1, 0, 4)),
  ];
}

export function defaultSettings(): Settings {
  return {
    calorieLimit: 2000,
    waterGoalMl: 2500,
    proteinGoalG: 100,
    carbsGoalG: 250,
    fatGoalG: 65,
    exerciseGoalMin: 30,
    waterPresets: [250, 500, 750],
    trackingStart: todayKey(),
  };
}

export function defaultData(): AppData {
  return {
    version: 1,
    settings: defaultSettings(),
    library: starterLibrary(),
    days: {},
  };
}

/** Fill any missing fields so older/partial documents keep working. */
function normalize(raw: unknown): AppData {
  const base = defaultData();
  if (typeof raw !== 'object' || raw === null) return base;
  const r = raw as Partial<AppData>;
  return {
    version: 1,
    settings: { ...base.settings, ...(r.settings ?? {}) },
    library: Array.isArray(r.library) ? r.library : base.library,
    days: typeof r.days === 'object' && r.days !== null ? r.days : {},
  };
}

export function loadData(): AppData {
  try {
    const text = localStorage.getItem(STORAGE_KEY);
    if (!text) return defaultData();
    return normalize(JSON.parse(text));
  } catch {
    return defaultData();
  }
}

export function saveData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/** Per-record sync timestamps + pending-upload flags (see lib/sync.ts). */
export function loadSyncMeta(): { meta: SyncMeta; dirty: Dirty } {
  try {
    const text = localStorage.getItem(SYNC_META_KEY);
    if (!text) return { meta: emptyMeta(), dirty: emptyDirty() };
    const parsed = JSON.parse(text);
    return {
      meta: { ...emptyMeta(), ...(parsed.meta ?? {}) },
      dirty: { ...emptyDirty(), ...(parsed.dirty ?? {}) },
    };
  } catch {
    return { meta: emptyMeta(), dirty: emptyDirty() };
  }
}

export function saveSyncMeta(meta: SyncMeta, dirty: Dirty): void {
  localStorage.setItem(SYNC_META_KEY, JSON.stringify({ meta, dirty }));
}

/** Download the entire document as a JSON file. */
export function exportToFile(data: AppData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `aura-health-backup-${todayKey()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Parse an exported file. Throws with a readable message if it's not valid. */
export function parseImport(text: string): AppData {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('That file is not valid JSON.');
  }
  if (typeof raw !== 'object' || raw === null || !('days' in raw) || !('settings' in raw)) {
    throw new Error('That file does not look like an AURA Health backup.');
  }
  return normalize(raw);
}
