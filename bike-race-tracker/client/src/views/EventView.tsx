import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTable } from 'spacetimedb/react';
import { tables } from '../module_bindings';
import { useAuth } from '../auth';
import type { Event, Venue, EventTrack, TrackVariation, Track, Run, Rider, EventRider } from '../module_bindings/types';
import { formatElapsed } from '../utils';

export default function EventView() {
  const { eventId } = useParams<{ eventId: string }>();
  const eid = BigInt(eventId ?? '0');
  const { isAuthenticated, canTimekeep, canOrganizeEvent } = useAuth();

  const [events] = useTable(tables.event);
  const [venues] = useTable(tables.venue);
  const [eventTracks] = useTable(tables.event_track);
  const [trackVariations] = useTable(tables.track_variation);
  const [tracksData] = useTable(tables.track);
  const [runs] = useTable(tables.run);
  const [riders] = useTable(tables.rider);
  const [eventRiders] = useTable(tables.event_rider);

  const event = events.find((e: Event) => e.id === eid);
  const venue = event ? venues.find((v: Venue) => v.id === event.venueId) : undefined;

  const hasAccess = event ? (canTimekeep(eid, event.orgId) || canOrganizeEvent(eid, event.orgId)) : false;

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
    for (const tv of trackVariations) m.set(tv.id, tv);
    return m;
  }, [trackVariations]);

  const trackMap = useMemo(() => {
    const m = new Map<bigint, Track>();
    for (const t of tracksData) m.set(t.id, t);
    return m;
  }, [tracksData]);

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
    return <div className="empty">Event not found.</div>;
  }

  return (
    <div>
      <h1>{event.name}</h1>
      <p className="muted small-text" style={{ marginBottom: 4 }}>{event.description}</p>
      {venue && (
        <p className="muted small-text" style={{ marginBottom: 20 }}>
          {venue.name} &middot; {event.startDate} &ndash; {event.endDate}
        </p>
      )}

      {/* Tracks — only visible to authenticated users with access */}
      {isAuthenticated && hasAccess && (
        <div className="section">
          <div className="section-title">Tracks</div>
          {sortedEventTracks.length === 0 ? (
            <div className="empty">No tracks assigned to this event.</div>
          ) : (
            sortedEventTracks.map((et: EventTrack) => {
              const tv = tvMap.get(et.trackVariationId);
              const track = tv ? trackMap.get(tv.trackId) : undefined;
              const trackRuns = runs.filter((r: Run) => r.eventTrackId === et.id);
              const runningCount = trackRuns.filter((r: Run) => r.status === 'running').length;
              const finishedCount = trackRuns.filter((r: Run) => r.status === 'finished').length;
              const queuedCount = trackRuns.filter((r: Run) => r.status === 'queued').length;

              return (
                <Link
                  key={String(et.id)}
                  to={`/event/${eventId}/track/${et.id}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <div className="card">
                    <div className="track-card">
                      <div>
                        <h3>{track?.name ?? 'Unknown Track'}{tv ? ` — ${tv.name}` : ''}</h3>
                        {tv && <p className="muted small-text">{tv.description}</p>}
                      </div>
                      <div style={{ textAlign: 'right', fontSize: '0.8rem' }}>
                        {runningCount > 0 && <span className="badge running" style={{ marginRight: 4 }}>{runningCount} racing</span>}
                        {queuedCount > 0 && <span className="badge queued" style={{ marginRight: 4 }}>{queuedCount} queued</span>}
                        <span className="badge finished">{finishedCount} done</span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
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
