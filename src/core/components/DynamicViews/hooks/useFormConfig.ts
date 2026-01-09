import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/core/lib/store';
import { getCacheConfig } from '@/core/lib/cacheConfig';

interface FormConfig {
  form_name: string;
  organization_id: string;
  data_schema?: any;
  ui_schema?: any;
  db_schema?: any;
  version?: number | null;
}

/**
 * Fetches form configuration from the database.
 *
 * This hook queries the `public.forms` table and caches the result
 * based on environment settings.
 *
 * @param formName - The form name (e.g., 'user_edit_form', 'ticket_create_form')
 * @returns Form configuration object
 *
 * @example
 * const { data: formConfig, isLoading } = useFormConfig('user_edit_form');
 */
export const useFormConfig = (formName: string) => {
  const { organization } = useAuthStore();
  const cacheConfig = getCacheConfig();

  return useQuery<FormConfig | null>({
    queryKey: ['FormConfig', formName, organization?.id],
    queryFn: async () => {
      if (!formName || !organization?.id) {
        return null;
      }

      const { data, error } = await supabase
        .schema('core').from('forms')
        .select('*')
        .eq('name', formName)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.warn(`[useFormConfig] No form config found for: ${formName}`);
          return null;
        }
        throw new Error(`[useFormConfig] Failed to fetch form config: ${error.message}`);
      }

      return data;
    },
    enabled: !!formName && !!organization?.id,
    staleTime: cacheConfig.staleTime,
    gcTime: cacheConfig.gcTime,
    retry: 2,
  });
};