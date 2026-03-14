import { useCallback, useState } from "react";
import type { DataTableSortStatus } from "mantine-datatable";
import type { MemberRow } from "./types";
import { useSearchSortTable } from "@/hooks/useSearchSortTable";

const DEFAULT_SORT: DataTableSortStatus<MemberRow> = {
  columnAccessor: "name",
  direction: "asc",
};

export interface UseMembersFiltersParams {
  memberRows: MemberRow[];
}

export interface UseMembersFiltersResult {
  search: string;
  setSearch: (v: string) => void;
  roleFilters: string[];
  setRoleFilters: React.Dispatch<React.SetStateAction<string[]>>;
  sortStatus: DataTableSortStatus<MemberRow>;
  setSortStatus: React.Dispatch<
    React.SetStateAction<DataTableSortStatus<MemberRow>>
  >;
  searchOpen: boolean;
  setSearchOpen: (v: boolean) => void;
  filteredAndSortedRecords: MemberRow[];
}

export function useMembersFilters({
  memberRows,
}: UseMembersFiltersParams): UseMembersFiltersResult {
  const [roleFilters, setRoleFilters] = useState<string[]>([]);

  const matchSearch = useCallback((row: MemberRow, q: string) => {
    if (!q) return true;
    return (
      row.name.toLowerCase().includes(q) || row.email.toLowerCase().includes(q)
    );
  }, []);

  const additionalFilter = useCallback(
    (row: MemberRow) =>
      roleFilters.length === 0 || roleFilters.includes(row.role),
    [roleFilters]
  );

  const {
    search,
    setSearch,
    sortStatus,
    setSortStatus,
    searchOpen,
    setSearchOpen,
    filteredAndSortedRecords,
  } = useSearchSortTable(memberRows, DEFAULT_SORT, {
    matchSearch,
    additionalFilter,
  });

  return {
    search,
    setSearch,
    roleFilters,
    setRoleFilters,
    sortStatus,
    setSortStatus,
    searchOpen,
    setSearchOpen,
    filteredAndSortedRecords,
  };
}
