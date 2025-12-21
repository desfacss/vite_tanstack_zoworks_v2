import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, FeatureGroup, Polygon } from 'react-leaflet';
import { Button, Card, DatePicker, Spin, message, Descriptions } from 'antd';
import * as wellknown from 'wellknown';
import { supabase } from '@/lib/supabase';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Customer } from '../types/customer';
import type { AgentWithDetails } from '../types/agent';

// Extend dayjs with relativeTime plugin
dayjs.extend(relativeTime);

// Fix Leaflet default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png',
});

interface UserTrack {
  user_id: string;
  name: string;
  track: [number, number][];
  trackWithDates: { coordinates: [number, number]; timestamp: string }[];
}

interface AgentSummary {
  at_office: number;
  unrelated: number;
  clients: { [clientId: string]: { at_client: number; near_client: number; name?: string } };
}

interface AgentActivityReportProps {
  userId: string;
}

const AgentActivityReport: React.FC<AgentActivityReportProps> = ({ editItem }) => {
  const userId = editItem?.id || '';
  const [userName, setUserName] = useState<string>('Unknown Agent');
  const [trackData, setTrackData] = useState<UserTrack | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [summary, setSummary] = useState<AgentSummary | null>(null);
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | null>(dayjs());
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<[number, number]>([12.9716, 77.5946]); // Default to Bangalore
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null); // Ref for the map container DOM element

  // Fetch user name, tracks, customers, and summary
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        await Promise.all([fetchUserName(), fetchTracks(), fetchCustomers(), fetchSummary()]);
      } catch (error) {
        console.error('Error fetching data:', error);
        message.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Real-time subscription for agent locations and summary
    const locationChannel = supabase
      .channel('loc_agent_locations')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'loc_agent_locations', filter: `user_id=eq.${userId}` },
        () => fetchTracks()
      )
      .subscribe();

    const summaryChannel = supabase
      .channel('loc_agent_summary')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'loc_agent_summary', filter: `user_id=eq.${userId}` },
        () => fetchSummary()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(locationChannel);
      supabase.removeChannel(summaryChannel);
    };
  }, [userId]);

  // Initialize map only once
  useEffect(() => {
    if (mapContainerRef.current && !mapRef.current) {
      // Initialize Leaflet map
      mapRef.current = L.map(mapContainerRef.current, {
        center: userLocation,
        zoom: 12,
      });

      // Add TileLayer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(mapRef.current);

      // Cleanup on unmount
      return () => {
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
      };
    }
  }, [userLocation]);

  // Update map bounds when trackData, customers, or selectedDate changes
  useEffect(() => {
    if (!mapRef.current || !trackData) return;

    const filteredTrack = getFilteredTrack();
    const bounds = L.latLngBounds([]);

    // Add filtered tracks to bounds
    filteredTrack.forEach((coord) => bounds.extend(coord));

    // Add customer geofences to bounds
    customers.forEach((customer) => {
      if (customer.geofence) {
        try {
          const geoJSON = wellknown.parse(customer.geofence);
          if (geoJSON?.coordinates?.[0]) {
            geoJSON.coordinates[0].forEach((coord: number[]) => {
              bounds.extend([coord[1], coord[0]]);
            });
          }
        } catch (error) {
          console.error(`Error parsing geofence for customer ${customer.id}:`, error);
        }
      }
    });

    // Fit bounds or set view
    if (bounds.isValid()) {
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
      mapRef.current.invalidateSize();
    } else {
      // Fallback to user location if no valid bounds
      mapRef.current.setView(userLocation, 12);
      mapRef.current.invalidateSize();
    }
  }, [selectedDate, trackData, customers, userLocation]);

  // Fetch user name
  const fetchUserName = async () => {
    try {
      const { data, error } = await supabase
        .schema('identity').from('users')
        .select('name')
        .eq('id', userId)
        .single();
      if (error) throw error;
      setUserName(data?.name || 'Unknown Agent');
    } catch (error) {
      console.error('Error fetching user name:', error);
    }
  };

  // Fetch agent tracks
  const fetchTracks = async () => {
    try {
      const { data, error } = await supabase
        .from('loc_agent_locations')
        .select('id, user_id, recorded_at, lat, lng')
        .eq('user_id', userId)
        .order('recorded_at', { ascending: true });
      if (error) throw error;

      const trackData: UserTrack = {
        user_id: userId,
        name: userName,
        track: data?.map((loc) => [loc.lat, loc.lng]) || [],
        trackWithDates: data?.map((loc) => ({
          coordinates: [loc.lat, loc.lng],
          timestamp: loc.recorded_at,
        })) || [],
      };
      setTrackData(trackData);
    } catch (error) {
      console.error('Error fetching tracks:', error);
      message.error('Failed to load tracks');
    }
  };

  // Fetch customers
  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase.rpc('maps_get_clients_with_wkt');
      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      message.error('Failed to load customers');
    }
  };

  // Fetch summary
  const fetchSummary = async () => {
    if (!selectedDate) return;

    try {
      const { data, error } = await supabase
        .from('loc_agent_summary')
        .select('details')
        .eq('user_id', userId)
        .eq('date', selectedDate.format('YYYY-MM-DD'))
        .single();

      if (error && error.code !== 'PGRST116') throw error; // Ignore "no rows" error
      if (!data) {
        setSummary(null);
        return;
      }

      // Fetch client names for the clients in details
      const clientIds = Object.keys(data.details?.clients || {});
      let clientsWithNames: { [clientId: string]: { at_client: number; near_client: number; name?: string } } = {};

      if (clientIds.length > 0) {
        const { data: clientsData, error: clientsError } = await supabase
          .from('cli_clients')
          .select('id, name')
          .in('id', clientIds);

        if (clientsError) throw clientsError;

        // Map client names to the summary details
        clientsWithNames = { ...data.details.clients };
        clientsData.forEach((client: { id: string; name: string }) => {
          if (clientsWithNames[client.id]) {
            clientsWithNames[client.id].name = client.name;
          }
        });
      }

      setSummary({
        at_office: data.details?.at_office || 0,
        unrelated: data.details?.unrelated || 0,
        clients: clientsWithNames,
      });
    } catch (error) {
      console.error('Error fetching summary:', error);
      message.error('Failed to load summary');
      setSummary(null);
    }
  };

  // Refetch summary when selectedDate changes
  useEffect(() => {
    fetchSummary();
  }, [selectedDate]);

  // Filter tracks by selected date
  const getFilteredTrack = () => {
    if (!trackData?.trackWithDates) return [];

    if (!selectedDate) return trackData.track;

    const startOfDay = selectedDate.startOf('day').add(1, 'second').toISOString();
    const endOfDay = selectedDate.endOf('day').toISOString();

    return trackData.trackWithDates
      .filter((point) => {
        const timestamp = point.timestamp;
        return timestamp >= startOfDay && timestamp <= endOfDay;
      })
      .map((point) => point.coordinates);
  };

  // Handle date navigation
  const handlePrevDate = () => {
    if (selectedDate) {
      setSelectedDate(selectedDate.subtract(1, 'day'));
    }
  };

  const handleNextDate = () => {
    if (selectedDate) {
      const nextDate = selectedDate.add(1, 'day');
      if (nextDate.isBefore(dayjs()) || nextDate.isSame(dayjs(), 'day')) {
        setSelectedDate(nextDate);
      }
    }
  };

  // Render customer geofences
  const renderPolygons = () => {
    if (!mapRef.current) return;

    const layerGroup = L.layerGroup().addTo(mapRef.current);

    customers.forEach((customer) => {
      if (!customer.geofence) return;

      try {
        const geoJSON = wellknown.parse(customer.geofence);
        if (!geoJSON?.coordinates?.[0]) return;

        const positions = geoJSON.coordinates[0].map((coord: number[]) => [
          coord[1],
          coord[0],
        ]);

        const polygon = L.polygon(positions, {
          color: '#808080',
          weight: 2,
          fillOpacity: 0.2,
          fillColor: '#808080',
        }).addTo(layerGroup);

        polygon.bindPopup(`
          <div>
            <strong>${customer.name}</strong><br />
            ${customer.details?.address ? customer.details.address : ''}<br />
            ${customer.details?.email ? customer.details.email : ''}<br />
            ${customer.details?.phone ? customer.details.phone : ''}
          </div>
        `);
      } catch (error) {
        console.error(`Error parsing polygon for customer ${customer.id}:`, error);
      }
    });

    return () => {
      layerGroup.clearLayers();
    };
  };

  // Render tracks and markers
  const renderTracks = () => {
    if (!mapRef.current || !trackData) return;

    const layerGroup = L.layerGroup().addTo(mapRef.current);
    const filteredTrack = getFilteredTrack();

    if (filteredTrack?.length > 0) {
      // Add polyline
      L.polyline(filteredTrack, {
        color: '#1890ff',
        weight: 4,
      }).addTo(layerGroup);

      // Add marker for the latest position
      const latestPosition = filteredTrack[filteredTrack?.length - 1];
      L.marker(latestPosition)
        .addTo(layerGroup)
        .bindPopup(`
          <div>
            <strong>${userName}</strong><br />
            Last seen: ${
              filteredTrack?.length > 0
                ? dayjs(trackData?.trackWithDates[trackData.trackWithDates.length - 1]?.timestamp).fromNow()
                : 'N/A'
            }
          </div>
        `);
    }

    return () => {
      layerGroup.clearLayers();
    };
  };

  // Update tracks and polygons when data changes
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing layers
    mapRef.current.eachLayer((layer) => {
      if (layer instanceof L.Polyline || layer instanceof L.Polygon || layer instanceof L.Marker) {
        mapRef.current?.removeLayer(layer);
      }
    });

    // Render new polygons and tracks
    renderPolygons();
    renderTracks();
  }, [trackData, customers, selectedDate]);

  // Get user's location
  useEffect(() => {
    const fetchLocation = async () => {
      try {
        if (navigator.geolocation) {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 5000,
              maximumAge: 0,
              enableHighAccuracy: false,
            });
          });
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        } else {
          const response = await fetch('https://ipapi.co/json/');
          if (!response.ok) throw new Error('IP location service failed');
          const data = await response.json();
          setUserLocation([data.latitude, data.longitude]);
        }
      } catch (error) {
        console.warn('Location services unavailable. Using default location.');
      }
    };

    fetchLocation();
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }
const filteredTrack = getFilteredTrack();
  return (
    <div className="relative" style={{ height: '100vh', width: '100%' }}>
      {/* Date Navigation and Summary */}
      <Card
        className="absolute top-4 left-4 z-[1000] bg-white shadow-lg"
        style={{ minWidth: '300px' }}
      >
        <div className="flex flex-col gap-2">
          <div className="font-semibold">Agent: {userName}</div>
          <div className="flex gap-2 items-center">
            <Button onClick={handlePrevDate} disabled={!selectedDate}>Previous</Button>
            <DatePicker
              value={selectedDate}
              onChange={setSelectedDate}
              disabledDate={(current) => current && current > dayjs().endOf('day')}
              allowClear={false}
            />
            <Button onClick={handleNextDate} disabled={selectedDate?.isSame(dayjs(), 'day')}>
              Next
            </Button>
          </div>
          <div className="text-sm">
            Track Points: {getFilteredTrack().length}
          </div>
          {summary ? (
            <Descriptions title="Activity Summary" bordered size="small" column={1}>
              <Descriptions.Item label="At Office">{summary.at_office} minutes</Descriptions.Item>
              <Descriptions.Item label="Unrelated">{summary.unrelated} minutes</Descriptions.Item>
              {Object.entries(summary.clients).map(([clientId, clientData]) => (
                <Descriptions.Item key={clientId} label={`Client: ${clientData.name || clientId}`}>
                  At Client: {clientData.at_client} minutes<br />
                  Near Client: {clientData.near_client} minutes
                </Descriptions.Item>
              ))}
            </Descriptions>
          ) : (
            <div className="text-sm">No summary data available for {selectedDate?.format('YYYY-MM-DD') || 'selected date'}.</div>
          )}
        </div>
      </Card>

      <MapContainer
        center={userLocation}
        zoom={12}
        ref={mapRef}
        style={{ height: '100%', width: '100%' }}
        whenCreated={(map) => {
          mapRef.current = map;
          map.invalidateSize();
        }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <FeatureGroup>
          {renderPolygons()}
          {filteredTrack?.length > 0 && (
            <>
              <Polyline
                positions={filteredTrack}
                pathOptions={{ color: '#1890ff', weight: 4 }}
              />
              <Marker position={filteredTrack[filteredTrack?.length - 1]}>
                <Popup>
                  <div>
                    <strong>{userName}</strong>
                    <br />
                    Last seen: {filteredTrack?.length > 0
                      ? dayjs(trackData?.trackWithDates[trackData.trackWithDates.length - 1]?.timestamp).fromNow()
                      : 'N/A'}
                  </div>
                </Popup>
              </Marker>
            </>
          )}
        </FeatureGroup>
      </MapContainer>
      <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />
    </div>
  );
};

export default AgentActivityReport;