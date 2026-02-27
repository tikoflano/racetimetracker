import { useState, useEffect } from 'react';
import Modal from './Modal';
import type { Rider, EventRider } from '../module_bindings/types';

interface CheckInModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (assignedNumber: number) => void | Promise<void>;
  rider: Rider;
  eventRider: EventRider;
  defaultNumber: number | null;
  categoryName: string | null;
}

export default function CheckInModal({
  open,
  onClose,
  onConfirm,
  rider,
  defaultNumber,
  categoryName,
}: CheckInModalProps) {
  const [numberInput, setNumberInput] = useState('');

  useEffect(() => {
    if (open) {
      setNumberInput(defaultNumber !== null ? String(defaultNumber) : '');
    }
  }, [open, defaultNumber]);

  const handleConfirm = async () => {
    const num = numberInput.trim() === '' ? 0 : parseInt(numberInput, 10);
    if (isNaN(num) || num < 0) return;
    await onConfirm(num);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Confirm Check-in">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <div className="muted small-text" style={{ marginBottom: 4 }}>
            Rider
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>
            {rider.firstName} {rider.lastName}
          </div>
        </div>
        <div>
          <label className="input-label">Assigned Number</label>
          <input
            type="number"
            min="0"
            className="input"
            value={numberInput}
            onChange={(e) => setNumberInput(e.target.value)}
            placeholder={defaultNumber !== null ? String(defaultNumber) : '—'}
          />
          {categoryName && (
            <div className="muted small-text" style={{ marginTop: 4 }}>
              {categoryName}
            </div>
          )}
        </div>
        <p className="muted small-text" style={{ margin: 0 }}>
          Confirm that this rider has checked in. Set or change the number above.
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
          <button className="ghost small" onClick={onClose}>
            Cancel
          </button>
          <button className="primary small" onClick={handleConfirm}>
            Confirm Check-in
          </button>
        </div>
      </div>
    </Modal>
  );
}
