import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ActionIcon,
  Anchor,
  Badge,
  Box,
  Button,
  Card,
  Group,
  Indicator,
  Loader,
  Menu,
  Modal,
  Paper,
  Popover,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  IconDotsVertical,
  IconExternalLink,
  IconFilter,
  IconMapPin,
  IconPlus,
  IconRoute,
  IconSearch,
  IconArrowUp,
  IconArrowDown,
  IconX,
} from "@tabler/icons-react";
import { ImageUploader, resizeImage } from "./ImageUploader";
import { type Venue, loadVenues, saveVenues } from "./venueStorage";

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
          url="https://tiles.stadiamaps.com/tiles/outdoors/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
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

// Types
interface Track {
  id: bigint;
  venueId: bigint;
  name: string;
  color: string;
}


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

type SortField = "name" | "tracks";
type SortDir = "asc" | "desc";
type FilterOption = "all" | "has-tracks" | "no-tracks";

function mapsUrl(address: string) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}

interface VenueCardProps {
  venue: Venue;
  trackCount: number;
  onClick: () => void;
}

function VenueCard({ venue, trackCount, onClick }: VenueCardProps) {
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
        <Text fw={600} lineClamp={1}>
          {venue.name}
        </Text>

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
              {venue.address}
              <IconExternalLink size={10} />
            </Anchor>
          ) : (
            <Text size="xs" c="dimmed">No address</Text>
          )}
        </Group>
      </Stack>
    </Card>
  );
}

export function LocationsView() {
  const navigate = useNavigate();
  const [venues, setVenues] = useState<Venue[]>(loadVenues);
  useEffect(() => { saveVenues(venues); }, [venues]);
  const [tracks] = useState<Track[]>(MOCK_TRACKS);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [filter, setFilter] = useState<FilterOption>("all");
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [searchOpen, setSearchOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const activeFilterCount = filter !== "all" ? 1 : 0;

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

    const dir = sortDir === "asc" ? 1 : -1;
    result.sort((a, b) => {
      switch (sortField) {
        case "name":
          return dir * a.name.localeCompare(b.name);
        case "tracks":
          return dir * ((trackCounts.get(a.id) ?? 0) - (trackCounts.get(b.id) ?? 0));
        default:
          return 0;
      }
    });

    return result;
  }, [venues, search, sortField, sortDir, filter, trackCounts]);

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

  return (
    <Stack gap="lg">
      {/* Header Banner */}
      <Box
        p={isMobile ? "md" : "xl"}
        style={{
          background: "linear-gradient(135deg, #1C2348 0%, #2A3364 60%, #313B72 100%)",
          borderRadius: "var(--mantine-radius-md)",
          border: "1px solid #1e2028",
        }}
      >
        <Group justify="space-between" align="center" wrap="nowrap" gap="sm">
          <Group gap="sm" align="center" style={{ minWidth: 0 }}>
            {!isMobile && (
              <ThemeIcon size={52} radius="md" color="blue" variant="light">
                <IconMapPin size={28} />
              </ThemeIcon>
            )}
            <div style={{ minWidth: 0 }}>
              {!isMobile && (
                <Text size="xs" c="blue.3" tt="uppercase" fw={600} mb={2}>
                  Manage
                </Text>
              )}
              <Title order={isMobile ? 4 : 2} c="white" fw={700} style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                Locations
              </Title>
              <Text size={isMobile ? "xs" : "sm"} c="blue.2" mt={2}>
                {venues.length} venue{venues.length !== 1 ? "s" : ""}
                {!isMobile && " · manage venues and tracks for your events"}
              </Text>
            </div>
          </Group>
          <Group gap="sm" style={{ flexShrink: 0 }}>
            {!isMobile && (
              <Button
                leftSection={<IconPlus size={16} />}
                variant="white"
                color="dark"
                onClick={() => setShowForm(true)}
              >
                New Location
              </Button>
            )}
            <Menu shadow="md" width={200} position="bottom-end">
              <Menu.Target>
                <ActionIcon variant="subtle" size="lg" color="gray">
                  <IconDotsVertical size={18} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                {isMobile && (
                  <Menu.Item
                    leftSection={<IconPlus size={14} />}
                    onClick={() => setShowForm(true)}
                  >
                    New Location
                  </Menu.Item>
                )}
              </Menu.Dropdown>
            </Menu>
          </Group>
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
        <Group justify="space-between" align="center" gap="sm">
          <Group gap="sm" align="center">
            <Popover
              opened={filterOpen}
              onChange={setFilterOpen}
              position="bottom-start"
              shadow="md"
              withinPortal
            >
              <Popover.Target>
                <Indicator
                  disabled={activeFilterCount === 0}
                  label={activeFilterCount}
                  size={16}
                  color="blue"
                >
                  <ActionIcon
                    variant={activeFilterCount > 0 ? "filled" : "subtle"}
                    color={activeFilterCount > 0 ? "blue" : "gray"}
                    size="md"
                    onClick={() => setFilterOpen((o) => !o)}
                    aria-label="Filter locations"
                  >
                    <IconFilter size={16} />
                  </ActionIcon>
                </Indicator>
              </Popover.Target>
              <Popover.Dropdown p="sm">
                <Stack gap="xs">
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
                        style={{ cursor: "pointer", minWidth: "max-content" }}
                        onClick={() => setFilter(f)}
                      >
                        {labels[f]}
                      </Badge>
                    );
                  })}
                  <Group gap="xs" mt={4}>
                    <Select
                      size="xs"
                      data={[
                        { value: "name", label: "Name" },
                        { value: "tracks", label: "Tracks" },
                      ]}
                      value={sortField}
                      onChange={(v) => v && setSortField(v as SortField)}
                      allowDeselect={false}
                      style={{ flex: 1 }}
                    />
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      size="sm"
                      onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                    >
                      {sortDir === "asc" ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />}
                    </ActionIcon>
                  </Group>
                </Stack>
              </Popover.Dropdown>
            </Popover>
            <Text size="xs" c="dimmed">
              {filteredAndSortedVenues.length === venues.length
                ? `${venues.length} venue${venues.length !== 1 ? "s" : ""}`
                : `${filteredAndSortedVenues.length} of ${venues.length}`}
            </Text>
          </Group>
          {searchOpen ? (
            <TextInput
              placeholder="Search locations..."
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              size="sm"
              leftSection={<IconSearch size={14} />}
              rightSection={
                <ActionIcon variant="subtle" size="sm" color="gray" onClick={() => { setSearchOpen(false); setSearch(""); }}>
                  <IconX size={12} />
                </ActionIcon>
              }
              autoFocus
              style={{ flex: 1, minWidth: 0 }}
            />
          ) : (
            <ActionIcon
              variant={search ? "filled" : "subtle"}
              color={search ? "blue" : "gray"}
              size="md"
              onClick={() => setSearchOpen(true)}
              aria-label="Search locations"
            >
              <IconSearch size={16} />
            </ActionIcon>
          )}
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
              onClick={() => navigate(`/locations/${venue.id}`)}
            />
          ))}
        </SimpleGrid>
      )}
    </Stack>
  );
}
