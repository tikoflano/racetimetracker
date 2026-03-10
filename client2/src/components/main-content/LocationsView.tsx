import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  ActionIcon,
  Anchor,
  Badge,
  Box,
  Button,
  Card,
  Group,
  Loader,
  Menu,
  Modal,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  IconDotsVertical,
  IconExternalLink,
  IconMapPin,
  IconPhoto,
  IconPlus,
  IconRoute,
  IconSearch,
  IconSortAscending,
  IconStar,
  IconStarFilled,
  IconTrash,
  IconUpload,
  IconX,
} from "@tabler/icons-react";

// Leaflet marker icon for the location picker
const pickerIcon = L.divIcon({
  className: "",
  html: `<div style="width:18px;height:18px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.5)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

// Inner component: handles map clicks, size invalidation, and fly-to
function InnerMap({
  markerPos,
  onPick,
  flyTarget,
}: {
  markerPos: [number, number] | null;
  onPick: (lat: number, lng: number) => void;
  flyTarget: [number, number] | null;
}) {
  const map = useMap();

  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 100);
    return () => clearTimeout(t);
  }, [map]);

  useEffect(() => {
    if (flyTarget) map.flyTo(flyTarget, 13, { duration: 1 });
  }, [flyTarget, map]);

  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });

  return markerPos ? (
    <Marker
      position={markerPos}
      icon={pickerIcon}
      draggable
      eventHandlers={{
        dragend(e) {
          const { lat, lng } = (e.target as L.Marker).getLatLng();
          onPick(lat, lng);
        },
      }}
    />
  ) : null;
}

interface MapLocationPickerProps {
  markerPos: [number, number] | null;
  flyTarget: [number, number] | null;
  onPick: (lat: number, lng: number) => void;
  geocoding: boolean;
}

function MapLocationPicker({ markerPos, flyTarget, onPick, geocoding }: MapLocationPickerProps) {
  return (
    <Box
      style={{
        position: "relative",
        borderRadius: "var(--mantine-radius-sm)",
        overflow: "hidden",
        border: "1px solid var(--mantine-color-dark-4)",
      }}
    >
      <MapContainer
        center={[20, 0]}
        zoom={2}
        style={{ height: 260, width: "100%", cursor: "crosshair" }}
        scrollWheelZoom
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <InnerMap markerPos={markerPos} onPick={onPick} flyTarget={flyTarget} />
      </MapContainer>

      {/* Geocoding overlay */}
      {geocoding && (
        <Box
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.35)",
            zIndex: 1000,
          }}
        >
          <Loader size="sm" color="white" />
        </Box>
      )}

      {/* Hint */}
      {!markerPos && !geocoding && (
        <Box
          style={{
            position: "absolute",
            bottom: 10,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1000,
            pointerEvents: "none",
          }}
        >
          <Paper px="sm" py={5} radius="sm" style={{ background: "rgba(0,0,0,0.65)" }}>
            <Text size="xs" c="white">
              Click anywhere to place a pin
            </Text>
          </Paper>
        </Box>
      )}
    </Box>
  );
}

// Format a Nominatim reverse-geocode response into a concise address string
function formatAddress(data: {
  display_name: string;
  address?: Record<string, string>;
}): string {
  const a = data.address;
  if (!a) return data.display_name;
  const parts: string[] = [];
  if (a.house_number && a.road) parts.push(`${a.house_number} ${a.road}`);
  else if (a.road) parts.push(a.road);
  const city = a.city ?? a.town ?? a.village ?? a.hamlet ?? a.municipality ?? a.county;
  if (city) parts.push(city);
  if (a.state) parts.push(a.postcode ? `${a.state} ${a.postcode}` : a.state);
  if (a.country_code) parts.push(a.country_code.toUpperCase());
  return parts.length > 0 ? parts.join(", ") : data.display_name;
}

// Resize an image file to max 900px, returns a base64 JPEG data URL
function resizeImage(file: File, maxPx = 900): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const ratio = Math.min(maxPx / img.width, maxPx / img.height, 1);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.src = url;
  });
}

interface ImageUploaderProps {
  images: string[];
  coverIndex: number | null;
  onAdd: (dataUrls: string[]) => void;
  onRemove: (index: number) => void;
  onSetCover: (index: number) => void;
}

function ImageUploader({ images, coverIndex, onAdd, onRemove, onSetCover }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files) return;
      const dataUrls = await Promise.all(
        Array.from(files)
          .filter((f) => f.type.startsWith("image/"))
          .map((f) => resizeImage(f))
      );
      if (dataUrls.length > 0) onAdd(dataUrls);
    },
    [onAdd]
  );

  return (
    <Stack gap="xs">
      <Text size="sm" fw={500}>
        Images
      </Text>

      {images.length > 0 && (
        <SimpleGrid cols={4} spacing="xs">
          {images.map((src, i) => (
            <Box
              key={i}
              style={{ position: "relative", aspectRatio: "4/3", cursor: "pointer" }}
              onClick={() => onSetCover(i)}
            >
              <Box
                component="img"
                src={src}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  borderRadius: "var(--mantine-radius-sm)",
                  border:
                    i === coverIndex
                      ? "2px solid var(--mantine-color-blue-5)"
                      : "2px solid var(--mantine-color-dark-4)",
                  display: "block",
                }}
              />
              {/* Cover indicator */}
              <Box style={{ position: "absolute", top: 4, left: 4 }}>
                {i === coverIndex ? (
                  <IconStarFilled size={14} style={{ color: "var(--mantine-color-yellow-4)", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.6))" }} />
                ) : (
                  <IconStar size={14} style={{ color: "white", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.6))" }} />
                )}
              </Box>
              {/* Remove button */}
              <ActionIcon
                size="xs"
                color="red"
                variant="filled"
                style={{ position: "absolute", top: 4, right: 4 }}
                onClick={(e) => { e.stopPropagation(); onRemove(i); }}
              >
                <IconX size={10} />
              </ActionIcon>
            </Box>
          ))}
        </SimpleGrid>
      )}

      <Box
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        style={{
          border: `2px dashed ${dragging ? "var(--mantine-color-blue-5)" : "var(--mantine-color-dark-4)"}`,
          borderRadius: "var(--mantine-radius-sm)",
          padding: "16px",
          textAlign: "center",
          cursor: "pointer",
          background: dragging ? "rgba(66,99,235,0.08)" : "transparent",
          transition: "all 0.15s",
        }}
      >
        <Group justify="center" gap="xs">
          {images.length === 0 ? <IconPhoto size={16} style={{ opacity: 0.4 }} /> : <IconUpload size={16} style={{ opacity: 0.4 }} />}
          <Text size="sm" c="dimmed">
            {images.length === 0
              ? "Drag images here or click to upload"
              : "Add more images"}
          </Text>
        </Group>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: "none" }}
          onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
        />
      </Box>
      {images.length > 0 && (
        <Text size="xs" c="dimmed">
          Click a photo to set it as the cover. Star = current cover.
        </Text>
      )}
    </Stack>
  );
}

// Types
interface Venue {
  id: bigint;
  name: string;
  description: string;
  address: string;
  imageUrl?: string;
}

interface Track {
  id: bigint;
  venueId: bigint;
  name: string;
  color: string;
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
  {
    id: 4n,
    name: "Coastal Cliffs",
    description: "Ocean view trails with elevation changes",
    address: "3456 Coastal Hwy, San Diego, CA 92101",
  },
  {
    id: 5n,
    name: "Valley Motorsports Park",
    description: "",
    address: "",
  },
];

const MOCK_TRACKS: Track[] = [
  { id: 1n, venueId: 1n, name: "Summit Run", color: "#ef4444" },
  { id: 2n, venueId: 1n, name: "Ridge Line", color: "#22c55e" },
  { id: 3n, venueId: 1n, name: "Valley Drop", color: "#3b82f6" },
  { id: 4n, venueId: 2n, name: "Sand Storm", color: "#f59e0b" },
  { id: 5n, venueId: 2n, name: "Cactus Trail", color: "#8b5cf6" },
  { id: 6n, venueId: 3n, name: "Pine Loop", color: "#22c55e" },
  { id: 7n, venueId: 3n, name: "Oak Descent", color: "#ef4444" },
  { id: 8n, venueId: 3n, name: "Fern Gully", color: "#06b6d4" },
  { id: 9n, venueId: 3n, name: "Maple Ridge", color: "#ec4899" },
  { id: 10n, venueId: 4n, name: "Cliff Hanger", color: "#3b82f6" },
];

type SortOption = "name-asc" | "name-desc" | "tracks-desc" | "tracks-asc";
type FilterOption = "all" | "has-tracks" | "no-tracks";

interface LocationsViewProps {
  onSelectLocation?: (venueId: bigint) => void;
}

function mapsUrl(address: string) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}

interface VenueCardProps {
  venue: Venue;
  trackCount: number;
  onClick: () => void;
  onDelete: () => void;
}

function VenueCard({ venue, trackCount, onClick, onDelete }: VenueCardProps) {
  return (
    <Card
      shadow="sm"
      padding={0}
      radius="md"
      withBorder
      style={{ cursor: "pointer" }}
      onClick={onClick}
    >
      {/* Image / placeholder */}
      <Card.Section>
        {venue.imageUrl ? (
          <Box
            component="img"
            src={venue.imageUrl}
            alt={venue.name}
            style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }}
          />
        ) : (
          <Box
            style={{
              height: 160,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background:
                "linear-gradient(135deg, var(--mantine-color-dark-6) 0%, var(--mantine-color-dark-8) 100%)",
            }}
          >
            <IconMapPin
              size={48}
              style={{ opacity: 0.2, color: "var(--mantine-color-gray-4)" }}
            />
          </Box>
        )}
      </Card.Section>

      {/* Content */}
      <Stack p="md" gap="xs">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Text fw={600} lineClamp={1} style={{ flex: 1 }}>
            {venue.name}
          </Text>
          <Menu shadow="md" width={160} position="bottom-end">
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
                leftSection={<IconTrash size={14} />}
                color="red"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                Delete
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>

        <Text size="sm" c="dimmed" lineClamp={2} style={{ minHeight: "2.5em" }}>
          {venue.description || "No description provided."}
        </Text>

        <Group justify="space-between" align="center" mt={4}>
          <Badge
            size="sm"
            variant="light"
            color={trackCount > 0 ? "blue" : "gray"}
            leftSection={<IconRoute size={12} />}
          >
            {trackCount} {trackCount === 1 ? "track" : "tracks"}
          </Badge>

          {venue.address ? (
            <Anchor
              href={mapsUrl(venue.address)}
              target="_blank"
              rel="noopener noreferrer"
              size="xs"
              onClick={(e) => e.stopPropagation()}
              style={{ display: "flex", alignItems: "center", gap: 4 }}
            >
              <IconMapPin size={12} />
              Open in Maps
              <IconExternalLink size={10} />
            </Anchor>
          ) : null}
        </Group>

        {venue.address ? (
          <Text size="xs" c="dimmed" lineClamp={1}>
            {venue.address}
          </Text>
        ) : (
          <Text size="xs" c="dimmed">
            No address
          </Text>
        )}
      </Stack>
    </Card>
  );
}

export function LocationsView({ onSelectLocation }: LocationsViewProps) {
  const [venues, setVenues] = useState<Venue[]>(MOCK_VENUES);
  const [tracks] = useState<Track[]>(MOCK_TRACKS);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("name-asc");
  const [filter, setFilter] = useState<FilterOption>("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", address: "" });
  const [images, setImages] = useState<string[]>([]);
  const [coverIndex, setCoverIndex] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [markerPos, setMarkerPos] = useState<[number, number] | null>(null);
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const handleForwardGeocode = useCallback(async () => {
    const address = form.address.trim();
    if (!address) return;
    setGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
        { headers: { "User-Agent": "RaceTimeTracker/1.0" } }
      );
      const data = await res.json();
      if (data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        setMarkerPos([lat, lng]);
        setFlyTarget([lat, lng]);
      }
    } catch {
      // ignore — user can adjust manually
    } finally {
      setGeocoding(false);
    }
  }, [form.address]);

  const trackCounts = useMemo(() => {
    const m = new Map<bigint, number>();
    for (const t of tracks) {
      m.set(t.venueId, (m.get(t.venueId) ?? 0) + 1);
    }
    return m;
  }, [tracks]);

  const filteredAndSortedVenues = useMemo(() => {
    let result = [...venues];

    if (search) {
      const s = search.toLowerCase();
      result = result.filter(
        (v) =>
          v.name.toLowerCase().includes(s) ||
          v.description.toLowerCase().includes(s) ||
          v.address.toLowerCase().includes(s)
      );
    }

    if (filter === "has-tracks") {
      result = result.filter((v) => (trackCounts.get(v.id) ?? 0) > 0);
    } else if (filter === "no-tracks") {
      result = result.filter((v) => (trackCounts.get(v.id) ?? 0) === 0);
    }

    result.sort((a, b) => {
      switch (sort) {
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "tracks-desc":
          return (trackCounts.get(b.id) ?? 0) - (trackCounts.get(a.id) ?? 0);
        case "tracks-asc":
          return (trackCounts.get(a.id) ?? 0) - (trackCounts.get(b.id) ?? 0);
        default:
          return 0;
      }
    });

    return result;
  }, [venues, search, sort, filter, trackCounts]);

  const resetForm = () => {
    setForm({ name: "", description: "", address: "" });
    setImages([]);
    setCoverIndex(null);
    setError("");
    setShowForm(false);
    setMarkerPos(null);
    setFlyTarget(null);
  };

  const handleAddImages = useCallback((dataUrls: string[]) => {
    setImages((prev) => {
      const next = [...prev, ...dataUrls];
      setCoverIndex((ci) => ci ?? 0);
      return next;
    });
  }, []);

  const handleRemoveImage = useCallback((index: number) => {
    setImages((prev) => {
      const next = prev.filter((_, i) => i !== index);
      setCoverIndex((ci) => {
        if (ci === null || next.length === 0) return null;
        if (ci === index) return 0;
        return ci > index ? ci - 1 : ci;
      });
      return next;
    });
  }, []);

  const handleSetCover = useCallback((index: number) => {
    setCoverIndex(index);
  }, []);

  const handleMapPick = useCallback(async (lat: number, lng: number) => {
    setMarkerPos([lat, lng]);
    setGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        { headers: { "User-Agent": "RaceTimeTracker/1.0" } }
      );
      const data = await res.json();
      setForm((f) => ({ ...f, address: formatAddress(data) }));
    } catch {
      // user can type address manually
    } finally {
      setGeocoding(false);
    }
  }, []);

  const handleCreate = () => {
    setError("");
    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }
    if (!form.address.trim()) {
      setError("Address is required");
      return;
    }
    const newVenue: Venue = {
      id: BigInt(Date.now()),
      name: form.name.trim(),
      description: form.description.trim(),
      address: form.address.trim(),
      imageUrl: coverIndex !== null ? images[coverIndex] : undefined,
    };
    setVenues((prev) => [...prev, newVenue]);
    resetForm();
  };

  const handleDelete = (v: Venue) => {
    if (!confirm(`Delete "${v.name}" and all its tracks?`)) return;
    setVenues((prev) => prev.filter((venue) => venue.id !== v.id));
  };

  return (
    <Stack gap="lg">
      {/* Header Banner */}
      <Box
        p="xl"
        style={{
          background: "linear-gradient(135deg, #1C2348 0%, #2A3364 60%, #313B72 100%)",
          borderRadius: "var(--mantine-radius-md)",
          border: "1px solid #1e2028",
        }}
      >
        <Group justify="space-between" align="center" wrap="wrap" gap="md">
          <Group gap="md" align="center">
            <ThemeIcon size={52} radius="md" color="blue" variant="light">
              <IconMapPin size={28} />
            </ThemeIcon>
            <div>
              <Text size="xs" c="blue.3" tt="uppercase" fw={600} mb={2}>
                Manage
              </Text>
              <Title order={2} c="white" fw={700}>
                Locations
              </Title>
              <Text size="sm" c="blue.2" mt={2}>
                {venues.length} venue{venues.length !== 1 ? "s" : ""} · manage venues and tracks for your events
              </Text>
            </div>
          </Group>
          <Button
            leftSection={<IconPlus size={16} />}
            variant="white"
            color="dark"
            onClick={() => setShowForm(true)}
          >
            New Location
          </Button>
        </Group>
      </Box>

      {/* Create modal */}
      <Modal
        opened={showForm}
        onClose={resetForm}
        title={
          <Group gap="sm">
            <ThemeIcon size={36} radius="md" color="blue" variant="light">
              <IconMapPin size={20} />
            </ThemeIcon>
            <div>
              <Text size="xs" c="blue.4" tt="uppercase" fw={600} lh={1}>
                Add venue
              </Text>
              <Text fw={700} size="lg" lh={1.3}>
                New Location
              </Text>
            </div>
          </Group>
        }
        centered
        overlayProps={{ blur: 3 }}
        radius="md"
        size="lg"
        styles={{
          header: {
            background: "linear-gradient(135deg, #1C2348 0%, #2A3364 60%, #313B72 100%)",
            borderBottom: "1px solid #1e2028",
          },
          close: { color: "white" },
        }}
      >
        <Stack gap="md" pt="xs">
          {error && (
            <Text size="sm" c="red">
              {error}
            </Text>
          )}
          <TextInput
            label="Name"
            placeholder="e.g. Mountain Ridge Park"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            autoFocus
            required
          />
          <ImageUploader
            images={images}
            coverIndex={coverIndex}
            onAdd={handleAddImages}
            onRemove={handleRemoveImage}
            onSetCover={handleSetCover}
          />
          <TextInput
            label="Address"
            description="Type an address and press the search icon, or click the map to auto-fill"
            required
            placeholder="e.g. 1234 Mountain Rd, Denver, CO"
            leftSection={<IconMapPin size={14} />}
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            onKeyDown={(e) => { if (e.key === "Enter") handleForwardGeocode(); }}
            rightSection={
              geocoding ? (
                <Loader size={14} />
              ) : (
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  color="gray"
                  disabled={!form.address.trim()}
                  onClick={handleForwardGeocode}
                >
                  <IconSearch size={14} />
                </ActionIcon>
              )
            }
          />
          <MapLocationPicker
            markerPos={markerPos}
            flyTarget={flyTarget}
            onPick={handleMapPick}
            geocoding={geocoding}
          />
          <Textarea
            label="Description"
            placeholder="Brief description of the venue (optional)"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            minRows={4}
            resize="vertical"
          />
          <Group justify="flex-end" gap="xs">
            <Button variant="subtle" onClick={resetForm}>Cancel</Button>
            <Button onClick={handleCreate}>Create Location</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Toolbar */}
      <Paper p="sm" style={{ background: "#13151b", border: "1px solid #1e2028" }}>
        <Group justify="space-between" align="center" wrap="wrap" gap="md">
          <Group gap="xs" wrap="wrap">
            {(["all", "has-tracks", "no-tracks"] as FilterOption[]).map((f) => {
              const labels: Record<FilterOption, string> = {
                "all": `All (${venues.length})`,
                "has-tracks": "Has Tracks",
                "no-tracks": "No Tracks",
              };
              return (
                <Badge
                  key={f}
                  size="lg"
                  variant={filter === f ? "filled" : "light"}
                  color="blue"
                  leftSection={f === "all" ? <IconMapPin size={12} /> : <IconRoute size={12} />}
                  style={{ cursor: "pointer" }}
                  onClick={() => setFilter(f)}
                >
                  {labels[f]}
                </Badge>
              );
            })}
          </Group>
          <Group gap="sm">
            <Select
              placeholder="Sort by"
              value={sort}
              onChange={(v: string | null) => v && setSort(v as SortOption)}
              leftSection={<IconSortAscending size={16} />}
              data={[
                { label: "Name A–Z", value: "name-asc" },
                { label: "Name Z–A", value: "name-desc" },
                { label: "Most Tracks", value: "tracks-desc" },
                { label: "Fewest Tracks", value: "tracks-asc" },
              ]}
              style={{ width: 160 }}
              allowDeselect={false}
            />
            <TextInput
              placeholder="Search locations..."
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              leftSection={<IconSearch size={16} />}
              style={{ minWidth: 240 }}
            />
          </Group>
        </Group>
      </Paper>

      {/* Grid */}
      {filteredAndSortedVenues.length === 0 ? (
        <Paper withBorder p="xl">
          <Stack align="center" gap="sm">
            <IconMapPin size={48} color="var(--mantine-color-dimmed)" />
            <Text c="dimmed" ta="center">
              {search || filter !== "all"
                ? "No locations match your filters."
                : "No locations yet. Create one to get started."}
            </Text>
          </Stack>
        </Paper>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
          {filteredAndSortedVenues.map((venue) => (
            <VenueCard
              key={venue.id.toString()}
              venue={venue}
              trackCount={trackCounts.get(venue.id) ?? 0}
              onClick={() => onSelectLocation?.(venue.id)}
              onDelete={() => handleDelete(venue)}
            />
          ))}
        </SimpleGrid>
      )}
    </Stack>
  );
}
