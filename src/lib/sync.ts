// Sync core — PURE logic, no DOM / network / localStorage so it stays unit-testable.
//
// The app's data is mirrored to the cloud as a flat set of timestamped records:
//   - one record per logged day      (kind 'day',      key = date)
//   - one record per library meal     (kind 'template', key = template id)
//   - one record for settings         (kind 'settings', key = 'settings')
// Each record carries an `updatedAt` ISO timestamp. Conflicts resolve by
// last-write-wins *per record*, so editing Monday on your phone and Tuesday on
// your PC never clobber each other — only edits to the very same record race.

import type { AppData, DayLog, MealTemplate, Settings } from '../types';
import { emptyDay } from './stats';

export type RecordKind = 'day' | 'template' | 'settings';

export interface SyncRecord {
  kind: RecordKind;
  key: string;
  payload: DayLog | MealTemplate | Settings | null; // null only when deleted
  deleted: boolean;
  updatedAt: string; // ISO 8601 (UTC) — compares correctly as a string
}

/** When each local record last changed, so we can tell who is newer on merge. */
export interface SyncMeta {
  days: Record<string, string>;
  templates: Record<string, string>;
  settings: string;
  deletedTemplates: Record<string, string>; // tombstones: id -> deletedAt
}

/** Records changed locally that still need pushing to the cloud. */
export interface Dirty {
  days: Record<string, true>;
  templates: Record<string, true>;
  settings: boolean;
}

