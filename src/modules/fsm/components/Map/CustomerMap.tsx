import React, { useState, useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  FeatureGroup,
  Polygon,
  Marker,
  Popup,
} from "react-leaflet";
import { EditControl } from "react-leaflet-draw";
import { Modal, message, Button, DatePicker } from "antd";
import * as wellknown from "wellknown";
import { supabase } from "@/core/lib/supabase"; // Updated to main project supabase client
import { DeleteOutlined } from "@ant-design/icons";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import TrackMap from "./TrackMap"; // Local import
import type { Customer, AgentWithDetails } from "../../types"; // Local types

dayjs.extend(relativeTime);

// Fix for default marker icons in Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

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
  // showAgents, // Unused
  onGeofenceUpdate,
  setShowTrackMap,
  showTrackMap,
  userData,
}) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [drawnGeofence, setDrawnGeofence] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<[number, number]>([12.9716, 77.5946]); // Default to Bangalore
  const mapRef = useRef<L.Map | null>(null);
  const featureGroupRef = useRef<L.FeatureGroup | null>(null);
  const [selectedDate, setSelectedDate] = useState<any>(null);

  // Get user's location and fit bounds
  useEffect(() => {
    const fetchLocation = async () => {
      try {
        if (navigator.geolocation) {
          try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                timeout: 5000,
                maximumAge: 0,
                enableHighAccuracy: false,
              });
            });
            setUserLocation([position.coords.latitude, position.coords.longitude]);
          } catch (error) {
            console.warn("Geolocation denied, using IP-based location fallback.");
            const res = await fetch("https://ipapi.co/json/");
            const data = await res.json();
            setUserLocation([data.latitude, data.longitude]);
          }
        }

        if (mapRef.current) {
          const bounds = L.latLngBounds([]);
          let hasItems = false;
          
          customers.forEach(customer => {
            if (customer.geofence) {
              try {
                const geoJSON = wellknown.parse(customer.geofence) as any;
                if (geoJSON?.coordinates?.[0]) {
                  const coords = geoJSON.coordinates[0].map((c: any) => [c[1], c[0]]);
                  coords.forEach((c: any) => bounds.extend(c));
                  hasItems = true;
                }
              } catch (e) {}
            }
          });

          agents.forEach(agent => {
            if (agent.lat && agent.lng) {
              bounds.extend([agent.lat, agent.lng]);
              hasItems = true;
            }
          });

          if (hasItems) {
            mapRef.current.fitBounds(bounds, { padding: [50, 50] });
          } else {
            mapRef.current.setView(userLocation, 12);
          }
          mapRef.current.invalidateSize();
        }
      } catch (err) {
        console.error("Map initialization failed", err);
      }
    };
    fetchLocation();
  }, [customers, agents]);

  const handleCreate = (e: any) => {
    const layer = e.layer;
    setDrawnGeofence(layer.toGeoJSON());
    setShowConfirmModal(true);
  };

  const handleSaveGeofence = async () => {
    if (!selectedCustomer || !drawnGeofence) return;
    try {
      const wkt = wellknown.stringify(drawnGeofence);
      const { error } = await supabase.rpc("update_client_geofence", {
        client_id: selectedCustomer.id,
        wkt: wkt,
      });
      if (error) throw error;
      onGeofenceUpdate(selectedCustomer.id, wkt);
      message.success("Geofence saved");
    } catch (e) {
      message.error("Failed to save geofence");
    }
    setShowConfirmModal(false);
    setDrawnGeofence(null);
  };

  const handleDeleteGeofence = async (id: string) => {
    try {
      const { error } = await supabase.rpc("update_client_geofence", {
        client_id: id,
        wkt: null,
      });
      if (error) throw error;
      onGeofenceUpdate(id, null);
      message.success("Geofence deleted");
    } catch (e) {
      message.error("Failed to delete geofence");
    }
  };

  const renderPolygons = () => {
    return customers.map(customer => {
      if (!customer.geofence) return null;
      try {
        const geoJSON = wellknown.parse(customer.geofence) as any;
        if (!geoJSON?.coordinates?.[0]) return null;
        const positions = geoJSON.coordinates[0].map((c: any) => [c[1], c[0]]);
        const isSelected = selectedCustomer?.id === customer.id;
        return (
          <Polygon
            key={customer.id}
            positions={positions}
            pathOptions={{
              color: isSelected ? "#1890ff" : "#808080",
              weight: isSelected ? 3 : 2,
              fillOpacity: isSelected ? 0.4 : 0.2,
            }}
          >
            <Popup>
              <strong>{customer.name}</strong>
              <br/>{customer.details?.address}
            </Popup>
          </Polygon>
        );
      } catch (e) { return null; }
    });
  };

  const getFilteredTrack = () => {
    if (!selectedAgent?.user_id || !userData[selectedAgent.user_id]) return [];
    const userTrack = userData[selectedAgent.user_id];
    if (!selectedDate) return userTrack.track || [];
    const ts = selectedDate.startOf("day").valueOf();
    return userTrack.trackWithDates?.filter((p: any) => dayjs(p.timestamp).valueOf() >= ts).map((p: any) => p.coordinates) || [];
  };

  return (
    <div className="relative h-full w-full">
      {selectedCustomer?.geofence && (
        <div className="absolute top-4 right-4 z-[1000]">
          <Button danger icon={<DeleteOutlined />} onClick={() => handleDeleteGeofence(selectedCustomer.id)}>Delete Geofence</Button>
        </div>
      )}
      <MapContainer center={userLocation} zoom={12} ref={mapRef} style={{ height: "100%", width: "100%" }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
        <FeatureGroup ref={featureGroupRef}>
          <EditControl position="topright" onCreated={handleCreate} draw={{ rectangle: false, circle: false, circlemarker: false, marker: false, polyline: false }} />
          {renderPolygons()}
          {agents.map(agent => (
            <Marker key={agent.id} position={[agent.lat, agent.lng]}>
              <Popup>
                <strong>{agent.user?.name}</strong><br/>{dayjs(agent.recorded_at).fromNow()}
              </Popup>
            </Marker>
          ))}
        </FeatureGroup>
      </MapContainer>

      <Modal title="Save Geofence" open={showConfirmModal} onOk={handleSaveGeofence} onCancel={() => setShowConfirmModal(false)}>
        <p>Save geofence for {selectedCustomer?.name}?</p>
      </Modal>

      <Modal title="Track History" open={showTrackMap} width={800} onCancel={() => { setShowTrackMap(false); setSelectedDate(null); }}>
         <div className="p-4 flex flex-col gap-4">
            <DatePicker onChange={d => setSelectedDate(d)} placeholder="Filter by date" style={{ width: 200 }} />
            <TrackMap track={getFilteredTrack()} currentLocation={getFilteredTrack().length > 0 ? getFilteredTrack()[getFilteredTrack().length-1] : [0,0]} height="400px" agents={agents} />
         </div>
      </Modal>
    </div>
  );
};

export default CustomerMap;
