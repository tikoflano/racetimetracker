import { useMemo } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useTable, useReducer } from 'spacetimedb/react';
import { tables, reducers } from '../module_bindings';
import { useAuth } from '../auth';
import type { Event, EventTrack, TrackVariation, Track, Run, Rider } from '../module_bindings/types';
import ElapsedTimer from '../components/ElapsedTimer';
import { formatElapsed } from '../utils';

export default function TrackView() {
  const { eventId, eventTrackId } = useParams<{ eventId: string; eventTrackId: string }>();
  const etId = BigInt(eventTrackId ?? '0');
  const eid = BigInt(eventId ?? '0');
  const { isAuthenticated, canTimekeep } = useAuth();

  const startRun = useReducer(reducers.startRun);
  const finishRun = useReducer(reducers.finishRun);
  const dnfRun = useReducer(reducers.dnfRun);

  const [events] = useTable(tables.event);
  const [eventTracks] = useTable(tables.event_track);
  const [trackVariations] = useTable(tables.track_variation);
  const [tracksData] = useTable(tables.track);
  const [runs] = useTable(tables.run);
  const [riders] = useTable(tables.rider);

  const event = events.find((e: Event) => e.id === eid);
  const eventTrack = eventTracks.find((et: EventTrack) => et.id === etId);
  const tv = eventTrack ? trackVariations.find((v: TrackVariation) => v.id === eventTrack.trackVariationId) : undefined;
  const track = tv ? tracksData.find((t: Track) => t.id === tv.trackId) : undefined;

  const hasTimekeepAccess = event ? canTimekeep(eid, event.orgId) : false;

  const riderMap = useMemo(() => {
    const m = new Map<bigint, Rider>();
    for (const r of riders) m.set(r.id, r);
    return m;
  }, [riders]);

  const trackRuns = useMemo(() => {
    return [...runs]
      .filter((r: Run) => r.eventTrackId === etId)
      .sort((a: Run, b: Run) => a.sortOrder - b.sortOrder);
  }, [runs, etId]);

  const queuedRuns = trackRuns.filter((r: Run) => r.status === 'queued');
  const runningRuns = trackRuns.filter((r: Run) => r.status === 'running');
  const finishedRuns = useMemo(() => {
    return [...trackRuns]
      .filter((r: Run) => r.status === 'finished')
      .sort((a: Run, b: Run) => {
        const aTime = Number(a.endTime) - Number(a.startTime);
        const bTime = Number(b.endTime) - Number(b.startTime);
        return aTime - bTime;
      });
  }, [trackRuns]);
  const dnfRuns = trackRuns.filter((r: Run) => r.status === 'dnf');

  const nextQueued = queuedRuns.length > 0 ? queuedRuns[0] : null;

  // Redirect if not authenticated or no access
  if (!isAuthenticated || !hasTimekeepAccess) {
    return <Navigate to={`/event/${eventId}`} replace />;
  }

  const handleStart = (runId: bigint) => startRun({ runId });
  const handleFinish = (runId: bigint) => finishRun({ runId });
  const handleDnf = (runId: bigint) => dnfRun({ runId });

  if (!eventTrack) {
    if (eventTracks.length === 0) return null;
    return <div className="empty">Track not found.</div>;
  }

  return (
    <div>
      <Link to={`/event/${eventId}`} className="back-link">&larr; Back to Event</Link>

      <h1>{track?.name ?? 'Track'}{tv ? ` — ${tv.name}` : ''}</h1>
      {tv && <p className="muted small-text" style={{ marginBottom: 20 }}>{tv.description}</p>}

      {/* Currently running riders */}
      {runningRuns.length > 0 && (
        <div className="section">
          <div className="section-title">On Track</div>
          {runningRuns.map((run: Run) => {
            const rider = riderMap.get(run.riderId);
            return (
              <div className="running-card" key={String(run.id)}>
                <div className="badge running" style={{ marginBottom: 8 }}>Racing</div>
                <h3 style={{ fontSize: '1.3rem', marginBottom: 8 }}>
                  {rider ? `${rider.firstName} ${rider.lastName}` : 'Unknown'}
                </h3>
                <div style={{ marginBottom: 16 }}>
                  <ElapsedTimer startTime={Number(run.startTime)} className="elapsed large" />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="stop" onClick={() => handleFinish(run.id)}>
                    STOP
                  </button>
                  <button className="dnf-btn" onClick={() => handleDnf(run.id)} style={{ flex: '0 0 auto', padding: '16px' }}>
                    DNF
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Next rider — prominent when no one is running */}
      {nextQueued && runningRuns.length === 0 && (
        <div className="section">
          <div className="section-title">Next Rider</div>
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
            <button className="start" onClick={() => handleStart(nextQueued.id)}>
              START
            </button>
          </div>
        </div>
      )}

      {/* Next up while someone is running */}
      {nextQueued && runningRuns.length > 0 && (
        <div className="section">
          <div className="section-title">Next Up</div>
          <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span className="muted small-text">#{nextQueued.sortOrder}</span>{' '}
              {(() => {
                const rider = riderMap.get(nextQueued.riderId);
                return rider ? `${rider.firstName} ${rider.lastName}` : 'Unknown';
              })()}
            </div>
            <button className="primary small" onClick={() => handleStart(nextQueued.id)}>
              Start
            </button>
          </div>
        </div>
      )}

      {/* Remaining queue */}
      {queuedRuns.length > 1 && (
        <div className="section">
          <div className="section-title">Queue ({queuedRuns.length - 1} remaining)</div>
          {queuedRuns.slice(1).map((run: Run) => {
            const rider = riderMap.get(run.riderId);
            return (
              <div className="card" key={String(run.id)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px' }}>
                <div>
                  <span className="muted small-text">#{run.sortOrder}</span>{' '}
                  {rider ? `${rider.firstName} ${rider.lastName}` : 'Unknown'}
                </div>
                <span className="badge queued">Queued</span>
              </div>
            );
          })}
        </div>
      )}

      {/* All done */}
      {queuedRuns.length === 0 && runningRuns.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 24 }}>
          <p className="muted">All riders have completed this track.</p>
        </div>
      )}

      {/* Results */}
      {finishedRuns.length > 0 && (
        <div className="section">
          <div className="section-title">Results</div>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>Pos</th>
                <th>Rider</th>
                <th style={{ textAlign: 'right' }}>Time</th>
              </tr>
            </thead>
            <tbody>
              {finishedRuns.map((run: Run, idx: number) => {
                const rider = riderMap.get(run.riderId);
                const elapsed = Number(run.endTime) - Number(run.startTime);
                const pos = idx + 1;
                const posClass = pos === 1 ? 'position p1' : pos === 2 ? 'position p2' : pos === 3 ? 'position p3' : 'position';
                return (
                  <tr key={String(run.id)}>
                    <td><span className={posClass}>{pos}</span></td>
                    <td>{rider ? `${rider.firstName} ${rider.lastName}` : 'Unknown'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="elapsed">{formatElapsed(elapsed)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* DNFs */}
      {dnfRuns.length > 0 && (
        <div className="section">
          <div className="section-title">Did Not Finish</div>
          {dnfRuns.map((run: Run) => {
            const rider = riderMap.get(run.riderId);
            return (
              <div className="card" key={String(run.id)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px' }}>
                <span>{rider ? `${rider.firstName} ${rider.lastName}` : 'Unknown'}</span>
                <span className="badge dnf">DNF</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
