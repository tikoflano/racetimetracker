import { useEffect, useState } from "react";
import { Modal, Stack, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconBuilding } from "@tabler/icons-react";
import { ModalHeader, modalHeaderStyles, ModalFooter } from "@/components/common";
import { getErrorMessage } from "@/utils";

export interface CreateOrganizationModalProps {
  opened: boolean;
  onClose: () => void;
  createOrganization: (args: { name: string }) => Promise<unknown>;
}

export function CreateOrganizationModal({
  opened,
  onClose,
  createOrganization,
}: CreateOrganizationModalProps) {
  const [loading, setLoading] = useState(false);
  const form = useForm({
    initialValues: { name: "" },
    validate: {
      name: (v) => {
        const trimmed = v?.trim();
        if (!trimmed) return "Organization name is required";
        return null;
      },
    },
  });

  useEffect(() => {
    if (!opened) {
      form.reset();
    }
  }, [opened]);

  const handleCreate = async () => {
    if (form.validate().hasErrors) return;
    setLoading(true);
    try {
      await createOrganization({ name: form.values.name.trim() });
      form.reset();
      onClose();
    } catch (e: unknown) {
      form.setFieldError("name", getErrorMessage(e, "Failed to create organization"));
    } finally {
      setLoading(false);
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
          title="New organization"
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
        <TextInput
          label="Organization name"
          placeholder="Organization name"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter" && !loading) handleCreate();
          }}
          {...form.getInputProps("name")}
        />
        <ModalFooter
          onCancel={onClose}
          submitLabel="Create organization"
          onSubmit={handleCreate}
          submitLoading={loading}
          submitDisabled={loading}
        />
      </Stack>
    </Modal>
  );
}
