import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Calendar, Plus, Loader2, Clock, Users, CreditCard, Tag, Edit, Trash2 } from 'lucide-react';
import { EventTypeFormModal, EventTypeFormData } from '../modals/EventTypeFormModal';
import { ConfirmDialog } from '../../common/ConfirmDialog';
import { useToast } from '../../common/Toast';

interface EventTypesTabProps {
  organizationId: string | null;
}

interface EventType {
  id: string;
  title: string;
  slug: string;
  duration_minutes: number;
  description: string;
  color: string;
  capacity_limit?: number;
  requires_multi_resource?: boolean;
  credit_cost?: number;
  buffer_minutes?: number;
  is_active: boolean;
  booking_mode: 'appointment' | 'queue' | 'arrival-window' | 'open-shift';
  assignment_strategy: 'round-robin' | 'geo-clustered' | 'skill-based' | 'load-balanced' | 'manual';
  location_id?: string;
}

export function EventTypesTab({ organizationId }: EventTypesTabProps) {
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingEventType, setEditingEventType] = useState<EventType | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingEventType, setDeletingEventType] = useState<EventType | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (organizationId) {
      loadEventTypes();
    }
  }, [organizationId]);

  async function loadEventTypes() {
    if (!organizationId) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .schema('calendar')
        .from('event_types')
        .select('*')
        .eq('organization_id', organizationId)
        .order('title');

      if (error) throw error;

      setEventTypes(data || []);
    } catch (error) {
      console.error('Error loading event types:', error);
      showToast('Failed to load event types', 'error');
    } finally {
      setLoading(false);
    }
  }

  const handleAddEventType = () => {
    setEditingEventType(null);
    setIsFormModalOpen(true);
  };

  const handleEditEventType = (eventType: EventType) => {
    const formData = {
      ...eventType,
      duration: eventType.duration_minutes,
    };
    setEditingEventType(formData as any);
    setIsFormModalOpen(true);
  };

  const getBookingModeLabel = (mode: string) => {
    const labels: Record<string, string> = {
      'appointment': 'Appointment',
      'queue': 'Queue',
      'arrival-window': 'Arrival Window',
      'open-shift': 'Open Shift',
    };
    return labels[mode] || mode;
  };

  const getBookingModeColor = (mode: string) => {
    const colors: Record<string, string> = {
      'appointment': 'bg-blue-50 text-blue-700',
      'queue': 'bg-amber-50 text-amber-700',
      'arrival-window': 'bg-green-50 text-green-700',
      'open-shift': 'bg-indigo-50 text-indigo-700',
    };
    return colors[mode] || 'bg-gray-50 text-gray-700';
  };

  const getAssignmentStrategyLabel = (strategy: string) => {
    const labels: Record<string, string> = {
      'round-robin': 'Round Robin',
      'geo-clustered': 'Geo-Clustered',
      'skill-based': 'Skill-Based',
      'load-balanced': 'Load-Balanced',
      'manual': 'Manual',
    };
    return labels[strategy] || strategy;
  };

  const handleDeleteClick = (eventType: EventType) => {
    setDeletingEventType(eventType);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingEventType) return;

    try {
      const { error } = await supabase
        .schema('calendar')
        .from('event_types')
        .delete()
        .eq('id', deletingEventType.id);

      if (error) throw error;

      showToast(`${deletingEventType.title} deleted successfully`, 'success');
      loadEventTypes();
    } catch (error) {
      console.error('Error deleting event type:', error);
      showToast('Failed to delete event type', 'error');
    } finally {
      setIsDeleteDialogOpen(false);
      setDeletingEventType(null);
    }
  };

  const handleSubmitForm = async (data: EventTypeFormData) => {
    if (!organizationId) return;

    try {
      let eventTypeId: string;

      if (editingEventType) {
        const { error } = await supabase
          .schema('calendar')
          .from('event_types')
          .update({
            title: data.title,
            slug: data.slug,
            duration_minutes: data.duration,
            description: data.description,
            color: data.color,
            capacity_limit: data.capacity_limit || null,
            requires_multi_resource: data.requires_multi_resource,
            credit_cost: data.credit_cost || null,
            buffer_minutes: data.buffer_minutes || null,
            is_active: data.is_active,
            booking_mode: data.booking_mode || 'appointment',
            assignment_strategy: data.assignment_strategy || 'round-robin',
            location_id: data.location_id || null,
          })
          .eq('id', editingEventType.id);

        if (error) throw error;
        eventTypeId = editingEventType.id;

        showToast(`${data.title} updated successfully`, 'success');
      } else {
        const { data: insertedData, error } = await supabase
          .schema('calendar')
          .from('event_types')
          .insert({
            organization_id: organizationId,
            title: data.title,
            slug: data.slug,
            duration_minutes: data.duration,
            description: data.description,
            color: data.color,
            capacity_limit: data.capacity_limit || null,
            requires_multi_resource: data.requires_multi_resource,
            credit_cost: data.credit_cost || null,
            buffer_minutes: data.buffer_minutes || null,
            is_active: data.is_active,
            booking_mode: data.booking_mode || 'appointment',
            assignment_strategy: data.assignment_strategy || 'round-robin',
            location_id: data.location_id || null,
          })
          .select()
          .single();

        if (error) throw error;
        eventTypeId = insertedData.id;

        showToast(`${data.title} created successfully`, 'success');
      }

      // Handle resource requirements
      if (data.resource_requirements && data.resource_requirements.length > 0) {
        // Delete existing resource requirements
        await supabase
          .schema('calendar')
          .from('event_type_resources')
          .delete()
          .eq('event_type_id', eventTypeId);

        // Insert new resource requirements
        for (const req of data.resource_requirements) {
          if (req.specificResourceIds && req.specificResourceIds.length > 0) {
            // Insert multiple rows for specific resources
            const resourceRows = req.specificResourceIds.map(resourceId => ({
              event_type_id: eventTypeId,
              resource_id: resourceId,
              role: req.role,
              is_required: req.isRequired,
            }));

            await supabase
              .schema('calendar')
              .from('event_type_resources')
              .insert(resourceRows);
          }
        }
      }

      loadEventTypes();
      setIsFormModalOpen(false);
      setEditingEventType(null);
    } catch (error) {
      console.error('Error saving event type:', error);
      throw error;
    }
  };

  if (!organizationId) {
    return (
      <div className="text-center py-12 text-gray-500">
        Select an organization to manage event types
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Event Types</h2>
          <p className="text-gray-500 mt-1">Configure bookable services and appointments</p>
        </div>
        <button
          onClick={handleAddEventType}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Event Type</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {eventTypes.map((eventType) => (
          <div
            key={eventType.id}
            className={`bg-white border rounded-lg p-6 hover:shadow-lg transition-shadow ${eventType.is_active ? 'border-gray-200' : 'border-gray-300 opacity-60'
              }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3 flex-1">
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: eventType.color }}
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{eventType.title}</h3>
                  <p className="text-xs text-gray-500">/{eventType.slug}</p>
                </div>
              </div>
              {!eventType.is_active && (
                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded font-medium flex-shrink-0">
                  Inactive
                </span>
              )}
            </div>

            <p className="text-sm text-gray-600 mb-4 line-clamp-2">{eventType.description}</p>

            <div className="flex flex-wrap gap-2 mb-4">
              <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getBookingModeColor(eventType.booking_mode)}`}>
                {getBookingModeLabel(eventType.booking_mode)}
              </span>
              <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                {getAssignmentStrategyLabel(eventType.assignment_strategy)}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-gray-700">{eventType.duration_minutes} minutes</span>
              </div>

              {eventType.buffer_minutes && eventType.buffer_minutes > 0 && (
                <div className="flex items-center space-x-2 text-sm">
                  <Tag className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">{eventType.buffer_minutes} min buffer</span>
                </div>
              )}

              {eventType.capacity_limit && (
                <div className="flex items-center space-x-2 text-sm">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">Capacity: {eventType.capacity_limit}</span>
                </div>
              )}

              {eventType.credit_cost && eventType.credit_cost > 0 && (
                <div className="flex items-center space-x-2 text-sm">
                  <CreditCard className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">{eventType.credit_cost} credits</span>
                </div>
              )}

              {eventType.requires_multi_resource && (
                <div className="inline-flex items-center px-2 py-1 bg-orange-50 text-orange-700 rounded text-xs font-medium">
                  Multi-Resource Required
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2 mt-4 pt-4 border-t border-gray-100">
              <button
                onClick={() => handleEditEventType(eventType)}
                className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
              >
                <Edit className="w-4 h-4" />
                <span>Edit</span>
              </button>
              <button
                onClick={() => handleDeleteClick(eventType)}
                className="flex items-center justify-center px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {eventTypes.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No event types configured yet</p>
          <button
            onClick={handleAddEventType}
            className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
          >
            Create your first event type
          </button>
        </div>
      )}

      <EventTypeFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingEventType(null);
        }}
        onSubmit={handleSubmitForm}
        initialData={editingEventType as any}
        organizationId={organizationId || ''}
      />

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setDeletingEventType(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Event Type"
        message={`Are you sure you want to delete ${deletingEventType?.title}? This will also delete all associated bookings.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
