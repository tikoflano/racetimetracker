import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Group, Button, Menu, Checkbox, Text, Title, Box, Stack, Paper } from '@mantine/core';
import { Calendar } from '@mantine/dates';
import { useTable } from 'spacetimedb/react';
import { tables } from '../module_bindings';
import { useAuth } from '../auth';
import type { Event, Championship, Organization } from '../module_bindings/types';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function parseDate(s: string): Date | null {
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function toDateStr(date: Date | string): string {
  if (typeof date === 'string') return date;
  const d = date;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function CalendarView() {
  const { user } = useAuth();
  const [events] = useTable(tables.event);
  const [championships] = useTable(tables.championship);
  const [orgs] = useTable(tables.organization);

  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [selectedChampIds, setSelectedChampIds] = useState<Set<bigint> | null>(null);

  const userOrgIds = useMemo(() => {
    if (!user) return new Set<bigint>();
    return new Set(orgs.filter((o: Organization) => o.ownerUserId === user.id).map((o) => o.id));
  }, [user, orgs]);

  const orgChamps = useMemo(() => {
    return championships.filter((c: Championship) => userOrgIds.has(c.orgId));
  }, [championships, userOrgIds]);

  const activeChampIds = useMemo(() => {
    if (selectedChampIds !== null) return selectedChampIds;
    return new Set(orgChamps.map((c) => c.id));
  }, [selectedChampIds, orgChamps]);

  const champMap = useMemo(() => {
    const m = new Map<bigint, Championship>();
    for (const c of orgChamps) m.set(c.id, c);
    return m;
  }, [orgChamps]);

  const toggleChamp = (id: bigint) => {
    setSelectedChampIds((prev) => {
      const current = prev ?? new Set(orgChamps.map((c) => c.id));
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedChampIds(null);
  const selectNone = () => setSelectedChampIds(new Set());

  const allSelected = activeChampIds.size === orgChamps.length;
  const noneSelected = activeChampIds.size === 0;

  const filteredEvents = useMemo(() => {
    let evts = events.filter((e: Event) => userOrgIds.has(e.orgId));
    if (!allSelected) {
      evts = evts.filter((e: Event) => activeChampIds.has(e.championshipId));
    }
    return evts;
  }, [events, userOrgIds, activeChampIds, allSelected]);

  const dateEvents = useMemo(() => {
    const m = new Map<string, Event[]>();
    for (const evt of filteredEvents) {
      const start = parseDate(evt.startDate);
      const end = parseDate(evt.endDate);
      if (!start) continue;
      const last = end ?? start;
      const d = new Date(start);
      while (d <= last) {
        const key = dateKey(d);
        const arr = m.get(key) ?? [];
        arr.push(evt);
        m.set(key, arr);
        d.setDate(d.getDate() + 1);
      }
    }
    return m;
  }, [filteredEvents]);

  const displayedDate = useMemo(() => new Date(year, month, 1), [year, month]);

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  };
  const goToday = () => {
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth());
  };

  const handleDateChange = (d: Date | string | null) => {
    if (!d) return;
    const date = typeof d === 'string' ? new Date(d + 'T00:00:00') : d;
    setYear(date.getFullYear());
    setMonth(date.getMonth());
  };

  const { lastEvent, nextEvent } = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    let last: Event | null = null;
    let next: Event | null = null;
    for (const evt of filteredEvents) {
      const start = parseDate(evt.startDate);
      const end = parseDate(evt.endDate);
      if (!start) continue;
      const endDate = end ?? start;
      if (endDate < todayStart) {
        if (!last || (parseDate(last.endDate) ?? parseDate(last.startDate)!) < endDate) {
          last = evt;
        }
      } else if (start >= todayStart) {
        if (!next || parseDate(next.startDate)! > start) {
          next = evt;
        }
      }
    }
    return { lastEvent: last, nextEvent: next };
  }, [filteredEvents]);

  const goToLastEvent = () => {
    if (!lastEvent) return;
    const d = parseDate(lastEvent.startDate);
    if (d) {
      setYear(d.getFullYear());
      setMonth(d.getMonth());
    }
  };

  const goToNextEvent = () => {
    if (!nextEvent) return;
    const d = parseDate(nextEvent.startDate);
    if (d) {
      setYear(d.getFullYear());
      setMonth(d.getMonth());
    }
  };

  const dropdownLabel = allSelected
    ? 'All Championships'
    : noneSelected
      ? 'No Championships'
      : activeChampIds.size === 1
        ? (champMap.get([...activeChampIds][0])?.name ?? '1 selected')
        : `${activeChampIds.size} Championships`;

  return (
    <Box>
      <Group justify="space-between" align="center" mb="md" wrap="wrap" gap="xs">
        <Title order={1}>Calendar</Title>
        <Menu shadow="md" width={220} position="bottom-end" closeOnClickOutside>
          <Menu.Target>
            <Button variant="default" style={{ minWidth: 200, justifyContent: 'space-between' }}>
              <Group gap="xs">
                {!allSelected && !noneSelected && (
                  <Group gap={2}>
                    {[...activeChampIds].slice(0, 4).map((id) => {
                      const c = champMap.get(id);
                      return c ? (
                        <span
                          key={String(id)}
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            background: c.color,
                          }}
                        />
                      ) : null;
                    })}
                  </Group>
                )}
                {dropdownLabel}
              </Group>
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            <Group gap="xs" p="xs">
              <Button variant="subtle" size="xs" onClick={selectAll} disabled={allSelected}>
                All
              </Button>
              <Button variant="subtle" size="xs" onClick={selectNone} disabled={noneSelected}>
                None
              </Button>
            </Group>
            <Stack gap={0}>
              {orgChamps.map((c: Championship) => (
                <Box
                  key={String(c.id)}
                  p="xs"
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleChamp(c.id);
                  }}
                >
                  <Checkbox
                    checked={activeChampIds.has(c.id)}
                    onChange={() => toggleChamp(c.id)}
                    label={
                      <Group gap="xs">
                        <span
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            background: c.color,
                          }}
                        />
                        {c.name}
                      </Group>
                    }
                    onClick={(e) => e.stopPropagation()}
                  />
                </Box>
              ))}
            </Stack>
            {orgChamps.length === 0 && (
              <Text size="sm" c="dimmed" p="xs">
                No championships
              </Text>
            )}
          </Menu.Dropdown>
        </Menu>
      </Group>

      <Group gap="md" mb="md">
        <Button variant="subtle" size="xs" onClick={prevMonth}>
          ←
        </Button>
        <Text fw={600} size="lg" style={{ minWidth: 160, textAlign: 'center' }}>
          {MONTH_NAMES[month]} {year}
        </Text>
        <Button variant="subtle" size="xs" onClick={nextMonth}>
          →
        </Button>
        <Button variant="subtle" size="xs" onClick={goToday}>
          Today
        </Button>
        <Button
          variant="subtle"
          size="xs"
          onClick={goToLastEvent}
          disabled={!lastEvent}
          title={lastEvent?.name}
        >
          Last event
        </Button>
        <Button
          variant="subtle"
          size="xs"
          onClick={goToNextEvent}
          disabled={!nextEvent}
          title={nextEvent?.name}
        >
          Next event
        </Button>
      </Group>

      <Paper withBorder p="md" style={{ overflow: 'hidden' }}>
        <Calendar
          date={displayedDate}
          onDateChange={handleDateChange}
          onNextMonth={(date) => date && handleDateChange(date)}
          onPreviousMonth={(date) => date && handleDateChange(date)}
          firstDayOfWeek={0}
          static
          renderDay={(date) => {
            const dateStr = toDateStr(date);
            const evts = dateEvents.get(dateStr) ?? [];
            const [y, m, dayNum] = dateStr.split('-').map(Number);
            const isCurrentMonth = m === month + 1 && y === year;
            const todayStr = dateKey(new Date());
            const isToday = dateStr === todayStr;

            return (
              <Box
                p={4}
                style={{
                  minHeight: 90,
                  background: !isCurrentMonth ? 'var(--surface)' : isToday ? 'var(--surface-hover)' : 'var(--bg)',
                  borderRadius: 4,
                }}
              >
                <Text
                  size="xs"
                  fw={600}
                  c={isToday ? 'blue' : 'dimmed'}
                  mb={2}
                >
                  {dayNum}
                </Text>
                <Stack gap={2}>
                  {evts.slice(0, 3).map((evt) => {
                    const champ = champMap.get(evt.championshipId);
                    return (
                      <Text
                        key={String(evt.id)}
                        component={Link}
                        to={`/event/${evt.slug}`}
                        size="xs"
                        style={{
                          display: 'block',
                          padding: '1px 4px',
                          borderLeft: `3px solid ${champ?.color ?? 'var(--accent)'}`,
                          borderRadius: 2,
                          background: 'var(--surface)',
                          color: 'inherit',
                          textDecoration: 'none',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                        title={evt.name}
                      >
                        {evt.name}
                      </Text>
                    );
                  })}
                  {evts.length > 3 && (
                    <Text size="xs" c="dimmed" style={{ paddingLeft: 4 }}>
                      +{evts.length - 3} more
                    </Text>
                  )}
                </Stack>
              </Box>
            );
          }}
        />
      </Paper>
    </Box>
  );
}
