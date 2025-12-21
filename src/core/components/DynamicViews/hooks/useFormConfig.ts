import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '../@/core/lib/store';

interface FormConfig {
  form_name: string;
  organization_id: string;
  schema?: Record<string, any> | null; // JSONB
  version?: number | null;
}

export const useFormConfig = (formName: string) => {
  const { organization } = useAuthStore();

  return useQuery<FormConfig | null>({
    queryKey: ['FormConfig', formName, organization?.id],
    queryFn: async () => {
      // Step 1: Try loading from local file
      try {
        const localConfig = await import(`../../../schemas/forms/${formName}.json`);
        if (localConfig) {
          return localConfig.default || localConfig; // Handle ES module default export
        }
      } catch (error) {
        console.warn(`Local form config file for ${formName} not found, falling back to database.`, error);
      }

      // Step 2: Fall back to database
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .eq('name', formName)
        // .eq('organization_id', organization?.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.warn(`No form config found in forms table for form_name: ${formName}`);
          return null; // No config exists in DB
        }
        throw new Error(`Failed to fetch form config from forms table: ${error.message}`);
      }

      return data;
    },
    enabled: !!formName && !!organization?.id, // Only run if formName and organization are available
    staleTime: 7 * 24,// * 60 * 60 * 1000, // Cache for 7 days
    cacheTime: 30 * 24,// * 60 * 60 * 1000, // Keep in cache for 30 days
    retry: 2, // Retry twice on failure
  });
};