export interface Track {
  id: bigint;
  locationId: bigint;
  name: string;
  color: string;
}

export interface TrackVariation {
  id: bigint;
  trackId: bigint;
  name: string;
  description: string;
  startLatitude: number;
  startLongitude: number;
  endLatitude: number;
  endLongitude: number;
}

export interface TrackImage {
  id: bigint;
  trackId: bigint;
  url: string;
  caption: string;
  isCover: boolean;
}
