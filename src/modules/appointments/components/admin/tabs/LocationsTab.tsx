import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon } from 'react-leaflet';
import { supabase } from '@/lib/supabase';
import { MapPin, Plus, Loader2, Building2, Warehouse, Home, Edit, Trash2 } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { LocationFormModal, LocationFormData } from '../modals/LocationFormModal';
import { ConfirmDialog } from '../../common/ConfirmDialog';
import { useToast } from '../../common/Toast';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface LocationsTabProps {
  organizationId: string | null;
}

interface Location {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  latitude: number;
  longitude: number;
  type: string;
}

interface Territory {
  id: string;
  name: string;
  polygon_geojson: any;
}

const locationTypeIcons = {
  branch: Building2,
  zone: MapPin,
  warehouse: Warehouse,
  office: Building2,
  facility: Home,
  other: MapPin,
};

export function LocationsTab({ organizationId }: LocationsTabProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('map');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingLocation, setDeletingLocation] = useState<Location | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (organizationId) {
      loadLocationsAndTerritories();
    }
  }, [organizationId]);

  async function loadLocationsAndTerritories() {
    if (!organizationId) return;

    try {
      setLoading(true);

      const [locationsData, territoriesData] = await Promise.all([
        supabase
          .schema('identity')
          .from('locations')
          .select('*')
          .eq('organization_id', organizationId)
          .order('name'),
        supabase
          .schema('calendar')
          .from('territories')
          .select('*')
          .eq('organization_id', organizationId)
          .order('name'),
      ]);

      if (locationsData.error) throw locationsData.error;
      if (territoriesData.error) throw territoriesData.error;

      setLocations(locationsData.data || []);
      setTerritories(territoriesData.data || []);
    } catch (error) {
      console.error('Error loading locations:', error);
      showToast('Failed to load locations', 'error');
    } finally {
      setLoading(false);
    }
  }

  const handleAddLocation = () => {
    setEditingLocation(null);
    setIsFormModalOpen(true);
  };

  const handleEditLocation = (location: Location) => {
    setEditingLocation(location);
    setIsFormModalOpen(true);
  };

  const handleDeleteClick = (location: Location) => {
    setDeletingLocation(location);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingLocation) return;

    try {
      const { error } = await supabase
        .schema('calendar')
        .from('locations')
        .delete()
        .eq('id', deletingLocation.id);

      if (error) throw error;

      showToast(`${deletingLocation.name} deleted successfully`, 'success');
      loadLocationsAndTerritories();
    } catch (error) {
      console.error('Error deleting location:', error);
      showToast('Failed to delete location', 'error');
    } finally {
      setIsDeleteDialogOpen(false);
      setDeletingLocation(null);
    }
  };

  const handleSubmitForm = async (data: LocationFormData) => {
    if (!organizationId) return;

    try {
      if (editingLocation) {
        const { error } = await supabase
          .schema('calendar')
          .from('locations')
          .update({
            name: data.name,
            address: data.address,
            city: data.city,
            state: data.state,
            postal_code: data.postal_code,
            country: data.country,
            latitude: data.latitude,
            longitude: data.longitude,
            type: data.type,
          })
          .eq('id', editingLocation.id);

        if (error) throw error;

        showToast(`${data.name} updated successfully`, 'success');
      } else {
        const { error } = await supabase
          .schema('calendar')
          .from('locations')
          .insert({
            organization_id: organizationId,
            name: data.name,
            address: data.address,
            city: data.city,
            state: data.state,
            postal_code: data.postal_code,
            country: data.country,
            latitude: data.latitude,
            longitude: data.longitude,
            type: data.type,
          });

        if (error) throw error;

        showToast(`${data.name} created successfully`, 'success');
      }

      loadLocationsAndTerritories();
      setIsFormModalOpen(false);
      setEditingLocation(null);
    } catch (error) {
      console.error('Error saving location:', error);
      throw error;
    }
  };

  if (!organizationId) {
    return (
      <div className="text-center py-12 text-gray-500">
        Select an organization to manage locations
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const center: [number, number] =
    locations.length > 0
      ? [locations[0].latitude, locations[0].longitude]
      : [40.7128, -74.006];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Locations & Territories</h2>
          <p className="text-gray-500 mt-1">Manage physical locations and service territories</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('map')}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${viewMode === 'map'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              Map View
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${viewMode === 'list'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              List View
            </button>
          </div>
          <button
            onClick={handleAddLocation}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Location</span>
          </button>
        </div>
      </div>

      {viewMode === 'map' && locations.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <MapContainer
            center={center}
            zoom={11}
            style={{ height: '600px', width: '100%' }}
            className="z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {locations.map((location) => (
              <Marker key={location.id} position={[location.latitude, location.longitude]}>
                <Popup>
                  <div className="p-2">
                    <h3 className="font-semibold text-gray-900">{location.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{location.address}</p>
                    <p className="text-sm text-gray-600">
                      {location.city}, {location.state} {location.postal_code}
                    </p>
                    <span className="inline-block mt-2 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded capitalize">
                      {location.type}
                    </span>
                  </div>
                </Popup>
              </Marker>
            ))}

            {territories.map((territory) => {
              if (
                territory.polygon_geojson &&
                territory.polygon_geojson.type === 'Polygon' &&
                territory.polygon_geojson.coordinates
              ) {
                const positions = territory.polygon_geojson.coordinates[0].map(
                  (coord: [number, number]) => [coord[1], coord[0]] as [number, number]
                );

                return (
                  <Polygon
                    key={territory.id}
                    positions={positions}
                    pathOptions={{
                      color: '#3b82f6',
                      fillColor: '#3b82f6',
                      fillOpacity: 0.1,
                      weight: 2,
                    }}
                  >
                    <Popup>
                      <div className="p-2">
                        <h3 className="font-semibold text-gray-900">{territory.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">Service Territory</p>
                      </div>
                    </Popup>
                  </Polygon>
                );
              }
              return null;
            })}
          </MapContainer>
        </div>
      )}

      {viewMode === 'list' && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-200">
            {locations.map((location) => {
              const Icon = locationTypeIcons[location.type as keyof typeof locationTypeIcons] || MapPin;

              return (
                <div key={location.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="bg-blue-50 text-blue-600 p-3 rounded-lg">
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-lg">{location.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{location.address}</p>
                        <p className="text-sm text-gray-600">
                          {location.city}, {location.state} {location.postal_code}
                        </p>
                        <div className="flex items-center space-x-4 mt-2">
                          <span className="text-xs text-gray-500">
                            {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                          </span>
                          <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded capitalize">
                            {location.type}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => setViewMode('map')}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        View on Map
                      </button>
                      <button
                        onClick={() => handleEditLocation(location)}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(location)}
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {territories.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Service Territories</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {territories.map((territory) => (
                  <div
                    key={territory.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <h4 className="font-medium text-gray-900">{territory.name}</h4>
                    <p className="text-sm text-gray-500 mt-1">Geographic boundary defined</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {locations.length === 0 && (
        <div className="text-center py-12">
          <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No locations configured yet</p>
          <button
            onClick={handleAddLocation}
            className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
          >
            Add your first location
          </button>
        </div>
      )}

      <LocationFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingLocation(null);
        }}
        onSubmit={handleSubmitForm}
        initialData={editingLocation as any}
        organizationId={organizationId || ''}
      />

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setDeletingLocation(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Location"
        message={`Are you sure you want to delete ${deletingLocation?.name}? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
