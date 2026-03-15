import { Badge } from '@mantine/core';
import type { BadgeProps } from '@mantine/core';

interface StatusBadgeProps {
  status: string;
  size?: BadgeProps['size'];
}

const STATUS_COLORS: Record<string, string> = {
  not_started: 'yellow',
  in_progress: 'blue',
  completed: 'gray',
};

const STATUS_LABELS: Record<string, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  completed: 'Completed',
};

export function StatusBadge({ status, size }: StatusBadgeProps) {
  return (
    <Badge size={size ?? 'sm'} color={STATUS_COLORS[status] ?? 'gray'} variant="light">
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
