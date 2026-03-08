import { useState } from 'react';
import { Button, App, Drawer } from 'antd';
import { ArrowLeft, Save, Send, Settings2 } from 'lucide-react';
import { useESignWizardStore } from '../../stores/esignStore';
import { FieldToolbar } from './FieldToolbar';
import { DocumentCanvas } from './DocumentCanvas';
import { PropertiesPanel } from './PropertiesPanel';
import { ESignService } from '../../services/esignService';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/core/lib/store';

export function EditorStep() {
    const { message } = App.useApp();
    const navigate = useNavigate();
    const { organization } = useAuthStore();
    const {
        envelopeTitle,
        envelopeDescription,
        workflowType,
        expiresAt,
        requiresSigningOrder,
        recipients,
        fieldPlacements,
        updateFieldPlacement,
        setCurrentStep,
        resetWizard,
    } = useESignWizardStore();

    const [selectedField, setSelectedField] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const handleCreateEnvelope = async (status: 'draft' | 'sent') => {
        setIsSaving(true);
        try {
            await ESignService.createEnvelope(
                {
                    title: envelopeTitle,
                    description: envelopeDescription,
                    workflow_type: workflowType,
                    expires_at: expiresAt?.toISOString(),
                    requires_signing_order: requiresSigningOrder,
                    status: status,
                    organization_id: organization?.id,
                },
                recipients,
                fieldPlacements
            );

            message.success(`Envelope ${status === 'draft' ? 'saved as draft' : 'sent successfully'}`);
            resetWizard();
            navigate('/app/esign');
        } catch (error) {
            console.error('Error creating envelope:', error);
            message.error('Failed to process envelope');
        } finally {
            setIsSaving(false);
        }
    };

    const selectedFieldData = fieldPlacements.find((f) => f.id === selectedField);

    return (
        <div className="py-2 h-full flex flex-col">
            <div className="flex flex-1 gap-6 overflow-hidden" style={{ minHeight: 'calc(100vh - 240px)' }}>
                {/* Left Sidebar - Adjacent to main sidebar */}
                <div className="w-48 border-r pr-4 border-gray-100 overflow-y-auto shrink-0 py-2">
                    <div className="mb-4 flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest px-2">
                        <Settings2 size={14} />
                        Fields
                    </div>
                    <FieldToolbar />
                </div>

                {/* Main Content - Maximized */}
                <div className="flex-1 overflow-y-auto bg-gray-50/30 p-4 rounded-2xl flex justify-center items-start border border-gray-100/50 shadow-inner">
                    <div className="w-full h-full py-4 flex justify-center">
                        <DocumentCanvas
                            selectedFieldId={selectedField}
                            onFieldSelect={setSelectedField}
                        />
                    </div>
                </div>
            </div>

            {/* Properties Drawer */}
            <Drawer
                title="Field Properties"
                placement="right"
                onClose={() => setSelectedField(null)}
                open={!!selectedField}
                width={360}
                mask={false}
                extra={
                    <Button type="text" onClick={() => setSelectedField(null)}>
                        Close
                    </Button>
                }
            >
                {selectedFieldData && (
                    <PropertiesPanel
                        selectedField={selectedFieldData}
                        recipients={recipients}
                        updateFieldPlacement={updateFieldPlacement}
                    />
                )}
            </Drawer>

            <div className="flex justify-between items-center gap-3 mt-6 pt-6 border-t border-gray-100">
                <Button
                    size="large"
                    icon={<ArrowLeft size={18} />}
                    onClick={() => setCurrentStep(1)}
                    className="rounded-xl h-12 px-8 font-medium"
                >
                    Previous
                </Button>
                <div className="flex gap-4">
                    <Button
                        size="large"
                        icon={<Save size={18} />}
                        onClick={() => handleCreateEnvelope('draft')}
                        loading={isSaving}
                        className="rounded-xl h-12 px-8 font-medium"
                    >
                        Save as Draft
                    </Button>
                    <Button
                        type="primary"
                        size="large"
                        icon={<Send size={18} />}
                        onClick={() => handleCreateEnvelope('sent')}
                        loading={isSaving}
                        className="rounded-xl h-12 px-8 font-bold shadow-lg shadow-blue-500/20"
                    >
                        Send Envelope
                    </Button>
                </div>
            </div>
        </div>
    );
}
