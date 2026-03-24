import { MapContainer, TileLayer, Polyline, Marker, Popup } from "react-leaflet";
import { LatLngExpression } from "leaflet";
import 'leaflet/dist/leaflet.css';
import { useRef, useEffect } from "react";
import L from "leaflet";
import dayjs from "dayjs";
import relativeTime from 'dayjs/plugin/relativeTime';

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

dayjs.extend(relativeTime);

interface TrackMapProps {
  /**
   * Array of [lat, lng] pairs that represent the historical track
   */
  track: LatLngExpression[];
  /**
   * Current location as [lat, lng]
   */
  currentLocation: LatLngExpression;
  /**
   * Map initial zoom level (default 13)
   */
  zoom?: number;
  /**
   * Height of the map container (default "400px")
   */
  height?: string;
  agents?: any;
}

/**
 * Displays a Leaflet map with a polyline for the track and a marker for the current position.
 */
const TrackMap: React.FC<TrackMapProps> = ({
  track,
  currentLocation,
  zoom = 13,
  height = "400px",
  agents
}) => {
  // Center map on current location if available, otherwise first track point
  const center: LatLngExpression = currentLocation ?? (track && track.length > 0 ? track[0] : [0, 0]);
  const mapRef = useRef<L.Map | null>(null);

  // Use useEffect to handle map initialization and resize
  useEffect(() => {
    // Force map to recalculate its container size after rendering
    if (mapRef.current) {
      setTimeout(() => {
        mapRef.current?.invalidateSize();
      }, 100);
    }
  }, [mapRef.current]);

  return (
    <div className="w-full rounded-2xl shadow-lg overflow-hidden" style={{ height }}>
      <MapContainer 
        ref={mapRef} 
        center={center} 
        zoom={zoom} 
        scrollWheelZoom={true} 
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {/* Polyline for the track */}
        {track && track.length > 1 && <Polyline positions={track} pathOptions={{ weight: 4, opacity: 0.7, color: '#3388ff' }} />}

        {/* Marker for current location */}
        {currentLocation && (
          <Marker position={currentLocation}>
            <Popup>Current Location</Popup>
          </Marker>
        )}
        
        {agents?.map((agent: any) => (
          <Marker
            key={agent.id}
            position={[agent.lat, agent.lng]}
          >
            <Popup>
              <div>
                <strong>
                  {agent.user?.name || "Unknown Agent"}
                </strong>
                <br />
                {agent.user?.details?.designation}
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

export default TrackMap;
