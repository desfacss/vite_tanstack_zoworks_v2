import React, { useState, useEffect } from 'react';
import { Modal } from '../../common/Modal';
import { Clock, Users, CreditCard, Calendar, AlignLeft, MapPin, Settings } from 'lucide-react';
import { ResourceRequirementsBuilder, ResourceRequirement } from './ResourceRequirementsBuilder';
import { supabase } from '@/lib/supabase';

interface EventTypeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: EventTypeFormData) => Promise<void>;
  initialData?: EventTypeFormData & { id?: string };
  organizationId: string;
}

export interface EventTypeFormData {
  title: string;
  slug: string;
  duration: number;
  description: string;
  color: string;
  capacity_limit?: number;
  requires_multi_resource: boolean;
  credit_cost?: number;
  buffer_minutes?: number;
  is_active: boolean;
  booking_mode?: 'appointment' | 'queue' | 'arrival-window' | 'open-shift';
  assignment_strategy?: 'round-robin' | 'geo-clustered' | 'skill-based' | 'load-balanced' | 'manual';
  location_id?: string;
  resource_requirements?: ResourceRequirement[];
}

interface Location {
  id: string;
  name: string;
  address?: string;
  city?: string;
}

const defaultColors = [
  '#3B82F6', '#8B5CF6', '#EC4899', '#EF4444', '#F59E0B',
  '#10B981', '#14B8A6', '#06B6D4', '#6366F1', '#A855F7',
];

