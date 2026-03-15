import type { DataTableSortStatus } from 'mantine-datatable';

/** Extract user-facing message from unknown error */
export function getErrorMessage(e: unknown, fallback: string): string {
  if (e instanceof Error && e.message) return e.message;
  if (typeof e === 'string') return e;
  return fallback;
}

/** Sort records by column for DataTable */
export function sortRecords<T>(records: T[], sortStatus: DataTableSortStatus<T>): T[] {
  const key = sortStatus.columnAccessor as keyof T;
  const dir = sortStatus.direction === 'asc' ? 1 : -1;
  return [...records].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    if (aVal === bVal) return 0;
    const cmp = String(aVal).localeCompare(String(bVal), undefined, {
      numeric: true,
    });
    return cmp * dir;
  });
}
