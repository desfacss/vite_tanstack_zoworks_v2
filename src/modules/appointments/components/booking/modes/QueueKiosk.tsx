import React, { useState } from 'react';
import { Users, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { EventType } from '../../../lib/types';

interface QueueKioskProps {
    eventType: EventType;
    onJoinQueue: (formData: any) => void;
    isLoading?: boolean;
}

export default function QueueKiosk({ eventType, onJoinQueue, isLoading }: QueueKioskProps) {
    const [isJoined, setIsJoined] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');

    // Mock queue data
    const currentQueueCount = 12;
    const estimatedWaitMinutes = 45;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !email) return;

        onJoinQueue({ name, email, notes: 'Join Queue (At-Store)' });
        setIsJoined(true);
    };

    if (isJoined) {
        return (
            <div className="bg-white rounded-xl p-8 text-center animate-in fade-in zoom-in duration-300">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">You're in line!</h3>
                <p className="text-gray-600 mb-6">We'll send you an SMS and email when we're ready for you.</p>

                <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto p-4 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="text-center p-3 border-r border-gray-200">
                        <span className="block text-2xl font-bold text-blue-600">#4</span>
                        <span className="text-xs text-gray-500 uppercase tracking-wider">Position</span>
                    </div>
                    <div className="text-center p-3">
                        <span className="block text-2xl font-bold text-blue-600">~15m</span>
                        <span className="text-xs text-gray-500 uppercase tracking-wider">Est. Wait</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-blue-600 rounded-xl p-6 text-white shadow-lg shadow-blue-200">
                    <div className="flex items-center gap-2 mb-2 opacity-80">
                        <Users className="w-4 h-4" />
                        <span className="text-xs font-medium uppercase tracking-wider">People in Queue</span>
                    </div>
                    <p className="text-4xl font-bold">{currentQueueCount}</p>
                </div>

                <div className="bg-amber-500 rounded-xl p-6 text-white shadow-lg shadow-amber-200">
                    <div className="flex items-center gap-2 mb-2 opacity-80">
                        <Clock className="w-4 h-4" />
                        <span className="text-xs font-medium uppercase tracking-wider">Estimated Wait</span>
                    </div>
                    <p className="text-4xl font-bold">{estimatedWaitMinutes}m</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
                <div className="flex items-start gap-4 mb-6">
                    <div className="p-2 bg-blue-50 rounded-lg">
                        <AlertCircle className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Join the {eventType.title}</h3>
                        <p className="text-sm text-gray-600">Enter your details below to secure your spot in line.</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1 ml-1">Full Name</label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                placeholder="John Doe"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1 ml-1">Email / Phone</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                placeholder="john@example.com"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-all flex items-center justify-center gap-2 shadow-xl shadow-gray-200"
                    >
                        {isLoading ? 'Joining...' : 'Check-in Now'}
                    </button>
                </form>

                <p className="mt-4 text-center text-xs text-gray-400">
                    By joining, you agree to receive a notification when your turn is coming up.
                </p>
            </div>
        </div>
    );
}
