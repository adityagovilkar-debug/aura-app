import { useRef, useState } from 'react';
import { useApp } from '../../state/AppContext';
import { defaultData, exportToFile, parseImport } from '../../lib/storage';
import { hasEntries } from '../../lib/stats';
import { NumField } from '../forms/fields';
import { CloudSyncCard } from './CloudSyncCard';

export function SettingsView() {
  const { data, updateSettings, replaceData } = useApp();
  const { settings } = data;
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const daysLogged = Object.values(data.days).filter((d) => hasEntries(d)).length;

  const onImportFile = async (file: File) => {
    try {
      const imported = parseImport(await file.text());
      const importedDays = Object.values(imported.days).filter((d) => hasEntries(d)).length;
      const ok = window.confirm(
        `Replace all current data with this backup?\n\nBackup contains ${importedDays} logged days and ${imported.library.length} library meals.\nYour current ${daysLogged} logged days will be overwritten.`,
      );
      if (!ok) return;
      replaceData(imported);
      setMessage({ kind: 'ok', text: 'Backup imported successfully.' });
    } catch (e) {
      setMessage({ kind: 'err', text: e instanceof Error ? e.message : 'Import failed.' });
    }
  };

  return (
    <>
      <div className="view-head">
        <div>
          <h1 className="view-title">Settings</h1>
          <div className="view-sub">Daily goals, quick-add presets, and your data</div>
        </div>
      </div>

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <div className="grid" style={{ gap: 16 }}>
          <div className="card">
            <h2 className="card-title">Daily goals</h2>
            <div className="grid grid-2" style={{ gap: 12 }}>
              <NumField label="Calorie limit" suffix="kcal" value={settings.calorieLimit} onChange={(n) => updateSettings({ calorieLimit: n })} step={50} />
              <NumField label="Water goal" suffix="ml" value={settings.waterGoalMl} onChange={(n) => updateSettings({ waterGoalMl: n })} step={250} />
              <NumField label="Exercise goal" suffix="min" value={settings.exerciseGoalMin} onChange={(n) => updateSettings({ exerciseGoalMin: n })} step={5} />
              <NumField label="Protein goal" suffix="g" value={settings.proteinGoalG} onChange={(n) => updateSettings({ proteinGoalG: n })} step={5} />
              <NumField label="Carbs goal" suffix="g" value={settings.carbsGoalG} onChange={(n) => updateSettings({ carbsGoalG: n })} step={5} />
              <NumField label="Fat goal" suffix="g" value={settings.fatGoalG} onChange={(n) => updateSettings({ fatGoalG: n })} step={5} />
            </div>
          </div>

          <div className="card">
            <h2 className="card-title">Water quick-add buttons</h2>
            <p className="small muted" style={{ marginTop: 0 }}>
              Comma-separated amounts in ml, shown as one-tap buttons in the daily log.
            </p>
            <input
              className="input mono"
              defaultValue={settings.waterPresets.join(', ')}
              onBlur={(e) => {
                const presets = e.target.value
                  .split(',')
                  .map((s) => Number(s.trim()))
                  .filter((n) => Number.isFinite(n) && n > 0);
                if (presets.length > 0) updateSettings({ waterPresets: presets });
              }}
              placeholder="250, 500, 750"
            />
          </div>
        </div>

        <div className="grid" style={{ gap: 16 }}>
          <CloudSyncCard />

          <div className="card">
            <h2 className="card-title">Your data</h2>
            <p className="small muted" style={{ marginTop: 0 }}>
              Everything is stored locally in your browser as a single JSON document
              ({daysLogged} logged days · {data.library.length} library meals · tracking since {settings.trackingStart}).
              Export it any time — the file is plain JSON, so it's easy to migrate or back up.
            </p>
            <div className="row wrap">
              <button className="btn btn-primary" onClick={() => exportToFile(data)}>Export backup (JSON)</button>
              <button className="btn" onClick={() => fileRef.current?.click()}>Import backup…</button>
              <input
                ref={fileRef} type="file" accept="application/json,.json" style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onImportFile(f);
                  e.target.value = '';
                }}
              />
            </div>
            {message && (
              <p className="small" style={{ color: message.kind === 'ok' ? 'var(--lime)' : 'var(--red)', marginBottom: 0 }}>
                {message.text}
              </p>
            )}
          </div>

          <div className="card" style={{ borderColor: 'rgba(251,113,133,0.3)' }}>
            <h2 className="card-title" style={{ color: 'var(--red)' }}>Danger zone</h2>
            <p className="small muted" style={{ marginTop: 0 }}>
              Wipe everything and start fresh. Export a backup first if you might want this data later.
            </p>
            <button
              className="btn btn-danger"
              onClick={() => {
                if (window.confirm(`Erase ALL data (${daysLogged} logged days)? This cannot be undone.`)) {
                  replaceData(defaultData());
                  setMessage({ kind: 'ok', text: 'All data has been reset.' });
                }
              }}
            >
              Reset all data
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
