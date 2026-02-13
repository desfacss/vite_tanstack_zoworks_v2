import { useQuery } from '@tanstack/react-query';
import type { InternalNote } from '../types';
import { mockInternalNotes } from '../data/mockData';

export const useInternalNotes = (conversationId: string | null) => {
    return useQuery({
        queryKey: ['internalNotes', conversationId],
        queryFn: async (): Promise<InternalNote[]> => {
            if (!conversationId) return [];

            await new Promise(resolve => setTimeout(resolve, 200));
            return mockInternalNotes[conversationId] || [];
        },
        enabled: !!conversationId,
        staleTime: 1000 * 60 * 5,
    });
};
