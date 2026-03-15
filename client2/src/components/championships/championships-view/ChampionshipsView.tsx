import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "@mantine/form";
import {
  Box,
  Group,
  Stack,
  Text,
  Paper,
  Button,
  TextInput,
  Select,
  Modal,
  Badge,
  ActionIcon,
  Menu,
} from "@mantine/core";
import { ColorInput } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { DataTable, type DataTableSortStatus } from "mantine-datatable";
import {
  IconTrophy,
  IconPlus,
  IconDotsVertical,
  IconTrash,
  IconArrowUp,
  IconArrowDown,
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
import type { Championship, Event, Organization } from "@/module_bindings/types";
import { useActiveOrgFromOrgs } from "@/providers/OrgProvider";
import { getErrorMessage } from "@/utils";

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
  const isMobile = useMediaQuery("(max-width: 768px)");

  const [orgs] = useTable(tables.organization);
  const [allChampionships] = useTable(tables.championship);
  const [allEvents] = useTable(tables.event);

  const createChampionship = useReducer(reducers.createChampionship);
  const deleteChampionship = useReducer(reducers.deleteChampionship);

  const activeOrg = useActiveOrgFromOrgs(orgs);
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
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<ChampRow>>({
    columnAccessor: "name",
    direction: "asc",
  });

  const filteredRows = useMemo<ChampRow[]>(() => {
    let rows =
      statusFilter === "all" ? champRows : champRows.filter((r) => r.status === statusFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((r) => r.championship.name.toLowerCase().includes(q));
    }
    return rows;
  }, [champRows, statusFilter, search]);

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
  const createChampForm = useForm({
    initialValues: { name: "", description: "", color: "#3b82f6" },
    validate: {
      name: (v) => (!v?.trim() ? "Name is required" : null),
    },
  });

  const resetCreate = () => {
    createChampForm.reset();
    setShowCreate(false);
  };

  const handleCreate = async () => {
    if (!createChampForm.validate()) return;
    try {
      await createChampionship({
        orgId: activeOrgId!,
        name: createChampForm.values.name.trim(),
        description: createChampForm.values.description.trim(),
        color: createChampForm.values.color,
      });
      resetCreate();
    } catch (e: unknown) {
      createChampForm.setFieldError("name", getErrorMessage(e, "Failed to create championship"));
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

  const sortOptions = [
    { value: "name", label: "Name" },
    { value: "startDate", label: "Start Date" },
    { value: "endDate", label: "End Date" },
    { value: "status", label: "Status" },
    { value: "eventCount", label: "Events" },
    { value: "nextEvent", label: "Next Event" },
  ];

  const filterBadges = (["all", "in_progress", "not_started", "completed"] as const).map((f) => {
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
  });

  return (
    <Stack gap="lg">
      {/* Header banner */}
      <ViewHeader
        icon={<IconTrophy size={28} />}
        iconColor="blue"
        eyebrow={activeOrg.name}
        title="Championships"
        subtitle={`${champRows.length} championship${champRows.length !== 1 ? "s" : ""}`}
        isMobile={isMobile}
        actions={
          <>
            {!isMobile ? (
              <Button
                variant="white"
                color="dark"
                leftSection={<IconPlus size={16} />}
                onClick={() => setShowCreate(true)}
              >
                New Championship
              </Button>
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
                  <Menu.Item
                    leftSection={<IconPlus size={14} />}
                    onClick={() => setShowCreate(true)}
                  >
                    New Championship
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            )}
          </>
        }
      />

      {/* Filter + search toolbar */}
      <FilterToolbar
        filterContent={
          <Stack gap="xs">
            <Text size="xs" c="dimmed" fw={600} tt="uppercase">Filter</Text>
            {filterBadges}
            <Text size="xs" c="dimmed" fw={600} tt="uppercase" mt={4}>Sort</Text>
            <Group gap="xs">
              <Select
                size="xs"
                data={sortOptions}
                value={sortStatus.columnAccessor}
                onChange={(v) =>
                  v && setSortStatus((s) => ({ ...s, columnAccessor: v }))
                }
                allowDeselect={false}
                style={{ flex: 1 }}
              />
              <ActionIcon
                variant="subtle"
                color="gray"
                size="sm"
                onClick={() =>
                  setSortStatus((s) => ({
                    ...s,
                    direction: s.direction === "asc" ? "desc" : "asc",
                  }))
                }
              >
                {sortStatus.direction === "asc" ? (
                  <IconArrowUp size={14} />
                ) : (
                  <IconArrowDown size={14} />
                )}
              </ActionIcon>
            </Group>
          </Stack>
        }
        activeFilterCount={statusFilter !== "all" ? 1 : 0}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search championships..."
        searchOpen={showSearch}
        onSearchOpenChange={(open) => { setShowSearch(open); if (!open) setSearch(""); }}
        resultLabel={`${filteredRows.length} result${filteredRows.length !== 1 ? "s" : ""}`}
      />

      {/* Content */}
      {champRows.length === 0 ? (
        <EmptyState
          icon={<IconTrophy size={48} color="var(--mantine-color-dimmed)" />}
          message="No championships yet. Create one to get started."
        />
      ) : isMobile ? (
        /* Mobile card list */
        <Stack gap="sm">
          {sortedRows.map((r) => (
            <Paper
              key={r.championship.id.toString()}
              p="md"
              withBorder
              style={{ cursor: "pointer", position: "relative" }}
              onClick={() => navigate(`/championships/${r.championship.id}`)}
            >
              <Group gap="xs" align="center" mb={6} style={{ paddingRight: 32 }}>
                <ColorDot color={r.championship.color} />
                <Text fw={600} style={{ flex: 1, minWidth: 0 }} lineClamp={1}>
                  {r.championship.name}
                </Text>
                <Badge color={STATUS_COLOR[r.status]} variant="light" size="sm">
                  {STATUS_LABEL[r.status]}
                </Badge>
              </Group>
              <Group gap="xs">
                <Text size="xs" c="dimmed">
                  {r.eventCount} event{r.eventCount !== 1 ? "s" : ""}
                </Text>
                {r.startDate !== "—" && (
                  <Text size="xs" c="dimmed">
                    · {r.startDate} – {r.endDate}
                  </Text>
                )}
              </Group>
              {r.nextEvent && (
                <Text size="xs" c="blue.3" mt={4}>
                  Next: {r.nextEvent.name} ({r.nextEvent.startDate})
                </Text>
              )}
              <Box
                style={{ position: "absolute", top: 8, right: 8 }}
                onClick={(e) => e.stopPropagation()}
              >
                <DotsMenu
                  width={180}
                  items={[
                    {
                      icon: <IconTrash size={14} />,
                      label: "Delete",
                      color: "red",
                      onClick: () => handleDelete(r.championship),
                    },
                  ] satisfies DotsMenuItem[]}
                />
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
                render: (r: ChampRow) => <ColorDot color={r.championship.color} />,
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
                  <DotsMenu
                    stopPropagation
                    width={200}
                    items={[
                      {
                        icon: <IconTrash size={14} />,
                        label: "Delete",
                        color: "red",
                        onClick: () => handleDelete(r.championship),
                      },
                    ] satisfies DotsMenuItem[]}
                  />
                ),
              },
            ]}
          />
        </Paper>
      )}

      {/* Create championship modal */}
      <Modal
        opened={showCreate}
        onClose={resetCreate}
        title={
          <ModalHeader
            icon={<IconTrophy size={20} />}
            iconColor="blue"
            label="Championship"
            title="New Championship"
          />
        }
        centered
        radius="md"
        size="lg"
        overlayProps={{ blur: 3 }}
        styles={modalHeaderStyles()}
      >
        <Stack gap="sm" pt="xs">
          <FormError error={typeof createChampForm.errors.name === "string" ? createChampForm.errors.name : undefined} />
          <TextInput
            label="Name *"
            placeholder="Championship name"
            {...createChampForm.getInputProps("name")}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            autoFocus
          />
          <TextInput
            label="Description"
            placeholder="Optional description"
            {...createChampForm.getInputProps("description")}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <ColorInput label="Color" {...createChampForm.getInputProps("color")} />
          <ModalFooter
            onCancel={resetCreate}
            submitLabel="Create"
            onSubmit={handleCreate}
          />
        </Stack>
      </Modal>
    </Stack>
  );
}


