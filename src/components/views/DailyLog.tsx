import { useState } from 'react';
import type { MealSlot } from '../../types';
import { MEAL_SLOTS } from '../../types';
import { useApp } from '../../state/AppContext';
import { dayTotals } from '../../lib/stats';
import { addDays, formatLong, todayKey } from '../../lib/dates';
import { MealModal } from '../forms/MealModal';
import { ExerciseModal } from '../forms/ExerciseModal';
import {
  IconBolt, IconCalendar, IconChevronLeft, IconChevronRight, IconDrop, IconPlus, IconTrash,
} from '../ui/icons';
import { COLORS } from '../ui/chartTheme';

const SLOT_EMOJI: Record<MealSlot, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '⚡',
};

export function DailyLog() {
  const {
    data, selectedDate, setSelectedDate, setView,
    removeMeal, addWater, removeWater, removeExercise, setDayMeta,
  } = useApp();
  const today = todayKey();
  const day = data.days[selectedDate];
  const totals = dayTotals(day);
  const { settings } = data;

  const [mealModalSlot, setMealModalSlot] = useState<MealSlot | null>(null);
  const [exerciseOpen, setExerciseOpen] = useState(false);
  const [customWater, setCustomWater] = useState('');

  const isToday = selectedDate === today;
  const isFuture = selectedDate > today;

  return (
    <>
      <div className="view-head">
        <div>
          <h1 className="view-title">Daily log</h1>
          <div className="view-sub">
            {formatLong(selectedDate)}
            {isToday && <span style={{ color: COLORS.cyan }}> · today</span>}
            {isFuture && <span style={{ color: COLORS.amber }}> · future date</span>}
          </div>
        </div>
        <div className="row">
          <button className="btn btn-sm" onClick={() => setSelectedDate(addDays(selectedDate, -1))} aria-label="Previous day">
            <IconChevronLeft />
          </button>
          {!isToday && (
            <button className="btn btn-sm" onClick={() => setSelectedDate(today)}>Today</button>
          )}
          <button className="btn btn-sm" onClick={() => setView('calendar')} aria-label="Open calendar">
            <IconCalendar size={15} />
          </button>
          <button className="btn btn-sm" onClick={() => setSelectedDate(addDays(selectedDate, 1))} aria-label="Next day">
            <IconChevronRight />
          </button>
        </div>
      </div>

      {/* day summary strip */}
      <div className="card" style={{ marginBottom: 16, padding: '16px 22px' }}>
        <div className="row wrap" style={{ gap: 32 }}>
          <div className="stat">
            <span className="stat-label">Intake</span>
            <span className="stat-value" style={{ color: totals.calories > settings.calorieLimit ? COLORS.red : COLORS.cyan }}>
              {Math.round(totals.calories)} <span className="small muted">/ {settings.calorieLimit} kcal</span>
            </span>
          </div>
          <div className="stat">
            <span className="stat-label">Burned</span>
            <span className="stat-value" style={{ color: COLORS.lime }}>{Math.round(totals.burned)} <span className="small muted">kcal</span></span>
          </div>
          <div className="stat">
            <span className="stat-label">Water</span>
            <span className="stat-value" style={{ color: COLORS.blue }}>
              {totals.waterMl} <span className="small muted">/ {settings.waterGoalMl} ml</span>
            </span>
          </div>
          <div className="stat">
            <span className="stat-label">Protein</span>
            <span className="stat-value" style={{ color: COLORS.magenta }}>{Math.round(totals.protein)} <span className="small muted">g</span></span>
          </div>
          <div className="spacer" />
          <div className="stat">
            <span className="stat-label">Net</span>
            <span className="stat-value">{Math.round(totals.net)} <span className="small muted">kcal</span></span>
          </div>
        </div>
      </div>

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        {/* meals column */}
        <div className="grid" style={{ gap: 14 }}>
          {MEAL_SLOTS.map((slot) => {
            const meals = day?.meals.filter((m) => m.slot === slot) ?? [];
            const slotKcal = meals.reduce((s, m) => s + m.nutrition.calories * m.servings, 0);
            return (
              <div className="card" key={slot} style={{ padding: 16 }}>
                <div className="slot-head">
                  <span className="slot-name">{SLOT_EMOJI[slot]} {slot}</span>
                  <div className="row">
                    {slotKcal > 0 && <span className="mono small" style={{ color: COLORS.cyan }}>{Math.round(slotKcal)} kcal</span>}
                    <button className="btn btn-sm" onClick={() => setMealModalSlot(slot)}>
                      <IconPlus size={13} /> Add
                    </button>
                  </div>
                </div>
                {meals.length === 0 ? (
                  <div className="empty-hint" style={{ padding: '10px 12px' }}>Nothing logged for {slot}.</div>
                ) : (
                  meals.map((m) => (
                    <div className="entry-row" key={m.id}>
                      <div className="entry-main">
                        <div className="entry-name">{m.name}{m.servings !== 1 && <span className="muted small"> × {m.servings}</span>}</div>
                        <div className="entry-sub">
                          P {Math.round(m.nutrition.protein * m.servings)}g ·
                          C {Math.round(m.nutrition.carbs * m.servings)}g ·
                          F {Math.round(m.nutrition.fat * m.servings)}g
                          {m.time ? ` · ${m.time}` : ''}
                        </div>
                      </div>
                      <span className="entry-kcal">{Math.round(m.nutrition.calories * m.servings)}</span>
                      <button className="btn-icon" onClick={() => removeMeal(selectedDate, m.id)} aria-label={`Remove ${m.name}`}>
                        <IconTrash />
                      </button>
                    </div>
                  ))
                )}
              </div>
            );
          })}
        </div>

        {/* water + exercise + notes column */}
        <div className="grid" style={{ gap: 14 }}>
          <div className="card" style={{ padding: 16 }}>
            <div className="slot-head">
              <span className="slot-name" style={{ color: COLORS.blue }}><IconDrop size={13} /> Water</span>
              <span className="mono small" style={{ color: COLORS.blue }}>{totals.waterMl} / {settings.waterGoalMl} ml</span>
            </div>
            {/* hydration progress bar */}
            <div style={{ height: 8, borderRadius: 6, background: 'rgba(96,165,250,0.12)', overflow: 'hidden', marginBottom: 12 }}>
              <div style={{
                height: '100%', width: `${Math.min((totals.waterMl / settings.waterGoalMl) * 100, 100)}%`,
                background: `linear-gradient(90deg, ${COLORS.blue}, ${COLORS.cyan})`,
                boxShadow: `0 0 10px ${COLORS.blue}`,
                transition: 'width 0.5s ease',
              }} />
            </div>
            <div className="row wrap" style={{ marginBottom: 10 }}>
              {settings.waterPresets.map((ml) => (
                <button key={ml} className="water-btn" onClick={() => addWater(selectedDate, ml)}>+{ml} ml</button>
              ))}
              <input
                className="input mono" style={{ width: 90, padding: '8px 10px' }}
                placeholder="ml…" type="number" min={0}
                value={customWater}
                onChange={(e) => setCustomWater(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && Number(customWater) > 0) {
                    addWater(selectedDate, Number(customWater));
                    setCustomWater('');
                  }
                }}
              />
            </div>
            {day && day.water.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {day.water.map((w) => (
                  <div className="entry-row" key={w.id} style={{ padding: '5px 10px' }}>
                    <span className="mono small muted" style={{ width: 44 }}>{w.time ?? ''}</span>
                    <div className="entry-main small" style={{ color: '#bcd8ff' }}>{w.amountMl} ml</div>
                    <button className="btn-icon" onClick={() => removeWater(selectedDate, w.id)} aria-label="Remove water entry">
                      <IconTrash size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card" style={{ padding: 16 }}>
            <div className="slot-head">
              <span className="slot-name" style={{ color: COLORS.lime }}><IconBolt size={13} /> Workouts</span>
              <button className="btn btn-sm" onClick={() => setExerciseOpen(true)}>
                <IconPlus size={13} /> Log
              </button>
            </div>
            {!day || day.exercises.length === 0 ? (
              <div className="empty-hint" style={{ padding: '10px 12px' }}>No workouts logged.</div>
            ) : (
              day.exercises.map((e) => (
                <div className="entry-row" key={e.id}>
                  <div className="entry-main">
                    <div className="entry-name">{e.name}</div>
                    <div className="entry-sub">
                      {e.type} · {e.durationMin} min{e.notes ? ` · ${e.notes}` : ''}
                    </div>
                  </div>
                  <span className="mono" style={{ color: COLORS.lime, fontWeight: 700 }}>−{Math.round(e.caloriesBurned)}</span>
                  <button className="btn-icon" onClick={() => removeExercise(selectedDate, e.id)} aria-label={`Remove ${e.name}`}>
                    <IconTrash />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="card" style={{ padding: 16 }}>
            <div className="slot-head"><span className="slot-name">Body & notes</span></div>
            <div className="grid grid-2" style={{ gap: 10 }}>
              <div className="field">
                <span className="field-label">Weight (kg)</span>
                <input
                  className="input mono" type="number" min={0} step={0.1}
                  value={day?.weightKg ?? ''}
                  placeholder="—"
                  onChange={(e) => setDayMeta(selectedDate, { weightKg: e.target.value === '' ? undefined : Number(e.target.value) })}
                />
              </div>
              <div className="field">
                <span className="field-label">Day notes</span>
                <input
                  className="input"
                  value={day?.notes ?? ''}
                  placeholder="How did the day go?"
                  onChange={(e) => setDayMeta(selectedDate, { notes: e.target.value || undefined })}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {mealModalSlot && (
        <MealModal open onClose={() => setMealModalSlot(null)} date={selectedDate} slot={mealModalSlot} />
      )}
      <ExerciseModal open={exerciseOpen} onClose={() => setExerciseOpen(false)} date={selectedDate} />
    </>
  );
}
