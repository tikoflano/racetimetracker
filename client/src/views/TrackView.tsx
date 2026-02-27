import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSpacetimeDB, useTable } from 'spacetimedb/react';
import { tables } from '../module_bindings';
import { useActiveOrgMaybe } from '../OrgContext';
import type {
  Event,
  EventTrack,
  TrackVariation,
  Track,
  Run,
  Rider,
  EventRider,
  EventCategory,
} from '../module_bindings/types';
import ElapsedTimer from '../components/ElapsedTimer';
import { formatElapsed } from '../utils';

export default function TrackView() {
  const { eventSlug, eventTrackId } = useParams<{ eventSlug: string; eventTrackId: string }>();
  const etId = BigInt(eventTrackId ?? '0');
  const activeOrgId = useActiveOrgMaybe();
  const connState = useSpacetimeDB();
  const isConnected = connState.isActive;

  const [events] = useTable(tables.event);
  const [eventTracks] = useTable(tables.event_track);
  const [trackVariations] = useTable(tables.track_variation);
  const [tracksData] = useTable(tables.track);
  const [runs] = useTable(tables.run);
  const [riders] = useTable(tables.rider);
  const [eventRiders] = useTable(tables.event_rider);
  const [eventCategories] = useTable(tables.event_category);

  const _event = useMemo(() => {
    if (!eventSlug) return undefined;
    if (activeOrgId) {
      const inOrg = events.find((e: Event) => e.slug === eventSlug && e.orgId === activeOrgId);
      if (inOrg) return inOrg;
    }
    return events.find((e: Event) => e.slug === eventSlug);
  }, [eventSlug, activeOrgId, events]);
  const eventTrack = eventTracks.find((et: EventTrack) => et.id === etId);
  const tv = eventTrack
    ? trackVariations.find((v: TrackVariation) => v.id === eventTrack.trackVariationId)
    : undefined;
  const track = tv ? tracksData.find((t: Track) => t.id === tv.trackId) : undefined;

  const riderMap = useMemo(() => {
    const m = new Map<bigint, Rider>();
    for (const r of riders) m.set(r.id, r);
    return m;
  }, [riders]);

  const riderNumberMap = useMemo(() => {
    const m = new Map<string, number | null>();
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
  const dnsRuns = trackRuns.filter((r: Run) => r.status === 'dns');

  const nextQueued = queuedRuns.length > 0 ? queuedRuns[0] : null;

  const getRiderNumber = (riderId: bigint) =>
    eventTrack ? riderNumberMap.get(`${eventTrack.eventId}-${riderId}`) : null;

  if (!eventTrack) {
    if (eventTracks.length === 0) return null;
    return <div className="empty">Track not found.</div>;
  }

  return (
    <div>
      <Link to={`/event/${eventSlug}`} className="back-link">
        &larr; Back to Event
      </Link>

      <div className="connection-bar">
        <span className={`dot ${isConnected ? 'on' : ''}`} />
        {isConnected ? 'Connected' : 'Disconnected'}
      </div>

      <h1>
        {track?.name ?? 'Track'}
        {tv ? ` — ${tv.name}` : ''}
      </h1>
      {tv && (
        <p className="muted small-text" style={{ marginBottom: 20 }}>
          {tv.description}
        </p>
      )}

      {/* Currently running riders */}
      {runningRuns.length > 0 && (
        <div className="section">
          <div className="section-title">On Track</div>
          {runningRuns.map((run: Run) => {
            const rider = riderMap.get(run.riderId);
            const num = getRiderNumber(run.riderId);
            return (
              <div className="running-card" key={String(run.id)}>
                <div className="badge running" style={{ marginBottom: 8 }}>
                  Racing
                </div>
                <h3 style={{ fontSize: '1.3rem', marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, marginRight: 6 }}>#{num ?? '?'}</span>
                  {rider ? `${rider.firstName} ${rider.lastName}` : 'Unknown'}
                </h3>
                <div>
                  <ElapsedTimer startTime={Number(run.startTime)} className="elapsed large" />
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
            <p className="muted small-text" style={{ marginBottom: 4 }}>
              Up next — #{nextQueued.sortOrder} in queue
            </p>
            <h3>
              <span style={{ fontWeight: 700, marginRight: 6 }}>
                #{getRiderNumber(nextQueued.riderId) ?? '?'}
              </span>
              {(() => {
                const rider = riderMap.get(nextQueued.riderId);
                return rider ? `${rider.firstName} ${rider.lastName}` : 'Unknown';
              })()}
            </h3>
          </div>
        </div>
      )}

      {/* Next up while someone is running */}
      {nextQueued && runningRuns.length > 0 && (
        <div className="section">
          <div className="section-title">Next Up</div>
          <div
            className="card"
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <div>
              <span className="muted small-text">#{nextQueued.sortOrder} in queue</span>{' '}
              <span style={{ fontWeight: 600, marginRight: 6 }}>
                #{getRiderNumber(nextQueued.riderId) ?? '?'}
              </span>
              {(() => {
                const rider = riderMap.get(nextQueued.riderId);
                return rider ? `${rider.firstName} ${rider.lastName}` : 'Unknown';
              })()}
            </div>
            <span className="badge queued">Queued</span>
          </div>
        </div>
      )}

      {/* Remaining queue */}
      {queuedRuns.length > 1 && (
        <div className="section">
          <div className="section-title">Queue ({queuedRuns.length - 1} remaining)</div>
          {queuedRuns.slice(1).map((run: Run) => {
            const rider = riderMap.get(run.riderId);
            const num = getRiderNumber(run.riderId);
            return (
              <div
                className="card"
                key={String(run.id)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 16px',
                }}
              >
                <div>
                  <span className="muted small-text">#{run.sortOrder}</span>{' '}
                  <span style={{ fontWeight: 600, marginRight: 6 }}>#{num ?? '?'}</span>
                  {rider ? `${rider.firstName} ${rider.lastName}` : 'Unknown'}
                </div>
                <span className="badge queued">Queued</span>
              </div>
            );
          })}
        </div>
      )}

      {/* All done — only show when there are runs and all are finished */}
      {trackRuns.length > 0 && queuedRuns.length === 0 && runningRuns.length === 0 && (
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
                <th style={{ width: 50 }}>#</th>
                <th>Rider</th>
                <th style={{ textAlign: 'right' }}>Time</th>
              </tr>
            </thead>
            <tbody>
              {finishedRuns.map((run: Run, idx: number) => {
                const rider = riderMap.get(run.riderId);
                const num = getRiderNumber(run.riderId);
                const elapsed = Number(run.endTime) - Number(run.startTime);
                const pos = idx + 1;
                const posClass =
                  pos === 1
                    ? 'position p1'
                    : pos === 2
                      ? 'position p2'
                      : pos === 3
                        ? 'position p3'
                        : 'position';
                return (
                  <tr key={String(run.id)}>
                    <td>
                      <span className={posClass}>{pos}</span>
                    </td>
                    <td>
                      <span className="muted small-text">{num ?? '—'}</span>
                    </td>
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
            const num = getRiderNumber(run.riderId);
            return (
              <div
                className="card"
                key={String(run.id)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 16px',
                }}
              >
                <span>
                  <span style={{ fontWeight: 600, marginRight: 6 }}>#{num ?? '?'}</span>{' '}
                  {rider ? `${rider.firstName} ${rider.lastName}` : 'Unknown'}
                </span>
                <span className="badge dnf">DNF</span>
              </div>
            );
          })}
        </div>
      )}

      {/* DNSs */}
      {dnsRuns.length > 0 && (
        <div className="section">
          <div className="section-title">Did Not Start</div>
          {dnsRuns.map((run: Run) => {
            const rider = riderMap.get(run.riderId);
            const num = getRiderNumber(run.riderId);
            return (
              <div
                className="card"
                key={String(run.id)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 16px',
                }}
              >
                <span>
                  <span style={{ fontWeight: 600, marginRight: 6 }}>#{num ?? '?'}</span>{' '}
                  {rider ? `${rider.firstName} ${rider.lastName}` : 'Unknown'}
                </span>
                <span className="badge dns">DNS</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
