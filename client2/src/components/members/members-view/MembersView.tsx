import { useMemo, useState } from "react";
import { Paper, Stack, Text, Title } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconBuilding } from "@tabler/icons-react";
import { useTable, useReducer } from "spacetimedb/react";
import { tables, reducers } from "@/module_bindings";
import type { Organization } from "@/module_bindings/types";
import { useAuth } from "@/auth";
import { ViewHeader, FilterToolbar } from "@/components/common";
import type { MemberRow } from "./types";
import { MembersFilterBadges } from "./MembersFilterBadges";
import { MembersViewHeaderActions } from "./MembersViewHeaderActions";
import { MembersListOrTable } from "./MembersListOrTable";
import { useMemberRows } from "./useMemberRows";
import { useMembersFilters } from "./useMembersFilters";
import { useMembersActions } from "./useMembersActions";
import { MembersViewModals } from "./MembersViewModals";

export function MembersView() {
  const isMobile = useMediaQuery("(max-width: 768px)") ?? false;
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

  const { memberRows, roleCounts, adminCandidates } = useMemberRows({
    activeOrg,
    orgMembers,
    users,
    championships,
    championshipMembers,
    events,
    eventMembers,
  });

  const {
    search,
    setSearch,
    roleFilters,
    setRoleFilters,
    sortStatus,
    setSortStatus,
    searchOpen,
    setSearchOpen,
    filteredAndSortedRecords,
  } = useMembersFilters({ memberRows });

  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferTargetId, setTransferTargetId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [editMemberModal, setEditMemberModal] = useState<MemberRow | null>(null);

  const orgId = activeOrg?.id ?? null;

  const {
    handleTransfer,
    handleLeave,
    handleImpersonate,
    handleResendInvite,
    handleRemove,
  } = useMembersActions({
    orgId,
    transferTargetId,
    setError,
    setTransferTargetId,
    setTransferModalOpen,
    transferOrgOwnership,
    leaveOrganization,
    resendOrgInvitation,
    removeOrgMember,
    startImpersonation,
  });

  if (orgs.length === 0) {
    return (
      <Stack gap="lg">
        <Title order={2} fw={700}>
          Members
        </Title>
        <Paper withBorder p="xl">
          <Text c="dimmed" ta="center">
            No organizations found. Create an organization in the main app to
            manage members here.
          </Text>
        </Paper>
      </Stack>
    );
  }

  const noRecordsText =
    memberRows.length > 0
      ? "No members match your search or filter."
      : "No members yet. Invite someone to get started.";

  return (
    <Stack gap="lg">
      <ViewHeader
        icon={<IconBuilding size={28} />}
        iconColor="green"
        gradient="linear-gradient(135deg, #1a3a2a 0%, #1e5c3a 60%, #237a4b 100%)"
        eyebrow="Organization"
        title={activeOrg?.name ?? "Organization"}
        subtitle={`${roleCounts.all} member${roleCounts.all !== 1 ? "s" : ""}${!isMobile ? " · manage roles and permissions" : ""}`}
        isMobile={isMobile}
        actions={
          <MembersViewHeaderActions
            isMobile={isMobile}
            activeOrg={activeOrg}
            adminCandidatesCount={adminCandidates.length}
            onInvite={() => setInviteModalOpen(true)}
            onTransfer={() => setTransferModalOpen(true)}
            onRename={() => {
              if (!activeOrg) return;
              setRenameModalOpen(true);
            }}
            onLeave={handleLeave}
          />
        }
      />

      <FilterToolbar
        filterContent={
          <MembersFilterBadges
            roleFilters={roleFilters}
            roleCounts={roleCounts}
            onToggleRole={(r) =>
              setRoleFilters((prev) => {
                const selected = prev.includes(r);
                return selected ? prev.filter((v) => v !== r) : [...prev, r];
              })
            }
            onClearFilters={() => setRoleFilters([])}
          />
        }
        activeFilterCount={roleFilters.length}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name or email..."
        searchOpen={searchOpen}
        onSearchOpenChange={setSearchOpen}
        resultLabel={
          filteredAndSortedRecords.length === memberRows.length
            ? `${memberRows.length} member${memberRows.length !== 1 ? "s" : ""}`
            : `${filteredAndSortedRecords.length} of ${memberRows.length}`
        }
      />

      <MembersListOrTable
        isMobile={isMobile}
        records={filteredAndSortedRecords}
        sortStatus={sortStatus}
        onSortStatusChange={setSortStatus}
        noRecordsText={noRecordsText}
        canImpersonate={!!userCanImpersonate}
        onEditRoles={(member) => setEditMemberModal(member)}
        onImpersonate={handleImpersonate}
        onResendInvite={handleResendInvite}
        onRemove={handleRemove}
      />

      <MembersViewModals
        inviteModalOpen={inviteModalOpen}
        setInviteModalOpen={setInviteModalOpen}
        orgId={orgId}
        inviteOrgMember={inviteOrgMember}
        transferModalOpen={transferModalOpen}
        setTransferModalOpen={setTransferModalOpen}
        transferTargetId={transferTargetId}
        setTransferTargetId={setTransferTargetId}
        adminCandidates={adminCandidates}
        onTransfer={handleTransfer}
        renameModalOpen={renameModalOpen}
        setRenameModalOpen={setRenameModalOpen}
        renameInitialName={activeOrg?.name ?? ""}
        renameOrganization={renameOrganization}
        editMemberModal={editMemberModal}
        setEditMemberModal={setEditMemberModal}
        championships={championships}
        events={events}
        editReducers={{
          updateOrgMember,
          addChampionshipMember,
          updateChampionshipMember,
          removeChampionshipMember,
          addEventMember,
          updateEventMember,
          removeEventMember,
        }}
      />
    </Stack>
  );
}
