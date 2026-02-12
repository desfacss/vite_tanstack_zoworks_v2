import React, { useMemo, useState, useEffect } from 'react';
import { Spin, message, Button } from 'antd';
import { MapContainer, TileLayer, Marker, Popup, Polygon, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
// @ts-ignore
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
  _entityType,
  record,
  actions,
  _accessConfig,
  _viewConfig,
  _rawData,
  _onGeofenceUpdate,
}: any) => {
  const handleActionClick = (actionName: string) => {
    if (actionName === 'edit_geofence') {
      message.info(`Editing geofence for ${record.name} (ID: ${record.id})`);
    } else {
      message.info(`Action ${actionName} triggered for ${record.name}`);
    }
  };

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {actions.map((action: any) => (
        <Button
          key={action.name}
          type="primary"
          size="small"
          onClick={() => handleActionClick(action.name)}
        >
          {action.label || action.name}
        </Button>
      ))}
    </div>
  );
};

// Helper to calculate center of polygon/points
const calculateMapCenter = (
  geofences: Record<string, LatLng[]>,
  data: any[],
  latField?: string,
  lngField?: string
): [number, number] => {
  const points: LatLng[] = [];

  // 1. Add geofence points
  Object.values(geofences).forEach((fp) => points.push(...fp));

  // 2. Add marker points
  if (latField && lngField) {
    data.forEach((record) => {
      const lat = record[latField];
      const lng = record[lngField];
      if (
        lat !== null &&
        lat !== undefined &&
        lng !== null &&
        lng !== undefined &&
        Number.isFinite(lat) &&
        Number.isFinite(lng)
      ) {
        points.push({ lat, lng });
      }
    });
  }

  if (points.length === 0) return [25.2048, 55.2708]; // Default to Dubai

  const centroid = points.reduce(
    (acc, curr) => ({
      lat: acc.lat + curr.lat / points.length,
      lng: acc.lng + curr.lng / points.length,
    }),
    { lat: 0, lng: 0 }
  );

  return [centroid.lat, centroid.lng];
};

// Function to parse WKT geofence into LatLng array
const parseGeofence = (wkt: string): LatLng[] => {
  try {
    const cleanWkt = wkt.replace(/^SRID=\d+;/, '');
    const geoJson = parse(cleanWkt);

    if (geoJson && geoJson.type === 'Polygon') {
      const coords = geoJson.coordinates[0].map(([lng, lat]: [number, number]) => {
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          console.warn('Invalid coordinate:', { lat, lng });
          return null;
        }
        return { lat, lng };
      }).filter((coord: any): coord is LatLng => coord !== null);

      return coords;
    }
    return [];
  } catch (error) {
    console.error('Error parsing WKT geofence:', error, wkt);
    return [];
  }
};

// MapController to handle map instance in v4
const MapController: React.FC<{ center: [number, number], zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, zoom);
    map.invalidateSize();
  }, [center, zoom, map]);

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    return () => clearTimeout(timer);
  }, [map]);

  return null;
};

