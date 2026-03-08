import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Modal, message, Progress, Button, Result } from 'antd';
import { ESignService } from '../services/esignService';
import { DocumentViewer } from '../components/signing/DocumentViewer';
import { SignatureDrawer } from '../components/signing/SignatureDrawer';

export default function SignDocument() {
    const { envelopeId } = useParams<{ envelopeId: string }>();
    const navigate = useNavigate();

    const [envelope, setEnvelope] = useState<any>(null);
    const [fields, setFields] = useState<any[]>([]);
    const [recipients, setRecipients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);

    useEffect(() => {
        if (envelopeId) {
            loadEnvelope();
        }
    }, [envelopeId]);

    const loadEnvelope = async () => {
        try {
            setLoading(true);
            const data = await ESignService.getEnvelope(envelopeId!);
            setEnvelope(data);
            setFields(data.signature_fields || []);
            setRecipients(data.recipients || []);
        } catch (error) {
            console.error('Error loading envelope:', error);
            message.error('Failed to load document');
        } finally {
            setLoading(false);
        }
    };

    const handleFieldClick = (fieldId: string) => {
        setSelectedFieldId(fieldId);
        setIsDrawerOpen(true);
    };

    const handleSaveSignature = async (signatureData: string) => {
        if (!selectedFieldId) return;

        try {
            await ESignService.updateField(selectedFieldId, 'signed', signatureData);

            // Update local state
            setFields((prev) =>
                prev.map((f) =>
                    f.id === selectedFieldId
                        ? { ...f, signature_data: signatureData, completed_at: new Date().toISOString() }
                        : f
                )
            );

            setIsDrawerOpen(false);
            message.success('Field signed!');

            // Check if all fields for current recipient (simulated) are done
            // For MVP we just check ALL fields in the envelope
            const allDone = fields.every(f => f.id === selectedFieldId || f.completed_at);
            if (allDone) {
                setIsCompleted(true);
            }
        } catch (error) {
            message.error('Failed to save signature');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Progress type="circle" percent={30} status="active" />
            </div>
        );
    }

    if (isCompleted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <Card className="max-w-xl w-full text-center p-8 rounded-2xl shadow-premium border-none">
                    <Result
                        status="success"
                        title="Successfully Signed!"
                        subTitle="Your signature has been applied to the document. A copy will be sent to your email shortly."
                        extra={[
                            <Button type="primary" key="close" onClick={() => window.close()}>
                                Close Window
                            </Button>
                        ]}
                    />
                </Card>
            </div>
        );
    }

    if (!envelope) {
        return <Result status="404" title="Envelope Not Found" />;
    }

    const completedCount = fields.filter((f) => f.completed_at).length;
    const totalCount = fields.length;
    const progress = Math.round((completedCount / totalCount) * 100);

    return (
        <div className="min-h-screen bg-[#F0F2F5]">
            {/* Sticky Header */}
            <div className="sticky top-0 z-50 bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="bg-blue-600 p-2 rounded-lg text-white font-bold text-xs">ZO</div>
                    <div>
                        <div className="text-sm font-bold text-gray-800">{envelope.title}</div>
                        <div className="text-xs text-gray-400">Step: Review and Sign</div>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="w-48">
                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-400">Progress</span>
                            <span className="font-bold">{progress}%</span>
                        </div>
                        <Progress percent={progress} showInfo={false} size="small" strokeColor="#2563EB" />
                    </div>
                    <Button
                        type="primary"
                        disabled={progress < 100}
                        className="rounded-lg h-touch shadow-ai"
                    >
                        Finish and Close
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-[1200px] mx-auto">
                <DocumentViewer
                    envelope={envelope}
                    fields={fields}
                    onFieldClick={handleFieldClick}
                    isFieldCompleted={(id) => !!fields.find(f => f.id === id)?.completed_at}
                />
            </div>

            {/* Signature Modal */}
            <Modal
                title="Create your Signature"
                open={isDrawerOpen}
                onCancel={() => setIsDrawerOpen(false)}
                footer={null}
                width={800}
                styles={{ body: { padding: 0 } }}
                centered
                className="premium-modal"
            >
                <SignatureDrawer
                    onSave={handleSaveSignature}
                    onCancel={() => setIsDrawerOpen(false)}
                />
            </Modal>

            <style>{`
        .premium-modal .ant-modal-content {
          border-radius: 20px;
          overflow: hidden;
        }
        .premium-modal .ant-modal-header {
          padding: 24px 24px 0;
          border-bottom: none;
        }
      `}</style>
        </div>
    );
}

// Helper to keep Card working (previously missing import)
import { Card } from 'antd';
