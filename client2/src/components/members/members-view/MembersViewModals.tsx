import type { Championship, Event } from "@/module_bindings/types";
import type { MemberRow } from "./types";
import {
  InviteMemberModal,
  RenameOrgModal,
  TransferOwnershipModal,
  MemberEditModal,
} from "./modals";
import type { MemberEditModalReducers } from "./types";

export interface MembersViewModalsProps {
  inviteModalOpen: boolean;
  setInviteModalOpen: (v: boolean) => void;
  inviteName: string;
  setInviteName: (v: string) => void;
  inviteEmail: string;
  setInviteEmail: (v: string) => void;
  inviteRole: "admin" | "manager" | "timekeeper";
  setInviteRole: (v: "admin" | "manager" | "timekeeper") => void;
  inviteError: string | null;
  onInvite: () => void;

  transferModalOpen: boolean;
  setTransferModalOpen: (v: boolean) => void;
  transferTargetId: string | null;
  setTransferTargetId: (v: string | null) => void;
  adminCandidates: MemberRow[];
  onTransfer: () => void;

  renameModalOpen: boolean;
  onCloseRename: () => void;
  renameName: string;
  setRenameName: (v: string) => void;
  renameError: string | null;
  onRename: () => void;

  editMemberModal: MemberRow | null;
  setEditMemberModal: (v: MemberRow | null) => void;
  orgId: bigint | null;
  championships: ReadonlyArray<Championship>;
  events: ReadonlyArray<Event>;
  editReducers: MemberEditModalReducers;
}

export function MembersViewModals({
  inviteModalOpen,
  setInviteModalOpen,
  inviteName,
  setInviteName,
  inviteEmail,
  setInviteEmail,
  inviteRole,
  setInviteRole,
  inviteError,
  onInvite,

  transferModalOpen,
  setTransferModalOpen,
  transferTargetId,
  setTransferTargetId,
  adminCandidates,
  onTransfer,

  renameModalOpen,
  onCloseRename,
  renameName,
  setRenameName,
  renameError,
  onRename,

  editMemberModal,
  setEditMemberModal,
  orgId,
  championships,
  events,
  editReducers,
}: MembersViewModalsProps) {
  return (
    <>
      <InviteMemberModal
        opened={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        name={inviteName}
        setName={setInviteName}
        email={inviteEmail}
        setEmail={setInviteEmail}
        role={inviteRole}
        setRole={setInviteRole}
        error={inviteError}
        onInvite={onInvite}
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
        onClose={onCloseRename}
        name={renameName}
        setName={setRenameName}
        error={renameError}
        onSave={onRename}
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
