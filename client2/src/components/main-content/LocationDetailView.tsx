import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
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
} from "@mantine/core";
import { Carousel } from "@mantine/carousel";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  IconArrowLeft,
  IconDotsVertical,
  IconMapPin,
  IconPencil,
  IconPlus,
  IconRoute,
  IconTrash,
  IconChevronDown,
  IconChevronUp,
  IconPhoto,
  IconX,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react";

// Leaflet pin icons
function pinIcon(color: string, label: string) {
  return L.divIcon({
    className: "",
    html: `<div style="display:flex;flex-direction:column;align-items:center">
      <div style="background:${color};color:white;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,0.4)">${label}</div>
      <div style="width:2px;height:8px;background:${color}"></div>
      <div style="width:8px;height:8px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4)"></div>
    </div>`,
    iconSize: [40, 30],
    iconAnchor: [20, 30],
  });
}

const START_ICON = pinIcon("#22c55e", "START");
const END_ICON = pinIcon("#ef4444", "END");

// Auto-fit map bounds
function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions.map((p) => L.latLng(p[0], p[1])));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [positions, map]);
  return null;
}

// Types
interface VenueImage {
  id: bigint;
  venueId: bigint;
  url: string;
  caption: string;
  isBanner: boolean;
}

interface Venue {
  id: bigint;
  name: string;
  description: string;
  address: string;
}

