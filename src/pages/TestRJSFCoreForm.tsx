import { useState, useEffect } from 'react';
import RJSFCoreForm from '@/core/components/RJSFCoreForm';
import { Card, Select, Radio, Button, Space, message, Typography, Tabs, Divider, Row, Col, Switch, Input } from 'antd';
import { supabase } from '@/core/lib/supabase';
import { ThunderboltOutlined, SaveOutlined } from '@ant-design/icons';
import { Trash2, Settings2 } from 'lucide-react';
import AceEditor from 'react-ace';
import { useAuthStore, useThemeStore } from '@/core/lib/store';
import PageManager from '@/core/components/PageManager';

// Import ace modes and themes
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/theme-github';

import { get, set, unset } from 'lodash';
import { theme as antdTheme } from 'antd';

const { Text } = Typography;

// Helper to recursively extract all field paths from data_schema
const getFlattenedFields = (properties: any, prefix = ''): { path: string, label: string, depth: number }[] => {
    if (!properties) return [];
    
    return Object.keys(properties).flatMap(key => {
        const fullPath = prefix ? `${prefix}.${key}` : key;
        const property = properties[key];
        const field = { path: fullPath, label: key, depth: prefix.split('.').filter(Boolean).length };
        
        if (property.type === 'object' && property.properties) {
            return [field, ...getFlattenedFields(property.properties, fullPath)];
        }
        
        return [field];
    });
};

