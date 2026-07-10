import { useState } from 'react';
import type { Nutrition } from '../../types';

/** Numeric input that tolerates empty/partial typing and reports a number. */
export function NumField({ label, value, onChange, step = 1, suffix }: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
  suffix?: string;
}) {
  return (
    <div className="field">
      <span className="field-label">{label}{suffix ? ` (${suffix})` : ''}</span>
      <input
        className="input mono"
        type="number"
        min={0}
        step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
        onFocus={(e) => e.target.select()}
      />
    </div>
  );
}

export function NutritionFields({ value, onChange }: {
  value: Nutrition;
  onChange: (n: Nutrition) => void;
}) {
  const set = (k: keyof Nutrition) => (n: number) => onChange({ ...value, [k]: n });
  return (
    <div className="grid grid-3" style={{ gap: 10 }}>
      <NumField label="Calories" suffix="kcal" value={value.calories} onChange={set('calories')} />
      <NumField label="Protein" suffix="g" value={value.protein} onChange={set('protein')} step={0.5} />
      <NumField label="Carbs" suffix="g" value={value.carbs} onChange={set('carbs')} step={0.5} />
      <NumField label="Fat" suffix="g" value={value.fat} onChange={set('fat')} step={0.5} />
      <NumField label="Fiber" suffix="g" value={value.fiber} onChange={set('fiber')} step={0.5} />
      <NumField label="Sugar" suffix="g" value={value.sugar} onChange={set('sugar')} step={0.5} />
    </div>
  );
}

/** Chip-style tag editor: type and press Enter (or comma) to add, click a chip to remove. */
export function TagsInput({ tags, onChange, placeholder = 'Add a tag, press Enter' }: {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState('');

  const commit = () => {
    const t = draft.trim().toLowerCase().replace(/,+$/, '');
    if (t && !tags.includes(t)) onChange([...tags, t]);
    setDraft('');
  };

  return (
    <div className="field">
      <span className="field-label">Tags</span>
      {tags.length > 0 && (
        <div className="row wrap" style={{ gap: 6 }}>
          {tags.map((t) => (
            <button
              key={t} type="button" className="chip clickable"
              title="Remove tag"
              onClick={() => onChange(tags.filter((x) => x !== t))}
            >
              {t} ×
            </button>
          ))}
        </div>
      )}
      <input
        className="input"
        value={draft}
        placeholder={placeholder}
        onChange={(e) => {
          if (e.target.value.endsWith(',')) {
            setDraft(e.target.value);
            // commit on comma
            const t = e.target.value.slice(0, -1).trim().toLowerCase();
            if (t && !tags.includes(t)) onChange([...tags, t]);
            setDraft('');
          } else {
            setDraft(e.target.value);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          }
        }}
        onBlur={commit}
      />
    </div>
  );
}

export const ZERO_NUTRITION: Nutrition = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 };
