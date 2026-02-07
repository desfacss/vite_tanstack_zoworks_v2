/**
 * FormGenerator Types
 * Type definitions for entity metadata and generated form schemas
 */

// Entity metadata field structure from core.entities.metadata
export interface EntityField {
  key: string;              // Field name e.g., "name", "details.zip"
  type: string;             // PostgreSQL type: text, uuid, boolean, date, timestamptz, etc.
  display_name: string;     // Human-readable label
  is_mandatory?: boolean;   // Required field
  is_virtual?: boolean;     // Computed/JSONB path field
  is_displayable?: boolean; // Show in UI
  is_searchable?: boolean;  // Enable search
  is_read_only?: boolean;   // Read-only field
  is_template?: boolean;    // Template field
  jsonb_column?: string;    // Parent JSONB column if virtual
  foreign_key?: ForeignKeyDefinition | null;
  semantic_type?: SemanticType;
}

export interface ForeignKeyDefinition {
  source_table: string;     // e.g., "identity.organizations"
  source_column: string;    // e.g., "id"
  display_column: string;   // e.g., "name"
  reason?: string;
  confidence?: string;
}

export interface SemanticType {
  role?: string;            // "dimension" | "measure"
  sub_type?: string;        // "temporal" | "boolean" | "discrete" | "nominal"
  order?: string[];
  keyword?: boolean;
  default_aggregation?: string;
}

// Entity record from core.entities table
export interface Entity {
  id: string;
  entity_type: string;      // e.g., "accounts"
  entity_schema: string;    // e.g., "external"
  description?: string;
  metadata: EntityField[];  // JSON array of fields
  v_metadata?: EntityField[];
  is_active: boolean;
  semantics?: object;
  rules?: object;
  capabilities?: object;
}

// Generated form schemas
export interface GeneratedFormSchemas {
  dataSchema: DataSchema;
  uiSchema: UISchema;
  dbSchema?: DBSchema;
}

export interface DataSchema {
  type: 'object';
  title?: string;
  required?: string[];
  properties: Record<string, PropertySchema>;
  definitions?: Record<string, object>;
}

export interface PropertySchema {
  type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object' | 'null';
  title?: string;
  description?: string;
  format?: string;          // "date", "date-time", "email", "uri"
  enum?: string[] | EnumLookup;
  enumNames?: string[];
  default?: unknown;
  readOnly?: boolean;
}

export interface EnumLookup {
  schema?: string;
  table: string;
  column: string;
  no_id?: boolean;
  filters?: EnumFilter[];
  dependsOn?: string;
  dependsOnColumn?: string;
  dependsOnField?: string;
}

export interface EnumFilter {
  column: string;
  operator: string;
  value: string;
}

export interface UISchema {
  'ui:order'?: string[];
  [key: string]: UIFieldSchema | string[] | undefined;
}

export interface UIFieldSchema {
  'ui:widget'?: string;
  'ui:placeholder'?: string;
  'ui:readonly'?: boolean;
  'ui:disabled'?: boolean;
  'ui:options'?: Record<string, unknown>;
}

export interface DBSchema {
  table: string;
  column?: string;
  multiple_rows?: boolean;
}

// Generator options
export interface GeneratorOptions {
  mode?: 'minimal' | 'recommended' | 'all' | 'llm';  // Generation mode
  includeForeignKeyFields?: boolean;   // Include/exclude fields ending with _id
  includeSystemFields?: boolean;       // Include id, created_at, etc.
  includeReadOnlyFields?: boolean;     // Include is_read_only fields
  expandJsonbFields?: boolean;         // Include JSONB virtual fields
  generateRequired?: boolean;          // Mark is_mandatory as required
  groupByStructure?: boolean;          // Auto-group nested fields (details.*, raci.*)
  llmQuery?: string;                   // User query for LLM mode
}

// System fields to auto-exclude
export const SYSTEM_FIELDS = [
  'id',
  'created_at',
  'updated_at',
  'created_by',
  'updated_by',
  'organization_id',
  'location_id',
];
