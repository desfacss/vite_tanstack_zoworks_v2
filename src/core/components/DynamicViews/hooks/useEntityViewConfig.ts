import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/core/lib/store';

interface ViewConfig {
  entity_type: string;
  available_views?: string[] | null;
  default_view?: string | null;
  view_settings?: Record<string, any> | null; // JSONB
  version?: number | null;
}

export const useEntityViewConfig = (entityType: string) => {
  const { organization } = useAuthStore();

  return useQuery<ViewConfig | null>({
    queryKey: ['EntityViewConfig', entityType, organization?.id],
    queryFn: async () => {
      // Step 1: Try loading from local file
      try {
        const localConfig = await import(`../../../schemas/viewConfig/${entityType}.json`);
        if (localConfig) {
          return localConfig.default || localConfig; // Handle ES module default export
        }
      } catch (error) {
        console.warn(`Local view config file for ${entityType} not found, falling back to database.`, error);
      }

      // Step 2: Fall back to database
      const { data, error } = await supabase
        .from('y_view_config')
        .select('*')
        .eq('entity_type', entityType)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.warn(`No view config found in y_view_config for entity_type: ${entityType}`);
          return null; // No config exists in DB
        }
        throw new Error(`Failed to fetch view config from y_view_config: ${error.message}`);
      }

      return data;
    },
    enabled: !!entityType && !!organization?.id, // Only run if entityType and organization are available
    staleTime: 24 * 60 * 60 * 1000, // Cache for 24 hours
    gcTime: 30 * 24 * 60 * 60 * 1000, // Keep in cache for 30 days
    retry: 2, // Retry twice on failure
  });
};