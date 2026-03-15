import { useState, useMemo } from "react";
import { Paper, Stack, Text, Title } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconBuilding } from "@tabler/icons-react";
import { useTable, useReducer } from "spacetimedb/react";
import { tables, reducers } from "@/module_bindings";
import type { Organization } from "@/module_bindings/types";
import { useAuth } from "@/auth";
import { useActiveOrgFromOrgs } from "@/providers/OrgProvider";
import { ViewHeader, FilterToolbar, EmptyState } from "@/components/common";
import { CreateOrganizationModal } from "./modals";
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

  const { user, canImpersonate: userCanImpersonate } = useAuth();
  const inviteOrgMember = useReducer(reducers.inviteOrgMember);
  const resendOrgInvitation = useReducer(reducers.resendOrgInvitation);
  const removeOrgMember = useReducer(reducers.removeOrgMember);
  const updateOrgMember = useReducer(reducers.updateOrgMember);
  const renameOrganization = useReducer(reducers.renameOrganization);
  const transferOrgOwnership = useReducer(reducers.transferOrgOwnership);
  const leaveOrganization = useReducer(reducers.leaveOrganization);
  const startImpersonation = useReducer(reducers.startImpersonation);
  const createOrganization = useReducer(reducers.createOrganization);
  const addChampionshipMember = useReducer(reducers.addChampionshipMember);
  const updateChampionshipMember = useReducer(reducers.updateChampionshipMember);
  const removeChampionshipMember = useReducer(reducers.removeChampionshipMember);
  const addEventMember = useReducer(reducers.addEventMember);
  const updateEventMember = useReducer(reducers.updateEventMember);
  const removeEventMember = useReducer(reducers.removeEventMember);

  const activeOrg = useActiveOrgFromOrgs(orgs);

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
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const hasNoOrgs = useMemo(() => {
    if (!user) return true;
    return orgMembers.filter((m) => m.userId === user.id).length === 0;
  }, [user, orgMembers]);

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

  if (hasNoOrgs) {
    return (
      <Stack gap="lg">
        <Title order={2} fw={700}>
          Organization
        </Title>
        <EmptyState
          icon={<IconBuilding size={48} />}
          message="You're not part of any organization. Create one to manage members, championships, events, and more."
          action={{
            label: "Create organization",
            onClick: () => setCreateModalOpen(true),
          }}
        />
        <CreateOrganizationModal
          opened={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          createOrganization={createOrganization}
        />
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
