import { ActionIcon, Menu } from "@mantine/core";
import type { ActionIconProps, MenuProps } from "@mantine/core";
import { IconDotsVertical } from "@tabler/icons-react";

export interface DotsMenuItem {
  icon: React.ReactNode;
  label: string;
  color?: string;
  onClick: () => void;
  disabled?: boolean;
}

interface DotsMenuProps {
  items: DotsMenuItem[];
  size?: ActionIconProps["size"];
  iconSize?: number;
  width?: number;
  position?: MenuProps["position"];
  variant?: ActionIconProps["variant"];
  color?: ActionIconProps["color"];
  stopPropagation?: boolean;
}

export function DotsMenu({
  items,
  size = "sm",
  iconSize = 14,
  width = 160,
  position = "bottom-end",
  variant = "subtle",
  color = "gray",
  stopPropagation = false,
}: DotsMenuProps) {
  return (
    <Menu shadow="md" width={width} position={position}>
      <Menu.Target>
        <ActionIcon
          variant={variant}
          size={size}
          color={color}
          onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
        >
          <IconDotsVertical size={iconSize} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        {items.map((item, i) => (
          <Menu.Item
            key={i}
            leftSection={item.icon}
            color={item.color}
            onClick={item.onClick}
            disabled={item.disabled}
          >
            {item.label}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}
