import { ActionIcon, Badge, Box, Button, Group, Select, Stack, Text } from '@mantine/core';
import { IconCalendarEvent, IconTrash } from '@tabler/icons-react';
import type { ScopeEvent } from '../../types';
import { BADGE_FULL_STYLES } from '@/components/common';

interface EventScopesSectionProps {
  memberScopes: ScopeEvent[];
  availableEvents: { id: bigint; name: string }[];
  addEventId: string | null;
  setAddEventId: (v: string | null) => void;
  addEventRole: 'manager' | 'timekeeper';
  setAddEventRole: (v: 'manager' | 'timekeeper') => void;
  loading: boolean;
  onAdd: () => void;
  onRemove: (scope: ScopeEvent) => void;
  onUpdateRole: (scope: ScopeEvent, role: 'manager' | 'timekeeper') => void;
}

export function EventScopesSection({
  memberScopes,
  availableEvents,
  addEventId,
  setAddEventId,
  addEventRole,
  setAddEventRole,
  loading,
  onAdd,
  onRemove,
  onUpdateRole,
}: EventScopesSectionProps) {
  return (
    <Box>
      <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb="xs">
        Event scopes
      </Text>
      <Text size="xs" c="dimmed" mb="xs">
        Grant access to specific events. Manager: manage tracks, categories, riders, schedule.
        Timekeeper: timekeeping only.
      </Text>
      {memberScopes.length > 0 && (
        <Stack gap="xs" mb="sm">
          {memberScopes.map((s) => (
            <Group key={String(s.id)} justify="space-between" wrap="nowrap">
              <Group gap="xs">
                <Badge
                  size="sm"
                  color="violet"
                  variant="light"
                  leftSection={<IconCalendarEvent size={12} />}
                  styles={BADGE_FULL_STYLES}
                >
                  {s.eventName}
                </Badge>
                <Select
                  value={s.role}
                  onChange={(v) => onUpdateRole(s, (v as 'manager' | 'timekeeper') || 'manager')}
                  data={[
                    { value: 'manager', label: 'Manager' },
                    { value: 'timekeeper', label: 'Timekeeper' },
                  ]}
                  size="xs"
                  style={{ width: 110 }}
                  disabled={loading}
                />
              </Group>
              <ActionIcon
                size="sm"
                color="red"
                variant="subtle"
                onClick={() => onRemove(s)}
                disabled={loading}
              >
                <IconTrash size={14} />
              </ActionIcon>
            </Group>
          ))}
        </Stack>
      )}
      {availableEvents.length > 0 && (
        <Group gap="xs" align="center">
          <Select
            placeholder="Add event..."
            value={addEventId}
            onChange={setAddEventId}
            data={availableEvents.map((e) => ({
              value: String(e.id),
              label: e.name,
            }))}
            searchable
            clearable
            style={{ flex: 1 }}
          />
          <Select
            value={addEventRole}
            onChange={(v) => setAddEventRole((v as 'manager' | 'timekeeper') || 'manager')}
            data={[
              { value: 'manager', label: 'Manager' },
              { value: 'timekeeper', label: 'Timekeeper' },
            ]}
            style={{ width: 110 }}
          />
          <Button size="xs" onClick={onAdd} disabled={!addEventId || loading}>
            Add
          </Button>
        </Group>
      )}
      {memberScopes.length === 0 && availableEvents.length === 0 && (
        <Text size="sm" c="dimmed">
          No events in this org. Create one first.
        </Text>
      )}
    </Box>
  );
}
