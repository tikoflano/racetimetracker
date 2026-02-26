import { useState, useMemo } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useTable, useReducer } from 'spacetimedb/react';
import { tables, reducers } from '../module_bindings';
import { useAuth } from '../auth';
import { useActiveOrg } from '../OrgContext';
import { faTrash } from '../icons';
import { RowActionMenu } from '../components/ActionMenu';
import type { Venue, Track, Organization } from '../module_bindings/types';

export default function LocationsView() {
  const oid = useActiveOrg();
  const { isAuthenticated, isReady, canManageOrgEvents } = useAuth();

  const [orgs] = useTable(tables.organization);
  const [locations] = useTable(tables.venue);
  const [tracks] = useTable(tables.track);

  const createVenue = useReducer(reducers.createVenue);
  const deleteVenue = useReducer(reducers.deleteVenue);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', address: '' });
  const [error, setError] = useState('');

  const org = orgs.find((o: Organization) => o.id === oid);
  const hasAccess = canManageOrgEvents(oid);

  const orgLocations = useMemo(() => {
    return locations.filter((v: Venue) => v.orgId === oid).sort((a: Venue, b: Venue) => a.name.localeCompare(b.name));
  }, [locations, oid]);

  const trackCounts = useMemo(() => {
    const m = new Map<bigint, number>();
    for (const t of tracks) {
      for (const v of orgLocations) {
        if (t.venueId === v.id) m.set(v.id, (m.get(v.id) ?? 0) + 1);
      }
    }
    return m;
  }, [tracks, orgLocations]);

  if (!isReady) return null;
  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (!org) {
    if (orgs.length === 0) return null;
    return <div className="empty">Organization not found.</div>;
  }
  if (!hasAccess) return <div className="empty">You don't have access to manage locations.</div>;

  const resetForm = () => {
    setForm({ name: '', description: '', address: '' });
    setError('');
    setShowForm(false);
  };

  const handleCreate = async () => {
    setError('');
    if (!form.name.trim()) { setError('Name is required'); return; }
    try {
      await createVenue({ orgId: oid, name: form.name.trim(), description: form.description.trim(), address: form.address.trim() });
      resetForm();
    } catch (e: any) {
      setError(e?.message || 'Failed to create location');
    }
  };

  const handleDelete = async (v: Venue) => {
    if (!confirm(`Delete "${v.name}" and all its tracks?`)) return;
    try {
      await deleteVenue({ venueId: v.id });
    } catch (e: any) {
      setError(e?.message || 'Failed to delete location');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ marginBottom: 0 }}>Locations</h1>
        {!showForm && (
          <button className="primary small" onClick={() => setShowForm(true)}>+ New Location</button>
        )}
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="section-title" style={{ marginBottom: 8 }}>New Location</div>
          {error && <div style={{ color: 'var(--red)', fontSize: '0.85rem', marginBottom: 8 }}>{error}</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input type="text" placeholder="Location name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} onKeyDown={e => e.key === 'Enter' && handleCreate()} autoFocus className="input" />
            <input type="text" placeholder="Description (optional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input" />
            <input type="text" placeholder="Address" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="input" />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="primary small" onClick={handleCreate}>Create</button>
              <button className="ghost small" onClick={resetForm}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {orgLocations.length === 0 && !showForm ? (
        <div className="empty">No locations yet. Create one to get started.</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th>Tracks</th>
              <th>Address</th>
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {orgLocations.map((v: Venue) => (
              <tr key={String(v.id)}>
                <td>
                  <Link to={`/location/${v.id}`} className="table-link">{v.name}</Link>
                </td>
                <td className="muted small-text">{v.description || '—'}</td>
                <td>{trackCounts.get(v.id) ?? 0}</td>
                <td className="small-text">
                  {v.address ? (
                    <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(v.address)}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>
                      {v.address}
                    </a>
                  ) : <span className="muted">—</span>}
                </td>
                <td>
                  <RowActionMenu items={[
                    { icon: faTrash, label: 'Delete', danger: true, onClick: () => handleDelete(v) },
                  ]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