const MapViewComponent: React.FC<MapViewProps> = ({
  entityType,
  viewConfig,
  _formConfig,
  data = [],
  isLoading = false,
  _filterValues,
  _pagination,
  _onTableChange,
  globalFilters,
}: any) => {
  const { setConfig } = useAuthedLayoutConfig();
  const [_selectedEntity, setSelectedEntity] = useState<any | undefined>();
  const [tracks, setTracks] = useState<Record<string, LatLng[]>>({});
  const [geofences, setGeofences] = useState<Record<string, LatLng[]>>({});

  const hasValidMapConfig = viewConfig?.mapview && Object.keys(viewConfig.mapview).length > 0;

  const defaultMapConfig = useMemo(() => {
    if (hasValidMapConfig) return null;
    if (!data || data.length === 0) return null;

    const firstRecord = data[0];
    const config: any = {
      layout: { zoom: 13, showGeofences: true, showTracks: false },
      locationFields: { lat: '', lng: '', geofence: { field: '' } },
      fields: []
    };

    if (firstRecord.geofence) config.locationFields.geofence.field = 'geofence';

    if (firstRecord.lat !== undefined && firstRecord.lat !== null && firstRecord.lng !== undefined && firstRecord.lng !== null) {
      config.locationFields.lat = 'lat';
      config.locationFields.lng = 'lng';
    }

    const titleField = Object.keys(firstRecord).find(k => ['name', 'title', 'label', 'display_name'].includes(k.toLowerCase()));
    if (titleField) config.fields.push({ fieldPath: titleField, mapSection: 'title', order: 1 });

    if (config.locationFields.geofence.field || (config.locationFields.lat && config.locationFields.lng)) {
      return config;
    }
    return null;
  }, [hasValidMapConfig, data]);

  const mapViewConfig = hasValidMapConfig ? viewConfig?.mapview : defaultMapConfig;
  const geofenceField = mapViewConfig?.locationFields?.geofence?.field || 'geofence';
  const { lat: latField, lng: lngField, trackField } = (mapViewConfig as any)?.locationFields || {};
  const {
    zoom = 13,
    markerIcon = '/marker-icon.png',
  } = (mapViewConfig as any)?.layout || {};
  
  const mapCenter = useMemo(() => calculateMapCenter(geofences, data, latField, lngField), [geofences, data, latField, lngField]);

  const customIcon = markerIcon
    ? new L.Icon({
      iconUrl: markerIcon.startsWith('http') ? markerIcon : (markerIcon.startsWith('/') ? markerIcon : `/${markerIcon}`),
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
    })
    : undefined;

  const allFields = useMemo(() => {
    return (
      (mapViewConfig as any)?.fields?.sort((a: any, b: any) => (a.order || 0) - (b.order || 0)) || []
    );
  }, [mapViewConfig]);

  const sectionFields = useMemo(() => {
    return {
      title: allFields.find((f: any) => f.mapSection === 'title'),
      body: allFields.filter((f: any) => f.mapSection === 'body' || !f.mapSection),
      footer: allFields.filter((f: any) => f.mapSection === 'footer'),
    };
  }, [allFields]);

  useEffect(() => {
    const fetchGeofences = async () => {
      if (!data.length || !geofenceField) return;

      const newGeofences: Record<string, LatLng[]> = {};
      const idsWithGeofence = data
        .filter((r) => r[geofenceField])
        .map((r) => ({ id: r.id, wkt: r[geofenceField] }));

      idsWithGeofence.forEach(({ id, wkt }: any) => {
        const parsed = parseGeofence(wkt);
        if (parsed.length > 0) {
          newGeofences[id] = parsed;
        }
      });

      setGeofences(newGeofences);
    };

    fetchGeofences();
  }, [data, geofenceField]);

  useEffect(() => {
    const fetchTracks = async () => {
      if (!trackField || !data.length) return;
      const newTracks: Record<string, LatLng[]> = {};
      setTracks(newTracks);
    };
    fetchTracks();
  }, [data, trackField]);

  useEffect(() => {
    setConfig({
      // @ts-ignore
      title: 'Map View',
      actions: globalFilters,
    });
  }, [setConfig, globalFilters]);

  const handleGeofenceUpdate = async (entityId: string, wktGeofence: string | null) => {
    try {
      if (!entityType) return;
      const tableName = entityType.includes('.') ? entityType.split('.')[1] : entityType;

      const { error } = await supabase
        .schema('crm')
        .from(tableName)
        .update({ [geofenceField]: wktGeofence })
        .eq('id', entityId);

      if (error) throw error;
      message.success('Geofence updated successfully');
    } catch (error: any) {
      console.error('Error updating geofence:', error);
      message.error(error.message || 'Failed to update geofence');
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!mapViewConfig) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h3>No spatial data found</h3>
        <p>This entity needs latitude/longitude or geofence fields to be displayed on a map.</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '600px', height: '600px', width: '100%', position: 'relative', border: '1px solid #eee', borderRadius: '8px', overflow: 'hidden' }}>
      <MapContainer
        center={mapCenter}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
      >
        <MapController center={mapCenter} zoom={zoom} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {data.map((record: any) => {
          const lat = latField ? record[latField] : null;
          const lng = lngField ? record[lngField] : null;
          const hasMarker = lat !== null && lat !== undefined && 
                           lng !== null && lng !== undefined && 
                           Number.isFinite(lat) && Number.isFinite(lng);
          const geofenceCoords = geofences[record.id];

          return (
            <React.Fragment key={record.id}>
              {hasMarker && (
                <Marker
                  position={[lat, lng]}
                  icon={customIcon}
                  eventHandlers={{
                    click: () => setSelectedEntity(record),
                  }}
                >
                  <Popup maxWidth={500}>
                    <div className="map-popup-content">
                      {sectionFields.title && (
                        <h4 style={{ margin: '0 0 8px 0' }}>
                          {record[sectionFields.title.fieldPath]}
                        </h4>
                      )}
                      
                      <div className="popup-body" style={{ marginBottom: 8 }}>
                        {sectionFields.body.map((f: any) => (
                          <div key={f.fieldPath} style={{ fontSize: '0.9em' }}>
                            <strong>{f.fieldPath}:</strong> {record[f.fieldPath]}
                          </div>
                        ))}
                      </div>

                      <div className="popup-actions" style={{ borderTop: '1px solid #eee', paddingTop: 8 }}>
                        <RowActions
                          entityType={entityType}
                          record={record}
                          actions={mapViewConfig.actions?.row || []}
                          accessConfig={viewConfig?.access_config}
                          viewConfig={viewConfig || {}}
                          rawData={data}
                          onGeofenceUpdate={handleGeofenceUpdate}
                        />
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )}

              {geofenceCoords && (
                <Polygon
                  positions={geofenceCoords.map((p: any) => [p.lat, p.lng])}
                  pathOptions={{ color: 'blue', fillColor: 'blue', fillOpacity: 0.1 }}
                >
                  <Popup>
                    <strong>Geofence for {record.name || record.id}</strong>
                  </Popup>
                </Polygon>
              )}

              {tracks[record.id] && (
                <Polyline
                  positions={tracks[record.id].map((p: any) => [p.lat, p.lng])}
                  pathOptions={{ color: 'red', weight: 3 }}
                />
              )}
            </React.Fragment>
          );
        })}
      </MapContainer>

      {/* Optional: Legend or Controls Overlay */}
      <div style={{
        position: 'absolute',
        top: 10,
        right: 10,
        zIndex: 1000,
        background: 'white',
        padding: 10,
        borderRadius: 4,
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <div style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 5 }}>Map Legend</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
          <div style={{ width: 10, height: 10, background: 'blue', opacity: 0.5 }}></div> Geofences
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
          <div style={{ width: 10, height: 2, background: 'red' }}></div> Tracks
        </div>
      </div>
    </div>
  );
};

export default MapViewComponent;
