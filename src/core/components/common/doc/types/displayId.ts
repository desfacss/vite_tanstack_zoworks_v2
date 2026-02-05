export interface DisplayIdConfig {
  format: string;
  date_field: string;
  table_name: {
    table: string;
    schema: string;
  };
  start_number: number;
  token_config: Array<{
    type: 'lookup' | 'date_part' | 'counter';
    token: string;
    entity_field?: string;
    lookup_table?: {
      table: string;
      schema: string;
    };
    lookup_id_field?: string;
    lookup_value_field?: string;
    format?: string;
  }>;
  counter_padding: number;
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
