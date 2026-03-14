import { useState, useMemo } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useTable, useReducer } from 'spacetimedb/react';
import {
  TextInput,
  Button,
  Table,
  Paper,
  Stack,
  Group,
  Text,
  ColorInput,
  Box,
  Badge,
} from '@mantine/core';
import { tables, reducers } from '../module_bindings';
import { useAuth } from '../auth';
import { useActiveOrgMaybe } from '../OrgContext';
import { IconTrash } from '../icons';
import { RowActionMenu } from '../components/ActionMenu';
import ListFilterBar from '../components/ListFilterBar';
import { getErrorMessage } from '../utils';
import type { Championship, Event, Organization } from '../module_bindings/types';

type ChampStatus = 'in_progress' | 'not_started' | 'completed';
type SortKey = 'name' | 'events' | 'start' | 'end' | 'next' | 'status';
type SortDir = 'asc' | 'desc';
const SORT_STORAGE_KEY = 'champ_sort';

const STATUS_ORDER: Record<ChampStatus, number> = {
  in_progress: 0,
  not_started: 1,
  completed: 2,
};

function loadSort(): { key: SortKey; dir: SortDir } {
  try {
    const raw = localStorage.getItem(SORT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.key && parsed.dir) return parsed;
    }
  } catch {}
  return { key: 'name', dir: 'asc' };
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function SortTh({
  label,
  sortKey,
  current,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  current: { key: SortKey; dir: SortDir };
  onSort: (k: SortKey) => void;
}) {
  const active = current.key === sortKey;
  const arrow = active ? (current.dir === 'asc' ? ' \u25B2' : ' \u25BC') : '';
  return (
    <Table.Th onClick={() => onSort(sortKey)} style={{ cursor: 'pointer', userSelect: 'none' }}>
      {label}
      <Text component="span" size="0.6rem" style={{ opacity: active ? 1 : 0.3 }}>{arrow || ' \u25B2'}</Text>
    </Table.Th>
  );
}

