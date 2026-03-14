import { ActionIcon, Button, Menu } from "@mantine/core";
import {
  IconArrowLeftRight,
  IconDotsVertical,
  IconLogout,
  IconPencil,
  IconUserPlus,
} from "@tabler/icons-react";
import type { Organization } from "@/module_bindings/types";

export interface MembersViewHeaderActionsProps {
  isMobile: boolean;
  activeOrg: Organization | null;
  adminCandidatesCount: number;
  onInvite: () => void;
  onTransfer: () => void;
  onRename: () => void;
  onLeave: () => void;
}

export function MembersViewHeaderActions({
  isMobile,
  activeOrg: _activeOrg,
  adminCandidatesCount,
  onInvite,
  onTransfer,
  onRename,
  onLeave,
}: MembersViewHeaderActionsProps) {
  return (
    <>
      {!isMobile && (
        <Button
          leftSection={<IconUserPlus size={16} />}
          variant="white"
          color="dark"
          onClick={onInvite}
        >
          Invite Member
        </Button>
      )}
      <Menu shadow="md" width={220} position="bottom-end">
        <Menu.Target>
          <ActionIcon variant="subtle" size="lg" color="gray">
            <IconDotsVertical size={18} />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown>
          {isMobile && (
            <>
              <Menu.Item
                leftSection={<IconUserPlus size={14} />}
                onClick={onInvite}
              >
                Invite Member
              </Menu.Item>
              <Menu.Divider />
            </>
          )}
          <Menu.Item
            leftSection={<IconArrowLeftRight size={14} />}
            onClick={onTransfer}
            disabled={adminCandidatesCount === 0}
          >
            Transfer ownership
          </Menu.Item>
          <Menu.Item
            leftSection={<IconPencil size={14} />}
            onClick={onRename}
          >
            Rename organization
          </Menu.Item>
          <Menu.Divider />
          <Menu.Item
            leftSection={<IconLogout size={14} />}
            color="red"
            onClick={onLeave}
          >
            Leave organization
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </>
  );
}
