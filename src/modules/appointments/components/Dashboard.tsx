import { EventType, UserProfile, UseCaseConfig } from '../lib/types';
import DashboardHeader from './DashboardHeader';
import EventTypeCard from './EventTypeCard';
import UseCaseBanner from './UseCaseBanner';
import { Calendar, ArrowLeft } from 'lucide-react';

interface DashboardProps {
  user: UserProfile;
  eventTypes: EventType[];
  onViewEventType: (eventType: EventType) => void;
  onCopyLink: (slug: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
  onBackToHome?: () => void;
  onBackToUseCaseHome?: () => void;
  selectedUseCase?: UseCaseConfig | null;
}

export default function Dashboard({
  user,
  eventTypes,
  onViewEventType,
  onCopyLink,
  onToggleActive,
  onBackToHome,
  onBackToUseCaseHome,
  selectedUseCase,
}: DashboardProps) {
  const getModeSpecificContent = () => {
    if (!selectedUseCase) return null;

    const config = selectedUseCase.config_json;

    return (
      <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-lg mb-8">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">
          {selectedUseCase.name} Configuration
        </h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          {config.scheduling_mode === 'panel' && (
            <div className="bg-white p-4 rounded-lg">
              <div className="font-semibold text-gray-900 mb-1">Panel Scheduling</div>
              <div className="text-gray-600">
                Requires multiple team members. Calendar shows overlapping availability only.
              </div>
            </div>
          )}

          {config.scheduling_mode === '1-to-many' && (
            <div className="bg-white p-4 rounded-lg">
              <div className="font-semibold text-gray-900 mb-1">Group Capacity</div>
              <div className="text-gray-600">
                Capacity: {config.capacity_limit || 'Unlimited'}
                {config.waitlist_enabled && ' • Waitlist enabled'}
              </div>
            </div>
          )}

          {config.assignment_strategy === 'round-robin' && (
            <div className="bg-white p-4 rounded-lg">
              <div className="font-semibold text-gray-900 mb-1">Round Robin Assignment</div>
              <div className="text-gray-600">
                Bookings distributed fairly across available team members
              </div>
            </div>
          )}

          {config.assignment_strategy === 'geo-clustered' && (
            <div className="bg-white p-4 rounded-lg">
              <div className="font-semibold text-gray-900 mb-1">Geo-Clustering</div>
              <div className="text-gray-600">
                Assigns resources based on location proximity and travel time
              </div>
            </div>
          )}

          {config.credit_system_enabled && (
            <div className="bg-white p-4 rounded-lg">
              <div className="font-semibold text-gray-900 mb-1">Credit System</div>
              <div className="text-gray-600">
                Clients use prepaid credits. Track consumption and balances.
              </div>
            </div>
          )}

          {config.scheduling_mode === 'asset-booking' && (
            <div className="bg-white p-4 rounded-lg">
              <div className="font-semibold text-gray-900 mb-1">Asset Booking</div>
              <div className="text-gray-600">
                Schedule equipment, vehicles, or facilities instead of people
              </div>
            </div>
          )}

          {config.scheduling_mode === 'broadcast-claim' && (
            <div className="bg-white p-4 rounded-lg">
              <div className="font-semibold text-gray-900 mb-1">Shift Broadcasting</div>
              <div className="text-gray-600">
                Post open shifts. Qualified staff claim on first-come basis.
              </div>
            </div>
          )}

          {config.buffer_strategy && config.buffer_strategy !== 'none' && (
            <div className="bg-white p-4 rounded-lg">
              <div className="font-semibold text-gray-900 mb-1">Buffer Time</div>
              <div className="text-gray-600">
                {config.buffer_minutes} min {config.buffer_strategy} buffer between bookings
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {selectedUseCase && onBackToUseCaseHome && (
        <UseCaseBanner useCase={selectedUseCase} mode="admin" onBack={onBackToUseCaseHome} />
      )}
      <DashboardHeader user={user} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {onBackToHome && !selectedUseCase && (
          <button
            onClick={onBackToHome}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>
        )}

        {getModeSpecificContent()}

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Event Types</h2>
          <p className="text-gray-600">
            Create and manage your meeting types. Share links with others to let them book time with you.
          </p>
        </div>

        {eventTypes.length === 0 ? (
          <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No event types yet</h3>
            <p className="text-gray-600 mb-6">
              Create your first event type to start accepting bookings
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {eventTypes.map((eventType) => (
              <EventTypeCard
                key={eventType.id}
                eventType={eventType}
                onView={onViewEventType}
                onCopyLink={onCopyLink}
                onToggleActive={onToggleActive}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
