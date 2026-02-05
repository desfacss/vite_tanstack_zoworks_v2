export interface DocumentForm {
  id: string;
  name: string;
  type_id: string;
  data_schema: any;
  ui_schema: any;
  form_type?: string;
  organization_id?: string;
  created_at: string;
}

export interface DocumentTemplate {
  id: string;
  organization_id: string;
  document_type_id: string;
  name: string;
  settings: any;
  is_default: boolean;
  created_at: string;
  created_by?: string;
  updated_at: string;
  updated_by?: string;
}

export interface DocumentRecord {
  id: string;
  name: string;
  content: any;
  type?: string;
  organization_id: string;
  created_at: string;
  created_by?: string;
  updated_at: string;
  updated_by?: string;
  display_id?: string;
  // Additional fields for specific document types
  ticket_id?: string;
  assignee_id?: string;
  cli_client_id?: string;
}

export interface DocumentTypeConfig {
  type_id: string;
  display_name: string;
  table_name: string;
  icon?: string;
  color?: string;
}

export const DOCUMENT_TYPES: DocumentTypeConfig[] = [
  {
    type_id: 'doc_invoices',
    display_name: 'Invoice',
    table_name: 'doc_invoices', 
    icon: 'FileTextOutlined',
    color: '#1890ff'
  },
  {
    type_id: 'doc_service_reports',
    display_name: 'Service Report',
    table_name: 'blueprint.service_reports',
    icon: 'ToolOutlined',
    color: '#52c41a'
  },
  {
    type_id: 'purchase-order',
    display_name: 'Purchase Order',
    table_name: 'doc_purchase_orders',
    icon: 'ShoppingCartOutlined',
    color: '#722ed1'
  },
  {
    type_id: 'credit-note',
    display_name: 'Credit Note',
    table_name: 'doc_credit_notes',
    icon: 'CreditCardOutlined',
    color: '#fa8c16'
  }
];
