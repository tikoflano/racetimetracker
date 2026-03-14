import { Modal, Select, Stack, Text } from "@mantine/core";
import { IconArrowLeftRight } from "@tabler/icons-react";
import { ModalHeader, modalHeaderStyles, ModalFooter } from "@/components/common";
import type { MemberRow } from "../types";

export interface TransferOwnershipModalProps {
  opened: boolean;
  onClose: () => void;
  transferTargetId: string | null;
  setTransferTargetId: (v: string | null) => void;
  adminCandidates: MemberRow[];
  onTransfer: () => void;
}

export function TransferOwnershipModal({
  opened,
  onClose,
  transferTargetId,
  setTransferTargetId,
  adminCandidates,
  onTransfer,
}: TransferOwnershipModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <ModalHeader
          icon={<IconArrowLeftRight size={20} />}
          iconColor="green"
          label="Organization"
          title="Transfer ownership"
        />
      }
      centered
      radius="md"
      size="lg"
      overlayProps={{ blur: 3 }}
      styles={modalHeaderStyles(
        "linear-gradient(135deg, #1a3a2a 0%, #1e5c3a 60%, #237a4b 100%)"
      )}
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
            <ModalFooter
              onCancel={onClose}
              submitLabel="Transfer"
              onSubmit={onTransfer}
              submitDisabled={!transferTargetId}
            />
          </>
        )}
      </Stack>
    </Modal>
  );
}
