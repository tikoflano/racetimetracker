import { Button, Paper, Stack, Text } from "@mantine/core";

interface EmptyStateProps {
  icon: React.ReactNode;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, message, action }: EmptyStateProps) {
  return (
    <Paper withBorder p="xl">
      <Stack align="center" gap="sm">
        {icon}
        <Text c="dimmed" ta="center">
          {message}
        </Text>
        {action && (
          <Button variant="light" onClick={action.onClick}>
            {action.label}
          </Button>
        )}
      </Stack>
    </Paper>
  );
}
