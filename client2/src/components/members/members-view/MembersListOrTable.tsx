import type { DataTableSortStatus } from 'mantine-datatable';
import { Paper, Stack, Text } from '@mantine/core';
import type { MemberRow } from './types';
import { MemberCard } from './MemberCard';
import { MembersTable } from './MembersTable';

export interface MembersListOrTableProps {
  isMobile: boolean;
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

export function MembersListOrTable({
  isMobile,
  records,
  sortStatus,
  onSortStatusChange,
  noRecordsText,
  canImpersonate,
  onEditRoles,
  onImpersonate,
  onResendInvite,
  onRemove,
}: MembersListOrTableProps) {
  if (isMobile) {
    return (
      <Stack gap="sm">
        {records.length === 0 && (
          <Paper p="md" withBorder>
            <Text size="sm" c="dimmed" ta="center">
              {noRecordsText}
            </Text>
          </Paper>
        )}
        {records.map((row) => (
          <MemberCard
            key={row.id}
            member={row}
            canImpersonate={canImpersonate}
            onEditRoles={onEditRoles}
            onImpersonate={onImpersonate}
            onResendInvite={onResendInvite}
            onRemove={onRemove}
          />
        ))}
      </Stack>
    );
  }

  return (
    <MembersTable
      records={records}
      sortStatus={sortStatus}
      onSortStatusChange={onSortStatusChange}
      noRecordsText={noRecordsText}
      canImpersonate={canImpersonate}
      onEditRoles={onEditRoles}
      onImpersonate={onImpersonate}
      onResendInvite={onResendInvite}
      onRemove={onRemove}
    />
  );
}
