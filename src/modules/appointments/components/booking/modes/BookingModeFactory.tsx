import React from 'react';
import { EventType, TimeSlot, EnhancedTimeSlot, UseCaseConfig } from '../../../lib/types';
import ClassicAppointmentGrid from './ClassicAppointmentGrid';
import QueueKiosk from './QueueKiosk';
import ArrivalWindowSelector from './ArrivalWindowSelector';
import SeriesBookingSelector from './SeriesBookingSelector';
import StaffShiftBoard from './StaffShiftBoard';

interface BookingModeFactoryProps {
    eventType: EventType;
    currentMonth: Date;
    selectedDate: Date | null;
    availableDates: Date[];
    timeSlots: (TimeSlot | EnhancedTimeSlot)[];
    selectedSlot: (TimeSlot | EnhancedTimeSlot) | null;
    onDateSelect: (date: Date) => void;
    onMonthChange: (month: Date) => void;
    onSlotSelect: (slot: TimeSlot | EnhancedTimeSlot) => void;
    onJoinQueue: (formData: any) => void;
    showCapacity?: boolean;
    isLoading?: boolean;
}

export default function BookingModeFactory({
    eventType,
    currentMonth,
    selectedDate,
    availableDates,
    timeSlots,
    selectedSlot,
    onDateSelect,
    onMonthChange,
    onSlotSelect,
    onJoinQueue,
    showCapacity,
    isLoading,
}: BookingModeFactoryProps) {
    switch (eventType.booking_mode) {
        case 'queue':
            return <QueueKiosk eventType={eventType} onJoinQueue={onJoinQueue} isLoading={isLoading} />;

        case 'series':
            return (
                <SeriesBookingSelector
                    currentMonth={currentMonth}
                    selectedDate={selectedDate}
                    availableDates={availableDates}
                    timeSlots={timeSlots}
                    selectedSlot={selectedSlot}
                    onDateSelect={onDateSelect}
                    onMonthChange={onMonthChange}
                    onSlotSelect={onSlotSelect}
                />
            );

        case 'arrival-window':
            return (
                <ArrivalWindowSelector
                    currentMonth={currentMonth}
                    selectedDate={selectedDate}
                    availableDates={availableDates}
                    timeSlots={timeSlots}
                    selectedSlot={selectedSlot}
                    onDateSelect={onDateSelect}
                    onMonthChange={onMonthChange}
                    onSlotSelect={onSlotSelect}
                />
            );

        case 'open-shift':
            return <StaffShiftBoard eventType={eventType} />;

        case 'appointment':
        default:
            return (
                <ClassicAppointmentGrid
                    currentMonth={currentMonth}
                    selectedDate={selectedDate}
                    availableDates={availableDates}
                    timeSlots={timeSlots}
                    selectedSlot={selectedSlot}
                    onDateSelect={onDateSelect}
                    onMonthChange={onMonthChange}
                    onSlotSelect={onSlotSelect}
                    showCapacity={showCapacity}
                />
            );
    }
}
