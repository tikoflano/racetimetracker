import { Skeleton as MSkeleton, Paper, Table, Stack, Group } from '@mantine/core';

interface SkeletonProps {
  width?: string;
  height?: string;
  borderRadius?: string;
  style?: React.CSSProperties;
}

export function Skeleton({
  width = '100%',
  height = '16px',
  borderRadius = '4px',
  style,
}: SkeletonProps) {
  return (
    <MSkeleton
      width={width}
      height={height}
      radius={borderRadius}
      style={style}
    />
  );
}

export function SkeletonCard({ lines = 2 }: { lines?: number }) {
  return (
    <Paper withBorder p="md" style={{ pointerEvents: 'none' }}>
      <MSkeleton height={18} width="40%" mb="xs" />
      {Array.from({ length: lines }).map((_, i) => (
        <MSkeleton
          key={i}
          height={14}
          width={i === lines - 1 ? '60%' : '90%'}
          mb={i < lines - 1 ? 'xs' : 0}
        />
      ))}
    </Paper>
  );
}

export function SkeletonTable({ rows = 4, cols = 3 }: { rows?: number; cols?: number }) {
  return (
    <Table>
      <Table.Thead>
        <Table.Tr>
          {Array.from({ length: cols }).map((_, i) => (
            <Table.Th key={i}>
              <MSkeleton height={10} width={60} />
            </Table.Th>
          ))}
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {Array.from({ length: rows }).map((_, r) => (
          <Table.Tr key={r}>
            {Array.from({ length: cols }).map((_, c) => (
              <Table.Td key={c}>
                <MSkeleton
                  height={14}
                  width={c === 0 ? 30 : c === cols - 1 ? 70 : 100}
                />
              </Table.Td>
            ))}
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}

export function SkeletonHeader() {
  return (
    <Stack gap="xs" mb="lg">
      <MSkeleton height={28} width="50%" />
      <MSkeleton height={14} width="70%" />
      <MSkeleton height={14} width="40%" />
    </Stack>
  );
}

export function EventViewSkeleton() {
  return (
    <Stack gap="lg">
      <SkeletonHeader />
      <Stack gap="xs">
        <MSkeleton height={11} width={60} />
        <SkeletonCard lines={1} />
        <SkeletonCard lines={1} />
      </Stack>
      <Stack gap="xs">
        <MSkeleton height={11} width={100} />
        <SkeletonTable rows={4} cols={4} />
      </Stack>
    </Stack>
  );
}

export function TrackViewSkeleton() {
  return (
    <Stack gap="lg">
      <MSkeleton height={14} width={100} />
      <MSkeleton height={28} width="50%" />
      <MSkeleton height={14} width="70%" />
      <Stack gap="xs">
        <MSkeleton height={11} width={80} />
        <Paper withBorder p="xl" style={{ textAlign: 'center' }}>
          <MSkeleton height={14} width={60} mx="auto" mb="xs" />
          <MSkeleton height={22} width={160} mx="auto" mb="xs" />
          <MSkeleton height={14} width={100} mx="auto" mb="md" />
          <MSkeleton height={52} radius="md" />
        </Paper>
      </Stack>
      <Stack gap="xs">
        <MSkeleton height={11} width={60} />
        <SkeletonCard lines={1} />
        <SkeletonCard lines={1} />
      </Stack>
    </Stack>
  );
}

export function AppSkeleton() {
  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <MSkeleton height={14} width={90} />
        <MSkeleton height={32} width={80} radius="xl" />
      </Group>
      <EventViewSkeleton />
    </Stack>
  );
}
