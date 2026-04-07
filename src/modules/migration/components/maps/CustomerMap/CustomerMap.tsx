import React, { useState, useEffect, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  FeatureGroup,
  Polygon,
  Marker,
  Popup,
} from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import { Modal, message, Button, Card, DatePicker, Typography, Space } from 'antd';
import * as wellknown from 'wellknown';
import { supabase } from '@/core/lib/supabase';
import type { Customer, AgentWithDetails } from '../types';
import { parseWkb } from '../utils';
import { Trash2, Calendar, Navigation } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import TrackMap from '../trackMap/TrackMap';

dayjs.extend(relativeTime);
const { Text } = Typography;

// Fix Leaflet default marker icons for React compatibility
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png',
});

interface CustomerMapProps {
  selectedCustomer?: Customer;
  selectedAgent?: AgentWithDetails;
  customers: Customer[];
  agents: AgentWithDetails[];
  showAgents: boolean;
  onGeofenceUpdate: (customerId: string, geofence: string | null) => void;
  setShowTrackMap: (show: boolean) => void;
  showTrackMap: boolean;
  userData: any;
}

const CustomerMap: React.FC<CustomerMapProps> = ({
  selectedCustomer,
  selectedAgent,
  customers,
  agents,
  showAgents,
  onGeofenceUpdate,
  setShowTrackMap,
  showTrackMap,
  userData,
}) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [drawnGeofence, setDrawnGeofence] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<[number, number]>([12.9716, 77.5946]); // Bangalore
  const [hoveredCustomer, setHoveredCustomer] = useState<Customer | null>(null);
  const [overlayPosition, setOverlayPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedDate, setSelectedDate] = useState<any>(null);
  const [polygonKey, setPolygonKey] = useState(0);

  const mapRef = useRef<L.Map | null>(null);
  const featureGroupRef = useRef<L.FeatureGroup | null>(null);

  // Initialize map and handle auto-location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
        () => console.log('Using default Bangalore location'),
        { timeout: 5000 }
      );
    }
  }, []);

  // Fit bounds to show all entities
  useEffect(() => {
    if (mapRef.current && (customers.length > 0 || agents.length > 0)) {
      const bounds = L.latLngBounds([]);
      let hasValid = false;

      customers.forEach(c => {
        if (c.geofence) {
          try {
            const geo = typeof c.geofence === 'string' ? parseWkb(c.geofence) : c.geofence;
            if (geo?.type === 'Polygon') {
              geo.coordinates[0].forEach((coord: any) => bounds.extend([coord[1], coord[0]]));
              hasValid = true;
            }
          } catch (e) {}
        }
      });

      agents.forEach(a => {
        if (a.lat && a.lng) {
          bounds.extend([a.lat, a.lng]);
          hasValid = true;
        }
      });

      if (hasValid) {
        mapRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [customers, agents]);

  const handleCreate = (e: any) => {
    const layer = e.layer;
    const geoJSON = layer.toGeoJSON();
    setDrawnGeofence(geoJSON);
    setShowConfirmModal(true);
  };

  const handleSaveGeofence = async () => {
    if (!selectedCustomer || !drawnGeofence) return;
    try {
      const wkt = wellknown.stringify(drawnGeofence);
      // Update crm.accounts directly instead of calling broken RPC
      const { error } = await supabase
        .schema('crm' as any)
        .from('accounts')
        .update({ 
          geofence: wkt,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedCustomer.id);
      
      if (error) throw error;
      onGeofenceUpdate(selectedCustomer.id, wkt);
      message.success('Geofence saved successfully');
      setPolygonKey(prev => prev + 1);
    } catch (err: any) {
      message.error(`Failed to save: ${err.message}`);
    }
    setShowConfirmModal(false);
    setDrawnGeofence(null);
    if (featureGroupRef.current) featureGroupRef.current.clearLayers();
  };

  const handleDeleteGeofence = async (id: string) => {
    try {
      // Update crm.accounts directly instead of calling broken RPC
      const { error } = await supabase
        .schema('crm' as any)
        .from('accounts')
        .update({ 
          geofence: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (error) throw error;
      onGeofenceUpdate(id, null);
      message.success('Geofence deleted');
      setHoveredCustomer(null);
    } catch (err: any) {
      message.error('Failed to delete');
    }
  };

  const getFilteredTrack = () => {
    const userId = selectedAgent?.user_id;
    if (!userId || !userData[userId]) return [];
    
    const userTrack = userData[userId];
    if (!selectedDate) return userTrack.track || [];

    const start = selectedDate.startOf('day').valueOf();
    const end = dayjs().valueOf();
    
    return userTrack.trackWithDates
      ?.filter((p: any) => {
        const ts = dayjs(p.timestamp).valueOf();
        return ts >= start && ts <= end;
      })
      .map((p: any) => p.coordinates) || [];
  };

  return (
    <div style={{ height: 'calc(100vh - 120px)', width: '100%', position: 'relative' }}>
      <MapContainer
        center={userLocation}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        ref={(map) => { if (map) mapRef.current = map; }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        
        <FeatureGroup ref={featureGroupRef}>
          <EditControl
            position="topright"
            onCreated={handleCreate}
            draw={{
              rectangle: false, circle: false, circlemarker: false, marker: false, polyline: false,
              polygon: !!selectedCustomer
            }}
          />
          
          {customers.map(customer => {
            if (!customer.geofence) return null;
            try {
              const geo = typeof customer.geofence === 'string' ? parseWkb(customer.geofence) : customer.geofence;
              if (geo?.type !== 'Polygon') return null;
              const pos = geo.coordinates[0].map((c: any) => [c[1], c[0]]);
              const isSelected = selectedCustomer?.id === customer.id;
              
              return (
                <Polygon
                  key={`${customer.id}-${polygonKey}`}
                  positions={pos as any}
                  pathOptions={{
                    color: isSelected ? '#1890ff' : '#8c8c8c',
                    fillColor: isSelected ? '#1890ff' : '#8c8c8c',
                    fillOpacity: isSelected ? 0.4 : 0.2,
                    weight: isSelected ? 3 : 2
                  }}
                  eventHandlers={{
                    click: (e) => {
                      const p = mapRef.current?.latLngToContainerPoint(e.latlng);
                      if (p) {
                        setOverlayPosition({ x: p.x, y: p.y });
                        setHoveredCustomer(customer);
                      }
                    }
                  }}
                />
              );
            } catch (e) { return null; }
          })}

          {agents.map(agent => (
            <Marker key={agent.id} position={[agent.lat, agent.lng]} opacity={showAgents ? 1 : 0.4}>
              <Popup>
                <strong>{agent.user?.name || 'Field Agent'}</strong><br/>
                {agent.user?.details?.designation || 'Field Services'}<br/>
                Last seen: {dayjs(agent.recorded_at).fromNow()}
              </Popup>
            </Marker>
          ))}
        </FeatureGroup>
      </MapContainer>

      {/* Confirmation Modal for Drawing */}
      <Modal
        title="Save Geofence"
        open={showConfirmModal}
        onOk={handleSaveGeofence}
        onCancel={() => { setShowConfirmModal(false); setDrawnGeofence(null); if (featureGroupRef.current) featureGroupRef.current.clearLayers(); }}
      >
        <p>Do you want to save this geofence for <strong>{selectedCustomer?.name}</strong>?</p>
      </Modal>

      {/* Track Map History Modal */}
      <Modal
        title={
          <Space><Navigation size={20} className="text-blue-500" /> <Text strong>Track History: {selectedAgent?.user?.name}</Text></Space>
        }
        open={showTrackMap}
        width={900}
        footer={null}
        onCancel={() => setShowTrackMap(false)}
        destroyOnClose
      >
        <Space direction="vertical" className="w-full" size="large">
          <Card size="small" className="bg-gray-50 flex justify-between items-center">
            <Space>
              <Calendar size={16} />
              <DatePicker 
                onChange={setSelectedDate} 
                placeholder="Filter by date" 
                className="w-[200px]"
                disabledDate={(cur) => cur && cur > dayjs().endOf('day')}
              />
            </Space>
          </Card>
          <TrackMap 
            track={getFilteredTrack()} 
            currentLocation={selectedAgent ? [selectedAgent.lat, selectedAgent.lng] : [0, 0]} 
            height="500px"
          />
        </Space>
      </Modal>

      {/* Hover Card for Polygons */}
      {hoveredCustomer && overlayPosition && (
        <Card
          size="small"
          className="absolute z-[1000] shadow-xl border-blue-200"
          style={{ 
            left: overlayPosition.x, 
            top: overlayPosition.y, 
            transform: 'translate(-50%, -120%)',
            minWidth: '220px'
          }}
        >
          <div className="flex justify-between items-start mb-2">
            <span className="font-bold text-blue-700">{hoveredCustomer.name}</span>
            <Button 
              type="text" 
              danger 
              size="small" 
              icon={<Trash2 size={14} />} 
              onClick={() => handleDeleteGeofence(hoveredCustomer.id)}
            />
          </div>
          <div className="text-xs text-gray-600">
            {hoveredCustomer.details?.address && <div className="mb-1">{hoveredCustomer.details.address}</div>}
            <div className="mt-2 pt-2 border-t flex justify-center">
              <Button size="small" type="link" onClick={() => setHoveredCustomer(null)}>Dismiss</Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default CustomerMap;
