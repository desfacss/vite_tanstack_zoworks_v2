import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// Types derived from the new tables
export interface DripCampaign {
    id: string;
    organization_id: string;
    name: string;
    description: string | null;
    trigger_type: 'new_lead' | 'tag_added' | 'manual' | 'keyword' | 'message_received' | 'inactive';
    trigger_config: any;
    is_active: boolean;
    created_at: string;
}

export interface DripStep {
    id: string;
    campaign_id: string;
    step_type: 'message' | 'delay' | 'condition' | 'action';
    content: any;
    parent_step_id: string | null;
    position: { x: number; y: number } | null;
    sequence_order: number;
}

// Hook to fetch all campaigns
interface UseDripCampaignsOptions {
    allTenants?: boolean;  // If true, fetch from all organizations (community)
    enabled?: boolean;     // Control when the query runs
}

export const useDripCampaigns = (options?: UseDripCampaignsOptions) => {
    const { allTenants = false, enabled = true } = options || {};

    return useQuery({
        queryKey: ['drip-campaigns', allTenants ? 'community' : 'my'],
        enabled,
        queryFn: async () => {
            // Note: Organization ID filtering handled by RLS or application logic
            // For now, using useAuthStore in component level if needed
            let query = supabase
                .schema('wa')
                .from('wa_drip_campaigns')
                .select('*')
                .order('created_at', { ascending: false });

            // Removed organizationId filter - should be handled by RLS policy
            // If needed, pass organizationId from component and filter here

            const { data, error } = await query;

            if (error) throw error;
            return data as DripCampaign[];
        }
    });
};

// Hook to fetch a single campaign with its steps
export const useDripCampaign = (id: string | null) => {
    return useQuery({
        queryKey: ['drip-campaign', id],
        enabled: !!id,
        queryFn: async () => {
            // Fetch campaign metadata
            const { data: campaign, error: campError } = await supabase
                .schema('wa')
                .from('wa_drip_campaigns')
                .select('*')
                .eq('id', id)
                .single();

            if (campError) throw campError;

            // Fetch steps
            const { data: steps, error: stepsError } = await supabase
                .schema('wa')
                .from('wa_drip_steps')
                .select('*')
                .eq('campaign_id', id);

            if (stepsError) throw stepsError;

            return {
                ...campaign,
                steps: steps as DripStep[]
            };
        }
    });
};

// Mutations
export const useCreateDripCampaign = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (campaign: Partial<DripCampaign>) => {
            // Organization ID should be passed from component using useAuthStore
            const { data, error } = await supabase
                .schema('wa')
                .from('wa_drip_campaigns')
                .insert(campaign) // campaign already contains organization_id
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['drip-campaigns'] });
        }
    });
};

export const useUpdateDripSteps = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ campaignId, steps }: { campaignId: string, steps: DripStep[] }) => {
            if (steps.length === 0) return [];

            const stepsToUpsert = steps.map(s => {
                const base: any = {
                    campaign_id: campaignId,
                    step_type: s.step_type,
                    content: s.content,
                    parent_step_id: s.parent_step_id,
                    position: s.position,
                    sequence_order: s.sequence_order
                };
                if (s.id && !s.id.startsWith('temp_')) {
                    base.id = s.id;
                }
                return base;
            });

            console.log('Upserting steps:', JSON.stringify(stepsToUpsert, null, 2));

            const { data, error } = await supabase
                .schema('wa')
                .from('wa_drip_steps')
                .upsert(stepsToUpsert, { onConflict: 'id' })
                .select();

            if (error) throw error;
            return data || [];
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['drip-campaign', variables.campaignId] });
        }
    });
};

// Update campaign metadata (name, trigger, etc.)
export const useUpdateDripCampaign = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...updates }: Partial<DripCampaign> & { id: string }) => {
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
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['drip-campaigns'] });
            queryClient.invalidateQueries({ queryKey: ['drip-campaign', data.id] });
        }
    });
};

// Delete a campaign and its steps (cascade delete handles steps)
export const useDeleteDripCampaign = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (campaignId: string) => {
            const { error } = await supabase
                .schema('wa')
                .from('wa_drip_campaigns')
                .delete()
                .eq('id', campaignId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['drip-campaigns'] });
        }
    });
};

// Delete a single step
export const useDeleteDripStep = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ stepId, campaignId }: { stepId: string, campaignId: string }) => {
            const { error } = await supabase
                .schema('wa')
                .from('wa_drip_steps')
                .delete()
                .eq('id', stepId);

            if (error) throw error;
            return { campaignId };
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['drip-campaign', data.campaignId] });
        }
    });
};

