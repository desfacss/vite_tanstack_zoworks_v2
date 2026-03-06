import {
  Resource,
  ResourceAvailabilityRule,
  ResourceDateOverride,
  Booking,
  TimeSlot,
  EnhancedTimeSlot,
  EventTypeResource,
} from '../types';
import {
  generateTimeSlots,
  getDayOfWeek,
  isPastDate,
} from './dateUtils';
import { parseISO, isSameDay } from 'date-fns';

export const getResourceAvailabilityForDate = (
  date: Date,
  resourceId: string,
  rules: ResourceAvailabilityRule[],
  overrides: ResourceDateOverride[]
): { isAvailable: boolean; startTime?: string; endTime?: string } => {
  const dateStr = date.toISOString().split('T')[0];
  const override = overrides.find(
    o => o.resource_id === resourceId && o.date === dateStr
  );

  if (override) {
    return {
      isAvailable: override.is_available,
      startTime: override.start_time || undefined,
      endTime: override.end_time || undefined,
    };
  }

  const dayOfWeek = getDayOfWeek(date);
  const rule = rules.find(
    r => r.resource_id === resourceId && r.day_of_week === dayOfWeek && r.is_available
  );

  if (!rule) {
    return { isAvailable: false };
  }

  return {
    isAvailable: true,
    startTime: rule.start_time,
    endTime: rule.end_time,
  };
};

export const generateResourceAvailableSlots = (
  date: Date,
  duration: number,
  resource: Resource,
  resourceRules: ResourceAvailabilityRule[],
  resourceOverrides: ResourceDateOverride[],
  bookings: Booking[],
  bookingResources: any[] = []
): TimeSlot[] => {
  if (isPastDate(date)) {
    return [];
  }

  const availability = getResourceAvailabilityForDate(
    date,
    resource.id,
    resourceRules,
    resourceOverrides
  );

  if (!availability.isAvailable || !availability.startTime || !availability.endTime) {
    return [];
  }

  const slotDates = generateTimeSlots(
    date,
    availability.startTime,
    availability.endTime,
    duration
  );

  const allSlots: TimeSlot[] = slotDates.map(slotDate => ({
    time: slotDate.getHours().toString().padStart(2, '0') + ':' + slotDate.getMinutes().toString().padStart(2, '0'),
    datetime: slotDate,
    available: true
  }));

  const resourceBookings = bookings.filter(
    b => {
      const isExplicitlyAssigned = b.assigned_resource_id === resource.id;
      const isInBundle = bookingResources.some(br => br.booking_id === b.id && br.resource_id === resource.id);

      return (isExplicitlyAssigned || isInBundle) &&
        b.status === 'confirmed' &&
        isSameDay(parseISO(b.scheduled_at), date);
    }
  );

  return allSlots.map(slot => {
    const slotDate = new Date(date);
    const [hours, minutes] = slot.time.split(':').map(Number);
    slotDate.setHours(hours, minutes, 0, 0);
    const slotEndTime = new Date(slotDate.getTime() + duration * 60000);

    const isBooked = resourceBookings.some(booking => {
      const bookingStart = parseISO(booking.scheduled_at);
      const bookingEnd = new Date(bookingStart.getTime() + duration * 60000);

      return (
        (slotDate >= bookingStart && slotDate < bookingEnd) ||
        (slotEndTime > bookingStart && slotEndTime <= bookingEnd) ||
        (slotDate <= bookingStart && slotEndTime >= bookingEnd)
      );
    });

    return {
      time: slot.time,
      datetime: slotDate,
      available: !isBooked,
    };
  });
};

export const getAvailableResourcesForSlot = (
  date: Date,
  timeSlot: string,
  duration: number,
  resources: Resource[],
  resourceRules: ResourceAvailabilityRule[],
  resourceOverrides: ResourceDateOverride[],
  bookings: Booking[]
): Resource[] => {
  return resources.filter(resource => {
    const slots = generateResourceAvailableSlots(
      date,
      duration,
      resource,
      resourceRules,
      resourceOverrides,
      bookings
    );

    const slot = slots.find(s => s.time === timeSlot);
    return slot && slot.available;
  });
};

