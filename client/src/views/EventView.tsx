import { useState, useMemo, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTable, useReducer } from 'spacetimedb/react';
import { tables, reducers } from '../module_bindings';
import { useAuth } from '../auth';
import { useActiveOrgMaybe } from '../OrgContext';
import Modal from '../components/Modal';
import type { Event, Venue, EventTrack, TrackVariation, Track, Rider, EventRider, Run, PinnedEvent, Organization } from '../module_bindings/types';
import { FontAwesomeIcon, faPen, faThumbtack, faLink, faEllipsisVertical, faGear } from '../icons';
import { formatElapsed } from '../utils';

export default function EventView() {
  const { eventSlug, orgSlug } = useParams<{ eventSlug: string; orgSlug?: string }>();
  const activeOrgId = useActiveOrgMaybe();
  const { user, isAuthenticated, canOrganizeEvent } = useAuth();

  const [events] = useTable(tables.event);
  const [orgs] = useTable(tables.organization);
  const [venues] = useTable(tables.venue);
  const [eventTracks] = useTable(tables.event_track);
  const [trackVariations] = useTable(tables.track_variation);
  const [tracksData] = useTable(tables.track);
  const [runs] = useTable(tables.run);
  const [riders] = useTable(tables.rider);
  const [eventRiders] = useTable(tables.event_rider);
  const [pinnedEvents] = useTable(tables.pinned_event);

  const updateEvent = useReducer(reducers.updateEvent);
  const togglePin = useReducer(reducers.togglePinEvent);

  const [expandedRiderId, setExpandedRiderId] = useState<bigint | null>(null);

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
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [eventMenuOpen, setEventMenuOpen] = useState(false);

  const venue = event ? venues.find((v: Venue) => v.id === event.venueId) : undefined;
  const eventOrg = event ? orgs.find((o: Organization) => o.id === event.orgId) : undefined;

  const publicUrl = useMemo(() => {
    if (!event || !eventOrg) return '';
    return `${window.location.origin}/${eventOrg.slug}/event/${event.slug}`;
  }, [event, eventOrg]);

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

  const tvMap = useMemo(() => {
    const m = new Map<bigint, TrackVariation>();
    for (const v of trackVariations) m.set(v.id, v as TrackVariation);
    return m;
  }, [trackVariations]);

  const trackMap = useMemo(() => {
    const m = new Map<bigint, Track>();
    for (const t of tracksData) m.set(t.id, t as Track);
    return m;
  }, [tracksData]);

  type RunDetail = { eventTrackId: bigint; trackName: string; status: string; elapsed: number };

  const leaderboard = useMemo(() => {
    const etIds = new Set(sortedEventTracks.map((et: EventTrack) => et.id));
    const riderData = new Map<bigint, { total: number; trackCount: number; dnf: boolean; runs: RunDetail[] }>();

    for (const run of runs) {
      if (!etIds.has(run.eventTrackId)) continue;
      if (!eventRiderIds.has(run.riderId)) continue;

      const entry = riderData.get(run.riderId) ?? { total: 0, trackCount: 0, dnf: false, runs: [] };
      const et = sortedEventTracks.find((e: EventTrack) => e.id === run.eventTrackId);
      const tv = et ? tvMap.get(et.trackVariationId) : undefined;
      const track = tv ? trackMap.get(tv.trackId) : undefined;
      const trackName = track ? track.name : 'Track';
      const elapsed = run.status === 'finished' ? Number(run.endTime) - Number(run.startTime) : 0;

      if (run.status === 'finished') {
        entry.total += elapsed;
        entry.trackCount++;
      } else if (run.status === 'dnf') {
        entry.dnf = true;
      }

      entry.runs.push({ eventTrackId: run.eventTrackId, trackName, status: run.status, elapsed });
      riderData.set(run.riderId, entry);
    }

    const totalTracks = sortedEventTracks.length;

    return [...riderData.entries()]
      .map(([riderId, data]) => ({
        riderId,
        rider: riderMap.get(riderId),
        total: data.total,
        complete: data.trackCount === totalTracks && !data.dnf,
        dnf: data.dnf,
        trackCount: data.trackCount,
        runs: data.runs,
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
  }, [runs, sortedEventTracks, eventRiderIds, riderMap, tvMap, trackMap]);

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
          <EventActionMenu
            open={eventMenuOpen}
            onToggle={() => setEventMenuOpen(!eventMenuOpen)}
            onClose={() => setEventMenuOpen(false)}
            canEdit={canEdit}
            isAuthenticated={isAuthenticated}
            isPinned={isPinned}
            hasPublicUrl={!!publicUrl}
            onRename={() => { setEventMenuOpen(false); setNameValue(event.name); setNameError(''); setEditingName(true); }}
            onPin={() => { setEventMenuOpen(false); togglePin({ eventId: eid }); }}
            onShare={() => { setEventMenuOpen(false); setCopied(false); setShareOpen(true); }}
            onManage={() => { setEventMenuOpen(false); }}
            manageUrl={`/event/${event.slug}/manage`}
          />
        </div>
      )}
      <p className="muted small-text" style={{ marginBottom: 4 }}>{event.description}</p>
      {venue && (
        <p className="muted small-text" style={{ marginBottom: 16 }}>
          <Link to={`/venue/${venue.id}`} style={{ color: 'inherit' }}>{venue.name}</Link>
          {' '}&middot; {event.startDate} &ndash; {event.endDate}
        </p>
      )}

      {/* Leaderboard — always visible */}
      <div className="section">
        <div className="section-title">Leaderboard</div>
        {leaderboard.length === 0 ? (
          <div className="empty">No results yet.</div>
        ) : (
          <table className="data-table">
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
                const isExpanded = expandedRiderId === entry.riderId;
                return (
                  <>
                    <tr
                      key={entry.rider ? String(entry.rider.id) : idx}
                      onClick={() => setExpandedRiderId(isExpanded ? null : entry.riderId)}
                      style={{ cursor: 'pointer' }}
                    >
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
                    {isExpanded && (
                      <tr key={`${entry.riderId}-detail`}>
                        <td colSpan={4} style={{ padding: '0 12px 12px 52px', background: 'var(--surface-hover, rgba(255,255,255,0.02))' }}>
                          <table style={{ width: '100%', fontSize: '0.8rem' }}>
                            <tbody>
                              {sortedEventTracks.map((et: EventTrack) => {
                                const tv = tvMap.get(et.trackVariationId);
                                const track = tv ? trackMap.get(tv.trackId) : undefined;
                                const run = entry.runs.find(r => r.eventTrackId === et.id);
                                return (
                                  <tr key={String(et.id)} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '6px 0', color: 'var(--text-muted)' }}>{track?.name ?? 'Track'}</td>
                                    <td style={{ padding: '6px 0', textAlign: 'right' }}>
                                      {run ? (
                                        run.status === 'finished' ? (
                                          <span className="elapsed">{formatElapsed(run.elapsed)}</span>
                                        ) : (
                                          <span className={`badge ${run.status === 'dnf' ? 'dnf' : run.status === 'dns' ? '' : 'running'}`}>
                                            {run.status.toUpperCase()}
                                          </span>
                                        )
                                      ) : (
                                        <span className="muted">—</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </>
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

      {/* Share modal */}
      <Modal open={shareOpen} onClose={() => setShareOpen(false)} title="Share Event">
        <p className="muted small-text" style={{ marginBottom: 12 }}>Anyone with this link can view the event leaderboard.</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            readOnly
            value={publicUrl}
            className="input"
            style={{ flex: 1, fontSize: '0.8rem' }}
            onFocus={e => e.target.select()}
          />
          <button
            className="primary"
            onClick={() => {
              navigator.clipboard.writeText(publicUrl);
              setCopied(true);
            }}
            style={{ whiteSpace: 'nowrap' }}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </Modal>
    </div>
  );
}

function EventActionMenu({ open, onToggle, onClose, canEdit, isAuthenticated, isPinned, hasPublicUrl, onRename, onPin, onShare, onManage, manageUrl }: {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  canEdit: boolean;
  isAuthenticated: boolean;
  isPinned: boolean;
  hasPublicUrl: boolean;
  onRename: () => void;
  onPin: () => void;
  onShare: () => void;
  onManage: () => void;
  manageUrl: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open, onClose]);

  const itemStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
    gap: 10, width: '100%',
    padding: '9px 14px', border: 'none', background: 'none',
    color: 'var(--text)', fontSize: '0.85rem', textAlign: 'left', cursor: 'pointer',
  };
  const iconStyle: React.CSSProperties = { width: 16, textAlign: 'center', flexShrink: 0 };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="ghost small" onClick={onToggle} title="Event actions" style={{ fontSize: '1rem', padding: '4px 8px' }}>
        <FontAwesomeIcon icon={faEllipsisVertical} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', left: 0, top: '100%', marginTop: 4,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          minWidth: 200, zIndex: 50, overflow: 'hidden',
        }}>
          {canEdit && (
            <button onClick={onRename} style={itemStyle}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--border)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <span style={iconStyle}><FontAwesomeIcon icon={faPen} /></span><span>Rename event</span>
            </button>
          )}
          {isAuthenticated && (
            <button onClick={onPin} style={itemStyle}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--border)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <span style={iconStyle}><FontAwesomeIcon icon={faThumbtack} /></span><span>{isPinned ? 'Unpin event' : 'Pin event'}</span>
            </button>
          )}
          {hasPublicUrl && (
            <button onClick={onShare} style={itemStyle}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--border)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <span style={iconStyle}><FontAwesomeIcon icon={faLink} /></span><span>Share event</span>
            </button>
          )}
          {canEdit && (
            <Link to={manageUrl} onClick={onManage} style={{ ...itemStyle, textDecoration: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--border)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <span style={iconStyle}><FontAwesomeIcon icon={faGear} /></span><span>Manage event</span>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
