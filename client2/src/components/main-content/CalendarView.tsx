import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Group,
  Button,
  Menu,
  Checkbox,
  Text,
  Title,
  ThemeIcon,
  Box,
  Stack,
  Paper,
  ActionIcon,
} from "@mantine/core";

import {
  IconChevronLeft,
  IconChevronRight,
  IconCalendarEvent,
  IconFilter,
} from "@tabler/icons-react";

import { useTable } from "spacetimedb/react";
import { tables } from "@/module_bindings";
import type { Championship, Event, Organization } from "@/module_bindings/types";

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
  onEventClick: (event: Event) => void;
}

function CalendarGrid({ year, month, dateEvents, champMap, onEventClick }: CalendarGridProps) {
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
                      onClick={() => onEventClick(evt)}
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
  const navigate = useNavigate();
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [selectedChampIds, setSelectedChampIds] = useState<Set<bigint> | null>(
    null
  );

  const [orgs] = useTable(tables.organization);
  const [allChampionships] = useTable(tables.championship);
  const [allEvents] = useTable(tables.event);

  const activeOrg = useMemo<Organization | null>(() => {
    if (orgs.length === 0) return null;
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("active_org_id");
      if (stored) {
        const id = BigInt(stored);
        const found = orgs.find((o: Organization) => o.id === id);
        if (found) return found;
      }
    }
    return orgs[0] as Organization;
  }, [orgs]);

  const activeOrgId = activeOrg?.id ?? null;

  const championships = useMemo(() => {
    if (!activeOrgId) return [] as Championship[];
    return allChampionships.filter((c: Championship) => c.orgId === activeOrgId);
  }, [allChampionships, activeOrgId]);

  const events = useMemo(() => {
    if (!activeOrgId) return [] as Event[];
    return allEvents.filter((e: Event) => e.orgId === activeOrgId);
  }, [allEvents, activeOrgId]);

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

  const prevMonth =() => {
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

  const handleEventClick = (evt: Event) => {
    navigate(`/events/${evt.id}`);
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
      {/* Header banner */}
      <Box
        p="xl"
        style={{
          background:
            "linear-gradient(135deg, #1C2348 0%, #2A3364 60%, #313B72 100%)",
          borderRadius: "var(--mantine-radius-md)",
          border: "1px solid #1e2028",
        }}
      >
        <Group justify="space-between" align="center" wrap="wrap" gap="md">
          <Group gap="md" align="center">
            <ThemeIcon size={52} radius="md" color="blue" variant="light">
              <IconCalendarEvent size={28} />
            </ThemeIcon>
            <div>
              <Text size="xs" c="blue.3" tt="uppercase" fw={600} mb={2}>
                Schedule
              </Text>
              <Title order={2} c="white" fw={700}>
                Calendar
              </Title>
              <Text size="sm" c="blue.2" mt={2}>
                {filteredEvents.length} event
                {filteredEvents.length !== 1 ? "s" : ""}
              </Text>
            </div>
          </Group>
          <Menu
            shadow="md"
            width={260}
            position="bottom-end"
            closeOnItemClick={false}
          >
            <Menu.Target>
              <Button
                variant="white"
                color="dark"
                leftSection={<IconFilter size={16} />}
              >
                {dropdownLabel}
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                onClick={selectAll}
                disabled={allSelected}
                fw={500}
              >
                Select all
              </Menu.Item>
              <Menu.Item
                onClick={selectNone}
                disabled={noneSelected}
                fw={500}
              >
                Select none
              </Menu.Item>
              <Menu.Divider />
              {championships.map((c) => (
                <Menu.Item
                  key={String(c.id)}
                  onClick={() => toggleChamp(c.id)}
                  leftSection={
                    <Checkbox
                      checked={activeChampIds.has(c.id)}
                      onChange={() => toggleChamp(c.id)}
                      onClick={(e) => e.stopPropagation()}
                      size="xs"
                    />
                  }
                >
                  <Group gap="xs">
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: c.color,
                        flexShrink: 0,
                      }}
                    />
                    {c.name}
                  </Group>
                </Menu.Item>
              ))}
              {championships.length === 0 && (
                <Menu.Item disabled>No championships</Menu.Item>
              )}
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Box>

      {/* Month navigation */}
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

      <Paper withBorder p="md" radius="md">
        <CalendarGrid
          year={year}
          month={month}
          dateEvents={dateEvents}
          champMap={champMap}
          onEventClick={handleEventClick}
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
