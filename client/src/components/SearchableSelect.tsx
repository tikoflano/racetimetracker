import { useState, useMemo, useRef, useEffect } from 'react';

export default function SearchableSelect<T>({
  items,
  value,
  onChange,
  getLabel,
  getKey,
  placeholder,
  filterFn,
  showClear = true,
  clearLabel = 'Clear',
  disabled = false,
}: {
  items: T[];
  value: T | null;
  onChange: (item: T | null) => void;
  getLabel: (item: T) => string;
  getKey: (item: T) => string;
  placeholder: string;
  filterFn?: (item: T, query: string) => boolean;
  showClear?: boolean;
  clearLabel?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return items;
    const fn =
      filterFn ??
      ((item: T, query: string) => getLabel(item).toLowerCase().includes(query.toLowerCase()));
    return items.filter((item) => fn(item, q));
  }, [items, search, filterFn, getLabel]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => {
          if (!disabled) {
            setOpen((o) => !o);
            setSearch('');
          }
        }}
        className="input"
        disabled={disabled}
        style={{
          width: '100%',
          textAlign: 'left',
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '6px 8px',
          fontSize: '0.8rem',
          color: value ? 'var(--text)' : 'var(--text-muted)',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value ? getLabel(value) : placeholder}
        </span>
        <span style={{ fontSize: '0.6rem', marginLeft: 4 }}>▼</span>
      </button>
      {open && !disabled && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: '100%',
            marginTop: 2,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: 50,
            maxHeight: 220,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <input
            type="text"
            className="input"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
            style={{ margin: 6, width: 'calc(100% - 12px)', fontSize: '0.8rem' }}
          />
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {showClear && value && (
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '6px 12px',
                  border: 'none',
                  background: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '0.8rem',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontStyle: 'italic',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--border)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
              >
                {clearLabel}
              </button>
            )}
            {filtered.map((item) => (
              <button
                key={getKey(item)}
                type="button"
                onClick={() => {
                  onChange(item);
                  setOpen(false);
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '6px 12px',
                  border: 'none',
                  background: value && getKey(value) === getKey(item)
                    ? 'var(--accent-bg, rgba(59,130,246,0.1))'
                    : 'none',
                  color: 'var(--text)',
                  fontSize: '0.8rem',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background =
                    value && getKey(value) === getKey(item)
                      ? 'var(--accent-bg, rgba(59,130,246,0.1))'
                      : 'var(--border)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background =
                    value && getKey(value) === getKey(item)
                      ? 'var(--accent-bg, rgba(59,130,246,0.1))'
                      : 'none')
                }
              >
                {getLabel(item)}
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="muted small-text" style={{ padding: '8px 12px' }}>
                No matches found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
