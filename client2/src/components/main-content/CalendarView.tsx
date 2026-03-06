import { useState, useMemo } from "react";
import {
  Group,
  Button,
  Menu,
  Checkbox,
  Text,
  Title,
  Box,
  Stack,
  Paper,
  Badge,
  ActionIcon,
} from "@mantine/core";

import {
  IconChevronLeft,
  IconChevronRight,
  IconCalendarEvent,
  IconFilter,
} from "@tabler/icons-react";

// Mock data types
interface Championship {
  id: bigint;
  name: string;
  color: string;
}

interface Event {
  id: bigint;
  name: string;
  slug: string;
  startDate: string;
  endDate: string;
  championshipId: bigint;
}

// Mock championships
const MOCK_CHAMPIONSHIPS: Championship[] = [
  { id: BigInt(1), name: "Enduro Series 2026", color: "#3b82f6" },
  { id: BigInt(2), name: "Mountain Cup", color: "#22c55e" },
  { id: BigInt(3), name: "Downtown Race", color: "#f59e0b" },
  { id: BigInt(4), name: "Regional Finals", color: "#8b5cf6" },
];

// Mock events spanning different dates
const MOCK_EVENTS: Event[] = [
  {
    id: BigInt(1),
    name: "Spring Opener",
    slug: "spring-opener",
    startDate: "2026-03-07",
    endDate: "2026-03-08",
    championshipId: BigInt(1),
  },
  {
    id: BigInt(2),
    name: "Mountain Challenge",
    slug: "mountain-challenge",
    startDate: "2026-03-14",
    endDate: "2026-03-15",
    championshipId: BigInt(2),
  },
  {
    id: BigInt(3),
    name: "Downtown Sprint",
    slug: "downtown-sprint",
    startDate: "2026-03-21",
    endDate: "2026-03-21",
    championshipId: BigInt(3),
  },
  {
    id: BigInt(4),
    name: "Enduro Round 2",
    slug: "enduro-round-2",
    startDate: "2026-03-28",
    endDate: "2026-03-29",
    championshipId: BigInt(1),
  },
  {
    id: BigInt(5),
    name: "Regional Qualifier",
    slug: "regional-qualifier",
    startDate: "2026-04-05",
    endDate: "2026-04-06",
    championshipId: BigInt(4),
  },
  {
    id: BigInt(6),
    name: "Mountain Classic",
    slug: "mountain-classic",
    startDate: "2026-04-12",
    endDate: "2026-04-13",
    championshipId: BigInt(2),
  },
  {
    id: BigInt(7),
    name: "Multi-day Event",
    slug: "multi-day-event",
    startDate: "2026-03-06",
    endDate: "2026-03-08",
    championshipId: BigInt(4),
  },
];

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function parseDate(s: string): Date | null {
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toDateStr(date: Date | string): string {
  if (typeof date === "string") return date;
  const d = date;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface CalendarGridProps {
  year: number;
  month: number;
  dateEvents: Map<string, Event[]>;
  champMap: Map<bigint, Championship>;
}

function CalendarGrid({ year, month, dateEvents, champMap }: CalendarGridProps) {
  const weeks = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    
    // Get days from previous month to fill first week
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const daysInPrevMonth = new Date(prevYear, prevMonth + 1, 0).getDate();
    
    const cells: { date: Date; isCurrentMonth: boolean }[] = [];
    
    // Previous month days
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      cells.push({
        date: new Date(prevYear, prevMonth, daysInPrevMonth - i),
        isCurrentMonth: false,
      });
    }
    
    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        date: new Date(year, month, d),
        isCurrentMonth: true,
      });
    }
    
    // Next month days to fill remaining cells (complete 6 weeks)
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    let nextDay = 1;
    while (cells.length < 42) {
      cells.push({
        date: new Date(nextYear, nextMonth, nextDay++),
        isCurrentMonth: false,
      });
    }
    
    // Split into weeks
    const result: { date: Date; isCurrentMonth: boolean }[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      result.push(cells.slice(i, i + 7));
    }
    return result;
  }, [year, month]);

  const todayStr = dateKey(new Date());

  return (
    <Box>
      <Box
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 1,
          marginBottom: 1,
        }}
      >
        {DAY_NAMES.map((day) => (
          <Box
            key={day}
            p="xs"
            style={{
              textAlign: "center",
              background: "var(--mantine-color-dark-6)",
            }}
          >
            <Text size="sm" fw={600} c="dimmed">
              {day}
            </Text>
          </Box>
        ))}
      </Box>
      <Box
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 1,
        }}
      >
        {weeks.flat().map((cell, idx) => {
          const dateStr = toDateStr(cell.date);
          const evts = dateEvents.get(dateStr) ?? [];
          const isToday = dateStr === todayStr;

          return (
            <Box
              key={idx}
              p="xs"
              style={{
                minHeight: 100,
                background: !cell.isCurrentMonth
                  ? "var(--mantine-color-dark-7)"
                  : isToday
                    ? "var(--mantine-color-dark-5)"
                    : "var(--mantine-color-dark-6)",
              }}
            >
              <Text
                size="sm"
                fw={isToday ? 700 : 500}
                c={isToday ? "blue" : cell.isCurrentMonth ? undefined : "dark.4"}
                mb={4}
              >
                {cell.date.getDate()}
              </Text>
              <Stack gap={2}>
                {evts.slice(0, 2).map((evt) => {
                  const champ = champMap.get(evt.championshipId);
                  return (
                    <Text
                      key={String(evt.id)}
                      size="xs"
                      style={{
                        display: "block",
                        padding: "2px 6px",
                        borderLeft: `3px solid ${champ?.color ?? "var(--mantine-color-blue-6)"}`,
                        borderRadius: 2,
                        background: "var(--mantine-color-dark-5)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        cursor: "pointer",
                      }}
                      title={evt.name}
                    >
                      {evt.name}
                    </Text>
                  );
                })}
                {evts.length > 2 && (
                  <Text size="xs" c="dimmed">
                    +{evts.length - 2} more
                  </Text>
                )}
              </Stack>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

export function CalendarView() {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [selectedChampIds, setSelectedChampIds] = useState<Set<bigint> | null>(
    null
  );

  const championships = MOCK_CHAMPIONSHIPS;
  const events = MOCK_EVENTS;

  const activeChampIds = useMemo(() => {
    if (selectedChampIds !== null) return selectedChampIds;
    return new Set(championships.map((c) => c.id));
  }, [selectedChampIds, championships]);

  const champMap = useMemo(() => {
    const m = new Map<bigint, Championship>();
    for (const c of championships) m.set(c.id, c);
    return m;
  }, [championships]);

  const toggleChamp = (id: bigint) => {
    setSelectedChampIds((prev) => {
      const current = prev ?? new Set(championships.map((c) => c.id));
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedChampIds(null);
  const selectNone = () => setSelectedChampIds(new Set());

  const allSelected = activeChampIds.size === championships.length;
  const noneSelected = activeChampIds.size === 0;

  const filteredEvents = useMemo(() => {
    if (allSelected) return events;
    return events.filter((e) => activeChampIds.has(e.championshipId));
  }, [events, activeChampIds, allSelected]);

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
    const date = typeof d === "string" ? new Date(d + "T00:00:00") : d;
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
        if (
          !last ||
          (parseDate(last.endDate) ?? parseDate(last.startDate)!) < endDate
        ) {
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
    ? "All Championships"
    : noneSelected
      ? "No Championships"
      : activeChampIds.size === 1
        ? (champMap.get([...activeChampIds][0])?.name ?? "1 selected")
        : `${activeChampIds.size} Championships`;

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center" wrap="wrap" gap="md">
        <Title order={2} fw={700}>
          Calendar
        </Title>
        <Menu
          shadow="md"
          width={260}
          position="bottom-end"
          closeOnClickOutside
        >
          <Menu.Target>
            <Button
              variant="default"
              leftSection={<IconFilter size={16} />}
              style={{ minWidth: 200, justifyContent: "space-between" }}
            >
              <Group gap="xs">
                {!allSelected && !noneSelected && (
                  <Group gap={4}>
                    {[...activeChampIds].slice(0, 4).map((id) => {
                      const c = champMap.get(id);
                      return c ? (
                        <span
                          key={String(id)}
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
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
            <Group gap="xs" p="xs" justify="flex-end">
              <Button
                variant="subtle"
                size="xs"
                onClick={selectAll}
                disabled={allSelected}
              >
                All
              </Button>
              <Button
                variant="subtle"
                size="xs"
                onClick={selectNone}
                disabled={noneSelected}
              >
                None
              </Button>
            </Group>
            <Stack gap={0}>
              {championships.map((c) => (
                <Box
                  key={String(c.id)}
                  p="xs"
                  style={{ cursor: "pointer" }}
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
                            borderRadius: "50%",
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
            {championships.length === 0 && (
              <Text size="sm" c="dimmed" p="xs">
                No championships
              </Text>
            )}
          </Menu.Dropdown>
        </Menu>
      </Group>

      <Group gap="sm" wrap="wrap">
        <Group gap={4}>
          <ActionIcon variant="subtle" onClick={prevMonth}>
            <IconChevronLeft size={18} />
          </ActionIcon>
          <Text fw={600} size="lg" style={{ minWidth: 160, textAlign: "center" }}>
            {MONTH_NAMES[month]} {year}
          </Text>
          <ActionIcon variant="subtle" onClick={nextMonth}>
            <IconChevronRight size={18} />
          </ActionIcon>
        </Group>
        <Group gap="xs">
          <Button variant="light" size="xs" onClick={goToday}>
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
      </Group>

      <Group gap="xs" wrap="wrap">
        {championships.map((c) => (
          <Badge
            key={String(c.id)}
            size="sm"
            variant={activeChampIds.has(c.id) ? "filled" : "light"}
            color="gray"
            leftSection={
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: c.color,
                }}
              />
            }
            style={{
              cursor: "pointer",
              opacity: activeChampIds.has(c.id) ? 1 : 0.5,
            }}
            onClick={() => toggleChamp(c.id)}
          >
            {c.name}
          </Badge>
        ))}
      </Group>

      <Paper withBorder p="md" radius="md">
        <CalendarGrid
          year={year}
          month={month}
          dateEvents={dateEvents}
          champMap={champMap}
        />
      </Paper>

      {filteredEvents.length === 0 && (
        <Paper withBorder p="xl" radius="md" style={{ textAlign: "center" }}>
          <IconCalendarEvent
            size={48}
            stroke={1.5}
            style={{ opacity: 0.3, marginBottom: 8 }}
          />
          <Text size="lg" fw={500} c="dimmed">
            No events to display
          </Text>
          <Text size="sm" c="dimmed">
            Select championships from the filter to see events
          </Text>
        </Paper>
      )}
    </Stack>
  );
}
