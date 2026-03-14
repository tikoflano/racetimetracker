import { useEffect } from "react";
import { Modal, Stack, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconBuilding } from "@tabler/icons-react";
import { ModalHeader, modalHeaderStyles, FormError, ModalFooter } from "@/components/common";
import { getErrorMessage } from "@/utils";

export interface RenameOrgModalProps {
  opened: boolean;
  onClose: () => void;
  orgId: bigint | null;
  initialName: string;
  renameOrganization: (args: { orgId: bigint; name: string }) => Promise<unknown>;
}

export function RenameOrgModal({
  opened,
  onClose,
  orgId,
  initialName,
  renameOrganization,
}: RenameOrgModalProps) {
  const form = useForm({
    initialValues: { name: "" },
    validate: {
      name: (v) => (!v?.trim() ? "Name cannot be empty" : null),
    },
  });

  useEffect(() => {
    if (opened) {
      form.setValues({ name: initialName });
      form.clearErrors();
    }
  }, [opened, initialName]);

  const handleSave = async () => {
    if (!orgId || !form.validate()) return;
    const trimmed = form.values.name.trim();
    try {
      await renameOrganization({ orgId, name: trimmed });
      onClose();
    } catch (e: unknown) {
      form.setFieldError("name", getErrorMessage(e, "Failed to rename organization"));
    }
  };

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
        <FormError error={typeof form.errors.name === "string" ? form.errors.name : undefined} />
        <TextInput
          label="Organization name"
          {...form.getInputProps("name")}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
          }}
          autoFocus
        />
        <ModalFooter
          onCancel={onClose}
          submitLabel="Save"
          onSubmit={handleSave}
        />
      </Stack>
    </Modal>
  );
}
