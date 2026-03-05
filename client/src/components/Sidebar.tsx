import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { NavLink, ActionIcon, Group, Text, Stack } from '@mantine/core';
import { useTable, useReducer } from 'spacetimedb/react';
import { tables, reducers } from '../module_bindings';
import { useAuth } from '../auth';
import { IS_DEV } from '../env';
import {
  IconPin,
  IconChevronLeft,
  IconChevronRight,
  IconCalendar,
  IconCalendarEvent,
  IconClock,
  IconTrophy,
  IconMapPin,
  IconUsers,
  IconUsersGroup,
  IconTool,
} from '../icons';
import type { Event, Organization, PinnedEvent } from '../module_bindings/types';

const accentColor = '#6F9CEB';
const navLinkStyles = {
  root: {
    color: 'var(--mantine-color-white)',
    borderRadius: 'var(--mantine-radius-sm)',
    marginRight: 'var(--mantine-spacing-xs)',
    paddingLeft: 'var(--mantine-spacing-xs)',
    paddingRight: 'var(--mantine-spacing-sm)',
    '&[data-active]': {
      backgroundColor: `${accentColor}40`,
    },
    '&:hover': {
      backgroundColor: `${accentColor}26`,
    },
  },
} as const;

const sectionLabelStyle = { color: 'rgba(255,255,255,0.65)' } as const;

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
      <Stack gap="lg" flex={1} p={collapsed ? 'xs' : 'sm'}>
        <Stack gap={4}>
          {!collapsed && (
            <Text size="xs" fw={600} tt="uppercase" px="xs" mb={4} style={sectionLabelStyle}>
              Pinned Events
            </Text>
          )}
          {pinnedList.length === 0 ? (
            !collapsed && (
              <Text size="sm" px="md" py="xs" style={sectionLabelStyle}>
                No pinned events
              </Text>
            )
          ) : (
            pinnedList.map((e: Event) => (
              <Group key={String(e.id)} gap="xs" wrap="nowrap">
                <NavLink
                  component={Link}
                  to={`/event/${e.slug}`}
                  label={collapsed ? null : e.name}
                  leftSection={<IconCalendarEvent size={16} />}
                  styles={navLinkStyles}
                  style={{ flex: 1, minWidth: 0 }}
                />
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  color="gray"
                  onClick={() => togglePin({ eventId: e.id })}
                  title="Unpin event"
                  style={{ color: 'rgba(255,255,255,0.8)' }}
                >
                  <IconPin size={16} />
                </ActionIcon>
              </Group>
            ))
          )}
        </Stack>

        {isAuthenticated && (
          <Stack gap={4}>
            <NavLink
              component={Link}
              to="/calendar"
              label={collapsed ? null : 'Calendar'}
              leftSection={<IconCalendar size={16} />}
              styles={navLinkStyles}
            />
            <NavLink
              component={Link}
              to="/timekeep"
              label={collapsed ? null : 'Timekeeping'}
              leftSection={<IconClock size={16} />}
              styles={navLinkStyles}
            />
          </Stack>
        )}

        {activeOrg && canManageOrgEvents(activeOrg.id) && (
          <Stack gap={4}>
            {!collapsed && (
              <Text size="xs" fw={600} tt="uppercase" px="xs" mb={4} style={sectionLabelStyle}>
                Manage
              </Text>
            )}
            <NavLink
              component={Link}
              to="/championships"
              label={collapsed ? null : 'Championships'}
              leftSection={<IconTrophy size={16} />}
              styles={navLinkStyles}
            />
            <NavLink
              component={Link}
              to="/locations"
              label={collapsed ? null : 'Locations'}
              leftSection={<IconMapPin size={16} />}
              styles={navLinkStyles}
            />
            <NavLink
              component={Link}
              to="/riders"
              label={collapsed ? null : 'Riders'}
              leftSection={<IconUsers size={16} />}
              styles={navLinkStyles}
            />
            {canManageOrg(activeOrg.id) && (
              <NavLink
                component={Link}
                to="/members"
                label={collapsed ? null : 'Members'}
                leftSection={<IconUsersGroup size={16} />}
                styles={navLinkStyles}
              />
            )}
          </Stack>
        )}

        {IS_DEV && isAuthenticated && (
          <Stack gap={4} style={{ borderTop: '1px solid rgba(255,255,255,0.2)' }} pt="md">
            <NavLink
              component={Link}
              to="/dev"
              label={collapsed ? null : 'Dev Tools'}
              leftSection={<IconTool size={16} />}
              styles={navLinkStyles}
              style={{ opacity: 0.85 }}
            />
          </Stack>
        )}
      </Stack>

      {onToggleCollapse && (
        <Stack gap={0} style={{ borderTop: '1px solid rgba(255,255,255,0.2)' }} p={4}>
          <ActionIcon
            variant="subtle"
            size="sm"
            color="gray"
            onClick={onToggleCollapse}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            style={{ width: '100%', color: 'rgba(255,255,255,0.8)' }}
          >
            {collapsed ? <IconChevronRight size={16} /> : <IconChevronLeft size={16} />}
          </ActionIcon>
        </Stack>
      )}
    </>
  );
}
