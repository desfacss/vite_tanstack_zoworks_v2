import { Upload, Button, Form, Input, Select, DatePicker } from 'antd';
import { Upload as UploadIcon, FileText } from 'lucide-react';
import { useESignWizardStore } from '../../stores/esignStore';

const { Dragger } = Upload;

export function UploadStep() {
    const {
        uploadedFile,
        previewUrl,
        envelopeTitle,
        envelopeDescription,
        workflowType,
        setUploadedFile,
        setPreviewUrl,
        setEnvelopeTitle,
        setEnvelopeDescription,
        setWorkflowType,
        setExpiresAt,
        setCurrentStep,
        pageCount,
        setPageCount,
    } = useESignWizardStore();

    const handleFileChange = (info: any) => {
        const file = info.file.originFileObj || info.file;
        if (file) {
            // Revoke old URL to prevent memory leaks
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
            const url = URL.createObjectURL(file);
            setUploadedFile(file);
            setPreviewUrl(url);

            // Automated Page Detection for PDFs
            if (file.type === 'application/pdf') {
                const reader = new FileReader();
                reader.onload = () => {
                    const content = reader.result as string;
                    // Improved page count regex for PDF
                    const pageMatches = content.match(/\/Type\s*\/Page\b/g);
                    if (pageMatches) {
                        setPageCount(pageMatches.length);
                    } else {
                        // Fallback detection
                        const countMatch = content.match(/\/Count\s+(\d+)/);
                        if (countMatch && countMatch[1]) {
                            setPageCount(parseInt(countMatch[1]));
                        }
                    }
                };
                reader.readAsText(file);
            }
        }
    };

    const handleNext = () => {
        if (envelopeTitle && uploadedFile) {
            setCurrentStep(1);
        }
    };

    return (
        <div className="max-w-3xl mx-auto py-8">
            <Form layout="vertical">
                <Form.Item
                    label="Document Title"
                    required
                    help="Give your document a clear, descriptive name"
                >
                    <Input
                        size="large"
                        placeholder="e.g., Master Service Agreement - Acme Corp"
                        value={envelopeTitle}
                        onChange={(e) => setEnvelopeTitle(e.target.value)}
                    />
                </Form.Item>

                <Form.Item label="Description">
                    <Input.TextArea
                        rows={3}
                        placeholder="Optional description for internal reference"
                        value={envelopeDescription}
                        onChange={(e) => setEnvelopeDescription(e.target.value)}
                    />
                </Form.Item>

                <Form.Item label="Workflow Type">
                    <Select
                        size="large"
                        placeholder="Select the document category"
                        value={workflowType}
                        onChange={setWorkflowType}
                        options={[
                            { value: 'sales_contract', label: 'Sales Contract' },
                            { value: 'hr_document', label: 'HR Document' },
                            { value: 'field_ops', label: 'Field Operations' },
                            { value: 'compliance', label: 'Compliance' },
                            { value: 'procurement', label: 'Procurement' },
                            { value: 'other', label: 'Other' },
                        ]}
                    />
                </Form.Item>

                <Form.Item label="Expiration Date">
                    <DatePicker
                        size="large"
                        className="w-full"
                        placeholder="Optional expiration date"
                        onChange={(date) => setExpiresAt(date?.toDate())}
                    />
                </Form.Item>

                <Form.Item
                    label="Page Count"
                    help="Detected automatically, but you can override it if incorrect."
                >
                    <Input
                        type="number"
                        size="large"
                        min={1}
                        value={pageCount}
                        onChange={(e) => setPageCount(parseInt(e.target.value) || 1)}
                        className="w-32"
                    />
                </Form.Item>

                <Form.Item label="Upload Document" required>
                    <Dragger
                        name="file"
                        multiple={false}
                        maxCount={1}
                        accept=".pdf,.doc,.docx"
                        beforeUpload={() => false}
                        onChange={handleFileChange}
                        className="hover:border-blue-500"
                    >
                        <p className="ant-upload-drag-icon">
                            {uploadedFile ? (
                                <FileText size={48} className="text-blue-500 mx-auto" />
                            ) : (
                                <UploadIcon size={48} className="text-gray-400 mx-auto" />
                            )}
                        </p>
                        <p className="ant-upload-text text-lg">
                            {uploadedFile ? uploadedFile.name : 'Click or drag file to upload'}
                        </p>
                        <p className="ant-upload-hint">
                            Support for PDF, DOC, and DOCX files. Maximum file size: 10MB
                        </p>
                    </Dragger>
                </Form.Item>

                <div className="flex justify-end gap-3 mt-8">
                    <Button type="primary" size="large" onClick={handleNext} disabled={!envelopeTitle || !uploadedFile}>
                        Next: Add Recipients
                    </Button>
                </div>
            </Form>
        </div>
    );
}