export interface SyncState {
  data: AppData;
  meta: SyncMeta;
  dirty: Dirty;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function emptyMeta(): SyncMeta {
  return { days: {}, templates: {}, settings: '', deletedTemplates: {} };
}

export function emptyDirty(): Dirty {
  return { days: {}, templates: {}, settings: false };
}

// ---- local stamping (called from the app's mutations) ----------------------

export function bumpDay(meta: SyncMeta, dirty: Dirty, date: string, ts = nowIso()) {
  return {
    meta: { ...meta, days: { ...meta.days, [date]: ts } },
    dirty: { ...dirty, days: { ...dirty.days, [date]: true as const } },
  };
}

export function bumpTemplate(meta: SyncMeta, dirty: Dirty, id: string, ts = nowIso()) {
  const deletedTemplates = { ...meta.deletedTemplates };
  delete deletedTemplates[id]; // un-tombstone on re-create/edit
  return {
    meta: { ...meta, templates: { ...meta.templates, [id]: ts }, deletedTemplates },
    dirty: { ...dirty, templates: { ...dirty.templates, [id]: true as const } },
  };
}

export function bumpDeletedTemplate(meta: SyncMeta, dirty: Dirty, id: string, ts = nowIso()) {
  const templates = { ...meta.templates };
  delete templates[id];
  return {
    meta: { ...meta, templates, deletedTemplates: { ...meta.deletedTemplates, [id]: ts } },
    dirty: { ...dirty, templates: { ...dirty.templates, [id]: true as const } },
  };
}

export function bumpSettings(meta: SyncMeta, dirty: Dirty, ts = nowIso()) {
  return {
    meta: { ...meta, settings: ts },
    dirty: { ...dirty, settings: true },
  };
}

/** Mark the whole document dirty (after an import or reset) so it propagates up. */
export function markAllDirty(state: SyncState, ts = nowIso()): SyncState {
  const meta: SyncMeta = { days: {}, templates: {}, settings: ts, deletedTemplates: {} };
  const dirty: Dirty = { days: {}, templates: {}, settings: true };
  for (const date of Object.keys(state.data.days)) {
    meta.days[date] = ts;
    dirty.days[date] = true;
  }
  for (const t of state.data.library) {
    meta.templates[t.id] = ts;
    dirty.templates[t.id] = true;
  }
  return { ...state, meta, dirty };
}

// ---- merge (cloud -> local) ------------------------------------------------

const newer = (a: string, b: string | undefined) => a > (b ?? '');

/** Apply remote records, letting the strictly-newer timestamp win per record. */
export function mergeRemote(state: SyncState, records: SyncRecord[]): SyncState {
  let data = state.data;
  const meta: SyncMeta = {
    days: { ...state.meta.days },
    templates: { ...state.meta.templates },
    settings: state.meta.settings,
    deletedTemplates: { ...state.meta.deletedTemplates },
  };
  const dirty: Dirty = {
    days: { ...state.dirty.days },
    templates: { ...state.dirty.templates },
    settings: state.dirty.settings,
  };
  let days = data.days;
  let library = data.library;
  let settings = data.settings;
  let touched = false;

  for (const rec of records) {
    if (rec.kind === 'day') {
      if (!newer(rec.updatedAt, meta.days[rec.key]) || !rec.payload) continue;
      days = { ...days, [rec.key]: rec.payload as DayLog };
      meta.days[rec.key] = rec.updatedAt;
      delete dirty.days[rec.key];
      touched = true;
    } else if (rec.kind === 'template') {
      const localTs = meta.templates[rec.key] ?? meta.deletedTemplates[rec.key];
      if (!newer(rec.updatedAt, localTs)) continue;
      if (rec.deleted) {
        library = library.filter((t) => t.id !== rec.key);
        delete meta.templates[rec.key];
        meta.deletedTemplates[rec.key] = rec.updatedAt;
      } else if (rec.payload) {
        const tmpl = rec.payload as MealTemplate;
        library = library.some((t) => t.id === tmpl.id)
          ? library.map((t) => (t.id === tmpl.id ? tmpl : t))
          : [...library, tmpl];
        meta.templates[rec.key] = rec.updatedAt;
        delete meta.deletedTemplates[rec.key];
      }
      delete dirty.templates[rec.key];
      touched = true;
    } else {
      if (!newer(rec.updatedAt, meta.settings) || !rec.payload) continue;
      settings = rec.payload as Settings;
      meta.settings = rec.updatedAt;
      dirty.settings = false;
      touched = true;
    }
  }

  if (!touched) return state;
  data = { ...data, days, library, settings };
  return { data, meta, dirty };
}

// ---- collect (local -> cloud) ----------------------------------------------

/** The dirty records that should be pushed to the cloud. */
export function collectDirty(state: SyncState): SyncRecord[] {
  const out: SyncRecord[] = [];
  for (const date of Object.keys(state.dirty.days)) {
    const day = state.data.days[date] ?? emptyDay(date);
    out.push({ kind: 'day', key: date, payload: day, deleted: false, updatedAt: state.meta.days[date] ?? nowIso() });
  }
  for (const id of Object.keys(state.dirty.templates)) {
    if (state.meta.deletedTemplates[id]) {
      out.push({ kind: 'template', key: id, payload: null, deleted: true, updatedAt: state.meta.deletedTemplates[id] });
    } else {
      const tmpl = state.data.library.find((t) => t.id === id);
      if (tmpl) {
        out.push({ kind: 'template', key: id, payload: tmpl, deleted: false, updatedAt: state.meta.templates[id] ?? nowIso() });
      }
    }
  }
  if (state.dirty.settings) {
    out.push({ kind: 'settings', key: 'settings', payload: state.data.settings, deleted: false, updatedAt: state.meta.settings || nowIso() });
  }
  return out;
}

/**
 * Clear dirty flags for records we just pushed — but only if they haven't been
 * re-edited since (their local timestamp still matches what we pushed).
 */
export function clearPushed(state: SyncState, pushed: SyncRecord[]): SyncState {
  const dirty: Dirty = {
    days: { ...state.dirty.days },
    templates: { ...state.dirty.templates },
    settings: state.dirty.settings,
  };
  for (const rec of pushed) {
    if (rec.kind === 'day') {
      if (state.meta.days[rec.key] === rec.updatedAt) delete dirty.days[rec.key];
    } else if (rec.kind === 'template') {
      const cur = state.meta.templates[rec.key] ?? state.meta.deletedTemplates[rec.key];
      if (cur === rec.updatedAt) delete dirty.templates[rec.key];
    } else if (rec.kind === 'settings') {
      if (state.meta.settings === rec.updatedAt) dirty.settings = false;
    }
  }
  return { ...state, dirty };
}
