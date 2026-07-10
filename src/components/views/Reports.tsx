import { useMemo, useState } from 'react';
import {
  Area, AreaChart, Bar, BarChart, Cell, Line, LineChart, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useApp } from '../../state/AppContext';
import { dayTotals, hasEntries, summarize } from '../../lib/stats';
import { addDays, formatShort, lastNDays, todayKey, weekOf, weekdayShort } from '../../lib/dates';
import { IconChevronLeft, IconChevronRight } from '../ui/icons';
import { COLORS, axisProps, tooltipProps } from '../ui/chartTheme';

function Delta({ current, previous, invert = false, unit = '' }: {
  current: number;
  previous: number;
  /** When true, a decrease is shown as good (green) — e.g. average calories. */
  invert?: boolean;
  unit?: string;
}) {
  const diff = current - previous;
  if (previous === 0 || diff === 0) return <span className="stat-delta delta-flat">— vs last week</span>;
  const good = invert ? diff < 0 : diff > 0;
  return (
    <span className={`stat-delta ${good ? 'delta-up' : 'delta-down'}`}>
      {diff > 0 ? '▲' : '▼'} {Math.abs(Math.round(diff))}{unit} vs last week
    </span>
  );
}

export function Reports() {
  const { data } = useApp();
  const today = todayKey();
  const [offset, setOffset] = useState(0); // 0 = this week, -1 = last week…

  const weekKeys = useMemo(() => weekOf(addDays(today, offset * 7)), [today, offset]);
  const prevKeys = useMemo(() => weekKeys.map((k) => addDays(k, -7)), [weekKeys]);

  const current = useMemo(() => summarize(data, weekKeys), [data, weekKeys]);
  const previous = useMemo(() => summarize(data, prevKeys), [data, prevKeys]);

  const daily = useMemo(() => weekKeys.map((key) => {
    const t = dayTotals(data.days[key]);
    return {
      key,
      day: weekdayShort(key),
      calories: Math.round(t.calories),
      protein: Math.round(t.protein),
      carbs: Math.round(t.carbs),
      fat: Math.round(t.fat),
      burned: Math.round(t.burned),
      minutes: Math.round(t.exerciseMin),
      water: t.waterMl,
      logged: hasEntries(data.days[key]),
    };
  }), [data.days, weekKeys]);

  const weightSeries = useMemo(() => {
    return lastNDays(today, 30)
      .map((key) => ({ key, label: formatShort(key), weight: data.days[key]?.weightKg ?? null }))
      .filter((_, i, arr) => arr.some((x) => x.weight !== null) || i === 0);
  }, [data.days, today]);
  const hasWeight = weightSeries.some((w) => w.weight !== null);

  const limit = data.settings.calorieLimit;
  const label = offset === 0 ? 'This week' : offset === -1 ? 'Last week' : `${-offset} weeks ago`;

  return (
    <>
      <div className="view-head">
        <div>
          <h1 className="view-title">Weekly report</h1>
          <div className="view-sub">
            {formatShort(weekKeys[0])} – {formatShort(weekKeys[6])} · {current.daysLogged}/7 days logged
          </div>
        </div>
        <div className="row">
          <button className="btn btn-sm" onClick={() => setOffset(offset - 1)} aria-label="Previous week"><IconChevronLeft /></button>
          <span className="mono" style={{ minWidth: 120, textAlign: 'center', fontWeight: 600 }}>{label}</span>
          <button className="btn btn-sm" disabled={offset >= 0} style={{ opacity: offset >= 0 ? 0.4 : 1 }} onClick={() => setOffset(offset + 1)} aria-label="Next week">
            <IconChevronRight />
          </button>
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 16 }}>
        <div className="card stat">
          <span className="stat-label">Avg daily intake</span>
          <span className="stat-value" style={{ color: COLORS.cyan }}>{current.avgCalories} <span className="small muted">kcal</span></span>
          <Delta current={current.avgCalories} previous={previous.avgCalories} invert unit=" kcal" />
        </div>
        <div className="card stat">
          <span className="stat-label">Days within limit</span>
          <span className="stat-value" style={{ color: COLORS.lime }}>{current.daysWithinLimit}<span className="small muted">/{current.daysLogged || 0}</span></span>
          <Delta current={current.daysWithinLimit} previous={previous.daysWithinLimit} />
        </div>
        <div className="card stat">
          <span className="stat-label">Calories burned</span>
          <span className="stat-value" style={{ color: COLORS.amber }}>{current.totalBurned} <span className="small muted">kcal</span></span>
          <Delta current={current.totalBurned} previous={previous.totalBurned} unit=" kcal" />
        </div>
        <div className="card stat">
          <span className="stat-label">Exercise time</span>
          <span className="stat-value" style={{ color: COLORS.magenta }}>{current.totalExerciseMin} <span className="small muted">min</span></span>
          <Delta current={current.totalExerciseMin} previous={previous.totalExerciseMin} unit=" min" />
        </div>
      </div>

      <div className="grid grid-2" style={{ marginBottom: 16 }}>
        <div className="card">
          <h2 className="card-title">Daily intake vs limit</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={daily} barSize={26}>
              <XAxis dataKey="day" {...axisProps} />
              <YAxis {...axisProps} width={42} />
              <Tooltip {...tooltipProps} />
              <ReferenceLine y={limit} stroke={COLORS.magenta} strokeDasharray="6 4" ifOverflow="extendDomain" />
              <Bar dataKey="calories" name="kcal" radius={[6, 6, 0, 0]}>
                {daily.map((d) => (
                  <Cell
                    key={d.key}
                    fill={!d.logged ? 'rgba(110,180,255,0.12)' : d.calories > limit ? COLORS.amber : COLORS.cyan}
                    fillOpacity={0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2 className="card-title">Macros per day (g)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={daily} barSize={26}>
              <XAxis dataKey="day" {...axisProps} />
              <YAxis {...axisProps} width={36} />
              <Tooltip {...tooltipProps} />
              <Bar dataKey="protein" name="protein" stackId="m" fill={COLORS.cyan} fillOpacity={0.85} />
              <Bar dataKey="carbs" name="carbs" stackId="m" fill={COLORS.magenta} fillOpacity={0.8} />
              <Bar dataKey="fat" name="fat" stackId="m" fill={COLORS.amber} fillOpacity={0.8} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-2" style={{ marginBottom: 16 }}>
        <div className="card">
          <h2 className="card-title">Hydration (ml)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={daily}>
              <defs>
                <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.blue} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={COLORS.blue} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" {...axisProps} />
              <YAxis {...axisProps} width={48} />
              <Tooltip {...tooltipProps} formatter={(v) => `${v ?? 0} ml`} />
              <ReferenceLine y={data.settings.waterGoalMl} stroke={COLORS.blue} strokeDasharray="6 4" ifOverflow="extendDomain" />
              <Area type="monotone" dataKey="water" name="water" stroke={COLORS.blue} strokeWidth={2} fill="url(#waterGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2 className="card-title">Workout burn (kcal)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={daily} barSize={26}>
              <XAxis dataKey="day" {...axisProps} />
              <YAxis {...axisProps} width={42} />
              <Tooltip {...tooltipProps} />
              <Bar dataKey="burned" name="burned" fill={COLORS.lime} fillOpacity={0.85} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">Weight · last 30 days</h2>
        {hasWeight ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={weightSeries}>
              <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={28} />
              <YAxis {...axisProps} width={42} domain={['dataMin - 1', 'dataMax + 1']} />
              <Tooltip {...tooltipProps} formatter={(v) => `${v ?? 0} kg`} />
              <Line
                type="monotone" dataKey="weight" name="kg"
                stroke={COLORS.magenta} strokeWidth={2}
                dot={{ r: 3, fill: COLORS.magenta }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="empty-hint">Record your weight in the daily log to see the trend here.</div>
        )}
      </div>
    </>
  );
}
