const STORAGE_KEY = "rtt_venues";

export interface VenueImage {
  id: bigint;
  url: string;
  caption?: string;
  /** Exactly one image per venue should have isCover === true */
  isCover: boolean;
}

export interface Venue {
  id: bigint;
  name: string;
  description: string;
  address: string;
  /**
   * Backwards-compat convenience for existing views – always mirrors the
   * current cover image url when present.
   */
  imageUrl?: string;
  images?: VenueImage[];
}

export const MOCK_VENUES: Venue[] = [
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

type SerializedVenueImage = Omit<VenueImage, "id"> & { id: string };
type SerializedVenue = Omit<Venue, "id" | "images"> & {
  id: string;
  images?: SerializedVenueImage[];
};

export function loadVenues(): Venue[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return MOCK_VENUES;
    const parsed: SerializedVenue[] = JSON.parse(raw);
    return parsed.map((v, index) => {
      // Migrate any saved images into runtime VenueImage[]
      let images: VenueImage[] =
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
            caption: "",
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
    return MOCK_VENUES;
  }
}

export function saveVenues(venues: Venue[]): void {
  try {
    const serialized: SerializedVenue[] = venues.map((v) => {
      const images = v.images ?? [];
      const cover = images.find((img) => img.isCover) ?? images[0];

      const serializedImages: SerializedVenueImage[] =
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
