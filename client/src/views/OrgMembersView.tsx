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
  Title,
  ActionIcon,
  Box,
  Modal as MModal,
} from '@mantine/core';
import type { BadgeProps } from '@mantine/core';

/** Styles to disable Badge truncation so full text is visible */
const BADGE_FULL_STYLES: BadgeProps['styles'] = {
  root: { overflow: 'visible', minWidth: 'max-content' },
  label: { overflow: 'visible', textOverflow: 'unset' },
};
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
  IconTrophy,
  IconCalendarEvent,
  IconInfoCircle,
  IconBuilding,
  IconShieldStar,
  IconShield,
  IconUserCog,
  IconClock,
} from '../icons';
import Modal from '../components/Modal';
import ActionMenu, { RowActionMenu, type ActionMenuItem } from '../components/ActionMenu';
import ErrorBanner from '../components/ErrorBanner';
import { getErrorMessage } from '../utils';
import type {
  Organization,
  OrgMember,
  User,
  Championship,
  ChampionshipMember,
  Event,
  EventMember,
} from '../module_bindings/types';

const ROLES_PERMISSIONS_ROWS: {
  scope: string;
  scopeIcon: React.ReactNode;
  scopeColor: string;
  role: string;
  roleIcon: React.ReactNode;
  roleColor: string;
  access: string;
}[] = [
  { scope: 'Organization', scopeIcon: <IconBuilding size={12} />, scopeColor: 'green', role: 'Owner', roleIcon: <IconShieldStar size={12} />, roleColor: 'blue', access: 'Full access: manage org, members, championships, events, locations, riders, and timekeeping.' },
  { scope: 'Organization', scopeIcon: <IconBuilding size={12} />, scopeColor: 'green', role: 'Admin', roleIcon: <IconShield size={12} />, roleColor: 'green', access: 'Manage org and members (invite, remove, rename). Full access to championships, events, locations, riders, and timekeeping.' },
  { scope: 'Organization', scopeIcon: <IconBuilding size={12} />, scopeColor: 'green', role: 'Manager', roleIcon: <IconUserCog size={12} />, roleColor: 'orange', access: 'Manage championships, events, locations, riders. Can organize events and assign timekeepers. Cannot manage org members.' },
  { scope: 'Organization', scopeIcon: <IconBuilding size={12} />, scopeColor: 'green', role: 'Timekeeper', roleIcon: <IconClock size={12} />, roleColor: 'gray', access: 'Timekeeping only: start/finish runs, DNF, DNS at any event in the org.' },
  { scope: 'Championship', scopeIcon: <IconTrophy size={12} />, scopeColor: 'blue', role: 'Manager', roleIcon: <IconUserCog size={12} />, roleColor: 'orange', access: "Manage this championship's events, tracks, categories, riders, schedule, timekeeper assignments." },
  { scope: 'Championship', scopeIcon: <IconTrophy size={12} />, scopeColor: 'blue', role: 'Timekeeper', roleIcon: <IconClock size={12} />, roleColor: 'gray', access: "Timekeeping at this championship's events." },
  { scope: 'Event', scopeIcon: <IconCalendarEvent size={12} />, scopeColor: 'violet', role: 'Manager', roleIcon: <IconUserCog size={12} />, roleColor: 'orange', access: 'Manage this event: tracks, categories, riders, schedule, timekeeper assignments.' },
  { scope: 'Event', scopeIcon: <IconCalendarEvent size={12} />, scopeColor: 'violet', role: 'Timekeeper', roleIcon: <IconClock size={12} />, roleColor: 'gray', access: 'Timekeeping at this event.' },
];

