// Verifies the per-record conflict resolution. Run with: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import type { AppData, DayLog, MealTemplate } from '../types';
import {
  bumpDay, bumpDeletedTemplate, bumpTemplate, clearPushed, collectDirty,
  emptyDirty, emptyMeta, markAllDirty, mergeRemote, type SyncRecord, type SyncState,
} from './sync';

function baseData(): AppData {
  return {
    version: 1,
    settings: {
      calorieLimit: 2000, waterGoalMl: 2500, proteinGoalG: 100, carbsGoalG: 250,
      fatGoalG: 65, exerciseGoalMin: 30, waterPresets: [250, 500], trackingStart: '2026-01-01',
    },
    library: [],
    days: {},
  };
}

function state(): SyncState {
  return { data: baseData(), meta: emptyMeta(), dirty: emptyDirty() };
}

const day = (date: string, kcal: number): DayLog => ({
  date, meals: [{ id: 'm1', name: 'x', slot: 'lunch', servings: 1, nutrition: { calories: kcal, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 } }], water: [], exercises: [],
});

test('remote day with a newer timestamp overwrites local', () => {
  let s = state();
  ({ meta: s.meta, dirty: s.dirty } = bumpDay(s.meta, s.dirty, '2026-06-10', '2026-06-10T08:00:00.000Z'));
  s.data.days['2026-06-10'] = day('2026-06-10', 500);

  const rec: SyncRecord = { kind: 'day', key: '2026-06-10', payload: day('2026-06-10', 900), deleted: false, updatedAt: '2026-06-10T09:00:00.000Z' };
  s = mergeRemote(s, [rec]);

  assert.equal(s.data.days['2026-06-10'].meals[0].nutrition.calories, 900);
  assert.equal(s.dirty.days['2026-06-10'], undefined, 'remote win clears the dirty flag');
});

test('older remote record does NOT overwrite a newer local edit', () => {
  let s = state();
  ({ meta: s.meta, dirty: s.dirty } = bumpDay(s.meta, s.dirty, '2026-06-10', '2026-06-10T12:00:00.000Z'));
  s.data.days['2026-06-10'] = day('2026-06-10', 700);

  const rec: SyncRecord = { kind: 'day', key: '2026-06-10', payload: day('2026-06-10', 100), deleted: false, updatedAt: '2026-06-10T11:00:00.000Z' };
  s = mergeRemote(s, [rec]);

  assert.equal(s.data.days['2026-06-10'].meals[0].nutrition.calories, 700, 'local edit survives');
  assert.equal(s.dirty.days['2026-06-10'], true, 'still dirty so it pushes up');
});

test('edits to different days both survive (no clobber)', () => {
  let s = state();
  ({ meta: s.meta, dirty: s.dirty } = bumpDay(s.meta, s.dirty, '2026-06-10', '2026-06-10T12:00:00.000Z'));
  s.data.days['2026-06-10'] = day('2026-06-10', 700); // local edit on Mon

  const remoteTue: SyncRecord = { kind: 'day', key: '2026-06-11', payload: day('2026-06-11', 1500), deleted: false, updatedAt: '2026-06-11T09:00:00.000Z' };
  s = mergeRemote(s, [remoteTue]);

  assert.equal(s.data.days['2026-06-10'].meals[0].nutrition.calories, 700);
  assert.equal(s.data.days['2026-06-11'].meals[0].nutrition.calories, 1500);
});

test('template delete tombstone removes the meal and blocks resurrection', () => {
  let s = state();
  const tmpl: MealTemplate = { id: 't1', name: 'Wrap', serving: '1', tags: [], nutrition: { calories: 400, protein: 10, carbs: 40, fat: 18, fiber: 5, sugar: 4 }, createdAt: '2026-06-01T00:00:00.000Z' };
  s.data.library = [tmpl];
  ({ meta: s.meta, dirty: s.dirty } = bumpTemplate(s.meta, s.dirty, 't1', '2026-06-01T00:00:00.000Z'));

  // delete locally
  ({ meta: s.meta, dirty: s.dirty } = bumpDeletedTemplate(s.meta, s.dirty, 't1', '2026-06-12T10:00:00.000Z'));
  s.data.library = s.data.library.filter((t) => t.id !== 't1');

  // an older "upsert" arrives from the other device — must NOT resurrect
  const stale: SyncRecord = { kind: 'template', key: 't1', payload: tmpl, deleted: false, updatedAt: '2026-06-05T00:00:00.000Z' };
  s = mergeRemote(s, [stale]);
  assert.equal(s.data.library.length, 0, 'stale upsert is ignored');

  // the delete should be collected for push as a tombstone
  const push = collectDirty(s);
  const rec = push.find((r) => r.kind === 'template' && r.key === 't1');
  assert.ok(rec && rec.deleted, 'delete is pushed as a tombstone');
});

test('collectDirty + clearPushed round-trips, and a re-edit stays dirty', () => {
  let s = state();
  ({ meta: s.meta, dirty: s.dirty } = bumpDay(s.meta, s.dirty, '2026-06-10', '2026-06-10T08:00:00.000Z'));
  s.data.days['2026-06-10'] = day('2026-06-10', 500);

  const pushed = collectDirty(s);
  assert.equal(pushed.length, 1);

  // cleared because the timestamp still matches
  const afterClear = clearPushed(s, pushed);
  assert.equal(afterClear.dirty.days['2026-06-10'], undefined);

  // but if it was re-edited mid-flight (newer ts), the clear must keep it dirty
  let s2 = state();
  ({ meta: s2.meta, dirty: s2.dirty } = bumpDay(s2.meta, s2.dirty, '2026-06-10', '2026-06-10T08:00:00.000Z'));
  const inflight = collectDirty(s2);
  ({ meta: s2.meta, dirty: s2.dirty } = bumpDay(s2.meta, s2.dirty, '2026-06-10', '2026-06-10T08:30:00.000Z'));
  const afterClear2 = clearPushed(s2, inflight);
  assert.equal(afterClear2.dirty.days['2026-06-10'], true, 're-edit stays dirty');
});

test('markAllDirty flags every record for upload', () => {
  let s = state();
  s.data.days['2026-06-10'] = day('2026-06-10', 500);
  s.data.library = [{ id: 't1', name: 'x', serving: '1', tags: [], nutrition: { calories: 1, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 }, createdAt: '2026-06-01T00:00:00.000Z' }];
  s = markAllDirty(s);
  const push = collectDirty(s);
  assert.equal(push.length, 3, 'day + template + settings all dirty');
});
