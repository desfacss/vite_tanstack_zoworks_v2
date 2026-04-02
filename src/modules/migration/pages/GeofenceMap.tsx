import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Polygon, Marker, Popup } from "react-leaflet";
import { supabase } from "@/core/lib/supabase";
import * as wellknown from "wellknown";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Card, Button } from "antd";
import { DeleteOutlined } from "@ant-design/icons";

dayjs.extend(relativeTime);

// Fix Leaflet default marker icons for React
// @ts-ignore
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png",
});

interface Client {
  id: string;
  name: string | null;
  details: { address?: string; email?: string; phone?: string };
  geofence: string | null; // WKT format
}

interface AgentLocation {
  id: string;
  user_id: string;
  lat: number;
  lng: number;
  recorded_at: string;
  user: { name: string; details?: { designation?: string } };
}

const GeofenceMap: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [agentLocations, setAgentLocations] = useState<AgentLocation[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number]>([12.9716, 77.5946]); // Default: Bangalore
  const [hoveredClient, setHoveredClient] = useState<Client | null>(null);
  const [overlayPosition, setOverlayPosition] = useState<{ x: number; y: number } | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: clientData, error: clientError } = await supabase
          .schema("external")
          .from("accounts")
          .select("id, name, details, geofence")
          .eq("is_active", true);
        if (clientError) throw clientError;
        setClients(clientData || []);

        const { data: agentData, error: agentError } = await supabase
          .from("loc_agent_locations")
          .select(`
            id,
            user_id,
            lat,
            lng,
            recorded_at,
            user:users (name, details)
          `);
        if (agentError) throw agentError;
        setAgentLocations(agentData || []);

        if (navigator.geolocation) {
          try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) =>
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                timeout: 5000,
                maximumAge: 0,
                enableHighAccuracy: false,
              })
            );
            setUserLocation([position.coords.latitude, position.coords.longitude]);
          } catch {
            const response = await fetch("https://ipapi.co/json/");
            const data = await response.json();
            setUserLocation([data.latitude, data.longitude]);
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    const bounds = L.latLngBounds([]);
    let hasValidItems = false;

    clients.forEach((client) => {
      if (client.geofence) {
        try {
          const geoJSON = (wellknown as any).parse(client.geofence);
          if (geoJSON?.coordinates?.[0]) {
            const coords = geoJSON.coordinates[0].map((coord: number[]) => [coord[1], coord[0]]);
            coords.forEach((coord: any) => bounds.extend(coord));
            hasValidItems = true;
          }
        } catch (error) {
          console.error(`Error parsing geofence for client ${client.id}:`, error);
        }
      }
    });

    agentLocations.forEach((agent) => {
      if (agent.lat && agent.lng) {
        bounds.extend([agent.lat, agent.lng]);
        hasValidItems = true;
      }
    });

    if (hasValidItems) {
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    } else {
      mapRef.current.setView(userLocation, 12);
    }
    mapRef.current.invalidateSize();
  }, [clients, agentLocations, userLocation]);

  const handlePolygonClick = (client: Client, event: L.LeafletMouseEvent) => {
    const point = mapRef.current?.latLngToContainerPoint(event.latlng);
    if (point) {
      setOverlayPosition({ x: point.x, y: point.y });
      setHoveredClient(client);
    }
  };

  const handleMapClick = (event: L.LeafletMouseEvent) => {
    if (!(event.originalEvent.target as HTMLElement).closest(".leaflet-interactive")) {
      setHoveredClient(null);
      setOverlayPosition(null);
    }
  };

  const handleDeleteGeofence = async (clientId: string) => {
    try {
      const { error } = await supabase
        .schema("external")
        .from("accounts")
        .update({ geofence: null })
        .eq("id", clientId);
      if (error) throw error;
      setClients(clients.map((client) => (client.id === clientId ? { ...client, geofence: null } : client)));
      setHoveredClient(null);
      setOverlayPosition(null);
    } catch (error) {
      console.error("Error deleting geofence:", error);
    }
  };

  const renderPolygons = () => {
    return clients.map((client) => {
      if (!client.geofence) return null;
      try {
        const geoJSON = (wellknown as any).parse(client.geofence);
        if (!geoJSON?.coordinates?.[0]) return null;

        const positions = geoJSON.coordinates[0].map((coord: number[]) => [coord[1], coord[0]]);
        return (
          <Polygon
            key={client.id}
            positions={positions as any}
            eventHandlers={{ click: (e) => handlePolygonClick(client, e) }}
            pathOptions={{ color: "#808080", weight: 2, fillOpacity: 0.2 }}
          >
            <Popup>
              <div>
                <strong>{client.name || "Unnamed Client"}</strong>
                <br />
                {client.details?.address && <><span>{client.details.address}</span><br /></>}
                {client.details?.email && <><span>{client.details.email}</span><br /></>}
                {client.details?.phone && <span>{client.details.phone}</span>}
              </div>
            </Popup>
          </Polygon>
        );
      } catch (error) {
        console.error(`Error parsing polygon for client ${client.id}:`, error);
        return null;
      }
    });
  };

  return (
    <div className="relative" style={{ height: "calc(100vh - 100px)", width: "100%" }}>
      {hoveredClient && overlayPosition && (
        <Card
          size="small"
          className="absolute z-[1000] bg-white shadow-lg"
          style={{ left: overlayPosition.x, top: overlayPosition.y, transform: "translate(-50%, -120%)", minWidth: "200px" }}
        >
          <div className="flex justify-between items-center">
            <span className="font-semibold">{hoveredClient.name || "Unnamed Client"}</span>
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDeleteGeofence(hoveredClient.id)}
            />
          </div>
          <div className="mt-2">
            {hoveredClient.details?.address && <div>{hoveredClient.details.address}</div>}
            {hoveredClient.details?.email && <div>{hoveredClient.details.email}</div>}
            {hoveredClient.details?.phone && <div>{hoveredClient.details.phone}</div>}
          </div>
        </Card>
      )}

      <MapContainer
        center={userLocation}
        zoom={12}
        style={{ height: "100%", width: "100%" }}
        // @ts-ignore
        whenCreated={(map: L.Map) => {
          mapRef.current = map;
          map.invalidateSize();
          map.on("click", handleMapClick);
        }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {renderPolygons()}
        {agentLocations.map((agent) => (
          <Marker key={agent.id} position={[agent.lat, agent.lng]}>
            <Popup>
              <div>
                <strong>{agent.user.name || "Unknown Agent"}</strong>
                <br />
                {agent.user.details?.designation || "N/A"}
                <br />
                Last seen: {dayjs(agent.recorded_at).fromNow()}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default GeofenceMap;
