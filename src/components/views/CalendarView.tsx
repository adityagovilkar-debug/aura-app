import { useState } from 'react';
import { useApp } from '../../state/AppContext';
import { dayStatus, dayTotals, hasEntries } from '../../lib/stats';
import { keyOf, monthLabel, todayKey } from '../../lib/dates';
import { IconChevronLeft, IconChevronRight } from '../ui/icons';

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function CalendarView() {
  const { data, openDay } = useApp();
  const today = todayKey();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-based

  const shift = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (string | null)[] = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => keyOf(new Date(year, month, i + 1))),
  ];

  const missedThisMonth = cells.filter((k) => k && dayStatus(data, k, today) === 'missed').length;

  return (
    <>
      <div className="view-head">
        <div>
          <h1 className="view-title">Calendar</h1>
          <div className="view-sub">
            Pick a date to read or edit its log
            {missedThisMonth > 0 && (
              <span style={{ color: 'var(--red)' }}> · {missedThisMonth} missed day{missedThisMonth > 1 ? 's' : ''} this month</span>
            )}
          </div>
        </div>
        <div className="row">
          <button className="btn btn-sm" onClick={() => shift(-1)} aria-label="Previous month"><IconChevronLeft /></button>
          <span className="mono" style={{ minWidth: 150, textAlign: 'center', fontWeight: 600 }}>
            {monthLabel(year, month)}
          </span>
          <button className="btn btn-sm" onClick={() => shift(1)} aria-label="Next month"><IconChevronRight /></button>
        </div>
      </div>

      <div className="card">
        <div className="cal-grid" style={{ marginBottom: 8 }}>
          {DOW.map((d) => <div className="cal-dow" key={d}>{d}</div>)}
        </div>
        <div className="cal-grid">
          {cells.map((key, i) => {
            if (!key) return <div key={`blank-${i}`} />;
            const status = dayStatus(data, key, today);
            const logged = hasEntries(data.days[key]);
            const t = logged ? dayTotals(data.days[key]) : null;
            const cls = [
              'cal-cell',
              status === 'within' && 's-within',
              status === 'over' && 's-over',
              status === 'missed' && 's-missed',
              key === today && 's-today',
            ].filter(Boolean).join(' ');
            return (
              <button
                key={key}
                className={cls}
                disabled={status === 'future'}
                onClick={() => openDay(key)}
                title={
                  status === 'missed' ? 'Missed — nothing was logged this day'
                    : status === 'within' ? 'Logged, within calorie limit'
                      : status === 'over' ? 'Logged, over calorie limit'
                        : undefined
                }
              >
                <span className="cal-num">{Number(key.slice(8))}</span>
                {t ? (
                  <span className="cal-kcal">{Math.round(t.calories)} kcal</span>
                ) : status === 'missed' ? (
                  <span className="cal-kcal" style={{ color: 'var(--red)' }}>missed</span>
                ) : (
                  <span className="cal-kcal">—</span>
                )}
              </button>
            );
          })}
        </div>

        <hr className="divider" />
        <div className="legend">
          <span className="legend-item">
            <span className="legend-dot" style={{ borderColor: 'rgba(163,230,53,0.7)', background: 'rgba(163,230,53,0.15)' }} />
            Within limit
          </span>
          <span className="legend-item">
            <span className="legend-dot" style={{ borderColor: 'rgba(251,191,36,0.8)', background: 'rgba(251,191,36,0.15)' }} />
            Over limit
          </span>
          <span className="legend-item">
            <span className="legend-dot" style={{ borderColor: 'rgba(251,113,133,0.7)', background: 'rgba(251,113,133,0.12)' }} />
            Missed day
          </span>
          <span className="legend-item">
            <span className="legend-dot" style={{ borderColor: 'rgba(34,211,238,0.9)', background: 'rgba(34,211,238,0.15)' }} />
            Today
          </span>
          <span className="legend-item">
            <span className="legend-dot" style={{ borderColor: 'var(--line)' }} />
            Not tracked
          </span>
        </div>
      </div>
    </>
  );
}
