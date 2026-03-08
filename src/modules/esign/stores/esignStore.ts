import { create } from 'zustand';
import type { WizardStepData, RecipientFormData, FieldPlacement } from '../types';

interface WizardStore extends WizardStepData {
    currentStep: number;
    expiresAt?: Date;
    uploadedFile?: File;
    previewUrl?: string;
    pageCount: number;
    setCurrentStep: (step: number) => void;
    setUploadedFile: (file: File | undefined) => void;
    setPreviewUrl: (url: string | undefined) => void;
    setPageCount: (count: number) => void;
    setEnvelopeTitle: (title: string) => void;
    setEnvelopeDescription: (description: string) => void;
    setWorkflowType: (type: WizardStepData['workflowType']) => void;
    setRequiresSigningOrder: (requires: boolean) => void;
    setExpiresAt: (date: Date | undefined) => void;
    addRecipient: (recipient: RecipientFormData) => void;
    updateRecipient: (index: number, recipient: RecipientFormData) => void;
    removeRecipient: (index: number) => void;
    setRecipients: (recipients: RecipientFormData[]) => void;
    addFieldPlacement: (field: Omit<FieldPlacement, 'id'>) => void;
    updateFieldPlacement: (id: string, field: Partial<FieldPlacement>) => void;
    removeFieldPlacement: (id: string) => void;
    setFieldPlacements: (fields: FieldPlacement[]) => void;
    resetWizard: () => void;
}

const initialState: WizardStepData = {
    envelopeTitle: '',
    envelopeDescription: '',
    recipients: [],
    fieldPlacements: [],
    requiresSigningOrder: false,
    workflowType: 'other',
    pageCount: 1,
};

export const useESignWizardStore = create<WizardStore>((set) => ({
    ...initialState,
    currentStep: 0,

    setCurrentStep: (step) => set({ currentStep: step }),

    setUploadedFile: (file) => set({ uploadedFile: file }),

    setPreviewUrl: (url) => set({ previewUrl: url }),

    setPageCount: (count) => set({ pageCount: count }),

    setEnvelopeTitle: (title) => set({ envelopeTitle: title }),

    setEnvelopeDescription: (description) => set({ envelopeDescription: description }),

    setWorkflowType: (type) => set({ workflowType: type }),

    setRequiresSigningOrder: (requires) => set({ requiresSigningOrder: requires }),

    setExpiresAt: (date) => set({ expiresAt: date }),

    addRecipient: (recipient) =>
        set((state) => ({
            recipients: [...state.recipients, recipient],
        })),

    updateRecipient: (index, recipient) =>
        set((state) => ({
            recipients: state.recipients.map((r, i) => (i === index ? recipient : r)),
        })),

    removeRecipient: (index) =>
        set((state) => ({
            recipients: state.recipients.filter((_, i) => i !== index),
        })),

    setRecipients: (recipients) => set({ recipients }),

    addFieldPlacement: (field) =>
        set((state) => ({
            fieldPlacements: [
                ...state.fieldPlacements,
                { ...field, id: crypto.randomUUID() } as FieldPlacement,
            ],
        })),

    updateFieldPlacement: (id, updates) =>
        set((state) => ({
            fieldPlacements: state.fieldPlacements.map((f) =>
                f.id === id ? { ...f, ...updates } : f
            ),
        })),

    removeFieldPlacement: (id) =>
        set((state) => ({
            fieldPlacements: state.fieldPlacements.filter((f) => f.id !== id),
        })),

    setFieldPlacements: (fields) => set({ fieldPlacements: fields }),

    resetWizard: () => set({ ...initialState, currentStep: 0 }),
}));
