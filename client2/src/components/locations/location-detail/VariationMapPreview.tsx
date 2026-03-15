import { Box, Text } from '@mantine/core';
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet';
import L from 'leaflet';
import type { TrackVariation } from './types';
import { START_ICON, END_ICON } from './mapIcons';

const TILE_LAYER_URL =
  'https://tiles.stadiamaps.com/tiles/outdoors/{z}/{x}/{y}{r}.png';
const TILE_LAYER_ATTRIBUTION =
  '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

interface VariationMapPreviewProps {
  variation: TrackVariation;
  trackColor: string;
  height?: number;
}

export function VariationMapPreview({
  variation: tv,
  trackColor,
  height = 280,
}: VariationMapPreviewProps) {
  const hasCoords =
    tv.startLatitude !== 0 ||
    tv.startLongitude !== 0 ||
    tv.endLatitude !== 0 ||
    tv.endLongitude !== 0;
  const start: [number, number] = [tv.startLatitude, tv.startLongitude];
  const end: [number, number] = [tv.endLatitude, tv.endLongitude];
  const mapPositions: [number, number][] = [];
  if (tv.startLatitude !== 0 || tv.startLongitude !== 0)
    mapPositions.push([tv.startLatitude, tv.startLongitude]);
  if (tv.endLatitude !== 0 || tv.endLongitude !== 0)
    mapPositions.push([tv.endLatitude, tv.endLongitude]);
  const bounds =
    mapPositions.length > 0
      ? mapPositions.length >= 2
        ? L.latLngBounds(mapPositions.map((p) => L.latLng(p[0], p[1])))
        : L.latLngBounds(
            L.latLng(mapPositions[0][0] - 0.005, mapPositions[0][1] - 0.005),
            L.latLng(mapPositions[0][0] + 0.005, mapPositions[0][1] + 0.005)
          )
      : null;

  if (!hasCoords || !bounds) {
    return (
      <Box
        style={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--mantine-color-dark-6)',
          borderRadius: 'var(--mantine-radius-sm)',
        }}
      >
        <Text size="sm" c="dimmed">
          Coordinates not set
        </Text>
      </Box>
    );
  }

  return (
    <MapContainer
      bounds={bounds}
      boundsOptions={{ padding: [40, 40], maxZoom: 15 }}
      style={{
        height,
        width: '100%',
        position: 'relative',
        zIndex: 0,
      }}
    >
      <TileLayer attribution={TILE_LAYER_ATTRIBUTION} url={TILE_LAYER_URL} />
      {(tv.startLatitude !== 0 || tv.startLongitude !== 0) && (
        <Marker position={start} icon={START_ICON}>
          <Popup>
            <Text size="xs" fw={700} c="green">
              Start
            </Text>
          </Popup>
        </Marker>
      )}
      {(tv.endLatitude !== 0 || tv.endLongitude !== 0) && (
        <Marker position={end} icon={END_ICON}>
          <Popup>
            <Text size="xs" fw={700} c="red">
              End
            </Text>
          </Popup>
        </Marker>
      )}
      {mapPositions.length >= 2 && (
        <Polyline
          positions={[start, end]}
          pathOptions={{
            color: trackColor,
            weight: 3,
            dashArray: '6 4',
          }}
        />
      )}
    </MapContainer>
  );
}
