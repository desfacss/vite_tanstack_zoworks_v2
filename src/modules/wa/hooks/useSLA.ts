import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';

dayjs.extend(duration);

export type SLAStatus = 'on_track' | 'warning' | 'breached' | 'none';

interface UseSLAResult {
    status: SLAStatus;
    timeRemaining: string;
    isOverdue: boolean;
    color: string;
}

export const useSLA = (dueAt?: string | null, lastCustomerMessageAt?: string | null): UseSLAResult => {
    const [status, setStatus] = useState<SLAStatus>('none');
    const [timeRemaining, setTimeRemaining] = useState<string>('');
    const [isOverdue, setIsOverdue] = useState<boolean>(false);
    const [color, setColor] = useState<string>('transparent');

    useEffect(() => {
        const calculateSLA = () => {
            const now = dayjs();

            // 1. Check for Response SLA (Priority)
            if (dueAt) {
                const due = dayjs(dueAt);
                const diffMs = due.diff(now);
                const diffDuration = dayjs.duration(diffMs);
                const isPast = diffMs < 0;

                setIsOverdue(isPast);

                if (isPast) {
                    // Breached (Red)
                    setStatus('breached');
                    setColor('#ff4d4f');
                    setTimeRemaining(`-${diffDuration.humanize()}`);
                    return;
                } else {
                    const hoursRemaining = diffDuration.asHours();
                    setTimeRemaining(diffDuration.format('HH:mm:ss'));

                    if (hoursRemaining < 1) {
                        // Warning: < 1 Hour remaining (Amber/Orange)
                        setStatus('warning');
                        setColor('#faad14');
                    } else {
                        // On Track: > 1 Hour remaining
                        setStatus('on_track');
                        setColor('#52c41a');
                    }
                    return;
                }
            }

            // 2. Check for 24h Window Closing Soon (Secondary Priority)
            if (lastCustomerMessageAt) {
                const lastMsg = dayjs(lastCustomerMessageAt);
                const windowExpiresAt = lastMsg.add(24, 'hours');
                const hoursUntilExpiry = windowExpiresAt.diff(now, 'hours', true);

                // If between 22 and 24 hours (i.e., < 2 hours remaining in window)
                if (hoursUntilExpiry > 0 && hoursUntilExpiry < 2) {
                    setStatus('warning'); // Re-using warning status or create new 'window_closing'
                    setColor('#722ed1'); // Purple for "Window Closing"
                    setTimeRemaining(`${Math.round(hoursUntilExpiry * 60)}m window`);
                    return;
                }
            }

            // Default
            setStatus('none');
            setTimeRemaining('');
            setIsOverdue(false);
            setColor('transparent');
        };

        calculateSLA();
        const interval = setInterval(calculateSLA, 60000); // 1 min update

        return () => clearInterval(interval);
    }, [dueAt, lastCustomerMessageAt]);

    return { status, timeRemaining, isOverdue, color };
};
