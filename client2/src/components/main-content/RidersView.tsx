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
  NumberInput,
  Modal,
  Checkbox,
  ActionIcon,
  Menu,
  Badge,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { DataTable } from "mantine-datatable";
import {
  IconUsers,
  IconPlus,
  IconDotsVertical,
  IconPencil,
  IconTrash,
  IconShare,
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
    return [...allRiders.filter((r: Rider) => r.orgId === activeOrgId)].sort(
      (a: Rider, b: Rider) =>
        `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`)
    );
  }, [allRiders, activeOrgId]);

  // Filters
  const [search, setSearch] = useState("");
  const [ageMin, setAgeMin] = useState<number | "">("");
  const [ageMax, setAgeMax] = useState<number | ("")>("");
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
    if (ageMin !== "" || ageMax !== "") {
      list = list.filter((r: Rider) => {
        const age = calcAge(r.dateOfBirth);
        if (age === null) return false;
        if (ageMin !== "" && age < ageMin) return false;
        if (ageMax !== "" && age > ageMax) return false;
        return true;
      });
    }
    return list;
  }, [orgRiders, search, ageMin, ageMax]);

  useEffect(() => {
    setPage(1);
  }, [search, ageMin, ageMax, pageSize]);

  // Create / edit modal
  const emptyForm = { firstName: "", lastName: "", email: "", phone: "", dateOfBirth: "" };
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
        });
      } else {
        await createRider({
          orgId: activeOrgId!,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          dateOfBirth: form.dateOfBirth,
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

  if (!activeOrg) return null;

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
              <IconUsers size={28} />
            </ThemeIcon>
            <div>
              <Text size="xs" c="blue.3" tt="uppercase" fw={600} mb={2}>
                {activeOrg.name}
              </Text>
              <Title order={2} c="white" fw={700}>
                Riders
              </Title>
              <Text size="sm" c="blue.2" mt={2}>
                {orgRiders.length} rider{orgRiders.length !== 1 ? "s" : ""}
              </Text>
            </div>
          </Group>
          <Group gap="xs">
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
          </Group>
        </Group>
      </Box>

      {/* Filter / search toolbar */}
      <Paper p="sm" style={{ background: "#13151b", border: "1px solid #1e2028" }}>
        <Group justify="space-between" align="flex-end" wrap="wrap" gap="md">
          <Group gap="xs" align="center">
            <Badge
              size="lg"
              variant={search || ageMin !== "" || ageMax !== "" ? "light" : "filled"}
              color="blue"
              style={{ cursor: "pointer" }}
              onClick={() => { setSearch(""); setAgeMin(""); setAgeMax(""); }}
            >
              All ({orgRiders.length})
            </Badge>
          </Group>
          <Group gap="sm" align="flex-end" wrap="wrap">
            <Group gap="xs" align="flex-end">
              <NumberInput
                label="Min age"
                placeholder="—"
                value={ageMin}
                onChange={(v) => setAgeMin(v === "" ? "" : Number(v))}
                min={0}
                w={72}
                size="sm"
              />
              <Text c="dimmed" size="sm" pb={6}>–</Text>
              <NumberInput
                label="Max age"
                placeholder="—"
                value={ageMax}
                onChange={(v) => setAgeMax(v === "" ? "" : Number(v))}
                min={0}
                w={72}
                size="sm"
              />
            </Group>
            <TextInput
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ minWidth: 240 }}
              size="sm"
            />
          </Group>
        </Group>
      </Paper>

      {/* Table */}
      {filteredRiders.length === 0 ? (
        <Paper withBorder p="xl">
          <Stack align="center" gap="sm">
            <IconUsers size={48} color="var(--mantine-color-dimmed)" />
            <Text c="dimmed" ta="center">
              {search || ageMin !== "" || ageMax !== ""
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
            columns={[
              {
                accessor: "name",
                title: "Name",
                render: (r: Rider) => `${r.firstName} ${r.lastName}`,
              },
              {
                accessor: "email",
                title: "Email",
                render: (r: Rider) => (
                  <Text size="sm" c={r.email ? undefined : "dimmed"}>
                    {r.email || "—"}
                  </Text>
                ),
              },
              {
                accessor: "phone",
                title: "Phone",
                render: (r: Rider) => (
                  <Text size="sm" c={r.phone ? undefined : "dimmed"}>
                    {r.phone || "—"}
                  </Text>
                ),
              },
              {
                accessor: "dateOfBirth",
                title: "DOB",
                render: (r: Rider) => r.dateOfBirth || "—",
              },
              {
                accessor: "age",
                title: "Age",
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
        title={editingId !== null ? "Edit Rider" : "New Rider"}
      >
        <Stack gap="sm">
          {formError && (
            <Text size="sm" c="red">
              {formError}
            </Text>
          )}
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
          <Group gap="xs" mt="xs">
            <Button onClick={handleSubmit}>
              {editingId !== null ? "Save" : "Add Rider"}
            </Button>
            <Button variant="subtle" onClick={resetForm}>
              Cancel
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Registration link modal */}
      <Modal
        opened={showRegModal}
        onClose={() => setShowRegModal(false)}
        title="Registration link"
      >
        <Stack gap="md">
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
          <Button size="xs" onClick={() => navigator.clipboard.writeText(registrationUrl)}>
            Copy link
          </Button>
        </Stack>
      </Modal>
    </Stack>
  );
}
