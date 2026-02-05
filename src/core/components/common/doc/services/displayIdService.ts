import { DisplayIdConfig, DisplayIdPreview, DisplayIdValidationResult } from '../types/displayId';
import { supabase } from '@/lib/supabase';

/**
 * Service for managing display ID configuration and generation
 */
export class DisplayIdService {
  /**
   * Get display ID configuration for an entity type
   */
  static async getConfig(entityType: string, organizationId: string, entitySchema: string = 'public'): Promise<DisplayIdConfig | null> {
    try {
      let query = supabase
        .schema('core')
        .from('display_id_states')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_schema', entitySchema);

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      } else {
        query = query.is('organization_id', null);
      }

      const { data, error } = await query.maybeSingle();

      if (error || !data) {
        console.warn(`No display ID config found for entity type: ${entityType}`);
        return null;
      }

      return data as unknown as DisplayIdConfig || null;
    } catch (error) {
      console.error('Error fetching display ID config:', error);
      return null;
    }
  }

  /**
   * Generate display ID using the backend function
   */
  static async generateDisplayId(
    entityType: string, 
    entitySchema: string, 
    entityData: Record<string, any>
  ): Promise<string | null> {
    try {
      const { data, error } = await supabase.rpc('core_suggested_get_display_id_v2', {
        p_entity_type: entityType,
        p_document_data: entityData,
        p_entity_schema: entitySchema || 'public'
      });

      if (error) {
        console.error('Error generating display ID:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in generateDisplayId:', error);
      return null;
    }
  }

  /**
   * Generate display ID for new record (helper method)
   */
  static async generateDisplayIdForNewRecord(
    entityType: string, 
    entitySchema: string, 
    formData: Record<string, any>,
    organizationId: string,
    locationId: string,
    clientId: string
  ): Promise<string | null> {
    try {
      if (!formData.organization_id) {
        formData.organization_id = organizationId;
      }

      if (!formData?.location_id) {
        formData.location_id = locationId;
      }

      if (!formData?.created_at) {
        formData.created_at = new Date().toISOString();
      }

      if (!formData?.account_id) {
        formData.account_id = clientId;
      }

      return await this.generateDisplayId(entityType, entitySchema, formData);
    } catch (error) {
      console.error('Error in generateDisplayIdForNewRecord:', error);
      return null;
    }
  }

  /**
   * Update display ID configuration
   */
  static async updateConfig(
    entityType: string, 
    config: DisplayIdConfig, 
    organizationId: string,
    entitySchema: string = 'public'
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .schema('core')
        .from('display_id_states')
        .upsert({
          entity_type: entityType,
          entity_schema: entitySchema,
          organization_id: organizationId || null,
          format_template: config.format_template,
          padding: config.padding,
          reset_period: config.reset_period,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'entity_schema,entity_type,organization_id'
        });

      return !error;
    } catch (error) {
      console.error('Error updating display ID config:', error);
      return false;
    }
  }

  /**
   * Validate display ID format and check for duplicates
   */
  static async validate(
    entityType: string,
    displayId: string,
    entitySchema: string = 'public',
    entityId?: string
  ): Promise<DisplayIdValidationResult> {
    try {
      if (!displayId || displayId.trim() === '') {
        return { isValid: false, message: 'Display ID cannot be empty' };
      }

      const { data, error } = await supabase
        .schema(entitySchema)
        .from(entityType)
        .select('id')
        .eq('display_id', displayId)
        .maybeSingle();

      if (error) {
        console.error('Error validating display ID:', error);
        return { isValid: false, message: 'Validation failed' };
      }

      if (data && (!entityId || data.id !== entityId)) {
        return { isValid: false, message: 'This display ID already exists' };
      }

      return { isValid: true };
    } catch (error) {
      console.error('Error in validate:', error);
      return { isValid: false, message: 'Validation failed' };
    }
  }

  /**
   * Preview display ID format with current form data
   */
  static async previewDisplayId(
    entityType: string,
    formData: Record<string, any>
  ): Promise<DisplayIdPreview | null> {
    try {
      const { data, error } = await supabase.rpc('preview_display_id', {
        p_entity_type: entityType,
        p_entity_data: formData
      });

      if (error) {
        console.error('Error previewing display ID:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in previewDisplayId:', error);
      return null;
    }
  }

  /**
   * Get required fields for display ID generation based on config
   */
  static getRequiredFields(config: DisplayIdConfig | null): string[] {
    if (!config || !config.format_template) return [];
    
    const requiredFields: string[] = [];
    const template = config.format_template;
    
    // Simple heuristic: check for common tokens that map to fields
    if (template.includes('{LOCATION_CODE}')) requiredFields.push('location_id');
    if (template.includes('{CLIENT_CODE}')) requiredFields.push('client_id');
    if (template.includes('{ACCOUNT_CODE}')) requiredFields.push('account_id');
    if (template.includes('{CATEGORY_CODE}')) requiredFields.push('category_id');
    if (template.includes('{PROJECT_CODE}')) requiredFields.push('project_id');

    return [...new Set(requiredFields)];
  }

  /**
   * Check if all required fields are available for generation
   */
  static canGenerate(config: DisplayIdConfig | null, formData: Record<string, any>): boolean {
    if (!config) return false;
    
    const requiredFields = this.getRequiredFields(config);
    return requiredFields.every(field => {
      const value = formData[field];
      // Basic check: location_id, created_at, account_id are often system-provided or mandatory
      return (field === 'location_id' || field === "created_at" || field === "account_id") || (value != null && value !== '' && value !== undefined);
    });
  }
}
