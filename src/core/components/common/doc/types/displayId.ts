export interface DisplayIdConfig {
  format_template: string;
  padding: number;
  reset_period: 'CALENDAR_YEAR' | 'FINANCIAL_YEAR';
  current_counter?: Record<string, number>;
  entity_type?: string;
  entity_schema?: string;
  organization_id?: string | null;
}

export interface DisplayIdPreview {
  preview: string;
  tokens: Array<{
    token: string;
    value: string;
    available: boolean;
  }>;
}

export interface DisplayIdGenerationRequest {
  entity_type: string;
  entity_data: Record<string, any>;
  entity_id?: string;
}

export interface DisplayIdValidationResult {
  isValid: boolean;
  message?: string;
}
