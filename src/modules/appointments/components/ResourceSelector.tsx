import { Resource } from '../lib/types';
import { User, Calendar, MapPin } from 'lucide-react';

interface ResourceSelectorProps {
  resources: Resource[];
  selectedResourceId: string | null;
  onSelectResource: (resourceId: string) => void;
  assignmentStrategy?: string;
  showAutoAssigned?: boolean;
  autoAssignedResource?: Resource | null;
}

export default function ResourceSelector({
  resources,
  selectedResourceId,
  onSelectResource,
  assignmentStrategy,
  showAutoAssigned = false,
  autoAssignedResource = null,
}: ResourceSelectorProps) {
  if (showAutoAssigned && autoAssignedResource) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            {autoAssignedResource.avatar_url ? (
              <img
                src={autoAssignedResource.avatar_url}
                alt={autoAssignedResource.name}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-green-900">Assigned Provider</span>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                {assignmentStrategy === 'round-robin' && 'Round Robin'}
                {assignmentStrategy === 'load-balanced' && 'Load Balanced'}
                {assignmentStrategy === 'first-available' && 'First Available'}
                {assignmentStrategy === 'geo-clustered' && 'Nearest Location'}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{autoAssignedResource.name}</h3>
            {autoAssignedResource.email && (
              <p className="text-sm text-gray-600">{autoAssignedResource.email}</p>
            )}
            {autoAssignedResource.metadata?.location && (
              <div className="flex items-center gap-1 mt-1 text-sm text-gray-600">
                <MapPin className="w-3 h-3" />
                <span>{autoAssignedResource.metadata.location}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (assignmentStrategy === 'manual' && resources.length > 0) {
    return (
      <div className="space-y-3">
        <label className="block">
          <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <User className="w-4 h-4" />
            Select a Service Provider
          </span>
          <p className="text-xs text-gray-500 mt-1 mb-3">
            Choose who you'd like to book with
          </p>
        </label>

        <div className="grid grid-cols-1 gap-3">
          {resources.map(resource => (
            <button
              key={resource.id}
              onClick={() => onSelectResource(resource.id)}
              className={`p-4 rounded-lg border-2 transition-all text-left ${selectedResourceId === resource.id
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  {resource.avatar_url ? (
                    <img
                      src={resource.avatar_url}
                      alt={resource.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${selectedResourceId === resource.id ? 'bg-blue-600' : 'bg-gray-400'
                      }`}>
                      <User className="w-6 h-6 text-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-gray-900">
                    {resource.name}
                  </h3>
                  {resource.email && (
                    <p className="text-sm text-gray-600 truncate">{resource.email}</p>
                  )}
                  {resource.metadata?.specialties && Array.isArray(resource.metadata.specialties) && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {resource.metadata.specialties.slice(0, 3).map((specialty: string, idx: number) => (
                        <span
                          key={idx}
                          className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full"
                        >
                          {specialty}
                        </span>
                      ))}
                    </div>
                  )}
                  {resource.metadata?.location && (
                    <div className="flex items-center gap-1 mt-2 text-sm text-gray-600">
                      <MapPin className="w-3 h-3" />
                      <span className="text-xs">{resource.metadata.location}</span>
                    </div>
                  )}
                </div>
                {selectedResourceId === resource.id && (
                  <div className="flex-shrink-0">
                    <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
