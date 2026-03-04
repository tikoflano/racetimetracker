import { useState, useMemo } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useTable, useReducer } from 'spacetimedb/react';
import {
  TextInput,
  Select,
  Button,
  Table,
  Badge,
  Paper,
  Stack,
  Group,
  Text,
} from '@mantine/core';
import { tables, reducers } from '../module_bindings';
import { useAuth } from '../auth';
import { useActiveOrgMaybe } from '../OrgContext';
import {
  IconPencil,
  IconPlus,
  IconLogout,
  IconMail,
  IconArrowLeftRight,
  IconUser,
  IconTrash,
} from '../icons';
import Modal from '../components/Modal';
import ActionMenu, { RowActionMenu, type ActionMenuItem } from '../components/ActionMenu';
import ErrorBanner from '../components/ErrorBanner';
import { getErrorMessage } from '../utils';
import type { Organization, OrgMember, User } from '../module_bindings/types';

export default function OrgMembersView() {
  const oid = useActiveOrgMaybe();
  const navigate = useNavigate();
  const { user, isAuthenticated, isReady, canManageOrg, isOrgOwner, canImpersonate } = useAuth();

  const [orgs] = useTable(tables.organization);
  const [orgMembers] = useTable(tables.org_member);
  const [users] = useTable(tables.user);

  const inviteOrgMember = useReducer(reducers.inviteOrgMember);
  const resendOrgInvitation = useReducer(reducers.resendOrgInvitation);
  const removeOrgMember = useReducer(reducers.removeOrgMember);
  const renameOrganization = useReducer(reducers.renameOrganization);
  const transferOrgOwnership = useReducer(reducers.transferOrgOwnership);
  const leaveOrganization = useReducer(reducers.leaveOrganization);
  const startImpersonation = useReducer(reducers.startImpersonation);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'manager' | 'timekeeper'>('manager');
  const [error, setError] = useState('');
  const [orgMenuOpen, setOrgMenuOpen] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferTargetUserId, setTransferTargetUserId] = useState<bigint | ''>('');

  // Inline rename state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [renameError, setRenameError] = useState('');

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<
    'all' | 'owner' | 'admin' | 'manager' | 'timekeeper'
  >('all');

  const org = oid ? orgs.find((o: Organization) => o.id === oid) : null;
  const isOwner = oid !== null ? isOrgOwner(oid) : false;
  const hasAccess = oid !== null ? canManageOrg(oid) : false;

  const members = useMemo(() => {
    if (!oid) return [];
    const ownerId = org?.ownerUserId;
    return orgMembers
      .filter((m: OrgMember) => m.orgId === oid && m.userId !== ownerId)
      .map((m: OrgMember) => {
        const u = users.find((u: User) => u.id === m.userId);
        return { member: m, user: u };
      });
  }, [orgMembers, users, oid, org?.ownerUserId]);

  const ownerUser = useMemo(() => {
    if (!org) return null;
    return users.find((u: User) => u.id === org.ownerUserId) ?? null;
  }, [org, users]);

  const adminCandidates = useMemo(() => {
    if (!user) return [];
    return members
      .filter((m) => m.member.role === 'admin' && m.member.userId !== user.id)
      .filter((m) => m.user && !m.user.googleSub?.startsWith('pending:'))
      .sort((a, b) =>
        (a.user?.name || a.user?.email || '').localeCompare(b.user?.name || b.user?.email || '')
      );
  }, [members, user]);

  const filteredRows = useMemo(() => {
    const q = search.toLowerCase().trim();
    const matchesSearch = (u: User | null) => {
      if (!u) return false;
      const name = (u.name || u.email || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      return !q || name.includes(q) || email.includes(q);
    };
    const ownerIncluded =
      ownerUser &&
      (roleFilter === 'all' || roleFilter === 'owner') &&
      matchesSearch(ownerUser ?? null);
    const filteredMembers = members.filter(({ member, user: mu }) => {
      if (roleFilter !== 'all' && roleFilter !== member.role) return false;
      return matchesSearch(mu ?? null);
    });
    return { ownerIncluded, ownerUser, filteredMembers };
  }, [members, ownerUser, search, roleFilter]);

  const willDeleteOrg = useMemo(() => {
    if (!org || !user) return false;
    const isCallerOwner = org.ownerUserId === user.id;
    if (!isCallerOwner) return false;
    for (const { member, user: mu } of members) {
      if (member.userId === user.id) continue;
      if (member.role === 'admin' && mu && !mu.googleSub?.startsWith('pending:')) return false;
    }
    return true;
  }, [org, user, members]);

  const handleLeave = async () => {
    if (!oid) return;
    const msg = willDeleteOrg
      ? 'You are the only admin. Leaving will permanently delete this organization and all its data. Are you sure?'
      : 'Are you sure you want to leave this organization?';
    if (!confirm(msg)) return;
    try {
      await leaveOrganization({ orgId: oid });
      navigate('/');
    } catch (e: unknown) {
      setError(getErrorMessage(e, 'Failed to leave organization'));
    }
  };

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

  if (!hasAccess) {
    return (
      <Text c="dimmed" ta="center" py="xl">
        You don't have access to manage this organization.
      </Text>
    );
  }

  const startEditing = () => {
    setEditName(org.name);
    setRenameError('');
    setEditing(true);
  };

  const handleRename = async () => {
    setRenameError('');
    const trimmed = editName.trim();
    if (!trimmed) {
      setRenameError('Name cannot be empty');
      return;
    }
    if (trimmed === org.name) {
      setEditing(false);
      return;
    }
    try {
      await renameOrganization({ orgId: oid, name: trimmed });
      setEditing(false);
    } catch (e: unknown) {
      setRenameError(getErrorMessage(e, 'Failed to rename'));
    }
  };

  const handleInvite = async () => {
    setError('');
    const trimmed = inviteEmail.trim();
    if (!trimmed || !trimmed.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    try {
      await inviteOrgMember({
        orgId: oid,
        email: trimmed,
        name: inviteName.trim(),
        role: inviteRole,
      });
      setInviteEmail('');
      setInviteName('');
      setShowInviteForm(false);
    } catch (e: unknown) {
      setError(getErrorMessage(e, 'Failed to invite member'));
    }
  };

  const handleTransferOwnership = async () => {
    if (transferTargetUserId === '') return;
    if (!confirm('Are you sure you want to transfer ownership? You will become a regular admin.'))
      return;
    setError('');
    try {
      await transferOrgOwnership({ orgId: oid, newOwnerUserId: transferTargetUserId });
      setShowTransferModal(false);
      setTransferTargetUserId('');
    } catch (e: unknown) {
      setError(getErrorMessage(e, 'Failed to transfer ownership'));
    }
  };

  const handleResend = async (memberId: bigint) => {
    setError('');
    try {
      await resendOrgInvitation({ orgMemberId: memberId });
    } catch (e: unknown) {
      setError(getErrorMessage(e, 'Failed to resend invitation'));
    }
  };

  const handleRemove = async (memberId: bigint) => {
    try {
      await removeOrgMember({ orgMemberId: memberId });
    } catch (e: unknown) {
      setError(getErrorMessage(e, 'Failed to remove member'));
    }
  };

  return (
    <div>
      {/* Org name with dropdown */}
      {editing ? (
        <Stack gap="xs" mb="lg">
          <Group gap="xs" align="center">
            <TextInput
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') setEditing(false);
              }}
              autoFocus
              style={{ flex: 1 }}
              styles={{ input: { fontSize: '1.4rem', fontWeight: 700 } }}
            />
            <Button size="xs" onClick={handleRename}>
              Save
            </Button>
            <Button variant="subtle" size="xs" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </Group>
          {renameError && (
            <Text size="sm" c="red">
              {renameError}
            </Text>
          )}
        </Stack>
      ) : (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
          <h1 style={{ marginBottom: 0 }}>{org.name}</h1>
          <OrgActionMenu
            open={orgMenuOpen}
            onToggle={() => setOrgMenuOpen(!orgMenuOpen)}
            onClose={() => setOrgMenuOpen(false)}
            onRename={() => {
              setOrgMenuOpen(false);
              startEditing();
            }}
            onInvite={() => {
              setOrgMenuOpen(false);
              setError('');
              setShowInviteForm(true);
            }}
            onTransferOwnership={() => {
              setOrgMenuOpen(false);
              if (adminCandidates.length === 0) {
                setError('No other admins in this organization. Invite an admin first.');
              } else {
                setError('');
                setShowTransferModal(true);
                setTransferTargetUserId('');
              }
            }}
            onLeave={() => {
              setOrgMenuOpen(false);
              handleLeave();
            }}
            willDeleteOrg={willDeleteOrg}
            isAdmin={hasAccess}
            isOwner={isOwner}
          />
        </div>
      )}
      <Text size="sm" c="dimmed" mb="lg">
        Organization members and permissions
      </Text>
      {error && <ErrorBanner message={error} onDismiss={() => setError('')} />}

      {/* Members table */}
      <Stack gap="md" mb="xl">
        <Text size="xs" fw={600} c="dimmed" tt="uppercase">
          Members
        </Text>
        {(ownerUser || members.length > 0) && (
          <Group gap="md" wrap="wrap" align="center">
            <TextInput
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ maxWidth: 280 }}
            />
            <Group gap="xs">
              {(['all', 'owner', 'admin', 'manager', 'timekeeper'] as const).map((f) => {
                const labels: Record<string, string> = {
                  all: 'All',
                  owner: 'Owner',
                  admin: 'Admin',
                  manager: 'Manager',
                  timekeeper: 'Timekeeper',
                };
                const counts: Record<string, number> = {
                  all: (ownerUser ? 1 : 0) + members.length,
                  owner: ownerUser ? 1 : 0,
                  admin: members.filter((m) => m.member.role === 'admin').length,
                  manager: members.filter((m) => m.member.role === 'manager').length,
                  timekeeper: members.filter((m) => m.member.role === 'timekeeper').length,
                };
                return (
                  <Button
                    key={f}
                    size="xs"
                    variant={roleFilter === f ? 'filled' : 'subtle'}
                    onClick={() => setRoleFilter(f)}
                  >
                    {labels[f]} ({counts[f]})
                  </Button>
                );
              })}
            </Group>
          </Group>
        )}
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Email</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Role</Table.Th>
              {isOwner && <Table.Th style={{ width: 40 }}></Table.Th>}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {/* Owner row */}
            {filteredRows.ownerIncluded && (
              <Table.Tr>
                <Table.Td>
                  {filteredRows.ownerUser
                    ? filteredRows.ownerUser.name || filteredRows.ownerUser.email
                    : 'No owner'}
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed">
                    {filteredRows.ownerUser?.email || ''}
                  </Text>
                </Table.Td>
                <Table.Td></Table.Td>
                <Table.Td>
                  <Badge color="green" variant="light">
                    owner/admin
                  </Badge>
                </Table.Td>
                {isOwner && <Table.Td></Table.Td>}
              </Table.Tr>
            )}
            {/* Member rows */}
            {filteredRows.filteredMembers.map(({ member, user: memberUser }) => {
              const isPending = memberUser?.googleSub?.startsWith('pending:') ?? false;
              const showImpersonate = canImpersonate && member.role !== 'admin' && memberUser;
              return (
                <Table.Tr key={String(member.id)} style={isPending ? { opacity: 0.7 } : undefined}>
                  <Table.Td>
                    {memberUser ? memberUser.name || memberUser.email : `User #${member.userId}`}
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {memberUser?.email || ''}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    {isPending && (
                      <Badge color="yellow" variant="light">
                        Pending
                      </Badge>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Badge color={member.role === 'admin' ? 'green' : 'yellow'} variant="light">
                      {member.role}
                    </Badge>
                  </Table.Td>
                  {isOwner && (
                    <Table.Td>
                      <MemberMenu
                        showImpersonate={!!showImpersonate}
                        showResend={isPending}
                        onImpersonate={() => {
                          if (memberUser) startImpersonation({ targetUserId: memberUser.id });
                        }}
                        onResend={() => handleResend(member.id)}
                        onRemove={() => handleRemove(member.id)}
                      />
                    </Table.Td>
                  )}
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
        {!filteredRows.ownerIncluded && filteredRows.filteredMembers.length === 0 && (
          <Text c="dimmed" ta="center" py="md">
            {ownerUser || members.length > 0
              ? 'No members match your search or filter.'
              : 'No members yet. Invite someone below.'}
          </Text>
        )}
      </Stack>

      {/* Transfer ownership modal */}
      {showTransferModal && (
        <Paper withBorder p="md" mb="lg" style={{ maxWidth: 400 }}>
          <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb="xs">
            Transfer ownership
          </Text>
          <Text size="sm" c="dimmed" mb="md">
            Transfer this organization to another admin. You will become a regular admin after the
            transfer.
          </Text>
          {adminCandidates.length > 0 && (
            <Stack gap="md">
              <Select
                label="New owner"
                placeholder="Select admin..."
                value={transferTargetUserId === '' ? null : String(transferTargetUserId)}
                onChange={(v) => setTransferTargetUserId(v === null ? '' : BigInt(v))}
                data={adminCandidates.map(({ user: u }) => ({
                  value: String(u!.id),
                  label: u!.name || u!.email || `User #${u!.id}`,
                }))}
              />
              <Group gap="xs">
                <Button
                  size="xs"
                  onClick={handleTransferOwnership}
                  disabled={transferTargetUserId === ''}
                >
                  Transfer
                </Button>
                <Button
                  variant="subtle"
                  size="xs"
                  onClick={() => {
                    setShowTransferModal(false);
                    setTransferTargetUserId('');
                  }}
                >
                  Cancel
                </Button>
              </Group>
            </Stack>
          )}
        </Paper>
      )}

      {/* Invite member modal */}
      {hasAccess && (
        <Modal
          open={showInviteForm}
          onClose={() => {
            setShowInviteForm(false);
            setError('');
          }}
          title="Invite Member"
        >
          <Stack gap="md">
            {error && <ErrorBanner message={error} onDismiss={() => setError('')} noMargin />}
            <TextInput
              label="Name"
              placeholder="Name"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
            />
            <TextInput
              label="Email address"
              placeholder="Email address"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
            />
            <Select
              label="Role"
              value={inviteRole}
              onChange={(v) => setInviteRole((v as 'admin' | 'manager' | 'timekeeper') || 'manager')}
              data={[
                { value: 'manager', label: 'Manager' },
                { value: 'timekeeper', label: 'Timekeeper' },
                { value: 'admin', label: 'Admin' },
              ]}
            />
            <Group gap="xs">
              <Button onClick={handleInvite}>Invite</Button>
              <Button
                variant="subtle"
                size="xs"
                onClick={() => {
                  setShowInviteForm(false);
                  setError('');
                }}
              >
                Cancel
              </Button>
            </Group>
          </Stack>
        </Modal>
      )}
    </div>
  );
}

function OrgActionMenu({
  open,
  onToggle,
  onClose,
  onRename,
  onInvite,
  onTransferOwnership,
  onLeave,
  willDeleteOrg,
  isAdmin,
  isOwner,
}: {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onRename: () => void;
  onInvite: () => void;
  onTransferOwnership: () => void;
  onLeave: () => void;
  willDeleteOrg: boolean;
  isAdmin: boolean;
  isOwner: boolean;
}) {
  const items: ActionMenuItem[] = [];
  if (isAdmin) items.push({ icon: IconPencil, label: 'Rename', onClick: onRename });
  if (isAdmin) items.push({ icon: IconPlus, label: 'Invite member', onClick: onInvite });
  if (isOwner) items.push({ icon: IconArrowLeftRight, label: 'Transfer ownership', onClick: onTransferOwnership });
  items.push({
    icon: IconLogout,
    label: willDeleteOrg ? 'Leave & delete' : 'Leave',
    onClick: onLeave,
    danger: true,
  });
  return <ActionMenu open={open} onToggle={onToggle} onClose={onClose} items={items} />;
}

function MemberMenu({
  showImpersonate,
  showResend,
  onImpersonate,
  onResend,
  onRemove,
}: {
  showImpersonate: boolean;
  showResend: boolean;
  onImpersonate: () => void;
  onResend: () => void;
  onRemove: () => void;
}) {
  const items: ActionMenuItem[] = [];
  if (showImpersonate) items.push({ icon: IconUser, label: 'Impersonate', onClick: onImpersonate });
  if (showResend) items.push({ icon: IconMail, label: 'Resend invitation', onClick: onResend });
  items.push({ icon: IconTrash, label: 'Remove', onClick: onRemove, danger: true });
  return <RowActionMenu items={items} />;
}
