import { useState, useRef, useEffect } from 'react';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon, faEllipsisVertical } from '../icons';

export interface ActionMenuItem {
  icon: IconDefinition;
  label: string;
  onClick: () => void;
  danger?: boolean;
}

interface ActionMenuProps {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  items: ActionMenuItem[];
}

export default function ActionMenu({ open, onToggle, onClose, items }: ActionMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open, onClose]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className="ghost small"
        onClick={onToggle}
        title="Actions"
        style={{ fontSize: '1rem', padding: '4px 8px' }}
      >
        <FontAwesomeIcon icon={faEllipsisVertical} />
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: '100%',
            marginTop: 4,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            minWidth: 200,
            zIndex: 50,
            overflow: 'hidden',
          }}
        >
          {items.map((item, i) => (
            <button
              key={i}
              onClick={item.onClick}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                gap: 10,
                width: '100%',
                padding: '9px 14px',
                border: 'none',
                background: 'none',
                color: item.danger ? 'var(--red, #ef4444)' : 'var(--text)',
                fontSize: '0.85rem',
                textAlign: 'left',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--border)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
            >
              <span style={{ width: 16, textAlign: 'center', flexShrink: 0 }}>
                <FontAwesomeIcon icon={item.icon} />
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function RowActionMenu({ items }: { items: ActionMenuItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
      <button
        className="ghost small"
        onClick={() => setOpen(!open)}
        title="Actions"
        style={{ fontSize: '0.9rem', padding: '2px 6px', lineHeight: 1 }}
      >
        <FontAwesomeIcon icon={faEllipsisVertical} />
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: '100%',
            marginTop: 2,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            minWidth: 160,
            zIndex: 50,
            overflow: 'hidden',
          }}
        >
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                gap: 10,
                width: '100%',
                padding: '8px 12px',
                border: 'none',
                background: 'none',
                color: item.danger ? 'var(--red, #ef4444)' : 'var(--text)',
                fontSize: '0.8rem',
                textAlign: 'left',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--border)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
            >
              <span style={{ width: 14, textAlign: 'center', flexShrink: 0 }}>
                <FontAwesomeIcon icon={item.icon} />
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
