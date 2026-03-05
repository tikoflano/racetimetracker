import { Group, Text, Box } from '@mantine/core';

interface ConnectionIndicatorProps {
  isConnected: boolean;
  margin?: string | number;
}

export default function ConnectionIndicator({ isConnected, margin }: ConnectionIndicatorProps) {
  return (
    <Group gap="xs" mb={margin ?? 'md'} style={{ margin: margin === 0 ? 0 : undefined }}>
      <Box
        w={8}
        h={8}
        style={{
          borderRadius: '50%',
          background: isConnected ? 'var(--mantine-color-green-6)' : 'var(--mantine-color-red-6)',
        }}
      />
      <Text size="xs" c="dimmed">
        {isConnected ? 'Connected' : 'Disconnected'}
      </Text>
    </Group>
  );
}
