import { useMemo } from 'react';
import { Select } from '@mantine/core';
import type { ComboboxParsedItem, OptionsFilter } from '@mantine/core';

export default function SearchableSelect<T>({
  items,
  value,
  onChange,
  getLabel,
  getKey,
  placeholder,
  filterFn,
  showClear = true,
  clearLabel = 'Clear',
  disabled = false,
  label,
}: {
  items: T[];
  value: T | null;
  onChange: (item: T | null) => void;
  getLabel: (item: T) => string;
  getKey: (item: T) => string;
  placeholder: string;
  filterFn?: (item: T, query: string) => boolean;
  showClear?: boolean;
  clearLabel?: string;
  disabled?: boolean;
  label?: string;
}) {
  const data = useMemo(
    () => items.map((item) => ({ value: getKey(item), label: getLabel(item) })),
    [items, getKey, getLabel]
  );

  const selectValue = value ? getKey(value) : null;

  const handleChange = (val: string | null) => {
    if (val === null) {
      onChange(null);
      return;
    }
    const item = items.find((i) => getKey(i) === val) ?? null;
    onChange(item);
  };

  const filter: OptionsFilter | undefined = filterFn
    ? (input) => {
        const { options, search, limit } = input;
        const result: ComboboxParsedItem[] = [];
        for (const opt of options) {
          if (result.length >= limit) break;
          if ('group' in opt) {
            result.push(opt);
          } else {
            const item = items.find((i) => getKey(i) === opt.value);
            const keep = item ? filterFn(item, search) : opt.label.toLowerCase().includes(search.toLowerCase());
            if (keep) result.push(opt);
          }
        }
        return result;
      }
    : undefined;

  return (
    <Select
      label={label}
      data={data}
      value={selectValue}
      onChange={handleChange}
      placeholder={placeholder}
      searchable
      clearable={showClear}
      clearButtonProps={{ 'aria-label': clearLabel }}
      disabled={disabled}
      filter={filter}
      nothingFoundMessage="No matches found"
    />
  );
}
