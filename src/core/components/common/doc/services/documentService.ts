import { DocumentForm, DocumentTemplate, DocumentRecord } from '../types/document';
import { DisplayIdService } from './displayIdService';
import { supabase } from '@/lib/supabase';

export class DocumentService {
  // Document Forms (Schema Management)
  static async getDocumentForms(): Promise<DocumentForm[]> {
    const { data, error } = await supabase
      .from('doc_forms')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data || [];
  }

  static async getDocumentForm(typeId: string): Promise<DocumentForm | null> {
    const { data, error } = await supabase
      .from('doc_forms')
      .select('*')
      .eq('type_id', typeId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  // Document Templates
  static async getDocumentTemplates(documentTypeId: string, organizationId: string): Promise<DocumentTemplate[]> {
    const { data, error } = await supabase
      .from('doc_templates')
      .select('*')
      .eq('document_type_id', documentTypeId)
      .eq('organization_id', organizationId)
      .order('is_default', { ascending: false })
      .order('name');
    
    if (error) throw error;
    return data || [];
  }

  static async getDefaultTemplate(documentTypeId: string, organizationId: string): Promise<DocumentTemplate | null> {
    const { data, error } = await supabase
      .from('doc_templates')
      .select('*')
      .eq('document_type_id', documentTypeId)
      .eq('organization_id', organizationId)
      .eq('is_default', true)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  static async saveTemplate(template: Partial<DocumentTemplate>, organizationId: string): Promise<DocumentTemplate> {
    // ... (rest of saveTemplate logic is existing)
    if (template.is_default === true && template.document_type_id) {
      try {
        const { data: existingDefault, error: findError } = await supabase
          .from('doc_templates')
          .select('id')
          .eq('document_type_id', template.document_type_id)
          .eq('organization_id', organizationId)
          .eq('is_default', true)
          .neq('id', template.id || '')
          .single();

        if (existingDefault && !findError) {
          await supabase
            .from('doc_templates')
            .update({ is_default: false, updated_at: new Date().toISOString() })
            .eq('id', existingDefault.id);
        }
      } catch (error) {
        if (error && (error as any).code !== 'PGRST116') throw error;
      }
    }

    const templateData = {
      ...template,
      organization_id: organizationId,
      updated_at: new Date().toISOString()
    };

    if (template.id) {
      const { data, error } = await supabase
        .from('doc_templates')
        .update(templateData)
        .eq('id', template.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase
        .from('doc_templates')
        .insert(templateData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    }
  }

  // Document CRUD Operations
  static async getDocuments(tableNameWithSchema: string, organizationId: string, page = 1, limit = 10): Promise<{
    data: DocumentRecord[];
    count: number;
  }> {
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    const [schema, tableName] = tableNameWithSchema.includes('.') 
      ? tableNameWithSchema.split('.') 
      : ['public', tableNameWithSchema];

    const { data, error, count } = await supabase
      .schema(schema)
      .from(tableName)
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .range(from, to);
    
    if (error) throw error;
    return { data: data || [], count: count || 0 };
  }

  static async getDocument(tableNameWithSchema: string, id: string): Promise<DocumentRecord | null> {
    const [schema, tableName] = tableNameWithSchema.includes('.') 
      ? tableNameWithSchema.split('.') 
      : ['public', tableNameWithSchema];

    const { data, error } = await supabase
      .schema(schema)
      .from(tableName)
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  static async saveDocument(
    tableNameWithSchema: string, 
    document: Partial<DocumentRecord>, 
    organizationId: string,
    locationId?: string,
    clientId?: string
  ): Promise<DocumentRecord> {
    const [schema, tableName] = tableNameWithSchema.includes('.') 
      ? tableNameWithSchema.split('.') 
      : ['public', tableNameWithSchema];

    // Generate display_id if not provided and this is a new document
    if (!document.id && !document.display_id && document.content) {
      try {
        const entityTypeMap: Record<string, string> = {
          'doc_invoices': 'doc_invoices',
          'blueprint.service_reports': 'doc_service_reports',
          'doc_purchase_orders': 'purchase-order',
          'doc_credit_notes': 'credit-note'
        };
        
        const entityType = entityTypeMap[tableNameWithSchema];
        if (entityType) {
          const formData = {
            ...document.content,
            organization_id: organizationId,
            created_at: new Date().toISOString()
          };
          
          const generatedDisplayId = await DisplayIdService.generateDisplayIdForNewRecord(
            entityType,
            schema,
            formData,
            organizationId,
            locationId || '',
            clientId || ''
          );
          
          if (generatedDisplayId) {
            document.display_id = generatedDisplayId;
          }
        }
      } catch (error) {
        console.warn('Failed to generate display_id:', error);
      }
    }
    
    const documentData = {
      ...document,
      organization_id: organizationId,
      updated_at: new Date().toISOString()
    };

    if (document.id) {
      const { data, error } = await supabase
        .schema(schema)
        .from(tableName)
        .update(documentData)
        .eq('id', document.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase
        .schema(schema)
        .from(tableName)
        .insert(documentData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    }
  }

  static async deleteDocument(tableNameWithSchema: string, id: string): Promise<void> {
    const [schema, tableName] = tableNameWithSchema.includes('.') 
      ? tableNameWithSchema.split('.') 
      : ['public', tableNameWithSchema];

    const { error } = await supabase
      .schema(schema)
      .from(tableName)
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  // Search and Filter
  static async searchDocuments(
    tableNameWithSchema: string, 
    searchTerm: string, 
    organizationId: string,
    page = 1,
    limit = 10
  ): Promise<{
    data: DocumentRecord[];
    count: number;
  }> {
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    const [schema, tableName] = tableNameWithSchema.includes('.') 
      ? tableNameWithSchema.split('.') 
      : ['public', tableNameWithSchema];

    const { data, error, count } = await supabase
      .schema(schema)
      .from(tableName)
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId)
      .or(`name.ilike.%${searchTerm}%,display_id.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false })
      .range(from, to);
    
    if (error) throw error;
    return { data: data || [], count: count || 0 };
  }
}
