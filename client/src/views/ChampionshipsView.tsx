import { useState, useMemo } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useTable, useReducer } from 'spacetimedb/react';
import { tables, reducers } from '../module_bindings';
import { useAuth } from '../auth';
import type { Championship, Event, Organization } from '../module_bindings/types';

type SortKey = 'name' | 'events' | 'start' | 'end' | 'next';
type SortDir = 'asc' | 'desc';
const SORT_STORAGE_KEY = 'champ_sort';

function loadSort(): { key: SortKey; dir: SortDir } {
  try {
    const raw = localStorage.getItem(SORT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.key && parsed.dir) return parsed;
    }
  } catch {}
  return { key: 'name', dir: 'asc' };
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function SortTh({ label, sortKey, current, onSort }: { label: string; sortKey: SortKey; current: { key: SortKey; dir: SortDir }; onSort: (k: SortKey) => void }) {
  const active = current.key === sortKey;
  const arrow = active ? (current.dir === 'asc' ? ' \u25B2' : ' \u25BC') : '';
  return (
    <th onClick={() => onSort(sortKey)} style={{ cursor: 'pointer', userSelect: 'none' }}>
      {label}<span style={{ fontSize: '0.6rem', opacity: active ? 1 : 0.3 }}>{arrow || ' \u25B2'}</span>
    </th>
  );
}

export default function ChampionshipsView() {
  const { orgId } = useParams<{ orgId: string }>();
  const oid = BigInt(orgId ?? '0');
  const { isAuthenticated, canManageOrgEvents } = useAuth();

  const [orgs] = useTable(tables.organization);
  const [championships] = useTable(tables.championship);
  const [events] = useTable(tables.event);

  const createChampionship = useReducer(reducers.createChampionship);

  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newColor, setNewColor] = useState('#3b82f6');
  const [error, setError] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>(loadSort);

  const toggleSort = (key: SortKey) => {
    setSort(prev => {
      const next = prev.key === key
        ? { key, dir: (prev.dir === 'asc' ? 'desc' : 'asc') as SortDir }
        : { key, dir: 'asc' as SortDir };
      localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const org = orgs.find((o: Organization) => o.id === oid);
  const hasAccess = canManageOrgEvents(oid);

  const today = todayStr();

  const champRows = useMemo(() => {
    const orgChamps = championships.filter((c: Championship) => c.orgId === oid);
    return orgChamps.map((c: Championship) => {
      const champEvents = events.filter((e: Event) => e.championshipId === c.id);
      const dates = champEvents
        .flatMap((e: Event) => [e.startDate, e.endDate])
        .filter(Boolean)
        .sort();
      // Next event: earliest event whose end_date >= today
      const upcoming = champEvents
        .filter((e: Event) => e.endDate >= today)
        .sort((a: Event, b: Event) => a.startDate.localeCompare(b.startDate));
      const nextEvent = upcoming.length > 0 ? upcoming[0] : null;
      return {
        championship: c,
        eventCount: champEvents.length,
        startDate: dates[0] ?? '—',
        endDate: dates[dates.length - 1] ?? '—',
        nextEvent,
        nextEventSort: nextEvent?.startDate ?? '\uffff',
      };
    });
  }, [championships, events, oid, today]);

  const sortedRows = useMemo(() => {
    const rows = [...champRows];
    const dir = sort.dir === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      switch (sort.key) {
        case 'name': return dir * a.championship.name.localeCompare(b.championship.name);
        case 'events': return dir * (a.eventCount - b.eventCount);
        case 'start': return dir * a.startDate.localeCompare(b.startDate);
        case 'end': return dir * a.endDate.localeCompare(b.endDate);
        case 'next': return dir * a.nextEventSort.localeCompare(b.nextEventSort);
        default: return 0;
      }
    });
    return rows;
  }, [champRows, sort]);

  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (!org) {
    if (orgs.length === 0) return null;
    return <div className="empty">Organization not found.</div>;
  }
  if (!hasAccess) return <div className="empty">You don't have access to manage championships.</div>;

  const handleCreate = async () => {
    setError('');
    const trimmed = newName.trim();
    if (!trimmed) { setError('Name is required'); return; }
    try {
      await createChampionship({ orgId: oid, name: trimmed, description: newDesc.trim(), color: newColor });
      setNewName('');
      setNewDesc('');
      setNewColor('#3b82f6');
      setShowForm(false);
    } catch (e: any) {
      setError(e?.message || 'Failed to create championship');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ marginBottom: 0 }}>Championships</h1>
        {!showForm && (
          <button className="primary small" onClick={() => setShowForm(true)}>+ New Championship</button>
        )}
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="section-title" style={{ marginBottom: 8 }}>New Championship</div>
          {error && <div style={{ color: 'var(--red)', fontSize: '0.85rem', marginBottom: 8 }}>{error}</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input
              type="text"
              placeholder="Championship name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
              className="input"
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              className="input"
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label className="input-label" style={{ marginBottom: 0 }}>Color</label>
              <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)} className="color-input" />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="primary small" onClick={handleCreate}>Create</button>
              <button className="ghost small" onClick={() => { setShowForm(false); setError(''); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {champRows.length === 0 && !showForm ? (
        <div className="empty">No championships yet. Create one to get started.</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 12 }}></th>
              <SortTh label="Name" sortKey="name" current={sort} onSort={toggleSort} />
              <SortTh label="Events" sortKey="events" current={sort} onSort={toggleSort} />
              <SortTh label="Next Event" sortKey="next" current={sort} onSort={toggleSort} />
              <SortTh label="Start" sortKey="start" current={sort} onSort={toggleSort} />
              <SortTh label="End" sortKey="end" current={sort} onSort={toggleSort} />
            </tr>
          </thead>
          <tbody>
            {sortedRows.map(({ championship: c, eventCount, startDate, endDate, nextEvent }) => (
              <tr key={String(c.id)}>
                <td><span className="color-dot" style={{ background: c.color }} /></td>
                <td>
                  <Link to={`/org/${orgId}/championship/${c.id}`} className="table-link">
                    {c.name}
                  </Link>
                </td>
                <td>{eventCount}</td>
                <td>
                  {nextEvent ? (
                    <span>
                      <Link to={`/event/${nextEvent.id}`} className="table-link">{nextEvent.name}</Link>
                      <div className="muted small-text">{nextEvent.startDate}</div>
                    </span>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
                <td>{startDate}</td>
                <td>{endDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
