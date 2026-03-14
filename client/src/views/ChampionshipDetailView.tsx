import { useState, useMemo } from 'react';
import { useParams, Link, Navigate, useNavigate } from 'react-router-dom';
import { useTable, useReducer } from 'spacetimedb/react';
import {
  TextInput,
  Button,
  Table,
  Badge,
  Paper,
  Stack,
  Group,
  Text,
  Box,
  ColorInput,
  ActionIcon,
  Title,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { tables, reducers } from '../module_bindings';
import { useAuth } from '../auth';
import { useActiveOrgMaybe } from '../OrgContext';
import { IconPencil, IconPin, IconTrash } from '../icons';
import { getErrorMessage } from '../utils';
import BackLink from '../components/BackLink';
import ActionMenu from '../components/ActionMenu';
import { RowActionMenu } from '../components/ActionMenu';
import ListFilterBar from '../components/ListFilterBar';
import SearchableSelect from '../components/SearchableSelect';
import type {
  Championship,
  Event,
  Location,
  Organization,
  PinnedEvent,
} from '../module_bindings/types';

type EventStatus = 'in_progress' | 'not_started' | 'completed';

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getEventStatus(e: Event, today: string): EventStatus {
  if (today < e.startDate) return 'not_started';
  if (today > e.endDate) return 'completed';
  return 'in_progress';
}

const STATUS_LABEL: Record<EventStatus, string> = {
  in_progress: 'In Progress',
  not_started: 'Not Started',
  completed: 'Completed',
};

export default function ChampionshipDetailView() {
  const { champId } = useParams<{ champId: string }>();
  const navigate = useNavigate();
  const oid = useActiveOrgMaybe();
  const cid = BigInt(champId ?? '0');
  const { user, isAuthenticated, isReady, canManageOrgEvents } = useAuth();

  const [orgs] = useTable(tables.organization);
  const [championships] = useTable(tables.championship);
  const [events] = useTable(tables.event);
  const [locations] = useTable(tables.location);
  const [pinnedEvents] = useTable(tables.pinned_event);

  const updateChampionship = useReducer(reducers.updateChampionship);
  const deleteChampionship = useReducer(reducers.deleteChampionship);
  const createEvent = useReducer(reducers.createEvent);
  const updateEvent = useReducer(reducers.updateEvent);
  const togglePin = useReducer(reducers.togglePinEvent);

  const pinnedEventIds = useMemo(() => {
    if (!user) return new Set<bigint>();
    return new Set(
      pinnedEvents.filter((f: PinnedEvent) => f.userId === user.id).map((f) => f.eventId)
    );
  }, [user, pinnedEvents]);

  const [menuOpen, setMenuOpen] = useState(false);

  // Edit championship state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editError, setEditError] = useState('');

  // Add event state
  const [showEventForm, setShowEventForm] = useState(false);
  const [evtName, setEvtName] = useState('');
  const [evtDesc, setEvtDesc] = useState('');
  const [evtStart, setEvtStart] = useState('');
  const [evtEnd, setEvtEnd] = useState('');
  const [evtLocationId, setEvtLocationId] = useState('');
  const [evtError, setEvtError] = useState('');

  // Edit event name state
  const [editingEventId, setEditingEventId] = useState<bigint | null>(null);
  const [editEventName, setEditEventName] = useState('');
  const [editEventError, setEditEventError] = useState('');

  // Status filter
  const [statusFilter, setStatusFilter] = useState<EventStatus | 'all'>('all');

  const org = oid ? orgs.find((o: Organization) => o.id === oid) : null;
  const champ = championships.find((c: Championship) => c.id === cid);
  const hasAccess = oid !== null ? canManageOrgEvents(oid) : false;

  const today = todayStr();

  const champEvents = useMemo(() => {
    return events
      .filter((e: Event) => e.championshipId === cid)
      .sort((a: Event, b: Event) => a.startDate.localeCompare(b.startDate));
  }, [events, cid]);

  const eventRows = useMemo(() => {
    return champEvents.map((e: Event) => ({
      event: e,
      status: getEventStatus(e, today),
    }));
  }, [champEvents, today]);

  const filteredEventRows = useMemo(() => {
    if (statusFilter === 'all') return eventRows;
    return eventRows.filter((r) => r.status === statusFilter);
  }, [eventRows, statusFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: eventRows.length,
      in_progress: 0,
      not_started: 0,
      completed: 0,
    };
    for (const r of eventRows) counts[r.status]++;
    return counts;
  }, [eventRows]);

  const locationMap = useMemo(() => {
    const m = new Map<bigint, Location>();
    for (const v of locations) m.set(v.id, v);
    return m;
  }, [locations]);

  const orgLocations = useMemo(() => {
    if (!oid) return [];
    return locations
      .filter((v: Location) => v.orgId === oid)
      .sort((a: Location, b: Location) => a.name.localeCompare(b.name));
  }, [locations, oid]);

  const selectedLocation = evtLocationId ? orgLocations.find((v: Location) => String(v.id) === evtLocationId) ?? null : null;

  if (!isReady) return null;
  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (!oid) return null;
  if (!org) {
    if (orgs.length === 0) return null;
    return (
      <Text c="dimmed" ta="center" py="xl">
        Organization not found.
      </Text>
    );
  }
  if (!champ) {
    if (championships.length === 0) return null;
    return (
      <Text c="dimmed" ta="center" py="xl">
        Championship not found.
      </Text>
    );
  }
  if (!hasAccess)
    return (
      <Text c="dimmed" ta="center" py="xl">
        You don't have access to manage this championship.
      </Text>
    );

  const startEditing = () => {
    setEditName(champ.name);
    setEditDesc(champ.description);
    setEditColor(champ.color);
    setEditError('');
    setEditing(true);
  };

  const handleSave = async () => {
    setEditError('');
    const trimmed = editName.trim();
    if (!trimmed) {
      setEditError('Name cannot be empty');
      return;
    }
    try {
      await updateChampionship({
        championshipId: cid,
        name: trimmed,
        description: editDesc.trim(),
        color: editColor,
      });
      setEditing(false);
    } catch (e: unknown) {
      setEditError(getErrorMessage(e, 'Failed to update'));
    }
  };

  const handleAddEvent = async () => {
    setEvtError('');
    if (!evtName.trim()) {
      setEvtError('Event name is required');
      return;
    }
    if (!evtStart) {
      setEvtError('Start date is required');
      return;
    }
    if (!evtEnd) {
      setEvtError('End date is required');
      return;
    }
    const locationId = evtLocationId ? BigInt(evtLocationId) : 0n;
    if (!locationId) {
      setEvtError('Select a location');
      return;
    }
    try {
      await createEvent({
        orgId: oid,
        championshipId: cid,
        locationId,
        name: evtName.trim(),
        description: evtDesc.trim(),
        startDate: evtStart,
        endDate: evtEnd,
      });
      setEvtName('');
      setEvtDesc('');
      setEvtStart('');
      setEvtEnd('');
      setEvtLocationId('');
      setShowEventForm(false);
    } catch (e: unknown) {
      setEvtError(getErrorMessage(e, 'Failed to create event'));
    }
  };

  const startEditEvent = (e: Event) => {
    setEditingEventId(e.id);
    setEditEventName(e.name);
    setEditEventError('');
  };

  const handleSaveEventName = async (e: Event) => {
    setEditEventError('');
    const trimmed = editEventName.trim();
    if (!trimmed) {
      setEditEventError('Name cannot be empty');
      return;
    }
    try {
      await updateEvent({
        eventId: e.id,
        name: trimmed,
        description: e.description,
        startDate: e.startDate,
        endDate: e.endDate,
      });
      setEditingEventId(null);
    } catch (err: unknown) {
      setEditEventError(getErrorMessage(err, 'Failed to rename'));
    }
  };

  return (
    <Stack gap="md">
      <BackLink to="/championships">&larr; Championships</BackLink>

      {/* Championship name + description — editable */}
      {editing ? (
        <Stack gap="sm" mb="lg">
          <TextInput
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') setEditing(false);
            }}
            autoFocus
            styles={{ input: { fontSize: '1.4rem', fontWeight: 700 } }}
          />
          <TextInput
            placeholder="Description"
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') setEditing(false);
            }}
          />
          <ColorInput label="Color" value={editColor} onChange={setEditColor} />
          <Group gap="xs">
            <Button size="xs" onClick={handleSave}>
              Save
            </Button>
            <Button variant="subtle" size="xs" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </Group>
          {editError && (
            <Text size="sm" c="red">
              {editError}
            </Text>
          )}
        </Stack>
      ) : (
        <Box mb="xs">
          <Group gap="xs" align="baseline">
            <Box w={14} h={14} style={{ borderRadius: '50%', background: champ.color, flexShrink: 0 }} />
            <Title order={1}>{champ.name}</Title>
            <ActionMenu
              open={menuOpen}
              onToggle={() => setMenuOpen(!menuOpen)}
              onClose={() => setMenuOpen(false)}
              items={[
                {
                  icon: IconPencil,
                  label: 'Edit',
                  onClick: () => {
                    setMenuOpen(false);
                    startEditing();
                  },
                },
                {
                  icon: IconTrash,
                  label: 'Delete',
                  danger: true,
                  onClick: () => {
                    setMenuOpen(false);
                    if (
                      confirm(`Delete "${champ.name}" and all its events? This cannot be undone.`)
                    ) {
                      deleteChampionship({ championshipId: cid }).then(() =>
                        navigate('/championships')
                      );
                    }
                  },
                },
              ]}
            />
          </Group>
          {champ.description && (
            <Text size="sm" c="dimmed">
              {champ.description}
            </Text>
          )}
        </Box>
      )}

      {/* Events section */}
      <Stack gap="md" mt="lg">
        <Group justify="space-between" align="center">
          <Text size="xs" fw={600} c="dimmed" tt="uppercase">
            Events ({champEvents.length})
          </Text>
          {!showEventForm && (
            <Button size="xs" onClick={() => setShowEventForm(true)}>
              + Add Event
            </Button>
          )}
        </Group>

        {eventRows.length > 0 && (
          <ListFilterBar
            mb="sm"
            filterButtons={{
              options: [
                { value: 'all', label: 'All', count: statusCounts.all },
                { value: 'in_progress', label: 'In Progress', count: statusCounts.in_progress },
                { value: 'not_started', label: 'Not Started', count: statusCounts.not_started },
                { value: 'completed', label: 'Completed', count: statusCounts.completed },
              ],
              value: statusFilter,
              onChange: (v) => setStatusFilter(v as EventStatus | 'all'),
            }}
          />
        )}

        {showEventForm && (
          <Paper withBorder p="md" mb="sm">
            {evtError && (
              <Text size="sm" c="red" mb="xs">
                {evtError}
              </Text>
            )}
            <Stack gap="sm">
              <TextInput
                placeholder="Event name"
                value={evtName}
                onChange={(e) => setEvtName(e.target.value)}
                autoFocus
              />
              <TextInput
                placeholder="Description (optional)"
                value={evtDesc}
                onChange={(e) => setEvtDesc(e.target.value)}
              />
              <Group grow wrap="wrap">
                <DatePickerInput
                  label="Start date"
                  value={evtStart ? new Date(evtStart + 'T00:00:00') : null}
                  onChange={(d: Date | null) =>
                    setEvtStart(d ? d.toISOString().slice(0, 10) : '')
                  }
                />
                <DatePickerInput
                  label="End date"
                  value={evtEnd ? new Date(evtEnd + 'T00:00:00') : null}
                  onChange={(d: Date | null) =>
                    setEvtEnd(d ? d.toISOString().slice(0, 10) : '')
                  }
                />
              </Group>
              <SearchableSelect<Location>
                label="Location"
                items={orgLocations}
                value={selectedLocation}
                onChange={(v) => setEvtLocationId(v ? String(v.id) : '')}
                getLabel={(v) => v.name}
                getKey={(v) => String(v.id)}
                placeholder="Select location..."
                filterFn={(v, q) => v.name.toLowerCase().includes(q.toLowerCase())}
              />
              <Group gap="xs">
                <Button size="xs" onClick={handleAddEvent}>
                  Create Event
                </Button>
                <Button
                  variant="subtle"
                  size="xs"
                  onClick={() => {
                    setShowEventForm(false);
                    setEvtError('');
                  }}
                >
                  Cancel
                </Button>
              </Group>
            </Stack>
          </Paper>
        )}

        {champEvents.length === 0 && !showEventForm ? (
          <Text c="dimmed" ta="center" py="xl">
            No events in this championship yet.
          </Text>
        ) : filteredEventRows.length === 0 ? (
          <Text c="dimmed" ta="center" py="xl">
            No events match the selected filter.
          </Text>
        ) : (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ width: 32 }}></Table.Th>
                <Table.Th>Name</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Location</Table.Th>
                <Table.Th>Start</Table.Th>
                <Table.Th>End</Table.Th>
                <Table.Th style={{ width: 40 }}></Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredEventRows.map(({ event: e, status }) => (
                <Table.Tr key={String(e.id)}>
                  <Table.Td>
                    {isAuthenticated && (
                      <ActionIcon
                        variant="subtle"
                        size="sm"
                        color={pinnedEventIds.has(e.id) ? 'blue' : 'gray'}
                        onClick={() => togglePin({ eventId: e.id })}
                        title={pinnedEventIds.has(e.id) ? 'Unpin event' : 'Pin event'}
                      >
                        <IconPin size={16} />
                      </ActionIcon>
                    )}
                  </Table.Td>
                  <Table.Td>
                    {editingEventId === e.id ? (
                      <Group gap="xs" align="center">
                        <TextInput
                          value={editEventName}
                          onChange={(ev) => setEditEventName(ev.target.value)}
                          onKeyDown={(ev) => {
                            if (ev.key === 'Enter') handleSaveEventName(e);
                            if (ev.key === 'Escape') setEditingEventId(null);
                          }}
                          autoFocus
                          size="xs"
                          style={{ flex: 1, minWidth: 120 }}
                        />
                        <Button size="xs" onClick={() => handleSaveEventName(e)}>
                          Save
                        </Button>
                        <Button variant="subtle" size="xs" onClick={() => setEditingEventId(null)}>
                          Cancel
                        </Button>
                        {editEventError && (
                          <Text size="xs" c="red">
                            {editEventError}
                          </Text>
                        )}
                      </Group>
                    ) : (
                      <Text component={Link} to={`/event/${e.slug}`} c="blue" td="none">
                        {e.name}
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      color={
                        status === 'in_progress'
                          ? 'green'
                          : status === 'not_started'
                            ? 'yellow'
                            : 'gray'
                      }
                      variant="light"
                    >
                      {STATUS_LABEL[status]}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{locationMap.get(e.locationId)?.name ?? '—'}</Table.Td>
                  <Table.Td>{e.startDate}</Table.Td>
                  <Table.Td>{e.endDate}</Table.Td>
                  <Table.Td>
                    <RowActionMenu
                      items={[{ icon: IconPencil, label: 'Rename', onClick: () => startEditEvent(e) }]}
                    />
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Stack>
    </Stack>
  );
}
