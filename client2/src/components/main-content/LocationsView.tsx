import { useState, useMemo } from "react";
import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Menu,
  Modal,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
  Table,
} from "@mantine/core";
import { DataTable, type DataTableSortStatus } from "mantine-datatable";
import {
  IconDotsVertical,
  IconPlus,
  IconTrash,
  IconSearch,
  IconMapPin,
  IconRoute,
  IconExternalLink,
} from "@tabler/icons-react";

// Types
interface Venue {
  id: bigint;
  name: string;
  description: string;
  address: string;
}

interface Track {
  id: bigint;
  venueId: bigint;
  name: string;
  color: string;
}

// Mock data
const MOCK_VENUES: Venue[] = [
  {
    id: 1n,
    name: "Mountain Ridge Park",
    description: "Premier enduro venue with varied terrain",
    address: "1234 Mountain Rd, Denver, CO 80210",
  },
  {
    id: 2n,
    name: "Desert Dunes Complex",
    description: "Sandy trails and technical sections",
    address: "5678 Desert Ave, Phoenix, AZ 85001",
  },
  {
    id: 3n,
    name: "Forest Trail Center",
    description: "Wooded single track paradise",
    address: "9012 Forest Lane, Portland, OR 97201",
  },
  {
    id: 4n,
    name: "Coastal Cliffs",
    description: "Ocean view trails with elevation changes",
    address: "3456 Coastal Hwy, San Diego, CA 92101",
  },
  {
    id: 5n,
    name: "Valley Motorsports Park",
    description: "",
    address: "",
  },
];

const MOCK_TRACKS: Track[] = [
  { id: 1n, venueId: 1n, name: "Summit Run", color: "#ef4444" },
  { id: 2n, venueId: 1n, name: "Ridge Line", color: "#22c55e" },
  { id: 3n, venueId: 1n, name: "Valley Drop", color: "#3b82f6" },
  { id: 4n, venueId: 2n, name: "Sand Storm", color: "#f59e0b" },
  { id: 5n, venueId: 2n, name: "Cactus Trail", color: "#8b5cf6" },
  { id: 6n, venueId: 3n, name: "Pine Loop", color: "#22c55e" },
  { id: 7n, venueId: 3n, name: "Oak Descent", color: "#ef4444" },
  { id: 8n, venueId: 3n, name: "Fern Gully", color: "#06b6d4" },
  { id: 9n, venueId: 3n, name: "Maple Ridge", color: "#ec4899" },
  { id: 10n, venueId: 4n, name: "Cliff Hanger", color: "#3b82f6" },
];

interface LocationsViewProps {
  onSelectLocation?: (venueId: bigint) => void;
}

