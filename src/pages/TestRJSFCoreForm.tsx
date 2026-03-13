import { useState, useEffect } from 'react';
import RJSFCoreForm from '@/core/components/RJSFCoreForm';
import { Card, Select, Radio, Button, Space, message, Typography, Tabs, Divider, Row, Col, Switch, Input } from 'antd';
import { supabase } from '@/core/lib/supabase';
import { ThunderboltOutlined, SaveOutlined, PlusOutlined } from '@ant-design/icons';
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

// Helper to recursively fix invalid widgets (e.g., 'input' -> 'text')
const cleanupUiSchema = (uiSchema: any): any => {
    if (!uiSchema || typeof uiSchema !== 'object') return uiSchema;
    
    const clean = Array.isArray(uiSchema) ? [...uiSchema] : { ...uiSchema };
    
    Object.keys(clean).forEach(key => {
        if (key === 'ui:widget' && clean[key] === 'input') {
            clean[key] = 'text';
        } else if (typeof clean[key] === 'object') {
            clean[key] = cleanupUiSchema(clean[key]);
        }
    });
    
    return clean;
};

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
    const [masterFields, setMasterFields] = useState<{ 
        key: string, 
        display_name: string, 
        type?: string,
        foreign_key?: {
            source_table: string,
            display_column: string
        }
    }[]>([]);

    // States for "Add Field" UI
    const [newFieldName, setNewFieldName] = useState<string>('');
    const [newFieldType, setNewFieldType] = useState<string>('text');
    const [isAddingField, setIsAddingField] = useState(false);
    
    // Lookup states
    const [lookupTable, setLookupTable] = useState<string>('');
    const [lookupColumn, setLookupColumn] = useState<string>('');
    const [lookupSchema, setLookupSchema] = useState<string>('');

    // Extra field attribute states
    const [newFieldRequired, setNewFieldRequired] = useState(false);
    const [newFieldReadonly, setNewFieldReadonly] = useState(false);
    const [newFieldPlaceholder, setNewFieldPlaceholder] = useState('');
    const [newFieldDefaultValue, setNewFieldDefaultValue] = useState('');
    const [newFieldTitle, setNewFieldTitle] = useState('');
    const [newFieldHidden, setNewFieldHidden] = useState(false);
    const [newFieldManualOptions, setNewFieldManualOptions] = useState('');
    const [lookupNoId, setLookupNoId] = useState(false);
    
    // Cascading & specialized states
    const [newFieldAcceptedFileTypes, setNewFieldAcceptedFileTypes] = useState('.pdf,.doc,.docx,.jpg,.png');
    const [newFieldDependsOn, setNewFieldDependsOn] = useState('');
    const [newFieldDependsOnField, setNewFieldDependsOnField] = useState('');
    const [newFieldDependsOnColumn, setNewFieldDependsOnColumn] = useState('');

    const WIDGET_OPTIONS = [
        { label: 'Default', value: 'default' },
        { label: 'Input', value: 'text' },
        { label: 'Textarea', value: 'textarea' },
        { label: 'Password', value: 'password' },
        { label: 'Select Custom', value: 'SelectCustomWidget' },
        { label: 'Select Single', value: 'SelectSingle' },
        { label: 'Select Multiple', value: 'SelectMultiple' },
        { label: 'Select Multi-Tags', value: 'SelectMultiTags' },
        { label: 'Selectable Tags', value: 'SelectableTags' },
        { label: 'Date', value: 'date' },
        { label: 'Date-Time', value: 'date-time' },
        { label: 'Date Range', value: 'DateRangePickerWidget' },
        { label: 'Date-Time Range', value: 'DateTimeRangePickerWidget' },
        { label: 'Number', value: 'updown' },
        { label: 'Range', value: 'range' },
        { label: 'Phone', value: 'phone' },
        { label: 'Email', value: 'email' },
        { label: 'URL', value: 'url' },
        { label: 'Tags', value: 'TagsWidget' },
        { label: 'Switch', value: 'checkbox' },
        { label: 'Radio', value: 'radio' },
        { label: 'File', value: 'file' },
        { label: 'Web Widget', value: 'WebWidget' },
        { label: 'Editable Table', value: 'EditableTableWidget' },
        { label: 'Hidden', value: 'hidden' },
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

    // Fetch entity metadata when selectedEntity changes
    useEffect(() => {
        const fetchMetadata = async () => {
            if (!selectedEntity) {
                setMasterFields([]);
                return;
            }

            try {
                const [schema, type] = selectedEntity.split('.');
                const { data, error } = await supabase
                    .schema('core')
                    .from('entities')
                    .select('v_metadata')
                    .eq('entity_schema', schema)
                    .eq('entity_type', type)
                    .maybeSingle();

                if (error) throw error;
                if (data) {
                    const fields = data.v_metadata || [];
                    const formatted = fields.map((f: any) => ({
                        key: f.key,
                        display_name: f.display_name || f.key,
                        type: f.type || 'string',
                        foreign_key: f.foreign_key
                    }));
                    setMasterFields(formatted);
                }
            } catch (err: any) {
                console.error('Failed to fetch field metadata:', err);
            }
        };

        fetchMetadata();
    }, [selectedEntity]);

    // Pre-fill lookup settings when field name or widget changes
    useEffect(() => {
        if (isAddingField && newFieldName) {
            const fieldMeta = masterFields.find(f => f.key === newFieldName);
            if (fieldMeta?.foreign_key) {
                setLookupTable(fieldMeta.foreign_key.source_table || '');
                setLookupColumn(fieldMeta.foreign_key.display_column || '');
                // Try to detect schema if dot separated
                // Switch to select widget if it's a FK
                if (newFieldType === 'text') {
                    // We don't auto-switch anymore per user request, but we keep text
                }
            }
            // Auto-set title if empty
            if (!newFieldTitle) {
                setNewFieldTitle(fieldMeta?.display_name || newFieldName);
            }
        }
    }, [newFieldName, isAddingField, masterFields]);

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
                
                // Cleanup ui_schema of any invalid 'input' widgets recursively
                const cleanUiSchema = cleanupUiSchema(schemas.ui_schema);

                setDataSchemaStr(JSON.stringify(schemas.data_schema, null, 2));
                setUiSchemaStr(JSON.stringify(cleanUiSchema, null, 2));
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

    const handleAddField = () => {
        if (!newFieldName) {
            message.warning('Please select or enter a field name');
            return;
        }

        try {
            const currentData = JSON.parse(dataSchemaStr || '{"type":"object","properties":{},"required":[]}');
            const currentUi = JSON.parse(uiSchemaStr || '{}');

            // Skip if field already exists
            if (get(currentData, ['properties', newFieldName])) {
                message.warning(`Field "${newFieldName}" already exists`);
                return;
            }

            // Get field metadata if available to determine default widget
            const fieldMeta = masterFields.find(f => f.key === newFieldName);
            const type = fieldMeta?.type || 'string';
            
            // Map common metadata types to RJSF types/widgets
            let rjsfType = 'string';
            let defaultWidget = 'text';

            if (type === 'boolean') {
                rjsfType = 'boolean';
                defaultWidget = 'checkbox';
            } else if (type === 'integer' || type === 'number') {
                rjsfType = 'number';
                defaultWidget = 'text';
            } else if (type.includes('timestamp') || type.includes('date')) {
                defaultWidget = 'date';
            }

            // Sync with selected widget type
            const activeWidget = newFieldType !== 'default' ? newFieldType : defaultWidget;
            if (activeWidget === 'checkbox') {
                rjsfType = 'boolean';
            } else if (activeWidget === 'DateRangePickerWidget' || activeWidget === 'DateTimeRangePickerWidget' || activeWidget === 'EditableTableWidget' || activeWidget === 'TagsWidget') {
                rjsfType = 'array';
            } else if (activeWidget === 'updown' || activeWidget === 'range') {
                rjsfType = 'number';
            }

            // Path in data schema properties
            const newProperty: any = {
                type: rjsfType,
                title: newFieldTitle || fieldMeta?.display_name || newFieldName
            };
            
            if (newFieldDefaultValue) {
                newProperty.default = rjsfType === 'number' ? Number(newFieldDefaultValue) : newFieldDefaultValue;
            }

            if (newFieldManualOptions) {
                newProperty.enum = newFieldManualOptions.split(',').map(s => s.trim()).filter(Boolean);
            }

            if (activeWidget === 'email') {
                newProperty.format = 'email';
            } else if (activeWidget === 'url') {
                newProperty.format = 'uri';
            } else if (activeWidget === 'phone') {
                // Phone is usually a string with inputType tel
            }

            if (rjsfType === 'array') {
                newProperty.items = { type: 'string' };
            }

            set(currentData, ['properties', newFieldName], newProperty);

            if (newFieldRequired) {
                const required = currentData.required || [];
                if (!required.includes(newFieldName)) {
                    required.push(newFieldName);
                    currentData.required = required;
                }
            }

            // Sync with UI schema
            set(currentUi, [newFieldName, 'ui:placeholder'], newFieldPlaceholder);
            if (newFieldReadonly) {
                set(currentUi, [newFieldName, 'ui:readonly'], true);
            }
            if (newFieldHidden) {
                set(currentUi, [newFieldName, 'ui:widget'], 'Hidden');
            }
            if (activeWidget === 'file' && newFieldAcceptedFileTypes) {
                set(currentUi, [newFieldName, 'ui:options', 'accept'], newFieldAcceptedFileTypes);
            }

            // Sync with DATA schema enum for cascading selects
            if (activeWidget === 'SelectCustomWidget' || activeWidget === 'SelectSingle' || activeWidget === 'SelectMultiple' || activeWidget === 'SelectMultiTags') {
                // Add lookup config to DATA schema enum as expected by DynamicForm
                const enumConfig: any = {
                    table: lookupSchema ? `${lookupSchema}.${lookupTable}` : lookupTable,
                    column: lookupColumn,
                    no_id: lookupNoId
                };

                if (newFieldDependsOn) {
                    enumConfig.dependsOn = newFieldDependsOn;
                    enumConfig.dependsOnField = newFieldDependsOnField || newFieldDependsOn;
                    enumConfig.dependsOnColumn = newFieldDependsOnColumn;
                }

                newProperty.enum = enumConfig;
            }

            // Add to UI schema
            if (activeWidget === 'SelectCustomWidget' || activeWidget === 'SelectSingle' || activeWidget === 'SelectMultiple' || activeWidget === 'SelectMultiTags') {

                const actualWidget = 'SelectCustomWidget';
                set(currentUi, [newFieldName, 'ui:widget'], actualWidget);
                
                let mode = 'single';
                if (activeWidget === 'SelectMultiple') mode = 'multiple';
                if (activeWidget === 'SelectMultiTags') mode = 'tags';

                set(currentUi, [newFieldName, 'ui:options'], { 
                    mode, 
                    colSpan: 12,
                    reference_api: '/api/v4/logical/fetch/...'
                });
            } else if (activeWidget === 'phone') {
                set(currentUi, [newFieldName, 'ui:options'], { inputType: 'tel' });
            } else {
                set(currentUi, [newFieldName, 'ui:widget'], activeWidget === 'email' || activeWidget === 'url' ? undefined : activeWidget);
            }

            // Final recursive cleanup just in case
            const cleanUi = cleanupUiSchema(currentUi);

            // Update strings
            const newDataStr = JSON.stringify(currentData, null, 2);
            const newUiStr = JSON.stringify(cleanUi, null, 2);

            setDataSchemaStr(newDataStr);
            setUiSchemaStr(newUiStr);

            // Update layout if exists
            if (currentUi['ui:layout']) {
                const updatedLayout = [...currentUi['ui:layout']];
                if (updatedLayout.length > 0 && updatedLayout[0].length > 0) {
                    updatedLayout[0].push([newFieldName]);
                    setUiLayout(updatedLayout);
                    // Update uiSchemaStr with layout
                    currentUi['ui:layout'] = updatedLayout;
                    setUiSchemaStr(JSON.stringify(currentUi, null, 2));
                }
            }

            message.success(`Field "${newFieldName}" added`);
            setNewFieldName('');
            setNewFieldTitle('');
            setNewFieldPlaceholder('');
            setNewFieldDefaultValue('');
            setNewFieldRequired(false);
            setNewFieldReadonly(false);
            setNewFieldHidden(false);
            setNewFieldManualOptions('');
            setNewFieldDependsOn('');
            setNewFieldDependsOnField('');
            setNewFieldDependsOnColumn('');
            setLookupTable('');
            setLookupColumn('');
            setLookupSchema('');
            setLookupNoId(false);
            setIsAddingField(false);
        } catch (e) {
            message.error('Error adding field: ' + (e as Error).message);
        }
    };

    const handleWidgetChange = (fieldPath: string, widget: string) => {
        try {
            const currentUi = JSON.parse(uiSchemaStr);
            const currentData = JSON.parse(dataSchemaStr);
            
            // Path in data schema properties
            const pathParts = fieldPath.split('.');
            const propPath = ['properties', ...pathParts.flatMap(p => [p, 'properties'])].slice(0, -1);
            
            if (widget === 'default') {
                unset(currentUi, [fieldPath, 'ui:widget']);
            } else {
                set(currentUi, [fieldPath, 'ui:widget'], widget);
                
                // Sync data type if necessary
                const fieldProp = get(currentData, propPath);
                if (fieldProp) {
                    if (widget === 'checkbox') {
                        fieldProp.type = 'boolean';
                    } else if (widget === 'DateRangePickerWidget' || widget === 'DateTimeRangePickerWidget' || widget === 'EditableTableWidget' || widget === 'TagsWidget') {
                        fieldProp.type = 'array';
                        if (!fieldProp.items) {
                            fieldProp.items = { type: 'string' };
                        }
                    } else if (widget === 'updown' || widget === 'range') {
                        fieldProp.type = 'number';
                        delete fieldProp.format;
                    } else if (widget === 'text' || widget === 'textarea' || widget === 'password' || widget === 'date' || widget === 'date-time' || widget === 'SelectSingle' || widget === 'SelectCustomWidget' || widget === 'SelectableTags' || widget === 'SelectMultiple' || widget === 'SelectMultiTags' || widget === 'email' || widget === 'url' || widget === 'phone' || widget === 'hidden') {
                        fieldProp.type = 'string';
                        if (widget === 'email') fieldProp.format = 'email';
                        else if (widget === 'url') fieldProp.format = 'uri';
                        else delete fieldProp.format;
                    }
                }

                // Add default options for some widgets if they don't exist
                if (widget === 'SelectCustomWidget' || widget === 'SelectSingle' || widget === 'SelectMultiple' || widget === 'SelectMultiTags') {
                    const actualWidget = (widget === 'SelectCustomWidget' || widget === 'SelectSingle' || widget === 'SelectMultiple' || widget === 'SelectMultiTags') 
                        ? 'SelectCustomWidget' 
                        : widget;
                    
                    set(currentUi, [fieldPath, 'ui:widget'], actualWidget);
                    
                    let mode = 'single';
                    if (widget === 'SelectMultiple') mode = 'multiple';
                    if (widget === 'SelectMultiTags') mode = 'tags';

                    const existingOptions = get(currentUi, [fieldPath, 'ui:options']) || {};
                    set(currentUi, [fieldPath, 'ui:options'], { 
                        ...existingOptions,
                        mode, 
                        colSpan: existingOptions.colSpan || 12,
                        reference_api: existingOptions.reference_api || '/api/v4/logical/fetch/...'
                    });
                } else if (widget === 'SelectableTags') {
                    set(currentUi, [fieldPath, 'ui:widget'], 'SelectableTags');
                }
            }

            setUiSchemaStr(JSON.stringify(currentUi, null, 2));
            setDataSchemaStr(JSON.stringify(currentData, null, 2));
            message.info(`Widget and data type for "${fieldPath}" updated`);
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

            // Safety cleanup for invalid widgets
            const cleanUiSchema = cleanupUiSchema(ui_schema);

            setGeneratedSchema((prev: any) => ({
                ...prev,
                data_schema,
                ui_schema: cleanUiSchema,
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
                                    optionFilterProp="label"
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
                                            let currentWidget = get(currentUi, [field.path, 'ui:widget'], 'default');
                                            
                                            // Map back from SelectCustomWidget variants
                                            if (currentWidget === 'SelectCustomWidget') {
                                                const mode = get(currentUi, [field.path, 'ui:options', 'mode'], 'single');
                                                if (mode === 'multiple') currentWidget = 'SelectMultiple';
                                                else if (mode === 'tags') currentWidget = 'SelectMultiTags';
                                                else currentWidget = 'SelectSingle';
                                            }
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
                                                        showSearch
                                                        optionFilterProp="label"
                                                    />
                                                </div>
                                            );
                                        })}
                                        {flattenedFields.length === 0 && <Text type="secondary">No fields in schema</Text>}
                                        
                                        <Divider style={{ margin: '8px 0' }} />
                                        
                                        {!isAddingField ? (
                                            <Button 
                                                type="dashed" 
                                                block 
                                                icon={<PlusOutlined />} 
                                                onClick={() => setIsAddingField(true)}
                                            >
                                                Add Field
                                            </Button>
                                        ) : (
                                            <div style={{ 
                                                padding: '12px', 
                                                background: token.colorFillAlter, 
                                                borderRadius: token.borderRadiusLG,
                                                border: `1px dashed ${token.colorBorder}`,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 8
                                            }}>
                                                <Text strong>New Field</Text>
                                                <Select
                                                    showSearch
                                                    placeholder="Select or type field name"
                                                    value={newFieldName}
                                                    onChange={setNewFieldName}
                                                    style={{ width: '100%' }}
                                                    options={masterFields.map(f => ({ label: f.display_name, value: f.key }))}
                                                    onSearch={(val) => {
                                                        // Allow custom field names if not in master list
                                                        if (!masterFields.find(f => f.key === val)) {
                                                            setNewFieldName(val);
                                                        }
                                                    }}
                                                    dropdownRender={(menu) => (
                                                        <>
                                                            {menu}
                                                            <Divider style={{ margin: '8px 0' }} />
                                                            <div style={{ padding: '0 8px 4px' }}>
                                                                <Input 
                                                                    placeholder="Manual entry..." 
                                                                    value={newFieldName}
                                                                    onChange={(e) => setNewFieldName(e.target.value)}
                                                                    onKeyDown={(e) => e.stopPropagation()}
                                                                />
                                                            </div>
                                                        </>
                                                    )}
                                                    optionFilterProp="label"
                                                />
                                                <Select
                                                    value={newFieldType}
                                                    onChange={setNewFieldType}
                                                    options={WIDGET_OPTIONS}
                                                    style={{ width: '100%' }}
                                                    showSearch
                                                    optionFilterProp="label"
                                                />
                                                
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
                                                    <Input 
                                                        size="small" 
                                                        placeholder="Field Title" 
                                                        value={newFieldTitle} 
                                                        onChange={(e) => setNewFieldTitle(e.target.value)} 
                                                    />
                                                    <Input 
                                                        size="small" 
                                                        placeholder="Placeholder" 
                                                        value={newFieldPlaceholder} 
                                                        onChange={(e) => setNewFieldPlaceholder(e.target.value)} 
                                                    />
                                                    <Input 
                                                        size="small" 
                                                        placeholder="Default Value" 
                                                        value={newFieldDefaultValue} 
                                                        onChange={(e) => setNewFieldDefaultValue(e.target.value)} 
                                                    />
                                                    <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
                                                        <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                            <Switch size="small" checked={newFieldRequired} onChange={setNewFieldRequired} /> Required
                                                        </label>
                                                        <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                            <Switch size="small" checked={newFieldReadonly} onChange={setNewFieldReadonly} /> Readonly
                                                        </label>
                                                        <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                            <Switch size="small" checked={newFieldHidden} onChange={setNewFieldHidden} /> Hidden
                                                        </label>
                                                    </div>
                                                    
                                                    {!lookupTable && (
                                                        <Input.TextArea 
                                                            size="small" 
                                                            placeholder="Manual Options (comma separated)" 
                                                            value={newFieldManualOptions} 
                                                            onChange={(e) => setNewFieldManualOptions(e.target.value)}
                                                            rows={2}
                                                            style={{ marginTop: 4 }}
                                                        />
                                                    )}
                                                </div>

                                                {(newFieldType === 'SelectCustomWidget' || newFieldType === 'SelectSingle' || newFieldType === 'SelectMultiple' || newFieldType === 'SelectMultiTags') && (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                            <Switch size="small" checked={lookupNoId} onChange={setLookupNoId} />
                                                            <span style={{ fontSize: '12px' }}>Use value as ID (no_id)</span>
                                                        </div>
                                                        <Input 
                                                            size="small" 
                                                            placeholder="Lookup Schema (e.g. core)" 
                                                            value={lookupSchema} 
                                                            onChange={(e) => setLookupSchema(e.target.value)} 
                                                        />
                                                        <Input 
                                                            size="small" 
                                                            placeholder="Lookup Table" 
                                                            value={lookupTable} 
                                                            onChange={(e) => setLookupTable(e.target.value)} 
                                                        />
                                                        <Input 
                                                            size="small" 
                                                            placeholder="Lookup Column" 
                                                            value={lookupColumn} 
                                                            onChange={(e) => setLookupColumn(e.target.value)} 
                                                        />
                                                        
                                                        <div className="p-1 bg-gray-50 rounded" style={{ padding: '4px', background: '#f5f5f5', borderRadius: '4px' }}>
                                                            <div style={{ fontSize: '10px', color: '#888', marginBottom: '2px' }}>CASCADING (OPTIONAL)</div>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                                <Input 
                                                                    size="small" 
                                                                    placeholder="Depends On (Field Name)" 
                                                                    value={newFieldDependsOn} 
                                                                    onChange={(e) => setNewFieldDependsOn(e.target.value)} 
                                                                />
                                                                <Input 
                                                                    size="small" 
                                                                    placeholder="Filter Column" 
                                                                    value={newFieldDependsOnColumn} 
                                                                    onChange={(e) => setNewFieldDependsOnColumn(e.target.value)} 
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {newFieldType === 'file' && (
                                                    <Input 
                                                        size="small" 
                                                        placeholder="Accepted File Types (e.g. .pdf,.jpg)" 
                                                        value={newFieldAcceptedFileTypes} 
                                                        onChange={(e) => setNewFieldAcceptedFileTypes(e.target.value)}
                                                        style={{ marginTop: 4 }}
                                                    />
                                                )}

                                                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                                                    <Button 
                                                        type="primary" 
                                                        size="small" 
                                                        onClick={handleAddField}
                                                        style={{ flex: 1 }}
                                                    >
                                                        Add
                                                    </Button>
                                                    <Button 
                                                        size="small" 
                                                        onClick={() => setIsAddingField(false)}
                                                        style={{ flex: 1 }}
                                                    >
                                                        Cancel
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
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
