import { useCallback } from "react";
import type { Organization } from "@/module_bindings/types";
import type { MemberRow } from "./types";
import { getErrorMessage } from "@/utils";

export interface UseMembersActionsParams {
  orgId: bigint | null;
  activeOrg: Organization | null;
  inviteEmail: string;
  inviteName: string;
  inviteRole: "admin" | "manager" | "timekeeper";
  renameName: string;
  transferTargetId: string | null;
  setError: (v: string | null) => void;
  setRenameError: (v: string | null) => void;
  setInviteModalOpen: (v: boolean) => void;
  setInviteName: (v: string) => void;
  setInviteEmail: (v: string) => void;
  setInviteRole: (v: "admin" | "manager" | "timekeeper") => void;
  setRenameModalOpen: (v: boolean) => void;
  setTransferTargetId: (v: string | null) => void;
  setTransferModalOpen: (v: boolean) => void;
  inviteOrgMember: (args: {
    orgId: bigint;
    email: string;
    name: string;
    role: string;
  }) => Promise<unknown>;
  transferOrgOwnership: (args: {
    orgId: bigint;
    newOwnerUserId: bigint;
  }) => Promise<unknown>;
  leaveOrganization: (args: { orgId: bigint }) => Promise<unknown>;
  renameOrganization: (args: { orgId: bigint; name: string }) => Promise<unknown>;
  resendOrgInvitation: (args: { orgMemberId: bigint }) => Promise<unknown>;
  removeOrgMember: (args: { orgMemberId: bigint }) => Promise<unknown>;
  startImpersonation: (args: { targetUserId: bigint }) => Promise<unknown>;
}

export function useMembersActions({
  orgId,
  activeOrg,
  inviteEmail,
  inviteName,
  inviteRole,
  renameName,
  transferTargetId,
  setError,
  setRenameError,
  setInviteModalOpen,
  setInviteName,
  setInviteEmail,
  setInviteRole,
  setRenameModalOpen,
  setTransferTargetId,
  setTransferModalOpen,
  inviteOrgMember,
  transferOrgOwnership,
  leaveOrganization,
  renameOrganization,
  resendOrgInvitation,
  removeOrgMember,
  startImpersonation,
}: UseMembersActionsParams) {
  const handleInvite = useCallback(async () => {
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
  }, [
    orgId,
    inviteEmail,
    inviteName,
    inviteRole,
    setError,
    setInviteName,
    setInviteEmail,
    setInviteRole,
    setInviteModalOpen,
    inviteOrgMember,
  ]);

  const handleTransfer = useCallback(async () => {
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
  }, [
    orgId,
    transferTargetId,
    setError,
    setTransferTargetId,
    setTransferModalOpen,
    transferOrgOwnership,
  ]);

  const handleLeave = useCallback(async () => {
    if (!orgId) return;
    if (!confirm("Are you sure you want to leave this organization?")) return;
    setError(null);
    try {
      await leaveOrganization({ orgId });
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to leave organization"));
    }
  }, [orgId, setError, leaveOrganization]);

  const handleImpersonate = useCallback(
    async (member: MemberRow) => {
      if (!member.userId) return;
      setError(null);
      try {
        await startImpersonation({ targetUserId: member.userId });
      } catch (e: unknown) {
        setError(getErrorMessage(e, "Failed to start impersonation"));
      }
    },
    [setError, startImpersonation]
  );

  const handleResendInvite = useCallback(
    async (member: MemberRow) => {
      if (!member.orgMemberId) return;
      setError(null);
      try {
        await resendOrgInvitation({ orgMemberId: member.orgMemberId });
      } catch (e: unknown) {
        setError(getErrorMessage(e, "Failed to resend invitation"));
      }
    },
    [setError, resendOrgInvitation]
  );

  const handleRemove = useCallback(
    async (member: MemberRow) => {
      if (!member.orgMemberId) return;
      setError(null);
      try {
        await removeOrgMember({ orgMemberId: member.orgMemberId });
      } catch (e: unknown) {
        setError(getErrorMessage(e, "Failed to remove member"));
      }
    },
    [setError, removeOrgMember]
  );

  const handleRename = useCallback(async () => {
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
  }, [
    orgId,
    activeOrg?.name,
    renameName,
    setRenameError,
    setRenameModalOpen,
    renameOrganization,
  ]);

  return {
    handleInvite,
    handleTransfer,
    handleLeave,
    handleImpersonate,
    handleResendInvite,
    handleRemove,
    handleRename,
  };
}
