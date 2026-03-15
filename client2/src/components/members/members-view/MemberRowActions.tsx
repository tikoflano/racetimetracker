import { ActionIcon, Menu } from '@mantine/core';
import { IconDotsVertical, IconMail, IconPencil, IconTrash, IconUser } from '@tabler/icons-react';
import type { MemberRow } from './types';

export interface MemberRowActionsProps {
  member: MemberRow;
  canImpersonate: boolean;
  onEditRoles: (member: MemberRow) => void;
  onImpersonate: (member: MemberRow) => void;
  onResendInvite: (member: MemberRow) => void;
  onRemove: (member: MemberRow) => void;
  /** Compact styling for table cell */
  compact?: boolean;
}

export function MemberRowActions({
  member,
  canImpersonate,
  onEditRoles,
  onImpersonate,
  onResendInvite,
  onRemove,
  compact = false,
}: MemberRowActionsProps) {
  if (member.role === 'owner') return null;

  const isPending = member.status === 'pending';
  const showImpersonate =
    canImpersonate && member.role !== 'admin' && member.status === 'active' && !!member.userId;

  return (
    <Menu shadow="md" width={200} position="bottom-end">
      <Menu.Target>
        <ActionIcon
          variant="subtle"
          size={compact ? 'sm' : 'sm'}
          color="gray"
          style={compact ? undefined : { flexShrink: 0 }}
        >
          <IconDotsVertical size={14} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item leftSection={<IconPencil size={14} />} onClick={() => onEditRoles(member)}>
          Edit role & scopes
        </Menu.Item>
        {showImpersonate && (
          <Menu.Item leftSection={<IconUser size={14} />} onClick={() => onImpersonate(member)}>
            Impersonate
          </Menu.Item>
        )}
        {isPending && (
          <Menu.Item leftSection={<IconMail size={14} />} onClick={() => onResendInvite(member)}>
            Resend invitation
          </Menu.Item>
        )}
        <Menu.Item
          leftSection={<IconTrash size={14} />}
          color="red"
          onClick={() => onRemove(member)}
        >
          Remove
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
