import { useMemo } from 'react';
import {
  Bar, BarChart, Cell, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useApp } from '../../state/AppContext';
import { dayTotals, hasEntries, streak } from '../../lib/stats';
import { formatLong, lastNDays, todayKey, weekdayShort } from '../../lib/dates';
import { ProgressRing } from '../ui/ProgressRing';
import { IconBolt, IconDrop, IconFlame, IconPlus } from '../ui/icons';
import { COLORS, axisProps, tooltipProps } from '../ui/chartTheme';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Burning the midnight oil';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function Dashboard() {
  const { data, openDay } = useApp();
  const today = todayKey();
  const { settings } = data;
  const totals = dayTotals(data.days[today]);
  const currentStreak = streak(data, today);

  const week = useMemo(() => {
    return lastNDays(today, 7).map((key) => {
      const t = dayTotals(data.days[key]);
      return {
        key,
        day: weekdayShort(key),
        calories: Math.round(t.calories),
        burned: Math.round(t.burned),
        water: t.waterMl,
        logged: hasEntries(data.days[key]),
      };
    });
  }, [data.days, today]);

  const macroData = useMemo(() => {
    const items = [
      { name: 'Protein', grams: Math.round(totals.protein), kcal: totals.protein * 4, color: COLORS.cyan },
      { name: 'Carbs', grams: Math.round(totals.carbs), kcal: totals.carbs * 4, color: COLORS.magenta },
      { name: 'Fat', grams: Math.round(totals.fat), kcal: totals.fat * 9, color: COLORS.amber },
    ];
    return items.filter((i) => i.kcal > 0);
  }, [totals]);

  const todayLog = data.days[today];
  const timeline = useMemo(() => {
    if (!todayLog) return [];
    const items = [
      ...todayLog.meals.map((m) => ({
        id: m.id,
        time: m.time ?? '',
        title: m.name,
        sub: `${m.slot}${m.servings !== 1 ? ` · ${m.servings}×` : ''}`,
        value: `+${Math.round(m.nutrition.calories * m.servings)} kcal`,
        color: COLORS.cyan,
      })),
      ...todayLog.exercises.map((e) => ({
        id: e.id,
        time: e.time ?? '',
        title: e.name,
        sub: `${e.type} · ${e.durationMin} min`,
        value: `−${Math.round(e.caloriesBurned)} kcal`,
        color: COLORS.lime,
      })),
      ...todayLog.water.map((w) => ({
        id: w.id,
        time: w.time ?? '',
        title: 'Water',
        sub: 'hydration',
        value: `+${w.amountMl} ml`,
        color: COLORS.blue,
      })),
    ];
    return items.sort((a, b) => b.time.localeCompare(a.time)).slice(0, 8);
  }, [todayLog]);

  const remaining = settings.calorieLimit - totals.calories;

  return (
    <>
      <div className="view-head">
        <div>
          <h1 className="view-title">{greeting()}</h1>
          <div className="view-sub">{formatLong(today)}</div>
        </div>
        <div className="row wrap">
          <div className="streak-chip" title="Consecutive days with at least one entry">
            <IconFlame /> {currentStreak} day streak
          </div>
          <button className="btn btn-primary" onClick={() => openDay(today)}>
            <IconPlus /> Log today
          </button>
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 16 }}>
        <div className="card" style={{ display: 'grid', placeItems: 'center' }}>
          <ProgressRing
            value={totals.calories}
            max={settings.calorieLimit}
            color={COLORS.cyan}
            overColor={COLORS.red}
            label="Calories"
            display={`${Math.round(totals.calories)}`}
            sub={`of ${settings.calorieLimit} kcal`}
          />
        </div>
        <div className="card" style={{ display: 'grid', placeItems: 'center' }}>
          <ProgressRing
            value={totals.waterMl}
            max={settings.waterGoalMl}
            color={COLORS.blue}
            label="Water"
            display={`${(totals.waterMl / 1000).toFixed(1)}L`}
            sub={`of ${(settings.waterGoalMl / 1000).toFixed(1)} L`}
          />
        </div>
        <div className="card" style={{ display: 'grid', placeItems: 'center' }}>
          <ProgressRing
            value={totals.exerciseMin}
            max={settings.exerciseGoalMin}
            color={COLORS.lime}
            label="Exercise"
            display={`${Math.round(totals.exerciseMin)}`}
            sub={`of ${settings.exerciseGoalMin} min`}
          />
        </div>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 18 }}>
          <div className="stat">
            <span className="stat-label"><IconBolt size={12} /> Net calories</span>
            <span className="stat-value" style={{ color: totals.net > settings.calorieLimit ? COLORS.red : COLORS.lime }}>
              {Math.round(totals.net)}
            </span>
            <span className="small muted">intake − burned</span>
          </div>
          <div className="stat">
            <span className="stat-label">Remaining today</span>
            <span className="stat-value" style={{ color: remaining >= 0 ? COLORS.cyan : COLORS.red }}>
              {remaining >= 0 ? Math.round(remaining) : `+${Math.round(-remaining)}`}
            </span>
            <span className="small muted">{remaining >= 0 ? 'kcal under limit' : 'kcal over limit'}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-2" style={{ marginBottom: 16 }}>
        <div className="card">
          <h2 className="card-title">Last 7 days · intake vs limit</h2>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={week} barSize={26}>
              <XAxis dataKey="day" {...axisProps} />
              <YAxis {...axisProps} width={42} />
              <Tooltip {...tooltipProps} />
              <ReferenceLine
                y={settings.calorieLimit}
                stroke={COLORS.magenta}
                strokeDasharray="6 4"
                ifOverflow="extendDomain"
                label={{ value: 'limit', fill: COLORS.magenta, fontSize: 11, position: 'insideTopRight' }}
              />
              <Bar dataKey="calories" name="kcal in" radius={[6, 6, 0, 0]}>
                {week.map((d) => (
                  <Cell
                    key={d.key}
                    fill={!d.logged ? 'rgba(110,180,255,0.12)' : d.calories > settings.calorieLimit ? COLORS.amber : COLORS.cyan}
                    fillOpacity={0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2 className="card-title">Today's macros</h2>
          {macroData.length === 0 ? (
            <div className="empty-hint" style={{ height: 200, display: 'grid', placeItems: 'center' }}>
              Log a meal to see the macro breakdown.
            </div>
          ) : (
            <div className="row" style={{ gap: 18 }}>
              <ResponsiveContainer width="55%" height={210}>
                <PieChart>
                  <Pie
                    data={macroData} dataKey="kcal" nameKey="name"
                    innerRadius={58} outerRadius={86} paddingAngle={4}
                    stroke="none"
                  >
                    {macroData.map((m) => (
                      <Cell key={m.name} fill={m.color} style={{ filter: `drop-shadow(0 0 5px ${m.color})` }} />
                    ))}
                  </Pie>
                  <Tooltip {...tooltipProps} formatter={(v) => `${Math.round(Number(v ?? 0))} kcal`} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {macroData.map((m) => (
                  <div key={m.name} className="stat">
                    <span className="stat-label" style={{ color: m.color }}>{m.name}</span>
                    <span className="stat-value" style={{ fontSize: 19 }}>{m.grams} g</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h2 className="card-title"><span><IconDrop size={13} /> Water · last 7 days</span></h2>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={week} barSize={26}>
              <XAxis dataKey="day" {...axisProps} />
              <YAxis {...axisProps} width={48} tickFormatter={(v: number) => `${v / 1000}L`} />
              <Tooltip {...tooltipProps} formatter={(v) => `${v ?? 0} ml`} />
              <ReferenceLine y={settings.waterGoalMl} stroke={COLORS.blue} strokeDasharray="6 4" ifOverflow="extendDomain" />
              <Bar dataKey="water" name="water" fill={COLORS.blue} fillOpacity={0.8} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2 className="card-title">Today's activity</h2>
          {timeline.length === 0 ? (
            <div className="empty-hint">Nothing logged yet today — hit “Log today” to begin.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {timeline.map((item) => (
                <div key={item.id} className="entry-row" style={{ padding: '7px 10px' }}>
                  <span className="mono small muted" style={{ width: 44 }}>{item.time}</span>
                  <div className="entry-main">
                    <div className="entry-name" style={{ fontSize: 13.5 }}>{item.title}</div>
                    <div className="entry-sub">{item.sub}</div>
                  </div>
                  <span className="mono small" style={{ color: item.color, fontWeight: 700 }}>{item.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
