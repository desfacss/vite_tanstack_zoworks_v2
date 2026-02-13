import { useAuthStore } from '@/core/lib/store';
import { supabase } from '@/lib/supabase';
import axios from 'axios';

const getOrganizationId = async (): Promise<string> => {
    const orgId = useAuthStore.getState().organization?.id;
    if (!orgId) throw new Error('No active organization found');
    return orgId;
};

const getWhatsAppConfig = async (orgId: string): Promise<{ wabaId: string; accessToken: string }> => {
    // TODO: Fetch from wa_config table
    const { data, error } = await supabase
        .schema('wa')
        .from('wa_config')
        .select('waba_id, access_token')
        .eq('organization_id', orgId)
        .single();
    
    if (error) throw error;
    return {
        wabaId: data.waba_id,
        accessToken: data.access_token
    };
};

// types/index.ts usually has these, but defining here for clarity if missing, 
// or I will import if I find them. For now, using 'any' or defining interfaces locally if needed to match Graph API exactly.
// The Graph API template structure is quite specific.

export interface GraphTemplateComponent {
    type: 'BODY' | 'HEADER' | 'FOOTER' | 'BUTTONS';
    text?: string;
    format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'LOCATION';
    buttons?: any[]; // Simplified for now
    example?: any;
}

export interface GraphTemplate {
    id?: string; // Added ID for editing
    name: string;
    category: 'AUTHENTICATION' | 'MARKETING' | 'UTILITY';
    language: string;
    status?: string;
    components: GraphTemplateComponent[];
}

const GRAPH_API_VERSION = 'v21.0'; // Using a recent version
const BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

const getAuth = async () => {
    const orgId = await getOrganizationId();
    const config = await getWhatsAppConfig(orgId);
    return {
        wabaId: config.wabaId,
        token: config.accessToken
    };
};

