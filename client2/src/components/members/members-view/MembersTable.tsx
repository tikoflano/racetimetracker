import { Avatar, Badge, Group, Paper, Text } from '@mantine/core';
import { DataTable } from 'mantine-datatable';
import type { DataTableSortStatus } from 'mantine-datatable';
import { IconCalendarEvent, IconTrophy } from '@tabler/icons-react';
import type { MemberRow } from './types';
import { BADGE_FULL_STYLES } from '@/components/common';
import { ROLE_COLORS, ROLE_LABELS } from './constants';
import { ROLE_ICONS } from './roleConstants';
import { MemberRowActions } from './MemberRowActions';

export interface MembersTableProps {
  records: MemberRow[];
  sortStatus: DataTableSortStatus<MemberRow>;
  onSortStatusChange: React.Dispatch<React.SetStateAction<DataTableSortStatus<MemberRow>>>;
  noRecordsText: string;
  canImpersonate: boolean;
  onEditRoles: (member: MemberRow) => void;
  onImpersonate: (member: MemberRow) => void;
  onResendInvite: (member: MemberRow) => void;
  onRemove: (member: MemberRow) => void;
}

export function MembersTable({
  records,
  sortStatus,
  onSortStatusChange,
  noRecordsText,
  canImpersonate,
  onEditRoles,
  onImpersonate,
  onResendInvite,
  onRemove,
}: MembersTableProps) {
  return (
    <Paper p="md" withBorder>
      <DataTable<MemberRow>
        withTableBorder={false}
        withColumnBorders={false}
        highlightOnHover
        minHeight={records.length === 0 ? 150 : undefined}
        records={records}
        sortStatus={sortStatus}
        onSortStatusChange={onSortStatusChange}
        noRecordsText={noRecordsText}
        columns={[
          {
            accessor: 'name',
            title: 'Member',
            sortable: true,
            render: (row) => (
              <Group gap="sm" wrap="nowrap">
                <Avatar
                  size="sm"
                  radius="xl"
                  color={ROLE_COLORS[row.role]}
                  variant="light"
                  style={{ flexShrink: 0 }}
                >
                  {row.name.slice(0, 2).toUpperCase()}
                </Avatar>
                <div style={{ minWidth: 0 }}>
                  <Text size="sm" fw={500} style={{ lineHeight: 1.3 }}>
                    {row.name}
                  </Text>
                  {row.email && (
                    <Text size="xs" c="dimmed" style={{ lineHeight: 1.3 }} truncate>
                      {row.email}
                    </Text>
                  )}
                  {row.status === 'pending' && (
                    <Badge size="xs" color="orange" variant="light" mt={2}>
                      Pending
                    </Badge>
                  )}
                </div>
              </Group>
            ),
          },
          {
            accessor: 'role',
            title: 'Role',
            sortable: true,
            render: (row) => (
              <Badge
                size="sm"
                color={ROLE_COLORS[row.role]}
                variant="light"
                leftSection={ROLE_ICONS[row.role]}
                styles={BADGE_FULL_STYLES}
              >
                {ROLE_LABELS[row.role]}
              </Badge>
            ),
          },
          {
            accessor: 'scopes' as const,
            title: 'Scopes',
            render: (row: MemberRow) => {
              const totalChamp = row.championshipScopes.length;
              const totalEvent = row.eventScopes.length;
              if (totalChamp === 0 && totalEvent === 0)
                return (
                  <Text size="xs" c="dimmed">
                    —
                  </Text>
                );
              return (
                <Group gap={4} wrap="wrap">
                  {row.championshipScopes.map((s) => (
                    <Badge
                      key={String(s.id)}
                      size="xs"
                      color="blue"
                      variant="light"
                      leftSection={<IconTrophy size={10} />}
                      styles={BADGE_FULL_STYLES}
                    >
                      {s.championshipName} ({s.role})
                    </Badge>
                  ))}
                  {row.eventScopes.map((s) => (
                    <Badge
                      key={String(s.id)}
                      size="xs"
                      color="violet"
                      variant="light"
                      leftSection={<IconCalendarEvent size={10} />}
                      styles={BADGE_FULL_STYLES}
                    >
                      {s.eventName} ({s.role})
                    </Badge>
                  ))}
                </Group>
              );
            },
          },
          {
            accessor: 'actions',
            title: '',
            width: 40,
            render: (row) => (
              <MemberRowActions
                member={row}
                canImpersonate={canImpersonate}
                onEditRoles={onEditRoles}
                onImpersonate={onImpersonate}
                onResendInvite={onResendInvite}
                onRemove={onRemove}
                compact
              />
            ),
          },
        ]}
      />
    </Paper>
  );
}
