import { useState, useMemo } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useTable, useReducer } from 'spacetimedb/react';
import { tables, reducers } from '../module_bindings';
import { useAuth } from '../auth';
import type { Venue, Track, Organization } from '../module_bindings/types';

export default function VenuesView() {
  const { orgId } = useParams<{ orgId: string }>();
  const oid = BigInt(orgId ?? '0');
  const { isAuthenticated, isReady, canManageOrgEvents } = useAuth();

  const [orgs] = useTable(tables.organization);
  const [venues] = useTable(tables.venue);
  const [tracks] = useTable(tables.track);

  const createVenue = useReducer(reducers.createVenue);
  const deleteVenue = useReducer(reducers.deleteVenue);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', latitude: '', longitude: '' });
  const [error, setError] = useState('');

  const org = orgs.find((o: Organization) => o.id === oid);
  const hasAccess = canManageOrgEvents(oid);

  const orgVenues = useMemo(() => {
    return venues.filter((v: Venue) => v.orgId === oid).sort((a: Venue, b: Venue) => a.name.localeCompare(b.name));
  }, [venues, oid]);

  const trackCounts = useMemo(() => {
    const m = new Map<bigint, number>();
    for (const t of tracks) {
      for (const v of orgVenues) {
        if (t.venueId === v.id) m.set(v.id, (m.get(v.id) ?? 0) + 1);
      }
    }
    return m;
  }, [tracks, orgVenues]);

  if (!isReady) return null;
  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (!org) {
    if (orgs.length === 0) return null;
    return <div className="empty">Organization not found.</div>;
  }
  if (!hasAccess) return <div className="empty">You don't have access to manage venues.</div>;

  const resetForm = () => {
    setForm({ name: '', description: '', latitude: '', longitude: '' });
    setError('');
    setShowForm(false);
  };

  const handleCreate = async () => {
    setError('');
    if (!form.name.trim()) { setError('Name is required'); return; }
    const lat = parseFloat(form.latitude) || 0;
    const lng = parseFloat(form.longitude) || 0;
    try {
      await createVenue({ orgId: oid, name: form.name.trim(), description: form.description.trim(), latitude: lat, longitude: lng });
      resetForm();
    } catch (e: any) {
      setError(e?.message || 'Failed to create venue');
    }
  };

  const handleDelete = async (v: Venue) => {
    if (!confirm(`Delete "${v.name}" and all its tracks?`)) return;
    try {
      await deleteVenue({ venueId: v.id });
    } catch (e: any) {
      setError(e?.message || 'Failed to delete venue');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ marginBottom: 0 }}>Venues</h1>
        {!showForm && (
          <button className="primary small" onClick={() => setShowForm(true)}>+ New Venue</button>
        )}
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="section-title" style={{ marginBottom: 8 }}>New Venue</div>
          {error && <div style={{ color: 'var(--red)', fontSize: '0.85rem', marginBottom: 8 }}>{error}</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input type="text" placeholder="Venue name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} onKeyDown={e => e.key === 'Enter' && handleCreate()} autoFocus className="input" />
            <input type="text" placeholder="Description (optional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label className="input-label">Latitude</label>
                <input type="number" step="any" placeholder="0.0" value={form.latitude} onChange={e => setForm(f => ({ ...f, latitude: e.target.value }))} className="input" />
              </div>
              <div>
                <label className="input-label">Longitude</label>
                <input type="number" step="any" placeholder="0.0" value={form.longitude} onChange={e => setForm(f => ({ ...f, longitude: e.target.value }))} className="input" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="primary small" onClick={handleCreate}>Create</button>
              <button className="ghost small" onClick={resetForm}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {orgVenues.length === 0 && !showForm ? (
        <div className="empty">No venues yet. Create one to get started.</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Tracks</th>
              <th>Location</th>
              <th style={{ width: 60 }}></th>
            </tr>
          </thead>
          <tbody>
            {orgVenues.map((v: Venue) => (
              <tr key={String(v.id)}>
                <td>
                  <Link to={`/org/${orgId}/venue/${v.id}`} className="table-link">{v.name}</Link>
                  {v.description && <div className="muted small-text">{v.description}</div>}
                </td>
                <td>{trackCounts.get(v.id) ?? 0}</td>
                <td className="muted small-text">{v.latitude.toFixed(4)}, {v.longitude.toFixed(4)}</td>
                <td>
                  <button className="ghost small" onClick={() => handleDelete(v)} style={{ color: 'var(--red)' }} title="Delete">&times;</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
