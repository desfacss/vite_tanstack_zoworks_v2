import React, { useState, useEffect } from 'react';
import { Modal } from '../../common/Modal';
import { MapPin, Building2, Warehouse, Home } from 'lucide-react';

interface LocationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: LocationFormData) => Promise<void>;
  initialData?: LocationFormData & { id?: string };
  organizationId: string;
}

export interface LocationFormData {
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

const locationTypes = [
  { value: 'branch', label: 'Branch', icon: Building2 },
  { value: 'zone', label: 'Zone', icon: MapPin },
  { value: 'warehouse', label: 'Warehouse', icon: Warehouse },
  { value: 'office', label: 'Office', icon: Building2 },
  { value: 'facility', label: 'Facility', icon: Home },
  { value: 'other', label: 'Other', icon: MapPin },
];

export function LocationFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  organizationId,
}: LocationFormModalProps) {
  const [formData, setFormData] = useState<LocationFormData>({
    name: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'USA',
    latitude: 40.7128,
    longitude: -74.006,
    type: 'branch',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        name: '',
        address: '',
        city: '',
        state: '',
        postal_code: '',
        country: 'USA',
        latitude: 40.7128,
        longitude: -74.006,
        type: 'branch',
      });
    }
    setErrors({});
  }, [initialData, isOpen]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }

    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }

    if (!formData.state.trim()) {
      newErrors.state = 'State is required';
    }

    if (!formData.postal_code.trim()) {
      newErrors.postal_code = 'Postal code is required';
    }

    if (!formData.latitude || isNaN(formData.latitude)) {
      newErrors.latitude = 'Valid latitude is required';
    }

    if (!formData.longitude || isNaN(formData.longitude)) {
      newErrors.longitude = 'Valid longitude is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      setIsLoading(true);
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Error submitting form:', error);
      setErrors({ submit: 'Failed to save location. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const updateField = (field: keyof LocationFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData?.id ? 'Edit Location' : 'Add New Location'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {errors.submit && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {errors.submit}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Location Type *
          </label>
          <div className="grid grid-cols-6 gap-3">
            {locationTypes.map((type) => {
              const Icon = type.icon;
              const isSelected = formData.type === type.value;
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => updateField('type', type.value)}
                  className={`flex flex-col items-center space-y-2 p-3 rounded-lg border-2 transition-colors ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{type.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Location Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => updateField('name', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.name ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Downtown Office"
          />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Street Address *
          </label>
          <input
            type="text"
            value={formData.address}
            onChange={(e) => updateField('address', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.address ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="123 Main Street"
          />
          {errors.address && <p className="mt-1 text-sm text-red-600">{errors.address}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => updateField('city', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.city ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="New York"
            />
            {errors.city && <p className="mt-1 text-sm text-red-600">{errors.city}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
            <input
              type="text"
              value={formData.state}
              onChange={(e) => updateField('state', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.state ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="NY"
            />
            {errors.state && <p className="mt-1 text-sm text-red-600">{errors.state}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Postal Code *
            </label>
            <input
              type="text"
              value={formData.postal_code}
              onChange={(e) => updateField('postal_code', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.postal_code ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="10001"
            />
            {errors.postal_code && (
              <p className="mt-1 text-sm text-red-600">{errors.postal_code}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Country *</label>
            <input
              type="text"
              value={formData.country}
              onChange={(e) => updateField('country', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="USA"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Latitude *
            </label>
            <input
              type="number"
              step="any"
              value={formData.latitude}
              onChange={(e) => updateField('latitude', parseFloat(e.target.value))}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.latitude ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="40.7128"
            />
            {errors.latitude && <p className="mt-1 text-sm text-red-600">{errors.latitude}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Longitude *
            </label>
            <input
              type="number"
              step="any"
              value={formData.longitude}
              onChange={(e) => updateField('longitude', parseFloat(e.target.value))}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.longitude ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="-74.0060"
            />
            {errors.longitude && (
              <p className="mt-1 text-sm text-red-600">{errors.longitude}</p>
            )}
          </div>
        </div>

        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">
            You can use services like Google Maps or geocoding APIs to find exact coordinates for an address.
          </p>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Saving...' : initialData?.id ? 'Update Location' : 'Create Location'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
