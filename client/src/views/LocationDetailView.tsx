import { useState, useMemo, useRef, useCallback } from 'react';
import { useParams, Link, Navigate, useNavigate } from 'react-router-dom';
import { useTable, useReducer } from 'spacetimedb/react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  TextInput,
  Textarea,
  Button,
  Table,
  Paper,
  Stack,
  Group,
  Text,
  Box,
  ColorInput,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { tables, reducers } from '../module_bindings';
import { useAuth } from '../auth';
import { useActiveOrgMaybe } from '../OrgContext';
import { IconPencil, IconTrash } from '../icons';
import BackLink from '../components/BackLink';
import ActionMenu from '../components/ActionMenu';
import { RowActionMenu } from '../components/ActionMenu';
import ImageCarousel from '../components/ImageCarousel';
import type { Venue, Track, TrackVariation, Organization } from '../module_bindings/types';
import { getErrorMessage } from '../utils';

/* Leaflet divIcon requires HTML string - cannot use Mantine components */
function pinIcon(color: string, label: string) {
  return L.divIcon({
    className: '',
    html: `<div style="display:flex;flex-direction:column;align-items:center">
      <div style="background:${color};color:white;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,0.4)">${label}</div>
      <div style="width:2px;height:8px;background:${color}"></div>
      <div style="width:8px;height:8px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4)"></div>
    </div>`,
    iconSize: [40, 30],
    iconAnchor: [20, 30],
  });
}

const START_ICON = pinIcon('#22c55e', 'START');
const END_ICON = pinIcon('#ef4444', 'END');