function RolesPermissionsModal({
  opened,
  onClose,
}: {
  opened: boolean;
  onClose: () => void;
}) {
  return (
    <MModal opened={opened} onClose={onClose} title="Roles & permissions" size="lg">
      <Paper p="md" withBorder style={{ background: '#13151b', border: '1px solid #1e2028' }}>
        <Table withTableBorder={false} withColumnBorders={false} highlightOnHover style={{ tableLayout: 'auto' }}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ whiteSpace: 'nowrap' }}>Scope</Table.Th>
              <Table.Th style={{ whiteSpace: 'nowrap' }}>Role</Table.Th>
              <Table.Th>Access</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {ROLES_PERMISSIONS_ROWS.map((row, i) => (
              <Table.Tr key={i}>
                <Table.Td style={{ whiteSpace: 'nowrap' }}>
                  <Badge
                    size="sm"
                    color={row.scopeColor}
                    variant="light"
                    leftSection={row.scopeIcon}
                    styles={BADGE_FULL_STYLES}
                  >
                    {row.scope}
                  </Badge>
                </Table.Td>
                <Table.Td style={{ whiteSpace: 'nowrap' }}>
                  <Badge
                    size="sm"
                    color={row.roleColor}
                    variant="light"
                    leftSection={row.roleIcon}
                    styles={BADGE_FULL_STYLES}
                  >
                    {row.role}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed">
                    {row.access}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>
      <Group justify="flex-end" mt="md">
        <Button variant="subtle" onClick={onClose}>
          Close
        </Button>
      </Group>
    </MModal>
  );
}

export default function OrgMembersView() {
  const oid = useActiveOrgMaybe();
  const navigate = useNavigate();
  const { user, isAuthenticated, isReady, canManageOrg, isOrgOwner, canImpersonate } = useAuth();

  const [orgs] = useTable(tables.organization);
  const [orgMembers] = useTable(tables.org_member);
  const [users] = useTable(tables.user);
  const [championships] = useTable(tables.championship);
  const [championshipMembers] = useTable(tables.championship_member);
  const [events] = useTable(tables.event);
  const [eventMembers] = useTable(tables.event_member);

  const inviteOrgMember = useReducer(reducers.inviteOrgMember);
  const resendOrgInvitation = useReducer(reducers.resendOrgInvitation);
  const removeOrgMember = useReducer(reducers.removeOrgMember);
  const updateOrgMember = useReducer(reducers.updateOrgMember);
  const addChampionshipMember = useReducer(reducers.addChampionshipMember);
  const updateChampionshipMember = useReducer(reducers.updateChampionshipMember);
  const removeChampionshipMember = useReducer(reducers.removeChampionshipMember);
  const addEventMember = useReducer(reducers.addEventMember);
  const updateEventMember = useReducer(reducers.updateEventMember);
  const removeEventMember = useReducer(reducers.removeEventMember);
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
  const [editMemberModal, setEditMemberModal] = useState<{
    member: OrgMember;
    user: User | undefined;
    championshipScopes: { id: bigint; championshipId: bigint; championshipName: string; role: string }[];
    eventScopes: { id: bigint; eventId: bigint; eventName: string; role: string }[];
  } | null>(null);

  const org = oid ? orgs.find((o: Organization) => o.id === oid) : null;
  const isOwner = oid !== null ? isOrgOwner(oid) : false;
  const hasAccess = oid !== null ? canManageOrg(oid) : false;

  const members = useMemo(() => {
    if (!oid) return [];
    const ownerId = org?.ownerUserId;
    const orgChampionships = championships.filter(
      (c: Championship) => c.orgId === oid
    );
    const orgEvents = events.filter((e: Event) => e.orgId === oid);

    const getChampionshipScopes = (userId: bigint) =>
      championshipMembers
        .filter(
          (cm: ChampionshipMember) =>
            cm.userId === userId &&
            orgChampionships.some((c: Championship) => c.id === cm.championshipId)
        )
        .map((cm: ChampionshipMember) => {
          const champ = orgChampionships.find(
            (c: Championship) => c.id === cm.championshipId
          );
          return {
            id: cm.id,
            championshipId: cm.championshipId,
            championshipName: champ?.name ?? `Championship #${cm.championshipId}`,
            role: cm.role,
          };
        });

    const getEventScopes = (userId: bigint) =>
      eventMembers
        .filter(
          (em: EventMember) =>
            em.userId === userId &&
            orgEvents.some((e: Event) => e.id === em.eventId)
        )
        .map((em: EventMember) => {
          const evt = orgEvents.find((e: Event) => e.id === em.eventId);
          return {
            id: em.id,
            eventId: em.eventId,
            eventName: evt?.name ?? `Event #${em.eventId}`,
            role: em.role,
          };
        });

    return orgMembers
      .filter((m: OrgMember) => m.orgId === oid && m.userId !== ownerId)
      .map((m: OrgMember) => {
        const u = users.find((u: User) => u.id === m.userId);
        return {
          member: m,
          user: u,
          championshipScopes: getChampionshipScopes(m.userId),
          eventScopes: getEventScopes(m.userId),
        };
      });
  }, [
    orgMembers,
    users,
    oid,
    org?.ownerUserId,
    championships,
    championshipMembers,
    events,
    eventMembers,
  ]);

  const ownerUser = useMemo(() => {
    if (!org) return null;
    return users.find((u: User) => u.id === org.ownerUserId) ?? null;
  }, [org, users]);

  const ownerScopes = useMemo(() => {
    if (!oid || !org?.ownerUserId) return { championshipScopes: [], eventScopes: [] };
    const orgChampionships = championships.filter(
      (c: Championship) => c.orgId === oid
    );
    const orgEvents = events.filter((e: Event) => e.orgId === oid);
    const championshipScopes = championshipMembers
      .filter(
        (cm: ChampionshipMember) =>
          cm.userId === org.ownerUserId &&
          orgChampionships.some((c: Championship) => c.id === cm.championshipId)
      )
      .map((cm: ChampionshipMember) => {
        const champ = orgChampionships.find(
          (c: Championship) => c.id === cm.championshipId
        );
        return {
          id: cm.id,
          championshipId: cm.championshipId,
          championshipName: champ?.name ?? `Championship #${cm.championshipId}`,
          role: cm.role,
        };
      });
    const eventScopes = eventMembers
      .filter(
        (em: EventMember) =>
          em.userId === org.ownerUserId &&
          orgEvents.some((e: Event) => e.id === em.eventId)
      )
      .map((em: EventMember) => {
        const evt = orgEvents.find((e: Event) => e.id === em.eventId);
        return {
          id: em.id,
          eventId: em.eventId,
          eventName: evt?.name ?? `Event #${em.eventId}`,
          role: em.role,
        };
      });
    return { championshipScopes, eventScopes };
  }, [
    oid,
    org?.ownerUserId,
    championships,
    championshipMembers,
    events,
    eventMembers,
  ]);

  // Owner is always shown when org has ownerUserId; use fallback display if User not found
  const ownerDisplay = useMemo(() => {
    if (!org) return null;
    const u = ownerUser;
    if (u) return { name: u.name || u.email || 'No name', email: u.email || '' };
    return { name: `User #${org.ownerUserId}`, email: '' };
  }, [org, ownerUser]);

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
    const matchesSearch = (u: User | null, fallbackName?: string, fallbackEmail?: string) => {
      if (u) {
        const name = (u.name || u.email || '').toLowerCase();
        const email = (u.email || '').toLowerCase();
        return !q || name.includes(q) || email.includes(q);
      }
      if (fallbackName != null || fallbackEmail != null) {
        const name = (fallbackName || '').toLowerCase();
        const email = (fallbackEmail || '').toLowerCase();
        return !q || name.includes(q) || email.includes(q);
      }
      return false;
    };
    const ownerIncluded =
      ownerDisplay &&
      (roleFilter === 'all' || roleFilter === 'owner') &&
      matchesSearch(ownerUser ?? null, ownerDisplay.name, ownerDisplay.email);
    const filteredMembers = members.filter(({ member, user: mu }) => {
      if (roleFilter !== 'all' && roleFilter !== member.role) return false;
      return matchesSearch(mu ?? null);
    });
    return { ownerIncluded, ownerUser, ownerDisplay, filteredMembers };
  }, [members, ownerUser, ownerDisplay, search, roleFilter]);

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
        <Group align="baseline" gap="xs" mb={4}>
          <Title order={1}>{org.name}</Title>
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
        </Group>
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
        {(ownerDisplay || members.length > 0) && (
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
                  all: (ownerDisplay ? 1 : 0) + members.length,
                  owner: ownerDisplay ? 1 : 0,
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
              <Table.Th>Scopes</Table.Th>
              {isOwner && <Table.Th style={{ width: 40 }}></Table.Th>}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {/* Owner row */}
            {filteredRows.ownerIncluded && filteredRows.ownerDisplay && (
              <Table.Tr>
                <Table.Td>
                  {filteredRows.ownerDisplay.name}
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed">
                    {filteredRows.ownerDisplay.email}
                  </Text>
                </Table.Td>
                <Table.Td></Table.Td>
                <Table.Td>
                  <Badge color="green" variant="light">
                    owner/admin
                  </Badge>
                </Table.Td>
                <Table.Td>
                  {ownerScopes.championshipScopes.length > 0 ||
                  ownerScopes.eventScopes.length > 0 ? (
                    <Group gap={4} wrap="wrap">
                      {ownerScopes.championshipScopes.map((s) => (
                        <Badge key={String(s.id)} size="xs" color="blue" variant="light" leftSection={<IconTrophy size={10} />} styles={BADGE_FULL_STYLES}>
                          {s.championshipName} ({s.role})
                        </Badge>
                      ))}
                      {ownerScopes.eventScopes.map((s) => (
                        <Badge key={String(s.id)} size="xs" color="violet" variant="light" leftSection={<IconCalendarEvent size={10} />} styles={BADGE_FULL_STYLES}>
                          {s.eventName} ({s.role})
                        </Badge>
                      ))}
                    </Group>
                  ) : (
                    <Text size="xs" c="dimmed">—</Text>
                  )}
                </Table.Td>
                {isOwner && <Table.Td></Table.Td>}
              </Table.Tr>
            )}
            {/* Member rows */}
            {filteredRows.filteredMembers.map(
              ({ member, user: memberUser, championshipScopes, eventScopes }) => {
                const isPending = memberUser?.googleSub?.startsWith('pending:') ?? false;
                const showImpersonate = canImpersonate && member.role !== 'admin' && memberUser;
                const hasScopes =
                  championshipScopes.length > 0 || eventScopes.length > 0;
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
                      <Badge color={member.role === 'admin' ? 'green' : 'yellow'} variant="light" styles={BADGE_FULL_STYLES}>
                        {member.role}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      {hasScopes ? (
                        <Group gap={4} wrap="wrap">
                          {championshipScopes.map((s) => (
                            <Badge key={String(s.id)} size="xs" color="blue" variant="light" leftSection={<IconTrophy size={10} />} styles={BADGE_FULL_STYLES}>
                              {s.championshipName} ({s.role})
                            </Badge>
                          ))}
                          {eventScopes.map((s) => (
                            <Badge key={String(s.id)} size="xs" color="violet" variant="light" leftSection={<IconCalendarEvent size={10} />} styles={BADGE_FULL_STYLES}>
                              {s.eventName} ({s.role})
                            </Badge>
                          ))}
                        </Group>
                      ) : (
                        <Text size="xs" c="dimmed">—</Text>
                      )}
                    </Table.Td>
                    {isOwner && (
                      <Table.Td>
                        <MemberMenu
                          showEditScopes
                          showImpersonate={!!showImpersonate}
                          showResend={isPending}
                          onEditScopes={() =>
                            setEditMemberModal({
                              member,
                              user: memberUser,
                              championshipScopes,
                              eventScopes,
                            })
                          }
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
              }
            )}
          </Table.Tbody>
        </Table>
        {!filteredRows.ownerIncluded && filteredRows.filteredMembers.length === 0 && (
          <Text c="dimmed" ta="center" py="md">
            {ownerDisplay || members.length > 0
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
            <Text size="xs" c="dimmed">
              To add championship or event scopes, invite the member first, then click{' '}
              <strong>Edit role & scopes</strong> on their row.
            </Text>
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

      {/* Edit Member Scopes Modal */}
      {editMemberModal && oid && (
        <MemberEditModal
          member={editMemberModal.member}
          user={editMemberModal.user}
          championshipScopes={editMemberModal.championshipScopes}
          eventScopes={editMemberModal.eventScopes}
          championships={championships.filter((c: Championship) => c.orgId === oid)}
          events={events.filter((e: Event) => e.orgId === oid)}
          onClose={() => setEditMemberModal(null)}
          updateOrgMember={updateOrgMember}
          addChampionshipMember={addChampionshipMember}
          updateChampionshipMember={updateChampionshipMember}
          removeChampionshipMember={removeChampionshipMember}
          addEventMember={addEventMember}
          updateEventMember={updateEventMember}
          removeEventMember={removeEventMember}
        />
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

function MemberEditModal({
  member,
  user,
  championshipScopes,
  eventScopes,
  championships,
  events,
  onClose,
  updateOrgMember,
  addChampionshipMember,
  updateChampionshipMember,
  removeChampionshipMember,
  addEventMember,
  updateEventMember,
  removeEventMember,
}: {
  member: OrgMember;
  user: User | undefined;
  championshipScopes: { id: bigint; championshipId: bigint; championshipName: string; role: string }[];
  eventScopes: { id: bigint; eventId: bigint; eventName: string; role: string }[];
  championships: Championship[];
  events: Event[];
  onClose: () => void;
  updateOrgMember: (args: { orgMemberId: bigint; role: string }) => Promise<unknown>;
  addChampionshipMember: (args: {
    championshipId: bigint;
    userId: bigint;
    role: string;
  }) => Promise<unknown>;
  updateChampionshipMember: (args: {
    championshipMemberId: bigint;
    role: string;
  }) => Promise<unknown>;
  removeChampionshipMember: (args: { championshipMemberId: bigint }) => Promise<unknown>;
  addEventMember: (args: {
    eventId: bigint;
    userId: bigint;
    role: string;
  }) => Promise<unknown>;
  updateEventMember: (args: { eventMemberId: bigint; role: string }) => Promise<unknown>;
  removeEventMember: (args: { eventMemberId: bigint }) => Promise<unknown>;
}) {
  const [role, setRole] = useState<'admin' | 'manager' | 'timekeeper'>(
    member.role as 'admin' | 'manager' | 'timekeeper'
  );
  const [addChampId, setAddChampId] = useState<string | null>(null);
  const [addChampRole, setAddChampRole] = useState<'manager' | 'timekeeper'>('manager');
  const [addEventId, setAddEventId] = useState<string | null>(null);
  const [addEventRole, setAddEventRole] = useState<'manager' | 'timekeeper'>('manager');
  const [loading, setLoading] = useState(false);
  const [scopeError, setScopeError] = useState<string | null>(null);
  const [infoModalOpen, setInfoModalOpen] = useState(false);

  const availableChampionships = championships.filter(
    (c) => !championshipScopes.some((s) => s.championshipId === c.id)
  );
  const availableEvents = events.filter(
    (e) => !eventScopes.some((s) => s.eventId === e.id)
  );

  const memberName = user ? user.name || user.email || `User #${member.userId}` : `User #${member.userId}`;

  const handleSaveRole = async () => {
    if (role === member.role) return;
    setLoading(true);
    setScopeError(null);
    try {
      await updateOrgMember({ orgMemberId: member.id, role });
      onClose();
    } catch (e: unknown) {
      setScopeError(getErrorMessage(e, 'Failed to update role'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddChampionship = async () => {
    if (!addChampId || !member.userId) return;
    setLoading(true);
    setScopeError(null);
    try {
      await addChampionshipMember({
        championshipId: BigInt(addChampId),
        userId: member.userId,
        role: addChampRole,
      });
      setAddChampId(null);
    } catch (e: unknown) {
      setScopeError(getErrorMessage(e, 'Failed to add championship scope'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddEvent = async () => {
    if (!addEventId || !member.userId) return;
    setLoading(true);
    setScopeError(null);
    try {
      await addEventMember({
        eventId: BigInt(addEventId),
        userId: member.userId,
        role: addEventRole,
      });
      setAddEventId(null);
    } catch (e: unknown) {
      setScopeError(getErrorMessage(e, 'Failed to add event scope'));
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveChampionship = async (scope: { id: bigint }) => {
    setLoading(true);
    setScopeError(null);
    try {
      await removeChampionshipMember({ championshipMemberId: scope.id });
    } catch (e: unknown) {
      setScopeError(getErrorMessage(e, 'Failed to remove championship scope'));
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveEvent = async (scope: { id: bigint }) => {
    setLoading(true);
    setScopeError(null);
    try {
      await removeEventMember({ eventMemberId: scope.id });
    } catch (e: unknown) {
      setScopeError(getErrorMessage(e, 'Failed to remove event scope'));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateChampionshipRole = async (
    scope: { id: bigint },
    newRole: 'manager' | 'timekeeper'
  ) => {
    setLoading(true);
    setScopeError(null);
    try {
      await updateChampionshipMember({
        championshipMemberId: scope.id,
        role: newRole,
      });
    } catch (e: unknown) {
      setScopeError(getErrorMessage(e, 'Failed to update championship role'));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEventRole = async (
    scope: { id: bigint },
    newRole: 'manager' | 'timekeeper'
  ) => {
    setLoading(true);
    setScopeError(null);
    try {
      await updateEventMember({
        eventMemberId: scope.id,
        role: newRole,
      });
    } catch (e: unknown) {
      setScopeError(getErrorMessage(e, 'Failed to update event role'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <MModal opened onClose={onClose} title={`Edit roles & scopes: ${memberName}`} size="lg">
      <Stack gap="lg">
        {scopeError && (
          <Text size="sm" c="red">
            {scopeError}
          </Text>
        )}

        <Box>
          <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb="xs">
            Organization role
          </Text>
          <Group gap="xs" align="flex-start">
            <Select
              value={role}
              onChange={(v) =>
                setRole((v as 'admin' | 'manager' | 'timekeeper') || 'manager')
              }
              data={[
                { value: 'admin', label: 'Admin' },
                { value: 'manager', label: 'Manager' },
                { value: 'timekeeper', label: 'Timekeeper' },
              ]}
              style={{ width: 140 }}
            />
            {role !== member.role && (
              <Button size="xs" loading={loading} onClick={handleSaveRole}>
                Save role
              </Button>
            )}
          </Group>
        </Box>

        <Box>
          <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb="xs">
            Championship scopes
          </Text>
          <Text size="xs" c="dimmed" mb="xs">
            Grant access to specific championships. Manager: manage events, tracks, riders, schedule. Timekeeper: timekeeping only.
          </Text>
          {championshipScopes.length > 0 && (
            <Stack gap="xs" mb="sm">
              {championshipScopes.map((s) => (
                <Group key={String(s.id)} justify="space-between" wrap="nowrap">
                  <Group gap="xs">
                    <Badge size="sm" color="blue" variant="light" leftSection={<IconTrophy size={12} />} styles={BADGE_FULL_STYLES}>
                      {s.championshipName}
                    </Badge>
                    <Select
                      value={s.role}
                      onChange={(v) =>
                        handleUpdateChampionshipRole(s, (v as 'manager' | 'timekeeper') || 'manager')
                      }
                      data={[
                        { value: 'manager', label: 'Manager' },
                        { value: 'timekeeper', label: 'Timekeeper' },
                      ]}
                      size="xs"
                      style={{ width: 110 }}
                      disabled={loading}
                    />
                  </Group>
                  <ActionIcon
                    size="sm"
                    color="red"
                    variant="subtle"
                    onClick={() => handleRemoveChampionship(s)}
                    disabled={loading}
                  >
                    <IconTrash size={14} />
                  </ActionIcon>
                </Group>
              ))}
            </Stack>
          )}
          {availableChampionships.length > 0 && (
            <Group gap="xs" align="center">
              <Select
                placeholder="Add championship..."
                value={addChampId}
                onChange={setAddChampId}
                data={availableChampionships.map((c) => ({
                  value: String(c.id),
                  label: c.name,
                }))}
                searchable
                clearable
                style={{ flex: 1 }}
              />
              <Group gap={2}>
                <Select
                  value={addChampRole}
                  onChange={(v) =>
                    setAddChampRole((v as 'manager' | 'timekeeper') || 'manager')
                  }
                  data={[
                    { value: 'manager', label: 'Manager' },
                    { value: 'timekeeper', label: 'Timekeeper' },
                  ]}
                  style={{ width: 110 }}
                />
              </Group>
              <Button size="xs" onClick={handleAddChampionship} disabled={!addChampId || loading}>
                Add
              </Button>
            </Group>
          )}
          {championshipScopes.length === 0 && availableChampionships.length === 0 && (
            <Text size="sm" c="dimmed">
              No championships in this org. Create one first.
            </Text>
          )}
        </Box>

        <Box>
          <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb="xs">
            Event scopes
          </Text>
          <Text size="xs" c="dimmed" mb="xs">
            Grant access to specific events. Manager: manage tracks, categories, riders, schedule. Timekeeper: timekeeping only.
          </Text>
          {eventScopes.length > 0 && (
            <Stack gap="xs" mb="sm">
              {eventScopes.map((s) => (
                <Group key={String(s.id)} justify="space-between" wrap="nowrap">
                  <Group gap="xs">
                    <Badge size="sm" color="violet" variant="light" leftSection={<IconCalendarEvent size={12} />} styles={BADGE_FULL_STYLES}>
                      {s.eventName}
                    </Badge>
                    <Select
                      value={s.role}
                      onChange={(v) =>
                        handleUpdateEventRole(s, (v as 'manager' | 'timekeeper') || 'manager')
                      }
                      data={[
                        { value: 'manager', label: 'Manager' },
                        { value: 'timekeeper', label: 'Timekeeper' },
                      ]}
                      size="xs"
                      style={{ width: 110 }}
                      disabled={loading}
                    />
                  </Group>
                  <ActionIcon
                    size="sm"
                    color="red"
                    variant="subtle"
                    onClick={() => handleRemoveEvent(s)}
                    disabled={loading}
                  >
                    <IconTrash size={14} />
                  </ActionIcon>
                </Group>
              ))}
            </Stack>
          )}
          {availableEvents.length > 0 && (
            <Group gap="xs" align="center">
              <Select
                placeholder="Add event..."
                value={addEventId}
                onChange={setAddEventId}
                data={availableEvents.map((e) => ({
                  value: String(e.id),
                  label: e.name,
                }))}
                searchable
                clearable
                style={{ flex: 1 }}
              />
              <Group gap={2}>
                <Select
                  value={addEventRole}
                  onChange={(v) =>
                    setAddEventRole((v as 'manager' | 'timekeeper') || 'manager')
                  }
                  data={[
                    { value: 'manager', label: 'Manager' },
                    { value: 'timekeeper', label: 'Timekeeper' },
                  ]}
                  style={{ width: 110 }}
                />
              </Group>
              <Button size="xs" onClick={handleAddEvent} disabled={!addEventId || loading}>
                Add
              </Button>
            </Group>
          )}
          {eventScopes.length === 0 && availableEvents.length === 0 && (
            <Text size="sm" c="dimmed">
              No events in this org. Create one first.
            </Text>
          )}
        </Box>

        <Group justify="space-between">
          <Button
            variant="subtle"
            size="xs"
            leftSection={<IconInfoCircle size={14} />}
            onClick={() => setInfoModalOpen(true)}
          >
            More information
          </Button>
          <Button variant="subtle" onClick={onClose}>
            Done
          </Button>
        </Group>
      </Stack>
    </MModal>
    <RolesPermissionsModal opened={infoModalOpen} onClose={() => setInfoModalOpen(false)} />
    </>
  );
}

function MemberMenu({
  showEditScopes,
  showImpersonate,
  showResend,
  onEditScopes,
  onImpersonate,
  onResend,
  onRemove,
}: {
  showEditScopes?: boolean;
  showImpersonate: boolean;
  showResend: boolean;
  onEditScopes?: () => void;
  onImpersonate: () => void;
  onResend: () => void;
  onRemove: () => void;
}) {
  const items: ActionMenuItem[] = [];
  if (showEditScopes && onEditScopes)
    items.push({ icon: IconPencil, label: 'Edit role & scopes', onClick: onEditScopes });
  if (showImpersonate) items.push({ icon: IconUser, label: 'Impersonate', onClick: onImpersonate });
  if (showResend) items.push({ icon: IconMail, label: 'Resend invitation', onClick: onResend });
  items.push({ icon: IconTrash, label: 'Remove', onClick: onRemove, danger: true });
  return <RowActionMenu items={items} />;
}
