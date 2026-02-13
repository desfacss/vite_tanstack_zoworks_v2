import { useAuthStore } from '@/core/lib/store';
import { supabase } from '@/core/lib/supabase';
export * from '@/core/lib/supabase';

/**
 * Returns the current organization ID from the auth store.
 * This helper is provided for backward compatibility with the WA module.
 */
export const getOrganizationId = async () => {
    return useAuthStore.getState().organization?.id;
};

/**
 * Fetches WhatsApp configuration for an organization.
 */
export const getWhatsAppConfig = async (organizationId: string) => {
    const { data, error } = await supabase
        .schema('identity')
        .from('organizations')
        .select('app_settings')
        .eq('id', organizationId)
        .single();

    if (error) throw error;
    const config = data?.app_settings?.channels?.whatsapp || {};
    return {
        wabaId: config.waba_id || config.wabaId,
        accessToken: config.access_token || config.accessToken,
        phoneId: config.phone_number_id || config.phoneId,
        commerce: config.commerce || {}
    };
};

/**
 * Fetches commerce settings for an organization.
 */
export const getCommerceSettings = async (organizationId: string) => {
    const { data, error } = await supabase
        .schema('identity')
        .from('organizations')
        .select('app_settings')
        .eq('id', organizationId)
        .single();

    if (error) throw error;
    return data?.app_settings?.channels?.whatsapp?.commerce || { sync_enabled: false };
};
