import { useState, useEffect } from 'react';
import RJSFCoreForm from '@/core/components/RJSFCoreForm';
import { Card, Select, Radio, Button, Space, message, Typography } from 'antd';
import { supabase } from '@/core/lib/supabase';
import { ThunderboltOutlined } from '@ant-design/icons';

const { Text } = Typography;

const TestRJSFCoreForm = () => {
    const [entities, setEntities] = useState<any[]>([]);
    const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
    const [mode, setMode] = useState<'minimal' | 'recommended' | 'all'>('recommended');
    const [generatedSchema, setGeneratedSchema] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);

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
                
                // Sort by label
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
            const { data, error } = await supabase.schema('core').rpc('api_new_generate_form_schema', {
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
                setGeneratedSchema({
                    data_schema: (data as any).data_schema || (data as any).dataSchema,
                    ui_schema: (data as any).ui_schema || (data as any).uiSchema,
                    db_schema: (data as any).db_schema || (data as any).dbSchema
                });
                message.success('Schema generated successfully');
            }
        } catch (err: any) {
            message.error('Generation failed: ' + err.message);
        } finally {
            setGenerating(false);
        }
    };

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

                    {generatedSchema ? (
                        <Card size="small" type="inner" title={`Form Preview: ${selectedEntity}`}>
                            <RJSFCoreForm 
                                schema={generatedSchema} 
                                onSuccess={(data) => console.log('Saved successfully:', data)}
                                key={selectedEntity + mode} // Force re-mount on change
                            />
                        </Card>
                    ) : (
                        <Text type="secondary">Select an entity and click "Generate Form" to test.</Text>
                    )}
                </Space>
            </Card>
        </div>
    );
};

export default TestRJSFCoreForm;