export default function ChampionshipsView() {
  const oid = useActiveOrgMaybe();
  const { isAuthenticated, isReady, canManageOrgEvents } = useAuth();

  const [orgs] = useTable(tables.organization);
  const [championships] = useTable(tables.championship);
  const [events] = useTable(tables.event);

  const createChampionship = useReducer(reducers.createChampionship);
  const deleteChampionship = useReducer(reducers.deleteChampionship);

  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newColor, setNewColor] = useState('#3b82f6');
  const [error, setError] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>(loadSort);
  const [statusFilter, setStatusFilter] = useState<ChampStatus | 'all'>('all');

  const toggleSort = (key: SortKey) => {
    setSort((prev) => {
      const next =
        prev.key === key
          ? { key, dir: (prev.dir === 'asc' ? 'desc' : 'asc') as SortDir }
          : { key, dir: 'asc' as SortDir };
      localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const org = oid ? orgs.find((o: Organization) => o.id === oid) : null;
  const hasAccess = oid !== null ? canManageOrgEvents(oid) : false;

  const today = todayStr();

  const champRows = useMemo(() => {
    if (!oid) return [];
    const orgChamps = championships.filter((c: Championship) => c.orgId === oid);
    return orgChamps.map((c: Championship) => {
      const champEvents = events.filter((e: Event) => e.championshipId === c.id);
      const dates = champEvents
        .flatMap((e: Event) => [e.startDate, e.endDate])
        .filter(Boolean)
        .sort();
      // Next event: earliest event whose end_date >= today
      const upcoming = champEvents
        .filter((e: Event) => e.endDate >= today)
        .sort((a: Event, b: Event) => a.startDate.localeCompare(b.startDate));
      const nextEvent = upcoming.length > 0 ? upcoming[0] : null;
      // Status based on championship date range (first start to last end)
      let status: ChampStatus = 'not_started';
      if (champEvents.length > 0) {
        const firstStart = champEvents.map((e: Event) => e.startDate).sort()[0];
        const lastEnd = champEvents
          .map((e: Event) => e.endDate)
          .sort()
          .pop()!;
        if (today < firstStart) status = 'not_started';
        else if (today > lastEnd) status = 'completed';
        else status = 'in_progress';
      }
      return {
        championship: c,
        eventCount: champEvents.length,
        startDate: dates[0] ?? '—',
        endDate: dates[dates.length - 1] ?? '—',
        nextEvent,
        nextEventSort: nextEvent?.startDate ?? '\uffff',
        status,
      };
    });
  }, [championships, events, oid, today]);

  const filteredRows = useMemo(() => {
    if (statusFilter === 'all') return champRows;
    return champRows.filter((r) => r.status === statusFilter);
  }, [champRows, statusFilter]);

  const sortedRows = useMemo(() => {
    const rows = [...filteredRows];
    const dir = sort.dir === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      switch (sort.key) {
        case 'name':
          return dir * a.championship.name.localeCompare(b.championship.name);
        case 'events':
          return dir * (a.eventCount - b.eventCount);
        case 'start':
          return dir * a.startDate.localeCompare(b.startDate);
        case 'end':
          return dir * a.endDate.localeCompare(b.endDate);
        case 'next':
          return dir * a.nextEventSort.localeCompare(b.nextEventSort);
        case 'status':
          return dir * (STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
        default:
          return 0;
      }
    });
    return rows;
  }, [filteredRows, sort]);

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
  if (!hasAccess)
    return (
      <Text c="dimmed" ta="center" py="xl">
        You don't have access to manage championships.
      </Text>
    );

  const handleCreate = async () => {
    setError('');
    const trimmed = newName.trim();
    if (!trimmed) {
      setError('Name is required');
      return;
    }
    try {
      await createChampionship({
        orgId: oid,
        name: trimmed,
        description: newDesc.trim(),
        color: newColor,
      });
      setNewName('');
      setNewDesc('');
      setNewColor('#3b82f6');
      setShowForm(false);
    } catch (e: unknown) {
      setError(getErrorMessage(e, 'Failed to create championship'));
    }
  };

  return (
    <div>
      <Group justify="space-between" align="center" mb="lg">
        <h1 style={{ marginBottom: 0 }}>Championships</h1>
        {!showForm && (
          <Button size="xs" onClick={() => setShowForm(true)}>
            + New Championship
          </Button>
        )}
      </Group>

      {champRows.length > 0 && (
        <ListFilterBar
          mb="md"
          filterButtons={{
            options: [
              { value: 'all', label: 'All', count: champRows.length },
              { value: 'in_progress', label: 'In Progress', count: champRows.filter((r) => r.status === 'in_progress').length },
              { value: 'not_started', label: 'Not Started', count: champRows.filter((r) => r.status === 'not_started').length },
              { value: 'completed', label: 'Completed', count: champRows.filter((r) => r.status === 'completed').length },
            ],
            value: statusFilter,
            onChange: (v) => setStatusFilter(v as ChampStatus | 'all'),
          }}
        />
      )}

      {showForm && (
        <Paper withBorder p="md" mb="lg">
          <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb="xs">
            New Championship
          </Text>
          {error && (
            <Text size="sm" c="red" mb="xs">
              {error}
            </Text>
          )}
          <Stack gap="sm">
            <TextInput
              placeholder="Championship name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
            <TextInput
              placeholder="Description (optional)"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <ColorInput label="Color" value={newColor} onChange={setNewColor} />
            <Group gap="xs">
              <Button size="xs" onClick={handleCreate}>
                Create
              </Button>
              <Button
                variant="subtle"
                size="xs"
                onClick={() => {
                  setShowForm(false);
                  setError('');
                }}
              >
                Cancel
              </Button>
            </Group>
          </Stack>
        </Paper>
      )}

      {champRows.length === 0 && !showForm ? (
        <Text c="dimmed" ta="center" py="xl">
          No championships yet. Create one to get started.
        </Text>
      ) : (
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ width: 12 }}></Table.Th>
              <SortTh label="Name" sortKey="name" current={sort} onSort={toggleSort} />
              <SortTh label="Status" sortKey="status" current={sort} onSort={toggleSort} />
              <SortTh label="Events" sortKey="events" current={sort} onSort={toggleSort} />
              <SortTh label="Next Event" sortKey="next" current={sort} onSort={toggleSort} />
              <SortTh label="Start" sortKey="start" current={sort} onSort={toggleSort} />
              <SortTh label="End" sortKey="end" current={sort} onSort={toggleSort} />
              <Table.Th style={{ width: 40 }}></Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {sortedRows.map(
              ({ championship: c, eventCount, startDate, endDate, nextEvent, status }) => {
                const statusLabel: Record<ChampStatus, string> = {
                  in_progress: 'In Progress',
                  not_started: 'Not Started',
                  completed: 'Completed',
                };
                const statusColor: Record<ChampStatus, string> = {
                  in_progress: 'green',
                  not_started: 'yellow',
                  completed: 'gray',
                };
                return (
                  <Table.Tr key={String(c.id)}>
                    <Table.Td>
                      <Box w={10} h={10} style={{ borderRadius: '50%', background: c.color }} />
                    </Table.Td>
                    <Table.Td>
                      <Text component={Link} to={`/championship/${c.id}`} c="blue" td="none">
                        {c.name}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={statusColor[status]} variant="light">
                        {statusLabel[status]}
                      </Badge>
                    </Table.Td>
                    <Table.Td>{eventCount}</Table.Td>
                    <Table.Td>
                      {nextEvent ? (
                        <Stack gap={0}>
                          <Text component={Link} to={`/event/${nextEvent.slug}`} c="blue" td="none">
                            {nextEvent.name}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {nextEvent.startDate}
                          </Text>
                        </Stack>
                      ) : (
                        <Text c="dimmed">—</Text>
                      )}
                    </Table.Td>
                    <Table.Td>{startDate}</Table.Td>
                    <Table.Td>{endDate}</Table.Td>
                    <Table.Td>
                      <RowActionMenu
                        items={[
                          {
                            icon: IconTrash,
                            label: 'Delete',
                            danger: true,
                            onClick: () => {
                              if (
                                confirm(
                                  `Delete "${c.name}" and all its events? This cannot be undone.`
                                )
                              ) {
                                deleteChampionship({ championshipId: c.id });
                              }
                            },
                          },
                        ]}
                      />
                    </Table.Td>
                  </Table.Tr>
                );
              }
            )}
          </Table.Tbody>
        </Table>
      )}
    </div>
  );
}
