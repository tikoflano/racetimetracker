import { useState, useMemo } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useTable, useReducer } from 'spacetimedb/react';
import { tables, reducers } from '../module_bindings';
import { useAuth } from '../auth';
import type { Championship, Event, Venue, Organization, FavoriteEvent } from '../module_bindings/types';

export default function ChampionshipDetailView() {
  const { orgId, champId } = useParams<{ orgId: string; champId: string }>();
  const oid = BigInt(orgId ?? '0');
  const cid = BigInt(champId ?? '0');
  const { user, isAuthenticated, canManageOrgEvents } = useAuth();

  const [orgs] = useTable(tables.organization);
  const [championships] = useTable(tables.championship);
  const [events] = useTable(tables.event);
  const [venues] = useTable(tables.venue);
  const [favorites] = useTable(tables.favorite_event);

  const updateChampionship = useReducer(reducers.updateChampionship);
  const createEvent = useReducer(reducers.createEvent);
  const toggleFavorite = useReducer(reducers.toggleFavoriteEvent);

  const favEventIds = useMemo(() => {
    if (!user) return new Set<bigint>();
    return new Set(
      favorites.filter((f: FavoriteEvent) => f.userId === user.id).map(f => f.eventId)
    );
  }, [user, favorites]);

  // Edit championship state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editError, setEditError] = useState('');

  // Add event state
  const [showEventForm, setShowEventForm] = useState(false);
  const [evtName, setEvtName] = useState('');
  const [evtDesc, setEvtDesc] = useState('');
  const [evtStart, setEvtStart] = useState('');
  const [evtEnd, setEvtEnd] = useState('');
  const [evtVenueId, setEvtVenueId] = useState('');
  const [evtError, setEvtError] = useState('');

  const org = orgs.find((o: Organization) => o.id === oid);
  const champ = championships.find((c: Championship) => c.id === cid);
  const hasAccess = canManageOrgEvents(oid);

  const champEvents = useMemo(() => {
    return events
      .filter((e: Event) => e.championshipId === cid)
      .sort((a: Event, b: Event) => a.startDate.localeCompare(b.startDate));
  }, [events, cid]);

  const venueMap = useMemo(() => {
    const m = new Map<bigint, Venue>();
    for (const v of venues) m.set(v.id, v);
    return m;
  }, [venues]);

  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (!org) {
    if (orgs.length === 0) return null;
    return <div className="empty">Organization not found.</div>;
  }
  if (!champ) {
    if (championships.length === 0) return null;
    return <div className="empty">Championship not found.</div>;
  }
  if (!hasAccess) return <div className="empty">You don't have access to manage this championship.</div>;

  const startEditing = () => {
    setEditName(champ.name);
    setEditDesc(champ.description);
    setEditError('');
    setEditing(true);
  };

  const handleSave = async () => {
    setEditError('');
    const trimmed = editName.trim();
    if (!trimmed) { setEditError('Name cannot be empty'); return; }
    try {
      await updateChampionship({ championshipId: cid, name: trimmed, description: editDesc.trim() });
      setEditing(false);
    } catch (e: any) {
      setEditError(e?.message || 'Failed to update');
    }
  };

  const handleAddEvent = async () => {
    setEvtError('');
    if (!evtName.trim()) { setEvtError('Event name is required'); return; }
    if (!evtStart) { setEvtError('Start date is required'); return; }
    if (!evtEnd) { setEvtError('End date is required'); return; }
    const venueId = evtVenueId ? BigInt(evtVenueId) : 0n;
    if (!venueId) { setEvtError('Select a venue'); return; }
    try {
      await createEvent({
        orgId: oid,
        championshipId: cid,
        venueId,
        name: evtName.trim(),
        description: evtDesc.trim(),
        startDate: evtStart,
        endDate: evtEnd,
      });
      setEvtName('');
      setEvtDesc('');
      setEvtStart('');
      setEvtEnd('');
      setEvtVenueId('');
      setShowEventForm(false);
    } catch (e: any) {
      setEvtError(e?.message || 'Failed to create event');
    }
  };

  return (
    <div>
      <Link to={`/org/${orgId}/championships`} className="back-link">&larr; Championships</Link>

      {/* Championship name + description — editable */}
      {editing ? (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
              autoFocus
              className="input"
              style={{ fontSize: '1.4rem', fontWeight: 700 }}
            />
            <input
              type="text"
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
              placeholder="Description"
              className="input"
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="primary small" onClick={handleSave}>Save</button>
              <button className="ghost small" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </div>
          {editError && <div style={{ color: 'var(--red)', fontSize: '0.85rem', marginTop: 4 }}>{editError}</div>}
        </div>
      ) : (
        <div style={{ marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 style={{ marginBottom: 0 }}>{champ.name}</h1>
            <button className="ghost small" onClick={startEditing} title="Edit">&#9998;</button>
          </div>
          {champ.description && <p className="muted small-text">{champ.description}</p>}
        </div>
      )}

      {/* Events table */}
      <div className="section" style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div className="section-title" style={{ marginBottom: 0 }}>Events ({champEvents.length})</div>
          {!showEventForm && (
            <button className="primary small" onClick={() => setShowEventForm(true)}>+ Add Event</button>
          )}
        </div>

        {showEventForm && (
          <div className="card" style={{ marginBottom: 12 }}>
            {evtError && <div style={{ color: 'var(--red)', fontSize: '0.85rem', marginBottom: 8 }}>{evtError}</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input
                type="text"
                placeholder="Event name"
                value={evtName}
                onChange={(e) => setEvtName(e.target.value)}
                autoFocus
                className="input"
              />
              <input
                type="text"
                placeholder="Description (optional)"
                value={evtDesc}
                onChange={(e) => setEvtDesc(e.target.value)}
                className="input"
              />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <label className="input-label">Start date</label>
                  <input type="date" value={evtStart} onChange={(e) => setEvtStart(e.target.value)} className="input" />
                </div>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <label className="input-label">End date</label>
                  <input type="date" value={evtEnd} onChange={(e) => setEvtEnd(e.target.value)} className="input" />
                </div>
              </div>
              <div>
                <label className="input-label">Venue</label>
                <select
                  value={evtVenueId}
                  onChange={(e) => setEvtVenueId(e.target.value)}
                  className="input"
                >
                  <option value="">Select venue...</option>
                  {venues.map((v: Venue) => (
                    <option key={String(v.id)} value={String(v.id)}>{v.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="primary small" onClick={handleAddEvent}>Create Event</button>
                <button className="ghost small" onClick={() => { setShowEventForm(false); setEvtError(''); }}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {champEvents.length === 0 && !showEventForm ? (
          <div className="empty">No events in this championship yet.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 32 }}></th>
                <th>Name</th>
                <th>Venue</th>
                <th>Start</th>
                <th>End</th>
              </tr>
            </thead>
            <tbody>
              {champEvents.map((e: Event) => (
                <tr key={String(e.id)}>
                  <td>
                    {isAuthenticated && (
                      <button
                        className="fav-btn"
                        onClick={() => toggleFavorite({ eventId: e.id })}
                        title={favEventIds.has(e.id) ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        {favEventIds.has(e.id) ? '\u2605' : '\u2606'}
                      </button>
                    )}
                  </td>
                  <td>
                    <Link to={`/event/${e.id}`} className="table-link">{e.name}</Link>
                  </td>
                  <td>{venueMap.get(e.venueId)?.name ?? '—'}</td>
                  <td>{e.startDate}</td>
                  <td>{e.endDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
