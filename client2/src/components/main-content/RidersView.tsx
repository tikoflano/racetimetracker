import { useState, useMemo, useEffect } from "react";
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
  Checkbox,
  ActionIcon,
  Menu,
  Badge,
  Select,
  RangeSlider,
  Avatar,
  Popover,
  Indicator,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { useMediaQuery } from "@mantine/hooks";
import { DataTable, type DataTableSortStatus } from "mantine-datatable";
import {
  IconUsers,
  IconPlus,
  IconDotsVertical,
  IconPencil,
  IconTrash,
  IconShare,
  IconSearch,
  IconX,
  IconFilter,
} from "@tabler/icons-react";
import { useTable, useReducer } from "spacetimedb/react";
import { tables, reducers } from "@/module_bindings";
import type { Rider, Organization } from "@/module_bindings/types";

function getErrorMessage(e: unknown, fallback: string): string {
  if (e instanceof Error) return e.message || fallback;
  if (typeof e === "string") return e;
  return fallback;
}

function calcAge(dateOfBirth: string): number | null {
  if (!dateOfBirth) return null;
  const today = new Date();
  const dob = new Date(dateOfBirth);
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
type SexFilter = "all" | "male" | "female";

const AVATAR_COLORS = [
  "#3b82f6", "#ef4444", "#22c55e", "#eab308", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#06b6d4", "#a855f7",
];

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function RiderAvatar({ rider, size = 28 }: { rider: Rider; size?: number }) {
  const initials = `${rider.firstName[0] ?? ""}${rider.lastName[0] ?? ""}`.toUpperCase();
  if (rider.profilePicture) {
    return (
      <Avatar src={rider.profilePicture} size={size} radius="xl" />
    );
  }
  return (
    <Avatar size={size} radius="xl" style={{ background: avatarColor(`${rider.firstName}${rider.lastName}`) }}>
      <Text size="xs" fw={600} c="white" style={{ lineHeight: 1 }}>
        {initials}
      </Text>
    </Avatar>
  );
}

export function RidersView() {
  const [orgs] = useTable(tables.organization);
  const [allRiders] = useTable(tables.rider);

  const createRider = useReducer(reducers.createRider);
  const updateRider = useReducer(reducers.updateRider);
  const deleteRider = useReducer(reducers.deleteRider);
  const setRegistrationEnabled = useReducer(reducers.setRegistrationEnabled);

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

  const orgRiders = useMemo<Rider[]>(() => {
    if (!activeOrgId) return [];
    return (allRiders as Rider[]).filter((r) => r.orgId === activeOrgId);
  }, [allRiders, activeOrgId]);

  // Compute age range from riders with known DOB
  const [ageRangeMin, ageRangeMax] = useMemo<[number, number]>(() => {
    const ages = orgRiders
      .map((r: Rider) => calcAge(r.dateOfBirth))
      .filter((a): a is number => a !== null);
    if (ages.length === 0) return [0, 100];
    return [Math.min(...ages), Math.max(...ages)];
  }, [orgRiders]);

  // Sort
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<Rider>>({
    columnAccessor: "name",
    direction: "asc",
  });

  // Filters
  const [search, setSearch] = useState("");
  const [sexFilter, setSexFilter] = useState<SexFilter>("all");
  const [ageRange, setAgeRange] = useState<[number, number] | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    try {
      const stored = localStorage.getItem("rtt-riders-page-size");
      if (stored) {
        const n = parseInt(stored, 10);
        if (PAGE_SIZE_OPTIONS.includes(n)) return n;
      }
    } catch {}
    return 10;
  });

  // Reset slider when data-driven bounds change
  useEffect(() => {
    setAgeRange(null);
  }, [ageRangeMin, ageRangeMax]);

  const sliderValue: [number, number] = ageRange ?? [ageRangeMin, ageRangeMax];
  const ageFiltered =
    ageRange !== null &&
    (ageRange[0] !== ageRangeMin || ageRange[1] !== ageRangeMax);

  const filteredRiders = useMemo<Rider[]>(() => {
    let list = orgRiders;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r: Rider) =>
          `${r.firstName} ${r.lastName}`.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q)
      );
    }
    if (sexFilter !== "all") {
      list = list.filter((r: Rider) => r.sex === sexFilter);
    }
    if (ageFiltered && ageRange) {
      list = list.filter((r: Rider) => {
        const age = calcAge(r.dateOfBirth);
        if (age === null) return false;
        return age >= ageRange[0] && age <= ageRange[1];
      });
    }
    const dir = sortStatus.direction === "asc" ? 1 : -1;
    list = [...list].sort((a, b) => {
      switch (sortStatus.columnAccessor) {
        case "name":
          return dir * `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`);
        case "email":
          return dir * a.email.localeCompare(b.email);
        case "phone":
          return dir * a.phone.localeCompare(b.phone);
        case "sex":
          return dir * (a.sex || "").localeCompare(b.sex || "");
        case "age": {
          const aa = calcAge(a.dateOfBirth) ?? -1;
          const ba = calcAge(b.dateOfBirth) ?? -1;
          return dir * (aa - ba);
        }
        default:
          return 0;
      }
    });
    return list;
  }, [orgRiders, search, sexFilter, ageFiltered, ageRange, sortStatus]);

  const hasActiveFilter = search || sexFilter !== "all" || ageFiltered;

  useEffect(() => {
    setPage(1);
  }, [search, sexFilter, ageFiltered, ageRange, pageSize]);

  // Create / edit modal
  const emptyForm = { firstName: "", lastName: "", email: "", phone: "", dateOfBirth: "", sex: "male", profilePicture: "" };
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<bigint | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");

  const resetForm = () => {
    setForm(emptyForm);
    setFormError("");
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (r: Rider) => {
    setForm({
      firstName: r.firstName,
      lastName: r.lastName,
      email: r.email,
      phone: r.phone,
      dateOfBirth: r.dateOfBirth,
      sex: r.sex || "male",
      profilePicture: r.profilePicture || "",
    });
    setEditingId(r.id);
    setFormError("");
    setShowForm(true);
  };

  const handleSubmit = async () => {
    setFormError("");
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setFormError("First and last name are required");
      return;
    }
    try {
      if (editingId !== null) {
        await updateRider({
          riderId: editingId,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          dateOfBirth: form.dateOfBirth,
          sex: form.sex,
          profilePicture: form.profilePicture,
        });
      } else {
        await createRider({
          orgId: activeOrgId!,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          dateOfBirth: form.dateOfBirth,
          sex: form.sex,
          profilePicture: form.profilePicture,
        });
      }
      resetForm();
    } catch (e: unknown) {
      setFormError(getErrorMessage(e, "Failed to save rider"));
    }
  };

  const handleDelete = async (r: Rider) => {
    if (!confirm(`Remove ${r.firstName} ${r.lastName}?`)) return;
    try {
      await deleteRider({ riderId: r.id });
    } catch (e: unknown) {
      console.error(getErrorMessage(e, "Failed to delete rider"));
    }
  };

  // Registration link modal
  const [showRegModal, setShowRegModal] = useState(false);
  const registrationUrl = activeOrg
    ? `${window.location.origin}/register/${activeOrg.slug}`
    : "";

  const isMobile = useMediaQuery("(max-width: 768px)");
  const [searchOpen, setSearchOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const activeFilterCount = (sexFilter !== "all" ? 1 : 0) + (ageFiltered ? 1 : 0);

  if (!activeOrg) return null;

  return (
    <Stack gap="lg">
      {/* Header banner */}
      <Box
        p={isMobile ? "md" : "xl"}
        style={{
          background: "linear-gradient(135deg, #1C2348 0%, #2A3364 60%, #313B72 100%)",
          borderRadius: "var(--mantine-radius-md)",
          border: "1px solid #1e2028",
        }}
      >
        <Group justify="space-between" align="center" wrap="nowrap" gap="sm">
          <Group gap="sm" align="center" style={{ minWidth: 0 }}>
            {!isMobile && (
              <ThemeIcon size={52} radius="md" color="blue" variant="light">
                <IconUsers size={28} />
              </ThemeIcon>
            )}
            <div style={{ minWidth: 0 }}>
              {!isMobile && (
                <Text size="xs" c="blue.3" tt="uppercase" fw={600} mb={2}>
                  {activeOrg.name}
                </Text>
              )}
              <Title order={isMobile ? 4 : 2} c="white" fw={700} style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                Riders
              </Title>
              <Text size={isMobile ? "xs" : "sm"} c="blue.2" mt={2}>
                {orgRiders.length} rider{orgRiders.length !== 1 ? "s" : ""}
                {!isMobile && ` · ${activeOrg.name}`}
              </Text>
            </div>
          </Group>
          <Group gap="sm" style={{ flexShrink: 0 }}>
            {!isMobile && (
              <>
                <Button
                  variant="subtle"
                  color="gray"
                  leftSection={<IconShare size={16} />}
                  onClick={() => setShowRegModal(true)}
                >
                  Registration link
                </Button>
                <Button
                  variant="white"
                  color="dark"
                  leftSection={<IconPlus size={16} />}
                  onClick={() => { setEditingId(null); setForm(emptyForm); setFormError(""); setShowForm(true); }}
                >
                  Add Rider
                </Button>
              </>
            )}
            <Menu shadow="md" width={200} position="bottom-end">
              <Menu.Target>
                <ActionIcon variant="subtle" size="lg" color="gray">
                  <IconDotsVertical size={18} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                {isMobile && (
                  <>
                    <Menu.Item
                      leftSection={<IconPlus size={14} />}
                      onClick={() => { setEditingId(null); setForm(emptyForm); setFormError(""); setShowForm(true); }}
                    >
                      Add Rider
                    </Menu.Item>
                    <Menu.Item
                      leftSection={<IconShare size={14} />}
                      onClick={() => setShowRegModal(true)}
                    >
                      Registration link
                    </Menu.Item>
                    <Menu.Divider />
                  </>
                )}
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </Box>

      {/* Filter / search toolbar */}
      <Paper p="sm" style={{ background: "#13151b", border: "1px solid #1e2028" }}>
        <Group justify="space-between" align="center" gap="sm">
          <Group gap="sm" align="center">
            <Popover
              opened={filterOpen}
              onChange={setFilterOpen}
              position="bottom-start"
              shadow="md"
              withinPortal
            >
              <Popover.Target>
                <Indicator
                  disabled={activeFilterCount === 0}
                  label={activeFilterCount}
                  size={16}
                  color="blue"
                >
                  <ActionIcon
                    variant={activeFilterCount > 0 ? "filled" : "subtle"}
                    color={activeFilterCount > 0 ? "blue" : "gray"}
                    size="md"
                    onClick={() => setFilterOpen((o) => !o)}
                    aria-label="Filter riders"
                  >
                    <IconFilter size={16} />
                  </ActionIcon>
                </Indicator>
              </Popover.Target>
              <Popover.Dropdown p="sm">
                <Stack gap="xs">
                  <Badge
                    size="lg"
                    variant={sexFilter === "male" ? "filled" : "light"}
                    color="blue"
                    style={{ cursor: "pointer" }}
                    onClick={() => setSexFilter(sexFilter === "male" ? "all" : "male")}
                  >
                    Male ({orgRiders.filter((r) => r.sex === "male").length})
                  </Badge>
                  <Badge
                    size="lg"
                    variant={sexFilter === "female" ? "filled" : "light"}
                    color="pink"
                    style={{ cursor: "pointer" }}
                    onClick={() => setSexFilter(sexFilter === "female" ? "all" : "female")}
                  >
                    Female ({orgRiders.filter((r) => r.sex === "female").length})
                  </Badge>
                  {ageRangeMin < ageRangeMax && (
                    <Group align="center" gap="xs" mt={4}>
                      <Text size="xs" c="dimmed" style={{ whiteSpace: "nowrap" }}>Age</Text>
                      <Text size="xs" c="dimmed" w={20} ta="right">{sliderValue[0]}</Text>
                      <RangeSlider
                        w={140}
                        min={ageRangeMin}
                        max={ageRangeMax}
                        minRange={0}
                        value={sliderValue}
                        onChange={(v) =>
                          setAgeRange(v[0] === ageRangeMin && v[1] === ageRangeMax ? null : v)
                        }
                        label={null}
                        size="sm"
                      />
                      <Text size="xs" c="dimmed" w={20}>{sliderValue[1]}</Text>
                    </Group>
                  )}
                  {activeFilterCount > 0 && (
                    <Button
                      variant="subtle"
                      size="xs"
                      mt="xs"
                      fullWidth
                      onClick={() => { setSexFilter("all"); setAgeRange(null); }}
                    >
                      Clear filters
                    </Button>
                  )}
                </Stack>
              </Popover.Dropdown>
            </Popover>
            <Text size="xs" c="dimmed">
              {filteredRiders.length === orgRiders.length
                ? `${orgRiders.length} rider${orgRiders.length !== 1 ? "s" : ""}`
                : `${filteredRiders.length} of ${orgRiders.length}`}
            </Text>
          </Group>
          {searchOpen ? (
            <TextInput
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              size="sm"
              leftSection={<IconSearch size={14} />}
              rightSection={
                <ActionIcon variant="subtle" size="sm" color="gray" onClick={() => { setSearchOpen(false); setSearch(""); }}>
                  <IconX size={12} />
                </ActionIcon>
              }
              autoFocus
              style={{ flex: 1, minWidth: 0 }}
            />
          ) : (
            <ActionIcon
              variant={search ? "filled" : "subtle"}
              color={search ? "blue" : "gray"}
              size="md"
              onClick={() => setSearchOpen(true)}
              aria-label="Search riders"
            >
              <IconSearch size={16} />
            </ActionIcon>
          )}
        </Group>
      </Paper>

      {/* Riders — card list on mobile, table on desktop */}
      {isMobile ? (
        <Stack gap="xs">
          {filteredRiders.length === 0 && (
            <Paper p="sm" withBorder>
              <Text size="sm" c="dimmed" ta="center">
                {hasActiveFilter
                  ? "No riders match your filters."
                  : "No riders yet. Add one or share the registration link."}
              </Text>
            </Paper>
          )}
          {filteredRiders.map((r) => {
            const age = calcAge(r.dateOfBirth);
            return (
              <Paper key={String(r.id)} p="sm" withBorder>
                <Group justify="space-between" align="flex-start" wrap="nowrap">
                  <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                    <RiderAvatar rider={r} size={36} />
                    <div style={{ minWidth: 0 }}>
                      <Text size="sm" fw={600} style={{ lineHeight: 1.3 }}>
                        {r.firstName} {r.lastName}
                      </Text>
                      {r.email && (
                        <Text size="xs" c="dimmed" truncate style={{ lineHeight: 1.3 }}>
                          {r.email}
                        </Text>
                      )}
                      {r.phone && (
                        <Text size="xs" c="dimmed" style={{ lineHeight: 1.3 }}>
                          {r.phone}
                        </Text>
                      )}
                      <Group gap="xs" mt={4}>
                        {r.sex && (
                          <Badge size="xs" variant="light" color={r.sex === "female" ? "pink" : "blue"}>
                            {r.sex === "male" ? "Male" : "Female"}
                          </Badge>
                        )}
                        {age !== null && (
                          <Text size="xs" c="dimmed">Age {age}</Text>
                        )}
                      </Group>
                    </div>
                  </Group>
                  <Menu shadow="md" width={160} position="bottom-end">
                    <Menu.Target>
                      <ActionIcon variant="subtle" size="sm" color="gray" onClick={(e) => e.stopPropagation()}>
                        <IconDotsVertical size={14} />
                      </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item leftSection={<IconPencil size={14} />} onClick={() => startEdit(r)}>
                        Edit
                      </Menu.Item>
                      <Menu.Item leftSection={<IconTrash size={14} />} color="red" onClick={() => handleDelete(r)}>
                        Delete
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </Group>
              </Paper>
            );
          })}
        </Stack>
      ) : filteredRiders.length === 0 ? (
        <Paper withBorder p="xl">
          <Stack align="center" gap="sm">
            <IconUsers size={48} color="var(--mantine-color-dimmed)" />
            <Text c="dimmed" ta="center">
              {hasActiveFilter
                ? "No riders match your filters."
                : "No riders yet. Add one or share the registration link."}
            </Text>
          </Stack>
        </Paper>
      ) : (
        <Paper p="md" withBorder>
          <DataTable
            withTableBorder={false}
            withColumnBorders={false}
            highlightOnHover
            records={filteredRiders}
            totalRecords={filteredRiders.length}
            recordsPerPage={pageSize}
            page={page}
            onPageChange={setPage}
            recordsPerPageOptions={PAGE_SIZE_OPTIONS}
            onRecordsPerPageChange={(n) => {
              setPageSize(n);
              try { localStorage.setItem("rtt-riders-page-size", String(n)); } catch {}
            }}
            sortStatus={sortStatus}
            onSortStatusChange={(s) => { setSortStatus(s); setPage(1); }}
            columns={[
              {
                accessor: "avatar",
                title: "",
                width: 44,
                render: (r: Rider) => <RiderAvatar rider={r} size={28} />,
              },
              {
                accessor: "name",
                title: "Name",
                sortable: true,
                render: (r: Rider) => `${r.firstName} ${r.lastName}`,
              },
              {
                accessor: "email",
                title: "Email",
                sortable: true,
                render: (r: Rider) => (
                  <Text size="sm" c={r.email ? undefined : "dimmed"}>
                    {r.email || "—"}
                  </Text>
                ),
              },
              {
                accessor: "phone",
                title: "Phone",
                sortable: true,
                render: (r: Rider) => (
                  <Text size="sm" c={r.phone ? undefined : "dimmed"}>
                    {r.phone || "—"}
                  </Text>
                ),
              },
              {
                accessor: "sex",
                title: "Sex",
                sortable: true,
                render: (r: Rider) => (
                  <Text size="sm" c={r.sex ? undefined : "dimmed"}>
                    {r.sex === "male" ? "Male" : r.sex === "female" ? "Female" : "—"}
                  </Text>
                ),
              },
              {
                accessor: "age",
                title: "Age",
                sortable: true,
                render: (r: Rider) => {
                  const age = calcAge(r.dateOfBirth);
                  return (
                    <Text size="sm" c={age !== null ? undefined : "dimmed"}>
                      {age !== null ? age : "—"}
                    </Text>
                  );
                },
              },
              {
                accessor: "actions",
                title: "",
                width: 40,
                render: (r: Rider) => (
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
                        onClick={() => startEdit(r)}
                      >
                        Edit
                      </Menu.Item>
                      <Menu.Item
                        leftSection={<IconTrash size={14} />}
                        color="red"
                        onClick={() => handleDelete(r)}
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

      {/* Create / edit modal */}
      <Modal
        opened={showForm}
        onClose={resetForm}
        title={
          <Group gap="sm">
            <ThemeIcon size={36} radius="md" color="blue" variant="light">
              <IconUsers size={20} />
            </ThemeIcon>
            <div>
              <Text size="xs" c="blue.4" tt="uppercase" fw={600} lh={1}>
                {editingId !== null ? "Edit rider" : "Add rider"}
              </Text>
              <Text fw={700} size="lg" lh={1.3}>
                {editingId !== null ? "Edit Rider" : "New Rider"}
              </Text>
            </div>
          </Group>
        }
        centered
        radius="md"
        size="lg"
        overlayProps={{ blur: 3 }}
        styles={{
          header: {
            background: "linear-gradient(135deg, #1C2348 0%, #2A3364 60%, #313B72 100%)",
            borderBottom: "1px solid #1e2028",
          },
          close: { color: "white" },
        }}
      >
        <Stack gap="sm" pt="xs">
          {formError && (
            <Text size="sm" c="red">
              {formError}
            </Text>
          )}
          <Group justify="center">
            <input
              id="rider-photo-input"
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) =>
                  setForm((f) => ({ ...f, profilePicture: ev.target?.result as string ?? "" }));
                reader.readAsDataURL(file);
                e.target.value = "";
              }}
            />
            <Box style={{ position: "relative", display: "inline-block" }}>
              <Avatar
                src={form.profilePicture || undefined}
                size={64}
                radius="xl"
                style={{
                  cursor: "pointer",
                  background: form.profilePicture
                    ? undefined
                    : avatarColor(`${form.firstName}${form.lastName}`),
                }}
                onClick={() => document.getElementById("rider-photo-input")?.click()}
              >
                {!form.profilePicture && (
                  <Text size="lg" fw={600} c="white">
                    {`${form.firstName[0] ?? ""}${form.lastName[0] ?? ""}`.toUpperCase() || "?"}
                  </Text>
                )}
              </Avatar>
              {form.profilePicture && (
                <ActionIcon
                  size="sm"
                  radius="xl"
                  color="red"
                  variant="filled"
                  style={{ position: "absolute", top: 0, right: 0 }}
                  onClick={() => setForm((f) => ({ ...f, profilePicture: "" }))}
                >
                  ×
                </ActionIcon>
              )}
            </Box>
          </Group>
          <Group grow>
            <TextInput
              label="First Name *"
              placeholder="First name"
              value={form.firstName}
              onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              autoFocus
            />
            <TextInput
              label="Last Name *"
              placeholder="Last name"
              value={form.lastName}
              onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </Group>
          <Group grow>
            <TextInput
              label="Email"
              placeholder="email@example.com"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
            <TextInput
              label="Phone"
              placeholder="+1-555-0100"
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </Group>
          <Group grow>
            <DatePickerInput
              label="Date of Birth"
              value={form.dateOfBirth ? new Date(form.dateOfBirth) : null}
              onChange={(d) =>
                setForm((f) => ({
                  ...f,
                  dateOfBirth: d ? d.toISOString().slice(0, 10) : "",
                }))
              }
            />
            <Select
              label="Sex"
              value={form.sex}
              onChange={(v) => setForm((f) => ({ ...f, sex: v ?? "male" }))}
              data={[
                { value: "male", label: "Male" },
                { value: "female", label: "Female" },
              ]}
            />
          </Group>
          <Group gap="xs" justify="flex-end" mt="xs">
            <Button variant="subtle" onClick={resetForm}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingId !== null ? "Save" : "Add Rider"}
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Registration link modal */}
      <Modal
        opened={showRegModal}
        onClose={() => setShowRegModal(false)}
        title={
          <Group gap="sm">
            <ThemeIcon size={36} radius="md" color="blue" variant="light">
              <IconShare size={20} />
            </ThemeIcon>
            <div>
              <Text size="xs" c="blue.4" tt="uppercase" fw={600} lh={1}>
                Share
              </Text>
              <Text fw={700} size="lg" lh={1.3}>
                Registration link
              </Text>
            </div>
          </Group>
        }
        centered
        radius="md"
        size="lg"
        overlayProps={{ blur: 3 }}
        styles={{
          header: {
            background: "linear-gradient(135deg, #1C2348 0%, #2A3364 60%, #313B72 100%)",
            borderBottom: "1px solid #1e2028",
          },
          close: { color: "white" },
        }}
      >
        <Stack gap="md" pt="xs">
          <Checkbox
            label="Allow new riders to register"
            checked={activeOrg.registrationEnabled !== false}
            onChange={(e) => {
              setRegistrationEnabled({ orgId: activeOrgId!, enabled: e.target.checked });
            }}
          />
          {activeOrg.registrationEnabled === false && (
            <Text size="sm" c="dimmed">
              The link is disabled. Visitors will see a "Registration Closed" message.
            </Text>
          )}
          <Text size="sm" style={{ wordBreak: "break-all" }}>
            <Text
              component="a"
              href={registrationUrl}
              target="_blank"
              rel="noopener noreferrer"
              c="blue"
            >
              {registrationUrl}
            </Text>
          </Text>
          <Group justify="flex-end" gap="xs">
            <Button
              variant="subtle"
              size="xs"
              onClick={() => setShowRegModal(false)}
            >
              Close
            </Button>
            <Button size="xs" onClick={() => navigator.clipboard.writeText(registrationUrl)}>
              Copy link
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
