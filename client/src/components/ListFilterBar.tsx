import { Group, TextInput, Button } from '@mantine/core';
import type { GroupProps } from '@mantine/core';

export interface ListFilterBarFilterOption {
  value: string;
  label: string;
  count: number;
}

export interface ListFilterBarProps {
  /** Optional search field (placeholder, value, onChange). */
  search?: {
    placeholder: string;
    value: string;
    onChange: (value: string) => void;
    /** Max width for the search input, e.g. 280. */
    maxWidth?: number;
  };
  /** Optional filter buttons (e.g. status or role) with counts. */
  filterButtons?: {
    options: ListFilterBarFilterOption[];
    value: string;
    onChange: (value: string) => void;
  };
  /** Optional extra controls (e.g. age range inputs). Rendered after search and filter buttons. */
  children?: React.ReactNode;
  /** Optional spacing: mb, mt, etc. passed to the root Group. */
  mb?: GroupProps['mb'];
  mt?: GroupProps['mt'];
  /** Optional className for the root Group. */
  className?: string;
}

/**
 * Shared filter bar for list views: optional search, optional filter buttons with counts,
 * and optional extra controls (children). Use one per view to keep behavior and styling consistent.
 */
export default function ListFilterBar({
  search,
  filterButtons,
  children,
  className,
  mb,
  mt,
}: ListFilterBarProps) {
  const hasSearch = search && (search.placeholder || search.value !== undefined);
  const hasFilters = filterButtons && filterButtons.options.length > 0;
  const hasChildren = Boolean(children);

  if (!hasSearch && !hasFilters && !hasChildren) return null;

  return (
    <Group gap="md" wrap="wrap" align={children ? 'flex-end' : 'center'} className={className} mb={mb} mt={mt}>
      {hasSearch && (
        <TextInput
          placeholder={search!.placeholder}
          value={search!.value}
          onChange={(e) => search!.onChange(e.target.value)}
          style={search!.maxWidth != null ? { maxWidth: search!.maxWidth } : undefined}
        />
      )}
      {hasFilters && (
        <Group gap="xs">
          {filterButtons!.options.map((opt) => (
            <Button
              key={opt.value}
              size="xs"
              variant={filterButtons!.value === opt.value ? 'filled' : 'subtle'}
              onClick={() => filterButtons!.onChange(opt.value)}
            >
              {opt.label} ({opt.count})
            </Button>
          ))}
        </Group>
      )}
      {children}
    </Group>
  );
}
