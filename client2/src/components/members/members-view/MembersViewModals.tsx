import type { Championship, Event } from '@/module_bindings/types';
import type { MemberRow } from './types';
import {
  InviteMemberModal,
  RenameOrgModal,
  TransferOwnershipModal,
  MemberEditModal,
} from './modals';
import type { MemberEditModalReducers } from './types';

export interface MembersViewModalsProps {
  inviteModalOpen: boolean;
  setInviteModalOpen: (v: boolean) => void;
  orgId: bigint | null;
  inviteOrgMember: (args: {
    orgId: bigint;
    email: string;
    name: string;
    role: string;
  }) => Promise<unknown>;

  transferModalOpen: boolean;
  setTransferModalOpen: (v: boolean) => void;
  transferTargetId: string | null;
  setTransferTargetId: (v: string | null) => void;
  adminCandidates: MemberRow[];
  onTransfer: () => void;

  renameModalOpen: boolean;
  setRenameModalOpen: (v: boolean) => void;
  renameInitialName: string;
  renameOrganization: (args: { orgId: bigint; name: string }) => Promise<unknown>;

  editMemberModal: MemberRow | null;
  setEditMemberModal: (v: MemberRow | null) => void;
  championships: ReadonlyArray<Championship>;
  events: ReadonlyArray<Event>;
  editReducers: MemberEditModalReducers;
}

export function MembersViewModals({
  inviteModalOpen,
  setInviteModalOpen,
  orgId,
  inviteOrgMember,

  transferModalOpen,
  setTransferModalOpen,
  transferTargetId,
  setTransferTargetId,
  adminCandidates,
  onTransfer,

  renameModalOpen,
  setRenameModalOpen,
  renameInitialName,
  renameOrganization,

  editMemberModal,
  setEditMemberModal,
  championships,
  events,
  editReducers,
}: MembersViewModalsProps) {
  return (
    <>
      <InviteMemberModal
        opened={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        orgId={orgId}
        inviteOrgMember={inviteOrgMember}
      />

      <TransferOwnershipModal
        opened={transferModalOpen}
        onClose={() => {
          setTransferModalOpen(false);
          setTransferTargetId(null);
        }}
        transferTargetId={transferTargetId}
        setTransferTargetId={setTransferTargetId}
        adminCandidates={adminCandidates}
        onTransfer={onTransfer}
      />

      <RenameOrgModal
        opened={renameModalOpen}
        onClose={() => setRenameModalOpen(false)}
        orgId={orgId}
        initialName={renameInitialName}
        renameOrganization={renameOrganization}
      />

      {editMemberModal && editMemberModal.userId && orgId && (
        <MemberEditModal
          member={editMemberModal}
          championships={championships.filter((c) => c.orgId === orgId)}
          events={events.filter((e) => e.orgId === orgId)}
          onClose={() => setEditMemberModal(null)}
          reducers={editReducers}
        />
      )}
    </>
  );
}