export const fetchTemplatesFromMeta = async () => {
    const { wabaId, token } = await getAuth();

    // Skip if WABA config is missing
    if (!wabaId || !token) {
        console.log('[Templates] Skipping Meta fetch - WABA config missing for this org');
        return [];
    }

    // https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates
    const response = await axios.get(`${BASE_URL}/${wabaId}/message_templates`, {
        params: {
            limit: 100,
        },
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    console.log('Fetched templates from Meta:', JSON.stringify(response.data.data, null, 2));
    return response.data.data;
};

export const createTemplateAtMeta = async (template: GraphTemplate) => {
    const { wabaId, token } = await getAuth();
    console.log('Creating template at Meta. Payload:', JSON.stringify(template, null, 2));

    try {
        const response = await axios.post(`${BASE_URL}/${wabaId}/message_templates`, template, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        console.log('Meta creation response:', response.data);
        return response.data;
    } catch (error: any) {
        console.error('Meta creation error:', JSON.stringify(error.response?.data || error.message, null, 2));
        throw error;
    }
};

// Edit template by ID
export const editTemplateAtMeta = async (id: string, template: GraphTemplate) => {
    const { token } = await getAuth();
    // To edit, we post to the template ID endpoint
    const response = await axios.post(`${BASE_URL}/${id}`, {
        components: template.components
        // Note: Name, Category, Language cannot usually be changed easily without recreating, 
        // but components can be edited for existing templates in some states.
    }, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });
    return response.data;
};

export const deleteTemplateAtMeta = async (name: string) => {
    const { wabaId, token } = await getAuth();
    // Deleting by name is the standard way for WABA templates
    const response = await axios.delete(`${BASE_URL}/${wabaId}/message_templates`, {
        params: {
            name: name
        },
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    return response.data;
};

// Helper to extract variable placeholders from template text
export const extractVariablesFromTemplate = (template: any): { index: number; componentType: string }[] => {
    const variables: { index: number; componentType: string }[] = [];

    const components = typeof template.components === 'string'
        ? JSON.parse(template.components)
        : template.components;

    if (!components || !Array.isArray(components)) return variables;

    for (const component of components) {
        const text = component.text || '';
        const matches = text.matchAll(/\{\{(\d+)\}\}/g);

        for (const match of matches) {
            const index = parseInt(match[1], 10);
            if (!variables.find(v => v.index === index)) {
                variables.push({ index, componentType: component.type });
            }
        }
    }

    return variables.sort((a, b) => a.index - b.index);
};

// Sync templates from Meta to local wa_templates table

export const syncTemplatesToLocal = async (): Promise<{ synced: number; errors: string[] }> => {
    const orgId = await getOrganizationId();
    const errors: string[] = [];
    let synced = 0;

    // Fetch all templates from Meta
    const metaTemplates = await fetchTemplatesFromMeta();

    if (!metaTemplates || metaTemplates.length === 0) {
        return { synced: 0, errors: ['No templates found in Meta'] };
    }

    for (const template of metaTemplates) {
        try {
            // Extract variable info (kept for future use if needed, but not used in upsert now)
            // const variables = extractVariablesFromTemplate(template);

            // Upsert to wa_templates
            const { error } = await supabase
                .schema('wa')
                .from('wa_templates')
                .upsert({
                    organization_id: orgId,
                    meta_template_id: template.id,
                    name: template.name,
                    language: template.language,
                    category: template.category,
                    status: template.status,
                    components: template.components,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'organization_id,name',
                    ignoreDuplicates: false
                });

            if (error) {
                errors.push(`Failed to sync "${template.name}": ${error.message}`);
            } else {
                synced++;
            }
        } catch (err) {
            errors.push(`Error syncing "${template.name}": ${err instanceof Error ? err.message : 'Unknown'}`);
        }
    }

    return { synced, errors };
};

// Fetch local templates from wa_templates
export const fetchLocalTemplates = async () => {
    const orgId = await getOrganizationId();

    const { data, error } = await supabase
        .schema('wa')
        .from('wa_templates')
        .select('*')
        .eq('organization_id', orgId)
        .order('name');

    if (error) throw error;
    return data || [];
};

// Get template with its variable mappings
export const getTemplateWithMappings = async (templateId: string) => {
    const { data: template, error: templateError } = await supabase
        .schema('wa')
        .from('wa_templates')
        .select('*')
        .eq('id', templateId)
        .single();

    if (templateError) throw templateError;

    const { data: mappings, error: mappingsError } = await supabase
        .schema('wa')
        .from('wa_template_variable_mappings')
        .select('*')
        .eq('template_id', templateId)
        .order('variable_index');

    if (mappingsError) throw mappingsError;

    return {
        ...template,
        variable_mappings: mappings || []
    };
};

// Save variable mappings for a template
export const saveVariableMappings = async (
    templateId: string,
    mappings: Array<{
        variable_index: number;
        variable_label?: string;
        data_source: string;
        data_field: string;
        default_value?: string;
    }>
) => {
    // Delete existing mappings
    await supabase
        .schema('wa')
        .from('wa_template_variable_mappings')
        .delete()
        .eq('template_id', templateId);

    if (mappings.length === 0) return [];

    // Insert new mappings
    const { data, error } = await supabase
        .schema('wa')
        .from('wa_template_variable_mappings')
        .insert(mappings.map(m => ({
            template_id: templateId,
            ...m
        })))
        .select();

    if (error) throw error;
    return data;
};

export const fetchCommunityTemplates = async (): Promise<GraphTemplate[]> => {
    const { data, error } = await supabase
        .schema('wa')
        .from('wa_templates')
        .select('*')
        .eq('status', 'APPROVED')
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) throw error;

    return data.map(t => ({
        id: t.id,
        name: t.name,
        category: t.category,
        language: t.language,
        components: typeof t.components === 'string' ? JSON.parse(t.components) : t.components,
        status: t.status
    }));
};

export const sendTemplateMessage = async (
    to: string,
    templateName: string,
    language: string,
    components: any[]
) => {
    const { wabaId, token } = await getAuth();

    // https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages
    const payload = {
        messaging_product: 'whatsapp',
        to: to,
        type: 'template',
        template: {
            name: templateName,
            language: {
                code: language
            },
            components: components
        }
    };

    console.log('Sending template message:', JSON.stringify(payload, null, 2));

    try {
        const response = await axios.post(`${BASE_URL}/${wabaId}/messages`, payload, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data;
    } catch (error: any) {
        console.error('Send message error:', JSON.stringify(error.response?.data || error.message, null, 2));
        throw error;
    }
};

