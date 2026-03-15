import { Box, Button, Group, Modal, Stack, Text, Textarea, TextInput } from '@mantine/core';
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { IconRoute } from '@tabler/icons-react';
import type { UseFormReturnType } from '@mantine/form';
import type { Track } from '../types';
import { ModalHeader, modalHeaderStyles, FormError, ModalFooter } from '@/components/common';
import { START_ICON, END_ICON } from '../mapIcons';

const DEFAULT_MAP_CENTER: [number, number] = [39.7392, -104.9903];
const TILE_LAYER_URL = 'https://tiles.stadiamaps.com/tiles/outdoors/{z}/{x}/{y}{r}.png';
const TILE_LAYER_ATTRIBUTION =
  '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

function MapClickHandler({ onPlace }: { onPlace: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPlace(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

interface VariationFormValues {
  name: string;
  description: string;
  startLat: string;
  startLng: string;
  endLat: string;
  endLng: string;
}

interface AddOrEditVariationModalProps {
  opened: boolean;
  onClose: () => void;
  track: Track | null;
  form: UseFormReturnType<VariationFormValues>;
  placingPin: 'start' | 'end' | null;
  setPlacingPin: (pin: 'start' | 'end' | null) => void;
  mapPositions: [number, number][];
  editingVarId: bigint | null;
  onCancel: () => void;
  onSubmit: () => void;
}

export function AddOrEditVariationModal({
  opened,
  onClose,
  track,
  form: varForm,
  placingPin,
  setPlacingPin,
  mapPositions,
  editingVarId,
  onCancel,
  onSubmit,
}: AddOrEditVariationModalProps) {
  if (!track) return null;

  const v = varForm.values;
  const hasStart = v.startLat !== '' && v.startLng !== '';
  const hasEnd = v.endLat !== '' && v.endLng !== '';
  const startPos: [number, number] | null = hasStart
    ? [parseFloat(v.startLat), parseFloat(v.startLng)]
    : null;
  const endPos: [number, number] | null = hasEnd
    ? [parseFloat(v.endLat), parseFloat(v.endLng)]
    : null;

  const handleMapPlace = (lat: number, lng: number) => {
    if (placingPin === 'start') {
      varForm.setValues({
        ...varForm.values,
        startLat: lat.toFixed(6),
        startLng: lng.toFixed(6),
      });
      setPlacingPin(hasEnd ? null : 'end');
    } else if (placingPin === 'end') {
      varForm.setValues({
        ...varForm.values,
        endLat: lat.toFixed(6),
        endLng: lng.toFixed(6),
      });
      setPlacingPin(null);
    } else if (!hasStart) {
      varForm.setValues({
        ...varForm.values,
        startLat: lat.toFixed(6),
        startLng: lng.toFixed(6),
      });
      setPlacingPin('end');
    } else if (!hasEnd) {
      varForm.setValues({
        ...varForm.values,
        endLat: lat.toFixed(6),
        endLng: lng.toFixed(6),
      });
      setPlacingPin(null);
    }
  };

  const mapCenter: [number, number] = startPos ?? endPos ?? mapPositions[0] ?? DEFAULT_MAP_CENTER;
  const mapBounds =
    startPos && endPos
      ? (() => {
          const minLat = Math.min(startPos[0], endPos[0]);
          const maxLat = Math.max(startPos[0], endPos[0]);
          const minLng = Math.min(startPos[1], endPos[1]);
          const maxLng = Math.max(startPos[1], endPos[1]);
          const pad = maxLat === minLat && maxLng === minLng ? 0.005 : 0;
          return L.latLngBounds([minLat - pad, minLng - pad], [maxLat + pad, maxLng + pad]);
        })()
      : null;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <ModalHeader
          icon={<IconRoute size={20} />}
          iconColor="blue"
          label="Track variation"
          title={editingVarId ? `Edit Variation — ${track.name}` : `New Variation — ${track.name}`}
        />
      }
      centered
      radius="md"
      size="lg"
      overlayProps={{ blur: 3 }}
      styles={modalHeaderStyles()}
    >
      <Stack gap="sm" pt="xs">
        <FormError
          error={typeof varForm.errors.name === 'string' ? varForm.errors.name : undefined}
        />
        <TextInput label="Name" {...varForm.getInputProps('name')} autoFocus />
        <Textarea label="Description" {...varForm.getInputProps('description')} rows={2} />

        <Box>
          <Group gap="xs" align="center" mb="xs" wrap="wrap">
            <Text size="sm" fw={500}>
              GPS Coordinates
            </Text>
            <Button
              variant="subtle"
              size="xs"
              aria-pressed={placingPin === 'start'}
              onClick={() => setPlacingPin(placingPin === 'start' ? null : 'start')}
              style={
                placingPin === 'start'
                  ? { background: 'rgba(34,197,94,0.15)', color: '#22c55e' }
                  : {}
              }
            >
              {hasStart ? 'Move Start' : 'Place Start'}
            </Button>
            <Button
              variant="subtle"
              size="xs"
              aria-pressed={placingPin === 'end'}
              onClick={() => setPlacingPin(placingPin === 'end' ? null : 'end')}
              style={
                placingPin === 'end' ? { background: 'rgba(239,68,68,0.15)', color: '#ef4444' } : {}
              }
            >
              {hasEnd ? 'Move End' : 'Place End'}
            </Button>
          </Group>
          {placingPin && (
            <Text size="sm" mb="xs" c={placingPin === 'start' ? 'green' : 'red'}>
              Click on the map to place the {placingPin} pin
            </Text>
          )}
          {!placingPin && !hasStart && (
            <Text size="sm" c="dimmed" mb="xs">
              Click on the map to place the start pin
            </Text>
          )}
          <MapContainer
            {...(mapBounds
              ? {
                  bounds: mapBounds,
                  boundsOptions: { padding: [40, 40], maxZoom: 15 },
                }
              : {
                  center: mapCenter,
                  zoom: !hasStart && !hasEnd ? 2 : 14,
                })}
            style={{
              height: 280,
              width: '100%',
              borderRadius: 'var(--mantine-radius-sm)',
              border: '1px solid var(--mantine-color-default-border)',
              cursor: placingPin ? 'crosshair' : '',
              position: 'relative',
              zIndex: 0,
            }}
          >
            <TileLayer attribution={TILE_LAYER_ATTRIBUTION} url={TILE_LAYER_URL} />
            <MapClickHandler onPlace={handleMapPlace} />
            {startPos && (
              <Marker
                position={startPos}
                icon={START_ICON}
                draggable
                eventHandlers={{
                  dragend(e) {
                    const latlng = (e.target as L.Marker).getLatLng();
                    varForm.setValues({
                      ...varForm.values,
                      startLat: latlng.lat.toFixed(6),
                      startLng: latlng.lng.toFixed(6),
                    });
                  },
                }}
              />
            )}
            {endPos && (
              <Marker
                position={endPos}
                icon={END_ICON}
                draggable
                eventHandlers={{
                  dragend(e) {
                    const latlng = (e.target as L.Marker).getLatLng();
                    varForm.setValues({
                      ...varForm.values,
                      endLat: latlng.lat.toFixed(6),
                      endLng: latlng.lng.toFixed(6),
                    });
                  },
                }}
              />
            )}
            {startPos && endPos && (
              <Polyline
                positions={[startPos, endPos]}
                pathOptions={{ color: track.color, weight: 3, dashArray: '6 4' }}
              />
            )}
          </MapContainer>
          <Group gap="md" mt="xs" wrap="wrap">
            <Text size="xs" c="dimmed">
              Start: {hasStart ? `${v.startLat}, ${v.startLng}` : 'not set'}
            </Text>
            <Text size="xs" c="dimmed">
              End: {hasEnd ? `${v.endLat}, ${v.endLng}` : 'not set'}
            </Text>
          </Group>
        </Box>

        <Group gap="sm" grow>
          <TextInput
            label="Start Latitude"
            placeholder="e.g. 39.7392"
            {...varForm.getInputProps('startLat')}
          />
          <TextInput
            label="Start Longitude"
            placeholder="e.g. -104.9903"
            {...varForm.getInputProps('startLng')}
          />
        </Group>
        <Group gap="sm" grow>
          <TextInput
            label="End Latitude"
            placeholder="e.g. 39.7489"
            {...varForm.getInputProps('endLat')}
          />
          <TextInput
            label="End Longitude"
            placeholder="e.g. -104.9815"
            {...varForm.getInputProps('endLng')}
          />
        </Group>

        <ModalFooter
          onCancel={onCancel}
          submitLabel={editingVarId ? 'Save' : 'Add'}
          onSubmit={onSubmit}
        />
      </Stack>
    </Modal>
  );
}
