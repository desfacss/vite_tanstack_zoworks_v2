import { Clock, Link2, Eye, ToggleLeft, ToggleRight, Users, CreditCard, Tag } from 'lucide-react';
import { EventType } from '../lib/types';

interface EventTypeCardProps {
  eventType: EventType;
  onView: (eventType: EventType) => void;
  onCopyLink: (slug: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
}

export default function EventTypeCard({
  eventType,
  onView,
  onCopyLink,
  onToggleActive,
}: EventTypeCardProps) {
  const handleCopyLink = () => {
    const link = `${window.location.origin}/${eventType.slug}`;
    navigator.clipboard.writeText(link);
    onCopyLink(eventType.slug);
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
      'open-shift': 'bg-violet-50 text-violet-700',
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

  return (
    <div className="bg-white rounded-lg border-2 border-gray-200 p-6 hover:border-blue-300 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-4 h-4 rounded-full flex-shrink-0"
              style={{ backgroundColor: eventType.color }}
            />
            <h3 className="text-lg font-semibold text-gray-900">{eventType.title}</h3>
          </div>
          {eventType.description && (
            <p className="text-gray-600 text-sm mb-3 line-clamp-2">{eventType.description}</p>
          )}

          <div className="flex flex-wrap gap-2 mb-3">
            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getBookingModeColor(eventType.booking_mode || '')}`}>
              {getBookingModeLabel(eventType.booking_mode || '')}
            </span>
            <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
              {getAssignmentStrategyLabel(eventType.assignment_strategy || '')}
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="w-4 h-4" />
              <span className="text-sm">{eventType.duration_minutes} min</span>
            </div>

            {eventType.buffer_minutes && eventType.buffer_minutes > 0 && (
              <div className="flex items-center gap-2 text-gray-600">
                <Tag className="w-4 h-4" />
                <span className="text-sm">{eventType.buffer_minutes} min buffer</span>
              </div>
            )}

            {eventType.capacity_limit && (
              <div className="flex items-center gap-2 text-gray-600">
                <Users className="w-4 h-4" />
                <span className="text-sm">Max {eventType.capacity_limit} participants</span>
              </div>
            )}

            {eventType.credit_cost && eventType.credit_cost > 0 && (
              <div className="flex items-center gap-2 text-gray-600">
                <CreditCard className="w-4 h-4" />
                <span className="text-sm">{eventType.credit_cost} credits</span>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => onToggleActive(eventType.id, !eventType.is_active)}
          className={`p-2 rounded-lg transition-colors flex-shrink-0 ${eventType.is_active
            ? 'text-green-600 hover:bg-green-50'
            : 'text-gray-400 hover:bg-gray-50'
            }`}
          title={eventType.is_active ? 'Active' : 'Inactive'}
        >
          {eventType.is_active ? (
            <ToggleRight className="w-6 h-6" />
          ) : (
            <ToggleLeft className="w-6 h-6" />
          )}
        </button>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onView(eventType)}
          className="flex-1 py-2 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          <Eye className="w-4 h-4" />
          View Booking Page
        </button>
        <button
          onClick={handleCopyLink}
          className="py-2 px-4 border-2 border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          title="Copy booking link"
        >
          <Link2 className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-3 pt-3 border-t">
        <p className="text-xs text-gray-500 font-mono">/{eventType.slug}</p>
      </div>
    </div>
  );
}
