import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/core/lib/store';

interface FormConfig {
  form_name: string;
  organization_id: string;
  data_schema?: any;
  ui_schema?: any;
  db_schema?: any; // Add db_schema to definition
  version?: number | null;
}

export const useFormConfig = (formName: string) => {
  const { organization } = useAuthStore();

  return useQuery<FormConfig | null>({
    queryKey: ['FormConfig', formName, organization?.id],
    queryFn: async () => {
      // Step 1: Try loading from local file
      try {
        // Use Vite's glob import to find the file
        const forms = import.meta.glob('../../../schemas/forms/*.json');
        const path = `../../../schemas/forms/${formName}.json`;

        if (forms[path]) {
          const module = await forms[path]() as any;
          return module.default || module;
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
    gcTime: 30 * 24,// * 60 * 60 * 1000, // Keep in cache for 30 days
    retry: 2, // Retry twice on failure
  });
};