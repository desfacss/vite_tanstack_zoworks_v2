import React, { useState, useEffect, useRef } from 'react';
import { Button, Space, message, Spin, Card } from 'antd';
import { PrinterOutlined, DownloadOutlined, SettingOutlined } from '@ant-design/icons';
import { DocumentService } from './services/documentService';
import { DocumentRecord, DocumentTemplate, DocumentForm as DocFormType } from './types/document';
import DynamicDocumentTemplate from './DynamicDocumentTemplate';
import TemplateCustomizer from './TemplateCustomizer';
import { useAuthStore } from '@/lib/store';
import { useReactToPrint } from 'react-to-print';
import './DocumentViewer.css';

interface DocumentViewerProps {
  documentType: string;
  documentId: string;
  tableName: string;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({ 
  documentType, 
  documentId, 
  tableName 
}) => {
  const { organization } = useAuthStore();
  const [document, setDocument] = useState<DocumentRecord | null>(null);
  const [documentForm, setDocumentForm] = useState<DocFormType | null>(null);
  const [template, setTemplate] = useState<DocumentTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [customizationVisible, setCustomizationVisible] = useState(false);
  const componentRef = useRef<HTMLDivElement>(null); 

  useEffect(() => {
    loadData();
  }, [documentId, documentType]);

  const loadData = async () => {
    setLoading(true);
    try {
      const docData = await DocumentService.getDocument(tableName, documentId);
      setDocument(docData);

      if (organization?.id) {
        const formData = await DocumentService.getDocumentForm(documentType, organization.id);
        setDocumentForm(formData);

        if (formData) {
          const templateData = await DocumentService.getDefaultTemplate(formData.id, organization.id);
          setTemplate(templateData);
        }
      }
    } catch (error) {
      console.error('Error loading document data:', error);
      message.error('Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: document?.display_id || 'document',
    onBeforeGetContent: () => {
      setLoading(true);
      return Promise.resolve();
    },
    onAfterPrint: () => setLoading(false),
    onPrintError: (error) => {
      console.error('Print error:', error);
      message.error('Failed to print document');
      setLoading(false);
    },
  });

  const handleTemplateChange = (newTemplate: DocumentTemplate) => {
    setTemplate(newTemplate);
    message.success('Template updated');
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '400px' 
      }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!document || !documentForm) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '48px' }}>
           <h3>Document not found</h3>
          <p>The requested document could not be loaded.</p>
        </div>
      </Card>
    );
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ 
        background: 'white', 
        borderBottom: '1px solid #d9d9d9', 
        padding: '12px 24px',
        flexShrink: 0
      }} className="print:hidden">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <div>
            <h3 style={{ margin: 0 }}>Document Preview</h3>
            <p style={{ margin: 0, color: '#666', fontSize: 14 }}>
              {documentForm.name} • Created {new Date(document.created_at).toLocaleDateString()}
            </p>
          </div>
          <Space>
            <Button
              icon={<PrinterOutlined />}
              onClick={() => handlePrint()}
              type="primary"
              loading={loading}
            >
              Print
            </Button>
          </Space>
        </div>
      </div>

      <div style={{ 
        flex: 1, 
        overflow: 'auto', 
        background: '#f0f2f5',
        padding: '24px 0'
      }} className="print:py-0 print:bg-white">
        <div style={{ 
          maxWidth: 1200, 
          margin: '0 auto',
          background: 'white',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          minHeight: 'calc(100vh - 120px)'
        }} className="print:shadow-none print:max-w-none">
          <div ref={componentRef} className="print-only">
            <DynamicDocumentTemplate
              documentType={documentType}
              formData={document.content}
              templateSettings={template?.settings}
              companyName="Your Company Name"
            />
          </div>
        </div>
      </div>

      {customizationVisible && documentForm && (
        <TemplateCustomizer
          visible={customizationVisible}
          onClose={() => setCustomizationVisible(false)}
          documentForm={documentForm}
          currentTemplate={template}
          onChange={handleTemplateChange}
        />
      )}
    </div>
  );
};

export default DocumentViewer;
