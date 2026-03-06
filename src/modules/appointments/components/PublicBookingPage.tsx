import React, { useState, useEffect } from 'react';
import {
  EventType,
  UserProfile,
  TimeSlot,
  AvailabilityRule,
  DateOverride,
  Booking,
  UseCaseConfig,
  Resource,
  ResourceAvailabilityRule,
  ResourceDateOverride,
  EventTypeResource,
} from '../lib/types';
import CalendarView from './CalendarView';
import TimeSlotPicker from './TimeSlotPicker';
import TimezoneSelector from './TimezoneSelector';
import BookingForm from './BookingForm';
import UseCaseBanner from './UseCaseBanner';
import ResourceSelector from './ResourceSelector';
import BookingModeFactory from './booking/modes/BookingModeFactory';
import { detectUserTimezone } from '../lib/utils/timezoneUtils';
import { generateAvailableSlots, getAvailableDatesInMonth } from '../lib/utils/availabilityUtils';
import {
  generateUnifiedAvailableSlots,
  getAvailableDatesInMonthForResources,
  assignResourceByStrategy,
  getAvailableResourcesForSlot,
} from '../lib/utils/resourceAvailabilityUtils';
import { CreditCard, ArrowLeft, Clock, Tag, Users, Calendar } from 'lucide-react';

interface PublicBookingPageProps {
  user: UserProfile;
  eventType: EventType;
  availabilityRules: AvailabilityRule[];
  dateOverrides: DateOverride[];
  bookings: Booking[];
  resources: Resource[];
  resourceAvailabilityRules: ResourceAvailabilityRule[];
  resourceDateOverrides: ResourceDateOverride[];
  eventTypeResources: EventTypeResource[];
  bookingResources: any[];
  onBookingSubmit: (data: {
    name: string;
    email: string;
    notes: string;
    selectedDate: Date;
    selectedSlot: TimeSlot;
    timezone: string;
    assignedResourceId?: string;
  }) => void;
  onBack: () => void;
  onBackToUseCaseHome?: () => void;
  isLoading?: boolean;
  selectedUseCase?: UseCaseConfig | null;
}

