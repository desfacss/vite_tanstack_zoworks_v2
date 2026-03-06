import { AvailabilityRule, DateOverride, Booking, TimeSlot } from '../types';
import {
  generateTimeSlots,
  getDayOfWeek,
  parseTimeString,
  formatTime,
  areDatesEqual,
  isPastDate
} from './dateUtils';
import { parseISO, isSameDay } from 'date-fns';

export const getAvailabilityForDate = (
  date: Date,
  rules: AvailabilityRule[],
  overrides: DateOverride[]
): { isAvailable: boolean; startTime?: string; endTime?: string } => {
  const dateStr = date.toISOString().split('T')[0];
  const override = overrides.find(o => o.date === dateStr);

  if (override) {
    return {
      isAvailable: override.is_available,
      startTime: override.start_time || undefined,
      endTime: override.end_time || undefined,
    };
  }

  const dayOfWeek = getDayOfWeek(date);
  const rule = rules.find(r => r.day_of_week === dayOfWeek && r.is_available);

  if (!rule) {
    return { isAvailable: false };
  }

  return {
    isAvailable: true,
    startTime: rule.start_time,
    endTime: rule.end_time,
  };
};

export const generateAvailableSlots = (
  date: Date,
  duration: number,
  rules: AvailabilityRule[],
  overrides: DateOverride[],
  bookings: Booking[]
): TimeSlot[] => {
  if (isPastDate(date)) {
    return [];
  }

  const availability = getAvailabilityForDate(date, rules, overrides);

  if (!availability.isAvailable || !availability.startTime || !availability.endTime) {
    return [];
  }

  const slots = generateTimeSlots(
    date,
    availability.startTime,
    availability.endTime,
    duration
  );

  const bookedTimes = bookings
    .map(b => parseISO(b.scheduled_at))
    .filter(bookedDate => isSameDay(bookedDate, date));

  return slots.map(slot => {
    const isBooked = bookedTimes.some(booked =>
      booked.getHours() === slot.getHours() &&
      booked.getMinutes() === slot.getMinutes()
    );

    return {
      time: formatTime(slot, false),
      datetime: slot,
      available: !isBooked,
    };
  });
};

export const hasAvailableSlots = (
  date: Date,
  duration: number,
  rules: AvailabilityRule[],
  overrides: DateOverride[],
  bookings: Booking[]
): boolean => {
  const slots = generateAvailableSlots(date, duration, rules, overrides, bookings);
  return slots.some(slot => slot.available);
};

export const getAvailableDatesInMonth = (
  month: Date,
  duration: number,
  rules: AvailabilityRule[],
  overrides: DateOverride[],
  bookings: Booking[]
): Date[] => {
  const dates: Date[] = [];
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(month.getFullYear(), month.getMonth(), day);
    if (hasAvailableSlots(date, duration, rules, overrides, bookings)) {
      dates.push(date);
    }
  }

  return dates;
};
