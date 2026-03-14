import { useEffect } from "react";
import {
  Button,
  Collapse,
  Modal,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconChevronDown, IconChevronRight, IconUserPlus } from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
import { ModalHeader, modalHeaderStyles, FormError, ModalFooter } from "@/components/common";
import { getErrorMessage } from "@/utils";

export interface InviteMemberModalProps {
  opened: boolean;
  onClose: () => void;
  orgId: bigint | null;
  inviteOrgMember: (args: {
    orgId: bigint;
    email: string;
    name: string;
    role: string;
  }) => Promise<unknown>;
}

export function InviteMemberModal({
  opened,
  onClose,
  orgId,
  inviteOrgMember,
}: InviteMemberModalProps) {
  const [inviteScopesOpen, { toggle: toggleInviteScopes }] = useDisclosure(false);
  const form = useForm({
    initialValues: {
      name: "",
      email: "",
      role: "manager" as "admin" | "manager" | "timekeeper",
    },
    validate: {
      email: (v) => {
        const trimmed = v?.trim();
        if (!trimmed) return "Email is required";
        if (!trimmed.includes("@")) return "Please enter a valid email address.";
        return null;
      },
    },
  });

  useEffect(() => {
    if (!opened) {
      form.reset();
    }
  }, [opened]);

  const handleInvite = async () => {
    if (!orgId || !form.validate()) return;
    try {
      await inviteOrgMember({
        orgId,
        email: form.values.email.trim(),
        name: form.values.name.trim(),
        role: form.values.role,
      });
      form.reset();
      onClose();
    } catch (e: unknown) {
      form.setFieldError("email", getErrorMessage(e, "Failed to invite member"));
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <ModalHeader
          icon={<IconUserPlus size={20} />}
          iconColor="green"
          label="Organization"
          title="Invite Member"
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
        <FormError error={typeof form.errors.email === "string" ? form.errors.email : undefined} />
        <TextInput
          label="Name"
          placeholder="Name"
          {...form.getInputProps("name")}
        />
        <TextInput
          label="Email address"
          placeholder="Email address"
          type="email"
          {...form.getInputProps("email")}
        />
        <Select
          label="Role"
          {...form.getInputProps("role")}
          data={[
            { value: "manager", label: "Manager" },
            { value: "timekeeper", label: "Timekeeper" },
            { value: "admin", label: "Admin" },
          ]}
        />
        <Collapse in={inviteScopesOpen}>
          <Paper p="sm" withBorder mt="xs" style={{ background: "#0d1117" }}>
            <Text size="xs" c="dimmed">
              To add championship or event scopes, invite the member first, then
              click <strong>Edit role & scopes</strong> on their row.
            </Text>
          </Paper>
        </Collapse>
        <Button
          variant="subtle"
          size="xs"
          leftSection={
            inviteScopesOpen ? (
              <IconChevronDown size={14} />
            ) : (
              <IconChevronRight size={14} />
            )
          }
          onClick={toggleInviteScopes}
        >
          {inviteScopesOpen ? "Hide" : "About scopes"}
        </Button>
        <ModalFooter
          onCancel={onClose}
          submitLabel="Invite"
          onSubmit={handleInvite}
        />
      </Stack>
    </Modal>
  );
}
