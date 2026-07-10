import type { AppData, DayLog } from '../types';
import { addDays } from './dates';

export interface DayTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  waterMl: number;
  burned: number;
  exerciseMin: number;
  net: number; // calories in − calories burned
}

export function emptyDay(date: string): DayLog {
  return { date, meals: [], water: [], exercises: [] };
}

export function dayTotals(day?: DayLog): DayTotals {
  const t: DayTotals = {
    calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0,
    waterMl: 0, burned: 0, exerciseMin: 0, net: 0,
  };
  if (!day) return t;
  for (const m of day.meals) {
    t.calories += m.nutrition.calories * m.servings;
    t.protein += m.nutrition.protein * m.servings;
    t.carbs += m.nutrition.carbs * m.servings;
    t.fat += m.nutrition.fat * m.servings;
    t.fiber += m.nutrition.fiber * m.servings;
    t.sugar += m.nutrition.sugar * m.servings;
  }
  for (const w of day.water) t.waterMl += w.amountMl;
  for (const e of day.exercises) {
    t.burned += e.caloriesBurned;
    t.exerciseMin += e.durationMin;
  }
  t.net = t.calories - t.burned;
  return t;
}

export function hasEntries(day?: DayLog): boolean {
  return !!day && (day.meals.length > 0 || day.water.length > 0 || day.exercises.length > 0);
}

export type DayStatus = 'future' | 'untracked' | 'missed' | 'within' | 'over';

/**
 * Status of a day for the calendar:
 *  - future:     after today
 *  - untracked:  before tracking started, or today with nothing logged yet
 *  - missed:     a past trackable day with no entries
 *  - within:     logged, calories at or under the daily limit
 *  - over:       logged, calories over the daily limit
 */
export function dayStatus(data: AppData, key: string, today: string): DayStatus {
  if (key > today) return 'future';
  const day = data.days[key];
  if (!hasEntries(day)) {
    if (key < data.settings.trackingStart || key === today) return 'untracked';
    return 'missed';
  }
  const t = dayTotals(day);
  return t.calories <= data.settings.calorieLimit ? 'within' : 'over';
}

/** Consecutive logged days ending today (an unlogged today doesn't break it). */
export function streak(data: AppData, today: string): number {
  let k = today;
  if (!hasEntries(data.days[k])) k = addDays(k, -1);
  let n = 0;
  while (hasEntries(data.days[k])) {
    n++;
    k = addDays(k, -1);
  }
  return n;
}

export interface RangeSummary {
  daysLogged: number;
  daysWithinLimit: number;
  avgCalories: number;   // over logged days only
  totalBurned: number;
  totalExerciseMin: number;
  totalWaterMl: number;
  avgWaterMl: number;
  avgProtein: number;
  avgCarbs: number;
  avgFat: number;
}

export function summarize(data: AppData, keys: string[]): RangeSummary {
  let daysLogged = 0, daysWithinLimit = 0;
  let cal = 0, burned = 0, exMin = 0, water = 0, p = 0, c = 0, f = 0;
  for (const k of keys) {
    const day = data.days[k];
    if (!hasEntries(day)) continue;
    daysLogged++;
    const t = dayTotals(day);
    cal += t.calories;
    burned += t.burned;
    exMin += t.exerciseMin;
    water += t.waterMl;
    p += t.protein; c += t.carbs; f += t.fat;
    if (t.calories <= data.settings.calorieLimit) daysWithinLimit++;
  }
  const div = Math.max(daysLogged, 1);
  return {
    daysLogged,
    daysWithinLimit,
    avgCalories: Math.round(cal / div),
    totalBurned: Math.round(burned),
    totalExerciseMin: Math.round(exMin),
    totalWaterMl: Math.round(water),
    avgWaterMl: Math.round(water / div),
    avgProtein: Math.round(p / div),
    avgCarbs: Math.round(c / div),
    avgFat: Math.round(f / div),
  };
}
