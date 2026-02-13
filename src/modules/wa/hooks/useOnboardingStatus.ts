import { useAuthStore } from '@/core/lib/store';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface OnboardingStatus {
    hasContacts: boolean;
    hasTemplates: boolean;
    hasSentMessage: boolean;
    percentComplete: number;
    currentStep: number;
}

export const useOnboardingStatus = () => {
    return useQuery({
        queryKey: ['onboardingStatus'],
        queryFn: async (): Promise<OnboardingStatus> => {
            const organizationId = useAuthStore.getState().organization?.id;

            // 1. Check Contacts
            const { count: contactCount } = await supabase
                .schema('wa')
                .from('wa_contacts')
                .select('*', { count: 'exact', head: true })
                .eq('organization_id', organizationId);

            // 2. Check Templates (Local sync)
            const { count: templateCount } = await supabase
                .schema('wa')
                .from('wa_templates')
                .select('*', { count: 'exact', head: true })
                .eq('organization_id', organizationId);

            // 3. Check Messages (Sent)
            const { count: messageCount } = await supabase
                .schema('wa')
                .from('wa_messages')
                .select('*', { count: 'exact', head: true })
                .eq('organization_id', organizationId)
                .eq('direction', 'outbound');

            const hasContacts = (contactCount || 0) > 0;
            const hasTemplates = (templateCount || 0) > 0;
            const hasSentMessage = (messageCount || 0) > 0;

            let completedSteps = 0;
            if (hasContacts) completedSteps++;
            if (hasTemplates) completedSteps++;
            if (hasSentMessage) completedSteps++;

            // Total steps = 3 (excluding "Connect Number" which is assumed if they are here)
            const percentComplete = Math.round((completedSteps / 3) * 100);

            let currentStep = 0;
            if (!hasContacts) currentStep = 0;
            else if (!hasTemplates) currentStep = 1;
            else if (!hasSentMessage) currentStep = 2;
            else currentStep = 3; // Done

            return {
                hasContacts,
                hasTemplates,
                hasSentMessage,
                percentComplete,
                currentStep
            };
        },
        staleTime: 1000 * 60 * 1, // Cache for 1 minute
    });
};
