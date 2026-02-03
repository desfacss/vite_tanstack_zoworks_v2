import React, { useState, useMemo } from 'react';
import { Calendar, dayjsLocalizer, View, Views } from 'react-big-calendar';
import dayjs from 'dayjs';
import { Typography, Card, Button, Empty } from 'antd';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Event } from '../types';
// Re-verifying types path in a moment if this fails 

import EventList from './EventList';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const { Text } = Typography;
const localizer = dayjsLocalizer(dayjs);

interface CalendarViewProps {
  events: Event[];
  viewMode: 'month' | 'week' | 'day';
  isMobile: boolean;
}

const CalendarView: React.FC<CalendarViewProps> = ({ events, viewMode, isMobile }) => {
  // Initialize currentDate to today, and selectedDate to today if not in month view
  const initialDate = new Date();
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    viewMode !== 'month' ? initialDate : null // Pre-select today for day/week views
  );

  // Transform events for react-big-calendar (Kept for completeness, assuming 'start' and 'end' are Date objects)
  const calendarEvents = useMemo(() => {
    return events?.map(event => ({
      ...event,
      start: event.start, // Assuming already Date object from MobileCalendarView
      end: event.end,     // Assuming already Date object from MobileCalendarView
      resource: event,
    }));
  }, [events]);

  // Get events for selected date
  const selectedEvents = useMemo(() => {
    if (!selectedDate) return [];
    const selectedDateStr = dayjs(selectedDate).format('YYYY-MM-DD');
    // Filter events based on the date field in the transformed Event object
    return events?.filter(event => event.date === selectedDateStr);
  }, [events, selectedDate]);

  // FIX: Synchronize currentDate and selectedDate when navigating
  const handleNavigate = (newDate: Date) => {
    setCurrentDate(newDate);
    // When navigating in Day/Week view, automatically select the new date
    if (viewMode !== 'month') {
      setSelectedDate(newDate);
    }
  };

  const handleSelectSlot = ({ start }: { start: Date }) => {
    setSelectedDate(start);
  };

  const handleSelectEvent = ({ resource }: { resource: Event }) => {
    // The resource object here is the transformed Event, which has a 'date' string field
    const eventDate = dayjs(resource.date).toDate();
    setSelectedDate(eventDate);
    // Also update currentDate to navigate the calendar if needed (e.g., in month view)
    setCurrentDate(eventDate);
  };

  // Helper function to check if a date has events
  const hasEventsOnDate = (date: Date) => {
    const dateStr = dayjs(date).format('YYYY-MM-DD');
    return events.some(event => event.date === dateStr);
  };

  // Get events count for a specific date
  const getEventsCountForDate = (date: Date) => {
    const dateStr = dayjs(date).format('YYYY-MM-DD');
    return events.filter(event => event.date === dateStr).length;
  };

  // FIX: Ensure week day selection updates currentDate for calendar navigation
  const handleWeekDaySelect = (date: Date) => {
    setCurrentDate(date);
    setSelectedDate(date);
  };

  // Get week days for the current date
  const getWeekDays = () => {
    // Determine the start day based on viewMode
    let startDay;
    if (viewMode === 'day') {
      // If in 'day' view, show the current date's week context
      startDay = dayjs(currentDate).startOf('week');
    } else if (isMobile && viewMode === 'week') {
      // In mobile '3-day' view, start from current date
      return [currentDate, dayjs(currentDate).add(1, 'day').toDate(), dayjs(currentDate).add(2, 'day').toDate()];
    } else {
      // In full 'week' view, start of the week
      startDay = dayjs(currentDate).startOf('week');
    }

    const days = [];
    // Only show 7 days for desktop week/day, 3 for mobile week
    const numDaysToShow = (isMobile && viewMode === 'week') ? 3 : 7;

    for (let i = 0; i < numDaysToShow; i++) {
      days.push(startDay.add(i, 'day').toDate());
    }
    return days;
  };

  const eventStyleGetter = (event: any) => {
    const eventData = event.resource as Event;
    const baseColor = eventData.color;

    // ... (color mapping logic remains the same) ...
    let backgroundColor = baseColor;
    import { DEFAULT_PRIMARY_COLOR } from '@/core/theme/ThemeRegistry';

    if (baseColor && !baseColor.startsWith('#')) {
      const colorMap: { [key: string]: string } = {
        'blue': DEFAULT_PRIMARY_COLOR, 'green': '#52c41a', 'red': '#ff4d4f', 'orange': '#fa8c16',
        'purple': '#722ed1', 'cyan': '#13c2c2', 'geekblue': '#2f54eb', 'gold': '#faad14',
        'lime': '#a0d911', 'magenta': '#eb2f96', 'volcano': '#fa541c'
      };
      backgroundColor = colorMap[baseColor] || baseColor;
    }

    return {
      style: {
        backgroundColor: backgroundColor,
        borderRadius: '4px', opacity: 0.8, color: 'white', border: '0px', display: 'block',
        fontSize: viewMode === 'month' ? '11px' : '12px',
        padding: viewMode === 'month' ? '1px 3px' : '2px 4px', fontWeight: '500',
      },
    };
  };

  const getViewTitle = () => {
    switch (viewMode) {
      case 'month':
        return dayjs(currentDate).format('MMMM YYYY');
      case 'week':
        if (isMobile) {
          // Show the 3-day range for mobile week view
          const days = getWeekDays();
          if (days.length === 3) {
            return `${dayjs(days[0]).format('MMM D')} - ${dayjs(days[2]).format('MMM D, YYYY')}`;
          }
        }
        const startOfWeek = dayjs(currentDate).startOf('week');
        const endOfWeek = dayjs(currentDate).endOf('week');
        return `${startOfWeek.format('MMM D')} - ${endOfWeek.format('MMM D, YYYY')}`;
      case 'day':
        return dayjs(currentDate).format('dddd, MMMM D, YYYY');
      default:
        return '';
    }
  };

  const navigateBack = () => {
    // Handle navigation based on the actual view in use
    let unit: dayjs.ManipulateType;
    if (viewMode === 'month') {
      unit = 'month';
    } else if (viewMode === 'week' && isMobile) {
      // Mobile week view navigates 3 days at a time
      unit = 'day';
      const newDate = dayjs(currentDate).subtract(3, unit).toDate();
      setCurrentDate(newDate);
      setSelectedDate(newDate);
      return;
    } else {
      // Desktop day/week views navigate one day/week at a time
      unit = viewMode as dayjs.ManipulateType;
    }

    const newDate = dayjs(currentDate).subtract(1, unit).toDate();
    setCurrentDate(newDate);
    // If not month view, update selectedDate to match the new start date
    if (viewMode !== 'month') {
      setSelectedDate(newDate);
    }
  };

  const navigateForward = () => {
    // Handle navigation based on the actual view in use
    let unit: dayjs.ManipulateType;
    if (viewMode === 'month') {
      unit = 'month';
    } else if (viewMode === 'week' && isMobile) {
      // Mobile week view navigates 3 days at a time
      unit = 'day';
      const newDate = dayjs(currentDate).add(3, unit).toDate();
      setCurrentDate(newDate);
      setSelectedDate(newDate);
      return;
    } else {
      // Desktop day/week views navigate one day/week at a time
      unit = viewMode as dayjs.ManipulateType;
    }

    const newDate = dayjs(currentDate).add(1, unit).toDate();
    setCurrentDate(newDate);
    // If not month view, update selectedDate to match the new start date
    if (viewMode !== 'month') {
      setSelectedDate(newDate);
    }
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    // If not month view, select today's date
    if (viewMode !== 'month') {
      setSelectedDate(today);
    } else {
      setSelectedDate(null);
    }
  };

  // Determine the actual view for react-big-calendar
  // react-big-calendar doesn't have a 3-day view, so we use 'day' for mobile week
  const actualView = viewMode === 'day' ? 'day' : (isMobile && viewMode === 'week') ? Views.DAY : viewMode;
  const showWeekHeader = viewMode === 'day' || viewMode === 'week';

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-gray-50">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-h4 !mb-0">
            {getViewTitle()}
          </h1>
          <div className="flex gap-2">
            <Button
              type="text"
              icon={<ChevronLeft size={16} />}
              onClick={navigateBack}
              size="small"
            />
            <Button
              type="primary"
              onClick={goToToday}
              size="small"
            >
              Today
            </Button>
            <Button
              type="text"
              icon={<ChevronRight size={16} />}
              onClick={navigateForward}
              size="small"
            />
          </div>
        </div>

        {/* Week/Day Header with date selection */}
        {showWeekHeader && (
          <div className="grid grid-cols-7 gap-1 mt-3">
            {getWeekDays().map((date, index) => {
              const isSelected = selectedDate && dayjs(date).isSame(selectedDate, 'day');
              const isToday = dayjs(date).isSame(dayjs(), 'day');
              const hasEvents = hasEventsOnDate(date);
              const eventsCount = getEventsCountForDate(date);

              // Conditional styling based on mobile '3-day' view
              const colSpan = (isMobile && viewMode === 'week') ? 'col-span-2' : 'col-span-1';

              return (
                <div
                  key={index}
                  className={`
                    flex flex-col items-center p-2 rounded-lg cursor-pointer transition-all duration-200 ${colSpan}
                    ${isSelected
                      ? 'border-2'
                      : isToday
                        ? 'border'
                        : 'hover:bg-[var(--color-bg-secondary)] border border-transparent'
                    }
                  `}
                  style={{
                    backgroundColor: isSelected
                      ? 'rgba(var(--color-primary-rgb), 0.12)'
                      : isToday
                        ? 'rgba(var(--color-primary-rgb), 0.05)'
                        : 'transparent',
                    borderColor: isSelected
                      ? 'var(--color-primary)'
                      : isToday
                        ? 'rgba(var(--color-primary-rgb), 0.3)'
                        : 'transparent'
                  }}
                  onClick={() => handleWeekDaySelect(date)}
                >
                  <Text
                    className={`text-xs font-medium`}
                    style={{ color: isSelected || isToday ? 'var(--color-primary)' : 'var(--color-text-secondary)' }}
                  >
                    {dayjs(date).format('ddd')}
                  </Text>
                  <Text
                    className={`text-lg font-semibold`}
                    style={{ color: isSelected || isToday ? 'var(--color-primary)' : 'var(--color-text-primary)' }}
                  >
                    {dayjs(date).format('D')}
                  </Text>
                  {/* Event indicator */}
                  <div className="flex items-center justify-center h-2 mt-1">
                    {hasEvents && (
                      <div className="flex gap-1">
                        {eventsCount <= 3 ? (
                          // Show individual dots for 1-3 events
                          Array.from({ length: Math.min(eventsCount, 3) }).map((_, i) => (
                            <div
                              key={i}
                              className={`w-1.5 h-1.5 rounded-full`}
                              style={{ backgroundColor: isSelected ? 'var(--color-primary)' : 'rgba(var(--color-primary-rgb), 0.5)' }}
                            />
                          ))
                        ) : (
                          // Show a single larger dot for 4+ events
                          <div
                            className={`w-2 h-2 rounded-full`}
                            style={{ backgroundColor: isSelected ? 'var(--color-primary)' : 'rgba(var(--color-primary-rgb), 0.5)' }}
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Calendar */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full p-4">
          <Card className="h-full" bodyStyle={{ padding: '16px', height: '100%' }}>
            <Calendar
              localizer={localizer}
              events={calendarEvents}
              startAccessor={(e: any) => new Date(e.start)}
              endAccessor={(e: any) => new Date(e.end)}
              style={{ height: 500 }}
              view={actualView as View}
              views={[Views.MONTH, Views.WEEK, Views.DAY]}
              date={currentDate}
              onNavigate={handleNavigate}
              onSelectSlot={handleSelectSlot}
              onSelectEvent={handleSelectEvent}
              selectable
              eventPropGetter={eventStyleGetter}
              toolbar={false}
              popup
              popupOffset={{ x: 10, y: 10 }}
              formats={{
                // ... (formats remain the same) ...
                timeGutterFormat: 'HH:mm',
                eventTimeRangeFormat: ({ start, end }) =>
                  `${dayjs(start).format('HH:mm')} - ${dayjs(end).format('HH:mm')}`,
                dayFormat: 'ddd M/D',
                dateFormat: 'D',
                monthHeaderFormat: 'MMMM YYYY',
                dayHeaderFormat: 'dddd, MMMM D',
                dayRangeHeaderFormat: ({ start, end }) =>
                  `${dayjs(start).format('MMM D')} - ${dayjs(end).format('MMM D, YYYY')}`,
                agendaDateFormat: 'ddd MMM D',
                agendaTimeFormat: 'HH:mm',
                agendaTimeRangeFormat: ({ start, end }) =>
                  `${dayjs(start).format('HH:mm')} - ${dayjs(end).format('HH:mm')}`,
              }}
              step={30}
              timeslots={2}
              min={viewMode !== 'month' ? new Date(0, 0, 0, 6, 0, 0) : undefined}
              max={viewMode !== 'month' ? new Date(0, 0, 0, 22, 0, 0) : undefined}
              showMultiDayTimes={true}
            />
          </Card>
        </div>
      </div>

      {/* Selected Date Events */}
      {selectedDate && (
        <div className="border-t bg-white">
          <div className="px-4 py-3 bg-gray-50">
            <h2 className="text-h5 !mb-0">
              Events for {dayjs(currentDate).format('dddd, MMMM D, YYYY')}
            </h2>
          </div>
          <div className="max-h-48 overflow-auto">
            {selectedEvents.length > 0 ? (
              <EventList events={selectedEvents} />
            ) : (
              <div className="px-4 py-8">
                <Empty description="No events for this date" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;