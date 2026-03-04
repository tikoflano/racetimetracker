import { useState, useMemo, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useTable, useReducer } from 'spacetimedb/react';
import { QRCodeSVG } from 'qrcode.react';
import {
  TextInput,
  NumberInput,
  Button,
  Table,
  Paper,
  Stack,
  Group,
  Text,
  Menu,
  ActionIcon,
  Tabs,
  Checkbox,
  Select,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { tables, reducers } from '../module_bindings';
import { useAuth } from '../auth';
import { useActiveOrgMaybe } from '../OrgContext';
import { IconPencil, IconTrash, IconDotsVertical, IconShare3 } from '../icons';
import { RowActionMenu } from '../components/ActionMenu';
import Modal from '../components/Modal';
import type { Rider, Organization } from '../module_bindings/types';
import { getErrorMessage } from '../utils';

export default function RidersView() {
  const oid = useActiveOrgMaybe();
  const { isAuthenticated, isReady, canManageOrgEvents } = useAuth();

  const [orgs] = useTable(tables.organization);
  const [riders] = useTable(tables.rider);

  const createRider = useReducer(reducers.createRider);
  const updateRider = useReducer(reducers.updateRider);
  const deleteRider = useReducer(reducers.deleteRider);
  const setRegistrationEnabled = useReducer(reducers.setRegistrationEnabled);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<bigint | null>(null);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
  });
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [ageMin, setAgeMin] = useState('');
  const [ageMax, setAgeMax] = useState('');
  const [page, setPage] = useState(0);
  const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
  const [pageSize, setPageSize] = useState(() => {
    try {
      const stored = localStorage.getItem('racetimetracker-riders-page-size');
      if (stored) {
        const n = parseInt(stored, 10);
        if (PAGE_SIZE_OPTIONS.includes(n)) return n;
      }
    } catch {}
    return 10;
  });
  const [registrationModalOpen, setRegistrationModalOpen] = useState(false);
  const [registrationModalTab, setRegistrationModalTab] = useState<string | null>('url');

  const org = oid ? orgs.find((o: Organization) => o.id === oid) : null;
  const hasAccess = oid !== null ? canManageOrgEvents(oid) : false;

  const orgRiders = useMemo(() => {
    if (!oid) return [];
    return riders
      .filter((r: Rider) => r.orgId === oid)
      .sort((a: Rider, b: Rider) =>
        `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`)
      );
  }, [riders, oid]);

  const filteredRiders = useMemo(() => {
    let list = orgRiders;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r: Rider) =>
          `${r.firstName} ${r.lastName}`.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q)
      );
    }
    const min = parseInt(ageMin);
    const max = parseInt(ageMax);
    if (!isNaN(min) || !isNaN(max)) {
      const today = new Date();
      list = list.filter((r: Rider) => {
        if (!r.dateOfBirth) return false;
        const dob = new Date(r.dateOfBirth);
        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
        if (!isNaN(min) && age < min) return false;
        if (!isNaN(max) && age > max) return false;
        return true;
      });
    }
    return list;
  }, [orgRiders, search, ageMin, ageMax]);

  const totalPages = Math.max(1, Math.ceil(filteredRiders.length / pageSize));
  const paginatedRiders = useMemo(() => {
    const start = page * pageSize;
    return filteredRiders.slice(start, start + pageSize);
  }, [filteredRiders, page, pageSize]);

  useEffect(() => {
    setPage(0);
  }, [search, ageMin, ageMax, pageSize]);

  if (!isReady) return null;
  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (!oid) return null;
  if (!org) {
    if (orgs.length === 0) return null;
    return (
      <Text c="dimmed" ta="center" py="xl">
        Organization not found.
      </Text>
    );
  }
  if (!hasAccess)
    return (
      <Text c="dimmed" ta="center" py="xl">
        You don't have access to manage riders.
      </Text>
    );

  const resetForm = () => {
    setForm({ firstName: '', lastName: '', email: '', phone: '', dateOfBirth: '' });
    setError('');
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
    setShowForm(true);
    setError('');
  };

  const handleSubmit = async () => {
    setError('');
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError('First and last name are required');
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
          orgId: oid,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          dateOfBirth: form.dateOfBirth,
        });
      }
      resetForm();
    } catch (e: unknown) {
      setError(getErrorMessage(e, 'Failed to save rider'));
    }
  };

  const handleDelete = async (r: Rider) => {
    if (!confirm(`Remove ${r.firstName} ${r.lastName}?`)) return;
    try {
      await deleteRider({ riderId: r.id });
    } catch (e: unknown) {
      setError(getErrorMessage(e, 'Failed to delete rider'));
    }
  };

  const registrationUrl = org ? `${window.location.origin}/register/${org.slug}` : '';

  return (
    <div>
      <Group justify="space-between" align="baseline" mb="lg" wrap="wrap" gap="xs">
        <Group gap="xs" align="baseline">
          <h1 style={{ marginBottom: 0 }}>
            Riders <Text span c="dimmed" size="md" fw={400}>({orgRiders.length})</Text>
          </h1>
          <Menu shadow="md" width={200}>
            <Menu.Target>
              <ActionIcon variant="subtle" size="sm" title="Riders actions">
                <IconDotsVertical size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                leftSection={<IconShare3 size={16} />}
                onClick={() => {
                  setRegistrationModalTab('url');
                  setRegistrationModalOpen(true);
                }}
              >
                Registration link
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
        {!showForm && (
          <Button
            size="xs"
            onClick={() => {
              setEditingId(null);
              setShowForm(true);
              setError('');
            }}
          >
            + Add Rider
          </Button>
        )}
      </Group>

      {/* Add / Edit form */}
      {showForm && (
        <Paper withBorder p="md" mb="lg">
          <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb="xs">
            {editingId !== null ? 'Edit Rider' : 'New Rider'}
          </Text>
          {error && (
            <Text size="sm" c="red" mb="xs">
              {error}
            </Text>
          )}
          <Stack gap="sm">
            <Group grow>
              <TextInput
                label="First Name *"
                placeholder="First name"
                value={form.firstName}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                autoFocus
              />
              <TextInput
                label="Last Name *"
                placeholder="Last name"
                value={form.lastName}
                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              />
            </Group>
            <Group grow>
              <TextInput
                label="Email"
                placeholder="email@example.com"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              />
              <TextInput
                label="Phone"
                placeholder="+1-555-0100"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              />
            </Group>
            <DatePickerInput
              label="Date of Birth"
              value={form.dateOfBirth ? new Date(form.dateOfBirth) : null}
              onChange={(d) => setForm((f) => ({ ...f, dateOfBirth: d ? d.toISOString().slice(0, 10) : '' }))}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
            <Group gap="xs" mt="sm">
              <Button size="xs" onClick={handleSubmit}>
                {editingId !== null ? 'Save' : 'Add Rider'}
              </Button>
              <Button variant="subtle" size="xs" onClick={resetForm}>
                Cancel
              </Button>
            </Group>
          </Stack>
        </Paper>
      )}

      {/* Search and filters */}
      {orgRiders.length > 0 && (
        <Group gap="md" align="flex-end" wrap="wrap" mb="md">
          <TextInput
            label="Search"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: 280 }}
          />
          <Group gap="xs" align="flex-end">
            <NumberInput
              label="Min Age"
              placeholder="—"
              value={ageMin === '' ? undefined : (isNaN(parseInt(ageMin, 10)) ? undefined : parseInt(ageMin, 10))}
              onChange={(v) => setAgeMin(v === undefined || v === null ? '' : String(v))}
              min={0}
              w={72}
            />
            <Text c="dimmed" size="sm">
              –
            </Text>
            <NumberInput
              label="Max Age"
              placeholder="—"
              value={ageMax === '' ? undefined : (isNaN(parseInt(ageMax, 10)) ? undefined : parseInt(ageMax, 10))}
              onChange={(v) => setAgeMax(v === undefined || v === null ? '' : String(v))}
              min={0}
              w={72}
            />
          </Group>
        </Group>
      )}

      {/* Riders table */}
      {filteredRiders.length === 0 && !showForm ? (
        <Text c="dimmed" ta="center" py="xl">
          {search || ageMin || ageMax
            ? 'No riders match your filters.'
            : 'No riders yet. Add one or share the registration link.'}
        </Text>
      ) : (
        <>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Email</Table.Th>
                <Table.Th>Phone</Table.Th>
                <Table.Th>DOB</Table.Th>
                <Table.Th>Age</Table.Th>
                <Table.Th style={{ width: 40 }}></Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {paginatedRiders.map((r: Rider) => (
                <Table.Tr key={String(r.id)}>
                  <Table.Td>
                    {r.firstName} {r.lastName}
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {r.email || '—'}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {r.phone || '—'}
                    </Text>
                  </Table.Td>
                  <Table.Td>{r.dateOfBirth || '—'}</Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {r.dateOfBirth
                        ? (() => {
                            const today = new Date();
                            const dob = new Date(r.dateOfBirth);
                            let age = today.getFullYear() - dob.getFullYear();
                            const m = today.getMonth() - dob.getMonth();
                            if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
                            return age;
                          })()
                        : '—'}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <RowActionMenu
                      items={[
                        { icon: IconPencil, label: 'Edit', onClick: () => startEdit(r) },
                        {
                          icon: IconTrash,
                          label: 'Delete',
                          danger: true,
                          onClick: () => handleDelete(r),
                        },
                      ]}
                    />
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
          {filteredRiders.length > PAGE_SIZE_OPTIONS[0] && (
            <Group justify="flex-end" gap="md" mt="md" wrap="wrap">
              <Button
                variant="subtle"
                size="xs"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                Previous
              </Button>
              <Text size="sm" c="dimmed">
                Page {page + 1} of {totalPages} ({filteredRiders.length} riders)
              </Text>
              <Button
                variant="subtle"
                size="xs"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                Next
              </Button>
              <Group gap="xs" align="center">
                <Select
                  label="Per page"
                  value={String(pageSize)}
                  onChange={(v) => {
                    const n = v ? Number(v) : 10;
                    setPageSize(n);
                    try {
                      localStorage.setItem('racetimetracker-riders-page-size', String(n));
                    } catch {}
                  }}
                  data={PAGE_SIZE_OPTIONS.map((n) => ({ value: String(n), label: String(n) }))}
                  w={72}
                  size="xs"
                />
              </Group>
            </Group>
          )}
        </>
      )}

      {/* Registration link modal */}
      <Modal
        open={registrationModalOpen}
        onClose={() => {
          setRegistrationModalOpen(false);
          setRegistrationModalTab('url');
        }}
        title="Registration link"
      >
        <Stack gap="md">
          <Checkbox
            label="Allow new riders to register"
            checked={org?.registrationEnabled !== false}
            onChange={(e) => {
              const enabled = e.target.checked;
              setRegistrationEnabled({ orgId: oid, enabled });
            }}
          />
          {org?.registrationEnabled === false && (
            <Text size="sm" c="dimmed">
              The link is disabled. Visitors will see a "Registration Closed" message.
            </Text>
          )}
          <Tabs value={registrationModalTab} onChange={setRegistrationModalTab}>
            <Tabs.List>
              <Tabs.Tab value="url">URL</Tabs.Tab>
              <Tabs.Tab value="qr">QR code</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="url" pt="md">
              <Stack gap="sm">
                <Text size="sm" style={{ wordBreak: 'break-all' }}>
                  <Text component="a" href={registrationUrl} target="_blank" rel="noopener noreferrer" c="blue">
                    {registrationUrl}
                  </Text>
                </Text>
                <Button size="xs" onClick={() => navigator.clipboard.writeText(registrationUrl)}>
                  Copy link
                </Button>
              </Stack>
            </Tabs.Panel>
            <Tabs.Panel value="qr" pt="md">
              <Stack gap="xs" align="center">
                <div
                  style={{
                    background: 'white',
                    padding: 20,
                    borderRadius: 12,
                    display: 'inline-block',
                  }}
                >
                  <QRCodeSVG value={registrationUrl} size={200} level="M" />
                </div>
                <Text size="sm" c="dimmed">
                  Scan to open registration form
                </Text>
              </Stack>
            </Tabs.Panel>
          </Tabs>
        </Stack>
      </Modal>
    </div>
  );
}
