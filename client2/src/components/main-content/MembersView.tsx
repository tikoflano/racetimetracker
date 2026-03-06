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

type MemberStatus = "active" | "pending";
type MemberRole = "owner" | "admin" | "manager" | "timekeeper";

interface MemberRow {
  id: string;
  name: string;
  email: string;
  status: MemberStatus;
  role: MemberRole;
}

const MOCK_ORG_NAME = "Acme Racing";

const MOCK_MEMBERS: MemberRow[] = [
  {
    id: "1",
    name: "Alex Morgan",
    email: "alex.morgan@acme.racing",
    status: "active",
    role: "owner",
  },
  {
    id: "2",
    name: "Sam Chen",
    email: "sam.chen@acme.racing",
    status: "active",
    role: "admin",
  },
  {
    id: "3",
    name: "Jordan Lee",
    email: "jordan.lee@acme.racing",
    status: "pending",
    role: "manager",
  },
  {
    id: "4",
    name: "Casey Rivera",
    email: "casey.rivera@acme.racing",
    status: "active",
    role: "manager",
  },
  {
    id: "5",
    name: "Morgan Taylor",
    email: "morgan.taylor@acme.racing",
    status: "active",
    role: "timekeeper",
  },
  {
    id: "6",
    name: "Riley Kim",
    email: "riley.kim@acme.racing",
    status: "active",
    role: "timekeeper",
  },
];

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
    const filtered = MOCK_MEMBERS.filter(
      (row) => matchesSearch(row) && matchesRole(row)
    );
    return sortRecords(filtered, sortStatus);
  }, [search, roleFilter, sortStatus]);

  const roleCounts = useMemo(() => {
    const counts: Record<RoleFilter, number> = {
      all: MOCK_MEMBERS.length,
      owner: MOCK_MEMBERS.filter((m) => m.role === "owner").length,
      admin: MOCK_MEMBERS.filter((m) => m.role === "admin").length,
      manager: MOCK_MEMBERS.filter((m) => m.role === "manager").length,
      timekeeper: MOCK_MEMBERS.filter((m) => m.role === "timekeeper").length,
    };
    return counts;
  }, []);

  const adminCandidates = useMemo(
    () => MOCK_MEMBERS.filter((m) => m.role === "admin" && m.status === "active"),
    []
  );

  const handleInvite = () => {
    console.log("Invite (mocked):", { inviteName, inviteEmail, inviteRole });
    setInviteName("");
    setInviteEmail("");
    setInviteRole("manager");
    setInviteModalOpen(false);
  };

  const handleTransfer = () => {
    console.log("Transfer ownership (mocked):", transferTargetId);
    setTransferTargetId(null);
    setTransferModalOpen(false);
  };

  const handleLeave = () => {
    console.log("Leave organization (mocked)");
  };

  const handleImpersonate = (member: MemberRow) => {
    console.log("Impersonate (mocked):", member.id);
  };

  const handleResendInvite = (member: MemberRow) => {
    console.log("Resend invite (mocked):", member.id);
  };

  const handleRemove = (member: MemberRow) => {
    console.log("Remove member (mocked):", member.id);
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start" wrap="wrap">
        <div>
          <Title order={2} fw={700}>
            {MOCK_ORG_NAME}
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
              onClick={() => console.log("Rename (mocked)")}
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
            noRecordsText="No members match your search or filter."
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
                  value: m.id,
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
    </Stack>
  );
}