// Click handler for placing pins on the map
function MapClickHandler({ onPlace }: { onPlace: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPlace(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Auto-fit map bounds to markers
function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useMemo(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions.map((p) => L.latLng(p[0], p[1])));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [positions, map]);
  return null;
}

export default function LocationDetailView() {
  const { venueId } = useParams<{ venueId: string }>();
  const oid = useActiveOrgMaybe();
  const vid = BigInt(venueId ?? '0');
  const { isAuthenticated, isReady, canManageOrgEvents } = useAuth();

  const [orgs] = useTable(tables.organization);
  const [venues] = useTable(tables.venue);
  const [allTracks] = useTable(tables.track);
  const [allVariations] = useTable(tables.track_variation);

  const navigate = useNavigate();
  const updateVenue = useReducer(reducers.updateVenue);
  const deleteVenue = useReducer(reducers.deleteVenue);
  const createTrack = useReducer(reducers.createTrack);
  const updateTrack = useReducer(reducers.updateTrack);
  const deleteTrack = useReducer(reducers.deleteTrack);
  const createVariation = useReducer(reducers.createTrackVariation);
  const updateVariation = useReducer(reducers.updateTrackVariation);
  const deleteVariation = useReducer(reducers.deleteTrackVariation);

  const [menuOpen, setMenuOpen] = useState(false);
  const [editingVenue, setEditingVenue] = useState(false);
  const [venueForm, setVenueForm] = useState({ name: '', description: '', address: '' });
  const [showTrackForm, setShowTrackForm] = useState(false);
  const [trackForm, setTrackForm] = useState({ name: '', color: '#3b82f6' });
  const [editingTrackId, setEditingTrackId] = useState<bigint | null>(null);
  const [expandedTrack, setExpandedTrack] = useState<bigint | null>(null);
  const [showVarForm, setShowVarForm] = useState<bigint | null>(null);
  const [varForm, setVarForm] = useState({
    name: '',
    description: '',
    startLat: '',
    startLng: '',
    endLat: '',
    endLng: '',
  });
  const [editingVarId, setEditingVarId] = useState<bigint | null>(null);
  const [placingPin, setPlacingPin] = useState<'start' | 'end' | null>(null);
  const [expandedVarImages, setExpandedVarImages] = useState<bigint | null>(null);
  const [showTrackImages, setShowTrackImages] = useState<Set<bigint>>(new Set());
  const [error, setError] = useState('');
  const trackRefs = useRef(new Map<bigint, HTMLDivElement>());

  const scrollToTrack = useCallback((trackId: bigint) => {
    const el = trackRefs.current.get(trackId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, []);

  const toggleExpand = useCallback(
    (trackId: bigint) => {
      setExpandedTrack((prev) => {
        const next = prev === trackId ? null : trackId;
        if (next !== null) setTimeout(() => scrollToTrack(next), 50);
        return next;
      });
    },
    [scrollToTrack]
  );

  const toggleTrackImages = useCallback((trackId: bigint) => {
    setShowTrackImages((prev) => {
      const next = new Set(prev);
      if (next.has(trackId)) next.delete(trackId);
      else next.add(trackId);
      return next;
    });
  }, []);

  const org = oid ? orgs.find((o: Organization) => o.id === oid) : null;
  const venue = venues.find((v: Venue) => v.id === vid);
  const hasAccess = oid !== null ? canManageOrgEvents(oid) : false;

  const tracks = useMemo(() => {
    return allTracks
      .filter((t: Track) => t.venueId === vid)
      .sort((a: Track, b: Track) => a.name.localeCompare(b.name));
  }, [allTracks, vid]);

  const variationsByTrack = useMemo(() => {
    const m = new Map<bigint, TrackVariation[]>();
    for (const tv of allVariations) {
      for (const t of tracks) {
        if (tv.trackId === t.id) {
          const arr = m.get(t.id) ?? [];
          arr.push(tv);
          m.set(t.id, arr);
        }
      }
    }
    return m;
  }, [allVariations, tracks]);

  // Get default variation for each track (first one named "Default", or first one)
  const defaultVariations = useMemo(() => {
    const m = new Map<bigint, TrackVariation>();
    for (const [trackId, vars] of variationsByTrack) {
      const def = vars.find((v) => v.name === 'Default') ?? vars[0];
      if (def) m.set(trackId, def);
    }
    return m;
  }, [variationsByTrack]);

  // All map positions for bounds fitting
  const mapPositions = useMemo(() => {
    const pts: [number, number][] = [];
    for (const [, tv] of defaultVariations) {
      if (tv.startLatitude !== 0 || tv.startLongitude !== 0)
        pts.push([tv.startLatitude, tv.startLongitude]);
      if (tv.endLatitude !== 0 || tv.endLongitude !== 0)
        pts.push([tv.endLatitude, tv.endLongitude]);
    }
    return pts;
  }, [defaultVariations]);

  if (!isReady) return null;
  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (!oid) return null;
  if (!org) {
    if (orgs.length === 0) return null;
    return (
      <Text c="dimmed" ta="center" py="xl">
        Organization not found.
      </Text>
    );
  }
  if (!hasAccess)
    return (
      <Text c="dimmed" ta="center" py="xl">
        Access denied.
      </Text>
    );
  if (!venue) {
    if (venues.length === 0) return null;
    return (
      <Text c="dimmed" ta="center" py="xl">
        Location not found.
      </Text>
    );
  }

  // Venue edit
  const startEditVenue = () => {
    setVenueForm({ name: venue.name, description: venue.description, address: venue.address });
    setEditingVenue(true);
    setError('');
  };
  const saveVenue = async () => {
    setError('');
    if (!venueForm.name.trim()) {
      setError('Name is required');
      return;
    }
    try {
      await updateVenue({
        venueId: vid,
        name: venueForm.name.trim(),
        description: venueForm.description.trim(),
        address: venueForm.address.trim(),
      });
      setEditingVenue(false);
    } catch (e: unknown) {
      setError(getErrorMessage(e, 'Failed'));
    }
  };

  // Track create/edit
  const startEditTrack = (t: Track) => {
    setTrackForm({ name: t.name, color: t.color });
    setEditingTrackId(t.id);
    setShowTrackForm(true);
    setError('');
  };
  const resetTrackForm = () => {
    setTrackForm({ name: '', color: '#3b82f6' });
    setEditingTrackId(null);
    setShowTrackForm(false);
    setError('');
  };
  const handleTrackSubmit = async () => {
    setError('');
    if (!trackForm.name.trim()) {
      setError('Track name is required');
      return;
    }
    try {
      if (editingTrackId !== null) {
        await updateTrack({
          trackId: editingTrackId,
          name: trackForm.name.trim(),
          color: trackForm.color,
        });
      } else {
        await createTrack({ venueId: vid, name: trackForm.name.trim(), color: trackForm.color });
      }
      resetTrackForm();
    } catch (e: unknown) {
      setError(getErrorMessage(e, 'Failed'));
    }
  };
  const handleDeleteTrack = async (t: Track) => {
    if (!confirm(`Delete "${t.name}" and all its variations?`)) return;
    try {
      await deleteTrack({ trackId: t.id });
    } catch (e: unknown) {
      setError(getErrorMessage(e, 'Failed'));
    }
  };

  // Variation create/edit
  const startAddVar = (trackId: bigint) => {
    setVarForm({ name: '', description: '', startLat: '', startLng: '', endLat: '', endLng: '' });
    setEditingVarId(null);
    setShowVarForm(trackId);
    setPlacingPin('start');
    setError('');
  };
  const startEditVar = (tv: TrackVariation) => {
    setVarForm({
      name: tv.name,
      description: tv.description,
      startLat: String(tv.startLatitude),
      startLng: String(tv.startLongitude),
      endLat: String(tv.endLatitude),
      endLng: String(tv.endLongitude),
    });
    setEditingVarId(tv.id);
    setShowVarForm(tv.trackId);
    setPlacingPin(null);
    setError('');
  };
  const resetVarForm = () => {
    setVarForm({ name: '', description: '', startLat: '', startLng: '', endLat: '', endLng: '' });
    setEditingVarId(null);
    setShowVarForm(null);
    setPlacingPin(null);
    setError('');
  };
  const handleVarSubmit = async () => {
    setError('');
    if (!varForm.name.trim()) {
      setError('Variation name is required');
      return;
    }
    try {
      const data = {
        name: varForm.name.trim(),
        description: varForm.description.trim(),
        startLatitude: parseFloat(varForm.startLat) || 0,
        startLongitude: parseFloat(varForm.startLng) || 0,
        endLatitude: parseFloat(varForm.endLat) || 0,
        endLongitude: parseFloat(varForm.endLng) || 0,
      };
      if (editingVarId !== null) {
        await updateVariation({ variationId: editingVarId, ...data });
      } else {
        await createVariation({ trackId: showVarForm!, ...data });
      }
      resetVarForm();
    } catch (e: unknown) {
      setError(getErrorMessage(e, 'Failed'));
    }
  };
  const handleDeleteVar = async (tv: TrackVariation) => {
    if (!confirm(`Delete variation "${tv.name}"?`)) return;
    try {
      await deleteVariation({ variationId: tv.id });
    } catch (e: unknown) {
      setError(getErrorMessage(e, 'Failed'));
    }
  };

  return (
    <div>
      <Paper withBorder p="lg" mb="xl">
        <BackLink to="/locations">&larr; Locations</BackLink>

        {/* Venue header */}
        {editingVenue ? (
          <Paper withBorder p="md" mb="sm">
            {error && (
              <Text size="sm" c="red" mb="xs">
                {error}
              </Text>
            )}
            <Stack gap="sm">
              <TextInput
                value={venueForm.name}
                onChange={(e) => setVenueForm((f) => ({ ...f, name: e.target.value }))}
                autoFocus
              />
              <TextInput
                placeholder="Description"
                value={venueForm.description}
                onChange={(e) => setVenueForm((f) => ({ ...f, description: e.target.value }))}
              />
              <TextInput
                label="Address"
                value={venueForm.address}
                onChange={(e) => setVenueForm((f) => ({ ...f, address: e.target.value }))}
              />
              <Group gap="xs">
                <Button size="xs" onClick={saveVenue}>
                  Save
                </Button>
                <Button variant="subtle" size="xs" onClick={() => setEditingVenue(false)}>
                  Cancel
                </Button>
              </Group>
            </Stack>
          </Paper>
        ) : (
          <Stack gap="xs" mb="sm">
            <Group gap="xs" align="baseline">
              <Title order={1}>{venue.name}</Title>
              <ActionMenu
                open={menuOpen}
                onToggle={() => setMenuOpen(!menuOpen)}
                onClose={() => setMenuOpen(false)}
                items={[
                  {
                    icon: IconPencil,
                    label: 'Edit',
                    onClick: () => {
                      setMenuOpen(false);
                      startEditVenue();
                    },
                  },
                  {
                    icon: IconTrash,
                    label: 'Delete',
                    danger: true,
                    onClick: () => {
                      setMenuOpen(false);
                      if (
                        confirm('Delete this location and all its tracks? This cannot be undone.')
                      ) {
                        deleteVenue({ venueId: vid }).then(() => navigate('/locations'));
                      }
                    },
                  },
                ]}
              />
            </Group>
            {venue.description && (
              <Text size="sm" c="dimmed">
                {venue.description}
              </Text>
            )}
            {venue.address && (
              <Text size="sm">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(venue.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--mantine-color-blue-6)' }}
                >
                  {venue.address}
                </a>
              </Text>
            )}
          </Stack>
        )}

        {/* Venue images */}
        <ImageCarousel entityType="venue" entityId={vid} canEdit={hasAccess} />
      </Paper>

      {/* Tracks section */}
      <Stack gap="md" mt="xl">
        <Group justify="space-between" align="center" wrap="wrap" gap="xs">
          <Text size="xs" fw={600} c="dimmed" tt="uppercase">
            Tracks <Text span inherit size="sm" fw={400}>({tracks.length})</Text>
          </Text>
          {!showTrackForm && (
            <Button
              size="xs"
              onClick={() => {
                setEditingTrackId(null);
                setTrackForm({ name: '', color: '#3b82f6' });
                setShowTrackForm(true);
                setError('');
              }}
            >
              + Add Track
            </Button>
          )}
        </Group>

      {error && !editingVenue && (
        <Text size="sm" c="red" mb="sm">
          {error}
        </Text>
      )}

      {/* Track create/edit form */}
      {showTrackForm && (
        <Paper withBorder p="md" mb="md">
          <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb="xs">
            {editingTrackId ? 'Edit Track' : 'New Track'}
          </Text>
          <Group gap="xs" align="flex-end" wrap="wrap">
            <TextInput
              label="Name"
              value={trackForm.name}
              onChange={(e) => setTrackForm((f) => ({ ...f, name: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && handleTrackSubmit()}
              autoFocus
              style={{ flex: 1, minWidth: 150 }}
            />
            <ColorInput label="Color" value={trackForm.color} onChange={(c) => setTrackForm((f) => ({ ...f, color: c }))} />
            <Button size="xs" onClick={handleTrackSubmit}>
              {editingTrackId ? 'Save' : 'Create'}
            </Button>
            <Button variant="subtle" size="xs" onClick={resetTrackForm}>
              Cancel
            </Button>
          </Group>
        </Paper>
      )}

      {/* Map - NOTE: Custom CSS for .location-map-container was removed. Leaflet map container
          and popups may look broken (default Leaflet styling). */}
      {mapPositions.length > 0 && (
        <Box mb="xl">
          <MapContainer
            center={mapPositions[0]}
            zoom={14}
            style={{
              height: 400,
              width: '100%',
              borderRadius: 'var(--mantine-radius-sm)',
              border: '1px solid var(--mantine-color-default-border)',
            }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitBounds positions={mapPositions} />
            {tracks.map((track: Track) => {
              const tv = defaultVariations.get(track.id);
              if (!tv) return null;
              const start: [number, number] = [tv.startLatitude, tv.startLongitude];
              const end: [number, number] = [tv.endLatitude, tv.endLongitude];
              const hasCoords = tv.startLatitude !== 0 || tv.startLongitude !== 0;
              if (!hasCoords) return null;
              return (
                <span key={String(track.id)}>
                  <Marker position={start} icon={START_ICON}>
                    <Popup>
                      <Stack gap={4}>
                        <Text size="xs" fw={700} c="green">
                          Start
                        </Text>
                        <UnstyledButton
                          onClick={() => toggleExpand(track.id)}
                          style={{ fontWeight: 600, textAlign: 'left' }}
                        >
                          {track.name}
                        </UnstyledButton>
                      </Stack>
                    </Popup>
                  </Marker>
                  <Marker position={end} icon={END_ICON}>
                    <Popup>
                      <Stack gap={4}>
                        <Text size="xs" fw={700} c="red">
                          End
                        </Text>
                        <UnstyledButton
                          onClick={() => toggleExpand(track.id)}
                          style={{ fontWeight: 600, textAlign: 'left' }}
                        >
                          {track.name}
                        </UnstyledButton>
                      </Stack>
                    </Popup>
                  </Marker>
                  <Polyline
                    positions={[start, end]}
                    pathOptions={{ color: track.color, weight: 3, dashArray: '6 4' }}
                  />
                </span>
              );
            })}
          </MapContainer>
          {/* Map legend */}
          <Group gap="md" wrap="wrap" mt="xs">
            {tracks.map((t: Track) => (
              <Group key={String(t.id)} gap="xs">
                <Box w={8} h={8} style={{ borderRadius: '50%', background: t.color }} />
                <Text size="sm" c="dimmed">
                  {t.name}
                </Text>
              </Group>
            ))}
          </Group>
        </Box>
      )}

      {/* List view / Tracks */}
      {tracks.length === 0 && !showTrackForm ? (
        <Text c="dimmed" ta="center" py="xl">
          No tracks yet. Add one to get started.
        </Text>
      ) : (
        <Stack gap="xs">
          {tracks.map((track: Track) => {
            const vars = variationsByTrack.get(track.id) ?? [];
            const isExpanded = expandedTrack === track.id;
            return (
              <Paper
                key={String(track.id)}
                id={`track-${track.id}`}
                ref={(el) => {
                  if (el) trackRefs.current.set(track.id, el);
                  else trackRefs.current.delete(track.id);
                }}
                withBorder
                style={{ padding: 0 }}
              >
                {/* Track header */}
                <Group
                  justify="space-between"
                  align="center"
                  p="sm"
                  style={{ cursor: 'pointer' }}
                  onClick={() => toggleExpand(track.id)}
                >
                  <Group gap="xs">
                    <Box w={8} h={8} style={{ borderRadius: '50%', background: track.color }} />
                    <Text fw={600}>{track.name}</Text>
                    <Text size="sm" c="dimmed">
                      ({vars.length} variation{vars.length !== 1 ? 's' : ''})
                    </Text>
                  </Group>
                  <Group gap="xs" align="center">
                    <RowActionMenu
                      items={[
                        { icon: IconPencil, label: 'Edit', onClick: () => startEditTrack(track) },
                        {
                          icon: IconTrash,
                          label: 'Delete',
                          danger: true,
                          onClick: () => handleDeleteTrack(track),
                        },
                      ]}
                    />
                    <Text size="xs" c="dimmed" style={{ padding: '4px 8px', cursor: 'pointer' }}>
                      {isExpanded ? '\u25B2' : '\u25BC'}
                    </Text>
                  </Group>
                </Group>

                {/* Expanded: images + variations */}
                {isExpanded && (
                  <Box pt="md" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }} px="md" pb="md">
                    {showTrackImages.has(track.id) && (
                      <Box mb="xs">
                        <ImageCarousel entityType="track" entityId={track.id} canEdit={hasAccess} />
                      </Box>
                    )}

                    <Group justify="space-between" align="center" mb="xs">
                      <Text size="xs" fw={600} c="dimmed" tt="uppercase">
                        Variations
                      </Text>
                      <Group gap="xs">
                        <Button
                          variant="subtle"
                          size="xs"
                          onClick={() => toggleTrackImages(track.id)}
                        >
                          {showTrackImages.has(track.id) ? 'Hide Images' : 'Show Images'}
                        </Button>
                        <Button size="xs" onClick={() => startAddVar(track.id)}>
                          + Add
                        </Button>
                      </Group>
                    </Group>

                    {/* Variation form */}
                    {showVarForm === track.id &&
                      (() => {
                        const hasStart = varForm.startLat !== '' && varForm.startLng !== '';
                        const hasEnd = varForm.endLat !== '' && varForm.endLng !== '';
                        const startPos: [number, number] | null = hasStart
                          ? [parseFloat(varForm.startLat), parseFloat(varForm.startLng)]
                          : null;
                        const endPos: [number, number] | null = hasEnd
                          ? [parseFloat(varForm.endLat), parseFloat(varForm.endLng)]
                          : null;
                        const handleMapPlace = (lat: number, lng: number) => {
                          if (placingPin === 'start') {
                            setVarForm((f) => ({
                              ...f,
                              startLat: lat.toFixed(6),
                              startLng: lng.toFixed(6),
                            }));
                            setPlacingPin(hasEnd ? null : 'end');
                          } else if (placingPin === 'end') {
                            setVarForm((f) => ({
                              ...f,
                              endLat: lat.toFixed(6),
                              endLng: lng.toFixed(6),
                            }));
                            setPlacingPin(null);
                          } else if (!hasStart) {
                            setVarForm((f) => ({
                              ...f,
                              startLat: lat.toFixed(6),
                              startLng: lng.toFixed(6),
                            }));
                            setPlacingPin('end');
                          } else if (!hasEnd) {
                            setVarForm((f) => ({
                              ...f,
                              endLat: lat.toFixed(6),
                              endLng: lng.toFixed(6),
                            }));
                            setPlacingPin(null);
                          }
                        };
                        return (
                          <Paper withBorder p="md" mb="xs" key="var-form">
                            <Stack gap="sm">
                              <TextInput
                                label="Name *"
                                value={varForm.name}
                                onChange={(e) =>
                                  setVarForm((f) => ({ ...f, name: e.target.value }))
                                }
                                autoFocus
                              />
                              <Textarea
                                label="Description"
                                value={varForm.description}
                                onChange={(e) =>
                                  setVarForm((f) => ({ ...f, description: e.target.value }))
                                }
                                rows={3}
                                style={{ resize: 'vertical' }}
                              />

                              {/* Pin placement map */}
                              <Box>
                                <Group gap="xs" align="center" mb="xs">
                                  <Text size="sm" fw={500}>
                                    Drop pins on the map
                                  </Text>
                                  <Button
                                    variant="subtle"
                                    size="xs"
                                    onClick={() =>
                                      setPlacingPin(placingPin === 'start' ? null : 'start')
                                    }
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
                                    onClick={() =>
                                      setPlacingPin(placingPin === 'end' ? null : 'end')
                                    }
                                    style={
                                      placingPin === 'end'
                                        ? { background: 'rgba(239,68,68,0.15)', color: '#ef4444' }
                                        : {}
                                    }
                                  >
                                    {hasEnd ? 'Move End' : 'Place End'}
                                  </Button>
                                </Group>
                                {placingPin && (
                                  <Text
                                    size="sm"
                                    mb="xs"
                                    c={placingPin === 'start' ? 'green' : 'red'}
                                  >
                                    Click on the map to place the {placingPin} pin
                                  </Text>
                                )}
                                {!placingPin && !hasStart && (
                                  <Text size="sm" c="dimmed" mb="xs">
                                    Click on the map to place the start pin
                                  </Text>
                                )}
                                {/* NOTE: Custom CSS for .location-map-container was removed - map may look broken */}
                                <Box>
                                  <MapContainer
                                    center={mapPositions.length > 0 ? mapPositions[0] : [0, 0]}
                                    zoom={14}
                                    style={{
                                      height: 280,
                                      width: '100%',
                                      borderRadius: 'var(--mantine-radius-sm)',
                                      border: '1px solid var(--mantine-color-default-border)',
                                      cursor: placingPin ? 'crosshair' : '',
                                    }}
                                  >
                                    <TileLayer
                                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    />
                                    <MapClickHandler onPlace={handleMapPlace} />
                                    {startPos && <Marker position={startPos} icon={START_ICON} />}
                                    {endPos && <Marker position={endPos} icon={END_ICON} />}
                                    {startPos && endPos && (
                                      <Polyline
                                        positions={[startPos, endPos]}
                                        pathOptions={{
                                          color: track.color,
                                          weight: 3,
                                          dashArray: '6 4',
                                        }}
                                      />
                                    )}
                                  </MapContainer>
                                </Box>
                                {/* Coordinate readout */}
                                <Group gap="md" mt="xs">
                                  <Text size="xs" c="dimmed">
                                    Start:{' '}
                                    {hasStart
                                      ? `${varForm.startLat}, ${varForm.startLng}`
                                      : 'not set'}
                                  </Text>
                                  <Text size="xs" c="dimmed">
                                    End:{' '}
                                    {hasEnd ? `${varForm.endLat}, ${varForm.endLng}` : 'not set'}
                                  </Text>
                                </Group>
                              </Box>

                              <Group gap="xs">
                                <Button size="xs" onClick={handleVarSubmit}>
                                  {editingVarId ? 'Save' : 'Add'}
                                </Button>
                                <Button variant="subtle" size="xs" onClick={resetVarForm}>
                                  Cancel
                                </Button>
                              </Group>
                            </Stack>
                          </Paper>
                        );
                      })()}

                    {/* Variation list */}
                    <Table>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Name</Table.Th>
                          <Table.Th>Description</Table.Th>
                          <Table.Th style={{ width: 80 }}></Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {vars.map((tv: TrackVariation) => (
                          <Table.Tr
                            key={String(tv.id)}
                            style={{ cursor: 'pointer' }}
                            onClick={() =>
                              setExpandedVarImages(expandedVarImages === tv.id ? null : tv.id)
                            }
                          >
                            <Table.Td>{tv.name}</Table.Td>
                            <Table.Td>
                              <Text size="sm" c="dimmed">
                                {tv.description || '—'}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              {tv.name !== 'Default' ? (
                                <RowActionMenu
                                  items={[
                                    { icon: IconPencil, label: 'Edit', onClick: () => startEditVar(tv) },
                                    ...(vars.length > 1
                                      ? [
                                          {
                                            icon: IconTrash,
                                            label: 'Delete',
                                            danger: true as const,
                                            onClick: () => handleDeleteVar(tv),
                                          },
                                        ]
                                      : []),
                                  ]}
                                />
                              ) : (
                                <Text size="sm" c="dimmed">
                                  Default
                                </Text>
                              )}
                            </Table.Td>
                          </Table.Tr>
                        ))}
                        {expandedVarImages && vars.some((v) => v.id === expandedVarImages) && (
                          <Table.Tr>
                            <Table.Td colSpan={3} style={{ padding: 12 }}>
                              <ImageCarousel
                                entityType="track_variation"
                                entityId={expandedVarImages}
                                canEdit={hasAccess}
                              />
                            </Table.Td>
                          </Table.Tr>
                        )}
                      </Table.Tbody>
                    </Table>
                  </Box>
                )}
              </Paper>
            );
          })}
        </Stack>
      )}
    </Stack>
    </div>
  );
}