const TestRJSFCoreForm = () => {
    const { organization } = useAuthStore();
    const { isDarkMode } = useThemeStore();
    const { token } = antdTheme.useToken();
    
    const [entities, setEntities] = useState<any[]>([]);
    const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
    const [mode, setMode] = useState<'minimal' | 'recommended' | 'all'>('recommended');
    const [generatedSchema, setGeneratedSchema] = useState<any>(null);

    // Editable schemas as JSON strings
    const [dataSchemaStr, setDataSchemaStr] = useState<string>('');
    const [uiSchemaStr, setUiSchemaStr] = useState<string>('');
    const [dbSchemaStr, setDbSchemaStr] = useState<string>('');

    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isGlobal, setIsGlobal] = useState(true); // Default to true as requested
    const [formName, setFormName] = useState<string>('');
    const [isPageManagerVisible, setIsPageManagerVisible] = useState(false);
    const [uiLayout, setUiLayout] = useState<string[][][]>([]);

    const WIDGET_OPTIONS = [
        { label: 'Default', value: 'default' },
        { label: 'Input', value: 'input' },
        { label: 'Textarea', value: 'textarea' },
        { label: 'Password', value: 'password' },
        { label: 'Select Custom', value: 'SelectCustomWidget' },
        { label: 'Date', value: 'date' },
        { label: 'Date-Time', value: 'date-time' },
        { label: 'Date Range', value: 'DateRangePickerWidget' },
        { label: 'Date-Time Range', value: 'DateTimeRangePickerWidget' },
        { label: 'Switch', value: 'checkbox' },
        { label: 'Radio', value: 'radio' },
        { label: 'File', value: 'file' },
        { label: 'Web Widget', value: 'WebWidget' },
        { label: 'Editable Table', value: 'EditableTableWidget' },
        { label: 'Hidden', value: 'hidden' }
    ];

    useEffect(() => {
        const fetchEntities = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .schema('core')
                    .from('view_configs')
                    .select(`
                        entity_type,
                        entities:entity_id (
                            entity_schema
                        )
                    `)
                    .eq('is_active', true);

                if (error) throw error;

                const formatted = data?.map((item: any) => {
                    const schema = item.entities?.entity_schema || 'public';
                    const type = item.entity_type;
                    const fullName = type.startsWith(`${schema}.`) ? type : `${schema}.${type}`;
                    return {
                        label: fullName,
                        value: fullName,
                    };
                }) || [];

                formatted.sort((a, b) => a.label.localeCompare(b.label));
                setEntities(formatted);
            } catch (err: any) {
                message.error('Failed to fetch entities: ' + err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchEntities();
    }, []);

    const handleGenerate = async () => {
        if (!selectedEntity) return;
        setGenerating(true);
        try {
            const { data, error } = await supabase.schema('core').rpc('api_new_generate_form_schema_v3', {
                p_entity_name: selectedEntity,
                p_options: {
                    mode,
                    includeForeignKeyFields: true,
                    includeSystemFields: false,
                    includeReadOnlyFields: false,
                    expandJsonbFields: true,
                    generateRequired: true
                }
            });

            if (error) throw error;

            if (data) {
                const schemas = {
                    data_schema: (data as any).data_schema || (data as any).dataSchema,
                    ui_schema: (data as any).ui_schema || (data as any).uiSchema,
                    db_schema: (data as any).db_schema || (data as any).dbSchema
                };
                setGeneratedSchema(schemas);
                setDataSchemaStr(JSON.stringify(schemas.data_schema, null, 2));
                setUiSchemaStr(JSON.stringify(schemas.ui_schema, null, 2));
                setDbSchemaStr(JSON.stringify(schemas.db_schema, null, 2));

                // Set default form name
                const [schemaName, entityName] = selectedEntity.split('.');
                let suffix = 'form';
                if (mode === 'minimal') suffix = 'min';
                else if (mode === 'all') suffix = 'custom';
                setFormName(`${schemaName}_${entityName}_${suffix}`);

                // Set current uiLayout
                setUiLayout(schemas.ui_schema?.['ui:layout'] || [[]]);

                message.success('Schema generated successfully');
            }
        } catch (err: any) {
            message.error('Generation failed: ' + err.message);
        } finally {
            setGenerating(false);
        }
    };

    const handleSaveToForms = async () => {
        if (!selectedEntity || !organization?.id) return;

        setSaving(true);
        try {
            // Parse current edited strings
            let finalDataSchema, finalUiSchema, finalDbSchema;
            try {
                finalDataSchema = JSON.parse(dataSchemaStr);
                finalUiSchema = JSON.parse(uiSchemaStr);
                finalDbSchema = JSON.parse(dbSchemaStr);
            } catch (pErr) {
                message.error('Invalid JSON in schema editors');
                setSaving(false);
                return;
            }

            if (!formName) {
                message.warning('Please enter a form name');
                setSaving(false);
                return;
            }

            // Check for existing form to get its ID
            const query = supabase
                .schema('core')
                .from('forms')
                .select('id')
                .eq('name', formName);

            if (isGlobal) {
                query.is('organization_id', null);
            } else {
                query.eq('organization_id', organization.id);
            }

            const { data: existingForm } = await query.maybeSingle();

            // Upsert to core.forms
            const payload: any = {
                name: formName,
                organization_id: isGlobal ? null : organization.id,
                data_schema: finalDataSchema,
                ui_schema: finalUiSchema,
                data_config: finalDbSchema,
                is_active: true,
                updated_at: new Date().toISOString()
            };

            if (existingForm) {
                payload.id = existingForm.id;
            }

            const { error } = await supabase.schema('core').from('forms').upsert(payload);

            if (error) throw error;
            message.success(`Form "${formName}" saved/updated successfully in core.forms`);
        } catch (err: any) {
            message.error('Save failed: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleSaveLayout = (newLayout: string[][][]) => {
        try {
            const currentUi = JSON.parse(uiSchemaStr || '{}');
            currentUi['ui:layout'] = newLayout;
            
            setUiSchemaStr(JSON.stringify(currentUi, null, 2));
            setUiLayout(newLayout);
            setIsPageManagerVisible(false);
            message.success('Layout updated successfully');
        } catch (e) {
            message.error('Error updating layout: ' + (e as Error).message);
        }
    };

    const handleDeleteField = (fieldPath: string) => {
        try {
            const currentData = JSON.parse(dataSchemaStr);
            const currentUi = JSON.parse(uiSchemaStr);

            // Recursively remove from data_schema properties
            // Note: fieldPath is something like "config.theme"
            const pathParts = fieldPath.split('.');
            const propPath = ['properties', ...pathParts.flatMap(p => [p, 'properties'])].slice(0, -1);
            
            // Delete from properties
            unset(currentData, propPath);

            // Also remove from required array at the correct level
            const parentPath = pathParts.slice(0, -1);
            const parentDataPath = parentPath.length > 0 
                ? ['properties', ...parentPath.flatMap(p => [p, 'properties'])].slice(0, -1)
                : [];
            
            const parentObj = parentDataPath.length > 0 ? get(currentData, parentDataPath) : currentData;
            if (parentObj && Array.isArray(parentObj.required)) {
                parentObj.required = parentObj.required.filter((f: string) => f !== pathParts[pathParts.length - 1]);
                if (parentObj.required.length === 0) delete parentObj.required;
            }

            // Remove from UI schema
            unset(currentUi, fieldPath);

            // Update layout if it exists (only supports top-level for now)
            if (currentUi['ui:layout'] && !fieldPath.includes('.')) {
                currentUi['ui:layout'] = currentUi['ui:layout'].map((page: any) =>
                    page.map((row: any) =>
                        row.filter((f: string) => f !== fieldPath)
                    ).filter((row: any) => row.length > 0)
                ).filter((page: any) => page.length > 0);
            }

            const newDataStr = JSON.stringify(currentData, null, 2);
            const newUiStr = JSON.stringify(currentUi, null, 2);

            setDataSchemaStr(newDataStr);
            setUiSchemaStr(newUiStr);

            setGeneratedSchema((prev: any) => ({
                ...prev,
                data_schema: currentData,
                ui_schema: currentUi
            }));

            message.info(`Field "${fieldPath}" removed`);
        } catch (e) {
            message.error('Error modifying schema: ' + (e as Error).message);
        }
    };

    const handleWidgetChange = (fieldPath: string, widget: string) => {
        try {
            const currentUi = JSON.parse(uiSchemaStr);
            
            if (widget === 'default') {
                unset(currentUi, [fieldPath, 'ui:widget']);
            } else {
                set(currentUi, [fieldPath, 'ui:widget'], widget);
                
                // Add default options for some widgets if they don't exist
                const currentOptions = get(currentUi, [fieldPath, 'ui:options']);
                if (widget === 'SelectCustomWidget' && !currentOptions) {
                    set(currentUi, [fieldPath, 'ui:options'], { 
                        mode: 'single', 
                        colSpan: 12,
                        reference_api: '/api/v4/logical/fetch/...'
                    });
                }
            }

            setUiSchemaStr(JSON.stringify(currentUi, null, 2));
            message.info(`Widget for "${fieldPath}" updated to ${widget}`);
        } catch (e) {
            message.error('Error updating widget: ' + (e as Error).message);
        }
    };

    // Use useEffect to sync schema strings to the preview object safely
    useEffect(() => {
        try {
            const data_schema = JSON.parse(dataSchemaStr);
            const ui_schema = JSON.parse(uiSchemaStr);
            const db_schema = JSON.parse(dbSchemaStr);

            setGeneratedSchema((prev: any) => ({
                ...prev,
                data_schema,
                ui_schema,
                db_schema
            }));
        } catch (e) {
            // Silence parse errors during typing
        }
    }, [dataSchemaStr, uiSchemaStr, dbSchemaStr]);

    const flattenedFields = generatedSchema?.data_schema?.properties
        ? getFlattenedFields(generatedSchema.data_schema.properties)
        : [];

    return (
        <div style={{ padding: 24 }}>
            <Card title="RJSFCoreForm Test Bench">
                <Space direction="vertical" style={{ width: '100%' }} size="large">
                    <Card size="small" type="inner" title="Generator Settings">
                        <Space direction="horizontal" wrap size="middle">
                            <div>
                                <Text strong>Entity: </Text>
                                <Select
                                    style={{ width: 350 }}
                                    placeholder="Select an entity"
                                    options={entities}
                                    loading={loading}
                                    value={selectedEntity}
                                    onChange={setSelectedEntity}
                                    showSearch
                                />
                            </div>
                            <div>
                                <Text strong>Mode: </Text>
                                <Radio.Group value={mode} onChange={(e) => setMode(e.target.value)}>
                                    <Radio.Button value="minimal">Minimal</Radio.Button>
                                    <Radio.Button value="recommended">Recommended</Radio.Button>
                                    <Radio.Button value="all">All</Radio.Button>
                                </Radio.Group>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Switch
                                    checked={isGlobal}
                                    onChange={setIsGlobal}
                                    size="small"
                                />
                                <Text strong>Global Form (No Org ID)</Text>
                            </div>
                            <Button
                                type="primary"
                                icon={<ThunderboltOutlined />}
                                onClick={handleGenerate}
                                loading={generating}
                                disabled={!selectedEntity}
                            >
                                Generate Form
                            </Button>
                        </Space>
                    </Card>

                    {generatedSchema && (
                        <Row gutter={16}>
                            <Col span={6}>
                                <Card size="small" title="Form Fields" style={{ height: '100%', overflowY: 'auto', maxHeight: '1000px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {flattenedFields.map(field => {
                                            const currentUi = JSON.parse(uiSchemaStr || '{}');
                                            const currentWidget = get(currentUi, [field.path, 'ui:widget'], 'default');
                                            
                                            return (
                                                <div key={field.path} style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: 4,
                                                    padding: '8px',
                                                    background: field.depth > 0 ? token.colorFillAlter : token.colorFillSecondary,
                                                    border: `1px solid ${token.colorBorderSecondary}`,
                                                    borderRadius: token.borderRadiusLG,
                                                    marginLeft: field.depth * 16,
                                                    borderLeft: field.depth > 0 ? `2px solid ${token.colorBorder}` : 'none'
                                                }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <Text strong={field.depth === 0} type={field.depth > 0 ? "secondary" : undefined} ellipsis style={{ maxWidth: '80%' }}>
                                                            {field.label}
                                                        </Text>
                                                        <Button
                                                            type="text"
                                                            danger
                                                            size="small"
                                                            icon={<Trash2 size={14} />}
                                                            onClick={() => handleDeleteField(field.path)}
                                                        />
                                                    </div>
                                                    <Select
                                                        size="small"
                                                        value={currentWidget}
                                                        options={WIDGET_OPTIONS}
                                                        onChange={(val) => handleWidgetChange(field.path, val)}
                                                        style={{ width: '100%' }}
                                                        suffixIcon={<Settings2 size={12} />}
                                                    />
                                                </div>
                                            );
                                        })}
                                        {flattenedFields.length === 0 && <Text type="secondary">No fields in schema</Text>}
                                    </div>
                                </Card>
                            </Col>
                            <Col span={18}>
                                <Space direction="vertical" style={{ width: '100%' }} size="large">
                                    <Card size="small" type="inner" title="Schema Editors" extra={
                                        <Space>
                                            <Input 
                                                placeholder="Form Name" 
                                                value={formName} 
                                                onChange={(e) => setFormName(e.target.value)}
                                                style={{ width: 250 }}
                                            />
                                            <Button
                                                type="default"
                                                icon={<Settings2 size={16} />}
                                                onClick={() => setIsPageManagerVisible(true)}
                                                disabled={!generatedSchema}
                                            >
                                                Manage Pages
                                            </Button>
                                            <Button
                                                type="primary"
                                                icon={<SaveOutlined />}
                                                onClick={handleSaveToForms}
                                                loading={saving}
                                            >
                                                Save
                                            </Button>
                                        </Space>
                                    }>
                                        <Tabs
                                            defaultActiveKey="data"
                                            items={[
                                                {
                                                    label: 'Data Schema',
                                                    key: 'data',
                                                    children: (
                                                        <AceEditor
                                                            mode="json"
                                                            theme={isDarkMode ? "monokai" : "github"}
                                                            value={dataSchemaStr}
                                                            onChange={(val) => { setDataSchemaStr(val); }}
                                                            width="100%"
                                                            height="300px"
                                                            fontSize={12}
                                                            setOptions={{ useWorker: false }}
                                                        />
                                                    )
                                                },
                                                {
                                                    label: 'UI Schema',
                                                    key: 'ui',
                                                    children: (
                                                        <AceEditor
                                                            mode="json"
                                                            theme={isDarkMode ? "monokai" : "github"}
                                                            value={uiSchemaStr}
                                                            onChange={(val) => { setUiSchemaStr(val); }}
                                                            width="100%"
                                                            height="300px"
                                                            fontSize={12}
                                                            setOptions={{ useWorker: false }}
                                                        />
                                                    )
                                                },
                                                {
                                                    label: 'DB Schema',
                                                    key: 'db',
                                                    children: (
                                                        <AceEditor
                                                            mode="json"
                                                            theme={isDarkMode ? "monokai" : "github"}
                                                            value={dbSchemaStr}
                                                            onChange={(val) => { setDbSchemaStr(val); }}
                                                            width="100%"
                                                            height="100px"
                                                            fontSize={12}
                                                            setOptions={{ useWorker: false }}
                                                        />
                                                    )
                                                }
                                            ]}
                                        />
                                    </Card>

                                    <Divider>Live Preview</Divider>

                                    <Card size="small" type="inner" title={`Form Preview: ${selectedEntity}`}>
                                        <RJSFCoreForm
                                            schema={generatedSchema}
                                            onSuccess={(data) => console.log('Saved successfully:', data)}
                                            key={selectedEntity + mode + dataSchemaStr.length + uiSchemaStr.length} // Force re-mount on changes
                                        />
                                    </Card>
                                </Space>
                            </Col>
                        </Row>
                    )}

                    {!generatedSchema && (
                        <Card>
                            <Text type="secondary">Select an entity and click "Generate Form" to begin.</Text>
                        </Card>
                    )}
                </Space>
            </Card>

            <PageManager
                visible={isPageManagerVisible}
                fields={flattenedFields.map(f => ({ fieldName: f.path, fieldTitle: f.label }))}
                initialLayout={uiLayout}
                onSave={handleSaveLayout}
                onCancel={() => setIsPageManagerVisible(false)}
            />
        </div>
    );
};

export default TestRJSFCoreForm;
