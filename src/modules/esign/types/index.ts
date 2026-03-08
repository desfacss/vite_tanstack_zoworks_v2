export type WorkflowType = 'sales_contract' | 'hr_document' | 'field_ops' | 'compliance' | 'procurement' | 'other';
export type RecipientRole = 'signer' | 'viewer' | 'approver';
export type RecipientStatus = 'pending' | 'notified' | 'viewed' | 'signed' | 'declined';
export type AuthMethod = 'email' | 'whatsapp_otp' | 'access_code' | 'none';
export type FieldType = 'signature' | 'initials' | 'date' | 'text' | 'checkbox' | 'dropdown';
export type EnvelopeStatus = 'draft' | 'sent' | 'viewed' | 'partially_signed' | 'completed' | 'voided' | 'expired';

export interface RecipientFormData {
    id?: string;
    name: string;
    email: string;
    phone?: string;
    role: RecipientRole;
    signingOrder?: number;
    authMethod: AuthMethod;
}

export interface FieldPlacement {
    id: string;
    recipientId: string; // email as temporary ID during wizard
    fieldType: FieldType;
    pageNumber: number;
    xPosition: number;
    yPosition: number;
    width: number;
    height: number;
    isRequired: boolean;
    fieldLabel?: string;
}

export interface WizardStepData {
    envelopeTitle: string;
    envelopeDescription: string;
    workflowType?: WorkflowType;
    requiresSigningOrder: boolean;
    expiresAt?: Date;
    uploadedFile?: File;
    recipients: RecipientFormData[];
    fieldPlacements: FieldPlacement[];
    pageCount: number;
}
