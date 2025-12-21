import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  Space, 
  Input, 
  Card, 
  Typography, 
  Tag, 
  Dropdown, 
  message,
  Popconfirm,
  Drawer
} from 'antd';
import { 
  PlusOutlined, 
  EyeOutlined, 
  EditOutlined, 
  DeleteOutlined,
  SearchOutlined,
  SettingOutlined,
  MoreOutlined
} from '@ant-design/icons';
import { DocumentService } from './services/documentService';
import { DocumentRecord, DocumentForm, DOCUMENT_TYPES } from './types/document';
import DocumentFormModal from './DocumentFormModal';
import DocumentViewer from './DocumentViewer';
import TemplateManager from './TemplateManager';
import { useAuthStore } from '@/core/lib/store';

const { Title } = Typography;
const { Search } = Input;

interface DocumentListProps {
  documentType: string;
}

const DocumentList: React.FC<DocumentListProps> = ({ documentType }) => {
  const { organization } = useAuthStore();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  
  // Modal states
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [templateManagerVisible, setTemplateManagerVisible] = useState(false);
  
  // Current selections
  const [selectedDocument, setSelectedDocument] = useState<DocumentRecord | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create');
  const [documentForm, setDocumentForm] = useState<DocumentForm | null>(null);

  const documentConfig = DOCUMENT_TYPES.find(type => type.type_id === documentType);
  const tableName = documentConfig?.table_name || '';

  useEffect(() => {
    loadDocumentForm();
    loadDocuments();
  }, [documentType]);

  useEffect(() => {
    if (searchTerm) {
      handleSearch();
    } else {
      loadDocuments();
    }
  }, [searchTerm, pagination.current, pagination.pageSize]);

  const loadDocumentForm = async () => {
    try {
      const form = await DocumentService.getDocumentForm(documentType,organization?.id);
      setDocumentForm(form);
    } catch (error) {
      console.error('Error loading document form:', error);
      message.error('Failed to load document configuration');
    }
  };

  const loadDocuments = async () => {
    if (!tableName) return;
    
    setLoading(true);
    try {
      const result = await DocumentService.getDocuments(
        tableName,
        organization?.id,
        pagination.current,
        pagination.pageSize
      );
      
      setDocuments(result.data);
      setPagination(prev => ({
        ...prev,
        total: result.count
      }));
    } catch (error) {
      console.error('Error loading documents:', error);
      message.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!tableName) return;
    
    setLoading(true);
    try {
      const result = await DocumentService.searchDocuments(
        tableName,
        searchTerm,
        organization?.id,
        pagination.current,
        pagination.pageSize
      );
      
      setDocuments(result.data);
      setPagination(prev => ({
        ...prev,
        total: result.count
      }));
    } catch (error) {
      console.error('Error searching documents:', error);
      message.error('Failed to search documents');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedDocument(null);
    setFormMode('create');
    setFormModalVisible(true);
  };

  const handleEdit = (document: DocumentRecord) => {
    setSelectedDocument(document);
    setFormMode('edit');
    setFormModalVisible(true);
  };

  const handleView = (document: DocumentRecord) => {
    setSelectedDocument(document);
    setViewerVisible(true);
  };

  const handleDelete = async (document: DocumentRecord) => {
    try {
      await DocumentService.deleteDocument(tableName, document.id);
      message.success('Document deleted successfully');
      loadDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      message.error('Failed to delete document');
    }
  };

  const handleFormSubmit = async (formData: any) => {
    try {
      console.log('Saving document with data:', formData);
      
      const documentData = {
        ...selectedDocument,
        name: formData.name || `${documentConfig?.display_name} - ${new Date().toLocaleDateString()}`,
        content: formData,
        type: documentType,
        display_id: formData.display_id // Ensure display_id is at the top level
      };

      console.log('Final document data to save:', documentData);

      await DocumentService.saveDocument(tableName, documentData,organization?.id);
      message.success(`Document ${formMode === 'create' ? 'created' : 'updated'} successfully`);
      setFormModalVisible(false);
      loadDocuments();
    } catch (error) {
      console.error('Error saving document:', error);
      message.error('Failed to save document');
    }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: DocumentRecord) => (
        <Button type="link" onClick={() => handleView(record)}>
          {text}
        </Button>
      ),
    },
    {
      title: 'Display ID',
      dataIndex: 'display_id',
      key: 'display_id',
      render: (text: string) => text ? <Tag>{text}</Tag> : '-',
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Updated',
      dataIndex: 'updated_at',
      key: 'updated_at',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: DocumentRecord) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => handleView(record)}
            title="View"
          />
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            title="Edit"
          />
          <Dropdown
            menu={{
              items: [
                {
                  key: 'delete',
                  label: (
                    <Popconfirm
                      title="Are you sure you want to delete this document?"
                      onConfirm={() => handleDelete(record)}
                      okText="Yes"
                      cancelText="No"
                    >
                      <span style={{ color: '#ff4d4f' }}>
                        <DeleteOutlined /> Delete
                      </span>
                    </Popconfirm>
                  ),
                },
              ],
            }}
            trigger={['click']}
          >
            <Button type="text" icon={<MoreOutlined />} />
          </Dropdown>
        </Space>
      ),
    },
  ];

  if (!documentConfig) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '48px' }}>
          <Title level={3} type="danger">Document Type Not Found</Title>
          <p>The document type "{documentType}" is not configured.</p>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <Card>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: 24 
        }}>
          <div>
            <Title level={4} style={{ margin: 0, 
              // color: documentConfig.color
               }}>
              {documentConfig.display_name}s
            </Title>
            {/* <p style={{ margin: 0, color: '#666' }}>
              Manage your {documentConfig.display_name.toLowerCase()}s
            </p> */}
          </div>
          <Space>
            <Button
              icon={<SettingOutlined />}
              onClick={() => setTemplateManagerVisible(true)}
            >
              Templates
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreate}
            >
              Create {documentConfig.display_name}
            </Button>
          </Space>
        </div>

        <div style={{ marginBottom: 16 }}>
          <Search
            placeholder={`Search ${documentConfig.display_name.toLowerCase()}s...`}
            allowClear
            enterButton={<SearchOutlined />}
            size="large"
            onSearch={setSearchTerm}
            onChange={(e) => !e.target.value && setSearchTerm('')}
          />
        </div>

        <Table
          columns={columns}
          dataSource={documents}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} items`,
            onChange: (page, pageSize) => {
              setPagination(prev => ({
                ...prev,
                current: page,
                pageSize: pageSize || 10
              }));
            },
          }}
        />
      </Card>

      {/* Document Form Modal */}
      <DocumentFormModal
        visible={formModalVisible}
        onClose={() => setFormModalVisible(false)}
        onSubmit={handleFormSubmit}
        documentForm={documentForm}
        initialData={selectedDocument?.content}
        mode={formMode}
        title={`${formMode === 'create' ? 'Create' : 'Edit'} ${documentConfig.display_name}`}
      />

      {/* Document Viewer */}
      <Drawer
        title="Document Viewer"
        placement="right"
        width="80%"
        open={viewerVisible}
        onClose={() => setViewerVisible(false)}
        styles={{ body: { padding: 0 } }}
      >
        {selectedDocument && (
          <DocumentViewer
            documentType={documentType}
            documentId={selectedDocument.id}
            tableName={tableName}
          />
        )}
      </Drawer>

      {/* Template Manager */}
      <Drawer
        title="Template Manager"
        placement="right"
        width={600}
        open={templateManagerVisible}
        onClose={() => setTemplateManagerVisible(false)}
      >
        {documentForm && (
          <TemplateManager
            documentForm={documentForm}
            onClose={() => setTemplateManagerVisible(false)}
          />
        )}
      </Drawer>
    </div>
  );
};

export default DocumentList;