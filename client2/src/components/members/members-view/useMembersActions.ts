import { useCallback } from "react";
import type { MemberRow } from "./types";
import { getErrorMessage } from "@/utils";

export interface UseMembersActionsParams {
  orgId: bigint | null;
  transferTargetId: string | null;
  setError: (v: string | null) => void;
  setTransferTargetId: (v: string | null) => void;
  setTransferModalOpen: (v: boolean) => void;
  transferOrgOwnership: (args: {
    orgId: bigint;
    newOwnerUserId: bigint;
  }) => Promise<unknown>;
  leaveOrganization: (args: { orgId: bigint }) => Promise<unknown>;
  resendOrgInvitation: (args: { orgMemberId: bigint }) => Promise<unknown>;
  removeOrgMember: (args: { orgMemberId: bigint }) => Promise<unknown>;
  startImpersonation: (args: { targetUserId: bigint }) => Promise<unknown>;
}

export function useMembersActions({
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
}: UseMembersActionsParams) {
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

  return {
    handleTransfer,
    handleLeave,
    handleImpersonate,
    handleResendInvite,
    handleRemove,
  };
}
