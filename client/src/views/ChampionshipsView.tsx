import { useState, useMemo } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useTable, useReducer } from 'spacetimedb/react';
import { tables, reducers } from '../module_bindings';
import { useAuth } from '../auth';
import type { Championship, Event, Organization } from '../module_bindings/types';

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

  const org = orgs.find((o: Organization) => o.id === oid);
  const hasAccess = canManageOrgEvents(oid);

  const champRows = useMemo(() => {
    const orgChamps = championships.filter((c: Championship) => c.orgId === oid);
    return orgChamps.map((c: Championship) => {
      const champEvents = events.filter((e: Event) => e.championshipId === c.id);
      const dates = champEvents
        .flatMap((e: Event) => [e.startDate, e.endDate])
        .filter(Boolean)
        .sort();
      return {
        championship: c,
        eventCount: champEvents.length,
        startDate: dates[0] ?? '—',
        endDate: dates[dates.length - 1] ?? '—',
      };
    });
  }, [championships, events, oid]);

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
              <th>Name</th>
              <th>Events</th>
              <th>Start</th>
              <th>End</th>
            </tr>
          </thead>
          <tbody>
            {champRows.map(({ championship: c, eventCount, startDate, endDate }) => (
              <tr key={String(c.id)}>
                <td><span className="color-dot" style={{ background: c.color }} /></td>
                <td>
                  <Link to={`/org/${orgId}/championship/${c.id}`} className="table-link">
                    {c.name}
                  </Link>
                </td>
                <td>{eventCount}</td>
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
