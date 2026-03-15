import { useState } from 'react';
import { ActionIcon, Group, Indicator, Paper, Popover, Text, TextInput } from '@mantine/core';
import { IconFilter, IconSearch, IconX } from '@tabler/icons-react';

interface FilterToolbarProps {
  filterContent: React.ReactNode;
  activeFilterCount?: number;
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  searchOpen: boolean;
  onSearchOpenChange: (open: boolean) => void;
  resultLabel?: string;
  leftContent?: React.ReactNode;
}

export function FilterToolbar({
  filterContent,
  activeFilterCount = 0,
  search,
  onSearchChange,
  searchPlaceholder = 'Search...',
  searchOpen,
  onSearchOpenChange,
  resultLabel,
  leftContent,
}: FilterToolbarProps) {
  const [filterOpen, setFilterOpen] = useState(false);

  return (
    <Paper p="sm" style={{ background: '#13151b', border: '1px solid #1e2028' }}>
      <Group justify="space-between" align="center" gap="sm">
        <Group gap="sm" align="center">
          <Popover
            opened={filterOpen}
            onChange={setFilterOpen}
            position="bottom-start"
            shadow="md"
            withinPortal
          >
            <Popover.Target>
              <Indicator
                disabled={activeFilterCount === 0}
                label={activeFilterCount}
                size={16}
                color="blue"
              >
                <ActionIcon
                  variant={activeFilterCount > 0 ? 'filled' : 'subtle'}
                  color={activeFilterCount > 0 ? 'blue' : 'gray'}
                  size="md"
                  onClick={() => setFilterOpen((o) => !o)}
                >
                  <IconFilter size={16} />
                </ActionIcon>
              </Indicator>
            </Popover.Target>
            <Popover.Dropdown p="sm">{filterContent}</Popover.Dropdown>
          </Popover>
          {resultLabel && (
            <Text size="xs" c="dimmed">
              {resultLabel}
            </Text>
          )}
          {leftContent}
        </Group>
        {searchOpen ? (
          <TextInput
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            size="sm"
            leftSection={<IconSearch size={14} />}
            rightSection={
              <ActionIcon
                variant="subtle"
                size="sm"
                color="gray"
                onClick={() => {
                  onSearchOpenChange(false);
                  onSearchChange('');
                }}
              >
                <IconX size={12} />
              </ActionIcon>
            }
            autoFocus
            style={{ flex: 1, minWidth: 0 }}
          />
        ) : (
          <ActionIcon
            variant={search ? 'filled' : 'subtle'}
            color={search ? 'blue' : 'gray'}
            size="md"
            onClick={() => onSearchOpenChange(true)}
          >
            <IconSearch size={16} />
          </ActionIcon>
        )}
      </Group>
    </Paper>
  );
}
