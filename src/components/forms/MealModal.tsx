import { useMemo, useState } from 'react';
import type { MealSlot, MealTemplate } from '../../types';
import { useApp } from '../../state/AppContext';
import { uid } from '../../lib/storage';
import { nowTime } from '../../lib/dates';
import { Modal } from '../ui/Modal';
import { NumField, NutritionFields, TagsInput, ZERO_NUTRITION } from './fields';

interface MealModalProps {
  open: boolean;
  onClose: () => void;
  date: string;
  slot: MealSlot;
}

/** Add a meal to a day — either picked from the library or entered from scratch. */
export function MealModal({ open, onClose, date, slot }: MealModalProps) {
  const { data, addMeal, upsertTemplate } = useApp();
  const [tab, setTab] = useState<'library' | 'custom'>('library');

  // library tab state
  const [query, setQuery] = useState('');
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [servings, setServings] = useState(1);

  // custom tab state
  const [name, setName] = useState('');
  const [serving, setServing] = useState('1 serving');
  const [tags, setTags] = useState<string[]>([]);
  const [nutrition, setNutrition] = useState(ZERO_NUTRITION);
  const [saveToLibrary, setSaveToLibrary] = useState(true);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data.library;
    return data.library.filter(
      (t) => t.name.toLowerCase().includes(q) || t.tags.some((tag) => tag.includes(q)),
    );
  }, [data.library, query]);

  const reset = () => {
    setQuery('');
    setPickedId(null);
    setServings(1);
    setName('');
    setServing('1 serving');
    setTags([]);
    setNutrition(ZERO_NUTRITION);
    setSaveToLibrary(true);
  };

  const close = () => {
    reset();
    onClose();
  };

  const addFromLibrary = () => {
    const t = data.library.find((x) => x.id === pickedId);
    if (!t) return;
    addMeal(date, {
      templateId: t.id,
      name: t.name,
      slot,
      servings: Math.max(servings, 0.25),
      nutrition: t.nutrition,
      time: nowTime(),
    });
    close();
  };

  const addCustom = () => {
    if (!name.trim()) return;
    let templateId: string | undefined;
    if (saveToLibrary) {
      const template: MealTemplate = {
        id: uid(),
        name: name.trim(),
        serving,
        tags,
        nutrition,
        createdAt: new Date().toISOString(),
      };
      upsertTemplate(template);
      templateId = template.id;
    }
    addMeal(date, {
      templateId,
      name: name.trim(),
      slot,
      servings: Math.max(servings, 0.25),
      nutrition,
      time: nowTime(),
    });
    close();
  };

  return (
    <Modal open={open} onClose={close} title={`Add ${slot}`}>
      <div className="tabs">
        <button className={`tab ${tab === 'library' ? 'active' : ''}`} onClick={() => setTab('library')}>
          From library
        </button>
        <button className={`tab ${tab === 'custom' ? 'active' : ''}`} onClick={() => setTab('custom')}>
          Custom meal
        </button>
      </div>

      {tab === 'library' ? (
        <div className="grid" style={{ gap: 12 }}>
          <input
            className="input"
            placeholder="Search meals or tags…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {matches.length === 0 && (
              <div className="empty-hint">No saved meals match — try the Custom tab.</div>
            )}
            {matches.map((t) => (
              <button
                key={t.id}
                className="entry-row"
                style={{
                  width: '100%', background: 'none', cursor: 'pointer', textAlign: 'left',
                  border: pickedId === t.id ? '1px solid rgba(34,211,238,0.55)' : '1px solid var(--line)',
                  boxShadow: pickedId === t.id ? '0 0 12px rgba(34,211,238,0.15)' : undefined,
                  color: 'var(--text)', fontFamily: 'var(--font-body)',
                }}
                onClick={() => setPickedId(t.id)}
              >
                <div className="entry-main">
                  <div className="entry-name">{t.name}</div>
                  <div className="entry-sub">
                    {t.serving} · P {t.nutrition.protein}g · C {t.nutrition.carbs}g · F {t.nutrition.fat}g
                    {t.tags.length > 0 && <> · {t.tags.join(', ')}</>}
                  </div>
                </div>
                <div className="entry-kcal">{t.nutrition.calories}</div>
              </button>
            ))}
          </div>
          <div className="row" style={{ alignItems: 'flex-end' }}>
            <div style={{ width: 130 }}>
              <NumField label="Servings" value={servings} onChange={setServings} step={0.5} />
            </div>
            <div className="spacer" />
            <button className="btn btn-primary" disabled={!pickedId} style={{ opacity: pickedId ? 1 : 0.45 }} onClick={addFromLibrary}>
              Add to {slot}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid" style={{ gap: 12 }}>
          <div className="field">
            <span className="field-label">Meal name</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Chicken biryani" autoFocus />
          </div>
          <div className="grid grid-2" style={{ gap: 10 }}>
            <div className="field">
              <span className="field-label">Serving description</span>
              <input className="input" value={serving} onChange={(e) => setServing(e.target.value)} placeholder="e.g. 1 plate (300 g)" />
            </div>
            <NumField label="Servings eaten" value={servings} onChange={setServings} step={0.5} />
          </div>
          <NutritionFields value={nutrition} onChange={setNutrition} />
          <TagsInput tags={tags} onChange={setTags} />
          <label className="row small" style={{ cursor: 'pointer', userSelect: 'none' }}>
            <input type="checkbox" checked={saveToLibrary} onChange={(e) => setSaveToLibrary(e.target.checked)} />
            Save to my meal library for next time
          </label>
          <div className="row">
            <div className="spacer" />
            <button className="btn btn-primary" disabled={!name.trim()} style={{ opacity: name.trim() ? 1 : 0.45 }} onClick={addCustom}>
              Add to {slot}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
