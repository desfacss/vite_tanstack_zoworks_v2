import { useState, useEffect } from 'react';
import RJSFCoreForm from '@/core/components/RJSFCoreForm';
import { Card, Select, Radio, Button, Space, message, Typography, Tabs, Divider, Row, Col, Switch } from 'antd';
import { supabase } from '@/core/lib/supabase';
import { ThunderboltOutlined, SaveOutlined } from '@ant-design/icons';
import { Trash2 } from 'lucide-react';
import AceEditor from 'react-ace';
import { useAuthStore } from '@/core/lib/store';

// Import ace modes and themes
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/theme-monokai';

const { Text } = Typography;

const TestRJSFCoreForm = () => {
    const { organization } = useAuthStore();
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

            // Determine form name
            const [schemaName, entityName] = selectedEntity.split('.');
            let suffix = 'form';
            if (mode === 'minimal') suffix = 'min';
            else if (mode === 'all') suffix = 'custom';

            const formName = `${schemaName}_${entityName}_${suffix}`;

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

    const handleDeleteField = (fieldName: string) => {
        try {
            const currentData = JSON.parse(dataSchemaStr);
            const currentUi = JSON.parse(uiSchemaStr);

            if (currentData.properties && currentData.properties[fieldName]) {
                delete currentData.properties[fieldName];

                // Also remove from required array if present
                if (Array.isArray(currentData.required)) {
                    currentData.required = currentData.required.filter((f: string) => f !== fieldName);
                }

                // Remove from UI schema
                if (currentUi[fieldName]) {
                    delete currentUi[fieldName];
                }

                // Update layout if it exists
                if (currentUi['ui:layout']) {
                    currentUi['ui:layout'] = currentUi['ui:layout'].map((page: any) =>
                        page.map((row: any) =>
                            row.filter((f: string) => f !== fieldName)
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

                message.info(`Field "${fieldName}" removed`);
            }
        } catch (e) {
            message.error('Error modifying schema: ' + (e as Error).message);
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

    const fieldList = generatedSchema?.data_schema?.properties
        ? Object.keys(generatedSchema.data_schema.properties)
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
                                        {fieldList.map(field => (
                                            <div key={field} style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: '8px',
                                                background: '#f5f5f5',
                                                borderRadius: '4px'
                                            }}>
                                                <Text ellipsis style={{ maxWidth: '80%' }}>{field}</Text>
                                                <Button
                                                    type="text"
                                                    danger
                                                    size="small"
                                                    icon={<Trash2 size={16} />}
                                                    onClick={() => handleDeleteField(field)}
                                                />
                                            </div>
                                        ))}
                                        {fieldList.length === 0 && <Text type="secondary">No fields in schema</Text>}
                                    </div>
                                </Card>
                            </Col>
                            <Col span={18}>
                                <Space direction="vertical" style={{ width: '100%' }} size="large">
                                    <Card size="small" type="inner" title="Schema Editors" extra={
                                        <Button
                                            type="primary"
                                            icon={<SaveOutlined />}
                                            onClick={handleSaveToForms}
                                            loading={saving}
                                        >
                                            Save to Forms Table
                                        </Button>
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
                                                            theme="monokai"
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
                                                            theme="monokai"
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
                                                            theme="monokai"
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
        </div>
    );
};

export default TestRJSFCoreForm;
