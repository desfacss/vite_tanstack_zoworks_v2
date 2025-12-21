import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/core/lib/store';
import viewConfigs from '@/schemas/viewConfig';
import entityConfigs from '@/schemas/config';

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
  detailview: Record<string, any>;
  calendarview: Record<string, any>;
  ganttview: Record<string, any>;
  mapview: Record<string, any>;
  details_overview: Record<string, any>;
  metricsview?: Record<string, any> | null;
  dashboardview?: Record<string, any> | null;
  metadata?: any[] | null;
}

export const useViewConfigEnhanced = (entityType: string, entitySchema: string, testing: boolean) => {
  const { organization } = useAuthStore();

  return useQuery<{ config: Config | null; viewConfig: ViewConfig | null }>({
    queryKey: ['viewConfigEnhanced', entityType, entitySchema, organization?.id],
    queryFn: async () => {
      if (!organization?.id || !entityType || !entitySchema) return { config: null, viewConfig: null };

      // Step 1: Try loading from local file
      try {
        const localConfig = (entityConfigs as any)[entityType];
        const localViewConfig = (viewConfigs as any)[entityType];
        
        if (localConfig && localViewConfig) {
          return { config: localConfig, viewConfig: localViewConfig };
        }
        
        console.warn(`Local config file for ${entityType} not found, falling back to database.`);
      } catch (error) {
        console.warn(`Error loading local config for ${entityType}, falling back to database.`, error);
      }

      // Step 2: Fall back to database
      const { data: entityData, error: entityError } = await supabase
        .schema('core')
        .from('entities')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_schema', entitySchema)
        .single();

      if (entityError) {
        console.warn(`No entity found in core.entities for ${entitySchema}.${entityType}.`);
        return { config: null, viewConfig: null };
      }

      const { data: viewConfigData, error: viewConfigError } = await supabase
        .schema('core')
        .from('view_configs')
        .select('*')
        .eq('entity_id', entityData.id)
        .single();

      if (viewConfigError) {
        console.warn(`No view config found in core.view_configs for entity_id: ${entityData.id}`);
        return { config: null, viewConfig: null };
      }
      
      const mergedConfig = {
        ...viewConfigData.general,
        details: {
          ...(entityData.semantics?.details || {}),
          ...(viewConfigData.details || {}),
        },
      };
      
      return { config: mergedConfig, viewConfig: {...viewConfigData,metadata:entityData?.metadata,v_metadata:entityData?.v_metadata} };
    },
    enabled: !!entityType && !!organization?.id && !!entitySchema,
    staleTime: 24 * (testing ? 1 : (60 * 60 * 1000)),
    cacheTime: 30 * 24 * (testing ? 1 : (60 * 60 * 1000)),
    retry: 2,
  });
};