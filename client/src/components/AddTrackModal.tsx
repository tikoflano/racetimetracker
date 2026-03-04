import { useState, useMemo } from 'react';
import {
  Stack,
  TextInput,
  Button,
  Group,
  Text,
  Paper,
  ScrollArea,
  UnstyledButton,
} from '@mantine/core';
import Modal from './Modal';
import type { Track, TrackVariation } from '../module_bindings/types';

interface AddTrackModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (trackVariationId: bigint) => void;
  venueName: string;
  venueTracks: readonly Track[];
  allVariations: readonly TrackVariation[];
  usedVariationIds: Set<bigint>;
}

export default function AddTrackModal({
  open,
  onClose,
  onConfirm,
  venueName,
  venueTracks,
  allVariations,
  usedVariationIds,
}: AddTrackModalProps) {
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [selectedVariation, setSelectedVariation] = useState<TrackVariation | null>(null);
  const [trackSearch, setTrackSearch] = useState('');
  const [varSearch, setVarSearch] = useState('');

  const reset = () => {
    setSelectedTrack(null);
    setSelectedVariation(null);
    setTrackSearch('');
    setVarSearch('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const availableTracks = useMemo(() => {
    return venueTracks.filter((track) => {
      return allVariations.some((tv) => tv.trackId === track.id && !usedVariationIds.has(tv.id));
    });
  }, [venueTracks, allVariations, usedVariationIds]);

  const filteredTracks = useMemo(() => {
    const q = trackSearch.toLowerCase().trim();
    if (!q) return availableTracks;
    return availableTracks.filter((t) => t.name.toLowerCase().includes(q));
  }, [availableTracks, trackSearch]);

  const availableVariations = useMemo(() => {
    if (!selectedTrack) return [];
    return allVariations.filter(
      (tv) => tv.trackId === selectedTrack.id && !usedVariationIds.has(tv.id)
    );
  }, [selectedTrack, allVariations, usedVariationIds]);

  const filteredVariations = useMemo(() => {
    const q = varSearch.toLowerCase().trim();
    if (!q) return availableVariations;
    return availableVariations.filter((tv) => tv.name.toLowerCase().includes(q));
  }, [availableVariations, varSearch]);

  const handleConfirm = () => {
    if (!selectedVariation) return;
    onConfirm(selectedVariation.id);
    reset();
  };

  return (
    <Modal open={open} onClose={handleClose} title={`Add Track from ${venueName}`}>
      {!selectedTrack && (
        <Stack gap="xs">
          <TextInput
            placeholder="Search tracks..."
            value={trackSearch}
            onChange={(e) => setTrackSearch(e.target.value)}
            autoFocus
          />
          <ScrollArea h={300}>
            <Stack gap={4}>
              {filteredTracks.length === 0 ? (
                <Text size="xs" c="dimmed" p="xs">
                  {availableTracks.length === 0
                    ? 'No tracks available from this location.'
                    : 'No tracks match your search.'}
                </Text>
              ) : (
                filteredTracks.map((track) => (
                  <UnstyledButton
                    key={String(track.id)}
                    p="sm"
                    style={{ borderRadius: 4, textAlign: 'left' }}
                    onClick={() => {
                      setSelectedTrack(track);
                      setVarSearch('');
                      setSelectedVariation(null);
                    }}
                  >
                    <Group gap="xs">
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          background: track.color,
                          flexShrink: 0,
                        }}
                      />
                      <Text fw={600}>{track.name}</Text>
                    </Group>
                  </UnstyledButton>
                ))
              )}
            </Stack>
          </ScrollArea>
        </Stack>
      )}

      {selectedTrack && !selectedVariation && (
        <Stack gap="xs">
          <Button variant="subtle" size="xs" onClick={() => setSelectedTrack(null)}>
            ← Back to tracks
          </Button>
          <Group gap="xs" mb="xs">
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: selectedTrack.color,
                flexShrink: 0,
              }}
            />
            <Text fw={600}>{selectedTrack.name}</Text>
          </Group>
          <TextInput
            placeholder="Search variations..."
            value={varSearch}
            onChange={(e) => setVarSearch(e.target.value)}
            autoFocus
          />
          <ScrollArea h={300}>
            <Stack gap={4}>
              {filteredVariations.length === 0 ? (
                <Text size="xs" c="dimmed" p="xs">
                  {availableVariations.length === 0
                    ? 'No variations available.'
                    : 'No variations match your search.'}
                </Text>
              ) : (
                filteredVariations.map((tv) => (
                  <UnstyledButton
                    key={String(tv.id)}
                    p="sm"
                    style={{ borderRadius: 4, textAlign: 'left' }}
                    onClick={() => setSelectedVariation(tv)}
                  >
                    <div>
                      <Text fw={600}>{tv.name}</Text>
                      {tv.description && (
                        <Text size="xs" c="dimmed" mt={2}>
                          {tv.description}
                        </Text>
                      )}
                    </div>
                  </UnstyledButton>
                ))
              )}
            </Stack>
          </ScrollArea>
        </Stack>
      )}

      {selectedTrack && selectedVariation && (
        <Stack gap="md">
          <Button variant="subtle" size="xs" onClick={() => setSelectedVariation(null)}>
            ← Back to variations
          </Button>
          <Paper withBorder p="md" mb="md">
            <Group gap="xs" mb="xs">
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: selectedTrack.color,
                  flexShrink: 0,
                }}
              />
              <Text fw={600}>{selectedTrack.name}</Text>
              <Text c="dimmed">—</Text>
              <Text>{selectedVariation.name}</Text>
            </Group>
            {selectedVariation.description && (
              <Text size="xs" c="dimmed">
                {selectedVariation.description}
              </Text>
            )}
          </Paper>
          <Group gap="xs">
            <Button size="xs" onClick={handleConfirm}>
              Add Track
            </Button>
            <Button variant="subtle" size="xs" onClick={handleClose}>
              Cancel
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}
