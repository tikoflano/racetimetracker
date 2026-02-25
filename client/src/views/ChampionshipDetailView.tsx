import { useState, useMemo } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useTable, useReducer } from 'spacetimedb/react';
import { tables, reducers } from '../module_bindings';
import { useAuth } from '../auth';
import { useActiveOrg } from '../OrgContext';
import type { Championship, Event, Venue, Organization, PinnedEvent } from '../module_bindings/types';

type EventStatus = 'in_progress' | 'not_started' | 'completed';

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getEventStatus(e: Event, today: string): EventStatus {
  if (today < e.startDate) return 'not_started';
  if (today > e.endDate) return 'completed';
  return 'in_progress';
}

const STATUS_LABEL: Record<EventStatus, string> = { in_progress: 'In Progress', not_started: 'Not Started', completed: 'Completed' };
const STATUS_BADGE: Record<EventStatus, string> = { in_progress: 'running', not_started: 'queued', completed: 'finished' };

export default function ChampionshipDetailView() {
  const { champId } = useParams<{ champId: string }>();
  const oid = useActiveOrg();
  const cid = BigInt(champId ?? '0');
  const { user, isAuthenticated, isReady, canManageOrgEvents } = useAuth();

  const [orgs] = useTable(tables.organization);
  const [championships] = useTable(tables.championship);
  const [events] = useTable(tables.event);
  const [venues] = useTable(tables.venue);
  const [pinnedEvents] = useTable(tables.pinned_event);

  const updateChampionship = useReducer(reducers.updateChampionship);
  const createEvent = useReducer(reducers.createEvent);
  const updateEvent = useReducer(reducers.updateEvent);
  const togglePin = useReducer(reducers.togglePinEvent);

  const pinnedEventIds = useMemo(() => {
    if (!user) return new Set<bigint>();
    return new Set(
      pinnedEvents.filter((f: PinnedEvent) => f.userId === user.id).map(f => f.eventId)
    );
  }, [user, pinnedEvents]);

  // Edit championship state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editError, setEditError] = useState('');

  // Add event state
  const [showEventForm, setShowEventForm] = useState(false);
  const [evtName, setEvtName] = useState('');
  const [evtDesc, setEvtDesc] = useState('');
  const [evtStart, setEvtStart] = useState('');
  const [evtEnd, setEvtEnd] = useState('');
  const [evtVenueId, setEvtVenueId] = useState('');
  const [evtError, setEvtError] = useState('');

  // Edit event name state
  const [editingEventId, setEditingEventId] = useState<bigint | null>(null);
  const [editEventName, setEditEventName] = useState('');
  const [editEventError, setEditEventError] = useState('');

  // Status filter
  const [statusFilter, setStatusFilter] = useState<EventStatus | 'all'>('all');

  const org = orgs.find((o: Organization) => o.id === oid);
  const champ = championships.find((c: Championship) => c.id === cid);
  const hasAccess = canManageOrgEvents(oid);

  const today = todayStr();

  const champEvents = useMemo(() => {
    return events
      .filter((e: Event) => e.championshipId === cid)
      .sort((a: Event, b: Event) => a.startDate.localeCompare(b.startDate));
  }, [events, cid]);

  const eventRows = useMemo(() => {
    return champEvents.map((e: Event) => ({
      event: e,
      status: getEventStatus(e, today),
    }));
  }, [champEvents, today]);

  const filteredEventRows = useMemo(() => {
    if (statusFilter === 'all') return eventRows;
    return eventRows.filter(r => r.status === statusFilter);
  }, [eventRows, statusFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: eventRows.length, in_progress: 0, not_started: 0, completed: 0 };
    for (const r of eventRows) counts[r.status]++;
    return counts;
  }, [eventRows]);

  const venueMap = useMemo(() => {
    const m = new Map<bigint, Venue>();
    for (const v of venues) m.set(v.id, v);
    return m;
  }, [venues]);

  if (!isReady) return null;
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
    setEditColor(champ.color);
    setEditError('');
    setEditing(true);
  };

  const handleSave = async () => {
    setEditError('');
    const trimmed = editName.trim();
    if (!trimmed) { setEditError('Name cannot be empty'); return; }
    try {
      await updateChampionship({ championshipId: cid, name: trimmed, description: editDesc.trim(), color: editColor });
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

  const startEditEvent = (e: Event) => {
    setEditingEventId(e.id);
    setEditEventName(e.name);
    setEditEventError('');
  };

  const handleSaveEventName = async (e: Event) => {
    setEditEventError('');
    const trimmed = editEventName.trim();
    if (!trimmed) { setEditEventError('Name cannot be empty'); return; }
    try {
      await updateEvent({
        eventId: e.id,
        name: trimmed,
        description: e.description,
        startDate: e.startDate,
        endDate: e.endDate,
      });
      setEditingEventId(null);
    } catch (err: any) {
      setEditEventError(err?.message || 'Failed to rename');
    }
  };

  return (
    <div>
      <Link to="/championships" className="back-link">&larr; Championships</Link>

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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label className="input-label" style={{ marginBottom: 0 }}>Color</label>
              <input type="color" value={editColor} onChange={(e) => setEditColor(e.target.value)} className="color-input" />
            </div>
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
            <span className="color-dot" style={{ background: champ.color, width: 14, height: 14 }} />
            <h1 style={{ marginBottom: 0 }}>{champ.name}</h1>
            <button className="ghost small" onClick={startEditing} title="Edit">&#9998;</button>
          </div>
          {champ.description && <p className="muted small-text">{champ.description}</p>}
        </div>
      )}

      {/* Events section */}
      <div className="section" style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div className="section-title" style={{ marginBottom: 0 }}>Events ({champEvents.length})</div>
          {!showEventForm && (
            <button className="primary small" onClick={() => setShowEventForm(true)}>+ Add Event</button>
          )}
        </div>

        {/* Status filter */}
        {eventRows.length > 0 && (
          <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
            {(['all', 'in_progress', 'not_started', 'completed'] as const).map(f => {
              const labels: Record<string, string> = { all: 'All', in_progress: 'In Progress', not_started: 'Not Started', completed: 'Completed' };
              return (
                <button
                  key={f}
                  className={statusFilter === f ? 'primary small' : 'ghost small'}
                  onClick={() => setStatusFilter(f)}
                >
                  {labels[f]} ({statusCounts[f]})
                </button>
              );
            })}
          </div>
        )}

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
        ) : filteredEventRows.length === 0 ? (
          <div className="empty">No events match the selected filter.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 32 }}></th>
                <th>Name</th>
                <th>Status</th>
                <th>Venue</th>
                <th>Start</th>
                <th>End</th>
              </tr>
            </thead>
            <tbody>
              {filteredEventRows.map(({ event: e, status }) => (
                <tr key={String(e.id)}>
                  <td>
                    {isAuthenticated && (
                      <button
                        className={`pin-btn${pinnedEventIds.has(e.id) ? ' pinned' : ''}`}
                        onClick={() => togglePin({ eventId: e.id })}
                        title={pinnedEventIds.has(e.id) ? 'Unpin event' : 'Pin event'}
                      >
                        {'\u{1F4CC}'}
                      </button>
                    )}
                  </td>
                  <td>
                    {editingEventId === e.id ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <input
                          type="text"
                          value={editEventName}
                          onChange={ev => setEditEventName(ev.target.value)}
                          onKeyDown={ev => {
                            if (ev.key === 'Enter') handleSaveEventName(e);
                            if (ev.key === 'Escape') setEditingEventId(null);
                          }}
                          autoFocus
                          className="input"
                          style={{ padding: '4px 8px', fontSize: '0.875rem' }}
                        />
                        <button className="primary small" onClick={() => handleSaveEventName(e)}>Save</button>
                        <button className="ghost small" onClick={() => setEditingEventId(null)}>Cancel</button>
                        {editEventError && <span style={{ color: 'var(--red)', fontSize: '0.75rem' }}>{editEventError}</span>}
                      </div>
                    ) : (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Link to={`/event/${e.slug}`} className="table-link">{e.name}</Link>
                        <button className="ghost small" onClick={() => startEditEvent(e)} title="Rename" style={{ padding: '2px 6px', fontSize: '0.75rem' }}>&#9998;</button>
                      </span>
                    )}
                  </td>
                  <td><span className={`badge ${STATUS_BADGE[status]}`}>{STATUS_LABEL[status]}</span></td>
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