export const generateUnifiedAvailableSlots = (
  date: Date,
  duration: number,
  resources: Resource[],
  eventTypeResources: EventTypeResource[],
  eventTypeId: string,
  resourceRules: ResourceAvailabilityRule[],
  resourceOverrides: ResourceDateOverride[],
  bookings: Booking[],
  capacityLimit?: number,
  requiresMultiResource: boolean = false,
  bookingResources: any[] = [],
  limitToResourceId?: string
): EnhancedTimeSlot[] => {
  if (isPastDate(date)) {
    return [];
  }

  // 1. Get all resources linked to this event type
  const eventResources = eventTypeResources.filter(etr => etr.event_type_id === eventTypeId);

  const relevantResources = resources.filter(r =>
    eventResources.some(etr => etr.resource_id === r.id)
  );

  if (relevantResources.length === 0) {
    return [];
  }

  // 2. Generate availability for each resource
  const resourceSlotsMap = new Map<string, TimeSlot[]>();
  relevantResources.forEach(resource => {
    const slots = generateResourceAvailableSlots(
      date,
      duration,
      resource,
      resourceRules,
      resourceOverrides,
      bookings,
      bookingResources
    );
    resourceSlotsMap.set(resource.id, slots);
  });

  // 3. Get all unique time strings across all resources
  const allTimeStrings = Array.from(
    new Set(
      Array.from(resourceSlotsMap.values()).flatMap(slots => slots.map(s => s.time))
    )
  ).sort();

  // 4. Determine availability for each time slot based on bundling logic
  const enhancedSlots: EnhancedTimeSlot[] = allTimeStrings.map(timeStr => {
    const datetime = new Date(date);
    const [hours, minutes] = timeStr.split(':').map(Number);
    datetime.setHours(hours, minutes, 0, 0);

    const availableResourceIdsAtTime = relevantResources
      .filter(r => {
        const slots = resourceSlotsMap.get(r.id);
        const slot = slots?.find(s => s.time === timeStr);
        return slot?.available;
      })
      .map(r => r.id);

    let isAvailable = false;
    let finalCapacity = capacityLimit || 0;
    let selectedPrimaryId: string | undefined;
    let selectedPrimaryName: string | undefined;

    if (requiresMultiResource) {
      // BUNDLE LOGIC (AND): 
      // Need (At least one 'primary' resource) AND (ALL resources marked 'required' AND not 'primary')
      const requiredAssetIds = eventResources
        .filter(etr => etr.is_required && etr.role !== 'primary')
        .map(etr => etr.resource_id);

      const primaryIds = eventResources
        .filter(etr => etr.role === 'primary')
        .map(etr => etr.resource_id)
        .filter(id => !limitToResourceId || id === limitToResourceId);

      const allRequiredAssetsFree = requiredAssetIds.every(id => availableResourceIdsAtTime.includes(id));
      const availablePrimaries = primaryIds.filter(id => availableResourceIdsAtTime.includes(id));

      if (allRequiredAssetsFree && availablePrimaries.length > 0) {
        isAvailable = true;
        // In bundle move, capacity is limited by the number of available primary actors
        finalCapacity = capacityLimit || availablePrimaries.length;
        selectedPrimaryId = availablePrimaries[0];
        selectedPrimaryName = resources.find(r => r.id === selectedPrimaryId)?.name;
      }
    } else {
      // CLASSIC LOGIC (OR): Any primary or required resource being free is enough
      // (Usually used for 1-to-1 round robin where any one person works)
      const availablePrimaries = availableResourceIdsAtTime.filter(id =>
        eventResources.some(etr => etr.resource_id === id) &&
        (!limitToResourceId || id === limitToResourceId)
      );

      if (availablePrimaries.length > 0) {
        isAvailable = true;
        finalCapacity = capacityLimit || availablePrimaries.length;
        selectedPrimaryId = availablePrimaries[0];
        selectedPrimaryName = resources.find(r => r.id === selectedPrimaryId)?.name;
      }
    }

    return {
      time: timeStr,
      datetime,
      available: isAvailable,
      capacity: finalCapacity,
      booked: 0, // Simplified for now
      resource_id: selectedPrimaryId,
      resource_name: selectedPrimaryName,
    };
  });

  return enhancedSlots.filter(slot => slot.available).sort((a, b) => a.time.localeCompare(b.time));
};

export const assignResourceByStrategy = (
  availableResources: Resource[],
  strategy: string | undefined,
  bookings: Booking[]
): Resource | null => {
  if (availableResources.length === 0) return null;
  if (availableResources.length === 1) return availableResources[0];

  switch (strategy) {
    case 'round-robin':
    case 'load-balanced': {
      const resourceBookingCounts = availableResources.map(resource => ({
        resource,
        count: bookings.filter(
          b => b.assigned_resource_id === resource.id && b.status === 'confirmed'
        ).length,
      }));

      resourceBookingCounts.sort((a, b) => a.count - b.count);
      return resourceBookingCounts[0].resource;
    }

    case 'first-available':
    default:
      return availableResources[0];
  }
};

export const getAvailableDatesInMonthForResources = (
  currentMonth: Date,
  duration: number,
  resources: Resource[],
  eventTypeResources: EventTypeResource[],
  eventTypeId: string,
  resourceRules: ResourceAvailabilityRule[],
  resourceOverrides: ResourceDateOverride[],
  bookings: Booking[],
  requiresMultiResource: boolean = false,
  bookingResources: any[] = [],
  limitToResourceId?: string
): Date[] => {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const availableDates: Date[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);

    if (date < today) continue;

    const slots = generateUnifiedAvailableSlots(
      date,
      duration,
      resources,
      eventTypeResources,
      eventTypeId,
      resourceRules,
      resourceOverrides,
      bookings,
      undefined,
      requiresMultiResource,
      bookingResources,
      limitToResourceId
    );

    if (slots.some(slot => slot.available)) {
      availableDates.push(date);
    }
  }

  return availableDates;
};
