export interface Customer {
  id: string;
  name: string;
  geofence: string | null;
  details?: {
    address?: string;
    email?: string;
    phone?: string;
  };
}

export interface AgentWithDetails {
  id: string;
  user_id: string;
  lat: number;
  lng: number;
  recorded_at: string;
  user?: {
    name: string;
    details?: {
      designation?: string;
    };
  };
}

export type LatLng = [number, number];

export interface UserTrack {
  user: {
    id: string;
    name: string;
    details: Record<string, any>;
  };
  track: LatLng[];
  trackWithDates?: {
    coordinates: LatLng;
    timestamp: string;
  }[];
}
