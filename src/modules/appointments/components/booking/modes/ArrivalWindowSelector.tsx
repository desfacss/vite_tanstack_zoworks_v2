import React from 'react';
import CalendarView from '../../CalendarView';
import { TimeSlot, EnhancedTimeSlot } from '../../../lib/types';
import { Calendar, MapPin, Search } from 'lucide-react';

interface ArrivalWindowSelectorProps {
    currentMonth: Date;
    selectedDate: Date | null;
    availableDates: Date[];
    timeSlots: (TimeSlot | EnhancedTimeSlot)[];
    selectedSlot: (TimeSlot | EnhancedTimeSlot) | null;
    onDateSelect: (date: Date) => void;
    onMonthChange: (month: Date) => void;
    onSlotSelect: (slot: TimeSlot | EnhancedTimeSlot) => void;
}

export default function ArrivalWindowSelector({
    currentMonth,
    selectedDate,
    availableDates,
    timeSlots,
    selectedSlot,
    onDateSelect,
    onMonthChange,
    onSlotSelect,
}: ArrivalWindowSelectorProps) {
    return (
        <div className="space-y-8">
            {/* Search Section */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    Service Address Check
                </h4>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter your zip code or address"
                            defaultValue="90210"
                        />
                    </div>
                    <button className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-all">
                        Verify
                    </button>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                <div>
                    <div className="flex items-center gap-2 mb-4 text-gray-700 font-bold">
                        <Calendar className="w-4 h-4 text-blue-600" />
                        Step 1: Choose Service Date
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
                    <div className="flex items-center gap-2 mb-4 text-gray-700 font-bold">
                        <MapPin className="w-4 h-4 text-blue-600" />
                        Step 2: Choose Arrival Window
                    </div>
                    {selectedDate ? (
                        <div className="grid gap-4">
                            {timeSlots.map((slot, index) => {
                                const [hour, minute] = slot.time.split(':');
                                const startHour = parseInt(hour);
                                const endHour = startHour + 3; // 4-hour window
                                const windowLabel = `${slot.time} to ${endHour}:${minute} Arrival`;
                                const secondaryLabel = "Technician will arrive anytime between these hours.";
                                const isSelected = selectedSlot?.time === slot.time;

                                return (
                                    <button
                                        key={index}
                                        onClick={() => onSlotSelect(slot)}
                                        className={`
                      p-4 text-left rounded-xl border-2 transition-all group
                      ${isSelected
                                                ? 'border-blue-600 bg-blue-50'
                                                : 'border-gray-200 hover:border-blue-200 hover:bg-gray-50'}
                    `}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <span className={`block font-bold ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                                                    {windowLabel}
                                                </span>
                                                <span className="text-xs text-gray-500 mt-1 block">
                                                    {secondaryLabel}
                                                </span>
                                            </div>
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-blue-600 bg-blue-600' : 'border-gray-300'}`}>
                                                {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                            <Calendar className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                            <p className="text-sm text-gray-500">Pick a date to view arrival availability</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
