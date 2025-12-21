// import { useQuery } from '@tanstack/react-query';
// import { supabase } from '@/lib/supabase';
// import { useAuthStore } from '@/core/lib/store';

// interface ViewConfig {
//   entity_type: string;
//   available_views?: string[] | null;
//   default_view?: string | null;
//   form_name?: string[] | null;
//   filters?: Array<{
//     name: string;
//     type: string;
//     label: string;
//     placeholder?: string;
//     defaultValue?: any;
//     isServerSide?: boolean;
//     options?: Array<{ value: any; label: string }>;
//   }>;
//   features?: {
//     export?: boolean;
//     import?: boolean;
//     sorting?: boolean;
//     filtering?: boolean;
//     pagination?: boolean;
//     bulkActions?: boolean;
//     kanban?: boolean;
//     calendar?: boolean;
//   };
//   cache_ttl?: string;
//   version?: number;
// }

// export const useConfigEnhanced = (entityType: string) => {
//   const { organization } = useAuthStore();

//   return useQuery<ViewConfig | null>({
//     queryKey: ['configEnhanced', entityType, organization?.id],
//     queryFn: async () => {
//       try {
//         // Try loading from local file first
//         const localConfig = await import('../../../schemas/config/' + entityType + '.json');
//         if (localConfig) {
//           return localConfig;
//         }
//       } catch (error) {
//         console.warn(`Local config not found for ${entityType}, falling back to database`);
//       }

//       // Fall back to database if local file doesn't exist
//       const [entityConfig, viewConfig] = await Promise.all([
//         supabase
//           .from('z_view_config')
//           .select('*')
//           .eq('entity_type', entityType)
//           .single(),
//         supabase
//           .from('y_view_config')
//           .select('*')
//           .eq('entity_type', entityType)
//           .single()
//       ]);

//       if (entityConfig.error && viewConfig.error) {
//         console.warn(`No config found for ${entityType}`);
//         return null;
//       }

//       // Merge configurations
//       return {
//         entity_type: entityType,
//         available_views: entityConfig.data?.available_views || ['tableview'],
//         default_view: entityConfig.data?.default_view || 'tableview',
//         form_name: entityConfig.data?.form_name,
//         filters: entityConfig.data?.filters || [],
//         features: entityConfig.data?.features || {},
//         cache_ttl: entityConfig.data?.cache_ttl,
//         version: entityConfig.data?.version || 1,
//         views: viewConfig.data || {}
//       };
//     },
//     // Tanstack Config - KEEP THE COMMENTED _TO BE ENABLED FOR PRODUCTION SETTINGS 
//     // staleTime: 24 * 60 * 60 * 1000, // Cache for 24 hours
//     // cacheTime: 30 * 24 * 60 * 60 * 1000, // Keep in cache for 30 days

//     // FOR DEVELOPMENT SETTINGS
//     staleTime: 1000, // Cache for 24 hours
//     cacheTime: 1000, // Keep in cache for 30 days
//   });
// };


import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/core/lib/store';

// Use import.meta.glob to import all JSON files in the specified directory
const configFiles = import.meta.glob('../../../schemas/config/*.json');

interface ViewConfig {
  entity_type: string;
  available_views?: string[] | null;
  default_view?: string | null;
  form_name?: string[] | null;
  filters?: Array<{
    name: string;
    type: string;
    label: string;
    placeholder?: string;
    defaultValue?: any;
    isServerSide?: boolean;
    options?: Array<{ value: any; label: string }>;
  }>;
  features?: {
    export?: boolean;
    import?: boolean;
    sorting?: boolean;
    filtering?: boolean;
    pagination?: boolean;
    bulkActions?: boolean;
    kanban?: boolean;
    calendar?: boolean;
  };
  cache_ttl?: string;
  version?: number;
  views?: Record<string, any>; // Assuming 'views' can hold arbitrary data
}

export const useConfigEnhanced = (entityType: string) => {
  const { organization } = useAuthStore();

  return useQuery<ViewConfig | null>({
    queryKey: ['configEnhanced', entityType, organization?.id],
    queryFn: async () => {
      let localConfig: any = null;
      const importPath = `../../../schemas/config/${entityType}.json`;

      try {
        if (configFiles[importPath]) {
          const localConfigModule = await configFiles[importPath]();
          localConfig = localConfigModule.default || localConfigModule; // Handle both default and named exports
          if (localConfig) {
            return localConfig as ViewConfig;
          }
        } else {
          console.warn(`Local config not found for ${entityType}`);
        }
      } catch (error) {
        console.warn(`Error loading local config for ${entityType}`, error);
      }

      // Fall back to database if local file doesn't exist or loading fails
      const [entityConfig, viewConfig] = await Promise.all([
        supabase
          .from('z_view_config')
          .select('*')
          .eq('entity_type', entityType)
          .single(),
        supabase
          .from('y_view_config')
          .select('*')
          .eq('entity_type', entityType)
          .single()
      ]);

      if (entityConfig.error && viewConfig.error) {
        console.warn(`No config found for ${entityType}`);
        return null;
      }

      // Merge configurations
      return {
        entity_type: entityType,
        available_views: entityConfig.data?.available_views || ['tableview'],
        default_view: entityConfig.data?.default_view || 'tableview',
        form_name: entityConfig.data?.form_name,
        filters: entityConfig.data?.filters || [],
        features: entityConfig.data?.features || {},
        cache_ttl: entityConfig.data?.cache_ttl,
        version: entityConfig.data?.version || 1,
        views: viewConfig.data || {}
      };
    },
    // Tanstack Config - KEEP THE COMMENTED _TO BE ENABLED FOR PRODUCTION SETTINGS
    // staleTime: 24 * 60 * 60 * 1000, // Cache for 24 hours
    // cacheTime: 30 * 24 * 60 * 60 * 1000, // Keep in cache for 30 days

    // FOR DEVELOPMENT SETTINGS
    staleTime: 1000, // Cache for 1 second
    cacheTime: 1000, // Keep in cache for 1 second
  });
};