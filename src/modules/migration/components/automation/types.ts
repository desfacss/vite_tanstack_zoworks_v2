export interface WorkflowDefinition {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  entity_type: string;
  entity_schema: string | null;
  is_active: boolean;
  version: number;
  type: string | null;
  definitions: {
    stages: WorkflowStage[];
    transitions: WorkflowTransition[];
    startStateId?: string;
    processType?: string;
  };
  created_at: string;
  updated_at: string | null;
  created_by: string;
  updated_by: string | null;
}

export interface WorkflowRule {
  id?: string;
  organization_id: string;
  name: string;
  description?: string;
  trigger_type: 'on_create' | 'on_update' | 'both' | 'cron';
  trigger_table: string;
  trigger_condition?: any;
  actions: any[];
  is_active?: boolean;
  priority?: number;
  last_executed_at?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
  workflow_definition_id?: string;
}

export interface WorkflowStage {
  id: string;
  name: string;
  displayLabel: string;
  sequence: number;
  systemStatusCategory: string;
  on_entry_event_name?: string;
  on_exit_event_name?: string;
}

export interface WorkflowTransition {
  id: string;
  name: string;
  from: string | string[];
  to: string;
  trigger: string;
  condition?: { rule: string };
  timeThresholdHours?: number;
}

export interface StageMetric {
  stage_id: string;
  pertTime: { optimisticHours: number; mostLikelyHours: number; pessimisticHours: number };
  pertCost: { optimisticUsd: number; mostLikelyUsd: number; pessimisticUsd: number };
  aspirationalMetrics: { targetTimeHours: number; targetCostUsd: number };
  requiredSkills: string[];
  resourceRequirements: any[];
}

export interface StageMetrics {
  id?: string;
  process_definition_id: string;
  organization_id: string;
  metrics_data: StageMetric[];
}

export interface ViewConfig {
  id: string;
  table_name: string;
  schema_name: string;
  display_name: string;
}

export interface EmailTemplate {
  id?: string;
  name: string;
  description?: string;
  details: { subject: string; body: string };
  is_active: boolean;
  organization_id?: string;
}
