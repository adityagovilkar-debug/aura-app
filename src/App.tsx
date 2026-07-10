import { AppProvider, useApp } from './state/AppContext';
import { SyncProvider } from './state/SyncProvider';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/views/Dashboard';
import { DailyLog } from './components/views/DailyLog';
import { CalendarView } from './components/views/CalendarView';
import { Library } from './components/views/Library';
import { Reports } from './components/views/Reports';
import { SettingsView } from './components/views/SettingsView';

function CurrentView() {
  const { view } = useApp();
  switch (view) {
    case 'dashboard': return <Dashboard />;
    case 'log': return <DailyLog />;
    case 'calendar': return <CalendarView />;
    case 'library': return <Library />;
    case 'reports': return <Reports />;
    case 'settings': return <SettingsView />;
  }
}

export default function App() {
  return (
    <AppProvider>
      <SyncProvider>
        <div className="app-shell">
          <Sidebar />
          <main className="main">
            <CurrentView />
          </main>
        </div>
      </SyncProvider>
    </AppProvider>
  );
}
