/**
 * Entity Types for Config Module
 * 
 * These types support the Logical-First entity management approach,
 * allowing entities to be either:
 * 1. Simple Mode: Physical table = Logical entity (entity_type = table_name)
 * 2. Variant Mode: Custom logical entity derived from a base table
 */

// ============================================================================
// Partition Filter Types
// ============================================================================

/** Supported operators for partition filters */
export type FilterOperator = 
  | '=' 
  | '!=' 
  | 'IN' 
  | 'NOT IN' 
  | 'LIKE' 
  | 'IS NULL' 
  | 'IS NOT NULL'
  | '>'
  | '<'
  | '>='
  | '<=';

/** A single partition filter rule */
export interface PartitionFilter {
  id?: string;           // Unique ID for UI management
  column: string;        // Column name to filter on
  operator: FilterOperator;
  value: string | string[];  // Single value or array for IN/NOT IN
}

/** Rules structure containing partition logic */
export interface EntityRules {
  logic?: {
    partition_filter: string;      // SQL WHERE clause fragment (e.g., "lifecycle_stage = 'lead'")
    filters?: PartitionFilter[];   // Parsed filter objects for UI convenience
  };
}

// ============================================================================
// Entity Configuration Types
// ============================================================================

/** Foreign key definition for a metadata field */
export interface ForeignKeyConfig {
  source_table?: string;
  source_column?: string;
  display_column?: string;
  reason?: string;
  confidence?: string;
}

/** Semantic type information for a metadata field */
export interface SemanticTypeConfig {
  role: 'dimension' | 'measure';
  sub_type: 'quantitative' | 'temporal' | 'nominal' | 'ordinal' | 'geojson' | 'discrete';
  default_aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'count_distinct';
  order?: string[];
  keyword?: boolean;
}

/** A single metadata field definition */
export interface MetadataField {
  key: string;
  type: string;
  display_name: string;
  foreign_key?: ForeignKeyConfig | null;
  potential_fk?: ForeignKeyConfig;
  semantic_type: SemanticTypeConfig;
  is_searchable: boolean;
  is_displayable: boolean;
  is_mandatory: boolean;
  is_template: boolean;
  is_virtual: boolean;
  is_visible?: boolean;  // NEW: For variants to hide columns from base table
  format?: 'array';
  polymorphic?: {
    targets: MetadataField[];
    id_column: string;
    type_column: string;
  };
}

/** 
 * Extended Entity configuration interface
 * Supports both simple entities and logical variants
 */
export interface EntityConfig {
  id: string;
  entity_type: string;           // Logical entity name (e.g., 'leads', 'deals')
  entity_schema: string;         // Database schema (e.g., 'external', 'public')
  base_source_name?: string | null;  // Physical table for variants (e.g., 'external.contacts')
  is_logical_variant: boolean;   // true if this is a custom slice of another table
  metadata: MetadataField[];     // Field definitions for write operations
  v_metadata?: MetadataField[];  // Hydrated field definitions for read operations
  capabilities?: Record<string, any>;  // Auto-generated UI/AI capabilities
  rules?: EntityRules;           // Contains partition_filter for variants
  display_format?: any;          // Display ID format configuration
  max_counter?: any;             // Counter for display IDs
  semantics?: {
    details?: Record<string, any>;
  };
  created_at?: string;
  updated_at?: string;
}

/** 
 * Entity Blueprint configuration
 * Corresponds to core.entity_blueprints table
 */
export interface EntityBlueprint {
  id: string;
  entity_type: string;
  entity_schema: string;
  base_source?: string | null;
  physical_ddl?: string | null;
  extra_objects?: Record<string, any> | null;
  custom_view_sql?: string | null;
  partition_filter?: string | null;
  ui_config?: Record<string, any> | null;
  dependencies?: string[] | null;
  status?: string | null;
  sub_panels?: any[] | null;
  display_name?: string | null;
  semantics?: Record<string, any> | null;
  rules?: Record<string, any> | null;
  ai_metadata?: Record<string, any> | null;
  classification?: string | null;
  version?: number | null;
  blueprint_hash?: string | null;
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// Entity Version Types (Approval Workflow)
// ============================================================================

/** Status of an entity version in the approval workflow */
export type EntityVersionStatus = 'draft' | 'pending' | 'approved' | 'rejected';

/** 
 * Entity Version for the approval workflow
 * Used when creating logical variants that require approval
 */
export interface EntityVersion {
  id: string;
  entity_id?: string | null;     // FK to core.entities (for updates) or NULL (for new)
  entity_type: string;           // The logical entity name
  entity_schema: string;         // Database schema
  base_source_name: string;      // The physical table
  metadata: MetadataField[];     // Draft metadata
  rules?: EntityRules;           // Draft rules including partition_filter
  status: EntityVersionStatus;
  created_by: string;            // User who created the draft
  changed_by_user_id?: string;   // Alias for created_by
  approved_by?: string | null;   // User who approved
  approved_at?: string | null;   // Approval timestamp
  rejection_reason?: string | null;
  version_number?: number;
  created_at: string;
  updated_at?: string;
}

// ============================================================================
// UI Display Types
// ============================================================================

/** Entity type for UI display (badge) */
export type EntityDisplayType = 'physical' | 'variant';

/** Entity status for UI display */
export type EntityStatus = 'active' | 'pending' | 'draft' | 'rejected';

/** Helper to determine entity display type */
export const getEntityDisplayType = (entity: EntityConfig): EntityDisplayType => {
  return entity.is_logical_variant ? 'variant' : 'physical';
};

/** Helper to get status from entity or version */
export const getEntityStatus = (entity: EntityConfig, pendingVersions?: EntityVersion[]): EntityStatus => {
  if (pendingVersions?.some(v => v.entity_id === entity.id && v.status === 'pending')) {
    return 'pending';
  }
  return 'active';
};

// ============================================================================
// Form Data Types (for wizard/modal)
// ============================================================================

/** Form data for entity registration wizard */
export interface EntityRegistrationFormData {
  schema: string;
  table: string;
  entityName: string;
  isLogicalVariant: boolean;
  partitionFilter: string;
  partitionFilters?: PartitionFilter[];  // Parsed filters for UI
}

/** Wizard step definition */
export interface WizardStep {
  title: string;
  description?: string;
  content: React.ReactNode;
  isValid?: () => boolean;
}
