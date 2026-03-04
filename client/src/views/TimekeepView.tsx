import { useMemo } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useSpacetimeDB, useTable, useReducer } from 'spacetimedb/react';
import { Paper, Badge, Button, Group, Text, Box, SimpleGrid } from '@mantine/core';
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
  TimekeeperAssignment,
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
      .filter((a: TimekeeperAssignment) => a.userId === user.id)
      .map((a: TimekeeperAssignment) => {
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
      <Group justify="space-between" align="center" mb="md">
        <h1 style={{ marginBottom: 0 }}>Timekeeping</h1>
        <div className="connection-bar" style={{ margin: 0 }}>
          <span className={`dot ${isConnected ? 'on' : ''}`} />
          {isConnected ? 'Connected' : 'Disconnected'}
          {isConnected && synced && (
            <Text span size="sm" c="dimmed" ml="xs">
              ⏱ Synced
            </Text>
          )}
        </div>
      </Group>

      {myAssignments.length === 0 && (
        <Paper withBorder p="xl" ta="center">
          <Text c="dimmed">No track assignments yet.</Text>
          <Text size="sm" c="dimmed">
            Ask an event organizer to assign you to a track.
          </Text>
        </Paper>
      )}

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
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

          const positionBadgeColor =
            assignment.position === 'both' ? 'blue' : assignment.position === 'start' ? 'green' : 'yellow';

          return (
            <Paper
              key={String(assignment.id)}
              withBorder
              p="sm"
              style={{ display: 'flex', flexDirection: 'column' }}
            >
              {/* Header */}
              <Group justify="space-between" align="center" mb="xs">
                <Box style={{ minWidth: 0 }}>
                  <Text fw={600} size="sm" truncate>
                    {track?.name ?? 'Track'}
                  </Text>
                  <Text size="xs" c="dimmed" truncate>
                    <Link to={`/event/${event!.slug}`} style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
                      {event!.name}
                    </Link>
                  </Text>
                </Box>
                <Badge color={positionBadgeColor} variant="light" size="xs">
                  {positionLabel}
                </Badge>
              </Group>

              {/* Running riders — compact */}
              {runningRuns.map((run: Run) => {
                const rider = riderMap.get(run.riderId);
                const num = getRiderNumber(event!.id, run.riderId);
                return (
                  <Box
                    key={String(run.id)}
                    p="sm"
                    mb="xs"
                    style={{ background: 'rgba(239,68,68,0.08)', borderRadius: 'var(--radius)' }}
                  >
                    <Group justify="space-between" align="center" mb="xs">
                      <Group gap="xs">
                        <Text fw={700} size="lg">
                          #{num ?? '?'}
                        </Text>
                        <Text size="sm" c="dimmed">
                          {rider ? `${rider.firstName} ${rider.lastName}` : 'Unknown'}
                        </Text>
                      </Group>
                      <Badge color="green" variant="light" size="xs">
                        Racing
                      </Badge>
                    </Group>
                    <ElapsedTimer startTime={Number(run.startTime)} className="elapsed" />
                    {canStop && (
                      <Group gap="xs" mt="xs">
                        <Button
                          color="red"
                          size="sm"
                          style={{ flex: 1 }}
                          onClick={() => handleFinish(run.id)}
                        >
                          STOP
                        </Button>
                        <Button
                          color="orange"
                          variant="filled"
                          size="xs"
                          onClick={() => handleDnf(run.id)}
                        >
                          DNF
                        </Button>
                      </Group>
                    )}
                    {!canStop && (
                      <Text size="sm" c="dimmed" mt="xs">
                        Waiting for finish line...
                      </Text>
                    )}
                  </Box>
                );
              })}

              {/* Next queued — compact */}
              {canStart && nextQueued && (
                <Box
                  p="sm"
                  mb="xs"
                  style={{ background: 'rgba(34,197,94,0.08)', borderRadius: 'var(--radius)' }}
                >
                  <Group gap="xs" mb="xs">
                    <Text fw={700} size="lg">
                      #{getRiderNumber(event!.id, nextQueued.riderId) ?? '?'}
                    </Text>
                    <Text size="sm" c="dimmed">
                      {(() => {
                        const r = riderMap.get(nextQueued.riderId);
                        return r ? `${r.firstName} ${r.lastName}` : 'Unknown';
                      })()}
                    </Text>
                    <Text size="sm" c="dimmed">
                      (#{nextQueued.sortOrder} in queue)
                    </Text>
                  </Group>
                  <Group gap="xs">
                    <Button
                      color="green"
                      size="sm"
                      style={{ flex: 1 }}
                      onClick={() => handleStart(nextQueued.id)}
                    >
                      START
                    </Button>
                    <Button
                      color="orange"
                      variant="filled"
                      size="xs"
                      onClick={() => handleDns(nextQueued.id)}
                    >
                      DNS
                    </Button>
                  </Group>
                </Box>
              )}

              {/* Empty state */}
              {queuedRuns.length === 0 && runningRuns.length === 0 && (
                <Text size="sm" c="dimmed" py="xs">
                  No riders in queue.
                </Text>
              )}

              {/* Summary line */}
              <Text
                size="xs"
                c="dimmed"
                mt="auto"
                pt="xs"
                style={{ borderTop: '1px solid var(--border)' }}
              >
                {queuedRuns.length} queued · {runningRuns.length} racing · {finishedCount} finished
                · {dnfCount} DNF · {dnsCount} DNS
              </Text>
            </Paper>
          );
        })}
      </SimpleGrid>
    </div>
  );
}
