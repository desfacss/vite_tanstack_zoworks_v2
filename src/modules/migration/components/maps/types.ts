export interface Customer {
  id: string;
  name: string;
  details?: {
    address?: string;
    email?: string;
    phone?: string;
  };
  geofence: string | null; // WKT format
  source_schema?: string;
  source_table?: string;
}

export interface AgentWithDetails {
  id: string;
  user_id: string;
  lat: number;
  lng: number;
  recorded_at: string;
  user?: {
    id: string;
    name: string;
    details?: {
      designation?: string;
    };
  };
  publicusers?: any; // For raw join data
}

export interface UserTrack {
  user: {
    id: string;
    name: string;
    details: Record<string, any>;
  };
  track: [number, number][];
  trackWithDates?: {
    coordinates: [number, number];
    timestamp: string;
  }[];
}
