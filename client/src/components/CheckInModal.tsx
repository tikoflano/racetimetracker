import { useState, useEffect } from 'react';
import { Stack, Text, NumberInput, Button, Group } from '@mantine/core';
import Modal from './Modal';
import type { Rider, EventRider } from '../module_bindings/types';

interface CheckInModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (assignedNumber: number) => void | Promise<void>;
  rider: Rider;
  eventRider: EventRider;
  defaultNumber: number | null;
  categoryName: string | null;
}

export default function CheckInModal({
  open,
  onClose,
  onConfirm,
  rider,
  defaultNumber,
  categoryName,
}: CheckInModalProps) {
  const [numberInput, setNumberInput] = useState<string | number>(
    defaultNumber !== null ? defaultNumber : ''
  );

  useEffect(() => {
    if (open) {
      setNumberInput(defaultNumber !== null ? defaultNumber : '');
    }
  }, [open, defaultNumber]);

  const handleConfirm = async () => {
    const num = numberInput === '' ? 0 : Number(numberInput);
    if (isNaN(num) || num < 0) return;
    await onConfirm(num);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Confirm Check-in">
      <Stack gap="md">
        <div>
          <Text size="xs" c="dimmed" mb={4}>
            Rider
          </Text>
          <Text fw={600} size="lg">
            {rider.firstName} {rider.lastName}
          </Text>
        </div>
        <NumberInput
          label="Assigned Number"
          min={0}
          value={numberInput}
          onChange={setNumberInput}
          placeholder={defaultNumber !== null ? String(defaultNumber) : '—'}
        />
        {categoryName && (
          <Text size="xs" c="dimmed" mt={4}>
            {categoryName}
          </Text>
        )}
        <Text size="xs" c="dimmed" m={0}>
          Confirm that this rider has checked in. Set or change the number above.
        </Text>
        <Group justify="flex-end" mt="xs">
          <Button variant="subtle" size="xs" onClick={onClose}>
            Cancel
          </Button>
          <Button size="xs" onClick={handleConfirm}>
            Confirm Check-in
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
