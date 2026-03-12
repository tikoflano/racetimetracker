import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Group,
  Stack,
  Text,
  Title,
  Paper,
  Button,
  TextInput,
  Modal,
  Badge,
  ActionIcon,
  Menu,
  Select,
  ThemeIcon,
} from "@mantine/core";
import { ColorInput } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { DataTable } from "mantine-datatable";
import {
  IconTrophy,
  IconPlus,
  IconDotsVertical,
  IconPencil,
  IconTrash,
  IconPin,
  IconArrowLeft,
} from "@tabler/icons-react";
import { useTable, useReducer } from "spacetimedb/react";
import { tables, reducers } from "@/module_bindings";
import { useAuth } from "@/auth";
import type {
  Championship,
  Event,
  Venue,
  Organization,
  PinnedEvent,
} from "@/module_bindings/types";

function getErrorMessage(e: unknown, fallback: string): string {
  if (e instanceof Error) return e.message || fallback;
  if (typeof e === "string") return e;
  return fallback;
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type EventStatus = "in_progress" | "not_started" | "completed";

const STATUS_LABEL: Record<EventStatus, string> = {
  in_progress: "In Progress",
  not_started: "Not Started",
  completed: "Completed",
};

function getEventStatus(e: Event, today: string): EventStatus {
  if (today < e.startDate) return "not_started";
  if (today > e.endDate) return "completed";
  return "in_progress";
}

interface EventRow {
  event: Event;
  status: EventStatus;
  venueName: string;
}

export function ChampionshipDetailView() {
  const { champId } = useParams<{ champId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [orgs] = useTable(tables.organization);
  const [allChampionships] = useTable(tables.championship);
  const [allEvents] = useTable(tables.event);
  const [allVenues] = useTable(tables.venue);
  const [pinnedEvents] = useTable(tables.pinned_event);

  const updateChampionship = useReducer(reducers.updateChampionship);
  const deleteChampionship = useReducer(reducers.deleteChampionship);
  const createEvent = useReducer(reducers.createEvent);
  const updateEvent = useReducer(reducers.updateEvent);
  const togglePin = useReducer(reducers.togglePinEvent);

  const cid = useMemo(() => {
    try { return BigInt(champId ?? "0"); } catch { return 0n; }
  }, [champId]);

  const activeOrg = useMemo<Organization | null>(() => {
    if (orgs.length === 0) return null;
    const stored = window.localStorage.getItem("active_org_id");
    if (stored) {
      const id = BigInt(stored);
      return orgs.find((o: Organization) => o.id === id) ?? (orgs[0] as Organization);
    }
    return orgs[0] as Organization;
  }, [orgs]);

  const activeOrgId = activeOrg?.id ?? null;

  const champ = allChampionships.find((c: Championship) => c.id === cid) ?? null;

  const pinnedEventIds = useMemo(() => {
    if (!user) return new Set<bigint>();
    return new Set(
      pinnedEvents.filter((p: PinnedEvent) => p.userId === user.id).map((p) => p.eventId)
    );
  }, [user, pinnedEvents]);

  const today = todayStr();

  const orgVenues = useMemo<Venue[]>(() => {
    if (!activeOrgId) return [];
    return [...allVenues.filter((v: Venue) => v.orgId === activeOrgId)].sort(
      (a, b) => a.name.localeCompare(b.name)
    );
  }, [allVenues, activeOrgId]);

  const venueMap = useMemo(() => {
    const m = new Map<bigint, Venue>();
    for (const v of allVenues) m.set(v.id, v);
    return m;
  }, [allVenues]);

  const champEvents = useMemo<Event[]>(() => {
    return [...allEvents.filter((e: Event) => e.championshipId === cid)].sort(
      (a, b) => a.startDate.localeCompare(b.startDate)
    );
  }, [allEvents, cid]);

  const eventRows = useMemo<EventRow[]>(() => {
    return champEvents.map((e: Event) => ({
      event: e,
      status: getEventStatus(e, today),
      venueName: venueMap.get(e.venueId)?.name ?? "—",
    }));
  }, [champEvents, today, venueMap]);

  const [statusFilter, setStatusFilter] = useState<EventStatus | "all">("all");

  const filteredEventRows = useMemo<EventRow[]>(() => {
    if (statusFilter === "all") return eventRows;
    return eventRows.filter((r) => r.status === statusFilter);
  }, [eventRows, statusFilter]);

  const statusCounts = useMemo(() => {
    const counts = { all: eventRows.length, in_progress: 0, not_started: 0, completed: 0 };
    for (const r of eventRows) counts[r.status]++;
    return counts;
  }, [eventRows]);

  // Edit championship modal
  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editError, setEditError] = useState("");

  const startEditing = () => {
    if (!champ) return;
    setEditName(champ.name);
    setEditDesc(champ.description);
    setEditColor(champ.color);
    setEditError("");
    setShowEdit(true);
  };

  const handleSave = async () => {
    setEditError("");
    const trimmed = editName.trim();
    if (!trimmed) { setEditError("Name cannot be empty"); return; }
    try {
      await updateChampionship({
        championshipId: cid,
        name: trimmed,
        description: editDesc.trim(),
        color: editColor,
      });
      setShowEdit(false);
    } catch (e: unknown) {
      setEditError(getErrorMessage(e, "Failed to update"));
    }
  };

  // Add event modal
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [evtName, setEvtName] = useState("");
  const [evtDesc, setEvtDesc] = useState("");
  const [evtStart, setEvtStart] = useState("");
  const [evtEnd, setEvtEnd] = useState("");
  const [evtVenueId, setEvtVenueId] = useState<string | null>(null);
  const [evtError, setEvtError] = useState("");

  const resetEventForm = () => {
    setEvtName(""); setEvtDesc(""); setEvtStart(""); setEvtEnd("");
    setEvtVenueId(null); setEvtError(""); setShowAddEvent(false);
  };

  const handleAddEvent = async () => {
    setEvtError("");
    if (!evtName.trim()) { setEvtError("Event name is required"); return; }
    if (!evtStart) { setEvtError("Start date is required"); return; }
    if (!evtEnd) { setEvtError("End date is required"); return; }
    if (!evtVenueId) { setEvtError("Select a location"); return; }
    try {
      await createEvent({
        orgId: activeOrgId!,
        championshipId: cid,
        venueId: BigInt(evtVenueId),
        name: evtName.trim(),
        description: evtDesc.trim(),
        startDate: evtStart,
        endDate: evtEnd,
      });
      resetEventForm();
    } catch (e: unknown) {
      setEvtError(getErrorMessage(e, "Failed to create event"));
    }
  };

  // Inline event rename
  const [editingEventId, setEditingEventId] = useState<bigint | null>(null);
  const [editEventName, setEditEventName] = useState("");
  const [editEventError, setEditEventError] = useState("");

  const startEditEvent = (e: Event) => {
    setEditingEventId(e.id);
    setEditEventName(e.name);
    setEditEventError("");
  };

  const handleSaveEventName = async (e: Event) => {
    setEditEventError("");
    const trimmed = editEventName.trim();
    if (!trimmed) { setEditEventError("Name cannot be empty"); return; }
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
      setEditEventError(getErrorMessage(err, "Failed to rename"));
    }
  };

  if (!champ) {
    return (
      <Text c="dimmed" ta="center" py="xl">
        Championship not found.
      </Text>
    );
  }

  return (
    <Stack gap="lg">
      {/* Back + header */}
      <Button
        variant="subtle"
        size="xs"
        leftSection={<IconArrowLeft size={14} />}
        onClick={() => navigate("/championships")}
        style={{ alignSelf: "flex-start" }}
      >
        Championships
      </Button>

      <Box
        p="xl"
        style={{
          background: "linear-gradient(135deg, #1C2348 0%, #2A3364 60%, #313B72 100%)",
          borderRadius: "var(--mantine-radius-md)",
          border: "1px solid #1e2028",
        }}
      >
        <Group justify="space-between" align="center" wrap="wrap" gap="md">
          <Group gap="md" align="center">
            <ThemeIcon
              size={52}
              radius="md"
              style={{ background: champ.color + "33", color: champ.color }}
            >
              <IconTrophy size={28} />
            </ThemeIcon>
            <div>
              <Text size="xs" c="blue.3" tt="uppercase" fw={600} mb={2}>
                Championship
              </Text>
              <Title order={2} c="white" fw={700}>
                {champ.name}
              </Title>
              {champ.description && (
                <Text size="sm" c="blue.2" mt={2}>
                  {champ.description}
                </Text>
              )}
            </div>
          </Group>
          <Group gap="xs">
            <Button
              variant="white"
              color="dark"
              leftSection={<IconPlus size={16} />}
              onClick={() => setShowAddEvent(true)}
            >
              Add Event
            </Button>
            <Menu shadow="md" width={200} position="bottom-end">
              <Menu.Target>
                <ActionIcon variant="subtle" color="gray" size="lg">
                  <IconDotsVertical size={16} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item leftSection={<IconPencil size={14} />} onClick={startEditing}>
                  Edit
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconTrash size={14} />}
                  color="red"
                  onClick={async () => {
                    if (!confirm(`Delete "${champ.name}" and all its events? This cannot be undone.`)) return;
                    await deleteChampionship({ championshipId: cid });
                    navigate("/championships");
                  }}
                >
                  Delete
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </Box>

      {/* Events section */}
      <Stack gap="sm">
        <Text size="xs" fw={600} c="dimmed" tt="uppercase">
          Events ({champEvents.length})
        </Text>

        {/* Status filter */}
        {eventRows.length > 0 && (
          <Paper p="sm" style={{ background: "#13151b", border: "1px solid #1e2028" }}>
            <Group gap="xs" wrap="wrap">
              {(["all", "in_progress", "not_started", "completed"] as const).map((f) => {
                const labels: Record<string, string> = {
                  all: "All",
                  in_progress: "In Progress",
                  not_started: "Not Started",
                  completed: "Completed",
                };
                const colors: Record<string, string> = {
                  all: "blue",
                  in_progress: "green",
                  not_started: "yellow",
                  completed: "gray",
                };
                return (
                  <Badge
                    key={f}
                    size="lg"
                    variant={statusFilter === f ? "filled" : "light"}
                    color={colors[f]}
                    style={{ cursor: "pointer" }}
                    onClick={() => setStatusFilter(f)}
                  >
                    {labels[f]} ({statusCounts[f]})
                  </Badge>
                );
              })}
            </Group>
          </Paper>
        )}

        {champEvents.length === 0 ? (
          <Paper withBorder p="xl">
            <Stack align="center" gap="sm">
              <IconTrophy size={48} color="var(--mantine-color-dimmed)" />
              <Text c="dimmed" ta="center">
                No events yet. Add one to get started.
              </Text>
            </Stack>
          </Paper>
        ) : (
          <Paper p="md" withBorder>
            <DataTable
              withTableBorder={false}
              withColumnBorders={false}
              highlightOnHover
              records={filteredEventRows}
              columns={[
                {
                  accessor: "pin",
                  title: "",
                  width: 36,
                  render: (r: EventRow) =>
                    user ? (
                      <ActionIcon
                        variant="subtle"
                        size="sm"
                        color={pinnedEventIds.has(r.event.id) ? "blue" : "gray"}
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePin({ eventId: r.event.id });
                        }}
                        title={pinnedEventIds.has(r.event.id) ? "Unpin" : "Pin"}
                      >
                        <IconPin size={14} />
                      </ActionIcon>
                    ) : null,
                },
                {
                  accessor: "name",
                  title: "Name",
                  render: (r: EventRow) =>
                    editingEventId === r.event.id ? (
                      <Group gap="xs" align="center" onClick={(e) => e.stopPropagation()}>
                        <TextInput
                          value={editEventName}
                          onChange={(ev) => setEditEventName(ev.target.value)}
                          onKeyDown={(ev) => {
                            if (ev.key === "Enter") handleSaveEventName(r.event);
                            if (ev.key === "Escape") setEditingEventId(null);
                          }}
                          autoFocus
                          size="xs"
                          style={{ flex: 1, minWidth: 120 }}
                        />
                        <Button size="xs" onClick={() => handleSaveEventName(r.event)}>Save</Button>
                        <Button variant="subtle" size="xs" onClick={() => setEditingEventId(null)}>Cancel</Button>
                        {editEventError && <Text size="xs" c="red">{editEventError}</Text>}
                      </Group>
                    ) : (
                      <Text fw={500}>{r.event.name}</Text>
                    ),
                },
                {
                  accessor: "status",
                  title: "Status",
                  render: (r: EventRow) => (
                    <Badge
                      color={
                        r.status === "in_progress"
                          ? "green"
                          : r.status === "not_started"
                            ? "yellow"
                            : "gray"
                      }
                      variant="light"
                    >
                      {STATUS_LABEL[r.status]}
                    </Badge>
                  ),
                },
                {
                  accessor: "venueName",
                  title: "Location",
                  render: (r: EventRow) => (
                    <Text size="sm" c={r.venueName === "—" ? "dimmed" : undefined}>
                      {r.venueName}
                    </Text>
                  ),
                },
                {
                  accessor: "startDate",
                  title: "Start",
                  render: (r: EventRow) => r.event.startDate,
                },
                {
                  accessor: "endDate",
                  title: "End",
                  render: (r: EventRow) => r.event.endDate,
                },
                {
                  accessor: "actions",
                  title: "",
                  width: 40,
                  render: (r: EventRow) => (
                    <Menu shadow="md" width={200} position="bottom-end">
                      <Menu.Target>
                        <ActionIcon
                          variant="subtle"
                          size="sm"
                          color="gray"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <IconDotsVertical size={14} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item
                          leftSection={<IconPencil size={14} />}
                          onClick={(e) => { e.stopPropagation(); startEditEvent(r.event); }}
                        >
                          Rename
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  ),
                },
              ]}
            />
          </Paper>
        )}
      </Stack>

      {/* Edit championship modal */}
      <Modal opened={showEdit} onClose={() => setShowEdit(false)} title="Edit Championship">
        <Stack gap="sm">
          {editError && <Text size="sm" c="red">{editError}</Text>}
          <TextInput
            label="Name *"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            autoFocus
          />
          <TextInput
            label="Description"
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
          />
          <ColorInput label="Color" value={editColor} onChange={setEditColor} />
          <Group gap="xs" mt="xs">
            <Button onClick={handleSave}>Save</Button>
            <Button variant="subtle" onClick={() => setShowEdit(false)}>Cancel</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Add event modal */}
      <Modal opened={showAddEvent} onClose={resetEventForm} title="Add Event">
        <Stack gap="sm">
          {evtError && <Text size="sm" c="red">{evtError}</Text>}
          <TextInput
            label="Event Name *"
            placeholder="Event name"
            value={evtName}
            onChange={(e) => setEvtName(e.target.value)}
            autoFocus
          />
          <TextInput
            label="Description"
            placeholder="Optional description"
            value={evtDesc}
            onChange={(e) => setEvtDesc(e.target.value)}
          />
          <Group grow wrap="wrap">
            <DatePickerInput
              label="Start date *"
              value={evtStart ? new Date(evtStart + "T00:00:00") : null}
              onChange={(d) => setEvtStart(d ? d.toISOString().slice(0, 10) : "")}
            />
            <DatePickerInput
              label="End date *"
              value={evtEnd ? new Date(evtEnd + "T00:00:00") : null}
              onChange={(d) => setEvtEnd(d ? d.toISOString().slice(0, 10) : "")}
            />
          </Group>
          <Select
            label="Location *"
            placeholder="Select location..."
            data={orgVenues.map((v) => ({ value: String(v.id), label: v.name }))}
            value={evtVenueId}
            onChange={setEvtVenueId}
            searchable
            allowDeselect={false}
          />
          <Group gap="xs" mt="xs">
            <Button onClick={handleAddEvent}>Create Event</Button>
            <Button variant="subtle" onClick={resetEventForm}>Cancel</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
