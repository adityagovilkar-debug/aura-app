// Central data model. Everything the app persists lives in `AppData`,
// which serializes to a single portable JSON document.

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export const MEAL_SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export interface Nutrition {
  calories: number;
  protein: number; // grams
  carbs: number;   // grams
  fat: number;     // grams
  fiber: number;   // grams
  sugar: number;   // grams
}

/** A reusable meal saved in the library. Nutrition is per single serving. */
export interface MealTemplate {
  id: string;
  name: string;
  serving: string; // human description, e.g. "1 bowl (250 g)"
  tags: string[];
  nutrition: Nutrition;
  createdAt: string; // ISO timestamp
}

/** A meal actually eaten on a specific day. */
export interface MealEntry {
  id: string;
  templateId?: string; // present when added from the library
  name: string;
  slot: MealSlot;
  servings: number;
  nutrition: Nutrition; // per serving — multiply by `servings` for totals
  time?: string; // "HH:mm"
}

export interface WaterEntry {
  id: string;
  amountMl: number;
  time?: string;
}

export type ExerciseType = 'cardio' | 'strength' | 'flexibility' | 'sports' | 'other';

export const EXERCISE_TYPES: ExerciseType[] = ['cardio', 'strength', 'flexibility', 'sports', 'other'];

export interface ExerciseEntry {
  id: string;
  name: string;
  type: ExerciseType;
  durationMin: number;
  caloriesBurned: number;
  notes?: string;
  time?: string;
}

/** Everything logged for one calendar day. */
export interface DayLog {
  date: string; // YYYY-MM-DD
  meals: MealEntry[];
  water: WaterEntry[];
  exercises: ExerciseEntry[];
  weightKg?: number;
  notes?: string;
}

export interface Settings {
  calorieLimit: number;   // kcal/day
  waterGoalMl: number;    // ml/day
  proteinGoalG: number;
  carbsGoalG: number;
  fatGoalG: number;
  exerciseGoalMin: number; // minutes/day
  waterPresets: number[];  // quick-add buttons, in ml
  trackingStart: string;   // first day the app considers "trackable" (YYYY-MM-DD)
}

export interface AppData {
  version: 1;
  settings: Settings;
  library: MealTemplate[];
  days: Record<string, DayLog>; // keyed by YYYY-MM-DD
}
