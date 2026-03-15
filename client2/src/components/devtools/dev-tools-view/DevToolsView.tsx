import { useMemo, useState } from 'react';
import { Button, Group, Paper, Select, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { useTable, useReducer } from 'spacetimedb/react';
import { tables, reducers } from '@/module_bindings';
import type { Organization, OrgMember, User } from '@/module_bindings/types';
import { getErrorMessage } from '@/utils';

function StatusMessage({ status }: { status: string | null }) {
  if (!status) return null;
  const isError = status.startsWith('Error');
  return (
    <div
      style={{
        marginTop: 8,
        padding: '8px 12px',
        borderRadius: 'var(--mantine-radius-sm)',
        fontSize: '0.85rem',
        background: isError ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
        color: isError ? 'var(--mantine-color-red-6)' : 'var(--mantine-color-green-6)',
      }}
    >
      {status}
    </div>
  );
}

export function DevToolsView() {
  const [orgs] = useTable(tables.organization);
  const [orgMembers] = useTable(tables.org_member);
  const [users] = useTable(tables.user);

  const seedDemoData = useReducer(reducers.seedDemoData);
  const wipeAllData = useReducer(reducers.wipeAllData);
  const transferOwnership = useReducer(reducers.transferOrgOwnershipByEmail);

  const [resetStatus, setResetStatus] = useState<string | null>(null);
  const [seedStatus, setSeedStatus] = useState<string | null>(null);
  const [transferStatus, setTransferStatus] = useState<string | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const sortedOrgs = useMemo(
    () => [...orgs].sort((a: Organization, b: Organization) => a.name.localeCompare(b.name)),
    [orgs]
  );

  const selectedOrg = useMemo<Organization | null>(
    () => sortedOrgs.find((o) => String(o.id) === selectedOrgId) ?? null,
    [sortedOrgs, selectedOrgId]
  );

  const adminCandidates = useMemo<User[]>(() => {
    if (!selectedOrg) return [];
    return orgMembers
      .filter(
        (m: OrgMember) =>
          m.orgId === selectedOrg.id && m.role === 'admin' && m.userId !== selectedOrg.ownerUserId
      )
      .map((m: OrgMember) => users.find((u: User) => u.id === m.userId) || null)
      .filter((u): u is User => !!u && !u.googleSub?.startsWith('pending:'))
      .sort((a, b) => (a.name || a.email || '').localeCompare(b.name || b.email || ''));
  }, [orgMembers, users, selectedOrg]);

  const selectedUser = useMemo<User | null>(
    () => adminCandidates.find((u) => String(u.id) === selectedUserId) ?? null,
    [adminCandidates, selectedUserId]
  );

  const orgOptions = useMemo(
    () =>
      sortedOrgs.map((org) => ({
        value: String(org.id),
        label: org.name,
      })),
    [sortedOrgs]
  );

  const userOptions = useMemo(
    () =>
      adminCandidates.map((user) => ({
        value: String(user.id),
        label: user.name || user.email || `User #${user.id}`,
      })),
    [adminCandidates]
  );

  const handleReset = async () => {
    setResetStatus('Wiping data...');
    try {
      await wipeAllData();
      setResetStatus('Done! Signing out...');
      setTimeout(() => {
        window.localStorage.clear();
        window.location.href = '/';
      }, 1000);
    } catch (e: unknown) {
      setResetStatus(`Error: ${getErrorMessage(e, 'Failed to reset')}`);
    }
  };

  const handleSeed = async () => {
    setSeedStatus('Seeding demo data...');
    try {
      await seedDemoData();
      setSeedStatus('Done!');
    } catch (e: unknown) {
      setSeedStatus(`Error: ${getErrorMessage(e, 'Failed to seed data')}`);
    }
  };

  const handleTransfer = async () => {
    setTransferStatus(null);
    if (!selectedOrg) {
      setTransferStatus('Error: Select an organization');
      return;
    }
    if (!selectedUser?.email) {
      setTransferStatus('Error: Select an admin user');
      return;
    }
    try {
      await transferOwnership({ orgId: selectedOrg.id, email: selectedUser.email.trim() });
      setTransferStatus('Ownership transferred successfully.');
      setSelectedUserId(null);
    } catch (e: unknown) {
      setTransferStatus(`Error: ${getErrorMessage(e, 'Failed to transfer')}`);
    }
  };

  return (
    <Stack gap="xl">
      <div>
        <Title order={2} fw={700}>
          Developer Tools
        </Title>
        <Text size="sm" c="dimmed" mt={4}>
          Utilities for development only. Use with care – these actions can wipe or modify data.
        </Text>
      </div>

      {/* Data management */}
      <Stack gap="md">
        <Text size="xs" fw={600} c="dimmed" tt="uppercase">
          Data Management
        </Text>

        <Paper withBorder p="md">
          <Group justify="space-between" align="center">
            <Text size="sm" c="dimmed">
              Wipe all existing data from SpacetimeDB. You will be logged out afterwards.
            </Text>
            <Button color="red" onClick={handleReset} style={{ whiteSpace: 'nowrap' }}>
              Reset
            </Button>
          </Group>
          <StatusMessage status={resetStatus} />
        </Paper>

        <Paper withBorder p="md">
          <Group justify="space-between" align="center">
            <Text size="sm" c="dimmed">
              Seed demo data including organizations, locations, events, riders, and members.
            </Text>
            <Button onClick={handleSeed} style={{ whiteSpace: 'nowrap' }}>
              Seed demo data
            </Button>
          </Group>
          <StatusMessage status={seedStatus} />
        </Paper>
      </Stack>

      {/* Transfer org ownership */}
      <Stack gap="md">
        <Text size="xs" fw={600} c="dimmed" tt="uppercase">
          Transfer Organization Ownership
        </Text>
        <Paper withBorder p="md">
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              Transfer ownership of an organization to an admin user. This bypasses normal
              permission checks and should only be used in development.
            </Text>

            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
              <Select
                label="Organization"
                placeholder={
                  orgOptions.length ? 'Select organization...' : 'No organizations found'
                }
                searchable
                data={orgOptions}
                value={selectedOrgId}
                onChange={(value) => {
                  setSelectedOrgId(value);
                  setSelectedUserId(null);
                }}
                nothingFoundMessage="No organizations match your search"
              />

              <Select
                label="New owner (admin)"
                placeholder={selectedOrg ? 'Select admin...' : 'Select an organization first'}
                searchable
                data={userOptions}
                value={selectedUserId}
                onChange={setSelectedUserId}
                disabled={!selectedOrg}
                nothingFoundMessage={
                  selectedOrg
                    ? 'No admin users found for this organization'
                    : 'Select an organization first'
                }
              />
            </SimpleGrid>

            <Group gap="xs">
              <Button onClick={handleTransfer} disabled={!selectedOrg || !selectedUser}>
                Transfer ownership
              </Button>
            </Group>

            <StatusMessage status={transferStatus} />
          </Stack>
        </Paper>
      </Stack>
    </Stack>
  );
}
