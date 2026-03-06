import React from 'react';
import CalendarView from '../../CalendarView';
import { TimeSlot, EnhancedTimeSlot } from '../../../lib/types';
import { Calendar, Repeat, Info } from 'lucide-react';

interface SeriesBookingSelectorProps {
    currentMonth: Date;
    selectedDate: Date | null;
    availableDates: Date[];
    timeSlots: (TimeSlot | EnhancedTimeSlot)[];
    selectedSlot: (TimeSlot | EnhancedTimeSlot) | null;
    onDateSelect: (date: Date) => void;
    onMonthChange: (month: Date) => void;
    onSlotSelect: (slot: TimeSlot | EnhancedTimeSlot) => void;
}

export default function SeriesBookingSelector({
    currentMonth,
    selectedDate,
    availableDates,
    timeSlots,
    selectedSlot,
    onDateSelect,
    onMonthChange,
    onSlotSelect,
}: SeriesBookingSelectorProps) {
    return (
        <div className="space-y-8">
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-6 shadow-sm">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-purple-100 rounded-full text-purple-600">
                        <Repeat className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="text-lg font-bold text-purple-900 mb-1">Series Booking</h4>
                        <p className="text-sm text-purple-700 leading-relaxed">
                            Pick your first session. This will automatically schedule <strong>4 weekly sessions</strong>
                            at the same time each week to ensure consistent progress.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                <div>
                    <div className="flex items-center gap-2 mb-4 text-gray-700 font-bold">
                        <Calendar className="w-4 h-4 text-purple-600" />
                        Step 1: Select Start Date
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
                        <Repeat className="w-4 h-4 text-purple-600" />
                        Step 2: Choose Weekly Time
                    </div>
                    {selectedDate ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                {timeSlots.map((slot, index) => {
                                    const isSelected = selectedSlot?.time === slot.time;
                                    return (
                                        <button
                                            key={index}
                                            onClick={() => onSlotSelect(slot)}
                                            className={`
                                                p-4 text-center rounded-xl border-2 transition-all font-bold
                                                ${isSelected
                                                    ? 'border-purple-600 bg-purple-50 text-purple-900 shadow-sm'
                                                    : 'border-gray-100 hover:border-purple-200 hover:bg-gray-50 text-gray-700'}
                                            `}
                                        >
                                            {slot.time}
                                        </button>
                                    );
                                })}
                            </div>

                            {selectedSlot && (
                                <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                                    <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Planned Schedule:</h5>
                                    <div className="space-y-2">
                                        {[0, 1, 2, 3].map((week) => {
                                            const d = new Date(selectedDate);
                                            d.setDate(d.getDate() + (week * 7));
                                            return (
                                                <div key={week} className="flex items-center gap-3 text-sm text-gray-700">
                                                    <div className="w-5 h-5 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-[10px] font-bold">
                                                        {week + 1}
                                                    </div>
                                                    <span>
                                                        {d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {selectedSlot.time}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="mt-4 flex items-center gap-2 text-[11px] text-gray-500 italic">
                                        <Info className="w-3.5 h-3.5" />
                                        Availability for all dates in the series has been verified.
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                            <Repeat className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                            <p className="text-sm text-gray-500">Pick a start date to see times</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
