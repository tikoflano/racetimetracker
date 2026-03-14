import { Modal, Stack, TextInput } from "@mantine/core";
import { IconBuilding } from "@tabler/icons-react";
import { ModalHeader, modalHeaderStyles, FormError, ModalFooter } from "@/components/common";

export interface RenameOrgModalProps {
  opened: boolean;
  onClose: () => void;
  name: string;
  setName: (v: string) => void;
  error: string | null;
  onSave: () => void;
}

export function RenameOrgModal({
  opened,
  onClose,
  name,
  setName,
  error,
  onSave,
}: RenameOrgModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <ModalHeader
          icon={<IconBuilding size={20} />}
          iconColor="green"
          label="Organization"
          title="Rename organization"
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
        <FormError error={error} />
        <TextInput
          label="Organization name"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSave();
          }}
          autoFocus
        />
        <ModalFooter
          onCancel={onClose}
          submitLabel="Save"
          onSubmit={onSave}
        />
      </Stack>
    </Modal>
  );
}
