import React, { useState } from 'react';
import { Tag, MapPin, Clock, CheckCircle2 } from 'lucide-react';
import { EventType } from '../../../lib/types';

interface StaffShiftBoardProps {
    eventType: EventType;
}

export default function StaffShiftBoard({ eventType }: StaffShiftBoardProps) {
    const [claimedShifts, setClaimedShifts] = useState<number[]>([]);

    // Mock available shifts
    const shifts = [
        { id: 1, date: 'Tomorrow', time: '08:00 - 16:00', location: 'Main Branch', role: 'Support Specialist' },
        { id: 2, date: 'Tomorrow', time: '12:00 - 20:00', location: 'East Wing', role: 'Senior Consultant' },
        { id: 3, date: 'Fri, Feb 6', time: '09:00 - 17:00', location: 'HQ', role: 'Reception' },
    ];

    const handleClaim = (id: number) => {
        setClaimedShifts([...claimedShifts, id]);
    };

    return (
        <div className="grid gap-6">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold text-gray-900">Open Shifts Broadcast</h3>
                <div className="px-3 py-1 bg-violet-100 text-violet-700 rounded-full text-xs font-bold uppercase tracking-wider">
                    Staff Only
                </div>
            </div>

            <div className="space-y-4">
                {shifts.map((shift) => {
                    const isClaimed = claimedShifts.includes(shift.id);

                    return (
                        <div
                            key={shift.id}
                            className={`
                bg-white p-6 rounded-2xl border-2 transition-all
                ${isClaimed ? 'border-green-500 ring-4 ring-green-50' : 'border-gray-100 hover:border-violet-200'}
              `}
                        >
                            <div className="flex items-start justify-between">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-bold">{shift.date}</span>
                                        <h4 className="font-bold text-gray-900">{shift.role}</h4>
                                    </div>

                                    <div className="flex flex-wrap gap-4">
                                        <div className="flex items-center gap-2 text-gray-500 text-sm">
                                            <Clock className="w-4 h-4" />
                                            {shift.time}
                                        </div>
                                        <div className="flex items-center gap-2 text-gray-500 text-sm">
                                            <MapPin className="w-4 h-4" />
                                            {shift.location}
                                        </div>
                                        <div className="flex items-center gap-2 text-gray-500 text-sm">
                                            <Tag className="w-4 h-4" />
                                            {eventType.title}
                                        </div>
                                    </div>
                                </div>

                                {isClaimed ? (
                                    <div className="flex items-center gap-2 text-green-600 font-bold bg-green-50 px-4 py-2 rounded-full">
                                        <CheckCircle2 className="w-5 h-5" />
                                        Claimed
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => handleClaim(shift.id)}
                                        className="px-6 py-3 bg-violet-600 text-white font-bold rounded-xl hover:bg-violet-700 transition-all shadow-lg shadow-violet-100 active:scale-95"
                                    >
                                        Claim Shift
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
