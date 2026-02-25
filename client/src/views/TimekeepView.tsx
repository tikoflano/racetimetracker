import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useSpacetimeDB, useTable, useReducer } from 'spacetimedb/react';
import { tables, reducers } from '../module_bindings';
import { useAuth } from '../auth';
import { useClockSync } from '../hooks/useClockSync';
import ElapsedTimer from '../components/ElapsedTimer';
import { formatElapsed } from '../utils';
import type { EventTrack, Event, TrackVariation, Track, Run, Rider } from '../module_bindings/types';

export default function TimekeepView() {
  const connState = useSpacetimeDB();
  const isConnected = connState.isActive;
  const { user, isAuthenticated } = useAuth();
  const { getCorrectedTime, synced } = useClockSync();

  const startRun = useReducer(reducers.startRun);
  const finishRun = useReducer(reducers.finishRun);
  const dnfRun = useReducer(reducers.dnfRun);

  const [assignments] = useTable(tables.timekeeper_assignment);
  const [eventTracks] = useTable(tables.event_track);
  const [events] = useTable(tables.event);
  const [trackVariations] = useTable(tables.track_variation);
  const [tracksData] = useTable(tables.track);
  const [runs] = useTable(tables.run);
  const [riders] = useTable(tables.rider);

  const riderMap = useMemo(() => {
    const m = new Map<bigint, Rider>();
    for (const r of riders) m.set(r.id, r);
    return m;
  }, [riders]);

  const myAssignments = useMemo(() => {
    if (!user) return [];
    return assignments
      .filter((a: any) => a.userId === user.id)
      .map((a: any) => {
        const et = eventTracks.find((et: EventTrack) => et.id === a.eventTrackId);
        const event = et ? events.find((e: Event) => e.id === et.eventId) : undefined;
        const tv = et ? trackVariations.find((v: TrackVariation) => v.id === et.trackVariationId) : undefined;
        const track = tv ? tracksData.find((t: Track) => t.id === tv.trackId) : undefined;
        const trackRuns = et
          ? [...runs].filter((r: Run) => r.eventTrackId === et.id).sort((a: Run, b: Run) => a.sortOrder - b.sortOrder)
          : [];
        return { assignment: a, eventTrack: et, event, track, tv, trackRuns };
      })
      .filter(a => a.eventTrack && a.event);
  }, [user, assignments, eventTracks, events, trackVariations, tracksData, runs]);

  if (!isAuthenticated || !user) {
    return <div className="empty">Sign in to access timekeeping.</div>;
  }

  if (myAssignments.length === 0) {
    return (
      <div>
        <h1>Timekeeping</h1>
        <div className="empty">You have no track assignments. Ask an event organizer to assign you.</div>
      </div>
    );
  }

  const handleStart = (runId: bigint) => startRun({ runId, clientTime: getCorrectedTime() });
  const handleFinish = (runId: bigint) => finishRun({ runId, clientTime: getCorrectedTime() });
  const handleDnf = (runId: bigint) => dnfRun({ runId });

  return (
    <div>
      <h1>Timekeeping</h1>

      <div className="connection-bar" style={{ marginBottom: 20 }}>
        <span className={`dot ${isConnected ? 'on' : ''}`} />
        {isConnected ? 'Connected' : 'Disconnected'}
        {isConnected && (
          <span className="muted small-text" style={{ marginLeft: 12 }}>
            {synced ? '⏱ Synced' : '⏱ Syncing...'}
          </span>
        )}
      </div>

      {myAssignments.map(({ assignment, eventTrack, event, track, tv, trackRuns }) => {
        const canStart = assignment.position === 'start' || assignment.position === 'both';
        const canStop = assignment.position === 'end' || assignment.position === 'both';

        const queuedRuns = trackRuns.filter((r: Run) => r.status === 'queued');
        const runningRuns = trackRuns.filter((r: Run) => r.status === 'running');
        const nextQueued = queuedRuns.length > 0 ? queuedRuns[0] : null;

        const positionLabel = assignment.position === 'both' ? 'Start & End' : assignment.position === 'start' ? 'Start line' : 'Finish line';

        return (
          <div key={String(assignment.id)} className="card" style={{ marginBottom: 20, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <h2 style={{ marginBottom: 4 }}>{track?.name ?? 'Track'}{tv ? ` — ${tv.name}` : ''}</h2>
                <p className="muted small-text">
                  <Link to={`/event/${event!.slug}`} style={{ color: 'inherit' }}>{event!.name}</Link>
                </p>
              </div>
              <span className="badge" style={{
                background: assignment.position === 'both' ? 'var(--accent-bg, rgba(59,130,246,0.15))' : assignment.position === 'start' ? 'var(--green-bg)' : 'var(--yellow-bg, #fef3c7)',
                color: assignment.position === 'both' ? 'var(--accent)' : assignment.position === 'start' ? 'var(--green)' : 'var(--yellow, #d97706)',
              }}>
                {positionLabel}
              </span>
            </div>

            {/* Running riders */}
            {runningRuns.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                {runningRuns.map((run: Run) => {
                  const rider = riderMap.get(run.riderId);
                  return (
                    <div className="running-card" key={String(run.id)} style={{ marginBottom: 8 }}>
                      <div className="badge running" style={{ marginBottom: 8 }}>Racing</div>
                      <h3 style={{ fontSize: '1.3rem', marginBottom: 8 }}>
                        {rider ? `${rider.firstName} ${rider.lastName}` : 'Unknown'}
                      </h3>
                      <div style={{ marginBottom: 16 }}>
                        <ElapsedTimer startTime={Number(run.startTime)} className="elapsed large" />
                      </div>
                      {canStop && (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="stop" onClick={() => handleFinish(run.id)}>STOP</button>
                          <button className="dnf-btn" onClick={() => handleDnf(run.id)} style={{ flex: '0 0 auto', padding: '16px' }}>DNF</button>
                        </div>
                      )}
                      {!canStop && (
                        <p className="muted small-text">Waiting for finish line timekeeper...</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Next queued rider */}
            {canStart && nextQueued && runningRuns.length === 0 && (
              <div className="next-rider-card">
                <p className="muted small-text" style={{ marginBottom: 4 }}>Up next</p>
                <h3>
                  {(() => {
                    const rider = riderMap.get(nextQueued.riderId);
                    return rider ? `${rider.firstName} ${rider.lastName}` : 'Unknown';
                  })()}
                </h3>
                <p className="muted small-text" style={{ marginBottom: 16 }}>
                  #{nextQueued.sortOrder} in queue
                </p>
                <button className="start" onClick={() => handleStart(nextQueued.id)}>START</button>
              </div>
            )}

            {/* Start-only: show running count when riders are on track */}
            {canStart && !canStop && runningRuns.length > 0 && nextQueued && (
              <div className="next-rider-card" style={{ marginTop: 8 }}>
                <p className="muted small-text" style={{ marginBottom: 4 }}>Up next</p>
                <h3>
                  {(() => {
                    const rider = riderMap.get(nextQueued.riderId);
                    return rider ? `${rider.firstName} ${rider.lastName}` : 'Unknown';
                  })()}
                </h3>
                <p className="muted small-text" style={{ marginBottom: 16 }}>
                  #{nextQueued.sortOrder} in queue &middot; {runningRuns.length} on track
                </p>
                <button className="start" onClick={() => handleStart(nextQueued.id)}>START</button>
              </div>
            )}

            {/* No runners, no queue */}
            {queuedRuns.length === 0 && runningRuns.length === 0 && (
              <p className="muted small-text">No riders in queue.</p>
            )}

            {/* Summary */}
            <div className="muted small-text" style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
              {queuedRuns.length} queued &middot; {runningRuns.length} racing &middot;{' '}
              {trackRuns.filter((r: Run) => r.status === 'finished').length} finished &middot;{' '}
              {trackRuns.filter((r: Run) => r.status === 'dnf').length} DNF
            </div>
          </div>
        );
      })}
    </div>
  );
}
