// Entity Blueprint Types
export interface EntityBlueprintRecord {
  id: string;
  entity_type: string;
  entity_schema: string;
  base_source?: string | null;
  classification?: string | null;
  semantics?: Record<string, any> | null;
  rules?: Record<string, any> | null;
  ai_metadata?: Record<string, any> | null;
  jsonb_schema?: Record<string, any> | null;
  display_format?: Record<string, any> | null;
  ui_general?: Record<string, any> | null;
  ui_details_overview?: Record<string, any> | null;
  ui_dashboard?: Record<string, any> | null;
  version?: number;
  created_at?: string;
  updated_at?: string;
}

export interface EntityBlueprintHistoryRecord {
  id: string;
  blueprint_id: string;
  data?: Record<string, any> | null;
  description?: string | null;
  created_at?: string;
  created_by?: string | null;
}
