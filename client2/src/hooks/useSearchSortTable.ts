import { useMemo, useState } from "react";
import type { DataTableSortStatus } from "mantine-datatable";
import { sortRecords } from "@/utils";

export interface UseSearchSortTableOptions<T> {
  /** Return true if record matches the search query (q is trimmed lowercased) */
  matchSearch: (record: T, searchQuery: string) => boolean;
  /** Optional extra filter (e.g. role, status). Applied in addition to search. */
  additionalFilter?: (record: T) => boolean;
}

export interface UseSearchSortTableResult<T> {
  search: string;
  setSearch: (value: string) => void;
  sortStatus: DataTableSortStatus<T>;
  setSortStatus: React.Dispatch<React.SetStateAction<DataTableSortStatus<T>>>;
  searchOpen: boolean;
  setSearchOpen: (value: boolean) => void;
  filteredAndSortedRecords: T[];
}

/**
 * Shared hook for a searchable, sortable table (e.g. FilterToolbar + DataTable).
 * Uses generic column-based sort via sortRecords from @/utils.
 * For custom sort logic per column, keep local useMemo in the view.
 */
export function useSearchSortTable<T>(
  records: T[],
  initialSort: DataTableSortStatus<T>,
  options: UseSearchSortTableOptions<T>
): UseSearchSortTableResult<T> {
  const { matchSearch, additionalFilter } = options;
  const [search, setSearch] = useState("");
  const [sortStatus, setSortStatus] =
    useState<DataTableSortStatus<T>>(initialSort);
  const [searchOpen, setSearchOpen] = useState(false);

  const filteredAndSortedRecords = useMemo(() => {
    const q = search.toLowerCase().trim();
    const filtered = records.filter(
      (r) => matchSearch(r, q) && (additionalFilter?.(r) ?? true)
    );
    return sortRecords(filtered, sortStatus);
  }, [records, search, sortStatus, matchSearch, additionalFilter]);

  return {
    search,
    setSearch,
    sortStatus,
    setSortStatus,
    searchOpen,
    setSearchOpen,
    filteredAndSortedRecords,
  };
}
