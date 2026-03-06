import { TimeSlot, EnhancedTimeSlot } from '../lib/types';
import { Clock, Users } from 'lucide-react';

interface TimeSlotPickerProps {
  slots: TimeSlot[] | EnhancedTimeSlot[];
  selectedSlot: TimeSlot | EnhancedTimeSlot | null;
  onSlotSelect: (slot: TimeSlot | EnhancedTimeSlot) => void;
  showCapacity?: boolean;
  displayMode?: 'exact-time' | 'arrival-window';
}

export default function TimeSlotPicker({
  slots,
  selectedSlot,
  onSlotSelect,
  showCapacity = false,
  displayMode = 'exact-time',
}: TimeSlotPickerProps) {
  if (slots.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>No available time slots for this date.</p>
        <p className="text-sm mt-1">Please select another date.</p>
      </div>
    );
  }

  const availableSlots = slots.filter(slot => slot.available);

  if (availableSlots.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>All time slots are booked for this date.</p>
        <p className="text-sm mt-1">Please select another date.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
      {availableSlots.map((slot, index) => {
        const isSelected = selectedSlot?.time === slot.time;
        const enhancedSlot = slot as EnhancedTimeSlot;
        const hasCapacity = showCapacity && enhancedSlot.capacity !== undefined;

        const spotsRemaining = hasCapacity
          ? (enhancedSlot.capacity || 0) - (enhancedSlot.booked || 0)
          : null;

        const isLowCapacity = spotsRemaining !== null && spotsRemaining <= 3;
        const isWaitlist = enhancedSlot.waitlist;

        let displayTime = slot.time;
        if (displayMode === 'arrival-window') {
          const [hour, minute] = slot.time.split(':');
          const startHour = parseInt(hour);
          const endHour = startHour + 2;
          displayTime = `${slot.time} - ${endHour}:${minute} (Arrival Window)`;
        }

        return (
          <button
            key={index}
            onClick={() => onSlotSelect(slot)}
            disabled={isWaitlist}
            className={`
              w-full p-3 text-left rounded-lg border-2 transition-all
              ${isSelected
                ? 'border-blue-600 bg-blue-50 text-blue-900'
                : isWaitlist
                  ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
              }
            `}
          >
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="font-medium">{displayTime}</span>
                <div className="flex items-center gap-2">
                  {hasCapacity && spotsRemaining !== null && (
                    <div className={`flex items-center gap-1 text-sm ${isLowCapacity ? 'text-orange-600' : 'text-gray-600'
                      }`}>
                      <Users className="w-4 h-4" />
                      <span>{spotsRemaining} left</span>
                    </div>
                  )}
                  {isWaitlist && (
                    <span className="text-xs px-2 py-1 bg-gray-200 text-gray-600 rounded">
                      Waitlist
                    </span>
                  )}
                </div>
              </div>
              {enhancedSlot.resource_name && (
                <span className="text-xs text-gray-500">
                  with {enhancedSlot.resource_name}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