export function EventTypeFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  organizationId,
}: EventTypeFormModalProps) {
  const [formData, setFormData] = useState<EventTypeFormData>({
    title: '',
    slug: '',
    duration: 30,
    description: '',
    color: '#3B82F6',
    requires_multi_resource: false,
    is_active: true,
    booking_mode: 'appointment',
    assignment_strategy: 'round-robin',
    resource_requirements: [],
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [locations, setLocations] = useState<Location[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    loadLocations();
  }, [organizationId]);

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        resource_requirements: initialData.resource_requirements || [],
      });
      setShowAdvanced(
        !!(initialData.booking_mode && initialData.booking_mode !== 'appointment') ||
        !!(initialData.resource_requirements && initialData.resource_requirements.length > 0)
      );
    } else {
      setFormData({
        title: '',
        slug: '',
        duration: 30,
        description: '',
        color: '#3B82F6',
        requires_multi_resource: false,
        is_active: true,
        booking_mode: 'appointment',
        assignment_strategy: 'round-robin',
        resource_requirements: [],
      });
      setShowAdvanced(false);
    }
    setErrors({});
  }, [initialData, isOpen]);

  async function loadLocations() {
    try {
      const { data, error } = await supabase
        .schema('identity')
        .from('locations')
        // .select('id, name, address, city')
        .select('id, name')
        .eq('organization_id', organizationId)
        .order('name');

      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  }

  const generateSlug = (title: string): string => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.slug.trim()) {
      newErrors.slug = 'Slug is required';
    } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      newErrors.slug = 'Slug can only contain lowercase letters, numbers, and hyphens';
    }

    if (!formData.duration || formData.duration <= 0) {
      newErrors.duration = 'Duration must be greater than 0';
    }

    if (formData.capacity_limit && formData.capacity_limit <= 0) {
      newErrors.capacity_limit = 'Capacity must be greater than 0';
    }

    if (formData.credit_cost && formData.credit_cost < 0) {
      newErrors.credit_cost = 'Credit cost cannot be negative';
    }

    if (formData.buffer_minutes && formData.buffer_minutes < 0) {
      newErrors.buffer_minutes = 'Buffer minutes cannot be negative';
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
      setErrors({ submit: 'Failed to save event type. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const updateField = (field: keyof EventTypeFormData, value: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };

      if (field === 'title' && !initialData) {
        updated.slug = generateSlug(value);
      }

      return updated;
    });

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
      title={initialData?.id ? 'Edit Event Type' : 'Add New Event Type'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {errors.submit && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {errors.submit}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title *
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={formData.title}
              onChange={(e) => updateField('title', e.target.value)}
              className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.title ? 'border-red-500' : 'border-gray-300'
                }`}
              placeholder="30 Minute Meeting"
            />
          </div>
          {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            URL Slug *
          </label>
          <input
            type="text"
            value={formData.slug}
            onChange={(e) => updateField('slug', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.slug ? 'border-red-500' : 'border-gray-300'
              }`}
            placeholder="30-minute-meeting"
          />
          {errors.slug && <p className="mt-1 text-sm text-red-600">{errors.slug}</p>}
          <p className="mt-1 text-xs text-gray-500">
            This will be used in the booking URL
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <div className="relative">
            <AlignLeft className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <textarea
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              rows={3}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              placeholder="Brief description of this event type"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duration (minutes) *
            </label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="number"
                value={formData.duration}
                onChange={(e) => updateField('duration', parseInt(e.target.value) || 0)}
                min="5"
                step="5"
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.duration ? 'border-red-500' : 'border-gray-300'
                  }`}
              />
            </div>
            {errors.duration && <p className="mt-1 text-sm text-red-600">{errors.duration}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Buffer (minutes)
            </label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="number"
                value={formData.buffer_minutes || ''}
                onChange={(e) => updateField('buffer_minutes', e.target.value ? parseInt(e.target.value) : undefined)}
                min="0"
                step="5"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Color *
          </label>
          <div className="grid grid-cols-10 gap-2">
            {defaultColors.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => updateField('color', color)}
                className={`w-8 h-8 rounded-lg transition-transform ${formData.color === color ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : ''
                  }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Capacity Limit
            </label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="number"
                value={formData.capacity_limit || ''}
                onChange={(e) => updateField('capacity_limit', e.target.value ? parseInt(e.target.value) : undefined)}
                min="1"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Unlimited"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Credit Cost
            </label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="number"
                value={formData.credit_cost || ''}
                onChange={(e) => updateField('credit_cost', e.target.value ? parseInt(e.target.value) : undefined)}
                min="0"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center space-x-2 text-sm font-medium text-gray-700 hover:text-gray-900 mb-4"
          >
            <Settings className="w-4 h-4" />
            <span>{showAdvanced ? 'Hide' : 'Show'} Advanced Configuration</span>
          </button>

          {showAdvanced && (
            <div className="space-y-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Booking Mode *
                  </label>
                  <select
                    value={formData.booking_mode}
                    onChange={(e) => updateField('booking_mode', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="appointment">Appointment (Fixed Time)</option>
                    <option value="queue">Queue (Walk-in)</option>
                    <option value="arrival-window">Arrival Window</option>
                    <option value="open-shift">Open Shift (Broadcast)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.booking_mode === 'appointment' && 'Customers book specific time slots'}
                    {formData.booking_mode === 'queue' && 'Customers join queue with estimated wait'}
                    {formData.booking_mode === 'arrival-window' && 'Show flexible time windows (e.g., 2-3 PM)'}
                    {formData.booking_mode === 'open-shift' && 'Staff claim available shifts'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assignment Strategy *
                  </label>
                  <select
                    value={formData.assignment_strategy}
                    onChange={(e) => updateField('assignment_strategy', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="round-robin">Round Robin</option>
                    <option value="geo-clustered">Geo-Clustered</option>
                    <option value="skill-based">Skill-Based</option>
                    <option value="load-balanced">Load-Balanced</option>
                    <option value="manual">Manual Assignment</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.assignment_strategy === 'round-robin' && 'Fair distribution across resources'}
                    {formData.assignment_strategy === 'geo-clustered' && 'Assign nearest resource'}
                    {formData.assignment_strategy === 'skill-based' && 'Match by skills/certifications'}
                    {formData.assignment_strategy === 'load-balanced' && 'Assign to least busy resource'}
                    {formData.assignment_strategy === 'manual' && 'Admin manually assigns'}
                  </p>
                </div>
              </div>

              {locations.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Location (Optional)
                  </label>
                  <select
                    value={formData.location_id || ''}
                    onChange={(e) => updateField('location_id', e.target.value || undefined)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Any Location</option>
                    {locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name} {location.city && `- ${location.city}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="border-t border-gray-200 pt-4">
                <ResourceRequirementsBuilder
                  organizationId={organizationId}
                  requirements={formData.resource_requirements || []}
                  onChange={(requirements) => {
                    updateField('resource_requirements', requirements);
                    updateField('requires_multi_resource', requirements.length > 1);
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="is-active"
            checked={formData.is_active}
            onChange={(e) => updateField('is_active', e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="is-active" className="text-sm font-medium text-gray-700">
            Active (visible for booking)
          </label>
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
            {isLoading ? 'Saving...' : initialData?.id ? 'Update Event Type' : 'Create Event Type'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
