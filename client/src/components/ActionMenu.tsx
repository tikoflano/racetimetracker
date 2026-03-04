import type { Icon } from '@tabler/icons-react';
import { Menu, ActionIcon } from '@mantine/core';
import { IconDotsVertical } from '@tabler/icons-react';

export interface ActionMenuItem {
  icon: Icon;
  label: string;
  onClick: () => void;
  danger?: boolean;
}

interface ActionMenuProps {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  items: ActionMenuItem[];
}

export default function ActionMenu({ open, onToggle, onClose, items }: ActionMenuProps) {
  return (
    <Menu opened={open} onChange={(next) => (next ? onToggle() : onClose())} position="bottom-start" shadow="md" width={200}>
      <Menu.Target>
        <ActionIcon variant="subtle" size="sm" onClick={onToggle} title="Actions" aria-label="Actions">
          <IconDotsVertical size={16} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        {items.map((item, i) => (
          <Menu.Item
            key={i}
            leftSection={<item.icon size={16} style={{ flexShrink: 0 }} />}
            color={item.danger ? 'red' : undefined}
            onClick={() => {
              item.onClick();
              onClose();
            }}
          >
            {item.label}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}

export function RowActionMenu({ items }: { items: ActionMenuItem[] }) {
  return (
    <Menu position="bottom-end" shadow="md" width={160}>
      <Menu.Target>
        <ActionIcon variant="subtle" size="xs" title="Actions" aria-label="Actions">
          <IconDotsVertical size={16} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        {items.map((item, i) => (
          <Menu.Item
            key={i}
            leftSection={<item.icon size={14} style={{ flexShrink: 0 }} />}
            color={item.danger ? 'red' : undefined}
            onClick={() => item.onClick()}
          >
            {item.label}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}
