import { DisplayIdConfig, DisplayIdPreview, DisplayIdValidationResult } from '../types/displayId';
import { supabase } from '@/lib/supabase';

/**
 * Service for managing display ID configuration and generation
 */
export class DisplayIdService {
  /**
   * Get display ID configuration for an entity type
   */
  static async getConfig(entityType: string, organizationId: string): Promise<DisplayIdConfig | null> {
    try {
      const { data, error } = await supabase
        .from('z_view_config')
        .select('display_format')
        .eq('entity_type', entityType)
        .single();

      if (error || !data) {
        console.warn(`No display ID config found for entity type: ${entityType}`);
        return null;
      }

      return data?.display_format as DisplayIdConfig || null;
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
  static async updateConfig(entityType: string, config: DisplayIdConfig, organizationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('z_view_config')
        .upsert({
          entity_type: entityType,
          display_format: config,
          updated_at: new Date().toISOString()
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
    entityId?: string
  ): Promise<DisplayIdValidationResult> {
    try {
      if (!displayId || displayId.trim() === '') {
        return { isValid: false, message: 'Display ID cannot be empty' };
      }

      const config = await this.getConfig(entityType, ''); // orgId not strictly needed for fetch by entity_type if global
      if (!config) {
        return { isValid: false, message: 'Configuration not found for entity type' };
      }

      const { table, schema } = config.table_name;
      let query = supabase
        .schema(schema)
        .from(table)
        .select('id')
        .eq('display_id', displayId);

      if (entityId) {
        query = query.neq('id', entityId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error validating display ID:', error);
        return { isValid: false, message: 'Validation failed' };
      }

      if (data && data.length > 0) {
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
    if (!config) return [];
    
    const requiredFields: string[] = [];
    
    config.token_config.forEach(token => {
      if (token.type === 'lookup' && token.entity_field) {
        requiredFields.push(token.entity_field);
      }
    });

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
      return (field === 'location_id' || field === "created_at" || field === "account_id") || (value != null && value !== '' && value !== undefined);
    });
  }
}