export default function PublicBookingPage({
  user,
  eventType,
  availabilityRules,
  dateOverrides,
  bookings,
  resources,
  resourceAvailabilityRules,
  resourceDateOverrides,
  eventTypeResources,
  bookingResources,
  onBookingSubmit,
  onBack,
  onBackToUseCaseHome,
  isLoading = false,
  selectedUseCase,
}: PublicBookingPageProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [timezone, setTimezone] = useState(detectUserTimezone());
  const [availableDates, setAvailableDates] = useState<Date[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [assignedResource, setAssignedResource] = useState<Resource | null>(null);

  const eventTypeResourceList = eventTypeResources
    .filter(etr => etr.event_type_id === eventType.id && etr.role === 'primary')
    .map(etr => resources.find(r => r.id === etr.resource_id))
    .filter((r): r is Resource => r !== undefined);

  const hasResources = eventTypeResourceList.length > 0;

  useEffect(() => {
    if (hasResources) {
      const dates = getAvailableDatesInMonthForResources(
        currentMonth,
        eventType.duration_minutes,
        resources,
        eventTypeResources,
        eventType.id,
        resourceAvailabilityRules,
        resourceDateOverrides,
        bookings,
        eventType.requires_multi_resource,
        bookingResources,
        selectedResourceId || undefined
      );
      setAvailableDates(dates);
    } else {
      const dates = getAvailableDatesInMonth(
        currentMonth,
        eventType.duration_minutes,
        availabilityRules,
        dateOverrides,
        bookings
      );
      setAvailableDates(dates);
    }
  }, [
    currentMonth,
    eventType.duration_minutes,
    eventType.id,
    availabilityRules,
    dateOverrides,
    bookings,
    hasResources,
    resources,
    eventTypeResources,
    resourceAvailabilityRules,
    resourceDateOverrides,
    selectedResourceId,
  ]);

  useEffect(() => {
    if (selectedDate) {
      if (hasResources) {
        if (eventType.assignment_strategy === 'manual' && !selectedResourceId) {
          setTimeSlots([]);
          setSelectedSlot(null);
          return;
        }

        const slots = generateUnifiedAvailableSlots(
          selectedDate,
          eventType.duration_minutes,
          resources,
          eventTypeResources,
          eventType.id,
          resourceAvailabilityRules,
          resourceDateOverrides,
          bookings,
          eventType.capacity_limit,
          eventType.requires_multi_resource,
          bookingResources,
          selectedResourceId || undefined
        );
        setTimeSlots(slots);
      } else {
        const slots = generateAvailableSlots(
          selectedDate,
          eventType.duration_minutes,
          availabilityRules,
          dateOverrides,
          bookings
        );
        setTimeSlots(slots);
      }
      setSelectedSlot(null);
    } else {
      setTimeSlots([]);
    }
  }, [
    selectedDate,
    eventType.duration_minutes,
    eventType.id,
    eventType.capacity_limit,
    eventType.assignment_strategy,
    availabilityRules,
    dateOverrides,
    bookings,
    hasResources,
    resources,
    eventTypeResources,
    resourceAvailabilityRules,
    resourceDateOverrides,
    selectedResourceId,
  ]);

  useEffect(() => {
    if (
      hasResources &&
      eventType.assignment_strategy &&
      eventType.assignment_strategy !== 'manual' &&
      selectedDate &&
      selectedSlot
    ) {
      const availableResources = getAvailableResourcesForSlot(
        selectedDate,
        selectedSlot.time,
        eventType.duration_minutes,
        eventTypeResourceList,
        resourceAvailabilityRules,
        resourceDateOverrides,
        bookings
      );

      const assigned = assignResourceByStrategy(
        availableResources,
        eventType.assignment_strategy,
        bookings
      );

      setAssignedResource(assigned);
      if (assigned) {
        setSelectedResourceId(assigned.id);
      }
    }
  }, [
    hasResources,
    eventType.assignment_strategy,
    eventType.duration_minutes,
    eventType.id,
    selectedDate,
    selectedSlot,
    eventTypeResourceList,
    resourceAvailabilityRules,
    resourceDateOverrides,
    bookings,
  ]);

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  const handleMonthChange = (month: Date) => {
    setCurrentMonth(month);
    setSelectedDate(null);
  };

  const handleFormSubmit = (formData: { name: string; email: string; notes: string }) => {
    if (selectedDate && selectedSlot) {
      // Find all required resources for this event type to include in the booking
      const requiredResourceIds = eventTypeResources
        .filter(etr => etr.event_type_id === eventType.id && etr.is_required)
        .map(etr => etr.resource_id);

      // Add the selected primary resource if not already in the list
      if (selectedResourceId && !requiredResourceIds.includes(selectedResourceId)) {
        requiredResourceIds.push(selectedResourceId);
      }

      onBookingSubmit({
        ...formData,
        selectedDate,
        selectedSlot,
        timezone,
        assignedResourceId: selectedResourceId || undefined,
        // We might need to extend onBookingSubmit to handle multiple resource IDs
        // For now, we'll pass the additional ones in metadata or expect the backend to handle it
      });
    }
  };

  const handleResourceSelect = (resourceId: string) => {
    setSelectedResourceId(resourceId);
    setSelectedDate(null);
    setSelectedSlot(null);
  };

  const getModeInfoPanel = () => {
    if (!selectedUseCase) return null;

    const config = selectedUseCase.config_json;

    return (
      <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg mb-6">
        <h4 className="text-sm font-semibold text-green-900 mb-2">
          Demo Mode: {selectedUseCase.name}
        </h4>
        <div className="text-xs text-green-800 space-y-1">
          {config.scheduling_mode === 'panel' && (
            <p>• Multiple interviewers required - shows overlapping availability</p>
          )}
          {config.scheduling_mode === '1-to-many' && (
            <p>• Group booking with capacity limit of {config.capacity_limit || 'unlimited'}</p>
          )}
          {config.assignment_strategy === 'round-robin' && (
            <p>• Fair distribution - next available team member auto-assigned</p>
          )}
          {config.assignment_strategy === 'geo-clustered' && (
            <p>• Location-based assignment - nearest qualified resource selected</p>
          )}
          {config.credit_system_enabled && (
            <p>• Credit-based booking - consumes prepaid credits</p>
          )}
          {config.scheduling_mode === 'asset-booking' && (
            <p>• Asset/equipment scheduling with compatibility checks</p>
          )}
          {config.scheduling_mode === 'broadcast-claim' && (
            <p>• Open shift - qualified staff claim on first-come basis</p>
          )}
          {config.slot_display === 'arrival-window' && (
            <p>• Shows arrival windows instead of exact appointment times</p>
          )}
          {config.buffer_strategy && config.buffer_strategy !== 'none' && (
            <p>• {config.buffer_minutes}min {config.buffer_strategy} buffer included</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {selectedUseCase && onBackToUseCaseHome && (
        <UseCaseBanner useCase={selectedUseCase} mode="public" onBack={onBackToUseCaseHome} />
      )}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {!selectedUseCase && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>
        )}

        {getModeInfoPanel()}

        <div className="grid md:grid-cols-5 gap-8">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              {user.avatar_url && (
                <img
                  src={user.avatar_url}
                  alt={user.name}
                  className="w-16 h-16 rounded-full mb-4 object-cover"
                />
              )}
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{user.name}</h1>
              {user.bio && <p className="text-gray-600 text-sm mb-4">{user.bio}</p>}

              {/* Request to Book Banner */}
              {(selectedUseCase?.config_json.confirmation_model === 'request-to-book' || (eventType as any).requires_approval) && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-100 rounded-lg flex items-start gap-2">
                  <div className="p-1 bg-amber-100 rounded text-amber-600 mt-0.5">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-xs text-amber-800 leading-relaxed italic">
                    Note: This is a <strong>Request-to-Book</strong> service. Your appointment status will remain tentative until manually approved by the advisor.
                  </p>
                </div>
              )}

              <div className="border-t pt-4 space-y-3">
                <h2 className="text-xl font-semibold text-gray-900">{eventType.title}</h2>
                {eventType.description && (
                  <p className="text-gray-600 text-sm mb-3">{eventType.description}</p>
                )}

                {(() => {
                  const getBookingModeLabel = (mode: string) => {
                    const labels: Record<string, string> = {
                      'appointment': 'Appointment',
                      'queue': 'Queue',
                      'arrival-window': 'Arrival Window',
                      'open-shift': 'Open Shift',
                      'series': 'Series (Recursive)',
                      'recursive': 'Series (Recursive)',
                    };
                    return labels[mode] || mode;
                  };

                  const getBookingModeColor = (mode: string) => {
                    const colors: Record<string, string> = {
                      'appointment': 'bg-blue-50 text-blue-700',
                      'queue': 'bg-amber-50 text-amber-700',
                      'arrival-window': 'bg-green-50 text-green-700',
                      'open-shift': 'bg-violet-50 text-violet-700',
                      'series': 'bg-purple-50 text-purple-700',
                      'recursive': 'bg-purple-50 text-purple-700',
                    };
                    return colors[mode] || 'bg-gray-50 text-gray-700';
                  };

                  return (
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getBookingModeColor(eventType.booking_mode || 'appointment')}`}>
                        {getBookingModeLabel(eventType.booking_mode || 'appointment')}
                      </span>
                      {(selectedUseCase?.config_json.confirmation_model === 'request-to-book' || (eventType as any).requires_approval) && (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                          Request to Book
                        </span>
                      )}
                      {eventType.credit_cost && eventType.credit_cost > 0 && (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-indigo-100 text-indigo-800 border border-indigo-200">
                          {eventType.credit_cost} Credits
                        </span>
                      )}
                      {eventType.requires_multi_resource && (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                          <Users className="w-3 h-3 mr-1" />
                          Team Service
                        </span>
                      )}
                    </div>
                  );
                })()}

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">{eventType.duration_minutes} minutes</span>
                  </div>

                  {!!(eventType.buffer_minutes && eventType.buffer_minutes > 0) && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Tag className="w-4 h-4" />
                      <span className="text-sm">{eventType.buffer_minutes} min buffer time</span>
                    </div>
                  )}

                  {!!eventType.capacity_limit && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Users className="w-4 h-4" />
                      <span className="text-sm">Max {eventType.capacity_limit} participants</span>
                    </div>
                  )}

                  {!!(eventType.credit_cost && eventType.credit_cost > 0) && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <CreditCard className="w-4 h-4" />
                      <span className="text-sm">Costs {eventType.credit_cost} credits</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-3 bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">
              {eventType.booking_mode === 'queue' ? 'Join the Queue' : 'Select Date & Time'}
            </h3>

            {!!(eventType.credit_cost && eventType.credit_cost > 0) && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <CreditCard className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-blue-900">Premium Service</p>
                    <p className="text-xs text-blue-700">This booking requires {eventType.credit_cost} credits.</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="block text-xs text-gray-500 uppercase font-bold tracking-wider">Your Balance</span>
                  <span className="text-lg font-bold text-gray-900">12 Credits</span>
                </div>
              </div>
            )}

            <div className="mb-6">
              <TimezoneSelector
                selectedTimezone={timezone}
                onTimezoneChange={setTimezone}
              />
            </div>

            {hasResources && eventType.booking_mode !== 'queue' && (
              <div className="mb-6">
                <ResourceSelector
                  resources={eventTypeResourceList}
                  selectedResourceId={selectedResourceId}
                  onSelectResource={handleResourceSelect}
                  assignmentStrategy={eventType.assignment_strategy}
                  showAutoAssigned={
                    eventType.assignment_strategy !== 'manual' &&
                    !!assignedResource
                  }
                  autoAssignedResource={assignedResource}
                />
              </div>
            )}

            {hasResources && eventType.assignment_strategy === 'manual' && !selectedResourceId && eventType.booking_mode !== 'queue' && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-amber-800">
                  Please select a service provider to view available times.
                </p>
              </div>
            )}

            <BookingModeFactory
              eventType={eventType}
              currentMonth={currentMonth}
              selectedDate={selectedDate}
              availableDates={availableDates}
              timeSlots={timeSlots}
              selectedSlot={selectedSlot}
              onDateSelect={handleDateSelect}
              onMonthChange={handleMonthChange}
              onSlotSelect={setSelectedSlot}
              onJoinQueue={handleFormSubmit}
              showCapacity={selectedUseCase?.config_json.capacity_enabled}
              isLoading={isLoading}
            />

            {selectedDate && selectedSlot && eventType.booking_mode !== 'queue' && (
              <div className="border-t pt-6">
                <h4 className="text-md font-semibold text-gray-900 mb-4">Your Information</h4>
                <BookingForm onSubmit={handleFormSubmit} isLoading={isLoading} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
