import React, { useEffect, useState } from 'react';
import { Plus, X, Users, User, DoorOpen, Truck, Package, Wrench } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Resource, ResourceType } from '../../../lib/types';

export interface ResourceRequirement {
  id: string;
  resourceType: ResourceType;
  quantity: number;
  selectionStrategy: 'any-available' | 'specific-resource' | 'skill-based' | 'location-based';
  specificResourceIds?: string[];
  requiredSkillIds?: string[];
  role: 'primary' | 'secondary' | 'optional';
  isRequired: boolean;
}

interface ResourceRequirementsBuilderProps {
  organizationId: string;
  requirements: ResourceRequirement[];
  onChange: (requirements: ResourceRequirement[]) => void;
}

const RESOURCE_TYPE_ICONS: Record<ResourceType, React.ReactNode> = {
  person: <User className="w-4 h-4" />,
  room: <DoorOpen className="w-4 h-4" />,
  equipment: <Wrench className="w-4 h-4" />,
  vehicle: <Truck className="w-4 h-4" />,
  asset: <Package className="w-4 h-4" />,
};

const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  person: 'Person',
  room: 'Room',
  equipment: 'Equipment',
  vehicle: 'Vehicle',
  asset: 'Asset',
};

export function ResourceRequirementsBuilder({
  organizationId,
  requirements,
  onChange,
}: ResourceRequirementsBuilderProps) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadResources();
  }, [organizationId]);

  async function loadResources() {
    try {
      const { data, error } = await supabase
        .schema('calendar')
        .from('resources')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setResources(data || []);
    } catch (error) {
      console.error('Error loading resources:', error);
    } finally {
      setLoading(false);
    }
  }

  const addRequirement = () => {
    const newReq: ResourceRequirement = {
      id: crypto.randomUUID(),
      resourceType: 'person',
      quantity: 1,
      selectionStrategy: 'any-available',
      role: 'primary',
      isRequired: true,
    };
    onChange([...requirements, newReq]);
  };

  const updateRequirement = (id: string, updates: Partial<ResourceRequirement>) => {
    onChange(
      requirements.map((req) =>
        req.id === id ? { ...req, ...updates } : req
      )
    );
  };

  const removeRequirement = (id: string) => {
    onChange(requirements.filter((req) => req.id !== id));
  };

  const getResourcesByType = (type: ResourceType) => {
    return resources.filter((r) => r.type === type);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          Resource Requirements
        </label>
        <button
          type="button"
          onClick={addRequirement}
          className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700"
        >
          <Plus className="w-4 h-4" />
          <span>Add Resource</span>
        </button>
      </div>

      {requirements.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No resource requirements defined</p>
          <p className="text-xs text-gray-400 mt-1">
            Click "Add Resource" to specify resources needed for this service
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requirements.map((req, index) => (
            <div key={req.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center text-blue-600">
                    {RESOURCE_TYPE_ICONS[req.resourceType]}
                  </div>
                  <span className="font-medium text-gray-900">
                    Resource #{index + 1}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeRequirement(req.id)}
                  className="text-gray-400 hover:text-red-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Resource Type *
                  </label>
                  <select
                    value={req.resourceType}
                    onChange={(e) =>
                      updateRequirement(req.id, {
                        resourceType: e.target.value as ResourceType,
                        specificResourceIds: [],
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {(Object.keys(RESOURCE_TYPE_LABELS) as ResourceType[]).map((type) => (
                      <option key={type} value={type}>
                        {RESOURCE_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={req.quantity}
                    onChange={(e) =>
                      updateRequirement(req.id, {
                        quantity: parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Selection Strategy *
                  </label>
                  <select
                    value={req.selectionStrategy}
                    onChange={(e) =>
                      updateRequirement(req.id, {
                        selectionStrategy: e.target.value as any,
                        specificResourceIds: [],
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="any-available">Any Available</option>
                    <option value="specific-resource">Specific Resource</option>
                    <option value="skill-based">Skill-Based</option>
                    <option value="location-based">Location-Based</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Role *
                  </label>
                  <select
                    value={req.role}
                    onChange={(e) =>
                      updateRequirement(req.id, {
                        role: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="primary">Primary</option>
                    <option value="secondary">Secondary</option>
                    <option value="optional">Optional</option>
                  </select>
                </div>
              </div>

              {req.selectionStrategy === 'specific-resource' && (
                <div className="mt-3">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Select Specific Resources
                  </label>
                  <select
                    multiple
                    value={req.specificResourceIds || []}
                    onChange={(e) => {
                      const selected = Array.from(
                        e.target.selectedOptions,
                        (option) => option.value
                      );
                      updateRequirement(req.id, {
                        specificResourceIds: selected,
                      });
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    size={3}
                  >
                    {getResourcesByType(req.resourceType).map((resource) => (
                      <option key={resource.id} value={resource.id}>
                        {resource.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Hold Ctrl/Cmd to select multiple resources
                  </p>
                </div>
              )}

              <div className="flex items-center mt-3">
                <input
                  type="checkbox"
                  id={`required-${req.id}`}
                  checked={req.isRequired}
                  onChange={(e) =>
                    updateRequirement(req.id, {
                      isRequired: e.target.checked,
                    })
                  }
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label
                  htmlFor={`required-${req.id}`}
                  className="ml-2 text-xs font-medium text-gray-600"
                >
                  This resource is required for booking
                </label>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs text-blue-800">
          <strong>Selection Strategies:</strong>
        </p>
        <ul className="text-xs text-blue-700 mt-1 space-y-1">
          <li>• <strong>Any Available:</strong> System auto-assigns any qualified resource</li>
          <li>• <strong>Specific Resource:</strong> Customer must choose from selected resources</li>
          <li>• <strong>Skill-Based:</strong> Match based on required skills/certifications</li>
          <li>• <strong>Location-Based:</strong> Assign nearest resource to customer location</li>
        </ul>
      </div>
    </div>
  );
}
