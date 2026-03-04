import { useState, useMemo } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useTable, useReducer } from 'spacetimedb/react';
import { TextInput, Button, Table, Paper, Stack, Group, Text } from '@mantine/core';
import { tables, reducers } from '../module_bindings';
import { useAuth } from '../auth';
import { useActiveOrgMaybe } from '../OrgContext';
import { IconTrash } from '../icons';
import { RowActionMenu } from '../components/ActionMenu';
import { getErrorMessage } from '../utils';
import type { Venue, Organization } from '../module_bindings/types';

export default function LocationsView() {
  const oid = useActiveOrgMaybe();
  const { isAuthenticated, isReady, canManageOrgEvents } = useAuth();

  const [orgs] = useTable(tables.organization);
  const [locations] = useTable(tables.venue);
  const [tracks] = useTable(tables.track);

  const createVenue = useReducer(reducers.createVenue);
  const deleteVenue = useReducer(reducers.deleteVenue);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', address: '' });
  const [error, setError] = useState('');

  const org = oid ? orgs.find((o: Organization) => o.id === oid) : null;
  const hasAccess = oid !== null ? canManageOrgEvents(oid) : false;

  const orgLocations = useMemo(() => {
    if (!oid) return [];
    return locations
      .filter((v: Venue) => v.orgId === oid)
      .sort((a: Venue, b: Venue) => a.name.localeCompare(b.name));
  }, [locations, oid]);

  const trackCounts = useMemo(() => {
    const m = new Map<bigint, number>();
    for (const t of tracks) {
      for (const v of orgLocations) {
        if (t.venueId === v.id) m.set(v.id, (m.get(v.id) ?? 0) + 1);
      }
    }
    return m;
  }, [tracks, orgLocations]);

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
        You don't have access to manage locations.
      </Text>
    );

  const resetForm = () => {
    setForm({ name: '', description: '', address: '' });
    setError('');
    setShowForm(false);
  };

  const handleCreate = async () => {
    setError('');
    if (!form.name.trim()) {
      setError('Name is required');
      return;
    }
    try {
      await createVenue({
        orgId: oid,
        name: form.name.trim(),
        description: form.description.trim(),
        address: form.address.trim(),
      });
      resetForm();
    } catch (e: unknown) {
      setError(getErrorMessage(e, 'Failed to create location'));
    }
  };

  const handleDelete = async (v: Venue) => {
    if (!confirm(`Delete "${v.name}" and all its tracks?`)) return;
    try {
      await deleteVenue({ venueId: v.id });
    } catch (e: unknown) {
      setError(getErrorMessage(e, 'Failed to delete location'));
    }
  };

  return (
    <div>
      <Group justify="space-between" align="center" mb="lg">
        <h1 style={{ marginBottom: 0 }}>Locations</h1>
        {!showForm && (
          <Button size="xs" onClick={() => setShowForm(true)}>
            + New Location
          </Button>
        )}
      </Group>

      {showForm && (
        <Paper withBorder p="md" mb="lg">
          <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb="xs">
            New Location
          </Text>
          {error && (
            <Text size="sm" c="red" mb="xs">
              {error}
            </Text>
          )}
          <Stack gap="sm">
            <TextInput
              placeholder="Location name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
            <TextInput
              placeholder="Description (optional)"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
            <TextInput
              placeholder="Address"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            />
            <Group gap="xs">
              <Button size="xs" onClick={handleCreate}>
                Create
              </Button>
              <Button variant="subtle" size="xs" onClick={resetForm}>
                Cancel
              </Button>
            </Group>
          </Stack>
        </Paper>
      )}

      {orgLocations.length === 0 && !showForm ? (
        <Text c="dimmed" ta="center" py="xl">
          No locations yet. Create one to get started.
        </Text>
      ) : (
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Description</Table.Th>
              <Table.Th>Tracks</Table.Th>
              <Table.Th>Address</Table.Th>
              <Table.Th style={{ width: 40 }}></Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {orgLocations.map((v: Venue) => (
              <Table.Tr key={String(v.id)}>
                <Table.Td>
                  <Text component={Link} to={`/location/${v.id}`} c="blue" td="none">
                    {v.name}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed">
                    {v.description || '—'}
                  </Text>
                </Table.Td>
                <Table.Td>{trackCounts.get(v.id) ?? 0}</Table.Td>
                <Table.Td>
                  <Text size="sm">
                    {v.address ? (
                      <Text
                        component="a"
                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(v.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        c="blue"
                      >
                        {v.address}
                      </Text>
                    ) : (
                      <Text span c="dimmed">
                        —
                      </Text>
                    )}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <RowActionMenu
                    items={[
                      {
                        icon: IconTrash,
                        label: 'Delete',
                        danger: true,
                        onClick: () => handleDelete(v),
                      },
                    ]}
                  />
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </div>
  );
}
