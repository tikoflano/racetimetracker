import {
  IconLayoutDashboard,
  IconCalendar,
  IconClock,
  IconTrophy,
  IconMapPin,
  IconBike,
  IconUsersGroup,
  IconTool,
  IconFlag,
} from '@tabler/icons-react';
import { IS_DEV } from '@/env';

export interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const navigation: NavSection[] = [
  {
    title: 'Main',
    items: [
      { icon: IconLayoutDashboard, label: 'Dashboard', path: '/' },
      { icon: IconFlag, label: 'Event Preview', path: '/event-preview' },
      { icon: IconCalendar, label: 'Calendar', path: '/calendar' },
      { icon: IconClock, label: 'Timekeeping', path: '/timekeep' },
    ],
  },
  {
    title: 'Manage',
    items: [
      { icon: IconUsersGroup, label: 'Organization', path: '/members' },
      { icon: IconTrophy, label: 'Championships', path: '/championships' },
      { icon: IconMapPin, label: 'Locations', path: '/locations' },
      { icon: IconBike, label: 'Riders', path: '/riders' },
    ],
  },
  ...(IS_DEV
    ? [
        {
          title: 'Dev',
          items: [{ icon: IconTool, label: 'Dev Tools', path: '/dev' }],
        } as NavSection,
      ]
    : []),
];
