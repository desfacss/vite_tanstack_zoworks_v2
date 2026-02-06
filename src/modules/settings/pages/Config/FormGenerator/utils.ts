/**
 * FormGenerator Utilities
 * Converts entity metadata to JSON Schema and UI Schema for DynamicForm
 */

import {
  EntityField,
  GeneratedFormSchemas,
  GeneratorOptions,
  DataSchema,
  UISchema,
  PropertySchema,
  UIFieldSchema,
  SYSTEM_FIELDS,
} from './types';

/**
 * Default generator options
 */
const DEFAULT_OPTIONS: GeneratorOptions = {
  includeSystemFields: false,
  includeReadOnlyFields: false,
  expandJsonbFields: true,
  generateRequired: true,
};

/**
 * Main function to generate form schemas from entity metadata
 */
export function generateFormFromMetadata(
  metadata: EntityField[],
  entityName: string,
  options: Partial<GeneratorOptions> = {}
): GeneratedFormSchemas {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  console.log('🔧 generateFormFromMetadata called:', {
    totalMetadataFields: metadata.length,
    entityName,
    options: opts
  });
  
  const dataSchema: DataSchema = {
    type: 'object',
    title: formatEntityTitle(entityName),
    required: [],
    properties: {},
  };
  
  const uiSchema: UISchema = {
    'ui:order': [],
  };
  
  // Filter and process fields
  const processableFields = metadata.filter(field => shouldIncludeField(field, opts));
  
  console.log('📊 Field filtering results:', {
    totalFields: metadata.length,
    processableFields: processableFields.length,
    filteredOutCount: metadata.length - processableFields.length,
    processableFieldKeys: processableFields.map(f => f.key)
  });
  
  for (const field of processableFields) {
    const fieldKey = normalizeFieldKey(field.key);
    
    // Generate property schema
    const propertySchema = mapFieldToPropertySchema(field);
    dataSchema.properties[fieldKey] = propertySchema;
    
    // Generate UI schema
    const uiFieldSchema = mapFieldToUISchema(field);
    if (Object.keys(uiFieldSchema).length > 0) {
      uiSchema[fieldKey] = uiFieldSchema;
    }
    
    // Add to ui:order
    (uiSchema['ui:order'] as string[]).push(fieldKey);
    
    // Add to required if mandatory
    if (opts.generateRequired && field.is_mandatory) {
      dataSchema.required!.push(fieldKey);
    }
  }
  
  return { dataSchema, uiSchema };
}

/**
 * Check if a field should be included in the generated form
 */
function shouldIncludeField(field: EntityField, options: GeneratorOptions): boolean {
  // Skip non-displayable fields
  if (field.is_displayable === false) {
    console.log(`❌ Excluding ${field.key}: is_displayable=false`);
    return false;
  }
  
  // Skip system fields unless explicitly included
  if (!options.includeSystemFields && isSystemField(field.key)) {
    console.log(`❌ Excluding ${field.key}: system field (includeSystemFields=${options.includeSystemFields})`);
    return false;
  }
  
  // Skip read-only fields unless explicitly included
  if (!options.includeReadOnlyFields && field.is_read_only) {
    console.log(`❌ Excluding ${field.key}: read-only (includeReadOnlyFields=${options.includeReadOnlyFields})`);
    return false;
  }
  
  // Skip virtual fields that are truly computed/derived (aggregations, etc.)
  // BUT keep virtual fields from views and JSONB paths
  if (field.is_virtual && !field.jsonb_column) {
    // Check if it's a computed/derived field based on semantic type
    const isComputedField = 
      field.semantic_type?.role === 'measure' || 
      field.semantic_type?.default_aggregation;
    
    // Only exclude if it's actually a computed aggregation
    // Otherwise, it's likely just a view column that should be included
    if (isComputedField) {
      console.log(`❌ Excluding ${field.key}: computed/aggregated field`);
      return false;
    }
    
    // Allow regular virtual fields from views
    console.log(`✅ Including ${field.key}: virtual field from view`);
  }
  
  // Skip raw JSONB columns (we'll include their expanded virtual fields)
  if (field.type === 'jsonb' && !field.is_virtual) {
    console.log(`❌ Excluding ${field.key}: raw JSONB column`);
    return false;
  }
  
  console.log(`✅ Including ${field.key}`);
  return true;
}

/**
 * Check if field is a system field that should be auto-excluded
 */
function isSystemField(fieldKey: string): boolean {
  const baseKey = fieldKey.split('.')[0]; // Handle nested keys like "details.zip"
  return SYSTEM_FIELDS.includes(baseKey);
}

/**
 * Normalize field key for JSON schema (replace dots with underscores for nested keys)
 */
