/**
 * FormGenerator Component
 * Auto-generates DynamicForm configurations from entity metadata
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  Card,
  Select,
  Button,
  Space,
  Typography,
  Alert,
  Divider,
  message,
  Checkbox,
  Collapse,
  Radio,
  Input,
  Switch,
} from 'antd';
import { ThunderboltOutlined, ReloadOutlined } from '@ant-design/icons';
import { supabase } from '@/core/lib/supabase';
import { Entity, EntityField, GeneratedFormSchemas, GeneratorOptions } from './types';
import { generateFormFromMetadata } from './utils';
import { selectFieldsWithLLM } from './llmService';
import AceEditor from 'react-ace';

const { Title, Text } = Typography;
const { Panel } = Collapse;

interface FormGeneratorProps {
  onGenerate?: (schemas: GeneratedFormSchemas, entityName: string) => void;
  onClose?: () => void;
  defaultEntity?: string; // Format: "schema.entity_type" e.g., "external.contacts"
}

const FormGenerator: React.FC<FormGeneratorProps> = ({ onGenerate, onClose, defaultEntity }) => {
  // State
  const [entities, setEntities] = useState<Entity[]>([]);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedSchemas, setGeneratedSchemas] = useState<GeneratedFormSchemas | null>(null);

  // Generator options
  const [options, setOptions] = useState<GeneratorOptions>({
    mode: 'recommended',
    includeForeignKeyFields: true,
    includeSystemFields: false,
    includeReadOnlyFields: false,
    expandJsonbFields: true,
    generateRequired: true,
    groupByStructure: false,
    llmQuery: '',
    useBackend: true,
  });

  // Fetch entities on mount
  const fetchEntities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .schema('core')
        .from('entities')
        .select('id, entity_type, entity_schema, description, metadata, v_metadata, is_active')
        .eq('is_active', true)
        .order('entity_schema')
        .order('entity_type');

      if (fetchError) throw fetchError;
      setEntities(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch entities';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntities();
  }, [fetchEntities]);

  // Auto-select default entity when entities are loaded and defaultEntity prop is provided
  useEffect(() => {
    if (defaultEntity && entities.length > 0 && !selectedEntityId) {
      const [schema, entityType] = defaultEntity.split('.');
      const matchingEntity = entities.find(
        e => e.entity_schema === schema && e.entity_type === entityType
      );
      if (matchingEntity) {
        setSelectedEntityId(matchingEntity.id);
      }
    }
  }, [defaultEntity, entities, selectedEntityId]);

  // Get selected entity
  const selectedEntity = entities.find(e => e.id === selectedEntityId);
  const entityName = selectedEntity
    ? `${selectedEntity.entity_schema}.${selectedEntity.entity_type}`
    : '';

  // Handle generate
  const handleGenerate = useCallback(async () => {
    if (!selectedEntity) {
      message.warning('Please select an entity first');
      return;
    }

    // Validate LLM mode requirements
    if (options.mode === 'llm' && (!options.llmQuery || options.llmQuery.trim().length === 0)) {
      message.warning('Please describe what kind of form you want to create');
      return;
    }

    setGenerating(true);
    try {
      // Prefer v_metadata if available, fallback to metadata
      const metadata: EntityField[] = selectedEntity.v_metadata || selectedEntity.metadata || [];

      if (!metadata || metadata.length === 0) {
        message.warning('Selected entity has no metadata fields');
        return;
      }

      let schemas: GeneratedFormSchemas;

      if (options.useBackend) {
        // Prepare RPC options
        const rpcOptions = {
          mode: options.mode,
          includeForeignKeyFields: options.includeForeignKeyFields,
          includeSystemFields: options.includeSystemFields,
          includeReadOnlyFields: options.includeReadOnlyFields,
          expandJsonbFields: options.expandJsonbFields,
          generateRequired: options.generateRequired,
        };

        const { data, error: rpcError } = await supabase.rpc('api_new_generate_form_schema', {
          p_entity_name: entityName,
          p_options: rpcOptions,
        });

        if (rpcError) throw rpcError;
        schemas = data as GeneratedFormSchemas;
      } else {
        let selectedFieldKeys: string[] | undefined;

        // Call LLM if in LLM mode
        if (options.mode === 'llm') {
          try {
            message.loading({ content: '🤖 AI is selecting fields...', key: 'llm', duration: 0 });
            selectedFieldKeys = await selectFieldsWithLLM(metadata, options.llmQuery!);
            message.success({ content: `✨ AI selected ${selectedFieldKeys.length} fields`, key: 'llm', duration: 2 });
          } catch (llmError) {
            message.destroy('llm');
            const llmErrorMsg = llmError instanceof Error ? llmError.message : 'LLM selection failed';
            message.error(llmErrorMsg);
            console.error('❌ LLM Error:', llmError);
            return;
          }
        }

        schemas = await generateFormFromMetadata(metadata, entityName, options, selectedFieldKeys);
      }

      setGeneratedSchemas(schemas);
      message.success(`Generated form schema with ${Object.keys(schemas.dataSchema.properties).length} fields`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate form';
      message.error(errorMessage);
      console.error('❌ Form generation error:', err);
    } finally {
      setGenerating(false);
    }
  }, [selectedEntity, entityName, options]);

  // Handle use in FormBuilder
  const handleUseSchemas = useCallback(() => {
    if (generatedSchemas && onGenerate) {
      onGenerate(generatedSchemas, entityName);
      message.success('Schemas loaded into FormBuilder');
    }
  }, [generatedSchemas, entityName, onGenerate]);

  // Group entities by schema for better UX
  const groupedEntityOptions = entities.reduce((acc, entity) => {
    const schema = entity.entity_schema;
    if (!acc[schema]) {
      acc[schema] = [];
    }
    acc[schema].push({
      value: entity.id,
      label: entity.entity_type,
    });
    return acc;
  }, {} as Record<string, { value: string; label: string }[]>);

  const selectOptions = Object.entries(groupedEntityOptions).map(([schema, items]) => ({
    label: schema,
    options: items,
  }));

  return (
    <Card
      title={
        <Space>
          <ThunderboltOutlined />
          <span>Generate Form from Entity Metadata</span>
        </Space>
      }
      style={{ marginBottom: 16 }}
    >
      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          closable
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Entity Selector */}
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <div>
          <Text strong>Select Entity:</Text>
          <Select
            style={{ width: '100%', marginTop: 8 }}
            placeholder="Search and select an entity..."
            showSearch
            loading={loading}
            value={selectedEntityId}
            onChange={setSelectedEntityId}
            options={selectOptions}
            filterOption={(input, option) =>
              (option?.label?.toString() || '').toLowerCase().includes(input.toLowerCase())
            }
            optionFilterProp="label"
          />
        </div>

        {/* Selected entity info */}
        {selectedEntity && (
          <Alert
            message={`Selected: ${entityName}`}
            description={
              <Space direction="vertical" size={0}>
                <Text type="secondary">
                  {(selectedEntity.v_metadata || selectedEntity.metadata)?.length || 0} fields in metadata
                </Text>
                {selectedEntity.description && (
                  <Text type="secondary">{selectedEntity.description}</Text>
                )}
              </Space>
            }
            type="info"
            showIcon
          />
        )}

        {/* Mode Selector */}
        <div>
          <Text strong>Generation Mode:</Text>
          <Radio.Group
            value={options.mode}
            onChange={e => setOptions({ ...options, mode: e.target.value })}
            style={{ width: '100%', marginTop: 8 }}
            buttonStyle="solid"
          >
            <Radio.Button value="minimal">⚡ Minimal</Radio.Button>
            <Radio.Button value="recommended">👍 Recommended</Radio.Button>
            <Radio.Button value="all">📋 All Fields</Radio.Button>
            <Radio.Button value="llm">🤖 AI-Powered</Radio.Button>
          </Radio.Group>

          <div style={{ marginTop: 12, padding: 12, background: 'rgba(0,0,0,0.02)', borderRadius: 8 }}>
            <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
              <Space>
                <Text strong>Smart Backend Engine</Text>
                <Text type="secondary" style={{ fontSize: '11px' }}>(Tiered Schema Recovery)</Text>
              </Space>
              <Switch
                checked={options.useBackend}
                onChange={checked => setOptions({ ...options, useBackend: checked })}
                checkedChildren="ON"
                unCheckedChildren="OFF"
              />
            </Space>
          </div>

          {/* Mode descriptions */}
          <Alert
            message={
              options.mode === 'minimal' ? 'Includes only mandatory fields' :
                options.mode === 'recommended' ? 'Includes mandatory + common displayable fields' :
                  options.mode === 'all' ? 'Includes all available fields' :
                    'AI selects fields based on your description'
            }
            description={options.useBackend ? "Using canonical backend generator" : "Using frontend metadata mapper"}
            type="info"
            style={{ marginTop: 8 }}
            showIcon={options.useBackend}
          />
        </div>

        {/* LLM Query Input */}
        {options.mode === 'llm' && (
          <div>
            <Text strong>Describe your form:</Text>
            <Input.TextArea
              placeholder="Example: I want to create a simple contact form with name, email, and phone"
              value={options.llmQuery}
              onChange={e => setOptions({ ...options, llmQuery: e.target.value })}
              rows={3}
              style={{ marginTop: 8 }}
            />
          </div>
        )}

        {/* Generator Options */}
        <Collapse ghost>
          <Panel header="Advanced Options" key="options">
            <Space direction="vertical">
              <Checkbox
                checked={options.includeForeignKeyFields}
                onChange={e => setOptions({ ...options, includeForeignKeyFields: e.target.checked })}
              >
                Include foreign key fields (*_id)
              </Checkbox>
              <Checkbox
                checked={options.groupByStructure}
                onChange={e => setOptions({ ...options, groupByStructure: e.target.checked })}
              >
                Auto-group nested fields (details.*, raci.*)
              </Checkbox>
              <Divider style={{ margin: '8px 0' }} />
              <Checkbox
                checked={options.includeSystemFields}
                onChange={e => setOptions({ ...options, includeSystemFields: e.target.checked })}
              >
                Include system fields (id, created_at, organization_id, etc.)
              </Checkbox>
              <Checkbox
                checked={options.includeReadOnlyFields}
                onChange={e => setOptions({ ...options, includeReadOnlyFields: e.target.checked })}
              >
                Include read-only fields
              </Checkbox>
              <Checkbox
                checked={options.expandJsonbFields}
                onChange={e => setOptions({ ...options, expandJsonbFields: e.target.checked })}
              >
                Include JSONB virtual fields (e.g., details.zip)
              </Checkbox>
              <Checkbox
                checked={options.generateRequired}
                onChange={e => setOptions({ ...options, generateRequired: e.target.checked })}
              >
                Mark mandatory fields as required
              </Checkbox>
            </Space>
          </Panel>
        </Collapse>

        {/* Generate Button */}
        <Button
          type="primary"
          icon={<ThunderboltOutlined />}
          onClick={handleGenerate}
          loading={generating}
          disabled={!selectedEntityId}
          block
        >
          Generate Form Schema
        </Button>

        <Divider />

        {/* Generated Schemas Preview */}
        {generatedSchemas && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Title level={5}>Generated Schemas</Title>

            <div>
              <Text strong>Data Schema ({Object.keys(generatedSchemas.dataSchema.properties).length} fields):</Text>
              <AceEditor
                mode="json"
                theme="monokai"
                value={JSON.stringify(generatedSchemas.dataSchema, null, 2)}
                readOnly
                width="100%"
                height="200px"
                fontSize={12}
                showPrintMargin={false}
                showGutter={true}
                highlightActiveLine={false}
                setOptions={{
                  showLineNumbers: true,
                  tabSize: 2,
                }}
              />
            </div>

            <div>
              <Text strong>UI Schema:</Text>
              <AceEditor
                mode="json"
                theme="monokai"
                value={JSON.stringify(generatedSchemas.uiSchema, null, 2)}
                readOnly
                width="100%"
                height="150px"
                fontSize={12}
                showPrintMargin={false}
                showGutter={true}
                highlightActiveLine={false}
                setOptions={{
                  showLineNumbers: true,
                  tabSize: 2,
                }}
              />
            </div>

            {/* Action buttons */}
            <Space>
              {onGenerate && (
                <Button type="primary" onClick={handleUseSchemas}>
                  Use in FormBuilder
                </Button>
              )}
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  setGeneratedSchemas(null);
                  setSelectedEntityId(null);
                }}
              >
                Reset
              </Button>
              {onClose && (
                <Button onClick={onClose}>Close</Button>
              )}
            </Space>
          </Space>
        )}
      </Space>
    </Card>
  );
};

export default FormGenerator;
