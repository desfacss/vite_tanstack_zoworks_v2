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
import { DocumentRecord, DocumentForm as DocFormType, DOCUMENT_TYPES } from './types/document';
import DocumentFormModal from './DocumentFormModal';
import DocumentViewer from './DocumentViewer';
import TemplateManager from './TemplateManager';
import { useAuthStore } from '@/lib/store';

const { Title } = Typography;
const { Search } = Input;

interface DocumentListProps {
  documentType: string;
  onCreate?: () => void;
  onEdit?: (record: DocumentRecord) => void;
}

const DocumentList: React.FC<DocumentListProps> = ({ documentType, onCreate, onEdit }) => {
  const { organization } = useAuthStore();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  // ... existing states ...
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [templateManagerVisible, setTemplateManagerVisible] = useState(false);
  
  const [selectedDocument, setSelectedDocument] = useState<DocumentRecord | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create');
  const [documentForm, setDocumentForm] = useState<DocFormType | null>(null);

  const documentConfig = DOCUMENT_TYPES.find(type => type.type_id === documentType);
  const tableName = documentConfig?.table_name || '';

  // ... useEffects ...
  useEffect(() => {
    if (organization?.id) {
       loadDocumentForm();
       loadDocuments();
    }
  }, [documentType, organization?.id]);

  useEffect(() => {
    if (organization?.id) {
        if (searchTerm) {
          handleSearch();
        } else {
          loadDocuments();
        }
    }
  }, [searchTerm, pagination.current, pagination.pageSize]);

  const loadDocumentForm = async () => {
    if (!organization?.id) return;
    try {
      const form = await DocumentService.getDocumentForm(documentType);
      setDocumentForm(form);
    } catch (error) {
      console.error('Error loading form:', error);
    }
  };

  const loadDocuments = async () => {
    if (!tableName || !organization?.id) return;
    setLoading(true);
    try {
      const result = await DocumentService.getDocuments(
        tableName,
        organization.id,
        pagination.current,
        pagination.pageSize
      );
      setDocuments(result.data);
      setPagination(prev => ({ ...prev, total: result.count }));
    } catch (error) {
      console.error('Error loading docs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!tableName || !organization?.id) return;
    setLoading(true);
    try {
      const result = await DocumentService.searchDocuments(
        tableName,
        searchTerm,
        organization.id,
        pagination.current,
        pagination.pageSize
      );
      setDocuments(result.data);
      setPagination(prev => ({ ...prev, total: result.count }));
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    if (onCreate) {
      onCreate();
      return;
    }
    setSelectedDocument(null);
    setFormMode('create');
    setFormModalVisible(true);
  };

  const handleEdit = (document: DocumentRecord) => {
    if (onEdit) {
      onEdit(document);
      return;
    }
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
      message.success('Document deleted');
      loadDocuments();
    } catch (error) {
      message.error('Failed to delete');
    }
  };

  const handleFormSubmit = async (formData: any) => {
    if (!organization?.id) return;
    try {
      const documentData = {
        ...selectedDocument,
        name: formData.name || `${documentConfig?.display_name} - ${new Date().toLocaleDateString()}`,
        content: formData,
        type: documentType,
        display_id: formData.display_id
      };

      await DocumentService.saveDocument(tableName, documentData, organization.id);
      message.success('Document saved');
      setFormModalVisible(false);
      loadDocuments();
    } catch (error) {
      message.error('Failed to save');
    }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: DocumentRecord) => (
        <Button type="link" onClick={() => handleView(record)}>{text}</Button>
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
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: DocumentRecord) => (
        <Space>
          <Button type="text" icon={<EyeOutlined />} onClick={() => handleView(record)} />
          <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Dropdown
            menu={{
              items: [
                {
                  key: 'delete',
                  label: (
                    <Popconfirm title="Delete?" onConfirm={() => handleDelete(record)}>
                      <span style={{ color: '#ff4d4f' }}><DeleteOutlined /> Delete</span>
                    </Popconfirm>
                  ),
                },
              ],
            }}
          >
            <Button type="text" icon={<MoreOutlined />} />
          </Dropdown>
        </Space>
      ),
    },
  ];

  if (!documentConfig) return null;

  return (
    <div>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
          <Title level={4} style={{ margin: 0 }}>{documentConfig.display_name}s</Title>
          <Space>
            <Button icon={<SettingOutlined />} onClick={() => setTemplateManagerVisible(true)}>Templates</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>Create</Button>
          </Space>
        </div>

        <Search
          placeholder="Search..."
          allowClear
          onSearch={setSearchTerm}
          size="large"
          style={{ marginBottom: 16 }}
        />

        <Table
          columns={columns}
          dataSource={documents}
          loading={loading}
          rowKey="id"
          pagination={{
            ...pagination,
            onChange: (page, pageSize) => setPagination(prev => ({ ...prev, current: page, pageSize: pageSize || 10 }))
          }}
        />
      </Card>

      <DocumentFormModal
        visible={formModalVisible}
        onClose={() => setFormModalVisible(false)}
        onSubmit={handleFormSubmit}
        documentForm={documentForm}
        initialData={selectedDocument?.content}
        mode={formMode}
        title={`${formMode === 'create' ? 'Create' : 'Edit'} ${documentConfig.display_name}`}
      />

      <Drawer
        title="Viewer"
        placement="right"
        width="80%"
        open={viewerVisible}
        onClose={() => setViewerVisible(false)}
      >
        {selectedDocument && (
          <DocumentViewer
            documentType={documentType}
            documentId={selectedDocument.id}
            tableName={tableName}
          />
        )}
      </Drawer>

      <Drawer
        title="Templates"
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
