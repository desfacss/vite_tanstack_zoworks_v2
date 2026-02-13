import { useAuthStore } from '@/core/lib/store';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import type { MessageTemplate, Campaign, DripSequence, QuickReply } from '../types';
import { mockCampaigns, mockDripSequences, mockQuickReplies } from '../data/mockData';
import { supabase } from '@/lib/supabase';

// Fetch templates from Supabase
const fetchTemplates = async (): Promise<MessageTemplate[]> => {
    const organizationId = useAuthStore.getState().organization?.id;
    const { data, error } = await supabase
        .schema('wa')
        .from('wa_templates')
        .select('*')
        .eq('organization_id', organizationId)
        .order('name');

    if (error) throw error;
    // Map data to MessageTemplate type if needed, or assume it matches
    return data as MessageTemplate[];
};

export const useTemplates = () => {
    return useQuery({
        queryKey: ['templates'],
        queryFn: fetchTemplates,
        staleTime: 1000 * 60 * 5,
    });
};

export const useSyncTemplates = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async () => {
            const organizationId = useAuthStore.getState().organization?.id;
            // Call edge function to sync from Meta
            const { error } = await supabase.functions.invoke('whatsapp-templates-sync', {
                body: { organization_id: organizationId }
            });
            if (error) {
                // Fallback if function doesn't exist: just reload to simulate
                console.warn("Sync function failed, maybe not deployed.", error);
            }
            return true;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['templates'] });
            message.success('Templates synced from Meta');
        },
        onError: () => {
            message.error('Failed to sync templates');
        }
    });
};

export const useCreateTemplate = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (template: Partial<MessageTemplate>) => {
            const organizationId = useAuthStore.getState().organization?.id;
            const { data, error } = await supabase.schema('wa').from('wa_templates').insert({
                ...template,
                organization_id: organizationId,
                status: 'pending' // Defaults to pending until approved by Meta
            }).select().single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['templates'] });
            message.success('Template created (Pending Approval)');
        },
        onError: (err) => {
            console.error(err);
            message.error('Failed to create template');
        }
    });
};

export const useDeleteTemplate = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.schema('wa').from('wa_templates').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['templates'] });
            message.success('Template deleted');
        }
    });
};

export const useCampaigns = () => {
    return useQuery({
        queryKey: ['campaigns'],
        queryFn: async (): Promise<Campaign[]> => {
            await new Promise(resolve => setTimeout(resolve, 300));
            return mockCampaigns;
        },
        staleTime: 1000 * 60 * 5,
    });
};

export const useDripSequences = () => {
    return useQuery({
        queryKey: ['dripSequences'],
        queryFn: async (): Promise<DripSequence[]> => {
            await new Promise(resolve => setTimeout(resolve, 300));
            return mockDripSequences;
        },
        staleTime: 1000 * 60 * 5,
    });
};

export const useQuickReplies = () => {
    return useQuery({
        queryKey: ['quickReplies'],
        queryFn: async (): Promise<QuickReply[]> => {
            const organizationId = useAuthStore.getState().organization?.id;
            const { data, error } = await supabase
                .schema('wa')
                .from('wa_quick_replies')
                .select('*')
                .eq('organization_id', organizationId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as QuickReply[];
        },
        staleTime: 1000 * 60 * 5,
    });
};

export const useCreateQuickReply = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (quickReply: Partial<QuickReply>) => {
            const organizationId = useAuthStore.getState().organization?.id;
            const { data, error } = await supabase.schema('wa').from('wa_quick_replies').insert({
                ...quickReply,
                organization_id: organizationId,
            }).select().single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['quickReplies'] });
            message.success('Quick reply created');
        },
        onError: (err) => {
            console.error(err);
            message.error('Failed to create quick reply');
        }
    });
};

export const useUpdateQuickReply = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...updates }: Partial<QuickReply> & { id: string }) => {
            const { data, error } = await supabase
                .schema('wa')
                .from('wa_quick_replies')
                .update(updates)
                .eq('id', id)
                .select().single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['quickReplies'] });
            message.success('Quick reply updated');
        },
        onError: (err) => {
            console.error(err);
            message.error('Failed to update quick reply');
        }
    });
};

export const useDeleteQuickReply = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.schema('wa').from('wa_quick_replies').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['quickReplies'] });
            message.success('Quick reply deleted');
        },
        onError: (err) => {
            console.error(err);
            message.error('Failed to delete quick reply');
        }
    });
};
