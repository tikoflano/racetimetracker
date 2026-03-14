import { Badge, Modal, Paper, Table, Text } from "@mantine/core";
import { BADGE_FULL_STYLES, ModalFooter } from "@/components/common";
import { ROLES_PERMISSIONS_ROWS } from "../roleConstants";

export interface RolesPermissionsModalProps {
  opened: boolean;
  onClose: () => void;
}

export function RolesPermissionsModal({
  opened,
  onClose,
}: RolesPermissionsModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Roles & permissions"
      size="lg"
    >
      <Paper
        p="md"
        withBorder
        style={{ background: "#13151b", border: "1px solid #1e2028" }}
      >
        <Table
          withTableBorder={false}
          withColumnBorders={false}
          highlightOnHover
          style={{ tableLayout: "auto" }}
        >
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ whiteSpace: "nowrap" }}>Scope</Table.Th>
              <Table.Th style={{ whiteSpace: "nowrap" }}>Role</Table.Th>
              <Table.Th>Access</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {ROLES_PERMISSIONS_ROWS.map((row, i) => (
              <Table.Tr key={i}>
                <Table.Td style={{ whiteSpace: "nowrap" }}>
                  <Badge
                    size="sm"
                    color={row.scopeColor}
                    variant="light"
                    leftSection={row.scopeIcon}
                    styles={BADGE_FULL_STYLES}
                  >
                    {row.scope}
                  </Badge>
                </Table.Td>
                <Table.Td style={{ whiteSpace: "nowrap" }}>
                  <Badge
                    size="sm"
                    color={row.roleColor}
                    variant="light"
                    leftSection={row.roleIcon}
                    styles={BADGE_FULL_STYLES}
                  >
                    {row.role}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed">
                    {row.access}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>
      <ModalFooter onCancel={onClose} cancelLabel="Close" />
    </Modal>
  );
}
