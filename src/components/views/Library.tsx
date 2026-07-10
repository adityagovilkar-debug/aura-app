import { useMemo, useState } from 'react';
import type { MealTemplate } from '../../types';
import { useApp } from '../../state/AppContext';
import { TemplateModal } from '../forms/TemplateModal';
import { IconEdit, IconPlus, IconTrash } from '../ui/icons';

export function Library() {
  const { data, deleteTemplate } = useApp();
  const [query, setQuery] = useState('');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MealTemplate | undefined>(undefined);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const t of data.library) for (const tag of t.tags) set.add(tag);
    return [...set].sort();
  }, [data.library]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.library.filter((t) => {
      if (tagFilter && !t.tags.includes(tagFilter)) return false;
      if (q && !t.name.toLowerCase().includes(q) && !t.tags.some((tag) => tag.includes(q))) return false;
      return true;
    });
  }, [data.library, query, tagFilter]);

  return (
    <>
      <div className="view-head">
        <div>
          <h1 className="view-title">Meal library</h1>
          <div className="view-sub">{data.library.length} saved meals · reuse them when logging a day</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditing(undefined); setModalOpen(true); }}>
          <IconPlus /> New meal
        </button>
      </div>

      <div className="card" style={{ marginBottom: 16, padding: 16 }}>
        <div className="row wrap">
          <input
            className="input" style={{ maxWidth: 320 }}
            placeholder="Search by name or tag…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {allTags.map((tag) => (
            <button
              key={tag}
              className={`chip clickable ${tagFilter === tag ? 'active' : ''}`}
              onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <div className="empty-hint">No meals match. Create one with “New meal”.</div>
        </div>
      ) : (
        <div className="grid grid-3">
          {filtered.map((t) => (
            <div className="card" key={t.id} style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="row-between" style={{ alignItems: 'flex-start' }}>
                <div>
                  <div className="entry-name" style={{ fontSize: 16 }}>{t.name}</div>
                  <div className="entry-sub">{t.serving}</div>
                </div>
                <div className="row" style={{ gap: 2 }}>
                  <button className="btn-icon neutral" onClick={() => { setEditing(t); setModalOpen(true); }} aria-label={`Edit ${t.name}`}>
                    <IconEdit />
                  </button>
                  <button
                    className="btn-icon"
                    onClick={() => {
                      if (window.confirm(`Delete "${t.name}" from the library? Logged days keep their entries.`)) {
                        deleteTemplate(t.id);
                      }
                    }}
                    aria-label={`Delete ${t.name}`}
                  >
                    <IconTrash />
                  </button>
                </div>
              </div>

              <div className="row" style={{ gap: 18 }}>
                <div className="stat">
                  <span className="stat-value" style={{ fontSize: 21, color: 'var(--cyan)' }}>{t.nutrition.calories}</span>
                  <span className="stat-label">kcal</span>
                </div>
                <div className="stat">
                  <span className="stat-value" style={{ fontSize: 21 }}>{t.nutrition.protein}g</span>
                  <span className="stat-label">protein</span>
                </div>
                <div className="stat">
                  <span className="stat-value" style={{ fontSize: 21 }}>{t.nutrition.carbs}g</span>
                  <span className="stat-label">carbs</span>
                </div>
                <div className="stat">
                  <span className="stat-value" style={{ fontSize: 21 }}>{t.nutrition.fat}g</span>
                  <span className="stat-label">fat</span>
                </div>
              </div>

              {t.tags.length > 0 && (
                <div className="row wrap" style={{ gap: 6, marginTop: 'auto' }}>
                  {t.tags.map((tag) => <span className="chip" key={tag}>{tag}</span>)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <TemplateModal open={modalOpen} onClose={() => setModalOpen(false)} initial={editing} />
    </>
  );
}
