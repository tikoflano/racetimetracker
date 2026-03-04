import React, { useState, useMemo } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useTable, useReducer } from 'spacetimedb/react';
import {
  TextInput,
  Button,
  Table,
  Badge,
  Stack,
  Group,
  Text,
  Box,
} from '@mantine/core';
import { tables, reducers } from '../module_bindings';
import { useAuth } from '../auth';
import { useActiveOrgMaybe } from '../OrgContext';
import Modal from '../components/Modal';
import ActionMenu, { type ActionMenuItem } from '../components/ActionMenu';
import type {
  Event,
  Venue,
  EventTrack,
  TrackVariation,
  Track,
  Rider,
  EventRider,
  PinnedEvent,
  Organization,
  EventCategory,
} from '../module_bindings/types';
import { IconPencil, IconPin, IconLink } from '../icons';
import { formatElapsed, getErrorMessage } from '../utils';

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
  const [eventCategories] = useTable(tables.event_category);
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
      eventRiders.filter((er: EventRider) => er.eventId === eid).map((er: EventRider) => er.riderId)
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
  type LeaderboardEntry = {
    riderId: bigint;
    rider?: Rider;
    total: number;
    complete: boolean;
    dnf: boolean;
    trackCount: number;
    runs: RunDetail[];
  };

  const riderToCategory = useMemo(() => {
    const m = new Map<bigint, bigint>();
    for (const er of eventRiders) {
      if ((er as EventRider).eventId !== eid) continue;
      m.set((er as EventRider).riderId, (er as EventRider).categoryId);
    }
    return m;
  }, [eventRiders, eid]);

  const categoriesForEvent = useMemo(() => {
    return [...eventCategories]
      .filter((c: EventCategory) => c.eventId === eid)
      .sort((a: EventCategory, b: EventCategory) => a.numberRangeStart - b.numberRangeStart);
  }, [eventCategories, eid]);

  const riderNumberMap = useMemo(() => {
    const m = new Map<string, number | null>();
    const catStartMap = new Map<bigint, number>();
    for (const c of eventCategories)
      catStartMap.set((c as EventCategory).id, (c as EventCategory).numberRangeStart);
    for (const er of eventRiders) {
      const e = er as EventRider;
      if (e.eventId !== eid) continue;
      const num =
        e.assignedNumber !== 0
          ? e.assignedNumber
          : e.categoryId !== 0n
            ? (catStartMap.get(e.categoryId) ?? null)
            : null;
      m.set(`${e.eventId}-${e.riderId}`, num);
    }
    return m;
  }, [eventRiders, eventCategories, eid]);

  const getRiderNumber = (riderId: bigint) => riderNumberMap.get(`${eid}-${riderId}`);

  const leaderboardByCategory = useMemo(() => {
    const etIds = new Set(sortedEventTracks.map((et: EventTrack) => et.id));
    const totalTracks = sortedEventTracks.length;
    const riderData = new Map<
      bigint,
      { total: number; trackCount: number; dnf: boolean; runs: RunDetail[] }
    >();

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

    const toEntry = (
      riderId: bigint,
      data: { total: number; trackCount: number; dnf: boolean; runs: RunDetail[] }
    ): LeaderboardEntry => ({
      riderId,
      rider: riderMap.get(riderId),
      total: data.total,
      complete: data.trackCount === totalTracks && !data.dnf,
      dnf: data.dnf,
      trackCount: data.trackCount,
      runs: data.runs,
    });

    const sortEntries = (entries: LeaderboardEntry[]) =>
      [...entries].sort((a, b) => {
        if (a.complete && !b.complete) return -1;
        if (!a.complete && b.complete) return 1;
        if (a.complete && b.complete) return a.total - b.total;
        if (a.dnf && !b.dnf) return 1;
        if (!a.dnf && b.dnf) return -1;
        if (a.trackCount !== b.trackCount) return b.trackCount - a.trackCount;
        return a.total - b.total;
      });

    const result: { categoryId: bigint; categoryName: string; entries: LeaderboardEntry[] }[] = [];

    if (categoriesForEvent.length === 0) {
      const entries = [...riderData.entries()].map(([riderId, data]) => toEntry(riderId, data));
      result.push({ categoryId: 0n, categoryName: '', entries: sortEntries(entries) });
      return result;
    }

    for (const cat of categoriesForEvent) {
      const riderIdsInCat = [...riderToCategory.entries()]
        .filter(([, cid]) => cid === cat.id)
        .map(([rid]) => rid);
      const entries = riderIdsInCat
        .filter((rid) => riderData.has(rid))
        .map((rid) => toEntry(rid, riderData.get(rid)!));
      if (entries.length > 0) {
        result.push({ categoryId: cat.id, categoryName: cat.name, entries: sortEntries(entries) });
      }
    }

    const uncatRiderIds = [...riderToCategory.entries()]
      .filter(([, cid]) => cid === 0n)
      .map(([rid]) => rid);
    const uncatEntries = uncatRiderIds
      .filter((rid) => riderData.has(rid))
      .map((rid) => toEntry(rid, riderData.get(rid)!));
    if (uncatEntries.length > 0) {
      result.push({ categoryId: 0n, categoryName: 'Other', entries: sortEntries(uncatEntries) });
    }

    return result;
  }, [
    runs,
    sortedEventTracks,
    eventRiderIds,
    riderMap,
    tvMap,
    trackMap,
    riderToCategory,
    categoriesForEvent,
  ]);

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (!event) {
    if (events.length === 0) return null;
    return (
      <Box ta="center" py="xl" px="md">
        <Text size="4rem" fw={700} opacity={0.2} mb="xs">
          404
        </Text>
        <h2 style={{ marginBottom: 8 }}>Event not found</h2>
        <Text c="dimmed" mb="lg">
          {orgSlug
            ? `No event "${eventSlug}" exists in organization "${orgSlug}".`
            : `No event "${eventSlug}" exists in the current organization.`}
        </Text>
        <Button component="a" href="/">
          Go home
        </Button>
      </Box>
    );
  }

  return (
    <div>
      {editingName ? (
        <Stack gap="xs" mb="xs">
          <Group gap="xs" align="center">
            <TextInput
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === 'Enter') {
                  setNameError('');
                  const trimmed = nameValue.trim();
                  if (!trimmed) {
                    setNameError('Name cannot be empty');
                    return;
                  }
                  try {
                    await updateEvent({
                      eventId: eid,
                      name: trimmed,
                      description: event.description,
                      startDate: event.startDate,
                      endDate: event.endDate,
                    });
                    setEditingName(false);
                  } catch (err: unknown) {
                    setNameError(getErrorMessage(err, 'Failed'));
                  }
                }
                if (e.key === 'Escape') setEditingName(false);
              }}
              autoFocus
              style={{ flex: 1, maxWidth: 400 }}
              styles={{ input: { fontSize: '1.4rem', fontWeight: 700 } }}
            />
            <Button
              size="xs"
              onClick={async () => {
                setNameError('');
                const trimmed = nameValue.trim();
                if (!trimmed) {
                  setNameError('Name cannot be empty');
                  return;
                }
                try {
                  await updateEvent({
                    eventId: eid,
                    name: trimmed,
                    description: event.description,
                    startDate: event.startDate,
                    endDate: event.endDate,
                  });
                  setEditingName(false);
                } catch (err: unknown) {
                  setNameError(getErrorMessage(err, 'Failed'));
                }
              }}
            >
              Save
            </Button>
            <Button variant="subtle" size="xs" onClick={() => setEditingName(false)}>
              Cancel
            </Button>
          </Group>
          {nameError && (
            <Text size="sm" c="red">
              {nameError}
            </Text>
          )}
        </Stack>
      ) : (
        <Group justify="space-between" align="baseline" gap="xs">
          <Group gap="xs" align="baseline">
            <h1 style={{ marginBottom: 0 }}>{event.name}</h1>
            <EventActionMenu
              open={eventMenuOpen}
              onToggle={() => setEventMenuOpen(!eventMenuOpen)}
              onClose={() => setEventMenuOpen(false)}
              canEdit={canEdit}
              isAuthenticated={isAuthenticated}
              isPinned={isPinned}
              hasPublicUrl={!!publicUrl}
              onRename={() => {
                setEventMenuOpen(false);
                setNameValue(event.name);
                setNameError('');
                setEditingName(true);
              }}
              onPin={() => {
                setEventMenuOpen(false);
                togglePin({ eventId: eid });
              }}
              onShare={() => {
                setEventMenuOpen(false);
                setCopied(false);
                setShareOpen(true);
              }}
            />
          </Group>
          {canEdit && (
            <Button component={Link} to={`/event/${event.slug}/manage`} size="xs">
              Manage
            </Button>
          )}
        </Group>
      )}
      <Text size="sm" c="dimmed" mb="xs">
        {event.description}
      </Text>
      {venue && (
        <Text size="sm" c="dimmed" mb="md">
          <Text component={Link} to={`/location/${venue.id}`} inherit c="dimmed">
            {venue.name}
          </Text>{' '}
          &middot; {event.startDate} &ndash; {event.endDate}
        </Text>
      )}

      {/* Leaderboard — per category */}
      <Stack gap="md" mb="xl">
        <Text size="xs" fw={600} c="dimmed" tt="uppercase">
          Leaderboard
        </Text>
        {leaderboardByCategory.length === 0 ? (
          <Text c="dimmed" ta="center" py="xl">
            No results yet.
          </Text>
        ) : (
          leaderboardByCategory.map(({ categoryId, categoryName, entries }) => (
            <Box key={String(categoryId)} mb={categoryName ? 'lg' : 0}>
              {categoryName && (
                <Text
                  size="xs"
                  fw={600}
                  c="dimmed"
                  tt="uppercase"
                  mb="xs"
                  style={{ letterSpacing: '0.05em' }}
                >
                  {categoryName}
                </Text>
              )}
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th style={{ width: 40 }}>Pos</Table.Th>
                    <Table.Th style={{ width: 50 }}>#</Table.Th>
                    <Table.Th>Rider</Table.Th>
                    <Table.Th>Runs</Table.Th>
                    <Table.Th style={{ textAlign: 'right' }}>Total Time</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {entries.map((entry, idx) => {
                    const pos = idx + 1;
                    const posColor =
                      pos === 1 ? '#fbbf24' : pos === 2 ? '#94a3b8' : pos === 3 ? '#d97706' : undefined;
                    const isExpanded = expandedRiderId === entry.riderId;
                    return (
                      <React.Fragment key={entry.rider ? String(entry.rider.id) : idx}>
                        <Table.Tr
                          onClick={() => setExpandedRiderId(isExpanded ? null : entry.riderId)}
                          style={{ cursor: 'pointer' }}
                        >
                          <Table.Td>
                            <Text
                              fw={700}
                              size="lg"
                              style={{
                                color: posColor ?? 'var(--accent)',
                                minWidth: 28,
                                textAlign: 'center',
                              }}
                            >
                              {entry.complete ? pos : '-'}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" c="dimmed">
                              {getRiderNumber(entry.riderId) ?? '—'}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            {entry.rider
                              ? `${entry.rider.firstName} ${entry.rider.lastName}`
                              : 'Unknown'}
                          </Table.Td>
                          <Table.Td>
                            <Group gap="xs" wrap="nowrap">
                              <Text size="sm" c="dimmed">
                                {entry.trackCount}/{sortedEventTracks.length}
                              </Text>
                              {entry.dnf && (
                                <Badge color="red" variant="light" size="sm">
                                  DNF
                                </Badge>
                              )}
                            </Group>
                          </Table.Td>
                          <Table.Td style={{ textAlign: 'right' }}>
                            {entry.total > 0 ? (
                              <Text
                                component="span"
                                ff="monospace"
                                fw={600}
                                size="md"
                                c="green"
                              >
                                {formatElapsed(entry.total)}
                              </Text>
                            ) : (
                              <Text span c="dimmed">
                                --:--
                              </Text>
                            )}
                          </Table.Td>
                        </Table.Tr>
                        {isExpanded && (
                          <Table.Tr>
                            <Table.Td
                              colSpan={5}
                              style={{
                                padding: '0 12px 12px 52px',
                                background: 'var(--surface-hover, rgba(255,255,255,0.02))',
                              }}
                            >
                              <Table>
                                <Table.Tbody>
                                  {sortedEventTracks.map((et: EventTrack) => {
                                    const tv = tvMap.get(et.trackVariationId);
                                    const track = tv ? trackMap.get(tv.trackId) : undefined;
                                    const run = entry.runs.find((r) => r.eventTrackId === et.id);
                                    return (
                                      <Table.Tr key={String(et.id)}>
                                        <Table.Td>
                                          <Text size="sm" c="dimmed">
                                            {track?.name ?? 'Track'}
                                          </Text>
                                        </Table.Td>
                                        <Table.Td style={{ textAlign: 'right' }}>
                                          {run ? (
                                            run.status === 'finished' ? (
                                              <Text
                                                component="span"
                                                ff="monospace"
                                                fw={600}
                                                size="sm"
                                                c="green"
                                              >
                                                {formatElapsed(run.elapsed)}
                                              </Text>
                                            ) : (
                                              <Badge
                                                color={
                                                  run.status === 'dnf'
                                                    ? 'red'
                                                    : run.status === 'dns'
                                                      ? 'gray'
                                                      : 'green'
                                                }
                                                variant="light"
                                                size="sm"
                                              >
                                                {run.status.toUpperCase()}
                                              </Badge>
                                            )
                                          ) : (
                                            <Text span c="dimmed">
                                              —
                                            </Text>
                                          )}
                                        </Table.Td>
                                      </Table.Tr>
                                    );
                                  })}
                                </Table.Tbody>
                              </Table>
                            </Table.Td>
                          </Table.Tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </Box>
          ))
        )}
      </Stack>

      {/* Share modal — leaderboard display URL for big screens */}
      <Modal open={shareOpen} onClose={() => setShareOpen(false)} title="Leaderboard Display">
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Use this link to display the leaderboard on a big screen at the event.
          </Text>
          <Group gap="xs">
            <TextInput
              readOnly
              value={publicUrl ? `${publicUrl}/leaderboard` : ''}
              style={{ flex: 1 }}
              styles={{ input: { fontSize: '0.8rem' } }}
              onFocus={(e) => e.target.select()}
            />
            <Button
              onClick={() => {
                navigator.clipboard.writeText(publicUrl ? `${publicUrl}/leaderboard` : '');
                setCopied(true);
              }}
              style={{ whiteSpace: 'nowrap' }}
            >
              {copied ? 'Copied!' : 'Copy'}
            </Button>
            <Button
              component="a"
              href={publicUrl ? `${publicUrl}/leaderboard` : '#'}
              target="_blank"
              rel="noopener noreferrer"
              style={{ whiteSpace: 'nowrap' }}
            >
              Open
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
}

function EventActionMenu({
  open,
  onToggle,
  onClose,
  canEdit,
  isAuthenticated,
  isPinned,
  hasPublicUrl,
  onRename,
  onPin,
  onShare,
}: {
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
}) {
  const items: ActionMenuItem[] = [];
  if (canEdit) items.push({ icon: IconPencil, label: 'Rename', onClick: onRename });
  if (isAuthenticated) items.push({ icon: IconPin, label: isPinned ? 'Unpin event' : 'Pin event', onClick: onPin });
  if (hasPublicUrl) items.push({ icon: IconLink, label: 'Share', onClick: onShare });
  return <ActionMenu open={open} onToggle={onToggle} onClose={onClose} items={items} />;
}
