import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Spin, message, Button } from 'antd';
import { MapContainer, TileLayer, Marker, Popup, Polygon, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { motion } from 'framer-motion';
import { parse } from 'wkt';
import { supabase } from '../../lib/supabase';
import { useAuthedLayoutConfig } from '../Layout/AuthedLayoutContext';
import 'leaflet/dist/leaflet.css';

interface FieldConfig {
  fieldPath: string;
  style?: React.CSSProperties;
  webLink?: boolean;
  mapSection?: 'title' | 'body' | 'footer';
  order?: number;
}

interface MapViewProps {
  entityType: string;
  viewConfig?: ViewConfig;
  formConfig?: any;
  data: any[];
  isLoading?: boolean;
  filterValues?: Record<string, any>;
  pagination?: { current: number; pageSize: number; total: number };
  onTableChange?: (pagination: any, filters: any, sorter: any) => void;
  globalFilters?: React.ReactNode;
}

interface ViewConfig {
  mapview?: {
    layout?: {
      zoom?: number;
      markerIcon?: string;
      showTracks?: boolean;
      showGeofences?: boolean;
      maxWidth?: string;
    };
    fields: FieldConfig[];
    locationFields?: {
      lat: string;
      lng: string;
      geofence?: {
        field: string;
        sourceTable?: string;
        rpc?: string;
        srid?: string;
      };
      trackField?: string;
    };
    actions: {
      row?: Array<{ name: string; label: string }>;
      bulk?: Array<{ name: string }>;
    };
  };
  access_config?: any;
}

interface LatLng {
  lat: number;
  lng: number;
}

interface RowActionsProps {
  entityType: string;
  record: any;
  actions: Array<{ name: string; label: string }>;
  accessConfig: any;
  viewConfig: ViewConfig;
  rawData: any[];
  onGeofenceUpdate: (entityId: string, wktGeofence: string | null) => void;
}

// RowActions Component
const RowActions: React.FC<RowActionsProps> = ({
  entityType,
  record,
  actions,
  accessConfig,
  viewConfig,
  rawData,
  onGeofenceUpdate,
}) => {
  const handleActionClick = (actionName: string) => {
    if (actionName === 'edit_geofence') {
      message.info(`Editing geofence for ${record.name} (ID: ${record.id})`);
    } else {
      message.info(`Action ${actionName} triggered for ${record.name}`);
    }
  };

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {actions.map((action) => (
        <Button
          key={action.name}
          type="primary"
          size="small"
          onClick={() => handleActionClick(action.name)}
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
};

// Function to calculate the centroid of a polygon
const calculateCentroid = (coordinates: LatLng[]): LatLng => {
  if (!coordinates || coordinates.length === 0) {
    console.warn('No coordinates provided for centroid calculation');
    return { lat: 0, lng: 0 };
  }

  let latSum = 0;
  let lngSum = 0;
  let count = 0;

  coordinates.forEach(coord => {
    if (isFinite(coord.lat) && isFinite(coord.lng)) {
      latSum += coord.lat;
      lngSum += coord.lng;
      count += 1;
    } else {
      console.warn('Invalid coordinate:', coord);
    }
  });

  if (count === 0) {
    console.warn('No valid coordinates for centroid calculation');
    return { lat: 0, lng: 0 };
  }

  const centroid = {
    lat: latSum / count,
    lng: lngSum / count,
  };
  console.log('Calculated centroid:', centroid);
  return centroid;
};

// Function to calculate the overall centroid from geofences
const calculateMapCenter = (geofences: Record<string, LatLng[]>): [number, number] => {
  console.log('Calculating map center for geofences:', geofences);

  let allCoords: LatLng[] = [];

  Object.values(geofences).forEach((coords, index) => {
    if (coords && coords.length > 0) {
      console.log(`Coordinates for geofence ${index}:`, coords);
      allCoords = allCoords.concat(coords.filter(coord => isFinite(coord.lat) && isFinite(coord.lng)));
    } else {
      console.warn(`No valid coordinates for geofence ${index}`);
    }
  });

  console.log('All coordinates collected:', allCoords);

  if (allCoords.length === 0) {
    console.log('No valid coordinates found, falling back to Chennai');
    return [13.0827, 80.2707]; // Fallback to Chennai
  }

  const centroid = calculateCentroid(allCoords);
  if (!isFinite(centroid.lat) || !isFinite(centroid.lng)) {
    console.warn('Invalid centroid, falling back to Chennai:', centroid);
    return [13.0827, 80.2707];
  }

  console.log('Final map center:', [centroid.lat, centroid.lng]);
  return [centroid.lat, centroid.lng];
};

// Function to parse WKT geofence into LatLng array
const parseGeofence = (wkt: string): LatLng[] => {
  try {
    const cleanWkt = wkt.replace(/^SRID=\d+;/, '');
    console.log('Cleaned WKT:', cleanWkt);
    const geoJson = parse(cleanWkt);
    console.log('Parsed GeoJSON:', geoJson);

    if (geoJson && geoJson.type === 'Polygon') {
      const coords = geoJson.coordinates[0].map(([lng, lat]: [number, number]) => {
        if (!isFinite(lat) || !isFinite(lng)) {
          console.warn('Invalid coordinate:', { lat, lng });
          return null;
        }
        return { lat, lng };
      }).filter((coord): coord is LatLng => coord !== null);

      console.log('Parsed coordinates:', coords);
      return coords;
    }
    console.warn('Invalid geometry type:', geoJson?.type);
    return [];
  } catch (error) {
    console.error('Error parsing WKT geofence:', error, wkt);
    return [];
  }
};

const MapViewComponent: React.FC<MapViewProps> = ({
  entityType,
  viewConfig,
  formConfig,
  data = [],
  isLoading = false,
  filterValues,
  pagination,
  onTableChange,
  globalFilters,
}) => {
  const { setConfig } = useAuthedLayoutConfig();
  const [selectedEntity, setSelectedEntity] = useState<any | undefined>();
  const [tracks, setTracks] = useState<Record<string, LatLng[]>>({});
  const [geofences, setGeofences] = useState<Record<string, LatLng[]>>({});
  const mapRef = useRef<L.Map | null>(null);

  // NOTE: Validation moved to after all hooks to comply with rules-of-hooks
  const hasValidMapConfig = viewConfig?.mapview && Object.keys(viewConfig.mapview).length > 0;

  const mapViewConfig = viewConfig?.mapview;
  const geofenceField = mapViewConfig?.locationFields?.geofence?.field || 'geofence';
  const mapCenter = useMemo(() => calculateMapCenter(geofences), [geofences]);

  const {
    zoom = 13,
    markerIcon = '/marker-icon.png',
    showTracks = false,
    showGeofences = true,
    maxWidth = '100%',
  } = mapViewConfig?.layout || {};
  const { lat: latField, lng: lngField, geofence: geofenceConfig, trackField } = mapViewConfig?.locationFields || {};
  const geofenceSourceTable = geofenceConfig?.sourceTable || entityType;
  const geofenceRpc = geofenceConfig?.rpc;
  const srid = geofenceConfig?.srid || '4326';

  // Update map center when geofences change
  useEffect(() => {
    if (mapRef.current && Object.keys(geofences).length > 0) {
      console.log('Setting map view to:', mapCenter);
      mapRef.current.setView(mapCenter, zoom);
    }
  }, [mapCenter, geofences, zoom]);

  console.log('Map center computed:', mapCenter);

  // Custom marker icon
  const customIcon = markerIcon
    ? new L.Icon({
      iconUrl: markerIcon,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
    })
    : undefined;

  // All fields sorted by order
  const allFields = useMemo(() => {
    return (
      mapViewConfig?.fields
        ?.map((field) => ({
          ...field,
          order: field.order ?? 0,
        }))
        .sort((a, b) => a.order - b.order) || []
    );
  }, [mapViewConfig?.fields]);

  // Render field content
  const renderField = (record: any, fieldConfig: FieldConfig) => {
    const value = fieldConfig.fieldPath
      .split('.')
      .reduce((obj, key) => obj?.[key], record);
    const { style = {}, webLink, mapSection } = fieldConfig;

    if (value === null || value === undefined || value === '') return null;

    const textStyle: React.CSSProperties = {
      ...style,
      display: 'block',
      whiteSpace: style.ellipsis ? 'nowrap' : 'normal',
      overflow: style.ellipsis ? 'hidden' : 'visible',
      textOverflow: style.ellipsis ? 'ellipsis' : 'clip',
      fontWeight: mapSection === 'title' ? 'bold' : 'normal',
      fontSize: mapSection === 'title' ? '1.1rem' : '0.9rem',
    };

    const content = <span style={textStyle}>{value}</span>;

    if (webLink) {
      const fullUrl = value?.startsWith('http') ? value : `https://${value}`;
      return (
        <a href={fullUrl} target="_blank" rel="noopener noreferrer" style={textStyle}>
          {content}
        </a>
      );
    }

    return content;
  };

  // Fetch geofences
  const fetchGeofences = async () => {
    try {
      let geofenceData: any[] = [];

      if (geofenceRpc) {
        const { data, error } = await supabase.rpc(geofenceRpc);
        if (error) throw error;
        geofenceData = data || [];
      } else if (geofenceField) {
        geofenceData = data;
      } else {
        return;
      }

      const geofenceMap: Record<string, LatLng[]> = {};
      geofenceData.forEach((record) => {
        if (record[geofenceField]) {
          const coordinates = parseGeofence(record[geofenceField]);
          if (coordinates.length > 0) {
            geofenceMap[record.id] = coordinates;
          }
        }
      });
      console.log('Geofence map:', geofenceMap);
      setGeofences(geofenceMap);
    } catch (error) {
      console.error('Error fetching geofences:', error);
      message.error('Failed to load geofences');
    }
  };

  // Process geofences from data or RPC
  useEffect(() => {
    if (showGeofences && geofenceField) {
      fetchGeofences();
    }
  }, [showGeofences, geofenceField, geofenceRpc, data]);

  // Fetch tracks for entities if showTracks is enabled
  useEffect(() => {
    if (showTracks && trackField) {
      const fetchTracks = async () => {
        try {
          const { data: trackData, error } = await supabase
            .from(trackField)
            .select('id, entity_id, lat, lng, recorded_at')
            .order('recorded_at', { ascending: true });

          if (error) throw error;

          const tracksByEntity = trackData.reduce((acc, { entity_id, lat, lng }) => {
            if (!acc[entity_id]) acc[entity_id] = [];
            acc[entity_id].push({ lat, lng });
            return acc;
          }, {} as Record<string, LatLng[]>);

          setTracks(tracksByEntity);
        } catch (error) {
          console.error('Error fetching tracks:', error);
          message.error('Failed to load tracks');
        }
      };

      fetchTracks();

      const trackChannel = supabase
        .channel(`track_${entityType}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: trackField },
          () => fetchTracks()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(trackChannel);
      };
    }
  }, [showTracks, trackField, entityType]);

  // Real-time subscription for geofence updates
  useEffect(() => {
    if (showGeofences && geofenceField) {
      const geofenceChannel = supabase
        .channel(`geofence_${entityType}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: geofenceSourceTable, filter: `${geofenceField}=not.is.null` },
          () => fetchGeofences()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(geofenceChannel);
      };
    }
  }, [showGeofences, geofenceField, geofenceSourceTable, geofenceRpc]);

  // Handle geofence updates
  const handleGeofenceUpdate = async (entityId: string, wktGeofence: string | null) => {
    try {
      const { error } = await supabase
        .from(geofenceSourceTable)
        .update({ [geofenceField!]: wktGeofence ? `SRID=${srid};${wktGeofence}` : null })
        .eq('id', entityId);

      if (error) throw error;

      setGeofences((prev) => {
        const newGeofences = { ...prev };
        if (wktGeofence) {
          newGeofences[entityId] = parseGeofence(wktGeofence);
        } else {
          delete newGeofences[entityId];
        }
        return newGeofences;
      });

      if (selectedEntity?.id === entityId) {
        setSelectedEntity((prev: any) =>
          prev ? { ...prev, [geofenceField!]: wktGeofence } : prev
        );
      }
    } catch (error) {
      console.error('Error updating geofence:', error);
      message.error('Failed to update geofence');
    }
  };

  // Action buttons for bulk actions
  const actionButtons = useMemo(() => {
    return (
      mapViewConfig?.actions?.bulk?.map((action) => ({
        name: action.name,
        label: action.name === 'add_' ? 'Add Item' : action.name,
        type: 'primary' as const,
        icon: undefined,
        onClick: () => { },
      })) || []
    );
  }, [mapViewConfig?.actions.bulk]);

  React.useEffect(() => {
    setConfig((prev) => ({ ...prev, actionButtons }));
  }, [setConfig, actionButtons]);

  // Early return for loading
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  // Early return for invalid config (after all hooks)
  if (!hasValidMapConfig) {
    return <div>No map view configuration found for {entityType}</div>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ maxWidth, height: '70vh' }}>
      {globalFilters && <div className="flex-1 min-w-[300px] pb-4">{globalFilters}</div>}
      <MapContainer
        center={[13.0827, 80.2707]} // Initial center (Chennai) for first render
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {data
          .filter((record) => record[geofenceField] && geofences[record.id])
          .map((record) => {
            const geofenceCoords = geofences[record.id];
            const centroid = calculateCentroid(geofenceCoords);
            if (!isFinite(centroid.lat) || !isFinite(centroid.lng)) {
              console.warn(`Invalid centroid for record ${record.id}:`, centroid);
              return null;
            }

            return (
              <React.Fragment key={record.id}>
                <Marker
                  position={[centroid.lat, centroid.lng]}
                  icon={customIcon}
                  eventHandlers={{
                    click: () => setSelectedEntity(record),
                  }}
                >
                  <Popup>
                    <div>
                      {allFields
                        .filter((f) => f.mapSection === 'title')
                        .map((field) => renderField(record, field))
                        .filter(Boolean)}
                      {allFields
                        .filter((f) => !f.mapSection || f.mapSection === 'body')
                        .map((field) => renderField(record, field))
                        .filter(Boolean)}
                      {allFields
                        .filter((f) => f.mapSection === 'footer')
                        .map((field) => renderField(record, field))
                        .filter(Boolean)}
                      {mapViewConfig?.actions.row?.length > 0 && (
                        <div style={{ marginTop: 8 }}>
                          <RowActions
                            entityType={entityType}
                            record={record}
                            actions={mapViewConfig.actions.row}
                            accessConfig={viewConfig.access_config}
                            viewConfig={viewConfig}
                            rawData={data}
                            onGeofenceUpdate={handleGeofenceUpdate}
                          />
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
                {showGeofences && geofenceCoords?.length > 0 && (
                  <Polygon
                    positions={geofenceCoords}
                    color="purple"
                    weight={2}
                    opacity={0.7}
                    fillOpacity={0.2}
                  />
                )}
                {showTracks && tracks[record.id] && (
                  <Polyline
                    positions={tracks[record.id]}
                    color="blue"
                    weight={3}
                    opacity={0.7}
                  />
                )}
              </React.Fragment>
            );
          })}
      </MapContainer>
    </motion.div>
  );
};

export default MapViewComponent;