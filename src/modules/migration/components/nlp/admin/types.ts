export enum EntityStatus {
  PUBLISHED = 'published',
  DRAFT = 'draft',
  NOT_MODELED = 'not_modeled',
}

export enum QueryStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
}

export enum UserFeedback {
  HELPFUL = 'helpful',
  NOT_HELPFUL = 'not_helpful',
  NO_FEEDBACK = 'no_feedback',
}

export interface ColumnMetadata {
  name: string;
  description: string;
  synonyms: string[];
  data_type?: string;
  is_nullable?: boolean;
}

export interface SemanticMetadata {
  description: string;
  synonyms: string[];
  columns: ColumnMetadata[];
  sample_values?: Record<string, any[]>;
  workflow_states?: string[];
}

export interface Entity {
  id: string;
  entity_name: string;
  source_table: string;
  source_schema: string;
  status: EntityStatus;
  semantics: SemanticMetadata | null;
  is_active: boolean;
  last_updated: string;
  created_at: string;
  updated_at: string;
}

export interface EntityVersion {
  id: string;
  entity_id: string;
  version_number: number;
  semantics: SemanticMetadata;
  status: 'draft' | 'published' | 'archived';
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface NlpLog {
  id: string;
  user_input: string;
  generated_sql: string;
  was_successful: boolean;
  error_message: string | null;
  execution_time_ms: number | null;
  user_feedback: UserFeedback | null;
  user_id: string | null;
  corrected_sql: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface EntityContext {
  entity: Entity;
  schema_info: {
    columns: Array<{
      column_name: string;
      data_type: string;
      is_nullable: boolean;
      column_default: string | null;
    }>;
    constraints: Array<{
      constraint_name: string;
      constraint_type: string;
    }>;
  };
  sample_rows: Record<string, any>[];
}

export interface TrainingCenterFilters {
  status?: QueryStatus | null;
  userFeedback?: UserFeedback | null;
  dateRange?: [string, string] | null;
  searchText?: string;
}
