const STORAGE_KEY = 'rtt_locations';

export interface LocationImage {
  id: bigint;
  url: string;
  caption?: string;
  /** Exactly one image per location should have isCover === true */
  isCover: boolean;
}

export interface Location {
  id: bigint;
  name: string;
  description: string;
  address: string;
  /**
   * Backwards-compat convenience for existing views – always mirrors the
   * current cover image url when present.
   */
  imageUrl?: string;
  images?: LocationImage[];
}

export const MOCK_LOCATIONS: Location[] = [
  {
    id: 1n,
    name: 'Mountain Ridge Park',
    description: 'Premier enduro location with varied terrain',
    address: '1234 Mountain Rd, Denver, CO 80210',
  },
  {
    id: 2n,
    name: 'Desert Dunes Complex',
    description: 'Sandy trails and technical sections',
    address: '5678 Desert Ave, Phoenix, AZ 85001',
  },
  {
    id: 3n,
    name: 'Forest Trail Center',
    description: 'Wooded single track paradise',
    address: '9012 Forest Lane, Portland, OR 97201',
  },
  {
    id: 4n,
    name: 'Coastal Cliffs',
    description: 'Ocean view trails with elevation changes',
    address: '3456 Coastal Hwy, San Diego, CA 92101',
  },
  {
    id: 5n,
    name: 'Valley Motorsports Park',
    description: '',
    address: '',
  },
];

type SerializedLocationImage = Omit<LocationImage, 'id'> & { id: string };
type SerializedLocation = Omit<Location, 'id' | 'images'> & {
  id: string;
  images?: SerializedLocationImage[];
};

export function loadLocations(): Location[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return MOCK_LOCATIONS;
    const parsed: SerializedLocation[] = JSON.parse(raw);
    return parsed.map((v, index) => {
      // Migrate any saved images into runtime LocationImage[]
      let images: LocationImage[] =
        v.images?.map((img) => ({
          ...img,
          id: BigInt(img.id),
        })) ?? [];

      // Migration: if we previously only stored imageUrl, convert it into
      // a single cover image entry when no images array exists yet.
      if (images.length === 0 && v.imageUrl) {
        images = [
          {
            id: BigInt(Date.now()) + BigInt(index),
            url: v.imageUrl,
            isCover: true,
            caption: '',
          },
        ];
      }

      const cover = images.find((img) => img.isCover) ?? images[0];

      return {
        id: BigInt(v.id),
        name: v.name,
        description: v.description,
        address: v.address,
        imageUrl: cover?.url ?? v.imageUrl,
        images: images.length > 0 ? images : undefined,
      };
    });
  } catch {
    return MOCK_LOCATIONS;
  }
}

export function saveLocations(locations: Location[]): void {
  try {
    const serialized: SerializedLocation[] = locations.map((v) => {
      const images = v.images ?? [];
      const cover = images.find((img) => img.isCover) ?? images[0];

      const serializedImages: SerializedLocationImage[] =
        images.length > 0
          ? images.map((img) => ({
              id: String(img.id),
              url: img.url,
              caption: img.caption,
              isCover: img.isCover,
            }))
          : [];

      return {
        id: String(v.id),
        name: v.name,
        description: v.description,
        address: v.address,
        // Maintain imageUrl for compatibility, mirror current cover when present.
        imageUrl: cover?.url,
        images: serializedImages.length > 0 ? serializedImages : undefined,
      };
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
  } catch {
    // localStorage unavailable — ignore
  }
}
