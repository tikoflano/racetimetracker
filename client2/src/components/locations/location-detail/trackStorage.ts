import type { Track, TrackVariation } from './types';

const TRACKS_STORAGE_KEY = 'rtt_tracks';
const VARIATIONS_STORAGE_KEY = 'rtt_variations';

export const MOCK_TRACKS: Track[] = [
  { id: 1n, locationId: 1n, name: 'Summit Run', color: '#ef4444' },
  { id: 2n, locationId: 1n, name: 'Ridge Line', color: '#22c55e' },
  { id: 3n, locationId: 1n, name: 'Valley Drop', color: '#3b82f6' },
  { id: 4n, locationId: 2n, name: 'Sand Storm', color: '#f59e0b' },
  { id: 5n, locationId: 2n, name: 'Cactus Trail', color: '#8b5cf6' },
  { id: 6n, locationId: 3n, name: 'Pine Loop', color: '#22c55e' },
];

export const MOCK_VARIATIONS: TrackVariation[] = [
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

export function loadTracksFromStorage(): Track[] | null {
  try {
    const raw = localStorage.getItem(TRACKS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      id: string;
      locationId: string;
      name: string;
      color: string;
    }[];
    return parsed.map((t) => ({
      id: BigInt(t.id),
      locationId: BigInt(t.locationId),
      name: t.name,
      color: t.color,
    }));
  } catch {
    return null;
  }
}

export function saveTracksToStorage(tracks: Track[]): void {
  try {
    const serialized = tracks.map((t) => ({
      id: String(t.id),
      locationId: String(t.locationId),
      name: t.name,
      color: t.color,
    }));
    localStorage.setItem(TRACKS_STORAGE_KEY, JSON.stringify(serialized));
  } catch {
    // ignore
  }
}

export function loadVariationsFromStorage(): TrackVariation[] | null {
  try {
    const raw = localStorage.getItem(VARIATIONS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      id: string;
      trackId: string;
      name: string;
      description: string;
      startLatitude: number;
      startLongitude: number;
      endLatitude: number;
      endLongitude: number;
    }[];
    return parsed.map((v) => ({
      id: BigInt(v.id),
      trackId: BigInt(v.trackId),
      name: v.name,
      description: v.description,
      startLatitude: v.startLatitude,
      startLongitude: v.startLongitude,
      endLatitude: v.endLatitude,
      endLongitude: v.endLongitude,
    }));
  } catch {
    return null;
  }
}

export function saveVariationsToStorage(variations: TrackVariation[]): void {
  try {
    const serialized = variations.map((v) => ({
      id: String(v.id),
      trackId: String(v.trackId),
      name: v.name,
      description: v.description,
      startLatitude: v.startLatitude,
      startLongitude: v.startLongitude,
      endLatitude: v.endLatitude,
      endLongitude: v.endLongitude,
    }));
    localStorage.setItem(VARIATIONS_STORAGE_KEY, JSON.stringify(serialized));
  } catch {
    // ignore
  }
}
