import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "@mantine/form";
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
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  IconDotsVertical,
  IconExternalLink,
  IconMapPin,
  IconPlus,
  IconRoute,
  IconSearch,
  IconArrowUp,
  IconArrowDown,
} from "@tabler/icons-react";
import {
  ViewHeader,
  FilterToolbar,
  ModalHeader,
  modalHeaderStyles,
  ModalFooter,
  EmptyState,
  FormError,
} from "@/components/common";
import { ImageUploader, resizeImage } from "../ImageUploader";
import { type Location, loadLocations, saveLocations } from "../locationStorage";

const pickerIcon = L.divIcon({
  className: "",
  html: `<div style="width:18px;height:18px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.5)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

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

interface Track {
  id: bigint;
  locationId: bigint;
  name: string;
  color: string;
}

const MOCK_TRACKS: Track[] = [
  { id: 1n, locationId: 1n, name: "Summit Run", color: "#ef4444" },
  { id: 2n, locationId: 1n, name: "Ridge Line", color: "#22c55e" },
  { id: 3n, locationId: 1n, name: "Valley Drop", color: "#3b82f6" },
  { id: 4n, locationId: 2n, name: "Sand Storm", color: "#f59e0b" },
  { id: 5n, locationId: 2n, name: "Cactus Trail", color: "#8b5cf6" },
  { id: 6n, locationId: 3n, name: "Pine Loop", color: "#22c55e" },
  { id: 7n, locationId: 3n, name: "Oak Descent", color: "#ef4444" },
  { id: 8n, locationId: 3n, name: "Fern Gully", color: "#06b6d4" },
  { id: 9n, locationId: 3n, name: "Maple Ridge", color: "#ec4899" },
  { id: 10n, locationId: 4n, name: "Cliff Hanger", color: "#3b82f6" },
];

type SortField = "name" | "tracks";
type SortDir = "asc" | "desc";
type FilterOption = "all" | "has-tracks" | "no-tracks";

function mapsUrl(address: string) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}

interface LocationCardProps {
  location: Location;
  trackCount: number;
  onClick: () => void;
}

function LocationCard({ location, trackCount, onClick }: LocationCardProps) {
  return (
    <Card
      shadow="sm"
      padding={0}
      radius="md"
      withBorder
      style={{ cursor: "pointer" }}
      onClick={onClick}
    >
      <Card.Section>
        {location.imageUrl ? (
          <Box
            component="img"
            src={location.imageUrl}
            alt={location.name}
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

      <Stack p="md" gap="xs">
        <Text fw={600} lineClamp={1}>
          {location.name}
        </Text>

        <Text size="sm" c="dimmed" lineClamp={2} style={{ minHeight: "2.5em" }}>
          {location.description || "No description provided."}
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

          {location.address ? (
            <Anchor
              href={mapsUrl(location.address)}
              target="_blank"
              rel="noopener noreferrer"
              size="xs"
              onClick={(e) => e.stopPropagation()}
              style={{ display: "flex", alignItems: "center", gap: 4 }}
            >
              <IconMapPin size={12} />
              {location.address}
              <IconExternalLink size={10} />
            </Anchor>
          ) : (
            <Text size="xs" c="dimmed">
              No address
            </Text>
          )}
        </Group>
      </Stack>
    </Card>
  );
}

export function LocationsView() {
  const navigate = useNavigate();
  const [locations, setLocations] = useState<Location[]>(loadLocations);
  useEffect(() => {
    saveLocations(locations);
  }, [locations]);
  const [tracks] = useState<Track[]>(MOCK_TRACKS);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [filter, setFilter] = useState<FilterOption>("all");
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [searchOpen, setSearchOpen] = useState(false);

  const activeFilterCount = filter !== "all" ? 1 : 0;

  const [showForm, setShowForm] = useState(false);
  const locationForm = useForm({
    initialValues: { name: "", description: "", address: "" },
    validate: {
      name: (v) => (!v?.trim() ? "Name is required" : null),
      address: (v) => (!v?.trim() ? "Address is required" : null),
    },
  });
  const [images, setImages] = useState<string[]>([]);
  const [coverIndex, setCoverIndex] = useState<number | null>(null);
  const [markerPos, setMarkerPos] = useState<[number, number] | null>(null);
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
  const [geocoding, setGeocoding] = useState(false);

  const handleForwardGeocode = useCallback(async () => {
    const address = locationForm.values.address.trim();
    if (!address) return;
    setGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          address,
        )}&limit=1`,
        { headers: { "User-Agent": "RaceTimeTracker/1.0" } },
      );
      const data = await res.json();
      if (data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        setMarkerPos([lat, lng]);
        setFlyTarget([lat, lng]);
      }
    } catch {
    } finally {
      setGeocoding(false);
    }
  }, [locationForm.values.address]);

  const trackCounts = useMemo(() => {
    const m = new Map<bigint, number>();
    for (const t of tracks) {
      m.set(t.locationId, (m.get(t.locationId) ?? 0) + 1);
    }
    return m;
  }, [tracks]);

  const filteredAndSortedLocations = useMemo(() => {
    let result = [...locations];

    if (search) {
      const s = search.toLowerCase();
      result = result.filter(
        (v) =>
          v.name.toLowerCase().includes(s) ||
          v.description.toLowerCase().includes(s) ||
          v.address.toLowerCase().includes(s),
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
  }, [locations, search, sortField, sortDir, filter, trackCounts]);

  const resetForm = () => {
    locationForm.reset();
    setImages([]);
    setCoverIndex(null);
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
        { headers: { "User-Agent": "RaceTimeTracker/1.0" } },
      );
      const data = await res.json();
      locationForm.setFieldValue("address", formatAddress(data));
    } catch {
    } finally {
      setGeocoding(false);
    }
  }, []);

  const handleCreate = () => {
    if (!locationForm.validate()) return;
    const newLocation: Location = {
      id: BigInt(Date.now()),
      name: locationForm.values.name.trim(),
      description: locationForm.values.description.trim(),
      address: locationForm.values.address.trim(),
      imageUrl: coverIndex !== null ? images[coverIndex] : undefined,
    };
    setLocations((prev) => [...prev, newLocation]);
    resetForm();
  };

  return (
    <Stack gap="lg">
      <ViewHeader
        icon={<IconMapPin size={28} />}
        iconColor="blue"
        eyebrow="Manage"
        title="Locations"
        subtitle={`${locations.length} location${locations.length !== 1 ? "s" : ""}${!isMobile ? " · manage locations and tracks for your events" : ""}`}
        isMobile={isMobile}
        actions={
          <>
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
          </>
        }
      />

      <Modal
        opened={showForm}
        onClose={resetForm}
        title={
          <ModalHeader
            icon={<IconMapPin size={20} />}
            iconColor="blue"
            label="Add location"
            title="New Location"
          />
        }
        centered
        overlayProps={{ blur: 3 }}
        radius="md"
        size="lg"
        styles={modalHeaderStyles()}
      >
        <Stack gap="md" pt="xs">
          <FormError error={typeof locationForm.errors.name === "string" ? locationForm.errors.name : typeof locationForm.errors.address === "string" ? locationForm.errors.address : undefined} />
          <TextInput
            label="Name"
            placeholder="e.g. Mountain Ridge Park"
            {...locationForm.getInputProps("name")}
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
            {...locationForm.getInputProps("address")}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleForwardGeocode();
            }}
            rightSection={
              geocoding ? (
                <Loader size={14} />
              ) : (
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  color="gray"
                  disabled={!locationForm.values.address.trim()}
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
            placeholder="Brief description of the location (optional)"
            {...locationForm.getInputProps("description")}
            minRows={4}
            resize="vertical"
          />
          <ModalFooter
            onCancel={resetForm}
            submitLabel="Create Location"
            onSubmit={handleCreate}
          />
        </Stack>
      </Modal>

      <FilterToolbar
        filterContent={
          <Stack gap="xs">
            {(["all", "has-tracks", "no-tracks"] as FilterOption[]).map((f) => {
              const labels: Record<FilterOption, string> = {
                all: `All (${locations.length})`,
                "has-tracks": "Has Tracks",
                "no-tracks": "No Tracks",
              };
              return (
                <Badge
                  key={f}
                  size="lg"
                  variant={filter === f ? "filled" : "light"}
                  color="blue"
                  leftSection={<IconRoute size={12} />}
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
                {sortDir === "asc" ? (
                  <IconArrowUp size={14} />
                ) : (
                  <IconArrowDown size={14} />
                )}
              </ActionIcon>
            </Group>
          </Stack>
        }
        activeFilterCount={activeFilterCount}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search locations..."
        searchOpen={searchOpen}
        onSearchOpenChange={setSearchOpen}
        resultLabel={
          filteredAndSortedLocations.length === locations.length
            ? `${locations.length} location${locations.length !== 1 ? "s" : ""}`
            : `${filteredAndSortedLocations.length} of ${locations.length}`
        }
      />

      {filteredAndSortedLocations.length === 0 ? (
        <EmptyState
          icon={<IconMapPin size={48} color="var(--mantine-color-dimmed)" />}
          message={
            search || filter !== "all"
              ? "No locations match your filters."
              : "No locations yet. Create one to get started."
          }
        />
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
          {filteredAndSortedLocations.map((loc) => (
            <LocationCard
              key={loc.id.toString()}
              location={loc}
              trackCount={trackCounts.get(loc.id) ?? 0}
              onClick={() => navigate(`/locations/${loc.id}`)}
            />
          ))}
        </SimpleGrid>
      )}
    </Stack>
  );
}


