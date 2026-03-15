import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from '@mantine/form';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  ColorInput,
  Group,
  Menu,
  Modal,
  Overlay,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { Carousel } from '@mantine/carousel';
import type { UseEmblaCarouselType } from 'embla-carousel-react';
import { useMediaQuery } from '@mantine/hooks';
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet';
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
import {
  type Location,
  type LocationImage,
  loadLocations,
  saveLocations,
} from '../locationStorage';
import { ModalHeader, modalHeaderStyles, FormError, ModalFooter } from '@/components/common';
import type { Track, TrackVariation, TrackImage } from './types';
import {
  loadTracksFromStorage,
  saveTracksToStorage,
  loadVariationsFromStorage,
  saveVariationsToStorage,
  MOCK_TRACKS,
  MOCK_VARIATIONS,
} from './trackStorage';
import { useImageContrast } from '@/hooks/useImageContrast';

import { START_ICON, END_ICON } from './mapIcons';
import { VariationsModal } from './modals/VariationsModal';
import { AddOrEditVariationModal } from './modals/AddOrEditVariationModal';

const DEFAULT_MAP_CENTER: [number, number] = [39.7392, -104.9903];

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
  const [tracks, setTracks] = useState<Track[]>(() => loadTracksFromStorage() ?? MOCK_TRACKS);
  const [variations, setVariations] = useState<TrackVariation[]>(
    () => loadVariationsFromStorage() ?? MOCK_VARIATIONS
  );
  useEffect(() => {
    saveTracksToStorage(tracks);
  }, [tracks]);
  useEffect(() => {
    saveVariationsToStorage(variations);
  }, [variations]);
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
  const locationForm = useForm({
    initialValues: {
      name: '',
      description: '',
      address: '',
      imageUrl: undefined as string | undefined,
    },
    validate: {
      name: (v) => (!v?.trim() ? 'Name is required' : null),
    },
  });

  const [showTrackForm, setShowTrackForm] = useState(false);
  const trackForm = useForm({
    initialValues: { name: '', color: '#3b82f6' },
    validate: {
      name: (v) => (!v?.trim() ? 'Track name is required' : null),
    },
  });
  const [editingTrackId, setEditingTrackId] = useState<bigint | null>(null);

  const [expandedTrack, setExpandedTrack] = useState<bigint | null>(null);
  const [variationsModalSlide, setVariationsModalSlide] = useState(0);
  const [trackGalleryTrackId, setTrackGalleryTrackId] = useState<bigint | null>(null);
  const [trackGalleryIndex, setTrackGalleryIndex] = useState(0);

  const [showVarForm, setShowVarForm] = useState<bigint | null>(null);
  /** When set, re-open the variations modal for this track when the add-variation modal closes */
  const [reopenVariationsTrackId, setReopenVariationsTrackId] = useState<bigint | null>(null);
  const varForm = useForm({
    initialValues: {
      name: '',
      description: '',
      startLat: '',
      startLng: '',
      endLat: '',
      endLng: '',
    },
    validate: {
      name: (v) => (!v?.trim() ? 'Variation name is required' : null),
    },
  });
  const [placingPin, setPlacingPin] = useState<'start' | 'end' | null>(null);
  const [editingVarId, setEditingVarId] = useState<bigint | null>(null);
  const variationsCarouselEmblaRef = useRef<UseEmblaCarouselType[1] | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [isMapCollapsed, setIsMapCollapsed] = useState(true);

  const currentLocation = locations.find((v) => v.id === locationId);

  const locationImages: LocationImage[] = useMemo(
    () => currentLocation?.images ?? [],
    [currentLocation?.images]
  );
  const coverImage: LocationImage | undefined =
    locationImages.find((img) => img.isCover) ?? locationImages[0];

  const bannerContrast = useImageContrast(coverImage?.url ?? currentLocation?.imageUrl);
  const locationTracks = useMemo(
    () =>
      tracks
        .filter((t) => t.locationId === locationId)
        .sort((a, b) => a.name.localeCompare(b.name)),
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

  const toggleExpand = useCallback((trackId: bigint) => {
    setExpandedTrack((prev) => (prev === trackId ? null : trackId));
  }, []);

  useEffect(() => {
    if (expandedTrack !== null) setVariationsModalSlide(0);
  }, [expandedTrack]);

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
            ? existing.reduce<bigint>((max, img) => (img.id > max ? img.id : max), existing[0].id) +
              1n
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
    locationForm.setValues({
      name: currentLocation.name,
      description: currentLocation.description,
      address: currentLocation.address,
      imageUrl: coverImage?.url ?? currentLocation.imageUrl,
    });
    locationForm.clearErrors();
    setEditingLocation(true);
  };

  const saveLocation = () => {
    if (!locationForm.validate()) return;
    const values = locationForm.values;
    setLocations((prev) =>
      prev.map((v) => {
        if (v.id !== locationId) return v;

        const existingImages = v.images ?? [];
        let images = existingImages;

        // If a new banner image was provided, add/update it as the cover image
        // and ensure only one image per location has isCover === true.
        if (values.imageUrl) {
          const existing = existingImages.find((img) => img.url === values.imageUrl);
          if (existing) {
            images = existingImages.map((img) => ({
              ...img,
              isCover: img.url === values.imageUrl,
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
              url: values.imageUrl,
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
          name: values.name.trim(),
          description: values.description.trim(),
          address: values.address.trim(),
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
    trackForm.setValues({ name: t.name, color: t.color });
    trackForm.clearErrors();
    setEditingTrackId(t.id);
    setShowTrackForm(true);
  };

  const resetTrackForm = () => {
    trackForm.reset();
    setEditingTrackId(null);
    setShowTrackForm(false);
  };

  const handleTrackSubmit = () => {
    if (!trackForm.validate()) return;
    const { name, color } = trackForm.values;
    if (editingTrackId !== null) {
      setTracks((prev) =>
        prev.map((t) => (t.id === editingTrackId ? { ...t, name: name.trim(), color } : t))
      );
    } else {
      const newTrack: Track = {
        id: BigInt(Date.now()),
        locationId,
        name: name.trim(),
        color,
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
    varForm.reset();
    setEditingVarId(null);
    setShowVarForm(trackId);
    setPlacingPin(null);
    const defaultVar = defaultVariations.get(trackId);
    if (defaultVar) {
      varForm.setValues({
        startLat: defaultVar.startLatitude ? String(defaultVar.startLatitude) : '',
        startLng: defaultVar.startLongitude ? String(defaultVar.startLongitude) : '',
        endLat: defaultVar.endLatitude ? String(defaultVar.endLatitude) : '',
        endLng: defaultVar.endLongitude ? String(defaultVar.endLongitude) : '',
      });
    }
  };

  const startEditVar = (tv: TrackVariation) => {
    varForm.setValues({
      name: tv.name,
      description: tv.description,
      startLat: String(tv.startLatitude || ''),
      startLng: String(tv.startLongitude || ''),
      endLat: String(tv.endLatitude || ''),
      endLng: String(tv.endLongitude || ''),
    });
    varForm.clearErrors();
    setEditingVarId(tv.id);
    setShowVarForm(tv.trackId);
    setPlacingPin(null);
  };

  const resetVarForm = () => {
    varForm.reset();
    setEditingVarId(null);
    setShowVarForm(null);
    setPlacingPin(null);
  };

  // Re-open variations modal when add-variation modal closes and we came from it
  useEffect(() => {
    if (showVarForm === null && reopenVariationsTrackId !== null) {
      const id = reopenVariationsTrackId;
      setReopenVariationsTrackId(null);
      setExpandedTrack(id);
    }
  }, [showVarForm, reopenVariationsTrackId]);

  const handleVarSubmit = () => {
    if (!varForm.validate()) return;
    const v = varForm.values;
    const data = {
      name: v.name.trim(),
      description: v.description.trim(),
      startLatitude: parseFloat(v.startLat) || 0,
      startLongitude: parseFloat(v.startLng) || 0,
      endLatitude: parseFloat(v.endLat) || 0,
      endLongitude: parseFloat(v.endLng) || 0,
    };
    if (editingVarId !== null) {
      setVariations((prev) => prev.map((ev) => (ev.id === editingVarId ? { ...ev, ...data } : ev)));
    } else {
      if (showVarForm === null) return;
      const newVar: TrackVariation = {
        id: BigInt(Date.now()),
        trackId: showVarForm,
        ...data,
      };
      setVariations((prev) => [...prev, newVar]);
    }
    resetVarForm();
  };

  const handleDeleteVar = (tv: TrackVariation) => {
    if (tv.name === 'Default') {
      alert('Cannot delete the Default variation.');
      return;
    }
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
                          trackForm.reset();
                          setShowTrackForm(true);
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
                        trackForm.reset();
                        setShowTrackForm(true);
                      }}
                      style={{
                        backgroundColor:
                          bannerContrast !== 'dark'
                            ? 'rgba(255,255,255,0.96)'
                            : 'rgba(15,23,42,0.92)',
                        color: bannerContrast !== 'dark' ? 'var(--mantine-color-dark-9)' : 'white',
                        borderColor:
                          bannerContrast !== 'dark'
                            ? 'rgba(148,163,184,0.8)'
                            : 'rgba(15,23,42,0.9)',
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
                        <Menu.Item
                          leftSection={<IconPencil size={14} />}
                          onClick={startEditLocation}
                        >
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
                    trackForm.reset();
                    setShowTrackForm(true);
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
                  isMapCollapsed ? <IconChevronDown size={14} /> : <IconChevronUp size={14} />
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
          <FormError
            error={
              typeof locationForm.errors.name === 'string' ? locationForm.errors.name : undefined
            }
          />
          <TextInput label="Name" {...locationForm.getInputProps('name')} autoFocus />
          <TextInput
            label="Description"
            placeholder="Description (optional)"
            {...locationForm.getInputProps('description')}
          />
          <TextInput
            label="Address"
            placeholder="Address (optional)"
            {...locationForm.getInputProps('address')}
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
            ) : locationForm.values.imageUrl ? (
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
                  src={locationForm.values.imageUrl}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
                <ActionIcon
                  size="sm"
                  color="red"
                  variant="filled"
                  style={{ position: 'absolute', top: 6, right: 6 }}
                  onClick={() => locationForm.setFieldValue('imageUrl', undefined)}
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
                      locationForm.setFieldValue('imageUrl', url);
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
          <FormError
            error={typeof trackForm.errors.name === 'string' ? trackForm.errors.name : undefined}
          />
          <TextInput
            label="Name"
            {...trackForm.getInputProps('name')}
            onKeyDown={(e) => e.key === 'Enter' && handleTrackSubmit()}
            autoFocus
          />
          <ColorInput label="Color" {...trackForm.getInputProps('color')} />
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

      <AddOrEditVariationModal
        opened={showVarForm !== null}
        onClose={resetVarForm}
        track={variationModalTrack}
        form={varForm}
        placingPin={placingPin}
        setPlacingPin={setPlacingPin}
        mapPositions={mapPositions}
        editingVarId={editingVarId}
        onCancel={resetVarForm}
        onSubmit={handleVarSubmit}
      />

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
                    {/* Dots menu pinned to top-right (z-index so it's above the overlay Group) */}
                    <Box
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        zIndex: 10,
                      }}
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
                            leftSection={<IconPlus size={14} />}
                            onClick={() => startAddVar(track.id)}
                          >
                            Add variation
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
                          style={{ cursor: 'pointer' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(track.id);
                          }}
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
                      </Stack>
                    </Group>
                  </Card.Section>
                </Card>
              );
            })}
          </SimpleGrid>
        )}
        {expandedTrack !== null &&
          (() => {
            const track = locationTracks.find((t) => t.id === expandedTrack);
            if (!track) return null;
            const vars = variationsByTrack.get(track.id) ?? [];
            return (
              <VariationsModal
                opened
                onClose={() => setExpandedTrack(null)}
                track={track}
                variations={vars}
                currentSlide={variationsModalSlide}
                onSlideChange={setVariationsModalSlide}
                carouselEmblaRef={variationsCarouselEmblaRef}
                onEditVariation={startEditVar}
                onDeleteVariation={handleDeleteVar}
                onAddVariationFromModal={(trackId) => {
                  setReopenVariationsTrackId(trackId);
                  setExpandedTrack(null);
                  startAddVar(trackId);
                }}
              />
            );
          })()}
      </Stack>
    </Stack>
  );
}
