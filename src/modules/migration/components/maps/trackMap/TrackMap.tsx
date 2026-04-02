import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import dayjs from 'dayjs';

// Fix for default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png',
});

interface TrackMapProps {
  track: [number, number][];
  currentLocation: [number, number];
  height?: string;
  agents?: any[];
}

// Internal component to auto-fit bounds
const AutoFitBounds = ({ bounds }: { bounds: L.LatLngBounds }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);
  return null;
};

const TrackMap: React.FC<TrackMapProps> = ({ track, currentLocation, height = '400px' }) => {
  const bounds = L.latLngBounds([]);
  
  if (track && track.length > 0) {
    track.forEach(point => bounds.extend(point));
  } else if (currentLocation && currentLocation[0] !== 0) {
    bounds.extend(currentLocation);
  }

  // Create custom circle marker for track points
  const createPointMarker = (color: string) => L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: ${color}; width: 8px; height: 8px; border-radius: 50%; border: 1px solid white;"></div>`,
    iconSize: [8, 8],
    iconAnchor: [4, 4]
  });

  return (
    <MapContainer
      center={currentLocation[0] !== 0 ? currentLocation : [12.9716, 77.5946]}
      zoom={15}
      style={{ height, width: '100%', borderRadius: '8px' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      
      {track && track.length > 1 && (
        <>
          <Polyline 
            positions={track} 
            pathOptions={{ color: '#1890ff', weight: 4, opacity: 0.6, dashArray: '5, 10' }} 
          />
          {/* Start Point */}
          <Marker position={track[0]} icon={createPointMarker('#52c41a')}>
            <Popup>Start Point</Popup>
          </Marker>
          {/* End Point */}
          <Marker position={track[track.length - 1]} icon={createPointMarker('#f5222d')}>
            <Popup>Last Recorded Point</Popup>
          </Marker>
        </>
      )}

      {currentLocation && currentLocation[0] !== 0 && (
        <Marker position={currentLocation}>
          <Popup>Current Position</Popup>
        </Marker>
      )}

      <AutoFitBounds bounds={bounds} />
    </MapContainer>
  );
};

export default TrackMap;
