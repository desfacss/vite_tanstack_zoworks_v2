import { Calendar, Clock, ArrowRight, Users, Tag, CreditCard } from 'lucide-react';
import { EventType, UserProfile, UseCaseConfig } from '../lib/types';
import { SeedDataButton } from './admin/SeedDataButton';

interface HomePageProps {
  user: UserProfile | null;
  eventTypes: EventType[];
  onSelectEventType: (eventType: EventType) => void;
  selectedUseCase?: UseCaseConfig | null;
}

export default function HomePage({
  user,
  eventTypes,
  onSelectEventType,
  selectedUseCase,
}: HomePageProps) {
  const activeEventTypes = eventTypes.filter(et => et.is_active);

  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      {/* Header / Intro */}
      <div className="text-center mb-12">
        <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-blue-50">
          <Calendar className="w-10 h-10 text-blue-600" />
        </div>
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">
          {selectedUseCase?.name || 'Public Booking Page'}
        </h1>
        <p className="text-lg text-gray-600 max-w-xl mx-auto leading-relaxed">
          Welcome to our scheduling portal. Please select a service below to view availability and book an appointment.
        </p>
      </div>

      {/* Event Types List */}
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Available Services</h2>
            <p className="text-sm text-gray-500">Choose the type of meeting you'd like to schedule</p>
          </div>
          <div className="bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm">
            <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
              {activeEventTypes.length} Options
            </span>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {activeEventTypes.length > 0 ? (
            activeEventTypes.map((eventType) => {
              const getBookingModeLabel = (mode: string) => {
                const labels: Record<string, string> = {
                  'appointment': 'Appointment',
                  'queue': 'Immediate Queue',
                  'arrival-window': 'Arrival Window',
                  'open-shift': 'Open Shift Claim',
                };
                return labels[mode || 'appointment'] || mode;
              };

              const isRequestToBook = eventType.booking_mode === 'appointment' &&
                (selectedUseCase?.config_json.confirmation_model === 'request-to-book' ||
                  (eventType as any).requires_approval);

              const isQueueModel = eventType.booking_mode === 'queue';
              const isCreditModel = eventType.credit_cost && eventType.credit_cost > 0;

              return (
                <button
                  key={eventType.id}
                  onClick={() => onSelectEventType(eventType)}
                  className="w-full p-6 text-left hover:bg-blue-50/50 transition-all group relative border-l-4 border-transparent hover:border-blue-600"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex gap-4 items-start">
                      <div
                        className="w-1.5 h-12 rounded-full mt-1 flex-shrink-0"
                        style={{ backgroundColor: eventType.color || '#3B82F6' }}
                      />
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-blue-700 transition-colors flex items-center gap-2">
                          {eventType.title}
                          {isRequestToBook && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 uppercase tracking-tight border border-amber-200">
                              Approval Req.
                            </span>
                          )}
                        </h3>
                        {eventType.description && (
                          <p className="text-sm text-gray-500 mb-3 line-clamp-2 leading-relaxed">
                            {eventType.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 items-center">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                            <Clock className="w-3 h-3 mr-1.5" />
                            {eventType.duration_minutes}m
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${isQueueModel ? 'bg-amber-50 text-amber-700 border-amber-100' :
                            isCreditModel ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                              'bg-blue-50 text-blue-700 border-blue-100'
                            }`}>
                            <Tag className="w-3 h-3 mr-1.5" />
                            {getBookingModeLabel(eventType.booking_mode || 'appointment')}
                          </span>
                          {isCreditModel && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-600 text-white border border-indigo-700">
                              <CreditCard className="w-3 h-3 mr-1.5" />
                              {eventType.credit_cost} Credits
                            </span>
                          )}
                          {eventType.capacity_limit && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                              <Users className="w-3 h-3 mr-1.5" />
                              Max {eventType.capacity_limit}
                            </span>
                          )}
                          {eventType.requires_multi_resource && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-100">
                              <Users className="w-3 h-3 mr-1.5" />
                              Team Service
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-sm ${isQueueModel ? 'bg-amber-600 text-white shadow-amber-100' :
                        isRequestToBook ? 'bg-amber-500 text-white shadow-amber-50' :
                          isCreditModel ? 'bg-indigo-600 text-white shadow-indigo-100' :
                            'bg-blue-600 text-white shadow-blue-100'
                        }`}>
                        {isQueueModel ? 'Join the Queue' :
                          isRequestToBook ? 'Request to Book' :
                            isCreditModel ? 'Book with Credits' :
                              'Book Now'}
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="p-12 text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-gray-100">
                <Calendar className="w-10 h-10 text-gray-400" />
              </div>

              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {selectedUseCase ? `Welcome to ${selectedUseCase.name}` : 'No services available'}
              </h3>

              <p className="text-gray-500 max-w-sm mx-auto mb-8 leading-relaxed">
                {selectedUseCase?.category === 'facilities'
                  ? "This facility is currently transitioning to our smart scheduling system. Please check back soon or try seeding data below."
                  : selectedUseCase?.category === 'healthcare'
                    ? "Our clinical portal is being prepared for your next visit. In the meantime, please contact our front desk."
                    : "There are no active booking options for this organization yet. Please use the seed button to populate demo data."}
              </p>

              <div className="flex flex-col items-center gap-6 mt-4">
                <div className="bg-white p-2 rounded-2xl shadow-lg border border-gray-100">
                  <SeedDataButton />
                </div>
                <p className="text-xs text-gray-400 italic">
                  * Admin: Click the button above to populate this use case with high-fidelity demo data.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      {user && (
        <div className="mt-12 pt-8 border-t border-gray-200 flex flex-col items-center">
          <div className="flex items-center gap-3 mb-4">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt={user.name} className="w-10 h-10 rounded-full object-cover shadow-sm border border-white" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-500">
                {user.name.charAt(0)}
              </div>
            )}
            <div className="text-left">
              <p className="text-sm font-bold text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-500">Manager</p>
            </div>
          </div>
          {user.bio && (
            <p className="text-sm text-gray-600 text-center max-w-lg leading-relaxed italic">
              "{user.bio}"
            </p>
          )}
        </div>
      )}
    </div>
  );
}
