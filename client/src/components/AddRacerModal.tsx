import { useState, useMemo } from 'react';
import Modal from './Modal';
import type { Rider } from '../module_bindings/types';

function getAge(dateOfBirth: string): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}

interface AddRacerModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (riderId: bigint) => void;
  /** Org riders not yet assigned to the event */
  availableRiders: readonly Rider[];
}

export default function AddRacerModal({ open, onClose, onAdd, availableRiders }: AddRacerModalProps) {
  const [search, setSearch] = useState('');
  const [minAge, setMinAge] = useState('');
  const [maxAge, setMaxAge] = useState('');

  const handleClose = () => { setSearch(''); setMinAge(''); setMaxAge(''); onClose(); };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const min = minAge !== '' ? parseInt(minAge) : null;
    const max = maxAge !== '' ? parseInt(maxAge) : null;

    return availableRiders.filter(r => {
      // Name search
      if (q) {
        const full = `${r.firstName} ${r.lastName}`.toLowerCase();
        if (!full.includes(q)) return false;
      }
      // Age filter
      if (min !== null || max !== null) {
        const age = getAge(r.dateOfBirth);
        if (age === null) return false;
        if (min !== null && age < min) return false;
        if (max !== null && age > max) return false;
      }
      return true;
    });
  }, [availableRiders, search, minAge, maxAge]);

  return (
    <Modal open={open} onClose={handleClose} title="Add Riders">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        <input
          type="text"
          className="input"
          placeholder="Search by name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoFocus
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <label className="input-label">Min Age</label>
            <input type="number" className="input" min="0" value={minAge} onChange={e => setMinAge(e.target.value)} placeholder="—" />
          </div>
          <div>
            <label className="input-label">Max Age</label>
            <input type="number" className="input" min="0" value={maxAge} onChange={e => setMaxAge(e.target.value)} placeholder="—" />
          </div>
        </div>
      </div>

      <div className="muted small-text" style={{ marginBottom: 8 }}>
        {filtered.length} rider{filtered.length !== 1 ? 's' : ''} found
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 300, overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <div className="muted small-text" style={{ padding: 8 }}>
            {availableRiders.length === 0 ? 'All riders are already assigned.' : 'No riders match your filters.'}
          </div>
        ) : (
          filtered.map(r => {
            const age = getAge(r.dateOfBirth);
            return (
              <div
                key={String(r.id)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', borderRadius: 'var(--radius)' }}
              >
                <div>
                  <span style={{ fontSize: '0.85rem' }}>{r.firstName} {r.lastName}</span>
                  {age !== null && <span className="muted small-text" style={{ marginLeft: 8 }}>({age} yrs)</span>}
                </div>
                <button className="primary small" onClick={() => onAdd(r.id)}>Add</button>
              </div>
            );
          })
        )}
      </div>
    </Modal>
  );
}
