import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Users,
  Plus,
  Search,
  Filter,
  Loader2,
  User,
  DoorOpen,
  Wrench,
  Truck,
  Package,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Calendar,
} from 'lucide-react';
import { ResourceFormModal, ResourceFormData } from '../modals/ResourceFormModal';
import { CalendarIntegrationModal } from '../modals/CalendarIntegrationModal';
import { ConfirmDialog } from '../../common/ConfirmDialog';
import { useToast } from '../../common/Toast';

interface ResourcesTabProps {
  organizationId: string | null;
}

interface Resource {
  id: string;
  type: string;
  name: string;
  email?: string;
  phone?: string;
  status: string;
  timezone: string;
  metadata: any;
}

const resourceTypeIcons = {
  person: User,
  room: DoorOpen,
  equipment: Wrench,
  vehicle: Truck,
  asset: Package,
};

const statusColors = {
  active: 'text-green-600 bg-green-50',
  inactive: 'text-gray-600 bg-gray-50',
  maintenance: 'text-yellow-600 bg-yellow-50',
  unavailable: 'text-red-600 bg-red-50',
};

export function ResourcesTab({ organizationId }: ResourcesTabProps) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingResource, setDeletingResource] = useState<Resource | null>(null);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [calendarResource, setCalendarResource] = useState<Resource | null>(null);
  const [calendarIntegrations, setCalendarIntegrations] = useState<Record<string, number>>({});
  const { showToast } = useToast();

  useEffect(() => {
    if (organizationId) {
      loadResources();

      const subscription = supabase
        .channel(`resources-${organizationId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'calendar',
            table: 'resources',
            filter: `organization_id=eq.${organizationId}`,
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              setResources((prev) => [...prev, payload.new as Resource].sort((a, b) => a.name.localeCompare(b.name)));
            } else if (payload.eventType === 'UPDATE') {
              setResources((prev) =>
                prev.map((r) => (r.id === payload.new.id ? (payload.new as Resource) : r)).sort((a, b) => a.name.localeCompare(b.name))
              );
            } else if (payload.eventType === 'DELETE') {
              setResources((prev) => prev.filter((r) => r.id !== payload.old.id));
            }
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [organizationId]);

  async function loadResources() {
    if (!organizationId) return;

    try {
      setLoading(true);

      let query = supabase
        .schema('calendar')
        .from('resources')
        .select('*')
        .eq('organization_id', organizationId)
        .order('name');

      const { data, error } = await query;

      if (error) throw error;

      setResources(data || []);

      if (data) {
        loadCalendarIntegrations(data.map(r => r.id));
      }
    } catch (error) {
      console.error('Error loading resources:', error);
      showToast('Failed to load resources', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function loadCalendarIntegrations(resourceIds: string[]) {
    try {
      const { data, error } = await supabase
        .schema('calendar')
        .from('calendar_integrations')
        .select('resource_id, is_active')
        .in('resource_id', resourceIds);

      if (error) throw error;

      const counts: Record<string, number> = {};
      data?.forEach((integration) => {
        if (integration.is_active) {
          counts[integration.resource_id] = (counts[integration.resource_id] || 0) + 1;
        }
      });

      setCalendarIntegrations(counts);
    } catch (error) {
      console.error('Error loading calendar integrations:', error);
    }
  }

  const handleOpenCalendarModal = (resource: Resource) => {
    setCalendarResource(resource);
    setIsCalendarModalOpen(true);
  };

  const handleCloseCalendarModal = () => {
    setIsCalendarModalOpen(false);
    setCalendarResource(null);
    if (resources.length > 0) {
      loadCalendarIntegrations(resources.map(r => r.id));
    }
  };

  const handleAddResource = () => {
    setEditingResource(null);
    setIsFormModalOpen(true);
  };

  const handleEditResource = (resource: Resource) => {
    setEditingResource(resource);
    setIsFormModalOpen(true);
  };

  const handleDeleteClick = (resource: Resource) => {
    setDeletingResource(resource);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingResource) return;

    try {
      const { error } = await supabase
        .schema('calendar')
        .from('resources')
        .delete()
        .eq('id', deletingResource.id);

      if (error) throw error;

      showToast(`${deletingResource.name} deleted successfully`, 'success');
      loadResources();
    } catch (error) {
      console.error('Error deleting resource:', error);
      showToast('Failed to delete resource', 'error');
    } finally {
      setIsDeleteDialogOpen(false);
      setDeletingResource(null);
    }
  };

  const handleSubmitForm = async (data: ResourceFormData) => {
    if (!organizationId) return;

    try {
      if (editingResource) {
        const { error } = await supabase
          .schema('calendar')
          .from('resources')
          .update({
            type: data.type,
            name: data.name,
            email: data.email || null,
            phone: data.phone || null,
            status: data.status,
            timezone: data.timezone,
            metadata: data.metadata,
          })
          .eq('id', editingResource.id);

        if (error) throw error;

        showToast(`${data.name} updated successfully`, 'success');
      } else {
        const { error } = await supabase
          .schema('calendar')
          .from('resources')
          .insert({
            organization_id: organizationId,
            type: data.type,
            name: data.name,
            email: data.email || null,
            phone: data.phone || null,
            status: data.status,
            timezone: data.timezone,
            metadata: data.metadata,
          });

        if (error) throw error;

        showToast(`${data.name} created successfully`, 'success');
      }

      loadResources();
      setIsFormModalOpen(false);
      setEditingResource(null);
    } catch (error) {
      console.error('Error saving resource:', error);
      throw error;
    }
  };

  const filteredResources = resources.filter((resource) => {
    const matchesSearch =
      resource.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || resource.type === filterType;
    const matchesStatus = filterStatus === 'all' || resource.status === filterStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  const resourceStats = {
    total: resources.length,
    active: resources.filter((r) => r.status === 'active').length,
    people: resources.filter((r) => r.type === 'person').length,
    assets: resources.filter((r) => r.type !== 'person').length,
  };

  if (!organizationId) {
    return (
      <div className="text-center py-12 text-gray-500">
        Select an organization to manage resources
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
          <h2 className="text-2xl font-bold text-gray-900">Resources</h2>
          <p className="text-gray-500 mt-1">Manage people, rooms, equipment, and assets</p>
        </div>
        <button
          onClick={handleAddResource}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Resource</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900">{resourceStats.total}</div>
          <div className="text-sm text-gray-500 mt-1">Total Resources</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">{resourceStats.active}</div>
          <div className="text-sm text-gray-500 mt-1">Active Now</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">{resourceStats.people}</div>
          <div className="text-sm text-gray-500 mt-1">People</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-600">{resourceStats.assets}</div>
          <div className="text-sm text-gray-500 mt-1">Assets</div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search resources by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Types</option>
          <option value="person">People</option>
          <option value="room">Rooms</option>
          <option value="equipment">Equipment</option>
          <option value="vehicle">Vehicles</option>
          <option value="asset">Assets</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="maintenance">Maintenance</option>
          <option value="unavailable">Unavailable</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredResources.map((resource) => {
          const Icon = resourceTypeIcons[resource.type as keyof typeof resourceTypeIcons] || Package;
          const statusClass = statusColors[resource.status as keyof typeof statusColors] || statusColors.active;
          const calendarCount = calendarIntegrations[resource.id] || 0;

          return (
            <div
              key={resource.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-50 text-blue-600 p-2 rounded-lg">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{resource.name}</h3>
                    <p className="text-xs text-gray-500 capitalize">{resource.type}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {calendarCount > 0 && (
                    <span className="inline-flex items-center px-2 py-1 bg-green-50 text-green-700 rounded text-xs font-medium">
                      <Calendar className="w-3 h-3 mr-1" />
                      {calendarCount}
                    </span>
                  )}
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusClass}`}>
                    {resource.status}
                  </span>
                </div>
              </div>

              {resource.email && (
                <div className="text-sm text-gray-600 mb-1">{resource.email}</div>
              )}
              {resource.phone && (
                <div className="text-sm text-gray-600 mb-1">{resource.phone}</div>
              )}
              <div className="text-xs text-gray-500 mb-3">{resource.timezone}</div>

              {resource.metadata && Object.keys(resource.metadata).length > 0 && (
                <div className="mb-3 p-2 bg-gray-50 rounded text-xs space-y-1">
                  {Object.entries(resource.metadata).slice(0, 3).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-gray-500 capitalize">{key.replace(/_/g, ' ')}:</span>
                      <span className="text-gray-700 font-medium">{String(value)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center space-x-2 pt-3 border-t border-gray-100">
                <button
                  onClick={() => handleOpenCalendarModal(resource)}
                  className="flex items-center justify-center px-3 py-2 text-sm text-green-600 hover:bg-green-50 rounded transition-colors"
                  title="Manage calendar integrations"
                >
                  <Calendar className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleEditResource(resource)}
                  className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleDeleteClick(resource)}
                  className="flex items-center justify-center px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredResources.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No resources found matching your criteria</p>
        </div>
      )}

      <ResourceFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingResource(null);
        }}
        onSubmit={handleSubmitForm}
        initialData={editingResource || undefined}
        organizationId={organizationId || ''}
      />

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setDeletingResource(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Resource"
        message={`Are you sure you want to delete ${deletingResource?.name}? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />

      {calendarResource && (
        <CalendarIntegrationModal
          isOpen={isCalendarModalOpen}
          onClose={handleCloseCalendarModal}
          resourceId={calendarResource.id}
          resourceName={calendarResource.name}
        />
      )}
    </div>
  );
}
