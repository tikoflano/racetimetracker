import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useSpacetimeDB, useTable } from 'spacetimedb/react';
import { Table, Badge, Paper, Stack, Group, Text, Title } from '@mantine/core';
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
import BackLink from '../components/BackLink';
import ConnectionIndicator from '../components/ConnectionIndicator';
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
    return (
      <Text c="dimmed" ta="center" py="xl">
        Track not found.
      </Text>
    );
  }

  return (
    <Stack gap="md">
      <BackLink to={`/event/${eventSlug}`}>&larr; Back to Event</BackLink>
      <ConnectionIndicator isConnected={isConnected} />
      <Title order={1}>
        {track?.name ?? 'Track'}
        {tv ? ` — ${tv.name}` : ''}
      </Title>
      {tv && (
        <Text size="sm" c="dimmed" mb="lg">
          {tv.description}
        </Text>
      )}

      {/* Currently running riders */}
      {runningRuns.length > 0 && (
        <Stack gap="md" mb="xl">
          <Text size="xs" fw={600} c="dimmed" tt="uppercase">
            On Track
          </Text>
          {runningRuns.map((run: Run) => {
            const rider = riderMap.get(run.riderId);
            const num = getRiderNumber(run.riderId);
            return (
              <Paper withBorder p="lg" key={String(run.id)} style={{ borderWidth: 2, borderColor: 'var(--mantine-color-green-6)' }}>
                <Badge color="green" variant="light" mb="xs">
                  Racing
                </Badge>
                <Title order={3} size="h4" mb="xs">
                  <Text component="span" fw={700} mr={6}>#{num ?? '?'}</Text>
                  {rider ? `${rider.firstName} ${rider.lastName}` : 'Unknown'}
                </Title>
                <ElapsedTimer startTime={Number(run.startTime)} size="lg" />
              </Paper>
            );
          })}
        </Stack>
      )}

      {/* Next rider — prominent when no one is running */}
      {nextQueued && runningRuns.length === 0 && (
        <Stack gap="md" mb="xl">
          <Text size="xs" fw={600} c="dimmed" tt="uppercase">
            Next Rider
          </Text>
          <Paper withBorder p="lg" style={{ borderWidth: 2, borderColor: 'var(--mantine-color-blue-6)' }}>
            <Text size="sm" c="dimmed" mb="xs">
              Up next — #{nextQueued.sortOrder} in queue
            </Text>
            <Title order={3} size="h4">
              <Text component="span" fw={700} mr={6}>
                #{getRiderNumber(nextQueued.riderId) ?? '?'}
              </Text>
              {(() => {
                const rider = riderMap.get(nextQueued.riderId);
                return rider ? `${rider.firstName} ${rider.lastName}` : 'Unknown';
              })()}
            </Title>
          </Paper>
        </Stack>
      )}

      {/* Next up while someone is running */}
      {nextQueued && runningRuns.length > 0 && (
        <Stack gap="md" mb="xl">
          <Text size="xs" fw={600} c="dimmed" tt="uppercase">
            Next Up
          </Text>
          <Paper withBorder p="md">
            <Group justify="space-between" align="center">
              <Group gap="xs">
                <Text size="sm" c="dimmed">
                  #{nextQueued.sortOrder} in queue
                </Text>
                <Text fw={600}>
                  #{getRiderNumber(nextQueued.riderId) ?? '?'}
                </Text>
                {(() => {
                  const rider = riderMap.get(nextQueued.riderId);
                  return rider ? `${rider.firstName} ${rider.lastName}` : 'Unknown';
                })()}
              </Group>
              <Badge color="yellow" variant="light">
                Queued
              </Badge>
            </Group>
          </Paper>
        </Stack>
      )}

      {/* Remaining queue */}
      {queuedRuns.length > 1 && (
        <Stack gap="md" mb="xl">
          <Text size="xs" fw={600} c="dimmed" tt="uppercase">
            Queue ({queuedRuns.length - 1} remaining)
          </Text>
          {queuedRuns.slice(1).map((run: Run) => {
            const rider = riderMap.get(run.riderId);
            const num = getRiderNumber(run.riderId);
            return (
              <Paper key={String(run.id)} withBorder p="sm">
                <Group justify="space-between" align="center">
                  <Group gap="xs">
                    <Text size="sm" c="dimmed">
                      #{run.sortOrder}
                    </Text>
                    <Text fw={600}>#{num ?? '?'}</Text>
                    {rider ? `${rider.firstName} ${rider.lastName}` : 'Unknown'}
                  </Group>
                  <Badge color="yellow" variant="light">
                    Queued
                  </Badge>
                </Group>
              </Paper>
            );
          })}
        </Stack>
      )}

      {/* All done — only show when there are runs and all are finished */}
      {trackRuns.length > 0 && queuedRuns.length === 0 && runningRuns.length === 0 && (
        <Paper withBorder p="xl" ta="center">
          <Text c="dimmed">All riders have completed this track.</Text>
        </Paper>
      )}

      {/* Results */}
      {finishedRuns.length > 0 && (
        <Stack gap="md" mb="xl">
          <Text size="xs" fw={600} c="dimmed" tt="uppercase">
            Results
          </Text>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ width: 40 }}>Pos</Table.Th>
                <Table.Th style={{ width: 50 }}>#</Table.Th>
                <Table.Th>Rider</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Time</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {finishedRuns.map((run: Run, idx: number) => {
                const rider = riderMap.get(run.riderId);
                const num = getRiderNumber(run.riderId);
                const elapsed = Number(run.endTime) - Number(run.startTime);
                const pos = idx + 1;
                const posColor =
                  pos === 1 ? 'yellow' : pos === 2 ? 'gray' : pos === 3 ? 'orange' : undefined;
                return (
                  <Table.Tr key={String(run.id)}>
                    <Table.Td>
                      <Text fw={700} c={posColor ?? 'blue'} style={{ minWidth: 28, textAlign: 'center' }}>
                        {pos}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {num ?? '—'}
                      </Text>
                    </Table.Td>
                    <Table.Td>{rider ? `${rider.firstName} ${rider.lastName}` : 'Unknown'}</Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>
                      <Text component="span" ff="monospace" fw={600} c="green">
                        {formatElapsed(elapsed)}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </Stack>
      )}

      {/* DNFs */}
      {dnfRuns.length > 0 && (
        <Stack gap="md" mb="xl">
          <Text size="xs" fw={600} c="dimmed" tt="uppercase">
            Did Not Finish
          </Text>
          {dnfRuns.map((run: Run) => {
            const rider = riderMap.get(run.riderId);
            const num = getRiderNumber(run.riderId);
            return (
              <Paper key={String(run.id)} withBorder p="sm">
                <Group justify="space-between" align="center">
                  <Text>
                    <Text span fw={600} mr="xs">
                      #{num ?? '?'}
                    </Text>{' '}
                    {rider ? `${rider.firstName} ${rider.lastName}` : 'Unknown'}
                  </Text>
                  <Badge color="red" variant="light">
                    DNF
                  </Badge>
                </Group>
              </Paper>
            );
          })}
        </Stack>
      )}

      {/* DNSs */}
      {dnsRuns.length > 0 && (
        <Stack gap="md" mb="xl">
          <Text size="xs" fw={600} c="dimmed" tt="uppercase">
            Did Not Start
          </Text>
          {dnsRuns.map((run: Run) => {
            const rider = riderMap.get(run.riderId);
            const num = getRiderNumber(run.riderId);
            return (
              <Paper key={String(run.id)} withBorder p="sm">
                <Group justify="space-between" align="center">
                  <Text>
                    <Text span fw={600} mr="xs">
                      #{num ?? '?'}
                    </Text>{' '}
                    {rider ? `${rider.firstName} ${rider.lastName}` : 'Unknown'}
                  </Text>
                  <Badge color="gray" variant="light">
                    DNS
                  </Badge>
                </Group>
              </Paper>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}
