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
import { IconChevronDown, IconChevronRight, IconUserPlus } from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
import { ModalHeader, modalHeaderStyles, FormError, ModalFooter } from "@/components/common";

export interface InviteMemberModalProps {
  opened: boolean;
  onClose: () => void;
  name: string;
  setName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  role: "admin" | "manager" | "timekeeper";
  setRole: (v: "admin" | "manager" | "timekeeper") => void;
  error: string | null;
  onInvite: () => void;
}

export function InviteMemberModal({
  opened,
  onClose,
  name,
  setName,
  email,
  setEmail,
  role,
  setRole,
  error,
  onInvite,
}: InviteMemberModalProps) {
  const [inviteScopesOpen, { toggle: toggleInviteScopes }] = useDisclosure(false);

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
        <FormError error={error} />
        <TextInput
          label="Name"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
        />
        <TextInput
          label="Email address"
          placeholder="Email address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.currentTarget.value)}
        />
        <Select
          label="Role"
          value={role}
          onChange={(v) =>
            setRole((v as "admin" | "manager" | "timekeeper") || "manager")
          }
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
          onSubmit={onInvite}
        />
      </Stack>
    </Modal>
  );
}
