import {
  IconBuilding,
  IconCalendarEvent,
  IconClock,
  IconShield,
  IconShieldStar,
  IconTrophy,
  IconUserCog,
  IconUsers,
} from '@tabler/icons-react';

export const ROLE_ICONS: Record<
  'all' | 'owner' | 'admin' | 'manager' | 'timekeeper',
  React.ReactNode
> = {
  all: <IconUsers size={14} />,
  owner: <IconShieldStar size={14} />,
  admin: <IconShield size={14} />,
  manager: <IconUserCog size={14} />,
  timekeeper: <IconClock size={14} />,
};

export interface RolesPermissionsRow {
  scope: string;
  scopeIcon: React.ReactNode;
  scopeColor: string;
  role: string;
  roleIcon: React.ReactNode;
  roleColor: string;
  access: string;
}

export const ROLES_PERMISSIONS_ROWS: RolesPermissionsRow[] = [
  {
    scope: 'Organization',
    scopeIcon: <IconBuilding size={12} />,
    scopeColor: 'green',
    role: 'Owner',
    roleIcon: <IconShieldStar size={12} />,
    roleColor: 'blue',
    access:
      'Full access: manage org, members, championships, events, locations, riders, and timekeeping.',
  },
  {
    scope: 'Organization',
    scopeIcon: <IconBuilding size={12} />,
    scopeColor: 'green',
    role: 'Admin',
    roleIcon: <IconShield size={12} />,
    roleColor: 'green',
    access:
      'Manage org and members (invite, remove, rename). Full access to championships, events, locations, riders, and timekeeping.',
  },
  {
    scope: 'Organization',
    scopeIcon: <IconBuilding size={12} />,
    scopeColor: 'green',
    role: 'Manager',
    roleIcon: <IconUserCog size={12} />,
    roleColor: 'orange',
    access:
      'Manage championships, events, locations, riders. Can organize events and assign timekeepers. Cannot manage org members.',
  },
  {
    scope: 'Organization',
    scopeIcon: <IconBuilding size={12} />,
    scopeColor: 'green',
    role: 'Timekeeper',
    roleIcon: <IconClock size={12} />,
    roleColor: 'gray',
    access: 'Timekeeping only: start/finish runs, DNF, DNS at any event in the org.',
  },
  {
    scope: 'Championship',
    scopeIcon: <IconTrophy size={12} />,
    scopeColor: 'blue',
    role: 'Manager',
    roleIcon: <IconUserCog size={12} />,
    roleColor: 'orange',
    access:
      "Manage this championship's events, tracks, categories, riders, schedule, timekeeper assignments.",
  },
  {
    scope: 'Championship',
    scopeIcon: <IconTrophy size={12} />,
    scopeColor: 'blue',
    role: 'Timekeeper',
    roleIcon: <IconClock size={12} />,
    roleColor: 'gray',
    access: "Timekeeping at this championship's events.",
  },
  {
    scope: 'Event',
    scopeIcon: <IconCalendarEvent size={12} />,
    scopeColor: 'violet',
    role: 'Manager',
    roleIcon: <IconUserCog size={12} />,
    roleColor: 'orange',
    access: 'Manage this event: tracks, categories, riders, schedule, timekeeper assignments.',
  },
  {
    scope: 'Event',
    scopeIcon: <IconCalendarEvent size={12} />,
    scopeColor: 'violet',
    role: 'Timekeeper',
    roleIcon: <IconClock size={12} />,
    roleColor: 'gray',
    access: 'Timekeeping at this event.',
  },
];
