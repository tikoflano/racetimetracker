import { ReactNode } from 'react';
import { Modal, Group, ThemeIcon, Text } from '@mantine/core';

interface BaseModalProps {
  opened: boolean;
  onClose: () => void;
  icon: ReactNode;
  label: string;
  title: string;
  size?: string;
  children: ReactNode;
}

export function BaseModal({
  opened,
  onClose,
  icon,
  label,
  title,
  size = 'lg',
  children,
}: BaseModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      centered
      radius="md"
      size={size}
      overlayProps={{ blur: 3 }}
      title={
        <Group gap="sm">
          <ThemeIcon size={36} radius="md" color="blue" variant="light">
            {icon}
          </ThemeIcon>
          <div>
            <Text size="xs" c="blue.4" tt="uppercase" fw={600} lh={1}>
              {label}
            </Text>
            <Text fw={700} size="lg" lh={1.3}>
              {title}
            </Text>
          </div>
        </Group>
      }
      styles={{
        header: {
          background: 'linear-gradient(135deg, #1C2348 0%, #2A3364 60%, #313B72 100%)',
          borderBottom: '1px solid #1e2028',
        },
        close: { color: 'white' },
      }}
    >
      {children}
    </Modal>
  );
}
