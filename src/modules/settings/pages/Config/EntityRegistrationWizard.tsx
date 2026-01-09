/**
 * EntityRegistrationWizard Component
 * 
 * A multi-step wizard for registering new entities with support for:
 * 1. Simple Mode: Physical table = Logical entity (auto-generated view)
 * 2. Variant Mode: Custom logical entity from a physical table (requires partition filter and approval)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Modal, 
  Steps, 
  Button, 
  Form, 
  AutoComplete, 
  Input, 
  Checkbox, 
  Space, 
  Typography, 
  Alert, 
  Divider,
  message,
  Spin,
  Tag,
} from 'antd';
import { 
  DatabaseOutlined, 
  TagsOutlined, 
  CheckCircleOutlined,
  BranchesOutlined,
} from '@ant-design/icons';
import { supabase } from '@/core/lib/supabase';
import PartitionFilterBuilder from './PartitionFilterBuilder';
import type { PartitionFilter, EntityRegistrationFormData } from './types';

const { Title, Text, Paragraph } = Typography;

interface EntityRegistrationWizardProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;  // Callback to refresh entity list after creation
  existingSchemas: string[];
}

interface TableInfo {
  table_name: string;
  column_count?: number;
  row_estimate?: number;
}

const EntityRegistrationWizard: React.FC<EntityRegistrationWizardProps> = ({
  visible,
  onClose,
  onSuccess,
  existingSchemas,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Form data state
  const [formData, setFormData] = useState<EntityRegistrationFormData>({
    schema: '',
    table: '',
    entityName: '',
    isLogicalVariant: false,
    partitionFilter: '',
    partitionFilters: [],
  });
  
  // Available options
  const [schemas, setSchemas] = useState<string[]>([]);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [existingEntities, setExistingEntities] = useState<string[]>([]);
  
  // Fetch available schemas
  useEffect(() => {
    const fetchSchemas = async () => {
      // Combine existing schemas with common ones
      const commonSchemas = ['public', 'external', 'core'];
      const allSchemas = [...new Set([...existingSchemas, ...commonSchemas])].sort();
      setSchemas(allSchemas);
    };
    fetchSchemas();
  }, [existingSchemas]);
  
  // Fetch tables when schema changes
  useEffect(() => {
    const fetchTables = async () => {
      if (!formData.schema) {
        setTables([]);
        return;
      }
      setLoading(true);
      try {
        // Try to use RPC if available, otherwise fallback to information_schema
        const { data, error } = await supabase
          .schema('core')
          .rpc('get_available_tables', { p_schema: formData.schema });
        
        if (!error && data) {
          setTables(data);
        } else {
          // Fallback: Just set empty and let user type
          setTables([]);
        }
      } catch (err) {
        console.error('Error fetching tables:', err);
        setTables([]);
      } finally {
        setLoading(false);
      }
    };
    fetchTables();
  }, [formData.schema]);
  
  // Fetch existing entities to check for conflicts
  useEffect(() => {
    const fetchExistingEntities = async () => {
      try {
        const { data, error } = await supabase
          .schema('core')
          .from('entities')
          .select('entity_type, entity_schema');
        
        if (!error && data) {
          setExistingEntities(data.map(e => `${e.entity_schema}.${e.entity_type}`));
        }
      } catch (err) {
        console.error('Error fetching existing entities:', err);
      }
    };
    if (visible) {
      fetchExistingEntities();
    }
  }, [visible]);
  
  // Reset form when modal opens/closes
  useEffect(() => {
    if (visible) {
      setCurrentStep(0);
      setFormData({
        schema: '',
        table: '',
        entityName: '',
        isLogicalVariant: false,
        partitionFilter: '',
        partitionFilters: [],
      });
      form.resetFields();
    }
  }, [visible, form]);
  
  // Handle schema change
  const handleSchemaChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      schema: value,
      table: '',
      entityName: '',
    }));
    form.setFieldsValue({ table: undefined, entityName: '' });
  };
  
  // Handle table change - auto-populate entity name
  const handleTableChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      table: value,
      entityName: prev.isLogicalVariant ? prev.entityName : value,
    }));
    if (!formData.isLogicalVariant) {
      form.setFieldsValue({ entityName: value });
    }
  };
  
  // Handle logical variant checkbox
  const handleVariantChange = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      isLogicalVariant: checked,
      entityName: checked ? '' : prev.table,
      partitionFilter: checked ? prev.partitionFilter : '',
      partitionFilters: checked ? prev.partitionFilters : [],
    }));
    if (!checked) {
      form.setFieldsValue({ entityName: formData.table });
    } else {
      form.setFieldsValue({ entityName: '' });
    }
  };
  
  // Handle partition filter change
  const handleFilterChange = useCallback((sql: string, filters: PartitionFilter[]) => {
    setFormData(prev => ({
      ...prev,
      partitionFilter: sql,
      partitionFilters: filters,
    }));
  }, []);
  
  // Validate current step
  const validateStep = async (): Promise<boolean> => {
    try {
      if (currentStep === 0) {
        await form.validateFields(['schema', 'table']);
        return true;
      }
      if (currentStep === 1) {
        await form.validateFields(['entityName']);
        
        // Check for entity name conflicts
        const fullEntityName = `${formData.schema}.${form.getFieldValue('entityName')}`;
        if (existingEntities.includes(fullEntityName)) {
          message.error(`Entity "${form.getFieldValue('entityName')}" already exists in schema "${formData.schema}"`);
          return false;
        }
        
        // Validate partition filter for variants
        if (formData.isLogicalVariant && !formData.partitionFilter) {
          message.error('Partition filter is required for logical variants');
          return false;
        }
        
        return true;
      }
      return true;
    } catch (err) {
      return false;
    }
  };
  
  // Handle next step
  const handleNext = async () => {
    const isValid = await validateStep();
    if (isValid) {
      // Update formData with form values before moving
      const values = form.getFieldsValue();
      setFormData(prev => ({
        ...prev,
        ...values,
      }));
      setCurrentStep(currentStep + 1);
    }
  };
  
  // Handle previous step
  const handlePrev = () => {
    setCurrentStep(currentStep - 1);
  };
  
  // Handle form submission
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const entityName = form.getFieldValue('entityName') || formData.entityName;
      
      if (formData.isLogicalVariant) {
        // Create as logical variant - submit to entity_versions for approval
        const { error } = await supabase
          .schema('core')
          .from('entity_versions')
          .insert([{
            entity_type: entityName,
            entity_schema: formData.schema,
            base_source_name: `${formData.schema}.${formData.table}`,
            metadata: [], // Will be populated in metadata editor
            rules: {
              logic: {
                partition_filter: formData.partitionFilter,
                filters: formData.partitionFilters,
              },
            },
            status: 'pending',
          }]);
        
        if (error) throw error;
        
        message.success('Logical variant submitted for approval!');
      } else {
        // Create as simple entity - direct insert to entities
        // 1. Insert into core.entities
        const { data: entityData, error: entityError } = await supabase
          .schema('core')
          .from('entities')
          .insert([{
            entity_type: entityName,
            entity_schema: formData.schema,
            is_logical_variant: false,
            metadata: [],
          }])
          .select();
        
        if (entityError) throw entityError;
        
        const newEntityId = entityData[0].id;
        
        // 2. Insert view_configs
        const { error: viewConfigError } = await supabase
          .schema('core')
          .from('view_configs')
          .insert([{
            entity_id: newEntityId,
            entity_type: `${formData.schema}.${entityName}`,
            general: {},
            tableview: {},
            gridview: {},
            kanbanview: {},
            detailview: {},
            details_overview: {},
          }]);
        
        if (viewConfigError) {
          console.error('Error creating view_configs:', viewConfigError);
        }
        
        // 3. Insert metrics
        const { error: metricsError } = await supabase
          .schema('core')
          .from('metrics')
          .insert([{
            entity_id: newEntityId,
            entity_type: `${formData.schema}.${entityName}`,
            metrics: {},
          }]);
        
        if (metricsError) {
          console.error('Error creating metrics:', metricsError);
        }
        
        message.success('Entity created successfully!');
      }
      
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error creating entity:', error);
      message.error(`Failed to create entity: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };
  
  // Step definitions
  const steps = [
    {
      title: 'Base Table',
      icon: <DatabaseOutlined />,
      description: 'Select the physical table',
    },
    {
      title: 'Entity Identity',
      icon: <TagsOutlined />,
      description: 'Define the entity name',
    },
    {
      title: 'Confirm',
      icon: <CheckCircleOutlined />,
      description: 'Review and create',
    },
  ];
  
  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div style={{ padding: '24px 0' }}>
            <Title level={5}>Select Base Table</Title>
            <Paragraph type="secondary">
              Choose the database schema and table that will be the foundation for this entity.
            </Paragraph>
            
            <Form.Item
              name="schema"
              label="Schema"
              rules={[{ required: true, message: 'Please select or enter a schema' }]}
            >
              <AutoComplete
                placeholder="Select or enter schema"
                onChange={handleSchemaChange}
                style={{ width: '100%' }}
                options={schemas.map(s => ({ value: s }))}
                filterOption={(inputValue, option) =>
                  option?.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                }
              />
            </Form.Item>
            
            <Form.Item
              name="table"
              label="Table"
              rules={[{ required: true, message: 'Please select or enter a table' }]}
            >
              <AutoComplete
                placeholder={loading ? 'Loading tables...' : 'Select or enter table name'}
                onChange={handleTableChange}
                disabled={!formData.schema}
                style={{ width: '100%' }}
                options={tables.map(t => ({ 
                  value: t.table_name,
                  label: (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{t.table_name}</span>
                      {t.column_count && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {t.column_count} columns
                        </Text>
                      )}
                    </div>
                  )
                }))}
                filterOption={(inputValue, option) =>
                  String(option?.value).toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                }
              >
                {loading && <Spin size="small" />}
              </AutoComplete>
            </Form.Item>
          </div>
        );
      
      case 1:
        return (
          <div style={{ padding: '24px 0' }}>
            <Title level={5}>Define Entity Identity</Title>
            <Paragraph type="secondary">
              Configure how this entity will be identified in the system.
            </Paragraph>
            
            <Form.Item
              name="entityName"
              label="Entity Name"
              rules={[
                { required: true, message: 'Please enter an entity name' },
                { 
                  pattern: /^[a-z][a-z0-9_]*$/, 
                  message: 'Use lowercase letters, numbers, and underscores only. Must start with a letter.' 
                },
              ]}
              extra={
                !formData.isLogicalVariant 
                  ? 'Auto-filled from table name. Change this to create a logical variant.'
                  : 'Enter a unique name for this logical variant (e.g., "leads", "active_deals").'
              }
            >
              <Input 
                placeholder="entity_name" 
                onChange={(e) => {
                  // Auto-detect if user is creating a variant by changing the name
                  if (e.target.value !== formData.table && !formData.isLogicalVariant) {
                    // Don't auto-check the variant box, just allow the different name
                  }
                  setFormData(prev => ({ ...prev, entityName: e.target.value }));
                }}
              />
            </Form.Item>
            
            <Divider />
            
            <Form.Item>
              <Checkbox 
                checked={formData.isLogicalVariant}
                onChange={(e) => handleVariantChange(e.target.checked)}
              >
                <Space>
                  <BranchesOutlined />
                  <span>Create as Logical Variant</span>
                </Space>
              </Checkbox>
              <div style={{ marginLeft: 24, marginTop: 8 }}>
                <Text type="secondary">
                  Enable this to create a filtered view of the base table (e.g., "leads" from "contacts" where lifecycle_stage = 'lead').
                </Text>
              </div>
            </Form.Item>
            
            {formData.isLogicalVariant && (
              <>
                <Alert
                  message="Approval Required"
                  description="Logical variants require admin approval before they become active. They will appear in the pending approvals list."
                  type="info"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
                
                <div style={{ marginBottom: 8 }}>
                  <Text strong>Base Table: </Text>
                  <Tag color="blue">{formData.schema}.{formData.table}</Tag>
                </div>
                
                <PartitionFilterBuilder
                  schema={formData.schema}
                  tableName={formData.table}
                  value={formData.partitionFilter}
                  onChange={handleFilterChange}
                />
              </>
            )}
          </div>
        );
      
      case 2:
        return (
          <div style={{ padding: '24px 0' }}>
            <Title level={5}>Review & Confirm</Title>
            <Paragraph type="secondary">
              Please review the entity configuration before creating.
            </Paragraph>
            
            <div style={{ background: '#fafafa', padding: 16, borderRadius: 8 }}>
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <div>
                  <Text strong>Entity Name: </Text>
                  <Tag color="green" style={{ fontSize: 14 }}>
                    {formData.entityName || form.getFieldValue('entityName')}
                  </Tag>
                </div>
                
                <div>
                  <Text strong>Schema: </Text>
                  <Text>{formData.schema}</Text>
                </div>
                
                <div>
                  <Text strong>Base Table: </Text>
                  <Text>{formData.table}</Text>
                </div>
                
                <div>
                  <Text strong>Type: </Text>
                  {formData.isLogicalVariant ? (
                    <Tag color="purple">Logical Variant</Tag>
                  ) : (
                    <Tag color="green">Physical Entity</Tag>
                  )}
                </div>
                
                {formData.isLogicalVariant && formData.partitionFilter && (
                  <div>
                    <Text strong>Partition Filter: </Text>
                    <Tag color="blue">{formData.partitionFilter}</Tag>
                  </div>
                )}
                
                <Divider style={{ margin: '12px 0' }} />
                
                <div>
                  <Text strong>What will happen:</Text>
                  <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                    {formData.isLogicalVariant ? (
                      <>
                        <li>A new version record will be created with status "pending"</li>
                        <li>An admin will need to approve the variant</li>
                        <li>After approval, the entity and view will be created</li>
                      </>
                    ) : (
                      <>
                        <li>A new entity record will be created in core.entities</li>
                        <li>View configurations will be initialized</li>
                        <li>You can configure metadata and views after creation</li>
                      </>
                    )}
                  </ul>
                </div>
              </Space>
            </div>
            
            {formData.isLogicalVariant && (
              <Alert
                message="This variant will require approval"
                type="warning"
                showIcon
                style={{ marginTop: 16 }}
              />
            )}
          </div>
        );
      
      default:
        return null;
    }
  };
  
  return (
    <Modal
      title="Register New Entity"
      open={visible}
      onCancel={onClose}
      width={700}
      footer={null}
      destroyOnClose
    >
      <Steps 
        current={currentStep} 
        items={steps.map(s => ({
          title: s.title,
          description: s.description,
          icon: s.icon,
        }))}
        style={{ marginBottom: 24 }}
      />
      
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          schema: formData.schema,
          table: formData.table,
          entityName: formData.entityName,
        }}
      >
        {renderStepContent()}
      </Form>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Space>
          {currentStep > 0 && (
            <Button onClick={handlePrev}>Previous</Button>
          )}
          {currentStep < steps.length - 1 && (
            <Button type="primary" onClick={handleNext}>
              Next
            </Button>
          )}
          {currentStep === steps.length - 1 && (
            <Button 
              type="primary" 
              onClick={handleSubmit}
              loading={submitting}
            >
              {formData.isLogicalVariant ? 'Submit for Approval' : 'Create Entity'}
            </Button>
          )}
        </Space>
      </div>
    </Modal>
  );
};

export default EntityRegistrationWizard;
