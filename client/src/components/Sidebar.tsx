import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { NavLink, ActionIcon, Group, Text, Stack } from '@mantine/core';
import { useTable, useReducer } from 'spacetimedb/react';
import { tables, reducers } from '../module_bindings';
import { useAuth } from '../auth';
import { IS_DEV } from '../env';
import { IconPin, IconChevronLeft, IconChevronRight } from '../icons';
import type { Event, Organization, PinnedEvent } from '../module_bindings/types';

interface SidebarProps {
  activeOrg: Organization | null;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function Sidebar({
  activeOrg,
  collapsed,
  onToggleCollapse,
}: SidebarProps) {
  const { user, isAuthenticated, canManageOrg, canManageOrgEvents } = useAuth();
  const [events] = useTable(tables.event);
  const [pinnedEvents] = useTable(tables.pinned_event);

  const togglePin = useReducer(reducers.togglePinEvent);

  const pinnedEventIds = useMemo(() => {
    if (!user) return new Set<bigint>();
    return new Set(
      pinnedEvents.filter((f: PinnedEvent) => f.userId === user.id).map((f) => f.eventId)
    );
  }, [user, pinnedEvents]);

  const pinnedList = useMemo(() => {
    return events.filter((e: Event) => pinnedEventIds.has(e.id));
  }, [events, pinnedEventIds]);

  return (
    <>
      <Stack gap="lg" flex={1}>
        <Stack gap={4}>
          <Text size="xs" fw={600} c="dimmed" tt="uppercase" px="md" mb={4}>
            Pinned Events
          </Text>
          {pinnedList.length === 0 ? (
            <Text size="sm" c="dimmed" px="md" py="xs">
              No pinned events
            </Text>
          ) : (
            pinnedList.map((e: Event) => (
              <Group key={String(e.id)} gap="xs" wrap="nowrap">
                <NavLink
                  component={Link}
                  to={`/event/${e.slug}`}
                  label={collapsed ? null : e.name}
                  style={{ flex: 1, minWidth: 0 }}
                />
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  onClick={() => togglePin({ eventId: e.id })}
                  title="Unpin event"
                >
                  <IconPin size={16} />
                </ActionIcon>
              </Group>
            ))
          )}
        </Stack>

        {isAuthenticated && (
          <Stack gap={4}>
            <NavLink component={Link} to="/calendar" label={collapsed ? null : 'Calendar'} />
            <NavLink component={Link} to="/timekeep" label={collapsed ? null : 'Timekeeping'} />
          </Stack>
        )}

        {activeOrg && canManageOrgEvents(activeOrg.id) && (
          <Stack gap={4}>
            <Text size="xs" fw={600} c="dimmed" tt="uppercase" px="md" mb={4}>
              Manage
            </Text>
            <NavLink component={Link} to="/championships" label={collapsed ? null : 'Championships'} />
            <NavLink component={Link} to="/locations" label={collapsed ? null : 'Locations'} />
            <NavLink component={Link} to="/riders" label={collapsed ? null : 'Riders'} />
            {canManageOrg(activeOrg.id) && (
              <NavLink component={Link} to="/members" label={collapsed ? null : 'Members'} />
            )}
          </Stack>
        )}

        {IS_DEV && isAuthenticated && (
          <Stack gap={4} style={{ borderTop: '1px solid var(--mantine-color-default-border)' }} pt="md">
            <NavLink component={Link} to="/dev" label={collapsed ? '🛠' : 'Dev Tools'} style={{ opacity: 0.6 }} />
          </Stack>
        )}
      </Stack>

      {onToggleCollapse && (
        <Stack gap={0} style={{ borderTop: '1px solid var(--mantine-color-default-border)' }} p={4}>
          <ActionIcon
            variant="subtle"
            size="sm"
            onClick={onToggleCollapse}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            style={{ width: '100%' }}
          >
            {collapsed ? <IconChevronRight size={16} /> : <IconChevronLeft size={16} />}
          </ActionIcon>
        </Stack>
      )}
    </>
  );
}
