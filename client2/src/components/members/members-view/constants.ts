import type { MemberRole } from './types';

export const ROLE_FILTER_OPTIONS = ['all', 'owner', 'admin', 'manager', 'timekeeper'] as const;

export type RoleFilterOption = (typeof ROLE_FILTER_OPTIONS)[number];

export const ROLE_LABELS: Record<MemberRole | 'all', string> = {
  all: 'All',
  owner: 'Owner',
  admin: 'Admin',
  manager: 'Manager',
  timekeeper: 'Timekeeper',
};

export const ROLE_COLORS: Record<MemberRole | 'all', string> = {
  all: 'gray',
  owner: 'blue',
  admin: 'green',
  manager: 'orange',
  timekeeper: 'gray',
};
