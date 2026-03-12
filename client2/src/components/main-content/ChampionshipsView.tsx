import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Group,
  Stack,
  Text,
  Title,
  ThemeIcon,
  Paper,
  Button,
  TextInput,
  Modal,
  Badge,
  ActionIcon,
  Menu,
} from "@mantine/core";
import { ColorInput } from "@mantine/core";
import { DataTable, type DataTableSortStatus } from "mantine-datatable";
import {
  IconTrophy,
  IconPlus,
  IconDotsVertical,
  IconTrash,
} from "@tabler/icons-react";
import { useTable, useReducer } from "spacetimedb/react";
import { tables, reducers } from "@/module_bindings";
import type { Championship, Event, Organization } from "@/module_bindings/types";

function getErrorMessage(e: unknown, fallback: string): string {
  if (e instanceof Error) return e.message || fallback;
  if (typeof e === "string") return e;
  return fallback;
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type ChampStatus = "in_progress" | "not_started" | "completed";

const STATUS_ORDER: Record<ChampStatus, number> = {
  in_progress: 0,
  not_started: 1,
  completed: 2,
};

const STATUS_LABEL: Record<ChampStatus, string> = {
  in_progress: "In Progress",
  not_started: "Not Started",
  completed: "Completed",
};

const STATUS_COLOR: Record<ChampStatus, string> = {
  in_progress: "green",
  not_started: "yellow",
  completed: "gray",
};

interface ChampRow {
  championship: Championship;
  eventCount: number;
  startDate: string;
  endDate: string;
  nextEvent: Event | null;
  nextEventSort: string;
  status: ChampStatus;
}

export function ChampionshipsView() {
  const navigate = useNavigate();

  const [orgs] = useTable(tables.organization);
  const [allChampionships] = useTable(tables.championship);
  const [allEvents] = useTable(tables.event);

  const createChampionship = useReducer(reducers.createChampionship);
  const deleteChampionship = useReducer(reducers.deleteChampionship);

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

  const today = todayStr();

  const champRows = useMemo<ChampRow[]>(() => {
    if (!activeOrgId) return [];
    const orgChamps = allChampionships.filter((c: Championship) => c.orgId === activeOrgId);
    return orgChamps.map((c: Championship) => {
      const champEvents = allEvents.filter((e: Event) => e.championshipId === c.id);
      const dates = champEvents
        .flatMap((e: Event) => [e.startDate, e.endDate])
        .filter(Boolean)
        .sort();
      const upcoming = champEvents
        .filter((e: Event) => e.endDate >= today)
        .sort((a: Event, b: Event) => a.startDate.localeCompare(b.startDate));
      const nextEvent = upcoming.length > 0 ? upcoming[0] : null;
      let status: ChampStatus = "not_started";
      if (champEvents.length > 0) {
        const firstStart = champEvents.map((e: Event) => e.startDate).sort()[0];
        const lastEnd = champEvents.map((e: Event) => e.endDate).sort().pop()!;
        if (today < firstStart) status = "not_started";
        else if (today > lastEnd) status = "completed";
        else status = "in_progress";
      }
      return {
        championship: c,
        eventCount: champEvents.length,
        startDate: dates[0] ?? "—",
        endDate: dates[dates.length - 1] ?? "—",
        nextEvent,
        nextEventSort: nextEvent?.startDate ?? "\uffff",
        status,
      };
    });
  }, [allChampionships, allEvents, activeOrgId, today]);

  const [statusFilter, setStatusFilter] = useState<ChampStatus | "all">("all");
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<ChampRow>>({
    columnAccessor: "name",
    direction: "asc",
  });

  const filteredRows = useMemo<ChampRow[]>(() => {
    if (statusFilter === "all") return champRows;
    return champRows.filter((r) => r.status === statusFilter);
  }, [champRows, statusFilter]);

  const sortedRows = useMemo<ChampRow[]>(() => {
    const rows = [...filteredRows];
    const dir = sortStatus.direction === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      switch (sortStatus.columnAccessor) {
        case "name":
          return dir * a.championship.name.localeCompare(b.championship.name);
        case "eventCount":
          return dir * (a.eventCount - b.eventCount);
        case "startDate":
          return dir * a.startDate.localeCompare(b.startDate);
        case "endDate":
          return dir * a.endDate.localeCompare(b.endDate);
        case "nextEvent":
          return dir * a.nextEventSort.localeCompare(b.nextEventSort);
        case "status":
          return dir * (STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
        default:
          return 0;
      }
    });
    return rows;
  }, [filteredRows, sortStatus]);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newColor, setNewColor] = useState("#3b82f6");
  const [createError, setCreateError] = useState("");

  const resetCreate = () => {
    setNewName("");
    setNewDesc("");
    setNewColor("#3b82f6");
    setCreateError("");
    setShowCreate(false);
  };

  const handleCreate = async () => {
    setCreateError("");
    const trimmed = newName.trim();
    if (!trimmed) {
      setCreateError("Name is required");
      return;
    }
    try {
      await createChampionship({
        orgId: activeOrgId!,
        name: trimmed,
        description: newDesc.trim(),
        color: newColor,
      });
      resetCreate();
    } catch (e: unknown) {
      setCreateError(getErrorMessage(e, "Failed to create championship"));
    }
  };

  const handleDelete = async (c: Championship) => {
    if (!confirm(`Delete "${c.name}" and all its events? This cannot be undone.`)) return;
    try {
      await deleteChampionship({ championshipId: c.id });
    } catch (e: unknown) {
      console.error(getErrorMessage(e, "Failed to delete championship"));
    }
  };

  if (!activeOrg) return null;

  const statusCounts = {
    all: champRows.length,
    in_progress: champRows.filter((r) => r.status === "in_progress").length,
    not_started: champRows.filter((r) => r.status === "not_started").length,
    completed: champRows.filter((r) => r.status === "completed").length,
  };

  return (
    <Stack gap="lg">
      {/* Header banner */}
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
            <ThemeIcon size={52} radius="md" color="blue" variant="light">
              <IconTrophy size={28} />
            </ThemeIcon>
            <div>
              <Text size="xs" c="blue.3" tt="uppercase" fw={600} mb={2}>
                {activeOrg.name}
              </Text>
              <Title order={2} c="white" fw={700}>
                Championships
              </Title>
              <Text size="sm" c="blue.2" mt={2}>
                {champRows.length} championship{champRows.length !== 1 ? "s" : ""}
              </Text>
            </div>
          </Group>
          <Button
            variant="white"
            color="dark"
            leftSection={<IconPlus size={16} />}
            onClick={() => setShowCreate(true)}
          >
            New Championship
          </Button>
        </Group>
      </Box>

      {/* Status filter toolbar */}
      <Paper p="sm" style={{ background: "#13151b", border: "1px solid #1e2028" }}>
        <Group gap="xs" wrap="wrap">
          {(["all", "in_progress", "not_started", "completed"] as const).map((f) => {
            const labels: Record<string, string> = {
              all: "All",
              in_progress: "In Progress",
              not_started: "Not Started",
              completed: "Completed",
            };
            return (
              <Badge
                key={f}
                size="lg"
                variant={statusFilter === f ? "filled" : "light"}
                color={f === "all" ? "blue" : STATUS_COLOR[f as ChampStatus]}
                style={{ cursor: "pointer" }}
                onClick={() => setStatusFilter(f)}
              >
                {labels[f]} ({statusCounts[f]})
              </Badge>
            );
          })}
        </Group>
      </Paper>

      {/* Table */}
      {champRows.length === 0 ? (
        <Paper withBorder p="xl">
          <Stack align="center" gap="sm">
            <IconTrophy size={48} color="var(--mantine-color-dimmed)" />
            <Text c="dimmed" ta="center">
              No championships yet. Create one to get started.
            </Text>
          </Stack>
        </Paper>
      ) : (
        <Paper p="md" withBorder>
          <DataTable
            withTableBorder={false}
            withColumnBorders={false}
            highlightOnHover
            records={sortedRows}
            sortStatus={sortStatus}
            onSortStatusChange={setSortStatus}
            onRowClick={({ record }) =>
              navigate(`/championships/${record.championship.id}`)
            }
            columns={[
              {
                accessor: "color",
                title: "",
                width: 20,
                render: (r: ChampRow) => (
                  <Box
                    w={10}
                    h={10}
                    style={{ borderRadius: "50%", background: r.championship.color }}
                  />
                ),
              },
              {
                accessor: "name",
                title: "Name",
                sortable: true,
                render: (r: ChampRow) => (
                  <Text fw={500}>{r.championship.name}</Text>
                ),
              },
              {
                accessor: "status",
                title: "Status",
                sortable: true,
                render: (r: ChampRow) => (
                  <Badge color={STATUS_COLOR[r.status]} variant="light">
                    {STATUS_LABEL[r.status]}
                  </Badge>
                ),
              },
              {
                accessor: "eventCount",
                title: "Events",
                sortable: true,
                render: (r: ChampRow) => r.eventCount,
              },
              {
                accessor: "nextEvent",
                title: "Next Event",
                sortable: true,
                render: (r: ChampRow) =>
                  r.nextEvent ? (
                    <Stack gap={0}>
                      <Text size="sm">{r.nextEvent.name}</Text>
                      <Text size="xs" c="dimmed">
                        {r.nextEvent.startDate}
                      </Text>
                    </Stack>
                  ) : (
                    <Text c="dimmed">—</Text>
                  ),
              },
              {
                accessor: "startDate",
                title: "Start",
                sortable: true,
                render: (r: ChampRow) => r.startDate,
              },
              {
                accessor: "endDate",
                title: "End",
                sortable: true,
                render: (r: ChampRow) => r.endDate,
              },
              {
                accessor: "actions",
                title: "",
                width: 40,
                render: (r: ChampRow) => (
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
                        leftSection={<IconTrash size={14} />}
                        color="red"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(r.championship);
                        }}
                      >
                        Delete
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                ),
              },
            ]}
          />
        </Paper>
      )}

      {/* Create championship modal */}
      <Modal opened={showCreate} onClose={resetCreate} title="New Championship">
        <Stack gap="sm">
          {createError && (
            <Text size="sm" c="red">
              {createError}
            </Text>
          )}
          <TextInput
            label="Name *"
            placeholder="Championship name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            autoFocus
          />
          <TextInput
            label="Description"
            placeholder="Optional description"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <ColorInput label="Color" value={newColor} onChange={setNewColor} />
          <Group gap="xs" mt="xs">
            <Button onClick={handleCreate}>Create</Button>
            <Button variant="subtle" onClick={resetCreate}>
              Cancel
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
