import React from 'react';
import CalendarView from '../../CalendarView';
import TimeSlotPicker from '../../TimeSlotPicker';
import { formatDate } from '../../../lib/utils/dateUtils';
import { Calendar, Clock } from 'lucide-react';
import { TimeSlot, EnhancedTimeSlot } from '../../../lib/types';

interface ClassicAppointmentGridProps {
    currentMonth: Date;
    selectedDate: Date | null;
    availableDates: Date[];
    timeSlots: (TimeSlot | EnhancedTimeSlot)[];
    selectedSlot: (TimeSlot | EnhancedTimeSlot) | null;
    onDateSelect: (date: Date) => void;
    onMonthChange: (month: Date) => void;
    onSlotSelect: (slot: TimeSlot | EnhancedTimeSlot) => void;
    showCapacity?: boolean;
}

export default function ClassicAppointmentGrid({
    currentMonth,
    selectedDate,
    availableDates,
    timeSlots,
    selectedSlot,
    onDateSelect,
    onMonthChange,
    onSlotSelect,
    showCapacity,
}: ClassicAppointmentGridProps) {
    return (
        <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div>
                <div className="flex items-center gap-2 mb-4 text-gray-700">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm font-medium">Choose a Date</span>
                </div>
                <CalendarView
                    currentMonth={currentMonth}
                    selectedDate={selectedDate}
                    availableDates={availableDates}
                    onDateSelect={onDateSelect}
                    onMonthChange={onMonthChange}
                />
            </div>

            <div>
                <div className="flex items-center gap-2 mb-4 text-gray-700">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm font-medium">
                        {selectedDate ? `Times for ${formatDate(selectedDate, 'MMM d')}` : 'Select a Time'}
                    </span>
                </div>
                {selectedDate ? (
                    <TimeSlotPicker
                        slots={timeSlots}
                        selectedSlot={selectedSlot}
                        onSlotSelect={onSlotSelect}
                        showCapacity={showCapacity}
                    />
                ) : (
                    <div className="text-center py-8 text-gray-400">
                        <Calendar className="w-12 h-12 mx-auto mb-3" />
                        <p className="text-sm">Select a date to see available times</p>
                    </div>
                )}
            </div>
        </div>
    );
}
