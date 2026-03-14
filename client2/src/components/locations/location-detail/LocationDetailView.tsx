import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Collapse,
  ColorInput,
  Group,
  Menu,
  Modal,
  Overlay,
  Paper,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Textarea,
  TextInput,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { Carousel } from '@mantine/carousel';
import { useMediaQuery } from '@mantine/hooks';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  IconArrowLeft,
  IconDotsVertical,
  IconMapPin,
  IconPencil,
  IconPhoto,
  IconPlus,
  IconRoute,
  IconTrash,
  IconChevronDown,
  IconChevronUp,
  IconX,
  IconChevronLeft,
  IconChevronRight,
} from '@tabler/icons-react';
import { resizeImage } from '../ImageUploader';
import { type Location, type LocationImage, loadLocations, saveLocations } from '../locationStorage';
import { ModalHeader, modalHeaderStyles, FormError, ModalFooter } from '@/components/common';

// Leaflet pin icons
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

/**
 * Samples the bottom 40% of a base64 image URL and returns whether the text
 * on top should be "white" (dark background) or "dark" (light background).
 */
function useImageContrast(imageUrl: string | undefined): 'white' | 'dark' {
  const [contrast, setContrast] = useState<'white' | 'dark'>('white');
  useEffect(() => {
    if (!imageUrl) {
      setContrast('white');
      return;
    }
    const img = new Image();
    img.onload = () => {
      const sampleH = Math.max(1, Math.round(img.naturalHeight * 0.4));
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = sampleH;
      canvas
        .getContext('2d')!
        .drawImage(
          img,
          0,
          img.naturalHeight - sampleH,
          img.naturalWidth,
          sampleH,
          0,
          0,
          img.naturalWidth,
          sampleH
        );
      const { data } = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, sampleH);
      let sum = 0;
      for (let i = 0; i < data.length; i += 4) {
        sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      }
      setContrast(sum / (data.length / 4) > 128 ? 'dark' : 'white');
    };
    img.src = imageUrl;
  }, [imageUrl]);
  return contrast;
}

