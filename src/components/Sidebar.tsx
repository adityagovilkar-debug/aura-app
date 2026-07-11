import { useApp } from '../state/AppContext';
import type { View } from '../state/AppContext';
import { streak } from '../lib/stats';
import { todayKey } from '../lib/dates';
import {
  IconCalendar, IconDashboard, IconLibrary, IconLog, IconReports, IconSettings,
} from './ui/icons';
import { SyncBadge } from './ui/SyncBadge';

// `short` labels are used by the mobile bottom bar, where space is tight.
const NAV: { view: View; label: string; short: string; icon: () => React.ReactElement }[] = [
  { view: 'dashboard', label: 'Dashboard', short: 'Home', icon: () => <IconDashboard /> },
  { view: 'log', label: 'Daily log', short: 'Log', icon: () => <IconLog /> },
  { view: 'calendar', label: 'Calendar', short: 'Calendar', icon: () => <IconCalendar size={18} /> },
  { view: 'library', label: 'Meal library', short: 'Meals', icon: () => <IconLibrary /> },
  { view: 'reports', label: 'Reports', short: 'Reports', icon: () => <IconReports /> },
  { view: 'settings', label: 'Settings', short: 'Settings', icon: () => <IconSettings /> },
];

export function Sidebar() {
  const { data, view, setView } = useApp();
  const currentStreak = streak(data, todayKey());

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2.2" strokeLinecap="round">
            <path d="M22 12h-4l-3 8-6-16-3 8H2" />
          </svg>
        </div>
        <div>
          <div className="brand-name">AURA</div>
          <div className="brand-sub">health deck</div>
        </div>
      </div>

      <nav className="nav">
        {NAV.map((item) => (
          <button
            key={item.view}
            className={`nav-item ${view === item.view ? 'active' : ''}`}
            onClick={() => setView(item.view)}
          >
            {item.icon()}
            <span className="nav-full">{item.label}</span>
            <span className="nav-short">{item.short}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-foot">
        <div style={{ marginBottom: 8 }}>🔥 {currentStreak}-day streak</div>
        <SyncBadge />
      </div>
    </aside>
  );
}