interface Track {
  id: bigint;
  venueId: bigint;
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

// Mock data
const MOCK_VENUES: Venue[] = [
  {
    id: 1n,
    name: "Mountain Ridge Park",
    description: "Premier enduro venue with varied terrain",
    address: "1234 Mountain Rd, Denver, CO 80210",
  },
  {
    id: 2n,
    name: "Desert Dunes Complex",
    description: "Sandy trails and technical sections",
    address: "5678 Desert Ave, Phoenix, AZ 85001",
  },
  {
    id: 3n,
    name: "Forest Trail Center",
    description: "Wooded single track paradise",
    address: "9012 Forest Lane, Portland, OR 97201",
  },
];

const MOCK_TRACKS: Track[] = [
  { id: 1n, venueId: 1n, name: "Summit Run", color: "#ef4444" },
  { id: 2n, venueId: 1n, name: "Ridge Line", color: "#22c55e" },
  { id: 3n, venueId: 1n, name: "Valley Drop", color: "#3b82f6" },
  { id: 4n, venueId: 2n, name: "Sand Storm", color: "#f59e0b" },
  { id: 5n, venueId: 2n, name: "Cactus Trail", color: "#8b5cf6" },
  { id: 6n, venueId: 3n, name: "Pine Loop", color: "#22c55e" },
];

const MOCK_VENUE_IMAGES: VenueImage[] = [
  {
    id: 1n,
    venueId: 1n,
    url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&h=400&fit=crop",
    caption: "Mountain Ridge Park - Main Entrance",
    isBanner: true,
  },
  {
    id: 2n,
    venueId: 1n,
    url: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&h=600&fit=crop",
    caption: "Summit Run - Starting Area",
    isBanner: false,
  },
  {
    id: 3n,
    venueId: 1n,
    url: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&h=600&fit=crop",
    caption: "Ridge Line - Technical Section",
    isBanner: false,
  },
  {
    id: 4n,
    venueId: 1n,
    url: "https://images.unsplash.com/photo-1533240332313-0db49b459ad6?w=800&h=600&fit=crop",
    caption: "Valley Drop - Finish Line",
    isBanner: false,
  },
  {
    id: 5n,
    venueId: 1n,
    url: "https://images.unsplash.com/photo-1476231682828-37e571bc172f?w=800&h=600&fit=crop",
    caption: "Spectator Area",
    isBanner: false,
  },
  {
    id: 6n,
    venueId: 2n,
    url: "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=1200&h=400&fit=crop",
    caption: "Desert Dunes Complex - Overview",
    isBanner: true,
  },
  {
    id: 7n,
    venueId: 2n,
    url: "https://images.unsplash.com/photo-1473580044384-7ba9967e16a0?w=800&h=600&fit=crop",
    caption: "Sand Storm Trail",
    isBanner: false,
  },
  {
    id: 8n,
    venueId: 3n,
    url: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=1200&h=400&fit=crop",
    caption: "Forest Trail Center - Entrance",
    isBanner: true,
  },
  {
    id: 9n,
    venueId: 3n,
    url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop",
    caption: "Pine Loop Trail",
    isBanner: false,
  },
];

const MOCK_VARIATIONS: TrackVariation[] = [
  {
    id: 1n,
    trackId: 1n,
    name: "Default",
    description: "Standard route",
    startLatitude: 39.7392,
    startLongitude: -104.9903,
    endLatitude: 39.7489,
    endLongitude: -104.9815,
  },
  {
    id: 2n,
    trackId: 1n,
    name: "Short Cut",
    description: "Bypass the rock garden",
    startLatitude: 39.7392,
    startLongitude: -104.9903,
    endLatitude: 39.7450,
    endLongitude: -104.9850,
  },
  {
    id: 3n,
    trackId: 2n,
    name: "Default",
    description: "Ridge traverse",
    startLatitude: 39.7500,
    startLongitude: -104.9800,
    endLatitude: 39.7580,
    endLongitude: -104.9720,
  },
  {
    id: 4n,
    trackId: 3n,
    name: "Default",
    description: "Valley descent",
    startLatitude: 39.7600,
    startLongitude: -104.9700,
    endLatitude: 39.7350,
    endLongitude: -104.9900,
  },
  {
    id: 5n,
    trackId: 4n,
    name: "Default",
    description: "Sandy trail",
    startLatitude: 33.4484,
    startLongitude: -112.0740,
    endLatitude: 33.4550,
    endLongitude: -112.0650,
  },
  {
    id: 6n,
    trackId: 5n,
    name: "Default",
    description: "Cactus route",
    startLatitude: 33.4600,
    startLongitude: -112.0600,
    endLatitude: 33.4680,
    endLongitude: -112.0500,
  },
  {
    id: 7n,
    trackId: 6n,
    name: "Default",
    description: "Forest loop",
    startLatitude: 45.5152,
    startLongitude: -122.6784,
    endLatitude: 45.5230,
    endLongitude: -122.6700,
  },
];

interface LocationDetailViewProps {
  venueId: bigint;
  onBack: () => void;
}

export function LocationDetailView({ venueId, onBack }: LocationDetailViewProps) {
  const [venues, setVenues] = useState<Venue[]>(MOCK_VENUES);
  const [tracks, setTracks] = useState<Track[]>(MOCK_TRACKS);
  const [variations, setVariations] = useState<TrackVariation[]>(MOCK_VARIATIONS);
  const [venueImages] = useState<VenueImage[]>(MOCK_VENUE_IMAGES);

  const [editingVenue, setEditingVenue] = useState(false);
  const [venueForm, setVenueForm] = useState({ name: "", description: "", address: "" });

  const [showTrackForm, setShowTrackForm] = useState(false);
  const [trackForm, setTrackForm] = useState({ name: "", color: "#3b82f6" });
  const [editingTrackId, setEditingTrackId] = useState<bigint | null>(null);

  const [expandedTrack, setExpandedTrack] = useState<bigint | null>(null);

  const [showVarForm, setShowVarForm] = useState<bigint | null>(null);
  const [varForm, setVarForm] = useState({
    name: "",
    description: "",
    startLat: "",
    startLng: "",
    endLat: "",
    endLng: "",
  });
  const [editingVarId, setEditingVarId] = useState<bigint | null>(null);

  const [error, setError] = useState("");
  const trackRefs = useRef(new Map<bigint, HTMLDivElement>());

  // Image gallery state
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  const venue = venues.find((v) => v.id === venueId);
  const venueTracks = useMemo(
    () => tracks.filter((t) => t.venueId === venueId).sort((a, b) => a.name.localeCompare(b.name)),
    [tracks, venueId]
  );

  const variationsByTrack = useMemo(() => {
    const m = new Map<bigint, TrackVariation[]>();
    for (const v of variations) {
      for (const t of venueTracks) {
        if (v.trackId === t.id) {
          const arr = m.get(t.id) ?? [];
          arr.push(v);
          m.set(t.id, arr);
        }
      }
    }
    return m;
  }, [variations, venueTracks]);

  // Get images for this venue
  const currentVenueImages = useMemo(
    () => venueImages.filter((img) => img.venueId === venueId),
    [venueImages, venueId]
  );
  const bannerImage = currentVenueImages.find((img) => img.isBanner);
  const galleryImages = currentVenueImages.filter((img) => !img.isBanner);

  // Get default variation for each track for the map
  const defaultVariations = useMemo(() => {
    const m = new Map<bigint, TrackVariation>();
    for (const [trackId, vars] of variationsByTrack) {
      const def = vars.find((v) => v.name === "Default") ?? vars[0];
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

  const scrollToTrack = useCallback((trackId: bigint) => {
    const el = trackRefs.current.get(trackId);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
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

  if (!venue) {
    return (
      <Stack gap="lg">
        <Button
          variant="subtle"
          leftSection={<IconArrowLeft size={16} />}
          onClick={onBack}
          style={{ alignSelf: "flex-start" }}
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

  // Venue edit handlers
  const startEditVenue = () => {
    setVenueForm({
      name: venue.name,
      description: venue.description,
      address: venue.address,
    });
    setEditingVenue(true);
    setError("");
  };

  const saveVenue = () => {
    setError("");
    if (!venueForm.name.trim()) {
      setError("Name is required");
      return;
    }
    setVenues((prev) =>
      prev.map((v) =>
        v.id === venueId
          ? {
              ...v,
              name: venueForm.name.trim(),
              description: venueForm.description.trim(),
              address: venueForm.address.trim(),
            }
          : v
      )
    );
    setEditingVenue(false);
  };

  const deleteVenue = () => {
    if (!confirm("Delete this location and all its tracks? This cannot be undone.")) return;
    setVenues((prev) => prev.filter((v) => v.id !== venueId));
    onBack();
  };

  // Track handlers
  const startEditTrack = (t: Track) => {
    setTrackForm({ name: t.name, color: t.color });
    setEditingTrackId(t.id);
    setShowTrackForm(true);
    setError("");
  };

  const resetTrackForm = () => {
    setTrackForm({ name: "", color: "#3b82f6" });
    setEditingTrackId(null);
    setShowTrackForm(false);
    setError("");
  };

  const handleTrackSubmit = () => {
    setError("");
    if (!trackForm.name.trim()) {
      setError("Track name is required");
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
        venueId,
        name: trackForm.name.trim(),
        color: trackForm.color,
      };
      setTracks((prev) => [...prev, newTrack]);
      // Create default variation
      const newVar: TrackVariation = {
        id: BigInt(Date.now() + 1),
        trackId: newTrack.id,
        name: "Default",
        description: "",
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
      name: "",
      description: "",
      startLat: "",
      startLng: "",
      endLat: "",
      endLng: "",
    });
    setEditingVarId(null);
    setShowVarForm(trackId);
    setError("");
  };

  const startEditVar = (tv: TrackVariation) => {
    setVarForm({
      name: tv.name,
      description: tv.description,
      startLat: String(tv.startLatitude || ""),
      startLng: String(tv.startLongitude || ""),
      endLat: String(tv.endLatitude || ""),
      endLng: String(tv.endLongitude || ""),
    });
    setEditingVarId(tv.id);
    setShowVarForm(tv.trackId);
    setError("");
  };

  const resetVarForm = () => {
    setVarForm({
      name: "",
      description: "",
      startLat: "",
      startLng: "",
      endLat: "",
      endLng: "",
    });
    setEditingVarId(null);
    setShowVarForm(null);
    setError("");
  };

  const handleVarSubmit = () => {
    setError("");
    if (!varForm.name.trim()) {
      setError("Variation name is required");
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
      setVariations((prev) =>
        prev.map((v) => (v.id === editingVarId ? { ...v, ...data } : v))
      );
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
      alert("Cannot delete the last variation. Delete the track instead.");
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
        style={{ alignSelf: "flex-start" }}
      >
        Back to Locations
      </Button>

      {/* Banner with venue header */}
      <Paper
        withBorder
        radius="md"
        style={{
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Banner image */}
        {bannerImage ? (
          <Box
            style={{
              height: 200,
              backgroundImage: `url(${bannerImage.url})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              position: "relative",
            }}
          >
            <Overlay
              gradient="linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.7) 100%)"
              opacity={1}
            />
            <Box
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                padding: "var(--mantine-spacing-lg)",
              }}
            >
              <Group justify="space-between" align="flex-end">
                <div>
                  <Title order={2} c="white">
                    {venue.name}
                  </Title>
                  {venue.description && (
                    <Text size="sm" c="white" style={{ opacity: 0.9 }}>
                      {venue.description}
                    </Text>
                  )}
                </div>
                <Menu shadow="md" width={180} position="bottom-end">
                  <Menu.Target>
                    <ActionIcon variant="light" size="lg" color="gray">
                      <IconDotsVertical size={18} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item leftSection={<IconPencil size={14} />} onClick={startEditVenue}>
                      Edit
                    </Menu.Item>
                    <Menu.Item leftSection={<IconTrash size={14} />} color="red" onClick={deleteVenue}>
                      Delete
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </Group>
            </Box>
          </Box>
        ) : (
          <Box p="lg" style={{ background: "var(--mantine-color-dark-6)" }}>
            <Group justify="space-between" align="flex-start">
              <Group gap="xs" align="center">
                <IconMapPin size={24} color="var(--mantine-color-blue-6)" />
                <Title order={2}>{venue.name}</Title>
              </Group>
              <Menu shadow="md" width={180} position="bottom-end">
                <Menu.Target>
                  <ActionIcon variant="subtle" size="lg" color="gray">
                    <IconDotsVertical size={18} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item leftSection={<IconPencil size={14} />} onClick={startEditVenue}>
                    Edit
                  </Menu.Item>
                  <Menu.Item leftSection={<IconTrash size={14} />} color="red" onClick={deleteVenue}>
                    Delete
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </Group>
            {venue.description && (
              <Text size="sm" c="dimmed" mt="xs">
                {venue.description}
              </Text>
            )}
          </Box>
        )}

        {/* Venue info below banner */}
        <Box p="lg">
          {editingVenue ? (
            <Stack gap="sm">
              {error && (
                <Text size="sm" c="red">
                  {error}
                </Text>
              )}
              <TextInput
                label="Name"
                value={venueForm.name}
                onChange={(e) => setVenueForm((f) => ({ ...f, name: e.target.value }))}
                autoFocus
              />
              <TextInput
                label="Description"
                placeholder="Description (optional)"
                value={venueForm.description}
                onChange={(e) => setVenueForm((f) => ({ ...f, description: e.target.value }))}
              />
              <TextInput
                label="Address"
                placeholder="Address (optional)"
                value={venueForm.address}
                onChange={(e) => setVenueForm((f) => ({ ...f, address: e.target.value }))}
              />
              <Group gap="xs">
                <Button size="sm" onClick={saveVenue}>
                  Save
                </Button>
                <Button variant="subtle" size="sm" onClick={() => setEditingVenue(false)}>
                  Cancel
                </Button>
              </Group>
            </Stack>
          ) : (
            <Stack gap="md">
              {/* Address */}
              {venue.address && (
                <Group gap="xs">
                  <IconMapPin size={16} color="var(--mantine-color-dimmed)" />
                  <Text
                    component="a"
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(venue.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    c="blue"
                    size="sm"
                  >
                    {venue.address}
                  </Text>
                </Group>
              )}

              {/* Image gallery */}
              {galleryImages.length > 0 && (
                <Stack gap="xs">
                  <Group gap="xs" align="center">
                    <IconPhoto size={16} color="var(--mantine-color-dimmed)" />
                    <Text size="sm" fw={600} c="dimmed" tt="uppercase">
                      Gallery
                    </Text>
                    <Badge size="sm" variant="light" color="gray">
                      {galleryImages.length}
                    </Badge>
                  </Group>
                  <SimpleGrid cols={{ base: 3, sm: 4, md: 5 }} spacing="xs">
                    {galleryImages.map((img, idx) => (
                      <UnstyledButton
                        key={String(img.id)}
                        onClick={() => {
                          setGalleryIndex(idx);
                          setGalleryOpen(true);
                        }}
                        style={{
                          aspectRatio: "1",
                          borderRadius: "var(--mantine-radius-sm)",
                          overflow: "hidden",
                          border: "1px solid var(--mantine-color-dark-4)",
                        }}
                      >
                        <img
                          src={img.url}
                          alt={img.caption}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                      </UnstyledButton>
                    ))}
                  </SimpleGrid>
                </Stack>
              )}
            </Stack>
          )}
        </Box>
      </Paper>

      {/* Image gallery modal */}
      <Modal
        opened={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        size="xl"
        padding={0}
        withCloseButton={false}
        centered
      >
        <Box style={{ position: "relative", background: "var(--mantine-color-dark-7)" }}>
          <ActionIcon
            variant="filled"
            color="dark"
            size="lg"
            style={{ position: "absolute", top: 12, right: 12, zIndex: 10 }}
            onClick={() => setGalleryOpen(false)}
          >
            <IconX size={18} />
          </ActionIcon>
          <Carousel
            initialSlide={galleryIndex}
            withIndicators={galleryImages.length > 1}
            withControls={galleryImages.length > 1}
            onSlideChange={setGalleryIndex}
            height="70vh"
            nextControlIcon={<IconChevronRight size={24} />}
            previousControlIcon={<IconChevronLeft size={24} />}
            styles={{
              control: {
                background: "var(--mantine-color-dark-6)",
                border: "none",
                color: "white",
              },
            }}
          >
            {galleryImages.map((img) => (
              <Carousel.Slide key={String(img.id)}>
                <Box
                  style={{
                    height: "70vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <img
                    src={img.url}
                    alt={img.caption}
                    style={{
                      maxWidth: "100%",
                      maxHeight: "100%",
                      objectFit: "contain",
                    }}
                  />
                </Box>
              </Carousel.Slide>
            ))}
          </Carousel>
          {galleryImages[galleryIndex] && (
            <Box p="md" style={{ borderTop: "1px solid var(--mantine-color-dark-5)" }}>
              <Text size="sm" c="dimmed" ta="center">
                {galleryImages[galleryIndex].caption}
              </Text>
              <Text size="xs" c="dimmed" ta="center" mt={4}>
                {galleryIndex + 1} / {galleryImages.length}
              </Text>
            </Box>
          )}
        </Box>
      </Modal>

      {/* Map section */}
      {mapPositions.length > 0 && (
        <Paper withBorder radius="md" style={{ overflow: "hidden" }}>
          <Box p="md" style={{ borderBottom: "1px solid var(--mantine-color-dark-5)" }}>
            <Group gap="xs" align="center">
              <IconRoute size={20} color="var(--mantine-color-dimmed)" />
              <Text size="sm" fw={600} c="dimmed" tt="uppercase">
                Track Map
              </Text>
            </Group>
          </Box>
          <MapContainer
            center={mapPositions[0]}
            zoom={14}
            style={{ height: 400, width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitBounds positions={mapPositions} />
            {venueTracks.map((track) => {
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
                          style={{ fontWeight: 600, textAlign: "left" }}
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
                          style={{ fontWeight: 600, textAlign: "left" }}
                        >
                          {track.name}
                        </UnstyledButton>
                      </Stack>
                    </Popup>
                  </Marker>
                  <Polyline
                    positions={[start, end]}
                    pathOptions={{ color: track.color, weight: 3, dashArray: "6 4" }}
                  />
                </span>
              );
            })}
          </MapContainer>
          {/* Map legend */}
          <Box p="md" style={{ borderTop: "1px solid var(--mantine-color-dark-5)" }}>
            <Group gap="md" wrap="wrap">
              {venueTracks.map((t) => (
                <Group key={String(t.id)} gap="xs">
                  <Box w={12} h={12} style={{ borderRadius: "50%", background: t.color }} />
                  <Text size="sm" c="dimmed">
                    {t.name}
                  </Text>
                </Group>
              ))}
            </Group>
          </Box>
        </Paper>
      )}

      {/* Tracks section */}
      <Stack gap="md">
        <Group justify="space-between" align="center" wrap="wrap">
          <Group gap="xs" align="center">
            <IconRoute size={20} color="var(--mantine-color-dimmed)" />
            <Text size="sm" fw={600} c="dimmed" tt="uppercase">
              Tracks
            </Text>
            <Badge size="sm" variant="light" color="gray">
              {venueTracks.length}
            </Badge>
          </Group>
          {!showTrackForm && (
            <Button
              size="xs"
              leftSection={<IconPlus size={14} />}
              onClick={() => {
                setEditingTrackId(null);
                setTrackForm({ name: "", color: "#3b82f6" });
                setShowTrackForm(true);
                setError("");
              }}
            >
              Add Track
            </Button>
          )}
        </Group>

        {error && !editingVenue && (
          <Text size="sm" c="red">
            {error}
          </Text>
        )}

        {/* Track form */}
        {showTrackForm && (
          <Paper withBorder p="md">
            <Text size="sm" fw={600} c="dimmed" tt="uppercase" mb="sm">
              {editingTrackId ? "Edit Track" : "New Track"}
            </Text>
            <Group gap="sm" align="flex-end" wrap="wrap">
              <TextInput
                label="Name"
                value={trackForm.name}
                onChange={(e) => setTrackForm((f) => ({ ...f, name: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && handleTrackSubmit()}
                autoFocus
                style={{ flex: 1, minWidth: 150 }}
              />
              <ColorInput
                label="Color"
                value={trackForm.color}
                onChange={(c) => setTrackForm((f) => ({ ...f, color: c }))}
              />
              <Button size="sm" onClick={handleTrackSubmit}>
                {editingTrackId ? "Save" : "Create"}
              </Button>
              <Button variant="subtle" size="sm" onClick={resetTrackForm}>
                Cancel
              </Button>
            </Group>
          </Paper>
        )}

        {/* Track list */}
        {venueTracks.length === 0 && !showTrackForm ? (
          <Paper withBorder p="xl">
            <Stack align="center" gap="sm">
              <IconRoute size={48} color="var(--mantine-color-dimmed)" />
              <Text c="dimmed" ta="center">
                No tracks yet. Add one to get started.
              </Text>
            </Stack>
          </Paper>
        ) : (
          <Stack gap="xs">
            {venueTracks.map((track) => {
              const vars = variationsByTrack.get(track.id) ?? [];
              const isExpanded = expandedTrack === track.id;
              return (
                <Paper
                  key={String(track.id)}
                  ref={(el) => {
                    if (el) trackRefs.current.set(track.id, el);
                    else trackRefs.current.delete(track.id);
                  }}
                  withBorder
                  style={{ overflow: "hidden" }}
                >
                  {/* Track header */}
                  <Group
                    justify="space-between"
                    align="center"
                    p="sm"
                    style={{ cursor: "pointer" }}
                    onClick={() => toggleExpand(track.id)}
                  >
                    <Group gap="sm">
                      <Box
                        w={12}
                        h={12}
                        style={{ borderRadius: "50%", background: track.color }}
                      />
                      <Text fw={600}>{track.name}</Text>
                      <Badge size="sm" variant="light" color="gray">
                        {vars.length} variation{vars.length !== 1 ? "s" : ""}
                      </Badge>
                    </Group>
                    <Group gap="xs" align="center">
                      <Menu shadow="md" width={180} position="bottom-end">
                        <Menu.Target>
                          <ActionIcon
                            variant="subtle"
                            size="sm"
                            color="gray"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <IconDotsVertical size={14} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
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
                      {isExpanded ? (
                        <IconChevronUp size={16} color="var(--mantine-color-dimmed)" />
                      ) : (
                        <IconChevronDown size={16} color="var(--mantine-color-dimmed)" />
                      )}
                    </Group>
                  </Group>

                  {/* Expanded content: variations */}
                  {isExpanded && (
                    <Box
                      p="md"
                      style={{ borderTop: "1px solid var(--mantine-color-default-border)" }}
                    >
                      <Group justify="space-between" align="center" mb="sm">
                        <Text size="xs" fw={600} c="dimmed" tt="uppercase">
                          Variations
                        </Text>
                        <Button size="xs" leftSection={<IconPlus size={12} />} onClick={() => startAddVar(track.id)}>
                          Add Variation
                        </Button>
                      </Group>

                      {/* Variation form */}
                      {showVarForm === track.id && (
                        <Paper withBorder p="md" mb="sm">
                          <Stack gap="sm">
                            <TextInput
                              label="Name"
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
                              rows={2}
                            />
                            <Group gap="sm" grow>
                              <TextInput
                                label="Start Latitude"
                                placeholder="e.g. 39.7392"
                                value={varForm.startLat}
                                onChange={(e) =>
                                  setVarForm((f) => ({ ...f, startLat: e.target.value }))
                                }
                              />
                              <TextInput
                                label="Start Longitude"
                                placeholder="e.g. -104.9903"
                                value={varForm.startLng}
                                onChange={(e) =>
                                  setVarForm((f) => ({ ...f, startLng: e.target.value }))
                                }
                              />
                            </Group>
                            <Group gap="sm" grow>
                              <TextInput
                                label="End Latitude"
                                placeholder="e.g. 39.7489"
                                value={varForm.endLat}
                                onChange={(e) =>
                                  setVarForm((f) => ({ ...f, endLat: e.target.value }))
                                }
                              />
                              <TextInput
                                label="End Longitude"
                                placeholder="e.g. -104.9815"
                                value={varForm.endLng}
                                onChange={(e) =>
                                  setVarForm((f) => ({ ...f, endLng: e.target.value }))
                                }
                              />
                            </Group>
                            <Group gap="xs">
                              <Button size="sm" onClick={handleVarSubmit}>
                                {editingVarId ? "Save" : "Add"}
                              </Button>
                              <Button variant="subtle" size="sm" onClick={resetVarForm}>
                                Cancel
                              </Button>
                            </Group>
                          </Stack>
                        </Paper>
                      )}

                      {/* Variation list */}
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
                                  {tv.name === "Default" && (
                                    <Badge size="xs" variant="light" color="blue">
                                      Default
                                    </Badge>
                                  )}
                                  <Text size="sm">{tv.name}</Text>
                                </Group>
                              </Table.Td>
                              <Table.Td>
                                <Text size="sm" c="dimmed">
                                  {tv.description || "—"}
                                </Text>
                              </Table.Td>
                              <Table.Td>
                                {tv.startLatitude !== 0 || tv.startLongitude !== 0 ? (
                                  <Text size="xs" c="dimmed">
                                    {tv.startLatitude.toFixed(4)}, {tv.startLongitude.toFixed(4)}
                                    {" → "}
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
                                    {tv.name !== "Default" && vars.length > 1 && (
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
                    </Box>
                  )}
                </Paper>
              );
            })}
          </Stack>
        )}
      </Stack>
    </Stack>
  );
}
