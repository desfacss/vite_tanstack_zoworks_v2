import { useQuery } from '@tanstack/react-query';
import type { ParticipantDetails } from '../types';
import { mockParticipantDetails } from '../data/mockData';

export const useParticipantDetails = (participantId: string | null) => {
    return useQuery({
        queryKey: ['participant', participantId],
        queryFn: async (): Promise<ParticipantDetails | null> => {
            if (!participantId) return null;

            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 200));

            // Return mock data
            return mockParticipantDetails[participantId] || null;
        },
        enabled: !!participantId,
        staleTime: 1000 * 60 * 5,
    });
};
