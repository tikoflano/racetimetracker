import { useMemo, useState } from "react";
import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Menu,
  Modal,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
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
  IconShieldStar,
  IconShield,
  IconUserCog,
  IconClock,
  IconUsers,
} from "@tabler/icons-react";

import { useTable, useReducer } from "spacetimedb/react";
import { tables, reducers } from "@/module_bindings";
import type { Organization, OrgMember, User } from "@/module_bindings/types";

type MemberStatus = "active" | "pending";
type MemberRole = "owner" | "admin" | "manager" | "timekeeper";

interface MemberRow {
  id: string;
  name: string;
  email: string;
  status: MemberStatus;
  role: MemberRole;
  userId?: bigint;
  orgMemberId?: bigint;
  isPending?: boolean;
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
  manager: "yellow",
  timekeeper: "gray",
};

const ROLE_ICONS: Record<MemberRole | "all", React.ReactNode> = {
  all: <IconUsers size={14} />,
  owner: <IconShieldStar size={14} />,
  admin: <IconShield size={14} />,
  manager: <IconUserCog size={14} />,
  timekeeper: <IconClock size={14} />,
};

function getErrorMessage(e: unknown, fallback: string): string {
  if (e instanceof Error && e.message) return e.message;
  return fallback;
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

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
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

    if (ownerUser) {
      rows.push({
        id: String(ownerUser.id),
        name: ownerUser.name || ownerUser.email || `User #${ownerUser.id}`,
        email: ownerUser.email || "",
        status: "active",
        role: "owner",
        userId: ownerUser.id,
        isPending: false,
      });
    }

    const orgMembersForOrg = orgMembers.filter(
      (m: OrgMember) => m.orgId === org.id
    );

    for (const m of orgMembersForOrg) {
      if (ownerUser && m.userId === ownerUser.id) continue;
      const u = users.find((user: User) => user.id === m.userId) ?? null;
      const isPending = !!u?.googleSub?.startsWith("pending:");
      rows.push({
        id: String(m.id),
        name: u ? u.name || u.email || `User #${u.id}` : `User #${m.userId}`,
        email: u?.email || "",
        status: isPending ? "pending" : "active",
        role: m.role as MemberRole,
        userId: u?.id,
        orgMemberId: m.id,
        isPending,
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
  }, [activeOrg, orgId, orgMembers, orgs.length, users]);

  const filteredAndSortedRecords = useMemo(() => {
    const q = search.toLowerCase().trim();
    const matchesSearch = (row: MemberRow) => {
      if (!q) return true;
      return (
        row.name.toLowerCase().includes(q) || row.email.toLowerCase().includes(q)
      );
    };
    const matchesRole = (row: MemberRow) => {
      if (roleFilter === "all") return true;
      return row.role === roleFilter;
    };
    const filtered = memberRows.filter(
      (row) => matchesSearch(row) && matchesRole(row)
    );
    return sortRecords(filtered, sortStatus);
  }, [memberRows, roleFilter, search, sortStatus]);

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
      <Group justify="space-between" align="flex-start" wrap="wrap">
        <div>
          <Title order={2} fw={700}>
            {activeOrg?.name ?? "Organization"}
          </Title>
          <Text size="sm" c="dimmed" mt={4}>
            Organization members and permissions
          </Text>
        </div>
        <Menu shadow="md" width={220} position="bottom-end">
          <Menu.Target>
            <ActionIcon variant="subtle" size="lg" color="gray">
              <IconDotsVertical size={18} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item
              leftSection={<IconUserPlus size={14} />}
              onClick={() => setInviteModalOpen(true)}
            >
              Invite member
            </Menu.Item>
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

      <Stack gap="md">
        <Group justify="space-between" align="center" wrap="wrap" gap="md">
          <Group gap="xs" wrap="wrap">
            {ROLE_FILTER_OPTIONS.map((filter) => (
              <Badge
                key={filter}
                size="lg"
                variant={roleFilter === filter ? "filled" : "light"}
                color={ROLE_COLORS[filter]}
                leftSection={ROLE_ICONS[filter]}
                style={{ cursor: "pointer" }}
                onClick={() => setRoleFilter(filter)}
              >
                {ROLE_LABELS[filter]} ({roleCounts[filter]})
              </Badge>
            ))}
          </Group>
          <TextInput
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            size="sm"
            leftSection={<IconSearch size={16} />}
            style={{ minWidth: 240 }}
          />
        </Group>

        <Paper p="md" withBorder>
          <DataTable<MemberRow>
            withTableBorder={false}
            withColumnBorders={false}
            highlightOnHover
            minHeight={150}
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
                title: "Name",
                sortable: true,
              },
              {
                accessor: "email",
                title: "Email",
                sortable: true,
                render: (row) => (
                  <Text size="sm" c="dimmed">
                    {row.email}
                  </Text>
                ),
              },
              {
                accessor: "status",
                title: "Status",
                sortable: true,
                render: (row) =>
                  row.status === "pending" ? (
                    <Badge size="sm" color="yellow" variant="light">
                      Pending
                    </Badge>
                  ) : null,
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
                  >
                    {ROLE_LABELS[row.role]}
                  </Badge>
                ),
              },
              {
                accessor: "actions",
                title: "",
                width: 40,
                render: (row) => {
                  if (row.role === "owner") return null;
                  const canImpersonate = row.role !== "admin" && row.status === "active";
                  const isPending = row.status === "pending";
                  return (
                    <Menu shadow="md" width={200} position="bottom-end">
                      <Menu.Target>
                        <ActionIcon variant="subtle" size="sm" color="gray">
                          <IconDotsVertical size={14} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
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
      </Stack>

      <Modal
        opened={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title="Invite Member"
      >
        <Stack gap="md">
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
          <Group gap="xs">
            <Button onClick={handleInvite}>Invite</Button>
            <Button variant="subtle" onClick={() => setInviteModalOpen(false)}>
              Cancel
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={transferModalOpen}
        onClose={() => {
          setTransferModalOpen(false);
          setTransferTargetId(null);
        }}
        title="Transfer ownership"
      >
        <Stack gap="md">
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
              <Group gap="xs">
                <Button
                  onClick={handleTransfer}
                  disabled={!transferTargetId}
                >
                  Transfer
                </Button>
                <Button
                  variant="subtle"
                  onClick={() => {
                    setTransferModalOpen(false);
                    setTransferTargetId(null);
                  }}
                >
                  Cancel
                </Button>
              </Group>
            </>
          )}
        </Stack>
      </Modal>

      <Modal
        opened={renameModalOpen}
        onClose={() => {
          setRenameModalOpen(false);
          setRenameError(null);
        }}
        title="Rename organization"
      >
        <Stack gap="md">
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
          <Group gap="xs">
            <Button onClick={handleRename}>Save</Button>
            <Button
              variant="subtle"
              onClick={() => {
                setRenameModalOpen(false);
                setRenameError(null);
              }}
            >
              Cancel
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