export function LocationsView({ onSelectLocation }: LocationsViewProps) {
  const [venues, setVenues] = useState<Venue[]>(MOCK_VENUES);
  const [tracks] = useState<Track[]>(MOCK_TRACKS);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", address: "" });
  const [error, setError] = useState("");
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<Venue>>({
    columnAccessor: "name",
    direction: "asc",
  });

  // Track counts per venue
  const trackCounts = useMemo(() => {
    const m = new Map<bigint, number>();
    for (const t of tracks) {
      m.set(t.venueId, (m.get(t.venueId) ?? 0) + 1);
    }
    return m;
  }, [tracks]);

  // Filter and sort
  const filteredAndSortedVenues = useMemo(() => {
    let result = [...venues];
    
    // Filter by search
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(
        (v) =>
          v.name.toLowerCase().includes(s) ||
          v.description.toLowerCase().includes(s) ||
          v.address.toLowerCase().includes(s)
      );
    }

    // Sort
    const { columnAccessor, direction } = sortStatus;
    result.sort((a, b) => {
      let cmp = 0;
      if (columnAccessor === "name") {
        cmp = a.name.localeCompare(b.name);
      } else if (columnAccessor === "description") {
        cmp = a.description.localeCompare(b.description);
      } else if (columnAccessor === "tracks") {
        cmp = (trackCounts.get(a.id) ?? 0) - (trackCounts.get(b.id) ?? 0);
      } else if (columnAccessor === "address") {
        cmp = a.address.localeCompare(b.address);
      }
      return direction === "asc" ? cmp : -cmp;
    });

    return result;
  }, [venues, search, sortStatus, trackCounts]);

  const resetForm = () => {
    setForm({ name: "", description: "", address: "" });
    setError("");
    setShowForm(false);
  };

  const handleCreate = () => {
    setError("");
    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }
    const newVenue: Venue = {
      id: BigInt(Date.now()),
      name: form.name.trim(),
      description: form.description.trim(),
      address: form.address.trim(),
    };
    setVenues((prev) => [...prev, newVenue]);
    resetForm();
  };

  const handleDelete = (v: Venue) => {
    if (!confirm(`Delete "${v.name}" and all its tracks?`)) return;
    setVenues((prev) => prev.filter((venue) => venue.id !== v.id));
  };

  const handleRowClick = (venue: Venue) => {
    if (onSelectLocation) {
      onSelectLocation(venue.id);
    }
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start" wrap="wrap">
        <div>
          <Title order={2} fw={700}>
            Locations
          </Title>
          <Text size="sm" c="dimmed" mt={4}>
            Manage venues and tracks for your events
          </Text>
        </div>
        {!showForm && (
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => setShowForm(true)}
          >
            New Location
          </Button>
        )}
      </Group>

      {/* Create form */}
      {showForm && (
        <Paper withBorder p="md">
          <Text size="sm" fw={600} c="dimmed" tt="uppercase" mb="sm">
            New Location
          </Text>
          {error && (
            <Text size="sm" c="red" mb="sm">
              {error}
            </Text>
          )}
          <Stack gap="sm">
            <TextInput
              label="Name"
              placeholder="Location name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              autoFocus
            />
            <TextInput
              label="Description"
              placeholder="Description (optional)"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
            />
            <TextInput
              label="Address"
              placeholder="Address (optional)"
              value={form.address}
              onChange={(e) =>
                setForm((f) => ({ ...f, address: e.target.value }))
              }
            />
            <Group gap="xs">
              <Button size="sm" onClick={handleCreate}>
                Create
              </Button>
              <Button variant="subtle" size="sm" onClick={resetForm}>
                Cancel
              </Button>
            </Group>
          </Stack>
        </Paper>
      )}

      {/* Search */}
      <TextInput
        placeholder="Search locations..."
        value={search}
        onChange={(e) => setSearch(e.currentTarget.value)}
        leftSection={<IconSearch size={16} />}
        style={{ maxWidth: 300 }}
      />

      {/* Table */}
      {filteredAndSortedVenues.length === 0 && !showForm ? (
        <Paper withBorder p="xl">
          <Stack align="center" gap="sm">
            <IconMapPin size={48} color="var(--mantine-color-dimmed)" />
            <Text c="dimmed" ta="center">
              No locations yet. Create one to get started.
            </Text>
          </Stack>
        </Paper>
      ) : (
        <Paper withBorder p="md">
          <DataTable<Venue>
            withTableBorder={false}
            withColumnBorders={false}
            highlightOnHover
            minHeight={150}
            records={filteredAndSortedVenues}
            sortStatus={sortStatus}
            onSortStatusChange={setSortStatus}
            noRecordsText="No locations match your search."
            onRowClick={({ record }) => handleRowClick(record)}
            rowStyle={() => ({ cursor: "pointer" })}
            columns={[
              {
                accessor: "name",
                title: "Name",
                sortable: true,
                render: (row) => (
                  <Group gap="xs">
                    <IconMapPin size={16} color="var(--mantine-color-blue-6)" />
                    <Text fw={500}>{row.name}</Text>
                  </Group>
                ),
              },
              {
                accessor: "description",
                title: "Description",
                sortable: true,
                render: (row) => (
                  <Text size="sm" c="dimmed">
                    {row.description || "—"}
                  </Text>
                ),
              },
              {
                accessor: "tracks",
                title: "Tracks",
                sortable: true,
                render: (row) => {
                  const count = trackCounts.get(row.id) ?? 0;
                  return (
                    <Badge
                      size="sm"
                      variant="light"
                      color={count > 0 ? "blue" : "gray"}
                      leftSection={<IconRoute size={12} />}
                    >
                      {count}
                    </Badge>
                  );
                },
              },
              {
                accessor: "address",
                title: "Address",
                sortable: true,
                render: (row) =>
                  row.address ? (
                    <Text
                      component="a"
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(row.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      c="blue"
                      size="sm"
                      onClick={(e) => e.stopPropagation()}
                      style={{ display: "flex", alignItems: "center", gap: 4 }}
                    >
                      {row.address}
                      <IconExternalLink size={12} />
                    </Text>
                  ) : (
                    <Text size="sm" c="dimmed">
                      —
                    </Text>
                  ),
              },
              {
                accessor: "actions",
                title: "",
                width: 40,
                render: (row) => (
                  <Menu shadow="md" width={180} position="bottom-end">
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
                        onClick={() => handleDelete(row)}
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
    </Stack>
  );
}
