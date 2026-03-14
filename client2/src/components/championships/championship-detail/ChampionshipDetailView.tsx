import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "@mantine/form";
import {
  Box,
  Group,
  Stack,
  Text,
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
import { useMediaQuery } from "@mantine/hooks";
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
import {
  ViewHeader,
  FilterToolbar,
  DotsMenu,
  ModalHeader,
  modalHeaderStyles,
  ModalFooter,
  EmptyState,
  ColorDot,
  FormError,
} from "@/components/common";
import type { DotsMenuItem } from "@/components/common";
import { useTable, useReducer } from "spacetimedb/react";
import { tables, reducers } from "@/module_bindings";
import { useAuth } from "@/auth";
import type {
  Championship,
  Event,
  Location,
  Organization,
  PinnedEvent,
} from "@/module_bindings/types";
import { getErrorMessage } from "@/utils";

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

const STATUS_COLOR: Record<EventStatus, string> = {
  in_progress: "green",
  not_started: "yellow",
  completed: "gray",
};

function getEventStatus(e: Event, today: string): EventStatus {
  if (today < e.startDate) return "not_started";
  if (today > e.endDate) return "completed";
  return "in_progress";
}

interface EventRow {
  event: Event;
  status: EventStatus;
  locationName: string;
}

export function ChampionshipDetailView() {
  const { champId } = useParams<{ champId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useMediaQuery("(max-width: 768px)");

  const [orgs] = useTable(tables.organization);
  const [allChampionships] = useTable(tables.championship);
  const [allEvents] = useTable(tables.event);
  const [allLocations] = useTable(tables.location);
  const [pinnedEvents] = useTable(tables.pinned_event);

  const updateChampionship = useReducer(reducers.updateChampionship);
  const deleteChampionship = useReducer(reducers.deleteChampionship);
  const createEvent = useReducer(reducers.createEvent);
  const updateEvent = useReducer(reducers.updateEvent);
  const togglePin = useReducer(reducers.togglePinEvent);

  const cid = useMemo(() => {
    try {
      return BigInt(champId ?? "0");
    } catch {
      return 0n;
    }
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
      pinnedEvents.filter((p: PinnedEvent) => p.userId === user.id).map((p) => p.eventId),
    );
  }, [user, pinnedEvents]);

  const today = todayStr();

  const orgLocations = useMemo<Location[]>(() => {
    if (!activeOrgId) return [];
    return [...allLocations.filter((v: Location) => v.orgId === activeOrgId)].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [allLocations, activeOrgId]);

  const locationMap = useMemo(() => {
    const m = new Map<bigint, Location>();
    for (const v of allLocations) m.set(v.id, v);
    return m;
  }, [allLocations]);

  const champEvents = useMemo<Event[]>(() => {
    return [...allEvents.filter((e: Event) => e.championshipId === cid)].sort((a, b) =>
      a.startDate.localeCompare(b.startDate),
    );
  }, [allEvents, cid]);

  const eventRows = useMemo<EventRow[]>(() => {
    return champEvents.map((e: Event) => ({
      event: e,
      status: getEventStatus(e, today),
      locationName: locationMap.get(e.locationId)?.name ?? "—",
    }));
  }, [champEvents, today, locationMap]);

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
  const editChampForm = useForm({
    initialValues: { name: "", description: "", color: "" },
    validate: {
      name: (v) => (!v?.trim() ? "Name cannot be empty" : null),
    },
  });

  const startEditing = () => {
    if (!champ) return;
    editChampForm.setValues({
      name: champ.name,
      description: champ.description,
      color: champ.color,
    });
    editChampForm.clearErrors();
    setShowEdit(true);
  };

  const handleSave = async () => {
    if (!editChampForm.validate()) return;
    try {
      await updateChampionship({
        championshipId: cid,
        name: editChampForm.values.name.trim(),
        description: editChampForm.values.description.trim(),
        color: editChampForm.values.color,
      });
      setShowEdit(false);
    } catch (e: unknown) {
      editChampForm.setFieldError("name", getErrorMessage(e, "Failed to update"));
    }
  };

  // Add event modal
  const [showAddEvent, setShowAddEvent] = useState(false);
  const addEventForm = useForm<{
    name: string;
    description: string;
    startDate: string;
    endDate: string;
    locationId: string | null;
  }>({
    initialValues: {
      name: "",
      description: "",
      startDate: "",
      endDate: "",
      locationId: null,
    },
    validate: {
      name: (v) => (!v?.trim() ? "Event name is required" : null),
      startDate: (v) => (!v ? "Start date is required" : null),
      endDate: (v) => (!v ? "End date is required" : null),
      locationId: (v) => (!v ? "Select a location" : null),
    },
  });

  const resetEventForm = () => {
    addEventForm.reset();
    setShowAddEvent(false);
  };

  const handleAddEvent = async () => {
    if (!addEventForm.validate()) return;
    try {
      await createEvent({
        orgId: activeOrgId!,
        championshipId: cid,
        locationId: BigInt(addEventForm.values.locationId!),
        name: addEventForm.values.name.trim(),
        description: addEventForm.values.description.trim(),
        startDate: addEventForm.values.startDate,
        endDate: addEventForm.values.endDate,
      });
      resetEventForm();
    } catch (e: unknown) {
      addEventForm.setFieldError("name", getErrorMessage(e, "Failed to create event"));
    }
  };

  // Inline event rename
  const [editingEventId, setEditingEventId] = useState<bigint | null>(null);
  const editEventNameForm = useForm({
    initialValues: { name: "" },
    validate: {
      name: (v) => (!v?.trim() ? "Name cannot be empty" : null),
    },
  });

  const startEditEvent = (e: Event) => {
    setEditingEventId(e.id);
    editEventNameForm.setValues({ name: e.name });
    editEventNameForm.clearErrors();
  };

  const handleSaveEventName = async (ev: Event) => {
    if (!editEventNameForm.validate()) return;
    try {
      await updateEvent({
        eventId: ev.id,
        name: editEventNameForm.values.name.trim(),
        description: ev.description,
        startDate: ev.startDate,
        endDate: ev.endDate,
      });
      setEditingEventId(null);
    } catch (err: unknown) {
      editEventNameForm.setFieldError("name", getErrorMessage(err, "Failed to rename"));
    }
  };

  if (!champ) {
    return (
      <Text c="dimmed" ta="center" py="xl">
        Championship not found.
      </Text>
    );
  }

  const filterBadges = (["all", "in_progress", "not_started", "completed"] as const).map((f) => {
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
  });

  return (
    <Stack gap="lg">
      {/* Back button */}
      <Button
        variant="subtle"
        size="xs"
        leftSection={<IconArrowLeft size={14} />}
        onClick={() => navigate("/championships")}
        style={{ alignSelf: "flex-start" }}
      >
        Championships
      </Button>

      {/* Header banner */}
      <ViewHeader
        icon={
          <ThemeIcon
            size={52}
            radius="md"
            style={{ background: champ.color + "33", color: champ.color }}
          >
            <IconTrophy size={28} />
          </ThemeIcon>
        }
        iconColor="blue"
        gradient={`linear-gradient(135deg, ${champ.color}18 0%, ${champ.color}38 60%, ${champ.color}55 100%)`}
        eyebrow={activeOrg?.name}
        title={champ.name}
        subtitle={champ.description || "No description yet."}
        isMobile={isMobile}
        actions={
          <>
            {!isMobile ? (
              <>
                <Button
                  variant="white"
                  color="dark"
                  leftSection={<IconPlus size={16} />}
                  onClick={() => setShowAddEvent(true)}
                >
                  Add Event
                </Button>
                <DotsMenu
                  size="lg"
                  iconSize={18}
                  width={200}
                  items={[
                    { icon: <IconPencil size={14} />, label: "Edit championship", onClick: startEditing },
                    {
                      icon: <IconTrash size={14} />,
                      label: "Delete",
                      color: "red",
                      onClick: () => {
                        if (confirm(`Delete "${champ.name}" and all its events? This cannot be undone.`)) {
                          deleteChampionship({ championshipId: champ.id });
                          navigate("/championships");
                        }
                      },
                    },
                  ] satisfies DotsMenuItem[]}
                />
              </>
            ) : (
              <Menu shadow="md" width={200} position="bottom-end">
                <Menu.Target>
                  <ActionIcon
                    variant="filled"
                    size="md"
                    color="dark"
                    style={{ backgroundColor: "rgba(15,23,42,0.75)", color: "white" }}
                  >
                    <IconDotsVertical size={16} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item leftSection={<IconPencil size={14} />} onClick={startEditing}>
                    Edit championship
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<IconTrash size={14} />}
                    color="red"
                    onClick={() => {
                      if (confirm(`Delete "${champ.name}" and all its events? This cannot be undone.`)) {
                        deleteChampionship({ championshipId: champ.id });
                        navigate("/championships");
                      }
                    }}
                  >
                    Delete
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            )}
          </>
        }
      />

      {/* Filters + actions */}
      <FilterToolbar
        filterContent={
          <Stack gap="xs">
            <Text size="xs" c="dimmed" fw={600} tt="uppercase">Filter by status</Text>
            {filterBadges}
          </Stack>
        }
        activeFilterCount={statusFilter !== "all" ? 1 : 0}
        search=""
        onSearchChange={() => {}}
        searchOpen={false}
        onSearchOpenChange={() => {}}
        resultLabel={`${filteredEventRows.length} event${filteredEventRows.length !== 1 ? "s" : ""} in this championship`}
        leftContent={
          isMobile ? (
            <Button
              size="xs"
              variant="white"
              color="dark"
              leftSection={<IconPlus size={14} />}
              onClick={() => setShowAddEvent(true)}
            >
              Add Event
            </Button>
          ) : undefined
        }
      />

      {/* Events list */}
      {champEvents.length === 0 ? (
        <EmptyState
          icon={<IconTrophy size={48} color="var(--mantine-color-dimmed)" />}
          message="No events yet. Create one to get started."
          action={{ label: "Add Event", onClick: () => setShowAddEvent(true) }}
        />
      ) : isMobile ? (
        /* Mobile cards */
        <Stack gap="sm">
          {filteredEventRows.map((r) => (
            <Paper
              key={String(r.event.id)}
              p="md"
              withBorder
              style={{ cursor: "pointer", position: "relative" }}
              onClick={() => navigate(`/event/${r.event.id}`)}
            >
              <Group gap="xs" align="center" mb={6} style={{ paddingRight: 32 }}>
                <ColorDot
                  color={
                    r.status === "in_progress"
                      ? "#22c55e"
                      : r.status === "not_started"
                        ? "#facc15"
                        : "#9ca3af"
                  }
                />
                <Text fw={600} size="sm" style={{ flex: 1, minWidth: 0 }} lineClamp={1}>
                  {r.event.name}
                </Text>
                <Badge color={STATUS_COLOR[r.status]} variant="light" size="sm">
                  {STATUS_LABEL[r.status]}
                </Badge>
              </Group>
              <Text size="xs" c="dimmed">
                {r.locationName} · {r.event.startDate} – {r.event.endDate}
              </Text>
              <Box
                style={{ position: "absolute", top: 8, right: 8 }}
                onClick={(e) => e.stopPropagation()}
              >
                <Group gap={4}>
                  {user && (
                    <ActionIcon
                      variant="subtle"
                      size="sm"
                      color={pinnedEventIds.has(r.event.id) ? "blue" : "gray"}
                      onClick={() => togglePin({ eventId: r.event.id })}
                    >
                      <IconPin size={14} />
                    </ActionIcon>
                  )}
                  <DotsMenu
                    width={180}
                    items={[
                      { icon: <IconPencil size={14} />, label: "Rename", onClick: () => startEditEvent(r.event) },
                    ] satisfies DotsMenuItem[]}
                  />
                </Group>
              </Box>
            </Paper>
          ))}
        </Stack>
      ) : (
        /* Desktop DataTable */
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
                        {...editEventNameForm.getInputProps("name")}
                        onKeyDown={(ev) => {
                          if (ev.key === "Enter") handleSaveEventName(r.event);
                          if (ev.key === "Escape") setEditingEventId(null);
                        }}
                        autoFocus
                        size="xs"
                        style={{ flex: 1, minWidth: 120 }}
                      />
                      <Button size="xs" onClick={() => handleSaveEventName(r.event)}>
                        Save
                      </Button>
                      <Button
                        variant="subtle"
                        size="xs"
                        onClick={() => setEditingEventId(null)}
                      >
                        Cancel
                      </Button>
                      {editEventNameForm.errors.name && (
                        <Text size="xs" c="red">
                          {editEventNameForm.errors.name}
                        </Text>
                      )}
                    </Group>
                  ) : (
                    <Text fw={500}>{r.event.name}</Text>
                  ),
              },
              {
                accessor: "status",
                title: "Status",
                render: (r: EventRow) => (
                  <Badge color={STATUS_COLOR[r.status]} variant="light">
                    {STATUS_LABEL[r.status]}
                  </Badge>
                ),
              },
              {
                accessor: "locationName",
                title: "Location",
                render: (r: EventRow) => (
                  <Text size="sm" c={r.locationName === "—" ? "dimmed" : undefined}>
                    {r.locationName}
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
                  <DotsMenu
                    stopPropagation
                    width={200}
                    items={[
                      { icon: <IconPencil size={14} />, label: "Rename", onClick: () => startEditEvent(r.event) },
                    ] satisfies DotsMenuItem[]}
                  />
                ),
              },
            ]}
          />
        </Paper>
      )}

      {/* Edit championship modal */}
      <Modal
        opened={showEdit}
        onClose={() => setShowEdit(false)}
        title={
          <ModalHeader
            icon={<IconTrophy size={20} />}
            iconColor="blue"
            label="Championship"
            title="Edit Championship"
          />
        }
        centered
        radius="md"
        size="lg"
        overlayProps={{ blur: 3 }}
        styles={modalHeaderStyles()}
      >
        <Stack gap="sm" pt="xs">
          <FormError error={typeof editChampForm.errors.name === "string" ? editChampForm.errors.name : undefined} />
          <TextInput
            label="Name *"
            {...editChampForm.getInputProps("name")}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            autoFocus
          />
          <TextInput
            label="Description"
            {...editChampForm.getInputProps("description")}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
          />
          <ColorInput
            label="Color"
            {...editChampForm.getInputProps("color")}
          />
          <ModalFooter
            onCancel={() => setShowEdit(false)}
            submitLabel="Save"
            onSubmit={handleSave}
          />
        </Stack>
      </Modal>

      {/* Add event modal */}
      <Modal
        opened={showAddEvent}
        onClose={resetEventForm}
        title={
          <ModalHeader
            icon={<IconPlus size={20} />}
            iconColor="blue"
            label="Championship"
            title="Add Event"
          />
        }
        centered
        radius="md"
        size="lg"
        overlayProps={{ blur: 3 }}
        styles={modalHeaderStyles()}
      >
        <Stack gap="sm" pt="xs">
          <FormError error={typeof addEventForm.errors.name === "string" ? addEventForm.errors.name : undefined} />
          <TextInput
            label="Event Name *"
            placeholder="Event name"
            {...addEventForm.getInputProps("name")}
            autoFocus
          />
          <TextInput
            label="Description"
            placeholder="Optional description"
            {...addEventForm.getInputProps("description")}
          />
          <Group grow wrap="wrap">
            <DatePickerInput
              label="Start date *"
              value={addEventForm.values.startDate ? new Date(addEventForm.values.startDate + "T00:00:00") : null}
              onChange={(d) => addEventForm.setFieldValue("startDate", d ? d.toISOString().slice(0, 10) : "")}
            />
            <DatePickerInput
              label="End date *"
              value={addEventForm.values.endDate ? new Date(addEventForm.values.endDate + "T00:00:00") : null}
              onChange={(d) => addEventForm.setFieldValue("endDate", d ? d.toISOString().slice(0, 10) : "")}
            />
          </Group>
          <Select
            label="Location *"
            placeholder="Select location..."
            data={orgLocations.map((v) => ({ value: String(v.id), label: v.name }))}
            {...addEventForm.getInputProps("locationId")}
            searchable
            allowDeselect={false}
          />
          <ModalFooter
            onCancel={resetEventForm}
            submitLabel="Create Event"
            onSubmit={handleAddEvent}
          />
        </Stack>
      </Modal>
    </Stack>
  );
}


