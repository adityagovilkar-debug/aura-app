import { useState } from 'react';
import type { ExerciseType } from '../../types';
import { EXERCISE_TYPES } from '../../types';
import { useApp } from '../../state/AppContext';
import { nowTime } from '../../lib/dates';
import { Modal } from '../ui/Modal';
import { NumField } from './fields';

interface ExerciseModalProps {
  open: boolean;
  onClose: () => void;
  date: string;
}

export function ExerciseModal({ open, onClose, date }: ExerciseModalProps) {
  const { addExercise } = useApp();
  const [name, setName] = useState('');
  const [type, setType] = useState<ExerciseType>('cardio');
  const [durationMin, setDurationMin] = useState(30);
  const [caloriesBurned, setCaloriesBurned] = useState(200);
  const [notes, setNotes] = useState('');

  const close = () => {
    setName('');
    setType('cardio');
    setDurationMin(30);
    setCaloriesBurned(200);
    setNotes('');
    onClose();
  };

  const add = () => {
    if (!name.trim()) return;
    addExercise(date, {
      name: name.trim(),
      type,
      durationMin,
      caloriesBurned,
      notes: notes.trim() || undefined,
      time: nowTime(),
    });
    close();
  };

  return (
    <Modal open={open} onClose={close} title="Log workout">
      <div className="grid" style={{ gap: 12 }}>
        <div className="field">
          <span className="field-label">Workout</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 5k run, push day, yoga…" autoFocus />
        </div>
        <div className="grid grid-3" style={{ gap: 10 }}>
          <div className="field">
            <span className="field-label">Type</span>
            <select className="select" value={type} onChange={(e) => setType(e.target.value as ExerciseType)}>
              {EXERCISE_TYPES.map((t) => (
                <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>
          <NumField label="Duration" suffix="min" value={durationMin} onChange={setDurationMin} />
          <NumField label="Burned" suffix="kcal" value={caloriesBurned} onChange={setCaloriesBurned} />
        </div>
        <div className="field">
          <span className="field-label">Notes (sets, reps, distance…)</span>
          <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. 3×8 bench 60 kg, 5 km in 28:30" />
        </div>
        <div className="row">
          <div className="spacer" />
          <button className="btn btn-primary" disabled={!name.trim()} style={{ opacity: name.trim() ? 1 : 0.45 }} onClick={add}>
            Log workout
          </button>
        </div>
      </div>
    </Modal>
  );
}
