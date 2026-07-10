import { useEffect, useState } from 'react';
import type { MealTemplate } from '../../types';
import { useApp } from '../../state/AppContext';
import { uid } from '../../lib/storage';
import { Modal } from '../ui/Modal';
import { NutritionFields, TagsInput, ZERO_NUTRITION } from './fields';

interface TemplateModalProps {
  open: boolean;
  onClose: () => void;
  /** When set, the modal edits this template; otherwise it creates a new one. */
  initial?: MealTemplate;
}

export function TemplateModal({ open, onClose, initial }: TemplateModalProps) {
  const { upsertTemplate } = useApp();
  const [name, setName] = useState('');
  const [serving, setServing] = useState('1 serving');
  const [tags, setTags] = useState<string[]>([]);
  const [nutrition, setNutrition] = useState(ZERO_NUTRITION);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? '');
      setServing(initial?.serving ?? '1 serving');
      setTags(initial?.tags ?? []);
      setNutrition(initial?.nutrition ?? ZERO_NUTRITION);
    }
  }, [open, initial]);

  const save = () => {
    if (!name.trim()) return;
    upsertTemplate({
      id: initial?.id ?? uid(),
      name: name.trim(),
      serving,
      tags,
      nutrition,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Edit meal' : 'New library meal'}>
      <div className="grid" style={{ gap: 12 }}>
        <div className="field">
          <span className="field-label">Meal name</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Paneer wrap" autoFocus />
        </div>
        <div className="field">
          <span className="field-label">Serving description</span>
          <input className="input" value={serving} onChange={(e) => setServing(e.target.value)} placeholder="e.g. 1 wrap (220 g)" />
        </div>
        <NutritionFields value={nutrition} onChange={setNutrition} />
        <TagsInput tags={tags} onChange={setTags} />
        <div className="row">
          <div className="spacer" />
          <button className="btn btn-primary" disabled={!name.trim()} style={{ opacity: name.trim() ? 1 : 0.45 }} onClick={save}>
            {initial ? 'Save changes' : 'Add meal'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