function normalizeFieldKey(key: string): string {
  // Keep as-is for now - DynamicForm should handle nested keys
  return key;
}

/**
 * Format entity name to title case
 */
function formatEntityTitle(entityName: string): string {
  // "external.accounts" -> "Accounts"
  const parts = entityName.split('.');
  const name = parts[parts.length - 1];
  return name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, ' ');
}

/**
 * Map entity field to JSON Schema property
 */
function mapFieldToPropertySchema(field: EntityField): PropertySchema {
  const property: PropertySchema = {
    type: 'string',
    title: field.display_name || formatFieldTitle(field.key),
  };
  
  // Handle foreign key fields -> enum lookup with table, column
  if (field.foreign_key) {
    property.enum = {
      table: field.foreign_key.source_table, // e.g., "external.accounts"
      column: field.foreign_key.display_column || 'name',
    };
    return property;
  }
  
  // Map PostgreSQL type to JSON Schema type
  switch (field.type.toLowerCase()) {
    // String types
    case 'text':
    case 'varchar':
    case 'character varying':
    case 'char':
      property.type = 'string';
      break;
      
    // UUID (without FK)
    case 'uuid':
      property.type = 'string';
      break;
      
    // Boolean
    case 'boolean':
    case 'bool':
      property.type = 'boolean';
      break;
      
    // Integer types
    case 'integer':
    case 'int':
    case 'int4':
    case 'smallint':
    case 'int2':
    case 'bigint':
    case 'int8':
      property.type = 'integer';
      break;
      
    // Numeric types
    case 'numeric':
    case 'decimal':
    case 'real':
    case 'float4':
    case 'double precision':
    case 'float8':
      property.type = 'number';
      break;
      
    // Date types
    case 'date':
      property.type = 'string';
      property.format = 'date';
      break;
      
    // Timestamp types
    case 'timestamp':
    case 'timestamp without time zone':
    case 'timestamptz':
    case 'timestamp with time zone':
      property.type = 'string';
      property.format = 'date-time';
      break;
      
    // Array types
    case 'text[]':
    case 'varchar[]':
    case 'uuid[]':
      property.type = 'array';
      break;
      
    // JSONB (virtual fields are treated as their declared type)
    case 'jsonb':
    case 'json':
      property.type = 'object';
      break;
      
    // User-defined types (enums, etc.)
    case 'user-defined':
      property.type = 'string';
      break;
      
    default:
      property.type = 'string';
  }
  
  // Add read-only if specified
  if (field.is_read_only) {
    property.readOnly = true;
  }
  
  return property;
}

/**
 * Map entity field to UI Schema
 */
function mapFieldToUISchema(field: EntityField): UIFieldSchema {
  const uiField: UIFieldSchema = {};
  
  // Handle foreign key fields
  if (field.foreign_key) {
    uiField['ui:widget'] = 'select';
    uiField['ui:placeholder'] = `Select ${field.display_name}`;
    return uiField;
  }
  
  // Map by type
  switch (field.type.toLowerCase()) {
    case 'text':
    case 'varchar':
      // Check for common patterns
      if (field.key.includes('email')) {
        uiField['ui:placeholder'] = 'email@example.com';
      } else if (field.key.includes('phone') || field.key.includes('mobile')) {
        uiField['ui:options'] = { inputType: 'tel' };
      } else if (field.key.includes('description') || field.key.includes('notes')) {
        uiField['ui:widget'] = 'textarea';
      }
      break;
      
    case 'date':
      uiField['ui:widget'] = 'date';
      break;
      
    case 'timestamp':
    case 'timestamptz':
    case 'timestamp without time zone':
    case 'timestamp with time zone':
      uiField['ui:widget'] = 'date-time';
      break;
      
    case 'text[]':
    case 'varchar[]':
      uiField['ui:widget'] = 'TagsWidget';
      break;
      
    case 'boolean':
    case 'bool':
      // Use default checkbox
      break;
      
    case 'integer':
    case 'bigint':
    case 'numeric':
      uiField['ui:widget'] = 'updown';
      break;
  }
  
  // Handle read-only
  if (field.is_read_only) {
    uiField['ui:readonly'] = true;
  }
  
  return uiField;
}

/**
 * Format field key to title case
 */
function formatFieldTitle(key: string): string {
  // "account_type_id" -> "Account Type Id"
  // "details.zip" -> "Zip"
  const name = key.includes('.') ? key.split('.').pop()! : key;
  return name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Get list of entities from core.entities for dropdown
 */
export function formatEntityOption(entity: { entity_schema: string; entity_type: string }) {
  return {
    value: `${entity.entity_schema}.${entity.entity_type}`,
    label: `${entity.entity_schema}.${entity.entity_type}`,
  };
}
