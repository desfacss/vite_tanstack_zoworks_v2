import { useAuthStore } from '@/core/lib/store';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { message } from 'antd';

export interface WaContact {
    id: string;
    wa_id: string;
    name: string;
    profile_picture_url?: string;
    tags: string[];
    opt_in_status: boolean;
    created_at: string;
    updated_at: string;
}

// Fetch all contacts
const fetchContacts = async (): Promise<WaContact[]> => {
    const organizationId = useAuthStore.getState().organization?.id;

    const { data, error } = await supabase
        .schema('wa')
        .from('wa_contacts')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
};

// Create contact
const createContact = async (contact: { name: string; wa_id: string; tags?: string[] }) => {
    const organizationId = useAuthStore.getState().organization?.id;

    const { data, error } = await supabase
        .schema('wa')
        .from('wa_contacts')
        .insert([{
            ...contact,
            organization_id: organizationId,
            opt_in_status: true, // Default to true for now
        }])
        .select()
        .single();

    if (error) throw error;
    return data;
};

// Update contact
const updateContact = async (contact: { id: string; name?: string; wa_id?: string; tags?: string[] }) => {
    const organizationId = useAuthStore.getState().organization?.id;
    const { id, ...updates } = contact;

    const { data, error } = await supabase
        .schema('wa')
        .from('wa_contacts')
        .update(updates)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();

    if (error) throw error;
    return data;
};

// Delete contact
const deleteContact = async (id: string) => {
    const organizationId = useAuthStore.getState().organization?.id;

    const { error } = await supabase
        .schema('wa')
        .from('wa_contacts')
        .delete()
        .eq('id', id)
        .eq('organization_id', organizationId);

    if (error) throw error;
    return true;
};

export const useWaContacts = () => {
    return useQuery({
        queryKey: ['wa_contacts'],
        queryFn: fetchContacts,
    });
};

export const useCreateContact = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createContact,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['wa_contacts'] });
            message.success('Contact created successfully');
        },
        onError: (error: any) => {
            message.error('Failed to create contact: ' + error.message);
        }
    });
};

export const useUpdateContact = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: updateContact,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['wa_contacts'] });
            queryClient.invalidateQueries({ queryKey: ['conversationContact'] }); // Also update active conversation views
            message.success('Contact updated successfully');
        },
        onError: (error: any) => {
            message.error('Failed to update contact: ' + error.message);
        }
    });
};

export const useDeleteContact = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteContact,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['wa_contacts'] });
            message.success('Contact deleted successfully');
        },
        onError: (error: any) => {
            message.error('Failed to delete contact: ' + error.message);
        }
    });
};
