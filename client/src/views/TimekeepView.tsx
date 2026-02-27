import { useMemo } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useSpacetimeDB, useTable, useReducer } from 'spacetimedb/react';
import { tables, reducers } from '../module_bindings';
import { useAuth } from '../auth';
import { useClockSync } from '../hooks/useClockSync';
import ElapsedTimer from '../components/ElapsedTimer';
import type {
  EventTrack,
  Event,
  TrackVariation,
  Track,
  Run,
  Rider,
  EventRider,
  EventCategory,
} from '../module_bindings/types';

export default function TimekeepView() {
  const connState = useSpacetimeDB();
  const isConnected = connState.isActive;
  const { user, isAuthenticated } = useAuth();
  const { getCorrectedTime, synced } = useClockSync();

  const startRun = useReducer(reducers.startRun);
  const finishRun = useReducer(reducers.finishRun);
  const dnfRun = useReducer(reducers.dnfRun);
  const dnsRun = useReducer(reducers.dnsRun);

  const [assignments] = useTable(tables.timekeeper_assignment);
  const [eventTracks] = useTable(tables.event_track);
  const [events] = useTable(tables.event);
  const [trackVariations] = useTable(tables.track_variation);
  const [tracksData] = useTable(tables.track);
  const [runs] = useTable(tables.run);
  const [riders] = useTable(tables.rider);
  const [eventRiders] = useTable(tables.event_rider);
  const [eventCategories] = useTable(tables.event_category);

  const riderMap = useMemo(() => {
    const m = new Map<bigint, Rider>();
    for (const r of riders) m.set(r.id, r);
    return m;
  }, [riders]);

  // Build a map of riderId → display number for each event
  const riderNumberMap = useMemo(() => {
    const m = new Map<string, number | null>(); // key: `${eventId}-${riderId}`
    const catStartMap = new Map<bigint, number>();
    for (const c of eventCategories)
      catStartMap.set((c as EventCategory).id, (c as EventCategory).numberRangeStart);
    for (const er of eventRiders) {
      const e = er as EventRider;
      const num =
        e.assignedNumber !== 0
          ? e.assignedNumber
          : e.categoryId !== 0n
            ? (catStartMap.get(e.categoryId) ?? null)
            : null;
      m.set(`${e.eventId}-${e.riderId}`, num);
    }
    return m;
  }, [eventRiders, eventCategories]);

  const myAssignments = useMemo(() => {
    if (!user) return [];
    return assignments
      .filter((a: any) => a.userId === user.id)
      .map((a: any) => {
        const et = eventTracks.find((et: EventTrack) => et.id === a.eventTrackId);
        const event = et ? events.find((e: Event) => e.id === et.eventId) : undefined;
        const tv = et
          ? trackVariations.find((v: TrackVariation) => v.id === et.trackVariationId)
          : undefined;
        const track = tv ? tracksData.find((t: Track) => t.id === tv.trackId) : undefined;
        const trackRuns = et
          ? [...runs]
              .filter((r: Run) => r.eventTrackId === et.id)
              .sort((a: Run, b: Run) => a.sortOrder - b.sortOrder)
          : [];
        return { assignment: a, eventTrack: et, event, track, tv, trackRuns };
      })
      .filter((a) => a.eventTrack && a.event);
  }, [user, assignments, eventTracks, events, trackVariations, tracksData, runs]);

  if (!isAuthenticated || !user) {
    localStorage.setItem('redirect_after_login', '/timekeep');
    return <Navigate to="/" replace />;
  }

  const handleStart = (runId: bigint) => startRun({ runId, clientTime: getCorrectedTime() });
  const handleFinish = (runId: bigint) => finishRun({ runId, clientTime: getCorrectedTime() });
  const handleDnf = (runId: bigint) => dnfRun({ runId });
  const handleDns = (runId: bigint) => dnsRun({ runId });

  const getRiderNumber = (eventId: bigint, riderId: bigint) =>
    riderNumberMap.get(`${eventId}-${riderId}`);

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <h1 style={{ marginBottom: 0 }}>Timekeeping</h1>
        <div className="connection-bar" style={{ margin: 0 }}>
          <span className={`dot ${isConnected ? 'on' : ''}`} />
          {isConnected ? 'Connected' : 'Disconnected'}
          {isConnected && synced && (
            <span className="muted small-text" style={{ marginLeft: 8 }}>
              ⏱ Synced
            </span>
          )}
        </div>
      </div>

      {myAssignments.length === 0 && (
        <div className="card" style={{ padding: 24, textAlign: 'center' }}>
          <p className="muted">No track assignments yet.</p>
          <p className="muted small-text">Ask an event organizer to assign you to a track.</p>
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 12,
        }}
      >
        {myAssignments.map(({ assignment, event, track, trackRuns }) => {
          const canStart = assignment.position === 'start' || assignment.position === 'both';
          const canStop = assignment.position === 'end' || assignment.position === 'both';

          const queuedRuns = trackRuns.filter((r: Run) => r.status === 'queued');
          const runningRuns = trackRuns.filter((r: Run) => r.status === 'running');
          const nextQueued = queuedRuns.length > 0 ? queuedRuns[0] : null;

          const positionLabel =
            assignment.position === 'both'
              ? 'Start & End'
              : assignment.position === 'start'
                ? 'Start'
                : 'Finish';
          const finishedCount = trackRuns.filter((r: Run) => r.status === 'finished').length;
          const dnsCount = trackRuns.filter((r: Run) => r.status === 'dns').length;
          const dnfCount = trackRuns.filter((r: Run) => r.status === 'dnf').length;

          return (
            <div
              key={String(assignment.id)}
              className="card"
              style={{ padding: 12, display: 'flex', flexDirection: 'column' }}
            >
              {/* Header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 8,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {track?.name ?? 'Track'}
                  </div>
                  <div
                    className="muted small-text"
                    style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    <Link
                      to={`/event/${event!.slug}`}
                      style={{ color: 'var(--accent)', textDecoration: 'underline' }}
                    >
                      {event!.name}
                    </Link>
                  </div>
                </div>
                <span
                  className="badge"
                  style={{
                    fontSize: '0.65rem',
                    flexShrink: 0,
                    background:
                      assignment.position === 'both'
                        ? 'var(--accent-bg, rgba(59,130,246,0.15))'
                        : assignment.position === 'start'
                          ? 'var(--green-bg)'
                          : 'var(--yellow-bg, #fef3c7)',
                    color:
                      assignment.position === 'both'
                        ? 'var(--accent)'
                        : assignment.position === 'start'
                          ? 'var(--green)'
                          : 'var(--yellow, #d97706)',
                  }}
                >
                  {positionLabel}
                </span>
              </div>

              {/* Running riders — compact */}
              {runningRuns.map((run: Run) => {
                const rider = riderMap.get(run.riderId);
                const num = getRiderNumber(event!.id, run.riderId);
                return (
                  <div
                    key={String(run.id)}
                    style={{
                      background: 'rgba(239,68,68,0.08)',
                      borderRadius: 'var(--radius)',
                      padding: 10,
                      marginBottom: 6,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 6,
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>#{num ?? '?'}</span>
                        <span className="muted small-text" style={{ marginLeft: 6 }}>
                          {rider ? `${rider.firstName} ${rider.lastName}` : 'Unknown'}
                        </span>
                      </div>
                      <span className="badge running" style={{ fontSize: '0.6rem' }}>
                        Racing
                      </span>
                    </div>
                    <ElapsedTimer startTime={Number(run.startTime)} className="elapsed" />
                    {canStop && (
                      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                        <button
                          className="stop"
                          style={{ padding: '10px', fontSize: '0.85rem', flex: 1 }}
                          onClick={() => handleFinish(run.id)}
                        >
                          STOP
                        </button>
                        <button
                          className="dnf-btn"
                          style={{ padding: '10px', fontSize: '0.75rem' }}
                          onClick={() => handleDnf(run.id)}
                        >
                          DNF
                        </button>
                      </div>
                    )}
                    {!canStop && (
                      <div className="muted small-text" style={{ marginTop: 4 }}>
                        Waiting for finish line...
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Next queued — compact */}
              {canStart && nextQueued && (
                <div
                  style={{
                    background: 'rgba(34,197,94,0.08)',
                    borderRadius: 'var(--radius)',
                    padding: 10,
                    marginBottom: 6,
                  }}
                >
                  <div style={{ marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                      #{getRiderNumber(event!.id, nextQueued.riderId) ?? '?'}
                    </span>
                    <span className="muted small-text" style={{ marginLeft: 6 }}>
                      {(() => {
                        const r = riderMap.get(nextQueued.riderId);
                        return r ? `${r.firstName} ${r.lastName}` : 'Unknown';
                      })()}
                    </span>
                    <span className="muted small-text" style={{ marginLeft: 6 }}>
                      (#{nextQueued.sortOrder} in queue)
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      className="start"
                      style={{ padding: '10px', fontSize: '0.85rem', flex: 1 }}
                      onClick={() => handleStart(nextQueued.id)}
                    >
                      START
                    </button>
                    <button
                      className="dnf-btn"
                      style={{ padding: '10px', fontSize: '0.75rem' }}
                      onClick={() => handleDns(nextQueued.id)}
                    >
                      DNS
                    </button>
                  </div>
                </div>
              )}

              {/* Empty state */}
              {queuedRuns.length === 0 && runningRuns.length === 0 && (
                <p className="muted small-text" style={{ padding: '8px 0' }}>
                  No riders in queue.
                </p>
              )}

              {/* Summary line */}
              <div
                className="muted small-text"
                style={{
                  marginTop: 'auto',
                  paddingTop: 6,
                  borderTop: '1px solid var(--border)',
                  fontSize: '0.7rem',
                }}
              >
                {queuedRuns.length} queued · {runningRuns.length} racing · {finishedCount} finished
                · {dnfCount} DNF · {dnsCount} DNS
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
