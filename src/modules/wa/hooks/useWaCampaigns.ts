import { useAuthStore } from '@/core/lib/store';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface WaCampaign {
    id: string;
    organization_id: string;
    name: string;
    type: 'broadcast';
    segment_id?: string;
    template_id?: string;
    template_name?: string;
    status: 'draft' | 'scheduled' | 'processing' | 'completed' | 'failed' | 'cancelled';
    scheduled_at?: string;
    stats: {
        sent: number;
        delivered: number;
        read: number;
        failed: number;
        replied: number;
    };
    created_at: string;
    updated_at: string;
}

// Fetch all campaigns
export const useWaCampaigns = () => {
    return useQuery({
        queryKey: ['wa-campaigns'],
        queryFn: async () => {
            const organizationId = useAuthStore.getState().organization?.id;
            const { data, error } = await supabase
                .schema('wa')
                .from('wa_drip_campaigns')
                .select('*')
                .eq('organization_id', organizationId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as WaCampaign[];
        }
    });
};

// Create a new campaign
export const useCreateWaCampaign = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (campaign: Partial<WaCampaign>) => {
            const organizationId = useAuthStore.getState().organization?.id;
            const { data, error } = await supabase
                .schema('wa')
                .from('wa_drip_campaigns')
                .insert({
                    ...campaign,
                    organization_id: organizationId,
                    type: 'broadcast',
                    stats: { sent: 0, delivered: 0, read: 0, failed: 0, replied: 0 }
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['wa-campaigns'] });
        }
    });
};

// Update an existing campaign
export const useUpdateWaCampaign = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...updates }: Partial<WaCampaign> & { id: string }) => {
            const { data, error } = await supabase
                .schema('wa')
                .from('wa_drip_campaigns')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['wa-campaigns'] });
        }
    });
};

// Delete a campaign
export const useDeleteWaCampaign = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .schema('wa')
                .from('wa_drip_campaigns')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['wa-campaigns'] });
        }
    });
};
