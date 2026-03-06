import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
  parseISO,
  setHours,
  setMinutes,
  addMinutes,
  isBefore,
  isAfter,
} from 'date-fns';

export const formatDate = (date: Date, formatStr: string = 'PPP'): string => {
  return format(date, formatStr);
};

export const formatTime = (date: Date, use24Hour: boolean = false): string => {
  return format(date, use24Hour ? 'HH:mm' : 'h:mm a');
};

export const getCalendarDays = (date: Date): Date[] => {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
};

export const isDayInMonth = (day: Date, month: Date): boolean => {
  return isSameMonth(day, month);
};

export const isDayToday = (day: Date): boolean => {
  return isToday(day);
};

export const areDatesEqual = (date1: Date, date2: Date): boolean => {
  return isSameDay(date1, date2);
};

export const getNextMonth = (date: Date): Date => {
  return addMonths(date, 1);
};

export const getPreviousMonth = (date: Date): Date => {
  return subMonths(date, 1);
};

export const parseTimeString = (timeStr: string, date: Date = new Date()): Date => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return setMinutes(setHours(date, hours), minutes);
};

export const generateTimeSlots = (
  date: Date,
  startTime: string,
  endTime: string,
  duration: number
): Date[] => {
  const slots: Date[] = [];
  const start = parseTimeString(startTime, date);
  const end = parseTimeString(endTime, date);

  let current = start;
  while (isBefore(current, end)) {
    slots.push(new Date(current));
    current = addMinutes(current, duration);
  }

  return slots;
};

export const isTimeSlotAvailable = (
  slot: Date,
  bookedSlots: Date[]
): boolean => {
  return !bookedSlots.some(booked => isSameDay(slot, booked) &&
    slot.getHours() === booked.getHours() &&
    slot.getMinutes() === booked.getMinutes());
};

export const getDayOfWeek = (date: Date): number => {
  return date.getDay();
};

export const formatDateForInput = (date: Date): string => {
  return format(date, 'yyyy-MM-dd');
};

export const parseDateFromInput = (dateStr: string): Date => {
  return parseISO(dateStr);
};

export const isPastDate = (date: Date): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return isBefore(date, today);
};
