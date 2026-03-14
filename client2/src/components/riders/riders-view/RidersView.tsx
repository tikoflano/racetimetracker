import { useState, useMemo, useEffect } from "react";
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
  Checkbox,
  ActionIcon,
  Menu,
  Badge,
  Select,
  RangeSlider,
  Avatar,
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
} from "@tabler/icons-react";
import {
  ViewHeader,
  FilterToolbar,
  DotsMenu,
  ModalHeader,
  modalHeaderStyles,
  ModalFooter,
  EmptyState,
  FormError,
} from "@/components/common";
import type { DotsMenuItem } from "@/components/common";
import { useTable, useReducer } from "spacetimedb/react";
import { tables, reducers } from "@/module_bindings";
import type { Rider, Organization } from "@/module_bindings/types";
import { getErrorMessage } from "@/utils";

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
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<bigint | null>(null);
  const riderForm = useForm({
    initialValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      dateOfBirth: "",
      sex: "male" as "male" | "female",
      profilePicture: "",
    },
    validate: {
      firstName: (v) => (!v?.trim() ? "First name is required" : null),
      lastName: (v) => (!v?.trim() ? "Last name is required" : null),
    },
  });

  const resetForm = () => {
    riderForm.reset();
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (r: Rider) => {
    riderForm.setValues({
      firstName: r.firstName,
      lastName: r.lastName,
      email: r.email,
      phone: r.phone,
      dateOfBirth: r.dateOfBirth,
      sex: (r.sex || "male") as "male" | "female",
      profilePicture: r.profilePicture || "",
    });
    riderForm.clearErrors();
    setEditingId(r.id);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!riderForm.validate()) return;
    try {
      if (editingId !== null) {
        await updateRider({
          riderId: editingId,
          firstName: riderForm.values.firstName.trim(),
          lastName: riderForm.values.lastName.trim(),
          email: riderForm.values.email.trim(),
          phone: riderForm.values.phone.trim(),
          dateOfBirth: riderForm.values.dateOfBirth,
          sex: riderForm.values.sex,
          profilePicture: riderForm.values.profilePicture,
        });
      } else {
        await createRider({
          orgId: activeOrgId!,
          firstName: riderForm.values.firstName.trim(),
          lastName: riderForm.values.lastName.trim(),
          email: riderForm.values.email.trim(),
          phone: riderForm.values.phone.trim(),
          dateOfBirth: riderForm.values.dateOfBirth,
          sex: riderForm.values.sex,
          profilePicture: riderForm.values.profilePicture,
        });
      }
      resetForm();
    } catch (e: unknown) {
      riderForm.setFieldError("firstName", getErrorMessage(e, "Failed to save rider"));
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

  const activeFilterCount = (sexFilter !== "all" ? 1 : 0) + (ageFiltered ? 1 : 0);

  if (!activeOrg) return null;

  return (
    <Stack gap="lg">
      {/* Header banner */}
      <ViewHeader
        icon={<IconUsers size={28} />}
        iconColor="blue"
        eyebrow={activeOrg.name}
        title="Riders"
        subtitle={`${orgRiders.length} rider${orgRiders.length !== 1 ? "s" : ""}${!isMobile ? ` · ${activeOrg.name}` : ""}`}
        isMobile={isMobile}
        actions={
          <>
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
                  onClick={() => { setEditingId(null); riderForm.reset(); setShowForm(true); }}
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
                      onClick={() => { setEditingId(null); riderForm.reset(); setShowForm(true); }}
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
          </>
        }
      />

      {/* Filter / search toolbar */}
      <FilterToolbar
        filterContent={
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
        }
        activeFilterCount={activeFilterCount}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name or email..."
        searchOpen={searchOpen}
        onSearchOpenChange={setSearchOpen}
        resultLabel={
          filteredRiders.length === orgRiders.length
            ? `${orgRiders.length} rider${orgRiders.length !== 1 ? "s" : ""}`
            : `${filteredRiders.length} of ${orgRiders.length}`
        }
      />

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
                  <DotsMenu
                    stopPropagation
                    items={[
                      { icon: <IconPencil size={14} />, label: "Edit", onClick: () => startEdit(r) },
                      { icon: <IconTrash size={14} />, label: "Delete", color: "red", onClick: () => handleDelete(r) },
                    ] satisfies DotsMenuItem[]}
                  />
                </Group>
              </Paper>
            );
          })}
        </Stack>
      ) : filteredRiders.length === 0 ? (
        <EmptyState
          icon={<IconUsers size={48} color="var(--mantine-color-dimmed)" />}
          message={
            hasActiveFilter
              ? "No riders match your filters."
              : "No riders yet. Add one or share the registration link."
          }
        />
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
                  <DotsMenu
                    stopPropagation
                    width={200}
                    items={[
                      { icon: <IconPencil size={14} />, label: "Edit", onClick: () => startEdit(r) },
                      { icon: <IconTrash size={14} />, label: "Delete", color: "red", onClick: () => handleDelete(r) },
                    ] satisfies DotsMenuItem[]}
                  />
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
          <ModalHeader
            icon={<IconUsers size={20} />}
            iconColor="blue"
            label={editingId !== null ? "Edit rider" : "Add rider"}
            title={editingId !== null ? "Edit Rider" : "New Rider"}
          />
        }
        centered
        radius="md"
        size="lg"
        overlayProps={{ blur: 3 }}
        styles={modalHeaderStyles()}
      >
        <Stack gap="sm" pt="xs">
          <FormError error={typeof riderForm.errors.firstName === "string" ? riderForm.errors.firstName : undefined} />
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
                  riderForm.setFieldValue("profilePicture", (ev.target?.result as string) ?? "");
                reader.readAsDataURL(file);
                e.target.value = "";
              }}
            />
            <Box style={{ position: "relative", display: "inline-block" }}>
              <Avatar
                src={riderForm.values.profilePicture || undefined}
                size={64}
                radius="xl"
                style={{
                  cursor: "pointer",
                  background: riderForm.values.profilePicture
                    ? undefined
                    : avatarColor(`${riderForm.values.firstName}${riderForm.values.lastName}`),
                }}
                onClick={() => document.getElementById("rider-photo-input")?.click()}
              >
                {!riderForm.values.profilePicture && (
                  <Text size="lg" fw={600} c="white">
                    {`${riderForm.values.firstName[0] ?? ""}${riderForm.values.lastName[0] ?? ""}`.toUpperCase() || "?"}
                  </Text>
                )}
              </Avatar>
              {riderForm.values.profilePicture && (
                <ActionIcon
                  size="sm"
                  radius="xl"
                  color="red"
                  variant="filled"
                  style={{ position: "absolute", top: 0, right: 0 }}
                  onClick={() => riderForm.setFieldValue("profilePicture", "")}
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
              {...riderForm.getInputProps("firstName")}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              autoFocus
            />
            <TextInput
              label="Last Name *"
              placeholder="Last name"
              {...riderForm.getInputProps("lastName")}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </Group>
          <Group grow>
            <TextInput
              label="Email"
              placeholder="email@example.com"
              type="email"
              {...riderForm.getInputProps("email")}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
            <TextInput
              label="Phone"
              placeholder="+1-555-0100"
              type="tel"
              {...riderForm.getInputProps("phone")}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </Group>
          <Group grow>
            <DatePickerInput
              label="Date of Birth"
              value={riderForm.values.dateOfBirth ? new Date(riderForm.values.dateOfBirth) : null}
              onChange={(d) =>
                riderForm.setFieldValue("dateOfBirth", d ? d.toISOString().slice(0, 10) : "")
              }
            />
            <Select
              label="Sex"
              {...riderForm.getInputProps("sex")}
              data={[
                { value: "male", label: "Male" },
                { value: "female", label: "Female" },
              ]}
            />
          </Group>
          <ModalFooter
            onCancel={resetForm}
            submitLabel={editingId !== null ? "Save" : "Add Rider"}
            onSubmit={handleSubmit}
          />
        </Stack>
      </Modal>

      {/* Registration link modal */}
      <Modal
        opened={showRegModal}
        onClose={() => setShowRegModal(false)}
        title={
          <ModalHeader
            icon={<IconShare size={20} />}
            iconColor="blue"
            label="Share"
            title="Registration link"
          />
        }
        centered
        radius="md"
        size="lg"
        overlayProps={{ blur: 3 }}
        styles={modalHeaderStyles()}
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
          <ModalFooter
            onCancel={() => setShowRegModal(false)}
            cancelLabel="Close"
            submitLabel="Copy link"
            onSubmit={() => navigator.clipboard.writeText(registrationUrl)}
            size="xs"
          />
        </Stack>
      </Modal>
    </Stack>
  );
}
