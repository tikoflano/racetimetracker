import { useState, useMemo } from 'react';
import { Stack, TextInput, NumberInput, Button, Group, Text, ScrollArea } from '@mantine/core';
import Modal from './Modal';
import type { Rider } from '../module_bindings/types';

function getAge(dateOfBirth: string): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}

interface AddRiderModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (riderId: bigint) => void;
  /** Org riders not yet assigned to the event */
  availableRiders: readonly Rider[];
}

export default function AddRiderModal({
  open,
  onClose,
  onAdd,
  availableRiders,
}: AddRiderModalProps) {
  const [search, setSearch] = useState('');
  const [minAge, setMinAge] = useState<string | number>('');
  const [maxAge, setMaxAge] = useState<string | number>('');

  const handleClose = () => {
    setSearch('');
    setMinAge('');
    setMaxAge('');
    onClose();
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const min = minAge !== '' ? Number(minAge) : null;
    const max = maxAge !== '' ? Number(maxAge) : null;

    return availableRiders.filter((r) => {
      if (q) {
        const full = `${r.firstName} ${r.lastName}`.toLowerCase();
        if (!full.includes(q)) return false;
      }
      if (min !== null || max !== null) {
        const age = getAge(r.dateOfBirth);
        if (age === null) return false;
        if (min !== null && age < min) return false;
        if (max !== null && age > max) return false;
      }
      return true;
    });
  }, [availableRiders, search, minAge, maxAge]);

  return (
    <Modal open={open} onClose={handleClose} title="Add Riders">
      <Stack gap="xs" mb="md">
        <TextInput
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
        <Group grow>
          <NumberInput
            label="Min Age"
            min={0}
            value={minAge}
            onChange={setMinAge}
            placeholder="—"
          />
          <NumberInput
            label="Max Age"
            min={0}
            value={maxAge}
            onChange={setMaxAge}
            placeholder="—"
          />
        </Group>
      </Stack>

      <Text size="xs" c="dimmed" mb="xs">
        {filtered.length} rider{filtered.length !== 1 ? 's' : ''} found
      </Text>

      <ScrollArea h={300}>
        <Stack gap={4}>
          {filtered.length === 0 ? (
            <Text size="xs" c="dimmed" p="xs">
              {availableRiders.length === 0
                ? 'All riders are already assigned.'
                : 'No riders match your filters.'}
            </Text>
          ) : (
            filtered.map((r) => {
              const age = getAge(r.dateOfBirth);
              return (
                <Group key={String(r.id)} justify="space-between" p="xs" style={{ borderRadius: 4 }}>
                  <div>
                    <Text size="sm">
                      {r.firstName} {r.lastName}
                    </Text>
                    {age !== null && (
                      <Text size="xs" c="dimmed" component="span" ml={8}>
                        ({age} yrs)
                      </Text>
                    )}
                  </div>
                  <Button size="xs" onClick={() => onAdd(r.id)}>
                    Add
                  </Button>
                </Group>
              );
            })
          )}
        </Stack>
      </ScrollArea>
    </Modal>
  );
}
