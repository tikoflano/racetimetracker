import { useMemo, useState } from "react";
import {
  ActionIcon,
  Avatar,
  Badge,
  Box,
  Button,
  Collapse,
  Group,
  Indicator,
  Menu,
  Modal,
  Paper,
  Popover,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from "@mantine/core";
import type { BadgeProps } from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { DataTable, type DataTableSortStatus } from "mantine-datatable";
import {
  IconDotsVertical,
  IconUserPlus,
  IconArrowLeftRight,
  IconLogout,
  IconPencil,
  IconUser,
  IconMail,
  IconTrash,
  IconSearch,
  IconFilter,
  IconX,
  IconShieldStar,
  IconShield,
  IconUserCog,
  IconClock,
  IconUsers,
  IconBuilding,
  IconTrophy,
  IconCalendarEvent,
  IconChevronDown,
  IconChevronRight,
  IconInfoCircle,
} from "@tabler/icons-react";

/** Styles to disable Badge truncation so full text is visible */
const BADGE_FULL_STYLES: BadgeProps["styles"] = {
  root: { overflow: "visible", minWidth: "max-content" },
  label: { overflow: "visible", textOverflow: "unset" },
};

import { useTable, useReducer } from "spacetimedb/react";
import { tables, reducers } from "@/module_bindings";
import { useAuth } from "@/auth";
import type {
  Organization,
  OrgMember,
  User,
  Championship,
  ChampionshipMember,
  Event,
  EventMember,
} from "@/module_bindings/types";

type MemberStatus = "active" | "pending";
type MemberRole = "owner" | "admin" | "manager" | "timekeeper";

interface ScopeChampionship {
  id: bigint;
  championshipId: bigint;
  championshipName: string;
  role: "manager" | "timekeeper";
}

interface ScopeEvent {
  id: bigint;
  eventId: bigint;
  eventName: string;
  role: "manager" | "timekeeper";
}

interface MemberRow {
  id: string;
  name: string;
  email: string;
  status: MemberStatus;
  role: MemberRole;
  userId?: bigint;
  orgMemberId?: bigint;
  isPending?: boolean;
  championshipScopes: ScopeChampionship[];
  eventScopes: ScopeEvent[];
}

const ROLE_FILTER_OPTIONS = [
  "all",
  "owner",
  "admin",
  "manager",
  "timekeeper",
] as const;

type RoleFilter = (typeof ROLE_FILTER_OPTIONS)[number];

const ROLE_LABELS: Record<MemberRole | "all", string> = {
  all: "All",
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  timekeeper: "Timekeeper",
};

const ROLE_COLORS: Record<MemberRole | "all", string> = {
  all: "gray",
  owner: "blue",
  admin: "green",
  manager: "orange",
  timekeeper: "gray",
};

const ROLE_ICONS: Record<MemberRole | "all", React.ReactNode> = {
  all: <IconUsers size={14} />,
  owner: <IconShieldStar size={14} />,
  admin: <IconShield size={14} />,
  manager: <IconUserCog size={14} />,
  timekeeper: <IconClock size={14} />,
};

const ROLES_PERMISSIONS_ROWS: {
  scope: string;
  scopeIcon: React.ReactNode;
  scopeColor: string;
  role: string;
  roleIcon: React.ReactNode;
  roleColor: string;
  access: string;
}[] = [
  { scope: "Organization", scopeIcon: <IconBuilding size={12} />, scopeColor: "green", role: "Owner", roleIcon: <IconShieldStar size={12} />, roleColor: "blue", access: "Full access: manage org, members, championships, events, locations, riders, and timekeeping." },
  { scope: "Organization", scopeIcon: <IconBuilding size={12} />, scopeColor: "green", role: "Admin", roleIcon: <IconShield size={12} />, roleColor: "green", access: "Manage org and members (invite, remove, rename). Full access to championships, events, locations, riders, and timekeeping." },
  { scope: "Organization", scopeIcon: <IconBuilding size={12} />, scopeColor: "green", role: "Manager", roleIcon: <IconUserCog size={12} />, roleColor: "orange", access: "Manage championships, events, locations, riders. Can organize events and assign timekeepers. Cannot manage org members." },
  { scope: "Organization", scopeIcon: <IconBuilding size={12} />, scopeColor: "green", role: "Timekeeper", roleIcon: <IconClock size={12} />, roleColor: "gray", access: "Timekeeping only: start/finish runs, DNF, DNS at any event in the org." },
  { scope: "Championship", scopeIcon: <IconTrophy size={12} />, scopeColor: "blue", role: "Manager", roleIcon: <IconUserCog size={12} />, roleColor: "orange", access: "Manage this championship's events, tracks, categories, riders, schedule, timekeeper assignments." },
  { scope: "Championship", scopeIcon: <IconTrophy size={12} />, scopeColor: "blue", role: "Timekeeper", roleIcon: <IconClock size={12} />, roleColor: "gray", access: "Timekeeping at this championship's events." },
  { scope: "Event", scopeIcon: <IconCalendarEvent size={12} />, scopeColor: "violet", role: "Manager", roleIcon: <IconUserCog size={12} />, roleColor: "orange", access: "Manage this event: tracks, categories, riders, schedule, timekeeper assignments." },
  { scope: "Event", scopeIcon: <IconCalendarEvent size={12} />, scopeColor: "violet", role: "Timekeeper", roleIcon: <IconClock size={12} />, roleColor: "gray", access: "Timekeeping at this event." },
];

function RolesPermissionsModal({
  opened,
  onClose,
}: {
  opened: boolean;
  onClose: () => void;
}) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Roles & permissions"
      size="lg"
    >
      <Paper p="md" withBorder style={{ background: "#13151b", border: "1px solid #1e2028" }}>
        <Table withTableBorder={false} withColumnBorders={false} highlightOnHover style={{ tableLayout: "auto" }}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ whiteSpace: "nowrap" }}>Scope</Table.Th>
              <Table.Th style={{ whiteSpace: "nowrap" }}>Role</Table.Th>
              <Table.Th>Access</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {ROLES_PERMISSIONS_ROWS.map((row, i) => (
              <Table.Tr key={i}>
                <Table.Td style={{ whiteSpace: "nowrap" }}>
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
                <Table.Td style={{ whiteSpace: "nowrap" }}>
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
    </Modal>
  );
}

function getErrorMessage(e: unknown, fallback: string): string {
  if (e instanceof Error && e.message) return e.message;
  return fallback;
}

function MemberEditModal({
  member,
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
  member: MemberRow;
  championships: Championship[];
  events: Event[];
  onClose: () => void;
  updateOrgMember: (args: {
    orgMemberId: bigint;
    role: string;
  }) => Promise<unknown>;
  addChampionshipMember: (args: {
    championshipId: bigint;
    userId: bigint;
    role: string;
  }) => Promise<unknown>;
  updateChampionshipMember: (args: {
    championshipMemberId: bigint;
    role: string;
  }) => Promise<unknown>;
  removeChampionshipMember: (args: {
    championshipMemberId: bigint;
  }) => Promise<unknown>;
  addEventMember: (args: {
    eventId: bigint;
    userId: bigint;
    role: string;
  }) => Promise<unknown>;
  updateEventMember: (args: {
    eventMemberId: bigint;
    role: string;
  }) => Promise<unknown>;
  removeEventMember: (args: { eventMemberId: bigint }) => Promise<unknown>;
}) {
  const [role, setRole] = useState<"admin" | "manager" | "timekeeper">(
    member.role === "owner" ? "admin" : (member.role as "admin" | "manager" | "timekeeper")
  );
  const [addChampId, setAddChampId] = useState<string | null>(null);
  const [addChampRole, setAddChampRole] = useState<"manager" | "timekeeper">("manager");
  const [addEventId, setAddEventId] = useState<string | null>(null);
  const [addEventRole, setAddEventRole] = useState<"manager" | "timekeeper">("manager");
  const [loading, setLoading] = useState(false);
  const [scopeError, setScopeError] = useState<string | null>(null);
  const [infoModalOpen, setInfoModalOpen] = useState(false);

  const availableChampionships = championships.filter(
    (c) => !member.championshipScopes.some((s) => s.championshipId === c.id)
  );
  const availableEvents = events.filter(
    (e) => !member.eventScopes.some((s) => s.eventId === e.id)
  );

  const handleSaveRole = async () => {
    if (member.role === "owner" || !member.orgMemberId) return;
    if (role === member.role) return;
    setLoading(true);
    setScopeError(null);
    try {
      await updateOrgMember({ orgMemberId: member.orgMemberId, role });
      onClose();
    } catch (e: unknown) {
      setScopeError(getErrorMessage(e, "Failed to update role"));
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
      setScopeError(getErrorMessage(e, "Failed to add championship scope"));
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
      setScopeError(getErrorMessage(e, "Failed to add event scope"));
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveChampionship = async (scope: ScopeChampionship) => {
    setLoading(true);
    setScopeError(null);
    try {
      await removeChampionshipMember({ championshipMemberId: scope.id });
    } catch (e: unknown) {
      setScopeError(getErrorMessage(e, "Failed to remove championship scope"));
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveEvent = async (scope: ScopeEvent) => {
    setLoading(true);
    setScopeError(null);
    try {
      await removeEventMember({ eventMemberId: scope.id });
    } catch (e: unknown) {
      setScopeError(getErrorMessage(e, "Failed to remove event scope"));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateChampionshipRole = async (
    scope: ScopeChampionship,
    newRole: "manager" | "timekeeper"
  ) => {
    if (scope.role === newRole) return;
    setLoading(true);
    setScopeError(null);
    try {
      await updateChampionshipMember({
        championshipMemberId: scope.id,
        role: newRole,
      });
    } catch (e: unknown) {
      setScopeError(getErrorMessage(e, "Failed to update championship role"));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEventRole = async (
    scope: ScopeEvent,
    newRole: "manager" | "timekeeper"
  ) => {
    if (scope.role === newRole) return;
    setLoading(true);
    setScopeError(null);
    try {
      await updateEventMember({
        eventMemberId: scope.id,
        role: newRole,
      });
    } catch (e: unknown) {
      setScopeError(getErrorMessage(e, "Failed to update event role"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <Modal
      opened
      onClose={onClose}
      title={
        <Group gap="sm">
          <ThemeIcon size={36} radius="md" color="green" variant="light">
            <IconUsers size={20} />
          </ThemeIcon>
          <div>
            <Text size="xs" c="green.4" tt="uppercase" fw={600} lh={1}>
              Permissions
            </Text>
            <Text fw={700} size="lg" lh={1.3}>
              Edit roles &amp; scopes
            </Text>
          </div>
        </Group>
      }
      size="lg"
      centered
      radius="md"
      overlayProps={{ blur: 3 }}
      styles={{
        header: {
          background: "linear-gradient(135deg, #1a3a2a 0%, #1e5c3a 60%, #237a4b 100%)",
          borderBottom: "1px solid #1a3a2a",
        },
        close: { color: "white" },
      }}
    >
      <Stack gap="lg" pt="xs">
        {scopeError && (
          <Text size="sm" c="red">
            {scopeError}
          </Text>
        )}

        {/* Org role */}
        <Box>
          <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb="xs">
            Organization role
          </Text>
          {member.role === "owner" ? (
            <Badge color="green" variant="light" size="lg" styles={BADGE_FULL_STYLES}>
              Owner (full access)
            </Badge>
          ) : (
            <Group gap="xs" align="flex-start">
              <Select
                value={role}
                onChange={(v) =>
                  setRole((v as "admin" | "manager" | "timekeeper") || "manager")
                }
                data={[
                  { value: "admin", label: "Admin" },
                  { value: "manager", label: "Manager" },
                  { value: "timekeeper", label: "Timekeeper" },
                ]}
                style={{ width: 140 }}
              />
              {role !== member.role && (
                <Button
                  size="xs"
                  loading={loading}
                  onClick={handleSaveRole}
                >
                  Save role
                </Button>
              )}
            </Group>
          )}
        </Box>

        {/* Championship scopes */}
        <Box>
          <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb="xs">
            Championship scopes
          </Text>
          <Text size="xs" c="dimmed" mb="xs">
            Grant access to specific championships. Manager: manage events, tracks, riders, schedule. Timekeeper: timekeeping only.
          </Text>
          {member.championshipScopes.length > 0 && (
            <Stack gap="xs" mb="sm">
              {member.championshipScopes.map((s) => (
                <Group key={String(s.id)} justify="space-between" wrap="nowrap">
                  <Group gap="xs">
                    <Badge
                      size="sm"
                      color="blue"
                      variant="light"
                      leftSection={<IconTrophy size={12} />}
                      styles={BADGE_FULL_STYLES}
                    >
                      {s.championshipName}
                    </Badge>
                    <Select
                      value={s.role}
                      onChange={(v) =>
                        handleUpdateChampionshipRole(
                          s,
                          (v as "manager" | "timekeeper") || "manager"
                        )
                      }
                      data={[
                        { value: "manager", label: "Manager" },
                        { value: "timekeeper", label: "Timekeeper" },
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
              <Select
                value={addChampRole}
                onChange={(v) =>
                  setAddChampRole((v as "manager" | "timekeeper") || "manager")
                }
                data={[
                  { value: "manager", label: "Manager" },
                  { value: "timekeeper", label: "Timekeeper" },
                ]}
                style={{ width: 110 }}
              />
              <Button
                size="xs"
                onClick={handleAddChampionship}
                disabled={!addChampId || loading}
              >
                Add
              </Button>
            </Group>
          )}
          {member.championshipScopes.length === 0 &&
            availableChampionships.length === 0 && (
              <Text size="sm" c="dimmed">
                No championships in this org. Create one first.
              </Text>
            )}
        </Box>

        {/* Event scopes */}
        <Box>
          <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb="xs">
            Event scopes
          </Text>
          <Text size="xs" c="dimmed" mb="xs">
            Grant access to specific events. Manager: manage tracks, categories, riders, schedule. Timekeeper: timekeeping only.
          </Text>
          {member.eventScopes.length > 0 && (
            <Stack gap="xs" mb="sm">
              {member.eventScopes.map((s) => (
                <Group key={String(s.id)} justify="space-between" wrap="nowrap">
                  <Group gap="xs">
                    <Badge
                      size="sm"
                      color="violet"
                      variant="light"
                      leftSection={<IconCalendarEvent size={12} />}
                      styles={BADGE_FULL_STYLES}
                    >
                      {s.eventName}
                    </Badge>
                    <Select
                      value={s.role}
                      onChange={(v) =>
                        handleUpdateEventRole(
                          s,
                          (v as "manager" | "timekeeper") || "manager"
                        )
                      }
                      data={[
                        { value: "manager", label: "Manager" },
                        { value: "timekeeper", label: "Timekeeper" },
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
              <Select
                value={addEventRole}
                onChange={(v) =>
                  setAddEventRole((v as "manager" | "timekeeper") || "manager")
                }
                data={[
                  { value: "manager", label: "Manager" },
                  { value: "timekeeper", label: "Timekeeper" },
                ]}
                style={{ width: 110 }}
              />
              <Button
                size="xs"
                onClick={handleAddEvent}
                disabled={!addEventId || loading}
              >
                Add
              </Button>
            </Group>
          )}
          {member.eventScopes.length === 0 && availableEvents.length === 0 && (
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
          <Button onClick={onClose}>
            Save
          </Button>
        </Group>
      </Stack>
    </Modal>
    <RolesPermissionsModal opened={infoModalOpen} onClose={() => setInfoModalOpen(false)} />
    </>
  );
}

function sortRecords(
  records: MemberRow[],
  sortStatus: DataTableSortStatus<MemberRow>
): MemberRow[] {
  const key = sortStatus.columnAccessor as keyof MemberRow;
  const dir = sortStatus.direction === "asc" ? 1 : -1;
  return [...records].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    if (aVal === bVal) return 0;
    const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
    return cmp * dir;
  });
}


export function MembersView() {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [orgs] = useTable(tables.organization);
  const [orgMembers] = useTable(tables.org_member);
  const [users] = useTable(tables.user);
  const [championships] = useTable(tables.championship);
  const [championshipMembers] = useTable(tables.championship_member);
  const [events] = useTable(tables.event);
  const [eventMembers] = useTable(tables.event_member);

  const { canImpersonate: userCanImpersonate } = useAuth();
  const inviteOrgMember = useReducer(reducers.inviteOrgMember);
  const resendOrgInvitation = useReducer(reducers.resendOrgInvitation);
  const removeOrgMember = useReducer(reducers.removeOrgMember);
  const updateOrgMember = useReducer(reducers.updateOrgMember);
  const renameOrganization = useReducer(reducers.renameOrganization);
  const transferOrgOwnership = useReducer(reducers.transferOrgOwnership);
  const leaveOrganization = useReducer(reducers.leaveOrganization);
  const startImpersonation = useReducer(reducers.startImpersonation);
  const addChampionshipMember = useReducer(reducers.addChampionshipMember);
  const updateChampionshipMember = useReducer(reducers.updateChampionshipMember);
  const removeChampionshipMember = useReducer(reducers.removeChampionshipMember);
  const addEventMember = useReducer(reducers.addEventMember);
  const updateEventMember = useReducer(reducers.updateEventMember);
  const removeEventMember = useReducer(reducers.removeEventMember);

  const [search, setSearch] = useState("");
  const [roleFilters, setRoleFilters] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<MemberRow>>({
    columnAccessor: "name",
    direction: "asc",
  });
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "manager" | "timekeeper">("manager");
  const [transferTargetId, setTransferTargetId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renameName, setRenameName] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);
  const [editMemberModal, setEditMemberModal] = useState<MemberRow | null>(null);
  const [inviteScopesOpen, { toggle: toggleInviteScopes }] = useDisclosure(false);

  const activeOrg = useMemo<Organization | null>(() => {
    if (orgs.length === 0) return null;
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("active_org_id");
      if (stored) {
        const id = BigInt(stored);
        const found = orgs.find((o: Organization) => o.id === id);
        if (found) return found;
      }
    }
    return orgs[0] as Organization;
  }, [orgs]);

  const orgId = activeOrg?.id ?? null;

  const { memberRows, roleCounts, adminCandidates } = useMemo(() => {
    if (!orgId || orgs.length === 0) {
      return {
        memberRows: [] as MemberRow[],
        roleCounts: {
          all: 0,
          owner: 0,
          admin: 0,
          manager: 0,
          timekeeper: 0,
        } as Record<RoleFilter, number>,
        adminCandidates: [] as MemberRow[],
      };
    }

    const org = activeOrg as Organization;
    const ownerUser =
      users.find((u: User) => u.id === org.ownerUserId) ?? null;

    const rows: MemberRow[] = [];
    const orgChampionships = championships.filter(
      (c: Championship) => c.orgId === org.id
    );
    const orgEvents = events.filter((e: Event) => e.orgId === org.id);

    const getChampionshipScopes = (userId: bigint): ScopeChampionship[] => {
      return championshipMembers
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
            role: cm.role as "manager" | "timekeeper",
          };
        });
    };

    const getEventScopes = (userId: bigint): ScopeEvent[] => {
      return eventMembers
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
            role: em.role as "manager" | "timekeeper",
          };
        });
    };

    // Always show owner when org has ownerUserId; use fallback if User not found
    if (org.ownerUserId) {
      rows.push({
        id: `owner-${String(org.id)}-${String(org.ownerUserId)}`,
        name: ownerUser
          ? ownerUser.name || ownerUser.email || `User #${ownerUser.id}`
          : `User #${org.ownerUserId}`,
        email: ownerUser?.email || "",
        status: "active",
        role: "owner",
        userId: org.ownerUserId,
        isPending: false,
        championshipScopes: getChampionshipScopes(org.ownerUserId),
        eventScopes: getEventScopes(org.ownerUserId),
      });
    }

    const seenUserIds = new Set<string>();
    if (org.ownerUserId) seenUserIds.add(String(org.ownerUserId));

    const orgMembersForOrg = orgMembers.filter(
      (m: OrgMember) => m.orgId === org.id
    );

    for (const m of orgMembersForOrg) {
      const userIdKey = String(m.userId);
      if (seenUserIds.has(userIdKey)) continue;
      seenUserIds.add(userIdKey);
      const u = users.find((user: User) => user.id === m.userId) ?? null;
      const isPending = !!u?.googleSub?.startsWith("pending:");
      rows.push({
        id: `member-${String(org.id)}-${String(m.id)}`,
        name: u ? u.name || u.email || `User #${u.id}` : `User #${m.userId}`,
        email: u?.email || "",
        status: isPending ? "pending" : "active",
        role: m.role as MemberRole,
        userId: u?.id,
        orgMemberId: m.id,
        isPending,
        championshipScopes: getChampionshipScopes(m.userId),
        eventScopes: getEventScopes(m.userId),
      });
    }

    const roleCounts: Record<RoleFilter, number> = {
      all: rows.length,
      owner: rows.filter((m) => m.role === "owner").length,
      admin: rows.filter((m) => m.role === "admin").length,
      manager: rows.filter((m) => m.role === "manager").length,
      timekeeper: rows.filter((m) => m.role === "timekeeper").length,
    };

    const adminCandidates = rows.filter(
      (m) => m.role === "admin" && m.status === "active" && m.userId != null
    );

    return { memberRows: rows, roleCounts, adminCandidates };
  }, [
    activeOrg,
    orgId,
    orgMembers,
    orgs.length,
    users,
    championships,
    championshipMembers,
    events,
    eventMembers,
  ]);

  const filteredAndSortedRecords = useMemo(() => {
    const q = search.toLowerCase().trim();
    const matchesSearch = (row: MemberRow) => {
      if (!q) return true;
      return (
        row.name.toLowerCase().includes(q) || row.email.toLowerCase().includes(q)
      );
    };
    const matchesRole = (row: MemberRow) => {
      if (roleFilters.length === 0) return true;
      return roleFilters.includes(row.role);
    };
    const filtered = memberRows.filter(
      (row) => matchesSearch(row) && matchesRole(row)
    );
    return sortRecords(filtered, sortStatus);
  }, [memberRows, roleFilters, search, sortStatus]);

  const handleInvite = async () => {
    if (!orgId) return;
    setError(null);
    const email = inviteEmail.trim();
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    try {
      await inviteOrgMember({
        orgId,
        email,
        name: inviteName.trim(),
        role: inviteRole,
      });
      setInviteName("");
      setInviteEmail("");
      setInviteRole("manager");
      setInviteModalOpen(false);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to invite member"));
    }
  };

  const handleTransfer = async () => {
    if (!orgId || !transferTargetId) return;
    if (
      !confirm(
        "Are you sure you want to transfer ownership? You will become a regular admin."
      )
    ) {
      return;
    }
    setError(null);
    try {
      await transferOrgOwnership({
        orgId,
        newOwnerUserId: BigInt(transferTargetId),
      });
      setTransferTargetId(null);
      setTransferModalOpen(false);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to transfer ownership"));
    }
  };

  const handleLeave = async () => {
    if (!orgId) return;
    if (!confirm("Are you sure you want to leave this organization?")) return;
    setError(null);
    try {
      await leaveOrganization({ orgId });
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to leave organization"));
    }
  };

  const handleImpersonate = async (member: MemberRow) => {
    if (!member.userId) return;
    setError(null);
    try {
      await startImpersonation({ targetUserId: member.userId });
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to start impersonation"));
    }
  };

  const handleResendInvite = async (member: MemberRow) => {
    if (!member.orgMemberId) return;
    setError(null);
    try {
      await resendOrgInvitation({ orgMemberId: member.orgMemberId });
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to resend invitation"));
    }
  };

  const handleRemove = async (member: MemberRow) => {
    if (!member.orgMemberId) return;
    setError(null);
    try {
      await removeOrgMember({ orgMemberId: member.orgMemberId });
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to remove member"));
    }
  };

  const handleRename = async () => {
    if (!orgId) return;
    setRenameError(null);
    const trimmed = renameName.trim();
    if (!trimmed) {
      setRenameError("Name cannot be empty");
      return;
    }
    if (trimmed === activeOrg?.name) {
      setRenameModalOpen(false);
      return;
    }
    try {
      await renameOrganization({ orgId, name: trimmed });
      setRenameModalOpen(false);
    } catch (e: unknown) {
      setRenameError(getErrorMessage(e, "Failed to rename organization"));
    }
  };

  if (orgs.length === 0) {
    return (
      <Stack gap="lg">
        <Title order={2} fw={700}>
          Members
        </Title>
        <Paper withBorder p="xl">
          <Text c="dimmed" ta="center">
            No organizations found. Create an organization in the main app to manage members here.
          </Text>
        </Paper>
      </Stack>
    );
  }

  return (
    <Stack gap="lg">
      {/* Header Banner */}
      <Box
        p={isMobile ? "md" : "xl"}
        style={{
          background: "linear-gradient(135deg, #1a3a2a 0%, #1e5c3a 60%, #237a4b 100%)",
          borderRadius: "var(--mantine-radius-md)",
          border: "1px solid #1a3a2a",
        }}
      >
        <Group justify="space-between" align="center" wrap="nowrap" gap="sm">
          <Group gap="sm" align="center" style={{ minWidth: 0 }}>
            {!isMobile && (
              <ThemeIcon size={52} radius="md" color="green" variant="light">
                <IconBuilding size={28} />
              </ThemeIcon>
            )}
            <div style={{ minWidth: 0 }}>
              {!isMobile && (
                <Text size="xs" c="green.3" tt="uppercase" fw={600} mb={2}>
                  Organization
                </Text>
              )}
              <Title order={isMobile ? 4 : 2} c="white" fw={700} style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {activeOrg?.name ?? "Organization"}
              </Title>
              <Text size={isMobile ? "xs" : "sm"} c="green.2" mt={2}>
                {roleCounts.all} member{roleCounts.all !== 1 ? "s" : ""}
                {!isMobile && " · manage roles and permissions"}
              </Text>
            </div>
          </Group>
          <Group gap="sm" style={{ flexShrink: 0 }}>
            {!isMobile && (
              <Button
                leftSection={<IconUserPlus size={16} />}
                variant="white"
                color="dark"
                onClick={() => setInviteModalOpen(true)}
              >
                Invite Member
              </Button>
            )}
            <Menu shadow="md" width={220} position="bottom-end">
              <Menu.Target>
                <ActionIcon variant="subtle" size="lg" color="gray">
                  <IconDotsVertical size={18} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                {isMobile && (
                  <>
                    <Menu.Item
                      leftSection={<IconUserPlus size={14} />}
                      onClick={() => setInviteModalOpen(true)}
                    >
                      Invite Member
                    </Menu.Item>
                    <Menu.Divider />
                  </>
                )}
                <Menu.Item
                  leftSection={<IconArrowLeftRight size={14} />}
                  onClick={() => setTransferModalOpen(true)}
                  disabled={adminCandidates.length === 0}
                >
                  Transfer ownership
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconPencil size={14} />}
                  onClick={() => {
                    if (!activeOrg) return;
                    setRenameName(activeOrg.name);
                    setRenameError(null);
                    setRenameModalOpen(true);
                  }}
                >
                  Rename organization
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  leftSection={<IconLogout size={14} />}
                  color="red"
                  onClick={handleLeave}
                >
                  Leave organization
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </Box>

      {/* Filter + Search */}
      <Paper
        p="sm"
        style={{ background: "#13151b", border: "1px solid #1e2028" }}
      >
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
                disabled={roleFilters.length === 0}
                label={roleFilters.length}
                size={16}
                color="blue"
              >
                <ActionIcon
                  variant={roleFilters.length > 0 ? "filled" : "subtle"}
                  color={roleFilters.length > 0 ? "blue" : "gray"}
                  size="md"
                  onClick={() => setFilterOpen((o) => !o)}
                  aria-label="Filter by role"
                >
                  <IconFilter size={16} />
                </ActionIcon>
              </Indicator>
            </Popover.Target>
            <Popover.Dropdown p="sm">
              <Stack gap="xs">
                {(["owner", "admin", "manager", "timekeeper"] as MemberRole[]).map((r) => {
                  const selected = roleFilters.includes(r);
                  return (
                    <Badge
                      key={r}
                      size="lg"
                      color={ROLE_COLORS[r]}
                      variant={selected ? "filled" : "light"}
                      leftSection={ROLE_ICONS[r]}
                      styles={BADGE_FULL_STYLES}
                      style={{ cursor: "pointer" }}
                      onClick={() =>
                        setRoleFilters((prev) =>
                          selected ? prev.filter((v) => v !== r) : [...prev, r]
                        )
                      }
                    >
                      {ROLE_LABELS[r]} ({roleCounts[r]})
                    </Badge>
                  );
                })}
              </Stack>
              {roleFilters.length > 0 && (
                <Button
                  variant="subtle"
                  size="xs"
                  mt="xs"
                  fullWidth
                  onClick={() => setRoleFilters([])}
                >
                  Clear filters
                </Button>
              )}
            </Popover.Dropdown>
          </Popover>
          <Text size="xs" c="dimmed">
            {filteredAndSortedRecords.length === memberRows.length
              ? `${memberRows.length} member${memberRows.length !== 1 ? "s" : ""}`
              : `${filteredAndSortedRecords.length} of ${memberRows.length}`}
          </Text>
          </Group>

          {searchOpen ? (
            <TextInput
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              size="sm"
              leftSection={<IconSearch size={16} />}
              rightSection={
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  color="gray"
                  onClick={() => { setSearchOpen(false); setSearch(""); }}
                >
                  <IconX size={14} />
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
              aria-label="Search members"
            >
              <IconSearch size={16} />
            </ActionIcon>
          )}
        </Group>
      </Paper>

      {/* Members Table */}
      <Paper p="md" withBorder>
        <DataTable<MemberRow>
          withTableBorder={false}
          withColumnBorders={false}
          highlightOnHover
          minHeight={filteredAndSortedRecords.length === 0 ? 150 : undefined}
          records={filteredAndSortedRecords}
          sortStatus={sortStatus}
          onSortStatusChange={setSortStatus}
          noRecordsText={
            memberRows.length > 0
              ? "No members match your search or filter."
              : "No members yet. Invite someone to get started."
          }
          columns={[
            {
              accessor: "name",
              title: "Member",
              sortable: true,
              render: (row) => (
                <Group gap="sm" wrap="nowrap">
                  <Avatar
                    size="sm"
                    radius="xl"
                    color={ROLE_COLORS[row.role]}
                    variant="light"
                    style={{ flexShrink: 0 }}
                  >
                    {row.name.slice(0, 2).toUpperCase()}
                  </Avatar>
                  <div style={{ minWidth: 0 }}>
                    <Text size="sm" fw={500} style={{ lineHeight: 1.3 }}>
                      {row.name}
                    </Text>
                    {row.email && (
                      <Text size="xs" c="dimmed" style={{ lineHeight: 1.3 }} truncate>
                        {row.email}
                      </Text>
                    )}
                    {row.status === "pending" && (
                      <Badge size="xs" color="orange" variant="light" mt={2}>
                        Pending
                      </Badge>
                    )}
                  </div>
                </Group>
              ),
            },
            {
              accessor: "role",
              title: "Role",
              sortable: true,
              render: (row) => (
                <Badge
                  size="sm"
                  color={ROLE_COLORS[row.role]}
                  variant="light"
                  leftSection={ROLE_ICONS[row.role]}
                  styles={BADGE_FULL_STYLES}
                >
                  {ROLE_LABELS[row.role]}
                </Badge>
              ),
            },
            {
              accessor: "scopes" as const,
              title: "Scopes",
              render: (row: MemberRow) => {
                const totalChamp = row.championshipScopes.length;
                const totalEvent = row.eventScopes.length;
                if (totalChamp === 0 && totalEvent === 0) return <Text size="xs" c="dimmed">—</Text>;
                if (isMobile) {
                  return (
                    <Group gap={4}>
                      {totalChamp > 0 && (
                        <Badge size="xs" color="blue" variant="light" leftSection={<IconTrophy size={10} />} styles={BADGE_FULL_STYLES}>
                          {totalChamp}
                        </Badge>
                      )}
                      {totalEvent > 0 && (
                        <Badge size="xs" color="violet" variant="light" leftSection={<IconCalendarEvent size={10} />} styles={BADGE_FULL_STYLES}>
                          {totalEvent}
                        </Badge>
                      )}
                    </Group>
                  );
                }
                return (
                  <Group gap={4} wrap="wrap">
                    {row.championshipScopes.map((s) => (
                      <Badge
                        key={String(s.id)}
                        size="xs"
                        color="blue"
                        variant="light"
                        leftSection={<IconTrophy size={10} />}
                        styles={BADGE_FULL_STYLES}
                      >
                        {s.championshipName} ({s.role})
                      </Badge>
                    ))}
                    {row.eventScopes.map((s) => (
                      <Badge
                        key={String(s.id)}
                        size="xs"
                        color="violet"
                        variant="light"
                        leftSection={<IconCalendarEvent size={10} />}
                        styles={BADGE_FULL_STYLES}
                      >
                        {s.eventName} ({s.role})
                      </Badge>
                    ))}
                  </Group>
                );
              },
            },
            {
              accessor: "actions",
              title: "",
              width: 40,
              render: (row) => {
                if (row.role === "owner") return null;
                const canImpersonate =
                  userCanImpersonate &&
                  row.role !== "admin" &&
                  row.status === "active" &&
                  !!row.userId;
                const isPending = row.status === "pending";
                return (
                  <Menu shadow="md" width={200} position="bottom-end">
                    <Menu.Target>
                      <ActionIcon variant="subtle" size="sm" color="gray">
                        <IconDotsVertical size={14} />
                      </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item
                        leftSection={<IconPencil size={14} />}
                        onClick={() => setEditMemberModal(row)}
                      >
                        Edit role & scopes
                      </Menu.Item>
                      {canImpersonate && (
                        <Menu.Item
                          leftSection={<IconUser size={14} />}
                          onClick={() => handleImpersonate(row)}
                        >
                          Impersonate
                        </Menu.Item>
                      )}
                      {isPending && (
                        <Menu.Item
                          leftSection={<IconMail size={14} />}
                          onClick={() => handleResendInvite(row)}
                        >
                          Resend invitation
                        </Menu.Item>
                      )}
                      <Menu.Item
                        leftSection={<IconTrash size={14} />}
                        color="red"
                        onClick={() => handleRemove(row)}
                      >
                        Remove
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                );
              },
            },
          ]}
        />
      </Paper>

      {/* Invite Modal */}
      <Modal
        opened={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title={
          <Group gap="sm">
            <ThemeIcon size={36} radius="md" color="green" variant="light">
              <IconUserPlus size={20} />
            </ThemeIcon>
            <div>
              <Text size="xs" c="green.4" tt="uppercase" fw={600} lh={1}>
                Organization
              </Text>
              <Text fw={700} size="lg" lh={1.3}>
                Invite Member
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
            background: "linear-gradient(135deg, #1a3a2a 0%, #1e5c3a 60%, #237a4b 100%)",
            borderBottom: "1px solid #1a3a2a",
          },
          close: { color: "white" },
        }}
      >
        <Stack gap="md" pt="xs">
          {error && (
            <Text size="sm" c="red">
              {error}
            </Text>
          )}
          <TextInput
            label="Name"
            placeholder="Name"
            value={inviteName}
            onChange={(e) => setInviteName(e.currentTarget.value)}
          />
          <TextInput
            label="Email address"
            placeholder="Email address"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.currentTarget.value)}
          />
          <Select
            label="Role"
            value={inviteRole}
            onChange={(v) =>
              setInviteRole((v as "admin" | "manager" | "timekeeper") || "manager")
            }
            data={[
              { value: "manager", label: "Manager" },
              { value: "timekeeper", label: "Timekeeper" },
              { value: "admin", label: "Admin" },
            ]}
          />
          <Collapse in={inviteScopesOpen}>
            <Paper p="sm" withBorder mt="xs" style={{ background: "#0d1117" }}>
              <Text size="xs" c="dimmed" mb="xs">
                To add championship or event scopes, invite the member first, then
                click <strong>Edit role & scopes</strong> on their row.
              </Text>
            </Paper>
          </Collapse>
          <Button
            variant="subtle"
            size="xs"
            leftSection={
              inviteScopesOpen ? (
                <IconChevronDown size={14} />
              ) : (
                <IconChevronRight size={14} />
              )
            }
            onClick={toggleInviteScopes}
          >
            {inviteScopesOpen ? "Hide" : "About scopes"}
          </Button>
          <Group gap="xs" justify="flex-end">
            <Button variant="subtle" onClick={() => setInviteModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInvite}>Invite</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Transfer Ownership Modal */}
      <Modal
        opened={transferModalOpen}
        onClose={() => {
          setTransferModalOpen(false);
          setTransferTargetId(null);
        }}
        title={
          <Group gap="sm">
            <ThemeIcon size={36} radius="md" color="green" variant="light">
              <IconArrowLeftRight size={20} />
            </ThemeIcon>
            <div>
              <Text size="xs" c="green.4" tt="uppercase" fw={600} lh={1}>
                Organization
              </Text>
              <Text fw={700} size="lg" lh={1.3}>
                Transfer ownership
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
            background: "linear-gradient(135deg, #1a3a2a 0%, #1e5c3a 60%, #237a4b 100%)",
            borderBottom: "1px solid #1a3a2a",
          },
          close: { color: "white" },
        }}
      >
        <Stack gap="md" pt="xs">
          <Text size="sm" c="dimmed">
            Transfer this organization to another admin. You will become a
            regular admin after the transfer.
          </Text>
          {adminCandidates.length > 0 && (
            <>
              <Select
                label="New owner"
                placeholder="Select admin..."
                value={transferTargetId}
                onChange={setTransferTargetId}
                data={adminCandidates.map((m) => ({
                  value: m.userId ? String(m.userId) : "",
                  label: m.name || m.email,
                }))}
              />
              <Group gap="xs" justify="flex-end">
                <Button
                  variant="subtle"
                  onClick={() => {
                    setTransferModalOpen(false);
                    setTransferTargetId(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleTransfer}
                  disabled={!transferTargetId}
                >
                  Transfer
                </Button>
              </Group>
            </>
          )}
        </Stack>
      </Modal>

      {/* Rename Modal */}
      <Modal
        opened={renameModalOpen}
        onClose={() => {
          setRenameModalOpen(false);
          setRenameError(null);
        }}
        title={
          <Group gap="sm">
            <ThemeIcon size={36} radius="md" color="green" variant="light">
              <IconBuilding size={20} />
            </ThemeIcon>
            <div>
              <Text size="xs" c="green.4" tt="uppercase" fw={600} lh={1}>
                Organization
              </Text>
              <Text fw={700} size="lg" lh={1.3}>
                Rename organization
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
            background: "linear-gradient(135deg, #1a3a2a 0%, #1e5c3a 60%, #237a4b 100%)",
            borderBottom: "1px solid #1a3a2a",
          },
          close: { color: "white" },
        }}
      >
        <Stack gap="md" pt="xs">
          {renameError && (
            <Text size="sm" c="red">
              {renameError}
            </Text>
          )}
          <TextInput
            label="Organization name"
            value={renameName}
            onChange={(e) => setRenameName(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename();
            }}
            autoFocus
          />
          <Group gap="xs" justify="flex-end">
            <Button
              variant="subtle"
              onClick={() => {
                setRenameModalOpen(false);
                setRenameError(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleRename}>Save</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Edit Member Scopes Modal */}
      {editMemberModal && editMemberModal.userId && orgId && (
        <MemberEditModal
          member={editMemberModal}
          championships={championships.filter(
            (c: Championship) => c.orgId === orgId
          )}
          events={events.filter((e: Event) => e.orgId === orgId)}
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
    </Stack>
  );
}
