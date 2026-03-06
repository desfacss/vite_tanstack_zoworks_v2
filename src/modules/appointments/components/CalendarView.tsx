import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  getCalendarDays,
  isDayInMonth,
  isDayToday,
  areDatesEqual,
  getNextMonth,
  getPreviousMonth,
  formatDate,
  isPastDate,
} from '../lib/utils/dateUtils';

interface CalendarViewProps {
  currentMonth: Date;
  selectedDate: Date | null;
  availableDates: Date[];
  onDateSelect: (date: Date) => void;
  onMonthChange: (month: Date) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarView({
  currentMonth,
  selectedDate,
  availableDates,
  onDateSelect,
  onMonthChange,
}: CalendarViewProps) {
  const days = getCalendarDays(currentMonth);

  const isDateAvailable = (date: Date): boolean => {
    return availableDates.some(availableDate => areDatesEqual(availableDate, date));
  };

  const handlePrevMonth = () => {
    onMonthChange(getPreviousMonth(currentMonth));
  };

  const handleNextMonth = () => {
    onMonthChange(getNextMonth(currentMonth));
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          {formatDate(currentMonth, 'MMMM yyyy')}
        </h3>
        <div className="flex gap-2">
          <button
            onClick={handlePrevMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {WEEKDAYS.map(day => (
          <div
            key={day}
            className="text-center text-xs font-medium text-gray-500 py-2"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          const isCurrentMonth = isDayInMonth(day, currentMonth);
          const isAvailable = isDateAvailable(day) && isCurrentMonth;
          const isSelected = selectedDate && areDatesEqual(day, selectedDate);
          const isToday = isDayToday(day);
          const isPast = isPastDate(day);

          return (
            <button
              key={index}
              onClick={() => isAvailable && onDateSelect(day)}
              disabled={!isAvailable || isPast}
              className={`
                aspect-square p-2 text-sm rounded-lg transition-all
                ${!isCurrentMonth ? 'text-gray-300' : ''}
                ${isToday && !isSelected ? 'ring-2 ring-blue-500' : ''}
                ${isSelected ? 'bg-blue-600 text-white font-semibold' : ''}
                ${isAvailable && !isSelected && isCurrentMonth && !isPast ? 'hover:bg-blue-50 text-gray-900 cursor-pointer' : ''}
                ${!isAvailable && isCurrentMonth && !isPast ? 'text-gray-300 cursor-not-allowed' : ''}
                ${isPast ? 'text-gray-200 cursor-not-allowed' : ''}
              `}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
