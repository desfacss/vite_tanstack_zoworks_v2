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
 * Fetches form configuration from the database with priority-based selection.
 *
 * This hook queries the `core.forms` table and caches the result
 * based on environment settings.
 *
 * @param formName - The form name (e.g., 'user_edit_form', 'ticket_create_form')
 * @returns Form configuration object
 *
 * @example
 * const { data: formConfig, isLoading } = useFormConfig('user_edit_form');
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * FORM SELECTION PRIORITY LOGIC (Migration 021)
 * ═══════════════════════════════════════════════════════════════════════════════
 * Forms can exist in 3 states:
 * 1. organization_id = current_org (org-specific customized forms) - HIGHEST PRIORITY
 * 2. organization_id IS NULL (global/default forms) - MEDIUM PRIORITY
 * 3. organization_id = different_org (fallback forms) - LOWEST PRIORITY
 *
 * The client-side sorting ensures the most specific form is always selected:
 * - If an org-specific form exists → use it (priority 1)
 * - If no org-specific form → use global form (priority 2)
 * - If neither exists → use ANY form with that name (priority 3)
 *
 * This allows:
 * ✅ Organizations to customize forms while maintaining global defaults
 * ✅ Graceful fallback in multi-tenant scenarios
 * ✅ Seamless form inheritance and overrides
 *
 * RLS Policy: core.forms has permissive SELECT (USING true) to allow reading
 * all forms, with write operations restricted to tenant isolation.
 * ═══════════════════════════════════════════════════════════════════════════════
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

      // Fetch all forms with the given name (RLS allows reading all)
      const { data, error } = await supabase
        .schema('core')
        .from('forms')
        .select('*')
        .eq('name', formName);

      if (error) {
        throw new Error(`[useFormConfig] Failed to fetch form config: ${error.message}`);
      }

      if (!data || data.length === 0) {
        console.warn(`[useFormConfig] No form config found for: ${formName}`);
        return null;
      }

      // Priority-based selection (Migration 021)
      // Sort forms by priority: org-specific → global → fallback
      const sortedForms = data.sort((a, b) => {
        const getPriority = (form: any) => {
          if (form.organization_id === organization.id) return 1; // Org-specific (highest)
          if (form.organization_id === null) return 2;            // Global (medium)
          return 3;                                                // Fallback (lowest)
        };
        return getPriority(a) - getPriority(b);
      });

      const selectedForm = sortedForms[0];

      // Log which priority level was selected (dev mode only)
      if (import.meta.env.DEV) {
        const priority =
          selectedForm.organization_id === organization.id ? 'ORG-SPECIFIC' :
            selectedForm.organization_id === null ? 'GLOBAL' :
              'FALLBACK';
        console.log(`[useFormConfig] Selected ${priority} form: ${formName}`, {
          form_org_id: selectedForm.organization_id,
          current_org_id: organization.id,
          total_forms_found: data.length
        });
      }

      return selectedForm;
    },
    enabled: !!formName && !!organization?.id,
    staleTime: cacheConfig.staleTime,
    gcTime: cacheConfig.gcTime,
    retry: 2,
  });
};