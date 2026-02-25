import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTable, useReducer } from 'spacetimedb/react';
import { tables, reducers } from '../module_bindings';
import { useAuth } from '../auth';
import { useActiveOrgMaybe } from '../OrgContext';
import type { Event, Venue, EventTrack, Rider, EventRider, PinnedEvent, Organization } from '../module_bindings/types';
import { formatElapsed } from '../utils';

export default function EventView() {
  const { eventSlug, orgSlug } = useParams<{ eventSlug: string; orgSlug?: string }>();
  const activeOrgId = useActiveOrgMaybe();
  const { user, isAuthenticated, canOrganizeEvent } = useAuth();

  const [events] = useTable(tables.event);
  const [orgs] = useTable(tables.organization);
  const [venues] = useTable(tables.venue);
  const [eventTracks] = useTable(tables.event_track);
  const [runs] = useTable(tables.run);
  const [riders] = useTable(tables.rider);
  const [eventRiders] = useTable(tables.event_rider);
  const [pinnedEvents] = useTable(tables.pinned_event);

  const updateEvent = useReducer(reducers.updateEvent);
  const togglePin = useReducer(reducers.togglePinEvent);

  const event = useMemo(() => {
    if (!eventSlug) return null;
    if (orgSlug) {
      const org = orgs.find((o: Organization) => o.slug === orgSlug);
      if (!org) return null;
      return events.find((e: Event) => e.slug === eventSlug && e.orgId === org.id) ?? null;
    }
    if (activeOrgId) {
      const inOrg = events.find((e: Event) => e.slug === eventSlug && e.orgId === activeOrgId);
      if (inOrg) return inOrg;
    }
    return events.find((e: Event) => e.slug === eventSlug) ?? null;
  }, [eventSlug, orgSlug, activeOrgId, events, orgs]);

  const eid = event?.id ?? 0n;

  const isPinned = useMemo(() => {
    if (!user || !event) return false;
    return pinnedEvents.some((p: PinnedEvent) => p.userId === user.id && p.eventId === eid);
  }, [user, pinnedEvents, eid, event]);

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [nameError, setNameError] = useState('');

  const venue = event ? venues.find((v: Venue) => v.id === event.venueId) : undefined;

  const canEdit = event ? canOrganizeEvent(eid, event.orgId) : false;

  const sortedEventTracks = useMemo(() => {
    return [...eventTracks]
      .filter((et: EventTrack) => et.eventId === eid)
      .sort((a: EventTrack, b: EventTrack) => a.sortOrder - b.sortOrder);
  }, [eventTracks, eid]);

  const eventRiderIds = useMemo(() => {
    return new Set(
      eventRiders
        .filter((er: EventRider) => er.eventId === eid)
        .map((er: EventRider) => er.riderId)
    );
  }, [eventRiders, eid]);

  const riderMap = useMemo(() => {
    const m = new Map<bigint, Rider>();
    for (const r of riders) m.set(r.id, r);
    return m;
  }, [riders]);

  const leaderboard = useMemo(() => {
    const etIds = new Set(sortedEventTracks.map((et: EventTrack) => et.id));
    const riderTimes = new Map<bigint, { total: number; trackCount: number; dnf: boolean }>();

    for (const run of runs) {
      if (!etIds.has(run.eventTrackId)) continue;
      if (!eventRiderIds.has(run.riderId)) continue;

      const entry = riderTimes.get(run.riderId) ?? { total: 0, trackCount: 0, dnf: false };

      if (run.status === 'finished') {
        const elapsed = Number(run.endTime) - Number(run.startTime);
        entry.total += elapsed;
        entry.trackCount++;
      } else if (run.status === 'dnf') {
        entry.dnf = true;
      }

      riderTimes.set(run.riderId, entry);
    }

    const totalTracks = sortedEventTracks.length;

    return [...riderTimes.entries()]
      .map(([riderId, data]) => ({
        rider: riderMap.get(riderId),
        total: data.total,
        complete: data.trackCount === totalTracks && !data.dnf,
        dnf: data.dnf,
        trackCount: data.trackCount,
      }))
      .sort((a, b) => {
        if (a.complete && !b.complete) return -1;
        if (!a.complete && b.complete) return 1;
        if (a.complete && b.complete) return a.total - b.total;
        if (a.dnf && !b.dnf) return 1;
        if (!a.dnf && b.dnf) return -1;
        if (a.trackCount !== b.trackCount) return b.trackCount - a.trackCount;
        return a.total - b.total;
      });
  }, [runs, sortedEventTracks, eventRiderIds, riderMap]);

  if (!event) {
    if (events.length === 0) return null;
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <div style={{ fontSize: '4rem', fontWeight: 700, opacity: 0.2, marginBottom: 8 }}>404</div>
        <h2 style={{ marginBottom: 8 }}>Event not found</h2>
        <p className="muted" style={{ marginBottom: 20 }}>
          {orgSlug
            ? `No event "${eventSlug}" exists in organization "${orgSlug}".`
            : `No event "${eventSlug}" exists in the current organization.`}
        </p>
        <a href="/" className="primary" style={{ display: 'inline-block', padding: '8px 20px', borderRadius: 'var(--radius)', textDecoration: 'none' }}>
          Go home
        </a>
      </div>
    );
  }

  return (
    <div>
      {editingName ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <input
            type="text"
            value={nameValue}
            onChange={e => setNameValue(e.target.value)}
            onKeyDown={async e => {
              if (e.key === 'Enter') {
                setNameError('');
                const trimmed = nameValue.trim();
                if (!trimmed) { setNameError('Name cannot be empty'); return; }
                try {
                  await updateEvent({ eventId: eid, name: trimmed, description: event.description, startDate: event.startDate, endDate: event.endDate });
                  setEditingName(false);
                } catch (err: any) { setNameError(err?.message || 'Failed'); }
              }
              if (e.key === 'Escape') setEditingName(false);
            }}
            autoFocus
            className="input"
            style={{ fontSize: '1.4rem', fontWeight: 700, flex: 1, maxWidth: 400 }}
          />
          <button className="primary small" onClick={async () => {
            setNameError('');
            const trimmed = nameValue.trim();
            if (!trimmed) { setNameError('Name cannot be empty'); return; }
            try {
              await updateEvent({ eventId: eid, name: trimmed, description: event.description, startDate: event.startDate, endDate: event.endDate });
              setEditingName(false);
            } catch (err: any) { setNameError(err?.message || 'Failed'); }
          }}>Save</button>
          <button className="ghost small" onClick={() => setEditingName(false)}>Cancel</button>
          {nameError && <span style={{ color: 'var(--red)', fontSize: '0.8rem' }}>{nameError}</span>}
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h1 style={{ marginBottom: 0 }}>{event.name}</h1>
          {canEdit && (
            <button className="ghost small" onClick={() => { setNameValue(event.name); setNameError(''); setEditingName(true); }} title="Rename">&#9998;</button>
          )}
          {isAuthenticated && (
            <button
              className={`pin-btn${isPinned ? ' pinned' : ''}`}
              onClick={() => togglePin({ eventId: eid })}
              title={isPinned ? 'Unpin event' : 'Pin event'}
            >
              {'\u{1F4CC}'}
            </button>
          )}
        </div>
      )}
      <p className="muted small-text" style={{ marginBottom: 4 }}>{event.description}</p>
      {venue && (
        <p className="muted small-text" style={{ marginBottom: 4 }}>
          <Link to={`/venue/${venue.id}`} style={{ color: 'inherit' }}>{venue.name}</Link>
          {' '}&middot; {event.startDate} &ndash; {event.endDate}
        </p>
      )}

      {/* Manage event link */}
      {canEdit && (
        <div style={{ marginBottom: 20 }}>
          <Link to={`/event/${event.slug}/manage`} className="primary small" style={{ textDecoration: 'none', display: 'inline-block', padding: '4px 12px', borderRadius: 'var(--radius)', background: 'var(--accent)', color: 'white', fontSize: '0.8rem' }}>
            Manage Event
          </Link>
        </div>
      )}

      {/* Leaderboard — always visible */}
      <div className="section">
        <div className="section-title">Leaderboard</div>
        {leaderboard.length === 0 ? (
          <div className="empty">No results yet.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>Pos</th>
                <th>Rider</th>
                <th>Tracks</th>
                <th style={{ textAlign: 'right' }}>Total Time</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry, idx) => {
                const pos = idx + 1;
                const posClass = pos === 1 ? 'position p1' : pos === 2 ? 'position p2' : pos === 3 ? 'position p3' : 'position';
                return (
                  <tr key={entry.rider ? String(entry.rider.id) : idx}>
                    <td><span className={posClass}>{entry.complete ? pos : '-'}</span></td>
                    <td>
                      {entry.rider ? `${entry.rider.firstName} ${entry.rider.lastName}` : 'Unknown'}
                    </td>
                    <td className="muted small-text">
                      {entry.trackCount}/{sortedEventTracks.length}
                      {entry.dnf && <span className="badge dnf" style={{ marginLeft: 6 }}>DNF</span>}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {entry.total > 0 ? (
                        <span className="elapsed">{formatElapsed(entry.total)}</span>
                      ) : (
                        <span className="muted">--:--</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Prompt for non-authenticated users */}
      {!isAuthenticated && (
        <div className="card" style={{ textAlign: 'center', padding: 20, marginTop: 12 }}>
          <p className="muted small-text">Sign in to access track timing and event management.</p>
        </div>
      )}
    </div>
  );
}
