import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/core/lib/store';
import { getCacheConfig } from '@/core/lib/cacheConfig';

interface Config {
  available_views?: string[] | null;
  default_view?: string | null;
  filters?: any[] | null;
  global_actions?: any[] | null;
  details?: Record<string, any> | null;
}

interface ViewConfig {
  id: string;
  entity_id: string;
  general: Record<string, any>;
  tableview: Record<string, any>;
  gridview: Record<string, any>;
  kanbanview: Record<string, any>;
  details_overview: Record<string, any>;
  calendarview: Record<string, any>;
  ganttview: Record<string, any>;
  mapview: Record<string, any>;
  detailview: Record<string, any>;
  metricsview?: Record<string, any> | null;
  dashboardview?: Record<string, any> | null;
  metadata?: any[] | null;
  v_metadata?: any[] | null;
}

/**
 * Fetches entity and view configuration from the database.
 *
 * This hook queries `core.entities` and `core.view_configs` tables,
 * merges them into a unified structure, and caches the result based
 * on environment settings.
 *
 * @param entityType - The entity type (e.g., 'tickets', 'users')
 * @param entitySchema - The database schema (default: 'public')
 * @returns Combined config and viewConfig objects
 *
 * @example
 * const { data, isLoading } = useViewConfigEnhanced('tickets', 'public');
 * const { config, viewConfig } = data || {};
 */
export const useViewConfigEnhanced = (entityType: string, entitySchema: string) => {
  const { organization } = useAuthStore();
  const cacheConfig = getCacheConfig();

  return useQuery<{ config: Config | null; viewConfig: ViewConfig | null }>({
    queryKey: ['viewConfigEnhanced', entityType, entitySchema, organization?.id],
    queryFn: async () => {
      if (!organization?.id || !entityType || !entitySchema) {
        return { config: null, viewConfig: null };
      }

      // Support dotted entity types (e.g., 'hr.candidates')
      let finalEntityType = entityType;
      let finalEntitySchema = entitySchema;

      if (entityType.includes('.')) {
        const parts = entityType.split('.');
        finalEntitySchema = parts[0];
        finalEntityType = parts[1];
      }

      // Fetch entity data from core.entities
      const { data: entityData, error: entityError } = await supabase
        .schema('core')
        .from('entities')
        .select('*')
        .eq('entity_type', finalEntityType)
        .eq('entity_schema', finalEntitySchema)
        .single();

      if (entityError) {
        console.warn(`[useViewConfigEnhanced] No entity found in core.entities for ${entitySchema}.${entityType}`);
        return { config: null, viewConfig: null };
      }

      // Fetch view config from core.view_configs
      const { data: viewConfigData, error: viewConfigError } = await supabase
        .schema('core')
        .from('view_configs')
        .select('*')
        .eq('entity_id', entityData.id)
        .single();

      if (viewConfigError) {
        console.warn(`[useViewConfigEnhanced] No view config found in core.view_configs for entity_id: ${entityData.id}`);
        return { config: null, viewConfig: null };
      }

      // Merge and format data for DynamicViews consumption
      const mergedConfig: Config = {
        ...viewConfigData.general,
        details: {
          ...(entityData.semantics?.details || {}),
          ...(viewConfigData.details || {}),
        },
      };

      const mergedViewConfig: ViewConfig = {
        ...viewConfigData,
        metadata: entityData?.metadata,
        v_metadata: entityData?.v_metadata,
      };

      return {
        config: mergedConfig,
        viewConfig: mergedViewConfig,
      };
    },
    enabled: !!entityType && !!organization?.id && !!entitySchema,
    staleTime: cacheConfig.staleTime,
    gcTime: cacheConfig.gcTime,
    retry: 2,
  });
};