/** Registers map click events and forwards lat/lng to caller (for placing start/end pins). */
function MapClickHandler({ onPlace }: { onPlace: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPlace(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Types
interface Track {
  id: bigint;
  locationId: bigint;
  name: string;
  color: string;
}

interface TrackVariation {
  id: bigint;
  trackId: bigint;
  name: string;
  description: string;
  startLatitude: number;
  startLongitude: number;
  endLatitude: number;
  endLongitude: number;
}

interface TrackImage {
  id: bigint;
  trackId: bigint;
  url: string;
  caption: string;
  isCover: boolean;
}

const MOCK_TRACKS: Track[] = [
  { id: 1n, locationId: 1n, name: 'Summit Run', color: '#ef4444' },
  { id: 2n, locationId: 1n, name: 'Ridge Line', color: '#22c55e' },
  { id: 3n, locationId: 1n, name: 'Valley Drop', color: '#3b82f6' },
  { id: 4n, locationId: 2n, name: 'Sand Storm', color: '#f59e0b' },
  { id: 5n, locationId: 2n, name: 'Cactus Trail', color: '#8b5cf6' },
  { id: 6n, locationId: 3n, name: 'Pine Loop', color: '#22c55e' },
];

const MOCK_VARIATIONS: TrackVariation[] = [
  {
    id: 1n,
    trackId: 1n,
    name: 'Default',
    description: 'Standard route',
    startLatitude: 39.7392,
    startLongitude: -104.9903,
    endLatitude: 39.7489,
    endLongitude: -104.9815,
  },
  {
    id: 2n,
    trackId: 1n,
    name: 'Short Cut',
    description: 'Bypass the rock garden',
    startLatitude: 39.7392,
    startLongitude: -104.9903,
    endLatitude: 39.745,
    endLongitude: -104.985,
  },
  {
    id: 3n,
    trackId: 2n,
    name: 'Default',
    description: 'Ridge traverse',
    startLatitude: 39.75,
    startLongitude: -104.98,
    endLatitude: 39.758,
    endLongitude: -104.972,
  },
  {
    id: 4n,
    trackId: 3n,
    name: 'Default',
    description: 'Valley descent',
    startLatitude: 39.76,
    startLongitude: -104.97,
    endLatitude: 39.735,
    endLongitude: -104.99,
  },
  {
    id: 5n,
    trackId: 4n,
    name: 'Default',
    description: 'Sandy trail',
    startLatitude: 33.4484,
    startLongitude: -112.074,
    endLatitude: 33.455,
    endLongitude: -112.065,
  },
  {
    id: 6n,
    trackId: 5n,
    name: 'Default',
    description: 'Cactus route',
    startLatitude: 33.46,
    startLongitude: -112.06,
    endLatitude: 33.468,
    endLongitude: -112.05,
  },
  {
    id: 7n,
    trackId: 6n,
    name: 'Default',
    description: 'Forest loop',
    startLatitude: 45.5152,
    startLongitude: -122.6784,
    endLatitude: 45.523,
    endLongitude: -122.67,
  },
];

export function LocationDetailView() {
  const { locationId: locationIdParam } = useParams<{ locationId: string }>();
  const navigate = useNavigate();
  const locationId = useMemo(() => {
    try {
      return BigInt(locationIdParam ?? '0');
    } catch {
      return 0n;
    }
  }, [locationIdParam]);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const onBack = () => navigate('/locations');
  const [locations, setLocations] = useState<Location[]>(loadLocations);
  useEffect(() => {
    saveLocations(locations);
  }, [locations]);
  const [tracks, setTracks] = useState<Track[]>(MOCK_TRACKS);
  const [variations, setVariations] = useState<TrackVariation[]>(MOCK_VARIATIONS);
  const [trackImagesByTrack, setTrackImagesByTrack] = useState<Map<bigint, TrackImage[]>>(() => {
    try {
      const raw = window.localStorage.getItem('racetimetracker-track-images');
      if (!raw) return new Map();
      const parsed = JSON.parse(raw) as Record<
        string,
        { id: string; trackId: string; url: string; caption: string; isCover: boolean }[]
      >;
      const m = new Map<bigint, TrackImage[]>();
      for (const [trackIdStr, images] of Object.entries(parsed)) {
        const key = BigInt(trackIdStr);
        m.set(
          key,
          images.map((img) => ({
            id: BigInt(img.id),
            trackId: key,
            url: img.url,
            caption: img.caption,
            isCover: img.isCover,
          }))
        );
      }
      return m;
    } catch {
      return new Map();
    }
  });
  const [editingLocation, setEditingLocation] = useState(false);
  const [locationForm, setLocationForm] = useState({
    name: '',
    description: '',
    address: '',
    imageUrl: undefined as string | undefined,
  });

  const [showTrackForm, setShowTrackForm] = useState(false);
  const [trackForm, setTrackForm] = useState({ name: '', color: '#3b82f6' });
  const [editingTrackId, setEditingTrackId] = useState<bigint | null>(null);

  const [expandedTrack, setExpandedTrack] = useState<bigint | null>(null);
  const [trackGalleryTrackId, setTrackGalleryTrackId] = useState<bigint | null>(null);
  const [trackGalleryIndex, setTrackGalleryIndex] = useState(0);

  const [showVarForm, setShowVarForm] = useState<bigint | null>(null);
  const [varForm, setVarForm] = useState({
    name: '',
    description: '',
    startLat: '',
    startLng: '',
    endLat: '',
    endLng: '',
  });
  const [placingPin, setPlacingPin] = useState<'start' | 'end' | null>(null);
  const [editingVarId, setEditingVarId] = useState<bigint | null>(null);

  const [error, setError] = useState('');
  const trackRefs = useRef(new Map<bigint, HTMLDivElement>());
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [isMapCollapsed, setIsMapCollapsed] = useState(true);

  const currentLocation = locations.find((v) => v.id === locationId);

  const locationImages: LocationImage[] = useMemo(() => currentLocation?.images ?? [], [currentLocation?.images]);
  const coverImage: LocationImage | undefined =
    locationImages.find((img) => img.isCover) ?? locationImages[0];

  const bannerContrast = useImageContrast(coverImage?.url ?? currentLocation?.imageUrl);
  const locationTracks = useMemo(
    () => tracks.filter((t) => t.locationId === locationId).sort((a, b) => a.name.localeCompare(b.name)),
    [tracks, locationId]
  );

  const variationsByTrack = useMemo(() => {
    const m = new Map<bigint, TrackVariation[]>();
    for (const v of variations) {
      for (const t of locationTracks) {
        if (v.trackId === t.id) {
          const arr = m.get(t.id) ?? [];
          arr.push(v);
          m.set(t.id, arr);
        }
      }
    }
    return m;
  }, [variations, locationTracks]);

  // Get default variation for each track for the map
  const defaultVariations = useMemo(() => {
    const m = new Map<bigint, TrackVariation>();
    for (const [trackId, vars] of variationsByTrack) {
      const def = vars.find((v) => v.name === 'Default') ?? vars[0];
      if (def) m.set(trackId, def);
    }
    return m;
  }, [variationsByTrack]);

  const trackCoverImages = useMemo(() => {
    const m = new Map<bigint, TrackImage | undefined>();
    for (const [trackId, images] of trackImagesByTrack) {
      if (!images || images.length === 0) {
        m.set(trackId, undefined);
        continue;
      }
      const cover = images.find((img) => img.isCover) ?? images[0];
      m.set(trackId, cover);
    }
    return m;
  }, [trackImagesByTrack]);

  useEffect(() => {
    const out: Record<
      string,
      { id: string; trackId: string; url: string; caption: string; isCover: boolean }[]
    > = {};
    for (const [trackId, images] of trackImagesByTrack) {
      out[String(trackId)] = images.map((img) => ({
        id: String(img.id),
        trackId: String(trackId),
        url: img.url,
        caption: img.caption,
        isCover: img.isCover,
      }));
    }
    try {
      window.localStorage.setItem('racetimetracker-track-images', JSON.stringify(out));
    } catch {
      // ignore storage errors
    }
  }, [trackImagesByTrack]);

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

  const variationModalTrack = useMemo(() => {
    if (showVarForm === null) return null;
    return locationTracks.find((t) => t.id === showVarForm) ?? null;
  }, [showVarForm, locationTracks]);

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

  const handleUploadGalleryImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const url = await resizeImage(file);
      setLocations((prev) =>
        prev.map((v) => {
          if (v.id !== locationId) return v;
          const existingImages = v.images ?? [];
          const nextId =
            existingImages.length > 0
              ? existingImages.reduce<bigint>(
                  (max, img) => (img.id > max ? img.id : max),
                  existingImages[0].id
                ) + 1n
              : BigInt(Date.now());
          const newImage: LocationImage = {
            id: nextId,
            url,
            caption: '',
            isCover: false,
          };

          const images = [...existingImages, newImage];
          const cover = images.find((img) => img.isCover) ?? images[0];

          // Jump carousel to the newly added image
          setGalleryIndex(existingImages.length);
          setGalleryOpen(true);

          return {
            ...v,
            images,
            imageUrl: cover?.url,
          };
        })
      );
    };
    input.click();
  };

  const handleUploadTrackImage = (trackId: bigint) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const url = await resizeImage(file);
      setTrackImagesByTrack((prev) => {
        const next = new Map(prev);
        const existing = next.get(trackId) ?? [];
        const nextId =
          existing.length > 0
            ? existing.reduce<bigint>(
                (max, img) => (img.id > max ? img.id : max),
                existing[0].id
              ) + 1n
            : BigInt(Date.now());
        const newImage: TrackImage = {
          id: nextId,
          trackId,
          url,
          caption: '',
          isCover: existing.length === 0,
        };
        const images = [...existing, newImage];
        next.set(trackId, images);
        return next;
      });
      setTrackGalleryTrackId(trackId);
      setTrackGalleryIndex((prev) => prev);
    };
    input.click();
  };

  if (!currentLocation) {
    return (
      <Stack gap="lg">
        <Button
          variant="subtle"
          leftSection={<IconArrowLeft size={16} />}
          onClick={onBack}
          style={{ alignSelf: 'flex-start' }}
        >
          Back to Locations
        </Button>
        <Paper withBorder p="xl">
          <Text c="dimmed" ta="center">
            Location not found.
          </Text>
        </Paper>
      </Stack>
    );
  }

  // Location edit handlers
  const startEditLocation = () => {
    setLocationForm({
      name: currentLocation.name,
      description: currentLocation.description,
      address: currentLocation.address,
      imageUrl: coverImage?.url ?? currentLocation.imageUrl,
    });
    setEditingLocation(true);
    setError('');
  };

  const saveLocation = () => {
    setError('');
    if (!locationForm.name.trim()) {
      setError('Name is required');
      return;
    }
    setLocations((prev) =>
      prev.map((v) => {
        if (v.id !== locationId) return v;

        const existingImages = v.images ?? [];
        let images = existingImages;

        // If a new banner image was provided, add/update it as the cover image
        // and ensure only one image per location has isCover === true.
        if (locationForm.imageUrl) {
          const existing = existingImages.find((img) => img.url === locationForm.imageUrl);
          if (existing) {
            images = existingImages.map((img) => ({
              ...img,
              isCover: img.url === locationForm.imageUrl,
            }));
          } else {
            const nextId =
              existingImages.length > 0
                ? existingImages.reduce<bigint>(
                    (max, img) => (img.id > max ? img.id : max),
                    existingImages[0].id
                  ) + 1n
                : BigInt(Date.now());
            const newImage: LocationImage = {
              id: nextId,
              url: locationForm.imageUrl,
              caption: '',
              isCover: true,
            };
            images = existingImages.map((img) => ({ ...img, isCover: false })).concat(newImage);
          }
        } else if (existingImages.length > 0) {
          // If banner cleared but gallery exists, keep existing cover as-is.
          images = existingImages;
        }

        const cover = images.find((img) => img.isCover) ?? images[0];

        return {
          ...v,
          name: locationForm.name.trim(),
          description: locationForm.description.trim(),
          address: locationForm.address.trim(),
          imageUrl: cover?.url,
          images: images.length > 0 ? images : undefined,
        };
      })
    );
    setEditingLocation(false);
  };

  const deleteLocation = () => {
    if (!confirm('Delete this location and all its tracks? This cannot be undone.')) return;
    setLocations((prev) => prev.filter((v) => v.id !== locationId));
    onBack();
  };

  // Track handlers
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

  const handleTrackSubmit = () => {
    setError('');
    if (!trackForm.name.trim()) {
      setError('Track name is required');
      return;
    }
    if (editingTrackId !== null) {
      setTracks((prev) =>
        prev.map((t) =>
          t.id === editingTrackId
            ? { ...t, name: trackForm.name.trim(), color: trackForm.color }
            : t
        )
      );
    } else {
      const newTrack: Track = {
        id: BigInt(Date.now()),
        locationId,
        name: trackForm.name.trim(),
        color: trackForm.color,
      };
      setTracks((prev) => [...prev, newTrack]);
      // Create default variation
      const newVar: TrackVariation = {
        id: BigInt(Date.now() + 1),
        trackId: newTrack.id,
        name: 'Default',
        description: '',
        startLatitude: 0,
        startLongitude: 0,
        endLatitude: 0,
        endLongitude: 0,
      };
      setVariations((prev) => [...prev, newVar]);
    }
    resetTrackForm();
  };

  const handleDeleteTrack = (t: Track) => {
    if (!confirm(`Delete "${t.name}" and all its variations?`)) return;
    setTracks((prev) => prev.filter((track) => track.id !== t.id));
    setVariations((prev) => prev.filter((v) => v.trackId !== t.id));
  };

  // Variation handlers
  const startAddVar = (trackId: bigint) => {
    setVarForm({
      name: '',
      description: '',
      startLat: '',
      startLng: '',
      endLat: '',
      endLng: '',
    });
    setEditingVarId(null);
    setShowVarForm(trackId);
    setPlacingPin(null);
    setError('');
  };

  const startEditVar = (tv: TrackVariation) => {
    setVarForm({
      name: tv.name,
      description: tv.description,
      startLat: String(tv.startLatitude || ''),
      startLng: String(tv.startLongitude || ''),
      endLat: String(tv.endLatitude || ''),
      endLng: String(tv.endLongitude || ''),
    });
    setEditingVarId(tv.id);
    setShowVarForm(tv.trackId);
    setPlacingPin(null);
    setError('');
  };

  const resetVarForm = () => {
    setVarForm({
      name: '',
      description: '',
      startLat: '',
      startLng: '',
      endLat: '',
      endLng: '',
    });
    setEditingVarId(null);
    setShowVarForm(null);
    setPlacingPin(null);
    setError('');
  };

  const handleVarSubmit = () => {
    setError('');
    if (!varForm.name.trim()) {
      setError('Variation name is required');
      return;
    }
    const data = {
      name: varForm.name.trim(),
      description: varForm.description.trim(),
      startLatitude: parseFloat(varForm.startLat) || 0,
      startLongitude: parseFloat(varForm.startLng) || 0,
      endLatitude: parseFloat(varForm.endLat) || 0,
      endLongitude: parseFloat(varForm.endLng) || 0,
    };
    if (editingVarId !== null) {
      setVariations((prev) => prev.map((v) => (v.id === editingVarId ? { ...v, ...data } : v)));
    } else {
      const newVar: TrackVariation = {
        id: BigInt(Date.now()),
        trackId: showVarForm!,
        ...data,
      };
      setVariations((prev) => [...prev, newVar]);
    }
    resetVarForm();
  };

  const handleDeleteVar = (tv: TrackVariation) => {
    const vars = variationsByTrack.get(tv.trackId) ?? [];
    if (vars.length <= 1) {
      alert('Cannot delete the last variation. Delete the track instead.');
      return;
    }
    if (!confirm(`Delete variation "${tv.name}"?`)) return;
    setVariations((prev) => prev.filter((v) => v.id !== tv.id));
  };

  return (
    <Stack gap="lg">
      {/* Back button */}
      <Button
        variant="subtle"
        leftSection={<IconArrowLeft size={16} />}
        onClick={onBack}
        style={{ alignSelf: 'flex-start' }}
      >
        Back to Locations
      </Button>

      {/* Header + map combined */}
      <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
        {/* Banner image */}
        {coverImage?.url ? (
          <Box
            style={{
              height: 200,
              backgroundImage: `url(${coverImage.url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              position: 'relative',
            }}
          >
            <Overlay
              gradient={
                bannerContrast === 'dark'
                  ? 'linear-gradient(180deg, rgba(255,255,255,0.0) 0%, rgba(255,255,255,0.82) 100%)'
                  : 'linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.78) 100%)'
              }
              opacity={1}
              zIndex={0}
              style={{ pointerEvents: 'none' }}
            />
            <Box
              style={{
                position: 'absolute',
                inset: 0,
                padding: 'var(--mantine-spacing-lg)',
                zIndex: 1,
                display: 'flex',
                alignItems: isMobile ? 'flex-end' : 'center',
              }}
            >
              {/* Mobile: dots menu pinned to top-right corner of banner */}
              {isMobile && (
                <Box style={{ position: 'absolute', top: 12, right: 12 }}>
                  <Menu shadow="md" width={200} position="bottom-end">
                    <Menu.Target>
                      <ActionIcon
                        variant="filled"
                        size="lg"
                        color="dark"
                        style={{
                          backgroundColor:
                            bannerContrast !== 'dark'
                              ? 'rgba(255,255,255,0.96)'
                              : 'rgba(15,23,42,0.92)',
                          color:
                            bannerContrast !== 'dark' ? 'var(--mantine-color-dark-9)' : 'white',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.45)',
                        }}
                      >
                        <IconDotsVertical size={18} />
                      </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item
                        leftSection={<IconPlus size={14} />}
                        onClick={() => {
                          setEditingTrackId(null);
                          setTrackForm({ name: '', color: '#3b82f6' });
                          setShowTrackForm(true);
                          setError('');
                        }}
                      >
                        Add Track
                      </Menu.Item>
                      <Menu.Divider />
                      {coverImage && (
                        <>
                          <Menu.Item
                            leftSection={<IconPhoto size={14} />}
                            onClick={() => setGalleryOpen(true)}
                          >
                            View gallery
                          </Menu.Item>
                          <Menu.Divider />
                        </>
                      )}
                      <Menu.Item leftSection={<IconPencil size={14} />} onClick={startEditLocation}>
                        Edit
                      </Menu.Item>
                      <Menu.Item
                        leftSection={<IconTrash size={14} />}
                        color="red"
                        onClick={deleteLocation}
                      >
                        Delete
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </Box>
              )}

              <Group justify="space-between" align="center" w="100%" wrap="nowrap" gap="sm">
                <Stack gap={4} style={{ minWidth: 0 }}>
                  <Title
                    order={isMobile ? 4 : 2}
                    style={{
                      color: bannerContrast === 'dark' ? 'var(--mantine-color-dark-8)' : 'white',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      paddingRight: isMobile ? 48 : 0,
                    }}
                  >
                    {currentLocation.name}
                  </Title>
                  {currentLocation.description && (
                    <Text
                      size="sm"
                      style={{
                        opacity: 0.85,
                        color: bannerContrast === 'dark' ? 'var(--mantine-color-dark-6)' : 'white',
                      }}
                    >
                      {currentLocation.description}
                    </Text>
                  )}
                  {currentLocation.address && (
                    <Text
                      component="a"
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                        currentLocation.address
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      size="xs"
                      style={{
                        color:
                          bannerContrast === 'dark' ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.8)',
                        textDecoration: 'none',
                      }}
                    >
                      <Group gap={4} align="center">
                        <IconMapPin size={12} />
                        {currentLocation.address}
                      </Group>
                    </Text>
                  )}
                </Stack>
                {!isMobile && (
                  <Group gap="xs" style={{ flexShrink: 0 }}>
                    <Button
                      size="xs"
                      variant={bannerContrast === 'dark' ? 'white' : 'filled'}
                      color="dark"
                      leftSection={<IconPlus size={14} />}
                      onClick={() => {
                        setEditingTrackId(null);
                        setTrackForm({ name: '', color: '#3b82f6' });
                        setShowTrackForm(true);
                        setError('');
                      }}
                      style={{
                        backgroundColor:
                          bannerContrast !== 'dark'
                            ? 'rgba(255,255,255,0.96)'
                            : 'rgba(15,23,42,0.92)',
                        color: bannerContrast !== 'dark' ? 'var(--mantine-color-dark-9)' : 'white',
                        borderColor:
                          bannerContrast !== 'dark' ? 'rgba(148,163,184,0.8)' : 'rgba(15,23,42,0.9)',
                      }}
                    >
                      Add Track
                    </Button>
                    <Menu shadow="md" width={200} position="bottom-end">
                      <Menu.Target>
                        <ActionIcon
                          variant="filled"
                          size="lg"
                          color="dark"
                          style={{
                            backgroundColor:
                              bannerContrast !== 'dark'
                                ? 'rgba(255,255,255,0.96)'
                                : 'rgba(15,23,42,0.92)',
                            color:
                              bannerContrast !== 'dark' ? 'var(--mantine-color-dark-9)' : 'white',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.45)',
                          }}
                        >
                          <IconDotsVertical size={18} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        {coverImage && (
                          <>
                            <Menu.Item
                              leftSection={<IconPhoto size={14} />}
                              onClick={() => setGalleryOpen(true)}
                            >
                              View gallery
                            </Menu.Item>
                            <Menu.Divider />
                          </>
                        )}
                        <Menu.Item leftSection={<IconPencil size={14} />} onClick={startEditLocation}>
                          Edit
                        </Menu.Item>
                        <Menu.Item
                          leftSection={<IconTrash size={14} />}
                          color="red"
                          onClick={deleteLocation}
                        >
                          Delete
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  </Group>
                )}
              </Group>
            </Box>
          </Box>
        ) : (
          <Box p="lg" style={{ background: 'var(--mantine-color-dark-6)' }}>
            <Group justify="space-between" align="center">
              <Stack gap={4} style={{ minWidth: 0 }}>
                <Group gap="xs" align="center">
                  <IconMapPin size={24} color="var(--mantine-color-blue-6)" />
                  <Title order={2}>{currentLocation.name}</Title>
                </Group>
                {currentLocation.description && (
                  <Text size="sm" c="dimmed">
                    {currentLocation.description}
                  </Text>
                )}
                {currentLocation.address && (
                  <Text
                    component="a"
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(currentLocation.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    c="dimmed"
                    size="xs"
                    style={{ textDecoration: 'none' }}
                  >
                    <Group gap={4} align="center">
                      <IconMapPin size={12} />
                      {currentLocation.address}
                    </Group>
                  </Text>
                )}
              </Stack>
              <Group gap="xs" style={{ flexShrink: 0 }}>
                <Button
                  size="xs"
                  variant="white"
                  color="dark"
                  leftSection={<IconPlus size={14} />}
                  onClick={() => {
                    setEditingTrackId(null);
                    setTrackForm({ name: '', color: '#3b82f6' });
                    setShowTrackForm(true);
                    setError('');
                  }}
                >
                  Add Track
                </Button>
                <Menu shadow="md" width={200} position="bottom-end">
                  <Menu.Target>
                    <ActionIcon variant="subtle" size="lg" color="gray">
                      <IconDotsVertical size={18} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    {coverImage && (
                      <>
                        <Menu.Item
                          leftSection={<IconPhoto size={14} />}
                          onClick={() => setGalleryOpen(true)}
                        >
                          View gallery
                        </Menu.Item>
                        <Menu.Divider />
                      </>
                    )}
                    <Menu.Item leftSection={<IconPencil size={14} />} onClick={startEditLocation}>
                      Edit
                    </Menu.Item>
                    <Menu.Item
                      leftSection={<IconTrash size={14} />}
                      color="red"
                      onClick={deleteLocation}
                    >
                      Delete
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </Group>
            </Group>
          </Box>
        )}

        {/* Track map */}
        {mapPositions.length > 0 && (
          <Box style={{ position: 'relative' }}>
            <Box
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                zIndex: 2,
              }}
            >
              <Button
                size="xs"
                variant="filled"
                color="dark"
                aria-label={isMapCollapsed ? 'Show map' : 'Hide map'}
                onClick={() => setIsMapCollapsed((v) => !v)}
                leftSection={
                  isMapCollapsed ? (
                    <IconChevronDown size={14} />
                  ) : (
                    <IconChevronUp size={14} />
                  )
                }
                style={{
                  backgroundColor: 'rgba(15, 23, 42, 0.92)',
                  color: 'white',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.45)',
                  borderRadius: 999,
                }}
              >
                {isMapCollapsed ? 'Show map' : 'Hide map'}
              </Button>
            </Box>

            <Box
              style={{
                maxHeight: isMapCollapsed ? 48 : 460,
                opacity: isMapCollapsed ? 0 : 1,
                overflow: 'hidden',
                transition: 'max-height 200ms ease, opacity 200ms ease',
              }}
            >
              <MapContainer
                bounds={L.latLngBounds(mapPositions.map((p) => L.latLng(p[0], p[1])))}
                boundsOptions={{ padding: [40, 40], maxZoom: 15 }}
                style={{
                  height: 400,
                  width: '100%',
                  position: 'relative',
                  zIndex: 0,
                }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://tiles.stadiamaps.com/tiles/outdoors/{z}/{x}/{y}{r}.png"
                />
                {locationTracks.map((track) => {
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
                        pathOptions={{
                          color: track.color,
                          weight: 3,
                          dashArray: '6 4',
                        }}
                      />
                    </span>
                  );
                })}
              </MapContainer>
              <Box
                p="md"
                style={{
                  borderTop: '1px solid var(--mantine-color-dark-5)',
                }}
              >
                <Group gap="md" wrap="wrap">
                  {locationTracks.map((t) => (
                    <Group key={String(t.id)} gap="xs">
                      <Box
                        w={12}
                        h={12}
                        style={{
                          borderRadius: '50%',
                          background: t.color,
                        }}
                      />
                      <Text size="sm" c="dimmed">
                        {t.name}
                      </Text>
                    </Group>
                  ))}
                </Group>
              </Box>
            </Box>
          </Box>
        )}
      </Paper>

      {/* Edit location modal */}
      <Modal
        opened={editingLocation}
        onClose={() => setEditingLocation(false)}
        title={
          <ModalHeader
            icon={<IconMapPin size={20} />}
            iconColor="blue"
            label="Location"
            title="Edit Location"
          />
        }
        centered
        radius="md"
        size="lg"
        overlayProps={{ blur: 3 }}
        styles={modalHeaderStyles()}
      >
        <Stack gap="sm" pt="xs">
          <FormError error={error} />
          <TextInput
            label="Name"
            value={locationForm.name}
            onChange={(e) => setLocationForm((f) => ({ ...f, name: e.target.value }))}
            autoFocus
          />
          <TextInput
            label="Description"
            placeholder="Description (optional)"
            value={locationForm.description}
            onChange={(e) => setLocationForm((f) => ({ ...f, description: e.target.value }))}
          />
          <TextInput
            label="Address"
            placeholder="Address (optional)"
            value={locationForm.address}
            onChange={(e) => setLocationForm((f) => ({ ...f, address: e.target.value }))}
          />
          {/* Banner image */}
          <Stack gap="xs">
            <Text size="sm" fw={500}>
              Banner image
            </Text>
            {locationImages.length > 0 ? (
              <Text size="xs" c="dimmed">
                This location already has gallery images. Change the cover picture from the gallery
                instead.
              </Text>
            ) : locationForm.imageUrl ? (
              <Box
                style={{
                  position: 'relative',
                  height: 120,
                  borderRadius: 'var(--mantine-radius-sm)',
                  overflow: 'hidden',
                }}
              >
                <Box
                  component="img"
                  src={locationForm.imageUrl}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
                <ActionIcon
                  size="sm"
                  color="red"
                  variant="filled"
                  style={{ position: 'absolute', top: 6, right: 6 }}
                  onClick={() => setLocationForm((f) => ({ ...f, imageUrl: undefined }))}
                >
                  <IconX size={12} />
                </ActionIcon>
              </Box>
            ) : (
              <Box
                style={{
                  border: '2px dashed var(--mantine-color-dark-4)',
                  borderRadius: 'var(--mantine-radius-sm)',
                  padding: '16px',
                  textAlign: 'center',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = async (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) {
                      const url = await resizeImage(file);
                      setLocationForm((f) => ({ ...f, imageUrl: url }));
                    }
                  };
                  input.click();
                }}
              >
                <Group justify="center" gap="xs">
                  <IconPhoto size={16} style={{ opacity: 0.4 }} />
                  <Text size="sm" c="dimmed">
                    Click to upload banner image
                  </Text>
                </Group>
              </Box>
            )}
          </Stack>
          <ModalFooter
            onCancel={() => setEditingLocation(false)}
            submitLabel="Save"
            onSubmit={saveLocation}
            size="sm"
          />
        </Stack>
      </Modal>

      {/* Track create/edit modal */}
      <Modal
        opened={showTrackForm}
        onClose={resetTrackForm}
        title={
          <ModalHeader
            icon={<IconRoute size={20} />}
            iconColor="blue"
            label="Track"
            title={editingTrackId ? 'Edit Track' : 'New Track'}
          />
        }
        centered
        radius="md"
        size="lg"
        overlayProps={{ blur: 3 }}
        styles={modalHeaderStyles()}
      >
        <Stack gap="md" pt="xs">
          <FormError error={error} />
          <TextInput
            label="Name"
            value={trackForm.name}
            onChange={(e) => setTrackForm((f) => ({ ...f, name: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && handleTrackSubmit()}
            autoFocus
          />
          <ColorInput
            label="Color"
            value={trackForm.color}
            onChange={(c) => setTrackForm((f) => ({ ...f, color: c }))}
          />
          <ModalFooter
            onCancel={resetTrackForm}
            submitLabel={editingTrackId ? 'Save' : 'Create'}
            onSubmit={handleTrackSubmit}
            size="sm"
          />
        </Stack>
      </Modal>

      {/* Image gallery modal */}
      <Modal
        opened={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        size="xl"
        padding={0}
        withCloseButton={false}
        centered
        overlayProps={{
          backgroundOpacity: 0.85,
          color: '#000',
        }}
      >
        <Box
          style={{
            position: 'relative',
            background: 'var(--mantine-color-dark-7)',
          }}
        >
          <ActionIcon
            variant="filled"
            color="dark"
            size="lg"
            style={{ position: 'absolute', top: 12, right: 12, zIndex: 10 }}
            onClick={() => setGalleryOpen(false)}
          >
            <IconX size={18} />
          </ActionIcon>

          {locationImages.length === 0 ? (
            <Box p="lg">
              <Text size="sm" c="dimmed">
                No images available for this location yet.
              </Text>
              <Group justify="flex-end" mt="md">
                <Button
                  size="sm"
                  leftSection={<IconPlus size={14} />}
                  onClick={handleUploadGalleryImage}
                >
                  Add image
                </Button>
              </Group>
            </Box>
          ) : (
            <>
              <Carousel
                initialSlide={galleryIndex}
                withIndicators={locationImages.length > 1}
                withControls={locationImages.length > 1}
                onSlideChange={setGalleryIndex}
                height="70vh"
                loop
                nextControlIcon={<IconChevronRight size={24} />}
                previousControlIcon={<IconChevronLeft size={24} />}
                styles={{
                  control: {
                    background: 'var(--mantine-color-dark-6)',
                    border: 'none',
                    color: 'white',
                  },
                }}
              >
                {locationImages.map((img) => (
                  <Carousel.Slide key={String(img.id)}>
                    <Box
                      style={{
                        height: '70vh',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <img
                        src={img.url}
                        alt={img.caption || currentLocation.name}
                        style={{
                          maxWidth: '100%',
                          maxHeight: '100%',
                          objectFit: 'contain',
                        }}
                      />
                    </Box>
                  </Carousel.Slide>
                ))}
              </Carousel>
              {locationImages[galleryIndex] && (
                <Box p="md" style={{ borderTop: '1px solid var(--mantine-color-dark-5)' }}>
                  <Group justify="space-between" align="center">
                    <Stack gap={2} style={{ flex: 1 }}>
                      <Text size="sm" c="dimmed">
                        {locationImages[galleryIndex].caption || currentLocation.name}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {galleryIndex + 1} / {locationImages.length}
                      </Text>
                    </Stack>
                    <Group gap="xs">
                      <Button size="xs" variant="subtle" onClick={handleUploadGalleryImage}>
                        Add image
                      </Button>
                      {!locationImages[galleryIndex].isCover && (
                        <Button
                          size="xs"
                          variant="subtle"
                          onClick={() => {
                            const targetId = locationImages[galleryIndex].id;
                            setLocations((prev) =>
                              prev.map((v) => {
                                if (v.id !== locationId) return v;
                                const existing = v.images ?? [];
                                const images = existing.map((img) => ({
                                  ...img,
                                  isCover: img.id === targetId,
                                }));
                                const cover = images.find((img) => img.isCover) ?? images[0];
                                return {
                                  ...v,
                                  images,
                                  imageUrl: cover?.url,
                                };
                              })
                            );
                          }}
                        >
                          Set as cover
                        </Button>
                      )}
                      {locationImages.length > 1 && (
                        <Button
                          size="xs"
                          variant="subtle"
                          color="red"
                          onClick={() => {
                            const targetId = locationImages[galleryIndex].id;
                            if (!confirm('Remove this image from the gallery?')) return;
                            setLocations((prev) =>
                              prev.map((v) => {
                                if (v.id !== locationId) return v;
                                const existing = v.images ?? [];
                                const images = existing.filter((img) => img.id !== targetId);
                                const cover = images.find((img) => img.isCover) ?? images[0];
                                return {
                                  ...v,
                                  images: images.length > 0 ? images : undefined,
                                  imageUrl: cover?.url,
                                };
                              })
                            );
                            setGalleryIndex((idx) =>
                              Math.max(0, Math.min(idx, locationImages.length - 2))
                            );
                          }}
                        >
                          Remove
                        </Button>
                      )}
                    </Group>
                  </Group>
                </Box>
              )}
            </>
          )}
        </Box>
      </Modal>

      {/* Track gallery modal */}
      <Modal
        opened={trackGalleryTrackId !== null}
        onClose={() => {
          setTrackGalleryTrackId(null);
          setTrackGalleryIndex(0);
        }}
        size="xl"
        padding={0}
        withCloseButton={false}
        centered
        overlayProps={{
          backgroundOpacity: 0.85,
          color: '#000',
        }}
      >
        {(() => {
          if (trackGalleryTrackId === null) return null;
          const track = locationTracks.find((t) => t.id === trackGalleryTrackId);
          if (!track) return null;
          const images = trackImagesByTrack.get(track.id) ?? [];

          return (
            <Box
              style={{
                position: 'relative',
                background: 'var(--mantine-color-dark-7)',
              }}
            >
              <ActionIcon
                variant="filled"
                color="dark"
                size="lg"
                style={{ position: 'absolute', top: 12, right: 12, zIndex: 10 }}
                onClick={() => {
                  setTrackGalleryTrackId(null);
                  setTrackGalleryIndex(0);
                }}
              >
                <IconX size={18} />
              </ActionIcon>

              {images.length === 0 ? (
                <Box p="lg">
                  <Text size="sm" c="dimmed">
                    No images available for this track yet.
                  </Text>
                  <Group justify="flex-end" mt="md">
                    <Button
                      size="sm"
                      leftSection={<IconPlus size={14} />}
                      onClick={() => handleUploadTrackImage(track.id)}
                    >
                      Add image
                    </Button>
                  </Group>
                </Box>
              ) : (
                <>
                  <Carousel
                    initialSlide={trackGalleryIndex}
                    withIndicators={images.length > 1}
                    withControls={images.length > 1}
                    onSlideChange={setTrackGalleryIndex}
                    height="70vh"
                    loop
                    nextControlIcon={<IconChevronRight size={24} />}
                    previousControlIcon={<IconChevronLeft size={24} />}
                    styles={{
                      control: {
                        background: 'var(--mantine-color-dark-6)',
                        border: 'none',
                        color: 'white',
                      },
                    }}
                  >
                    {images.map((img) => (
                      <Carousel.Slide key={String(img.id)}>
                        <Box
                          style={{
                            height: '70vh',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <img
                            src={img.url}
                            alt={img.caption || track.name}
                            style={{
                              maxWidth: '100%',
                              maxHeight: '100%',
                              objectFit: 'contain',
                            }}
                          />
                        </Box>
                      </Carousel.Slide>
                    ))}
                  </Carousel>
                  {images[trackGalleryIndex] && (
                    <Box p="md" style={{ borderTop: '1px solid var(--mantine-color-dark-5)' }}>
                      <Group justify="space-between" align="center">
                        <Stack gap={2} style={{ flex: 1 }}>
                          <Text size="sm" c="dimmed">
                            {images[trackGalleryIndex].caption || track.name}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {trackGalleryIndex + 1} / {images.length}
                          </Text>
                        </Stack>
                        <Group gap="xs">
                          <Button
                            size="xs"
                            variant="subtle"
                            onClick={() => handleUploadTrackImage(track.id)}
                          >
                            Add image
                          </Button>
                          {!images[trackGalleryIndex].isCover && (
                            <Button
                              size="xs"
                              variant="subtle"
                              onClick={() =>
                                setTrackImagesByTrack((prev) => {
                                  const next = new Map(prev);
                                  const current = next.get(track.id) ?? [];
                                  const updated = current.map((img) => ({
                                    ...img,
                                    isCover: img.id === images[trackGalleryIndex].id,
                                  }));
                                  next.set(track.id, updated);
                                  return next;
                                })
                              }
                            >
                              Set as cover
                            </Button>
                          )}
                          {images.length > 1 && (
                            <Button
                              size="xs"
                              variant="subtle"
                              color="red"
                              onClick={() => {
                                const targetId = images[trackGalleryIndex].id;
                                if (!confirm('Remove this image from the gallery?')) return;
                                setTrackImagesByTrack((prev) => {
                                  const next = new Map(prev);
                                  const current = next.get(track.id) ?? [];
                                  const remaining = current.filter((img) => img.id !== targetId);
                                  const withCover =
                                    remaining.length === 0
                                      ? remaining
                                      : remaining.map((img, idx) => ({
                                          ...img,
                                          isCover: idx === 0 ? true : img.isCover,
                                        }));
                                  next.set(track.id, withCover);
                                  return next;
                                });
                                setTrackGalleryIndex((idx) =>
                                  Math.max(0, Math.min(idx, images.length - 2))
                                );
                              }}
                            >
                              Remove
                            </Button>
                          )}
                        </Group>
                      </Group>
                    </Box>
                  )}
                </>
              )}
            </Box>
          );
        })()}
      </Modal>

      {/* Variation modal (standard) */}
      <Modal
        opened={showVarForm !== null}
        onClose={resetVarForm}
        title={
          <ModalHeader
            icon={<IconRoute size={20} />}
            iconColor="blue"
            label="Track variation"
            title={
              editingVarId
                ? `Edit Variation${variationModalTrack ? ` — ${variationModalTrack.name}` : ''}`
                : `New Variation${variationModalTrack ? ` — ${variationModalTrack.name}` : ''}`
            }
          />
        }
        centered
        radius="md"
        size="lg"
        overlayProps={{ blur: 3 }}
        styles={modalHeaderStyles()}
      >
        {(() => {
          const track = variationModalTrack;
          if (!track) return null;

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

          const mapCenter: [number, number] = startPos ?? endPos ?? mapPositions[0] ?? [0, 0];

          return (
            <Stack gap="sm" pt="xs">
              <TextInput
                label="Name"
                value={varForm.name}
                onChange={(e) => setVarForm((f) => ({ ...f, name: e.target.value }))}
                autoFocus
              />
              <Textarea
                label="Description"
                value={varForm.description}
                onChange={(e) => setVarForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
              />

              <Box>
                <Group gap="xs" align="center" mb="xs" wrap="wrap">
                  <Text size="sm" fw={500}>
                    GPS Coordinates
                  </Text>
                  <Button
                    variant="subtle"
                    size="xs"
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
                    onClick={() => setPlacingPin(placingPin === 'end' ? null : 'end')}
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
                  center={mapCenter}
                  zoom={mapCenter[0] === 0 ? 2 : 14}
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
                  <TileLayer
                    attribution='&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://tiles.stadiamaps.com/tiles/outdoors/{z}/{x}/{y}{r}.png"
                  />
                  <MapClickHandler onPlace={handleMapPlace} />
                  {startPos && (
                    <Marker
                      position={startPos}
                      icon={START_ICON}
                      draggable
                      eventHandlers={{
                        dragend(e) {
                          const latlng = (e.target as L.Marker).getLatLng();
                          setVarForm((f) => ({
                            ...f,
                            startLat: latlng.lat.toFixed(6),
                            startLng: latlng.lng.toFixed(6),
                          }));
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
                          setVarForm((f) => ({
                            ...f,
                            endLat: latlng.lat.toFixed(6),
                            endLng: latlng.lng.toFixed(6),
                          }));
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
                    Start: {hasStart ? `${varForm.startLat}, ${varForm.startLng}` : 'not set'}
                  </Text>
                  <Text size="xs" c="dimmed">
                    End: {hasEnd ? `${varForm.endLat}, ${varForm.endLng}` : 'not set'}
                  </Text>
                </Group>
              </Box>

              <Group gap="sm" grow>
                <TextInput
                  label="Start Latitude"
                  placeholder="e.g. 39.7392"
                  value={varForm.startLat}
                  onChange={(e) => setVarForm((f) => ({ ...f, startLat: e.target.value }))}
                />
                <TextInput
                  label="Start Longitude"
                  placeholder="e.g. -104.9903"
                  value={varForm.startLng}
                  onChange={(e) => setVarForm((f) => ({ ...f, startLng: e.target.value }))}
                />
              </Group>
              <Group gap="sm" grow>
                <TextInput
                  label="End Latitude"
                  placeholder="e.g. 39.7489"
                  value={varForm.endLat}
                  onChange={(e) => setVarForm((f) => ({ ...f, endLat: e.target.value }))}
                />
                <TextInput
                  label="End Longitude"
                  placeholder="e.g. -104.9815"
                  value={varForm.endLng}
                  onChange={(e) => setVarForm((f) => ({ ...f, endLng: e.target.value }))}
                />
              </Group>

              <ModalFooter
                onCancel={resetVarForm}
                submitLabel={editingVarId ? 'Save' : 'Add'}
                onSubmit={handleVarSubmit}
              />
            </Stack>
          );
        })()}
      </Modal>

      {/* Tracks section */}
      <Stack gap="md">
        <Group justify="space-between" align="center" wrap="wrap">
          <Group gap="xs" align="center">
            <IconRoute size={20} color="var(--mantine-color-dimmed)" />
            <Text size="sm" fw={600} c="dimmed" tt="uppercase">
              Tracks
            </Text>
            <Badge size="sm" variant="light" color="gray">
              {locationTracks.length}
            </Badge>
          </Group>
        </Group>

        {error && !editingLocation && (
          <Text size="sm" c="red">
            {error}
          </Text>
        )}

        {/* Track cards */}
        {locationTracks.length === 0 && !showTrackForm ? (
          <Paper withBorder p="xl">
            <Stack align="center" gap="sm">
              <IconRoute size={48} color="var(--mantine-color-dimmed)" />
              <Text c="dimmed" ta="center">
                No tracks yet. Add one to get started.
              </Text>
            </Stack>
          </Paper>
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
            {locationTracks.map((track) => {
              const vars = variationsByTrack.get(track.id) ?? [];
              const isExpanded = expandedTrack === track.id;
              const defaultVar = defaultVariations.get(track.id);
              const cover = trackCoverImages.get(track.id);

              return (
                <Card
                  key={String(track.id)}
                  ref={(el) => {
                    if (el) trackRefs.current.set(track.id, el);
                    else trackRefs.current.delete(track.id);
                  }}
                  withBorder
                  radius="md"
                  padding={0}
                  style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
                >
                  {/* Cover image */}
                  <Card.Section
                    style={{
                      height: 220,
                      backgroundColor: 'var(--mantine-color-dark-6)',
                      position: 'relative',
                    }}
                    onClick={() => toggleExpand(track.id)}
                  >
                    {cover?.url ? (
                      <Box
                        component="img"
                        src={cover.url}
                        alt={track.name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block',
                        }}
                      />
                    ) : (
                      <Box
                        style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background:
                            'linear-gradient(135deg, var(--mantine-color-dark-6) 0%, var(--mantine-color-dark-8) 100%)',
                        }}
                      >
                        <IconRoute
                          size={40}
                          style={{ opacity: 0.25, color: 'var(--mantine-color-gray-4)' }}
                        />
                      </Box>
                    )}
                    <Box
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background:
                          'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.7) 100%)',
                      }}
                    />
                    {/* Dots menu pinned to top-right */}
                    <Box
                      style={{ position: 'absolute', top: 8, right: 8 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Menu shadow="md" width={180} position="bottom-end">
                        <Menu.Target>
                          <ActionIcon
                            variant="filled"
                            size="sm"
                            color="dark"
                            style={{
                              backgroundColor: 'rgba(15,23,42,0.75)',
                              color: 'white',
                            }}
                          >
                            <IconDotsVertical size={14} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item
                            leftSection={<IconPhoto size={14} />}
                            onClick={() => setTrackGalleryTrackId(track.id)}
                          >
                            View gallery
                          </Menu.Item>
                          <Menu.Item
                            leftSection={<IconPencil size={14} />}
                            onClick={() => startEditTrack(track)}
                          >
                            Edit
                          </Menu.Item>
                          <Menu.Item
                            leftSection={<IconTrash size={14} />}
                            color="red"
                            onClick={() => handleDeleteTrack(track)}
                          >
                            Delete
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    </Box>

                    <Group
                      justify="space-between"
                      align="flex-end"
                      p="sm"
                      style={{
                        position: 'absolute',
                        inset: 0,
                      }}
                    >
                      <Stack gap={4} style={{ maxWidth: '70%' }}>
                        <Group gap="xs" align="center">
                          <Box
                            w={10}
                            h={10}
                            style={{ borderRadius: '50%', background: track.color }}
                          />
                          <Text fw={600} size="sm" c="white" lineClamp={1}>
                            {track.name}
                          </Text>
                        </Group>
                        <Text size="xs" c="rgba(226,232,240,0.9)" lineClamp={2}>
                          {defaultVar?.description || 'No description yet.'}
                        </Text>
                      </Stack>
                      <Stack gap={4} align="flex-end">
                        <Badge
                          size="sm"
                          variant="light"
                          color="blue"
                          styles={{
                            root: {
                              backgroundColor: 'rgba(15,23,42,0.85)',
                              borderColor: 'rgba(148,163,184,0.7)',
                              color: 'white',
                            },
                          }}
                        >
                          {vars.length} variation{vars.length !== 1 ? 's' : ''}
                        </Badge>
                        <Group gap={4}>
                          {isExpanded ? (
                            <IconChevronUp size={16} color="var(--mantine-color-gray-3)" />
                          ) : (
                            <IconChevronDown size={16} color="var(--mantine-color-gray-3)" />
                          )}
                        </Group>
                      </Stack>
                    </Group>
                  </Card.Section>

                </Card>
              );
            })}
          </SimpleGrid>
        )}
        {/* Expanded variations panel for selected track */}
        <Collapse in={expandedTrack !== null}>
          {expandedTrack !== null && (() => {
            const track = locationTracks.find((t) => t.id === expandedTrack);
            if (!track) return null;
            const vars = variationsByTrack.get(track.id) ?? [];
            return (
              <Paper
                withBorder
                radius="md"
                p="md"
                mt="md"
              >
                <Group justify="space-between" align="center" mb="sm">
                  <Group gap="sm">
                    <Box
                      w={12}
                      h={12}
                      style={{ borderRadius: '50%', background: track.color }}
                    />
                    <Text fw={600}>{track.name}</Text>
                    <Badge size="sm" variant="light" color="gray">
                      {vars.length} variation{vars.length !== 1 ? 's' : ''}
                    </Badge>
                  </Group>
                  <Button
                    size="xs"
                    leftSection={<IconPlus size={12} />}
                    onClick={() => startAddVar(track.id)}
                  >
                    Add Variation
                  </Button>
                </Group>
                <Table>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Name</Table.Th>
                      <Table.Th>Description</Table.Th>
                      <Table.Th>Coordinates</Table.Th>
                      <Table.Th style={{ width: 50 }}></Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {vars.map((tv) => (
                      <Table.Tr key={String(tv.id)}>
                        <Table.Td>
                          <Group gap="xs">
                            {tv.name === 'Default' && (
                              <Badge size="xs" variant="light" color="blue">
                                Default
                              </Badge>
                            )}
                            <Text size="sm">{tv.name}</Text>
                          </Group>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c="dimmed">
                            {tv.description || '—'}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          {tv.startLatitude !== 0 || tv.startLongitude !== 0 ? (
                            <Text size="xs" c="dimmed">
                              {tv.startLatitude.toFixed(4)}, {tv.startLongitude.toFixed(4)}
                              {' → '}
                              {tv.endLatitude.toFixed(4)}, {tv.endLongitude.toFixed(4)}
                            </Text>
                          ) : (
                            <Text size="xs" c="dimmed">
                              Not set
                            </Text>
                          )}
                        </Table.Td>
                        <Table.Td>
                          <Menu shadow="md" width={150} position="bottom-end">
                            <Menu.Target>
                              <ActionIcon variant="subtle" size="sm" color="gray">
                                <IconDotsVertical size={14} />
                              </ActionIcon>
                            </Menu.Target>
                            <Menu.Dropdown>
                              <Menu.Item
                                leftSection={<IconPencil size={14} />}
                                onClick={() => startEditVar(tv)}
                              >
                                Edit
                              </Menu.Item>
                              {tv.name !== 'Default' && vars.length > 1 && (
                                <Menu.Item
                                  leftSection={<IconTrash size={14} />}
                                  color="red"
                                  onClick={() => handleDeleteVar(tv)}
                                >
                                  Delete
                                </Menu.Item>
                              )}
                            </Menu.Dropdown>
                          </Menu>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Paper>
            );
          })()}
        </Collapse>
      </Stack>
    </Stack>
  );
}
