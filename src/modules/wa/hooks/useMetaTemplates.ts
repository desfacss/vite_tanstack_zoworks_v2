import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { useAuthStore } from '@/core/lib/store';
import {
    fetchTemplatesFromMeta,
    createTemplateAtMeta,
    deleteTemplateAtMeta,
    editTemplateAtMeta,
    syncTemplatesToLocal,
    fetchLocalTemplates,
    getTemplateWithMappings,
    saveVariableMappings,
    GraphTemplate
} from '../services/whatsappTemplates';

// Fetch templates directly from Meta API
export const useMetaTemplates = () => {
    const { user, organization, initialized } = useAuthStore();

    return useQuery({
        queryKey: ['meta_templates'],
        queryFn: fetchTemplatesFromMeta,
        staleTime: 1000 * 60 * 5, // 5 minutes
        enabled: initialized && !!user && !!organization,
    });
};

// Fetch templates from local wa_templates table
export const useLocalTemplates = () => {
    return useQuery({
        queryKey: ['local_templates'],
        queryFn: fetchLocalTemplates,
        staleTime: 1000 * 60 * 5,
    });
};

// Fetch single template with its variable mappings
export const useTemplateWithMappings = (templateId: string | null) => {
    return useQuery({
        queryKey: ['template_mappings', templateId],
        queryFn: () => getTemplateWithMappings(templateId!),
        enabled: !!templateId,
    });
};

// Sync templates from Meta to local database
export const useSyncTemplates = () => {
    const queryClient = useQueryClient();
    const { message } = App.useApp();

    return useMutation({
        mutationFn: syncTemplatesToLocal,
        onSuccess: (result: { synced: number; errors: string[] }) => {
            queryClient.invalidateQueries({ queryKey: ['local_templates'] });
            if (result.errors.length > 0) {
                message.warning(`Synced ${result.synced} templates with ${result.errors.length} errors`);
                console.error('Sync errors:', result.errors);
            } else {
                message.success(`Successfully synced ${result.synced} templates from Meta`);
            }
        },
        onError: (error: any) => {
            console.error('Error syncing templates:', error);
            message.error(`Sync failed: ${error.message}`);
        }
    });
};

// Save variable mappings for a template
export const useSaveVariableMappings = () => {
    const queryClient = useQueryClient();
    const { message } = App.useApp();

    return useMutation({
        mutationFn: ({ templateId, mappings }: {
            templateId: string;
            mappings: Array<{
                variable_index: number;
                variable_label?: string;
                data_source: string;
                data_field: string;
                default_value?: string;
            }>;
        }) => saveVariableMappings(templateId, mappings),
        onSuccess: (_: any, variables: { templateId: string; mappings: any[] }) => {
            queryClient.invalidateQueries({ queryKey: ['template_mappings', variables.templateId] });
            message.success('Variable mappings saved');
        },
        onError: (error: any) => {
            message.error(`Failed to save mappings: ${error.message}`);
        }
    });
};

export const useCreateMetaTemplate = () => {
    const queryClient = useQueryClient();
    const { message } = App.useApp();

    return useMutation({
        mutationFn: (template: GraphTemplate) => createTemplateAtMeta(template),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['meta_templates'] });
            queryClient.invalidateQueries({ queryKey: ['local_templates'] });
            message.success('Template submitted to Meta for approval');
        },
        onError: (error: any) => {
            console.error('Error creating template:', error);
            const errorMsg = error.response?.data?.error?.message || error.message || 'Failed to create template';
            message.error(`Failed: ${errorMsg}`);
        }
    });
};

export const useUpdateMetaTemplate = () => {
    const queryClient = useQueryClient();
    const { message } = App.useApp();

    return useMutation({
        mutationFn: ({ id, template }: { id: string; template: GraphTemplate }) => editTemplateAtMeta(id, template),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['meta_templates'] });
            queryClient.invalidateQueries({ queryKey: ['local_templates'] });
            message.success('Template updated successfully');
        },
        onError: (error: any) => {
            console.error('Error updating template:', error);
            const errorMsg = error.response?.data?.error?.message || error.message || 'Failed to update template';
            message.error(`Failed: ${errorMsg}`);
        }
    });
};

export const useDeleteMetaTemplate = () => {
    const queryClient = useQueryClient();
    const { message } = App.useApp();

    return useMutation({
        mutationFn: (name: string) => deleteTemplateAtMeta(name),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['meta_templates'] });
            queryClient.invalidateQueries({ queryKey: ['local_templates'] });
            message.success('Template deleted from Meta');
        },
        onError: (error: any) => {
            console.error('Error deleting template:', error);
            const errorMsg = error.response?.data?.error?.message || error.message || 'Failed to delete template';
            message.error(`Failed: ${errorMsg}`);
        }
    });
};