// Clone a campaign with its steps
export const useCloneDripCampaign = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (campaignId: string) => {
            // Fetch original campaign
            const { data: original, error: fetchError } = await supabase
                .schema('wa')
                .from('wa_drip_campaigns')
                .select('*')
                .eq('id', campaignId)
                .single();

            if (fetchError) throw fetchError;

            // Create new campaign using organization_id from the original (for cloning within org)
            // Or use activeOrgId if cloning cross-org (passed from component)
            const { data: newCampaign, error: insertError } = await supabase
                .schema('wa')
                .from('wa_drip_campaigns')
                .insert({
                    organization_id: original.organization_id, // Clone to same org
                    name: `${original.name} (Copy)`,
                    description: original.description,
                    trigger_type: original.trigger_type,
                    trigger_config: original.trigger_config,
                    is_active: false
                })
                .select()
                .single();

            if (insertError) throw insertError;

            // Fetch original steps
            const { data: originalSteps, error: stepsError } = await supabase
                .schema('wa')
                .from('wa_drip_steps')
                .select('*')
                .eq('campaign_id', campaignId);

            if (stepsError) throw stepsError;

            // Clone steps if any
            if (originalSteps && originalSteps.length > 0) {
                const idMap: Record<string, string> = {};
                originalSteps.forEach(s => {
                    idMap[s.id] = crypto.randomUUID();
                });

                const newSteps = originalSteps.map(s => ({
                    id: idMap[s.id],
                    campaign_id: newCampaign.id,
                    step_type: s.step_type,
                    content: s.content,
                    parent_step_id: s.parent_step_id ? idMap[s.parent_step_id] : null,
                    position: s.position,
                    sequence_order: s.sequence_order
                }));

                await supabase.schema('wa').from('wa_drip_steps').insert(newSteps);
            }
            return newCampaign;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['drip-campaigns'] });
        }
    });
};

// ============================================================================
// ENROLLMENT TYPES AND HOOKS
// ============================================================================

export interface DripEnrollment {
    id: string;
    campaign_id: string;
    contact_id: string;
    current_step_id: string | null;
    status: 'active' | 'completed' | 'paused' | 'cancelled';
    next_execution_at: string | null;
    last_activity_at: string;
    variables: any;
    created_at: string;
    completed_at: string | null;
    // Joined data
    contact?: {
        id: string;
        wa_id: string;
        name: string;
    };
    current_step?: DripStep;
}

// Fetch enrollments for a campaign
export const useCampaignEnrollments = (campaignId: string | null) => {
    const queryClient = useQueryClient();

    // Real-time subscription
    React.useEffect(() => {
        if (!campaignId) return;

        const channel = supabase
            .channel(`drip-enrollments-${campaignId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'wa',
                    table: 'wa_drip_enrollments',
                    filter: `campaign_id=eq.${campaignId}`
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['campaign-enrollments', campaignId] });
                    queryClient.invalidateQueries({ queryKey: ['campaign-stats', campaignId] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [campaignId, queryClient]);

    return useQuery({
        queryKey: ['campaign-enrollments', campaignId],
        enabled: !!campaignId,
        queryFn: async () => {
            const { data, error } = await supabase
                .schema('wa')
                .from('wa_drip_enrollments')
                .select(`
                    *,
                    contact:wa_contacts(id, wa_id, name),
                    current_step:wa_drip_steps(id, step_type, content)
                `)
                .eq('campaign_id', campaignId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as DripEnrollment[];
        }
    });
};

// Get campaign stats using the DB function
export const useCampaignStats = (campaignId: string | null) => {
    return useQuery({
        queryKey: ['campaign-stats', campaignId],
        enabled: !!campaignId,
        queryFn: async () => {
            const { data, error } = await supabase
                .schema('wa')
                .rpc('wa_drip_campaign_stats', { p_campaign_id: campaignId });

            if (error) throw error;
            return data?.[0] || {
                total_enrolled: 0,
                active_count: 0,
                completed_count: 0,
                paused_count: 0,
                cancelled_count: 0
            };
        }
    });
};

// Pause an enrollment
export const usePauseEnrollment = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ enrollmentId, campaignId }: { enrollmentId: string, campaignId: string }) => {
            const { error } = await supabase
                .schema('wa')
                .rpc('wa_drip_pause_enrollment', { p_enrollment_id: enrollmentId });
            if (error) throw error;
            return { campaignId };
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['campaign-enrollments', data.campaignId] });
            queryClient.invalidateQueries({ queryKey: ['campaign-stats', data.campaignId] });
        }
    });
};

// Resume an enrollment
export const useResumeEnrollment = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ enrollmentId, campaignId }: { enrollmentId: string, campaignId: string }) => {
            const { error } = await supabase
                .schema('wa')
                .rpc('wa_drip_resume_enrollment', { p_enrollment_id: enrollmentId });
            if (error) throw error;
            return { campaignId };
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['campaign-enrollments', data.campaignId] });
            queryClient.invalidateQueries({ queryKey: ['campaign-stats', data.campaignId] });
        }
    });
};

// Cancel an enrollment
export const useCancelEnrollment = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ enrollmentId, campaignId }: { enrollmentId: string, campaignId: string }) => {
            const { error } = await supabase
                .schema('wa')
                .rpc('wa_drip_cancel_enrollment', { p_enrollment_id: enrollmentId });
            if (error) throw error;
            return { campaignId };
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['campaign-enrollments', data.campaignId] });
            queryClient.invalidateQueries({ queryKey: ['campaign-stats', data.campaignId] });
        }
    });
};

// Manually enroll a contact
export const useEnrollContact = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ campaignId, contactId, variables = {} }: {
            campaignId: string,
            contactId: string,
            variables?: any
        }) => {
            const { data, error } = await supabase
                .schema('wa')
                .rpc('wa_drip_enroll_contact', {
                    p_campaign_id: campaignId,
                    p_contact_id: contactId,
                    p_variables: variables
                });
            if (error) throw error;
            return { campaignId, enrollmentId: data };
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['campaign-enrollments', data.campaignId] });
            queryClient.invalidateQueries({ queryKey: ['campaign-stats', data.campaignId] });
        }
    });
};
