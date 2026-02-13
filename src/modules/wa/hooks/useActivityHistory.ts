import { useQuery } from '@tanstack/react-query';
import type { ActivityItem } from '../types';
import { mockActivityHistory } from '../data/mockData';

export const useActivityHistory = (participantId: string | null) => {
    return useQuery({
        queryKey: ['activityHistory', participantId],
        queryFn: async (): Promise<ActivityItem[]> => {
            if (!participantId) return [];

            await new Promise(resolve => setTimeout(resolve, 200));
            return mockActivityHistory[participantId] || [];
        },
        enabled: !!participantId,
        staleTime: 1000 * 60 * 5,
    });
};
