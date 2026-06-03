import { useState, useEffect } from 'react';
import RJSFCoreForm from '@/core/components/RJSFCoreForm';
import { Card, Button, Space, message, Typography, Tabs, Divider, Switch, Input, Select, Radio, Drawer, Row, Col, Tooltip, Modal } from 'antd';
import { supabase } from '@/core/lib/supabase';
import { ThunderboltOutlined, SaveOutlined, PlusOutlined } from '@ant-design/icons';
import { Trash2, Settings2, Code, Braces, Type, AlignLeft, Lock, List, Calendar, Hash, Sliders, Phone, Mail, Link as LinkIcon, Tags, CheckSquare, CircleDot, FileUp, Globe, Table, EyeOff } from 'lucide-react';
import AceEditor from 'react-ace';
import { useAuthStore, useThemeStore } from '@/core/lib/store';
import PageManager from '@/core/components/PageManager';

import '@/core/lib/ace-config';

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

// Helper to align schema between the RPC output and what RJSF expects
const alignSchema = (schema: any, targetSchema?: string, targetTable?: string): any => {
    if (!schema) return schema;
    const aligned = JSON.parse(JSON.stringify(schema));
    
    // 1. Align data_schema nested_schema -> properties
    const traverseAndFix = (properties: any) => {
        if (!properties) return;
        Object.keys(properties).forEach(key => {
            const prop = properties[key];
            if (prop && typeof prop === 'object') {
                if (prop.type === 'object' && prop.nested_schema) {
                    prop.properties = prop.nested_schema.properties || {};
                    delete prop.nested_schema;
                    traverseAndFix(prop.properties);
                } else if (prop.type === 'array' && prop.items && prop.items.nested_schema) {
                    prop.items.properties = prop.items.nested_schema.properties || {};
                    delete prop.items.nested_schema;
                    traverseAndFix(prop.items.properties);
                } else if (prop.properties) {
                    traverseAndFix(prop.properties);
                }
            }
        });
    };
    if (aligned.data_schema?.properties) {
        traverseAndFix(aligned.data_schema.properties);
    }
    
    // 2. Align ui_schema layout from 2D to 3D
    if (aligned.ui_schema && aligned.ui_schema['ui:layout']) {
        const layout = aligned.ui_schema['ui:layout'];
        const is2D = Array.isArray(layout) && layout.length > 0 && Array.isArray(layout[0]) && !Array.isArray(layout[0][0]);
        if (is2D) {
            aligned.ui_schema['ui:layout'] = [layout];
        }
    }

    // 3. Set db_schema destination
    aligned.db_schema = {
        schema: targetSchema || aligned.db_schema?.schema || 'public',
        table: targetTable || aligned.db_schema?.table || 'dynamic'
    };
    
    return aligned;
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

const getWidgetIcon = (widget: string) => {
    switch (widget) {
        case 'text':
            return <Type size={14} style={{ opacity: 0.7 }} />;
        case 'textarea':
            return <AlignLeft size={14} style={{ opacity: 0.7 }} />;
        case 'password':
            return <Lock size={14} style={{ opacity: 0.7 }} />;
        case 'SelectCustomWidget':
        case 'SelectSingle':
        case 'SelectMultiple':
        case 'SelectMultiTags':
        case 'SelectableTags':
            return <List size={14} style={{ opacity: 0.7 }} />;
        case 'date':
        case 'date-time':
        case 'DateRangePickerWidget':
        case 'DateTimeRangePickerWidget':
            return <Calendar size={14} style={{ opacity: 0.7 }} />;
        case 'updown':
            return <Hash size={14} style={{ opacity: 0.7 }} />;
        case 'range':
            return <Sliders size={14} style={{ opacity: 0.7 }} />;
        case 'phone':
            return <Phone size={14} style={{ opacity: 0.7 }} />;
        case 'email':
            return <Mail size={14} style={{ opacity: 0.7 }} />;
        case 'url':
            return <LinkIcon size={14} style={{ opacity: 0.7 }} />;
        case 'TagsWidget':
            return <Tags size={14} style={{ opacity: 0.7 }} />;
        case 'checkbox':
            return <CheckSquare size={14} style={{ opacity: 0.7 }} />;
        case 'radio':
            return <CircleDot size={14} style={{ opacity: 0.7 }} />;
        case 'file':
            return <FileUp size={14} style={{ opacity: 0.7 }} />;
        case 'WebWidget':
            return <Globe size={14} style={{ opacity: 0.7 }} />;
        case 'EditableTableWidget':
            return <Table size={14} style={{ opacity: 0.7 }} />;
        case 'hidden':
        case 'Hidden':
            return <EyeOff size={14} style={{ opacity: 0.7 }} />;
        default:
            return <Type size={14} style={{ opacity: 0.7 }} />;
    }
};

const defaultJsonInput = `{
  "organization_id": "a41b2216-736c-4c00-99ca-30a0cd8ca0d2",
  "account_id": "b52b2216-736c-4c00-99ca-30a0cd8ca0d3",
  "is_primary": true,
  "is_active": true,
  "is_on_hold": false,
  "company": "Alpha Corp",
  "industry": "technology",
  "lead_source": "organic_search",
  "score": 90,
  "linkedin_url": "https://linkedin.com/in/alicesmith",
  "details": {
    "person": {
      "name": {
        "given": "Alice",
        "family": "Smith"
      }
    },
    "emails": [
      {
        "address": "alice@alpha.com",
        "isPrimary": true
      }
    ],
    "phones": [
      {
        "number": "555-0100",
        "type": "mobile"
      }
    ]
  },
  "communication_preferences": {
    "email": true,
    "phone": false,
    "sms": true
  },
  "custom": {
    "role": "decision_maker",
    "decision_power": "high"
  },
  "vertical": {
    "focus": "software_engineering"
  },
  "user_id": "6ba504d2-65b7-4018-b8a1-323dd686996c"
}`;

const defaultOptionsInput = `{
  "includeSystemFields": false
}`;

const TestRJSFGenForm = () => {
    const { organization } = useAuthStore();
    const { isDarkMode } = useThemeStore();
    const { token } = antdTheme.useToken();
    
    // Entity selector state (from /rjsf)
    const [entities, setEntities] = useState<any[]>([]);
    const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
    const [mode, setMode] = useState<'minimal' | 'recommended' | 'all'>('recommended');
    const [loading, setLoading] = useState(false);

    // Inputs state
    const [jsonDataStr, setJsonDataStr] = useState<string>(defaultJsonInput);
    const [optionsStr, setOptionsStr] = useState<string>(defaultOptionsInput);


    const [generatedSchema, setGeneratedSchema] = useState<any>(null);

    // Editable schemas as JSON strings
    const [dataSchemaStr, setDataSchemaStr] = useState<string>('');
    const [uiSchemaStr, setUiSchemaStr] = useState<string>('');
    const [dbSchemaStr, setDbSchemaStr] = useState<string>('');

    const [generating, setGenerating] = useState(false);
    const [generatingEntity, setGeneratingEntity] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isGlobal, setIsGlobal] = useState(true);
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

    // Custom Button states
    const [isAddingButton, setIsAddingButton] = useState(false);
    const [newButtonLabel, setNewButtonLabel] = useState('');
    const [newButtonVariant, setNewButtonVariant] = useState('default');
    const [newButtonDefaultValues, setNewButtonDefaultValues] = useState('{}');

    const [savedForms, setSavedForms] = useState<any[]>([]);
    const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
    const [loadingSavedForms, setLoadingSavedForms] = useState(false);

    // Drawer visibility states
    const [jsonInputDrawerOpen, setJsonInputDrawerOpen] = useState(false);
    const [schemaEditorDrawerOpen, setSchemaEditorDrawerOpen] = useState(false);

    // Edit Field Modal states
    const [isEditFieldModalOpen, setIsEditFieldModalOpen] = useState(false);
    const [editingFieldPath, setEditingFieldPath] = useState('');
    const [editFieldTitle, setEditFieldTitle] = useState('');
    const [editFieldPlaceholder, setEditFieldPlaceholder] = useState('');
    const [editFieldDefaultValue, setEditFieldDefaultValue] = useState('');
    const [editFieldType, setEditFieldType] = useState('default');
    const [editFieldRequired, setEditFieldRequired] = useState(false);
    const [editFieldReadonly, setEditFieldReadonly] = useState(false);
    const [editFieldHidden, setEditFieldHidden] = useState(false);
    const [editFieldManualOptions, setEditFieldManualOptions] = useState('');
    const [editLookupSchema, setEditLookupSchema] = useState('');
    const [editLookupTable, setEditLookupTable] = useState('');
    const [editLookupColumn, setEditLookupColumn] = useState('');
    const [editLookupNoId, setEditLookupNoId] = useState(false);
    const [editFieldDependsOn, setEditFieldDependsOn] = useState('');
    const [editFieldDependsOnField, setEditFieldDependsOnField] = useState('');
    const [editFieldDependsOnColumn, setEditFieldDependsOnColumn] = useState('');
    const [editFieldAcceptedFileTypes, setEditFieldAcceptedFileTypes] = useState('');

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

    // Fetch entities for entity dropdown (same as /rjsf)
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
                    return { label: fullName, value: fullName };
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

    // Fetch entity metadata when selectedEntity changes (populates Add Field suggestions)
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

    // Fetch saved forms filtered by selected entity (same as /rjsf)
    const fetchSavedForms = async (entityFilter?: string | null) => {
        setLoadingSavedForms(true);
        try {
            let query = supabase
                .schema('core')
                .from('forms')
                .select('id, name, organization_id')
                .order('name', { ascending: true });

            if (entityFilter) {
                const searchPattern = entityFilter.replace('.', '_');
                const entityName = entityFilter.includes('.') ? entityFilter.split('.')[1] : entityFilter;

                const { data, error } = await query.ilike('name', `%${searchPattern}%`);
                if (error) throw error;

                if (!data || data.length === 0) {
                    const { data: fallbackData, error: fallbackError } = await supabase
                        .schema('core')
                        .from('forms')
                        .select('id, name, organization_id')
                        .ilike('name', `%${entityName}%`)
                        .order('name', { ascending: true });
                    if (fallbackError) throw fallbackError;
                    setSavedForms(fallbackData || []);
                } else {
                    setSavedForms(data || []);
                }
            } else {
                const { data, error } = await query;
                if (error) throw error;
                setSavedForms(data || []);
            }
        } catch (err: any) {
            console.error('Failed to fetch saved forms:', err);
        } finally {
            setLoadingSavedForms(false);
        }
    };

    useEffect(() => {
        fetchSavedForms(selectedEntity);
    }, [selectedEntity]);

    const handleLoadForm = async (formId: string) => {
        if (!formId) return;
        
        setLoading(true);
        try {
            const { data, error } = await supabase
                .schema('core')
                .from('forms')
                .select('*')
                .eq('id', formId)
                .single();

            if (error) throw error;

            if (data) {
                // Update editable schemas
                setDataSchemaStr(JSON.stringify(data.data_schema || {}, null, 2));
                setUiSchemaStr(JSON.stringify(data.ui_schema || {}, null, 2));
                setDbSchemaStr(JSON.stringify(data.data_config || {}, null, 2));
                
                setFormName(data.name || '');
                setIsGlobal(!data.organization_id);
                
                // Set generated schema for preview
                setGeneratedSchema({
                    data_schema: data.data_schema,
                    ui_schema: data.ui_schema,
                    db_schema: data.data_config
                });

                // Update layout state
                setUiLayout(data.ui_schema?.['ui:layout'] || [[]]);

                // Extract master fields from loaded data_schema
                if (data.data_schema && data.data_schema.properties) {
                    const fields = Object.keys(data.data_schema.properties).map(key => ({
                        key,
                        display_name: data.data_schema.properties[key].title || key,
                        type: data.data_schema.properties[key].type || 'string'
                    }));
                    setMasterFields(fields);
                }

                setSelectedFormId(formId);
                message.success(`Form "${data.name}" loaded successfully`);
            }
        } catch (err: any) {
            message.error('Failed to load form: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    // Lookup pre-fill when field name changes (uses foreign_key from entity metadata)
    useEffect(() => {
        if (isAddingField && newFieldName) {
            const fieldMeta = masterFields.find(f => f.key === newFieldName);
            if (fieldMeta?.foreign_key) {
                setLookupTable(fieldMeta.foreign_key.source_table || '');
                setLookupColumn(fieldMeta.foreign_key.display_column || '');
            }
            if (!newFieldTitle) {
                setNewFieldTitle(fieldMeta?.display_name || newFieldName);
            }
        }
    }, [newFieldName, isAddingField, masterFields]);

    // Generate via core.utils_form_gen (JSON paste approach)
    const handleGenerate = async () => {
        setGenerating(true);
        try {
            let parsedData = {};
            let parsedOptions = {};
            try {
                parsedData = JSON.parse(jsonDataStr);
            } catch (e) {
                message.error('Invalid Input JSON format');
                setGenerating(false);
                return;
            }
            try {
                parsedOptions = JSON.parse(optionsStr || '{}');
            } catch (e) {
                message.error('Invalid Options JSON format');
                setGenerating(false);
                return;
            }

            const { data, error } = await supabase.schema('core').rpc('utils_form_gen_v3', {
                p_json_data: parsedData,
                p_options: parsedOptions
            });

            if (error) throw error;

            if (data) {
                const rawSchemas = {
                    data_schema: (data as any).data_schema || (data as any).dataSchema,
                    ui_schema: (data as any).ui_schema || (data as any).uiSchema,
                    db_schema: (data as any).db_schema || (data as any).dbSchema
                };
                // Use selectedEntity for db_schema if available
                const [entSchema, entTable] = selectedEntity?.split('.') || ['', ''];
                const schemas = alignSchema(rawSchemas, entSchema || undefined, entTable || undefined);
                setGeneratedSchema(schemas);
                
                const cleanUiSchema = cleanupUiSchema(schemas.ui_schema);

                setDataSchemaStr(JSON.stringify(schemas.data_schema, null, 2));
                setUiSchemaStr(JSON.stringify(cleanUiSchema, null, 2));
                setDbSchemaStr(JSON.stringify(schemas.db_schema, null, 2));

                // Set default form name
                if (selectedEntity) {
                    const [s, t] = selectedEntity.split('.');
                    setFormName(`${s}_${t}_gen`);
                } else {
                    setFormName(`generated_form_${Date.now().toString().slice(-4)}`);
                }

                setUiLayout(schemas.ui_schema?.['ui:layout'] || [[]]);

                // Only update masterFields from schema if entity metadata is not loaded
                if (!selectedEntity && schemas.data_schema?.properties) {
                    const fields = Object.keys(schemas.data_schema.properties).map(key => ({
                        key,
                        display_name: schemas.data_schema.properties[key].title || key,
                        type: schemas.data_schema.properties[key].type || 'string'
                    }));
                    setMasterFields(fields);
                }

                message.success('Schema generated successfully from JSON via core.utils_form_gen');
            }
        } catch (err: any) {
            message.error('Generation failed: ' + err.message);
        } finally {
            setGenerating(false);
        }
    };

    // Generate via api_new_generate_form_schema_v3 (entity dropdown approach, from /rjsf)
    const handleGenerateFromEntity = async () => {
        if (!selectedEntity) return;
        setGeneratingEntity(true);
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

                const cleanUiSchema = cleanupUiSchema(schemas.ui_schema);

                setDataSchemaStr(JSON.stringify(schemas.data_schema, null, 2));
                setUiSchemaStr(JSON.stringify(cleanUiSchema, null, 2));
                setDbSchemaStr(JSON.stringify(schemas.db_schema, null, 2));

                const [schemaName, entityName] = selectedEntity.split('.');
                let suffix = 'form';
                if (mode === 'minimal') suffix = 'min';
                else if (mode === 'all') suffix = 'custom';
                setFormName(`${schemaName}_${entityName}_${suffix}`);

                setUiLayout(schemas.ui_schema?.['ui:layout'] || [[]]);
                message.success('Schema generated successfully from entity');
            }
        } catch (err: any) {
            message.error('Entity generation failed: ' + err.message);
        } finally {
            setGeneratingEntity(false);
        }
    };

    const handleSaveToForms = async () => {
        if (!organization?.id) {
            message.error('User organization not found. Please log in.');
            return;
        }

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
            fetchSavedForms(); // Refresh saved forms list
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
            const pathParts = fieldPath.split('.');
            const propPath = ['properties', ...pathParts.flatMap(p => [p, 'properties'])].slice(0, -1);
            
            // Delete from properties
            unset(currentData, propPath);

            // Remove from required array at the correct level
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

            const fieldMeta = masterFields.find(f => f.key === newFieldName);
            const type = fieldMeta?.type || 'string';
            
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

            const activeWidget = newFieldType !== 'default' ? newFieldType : defaultWidget;
            if (activeWidget === 'checkbox') {
                rjsfType = 'boolean';
            } else if (activeWidget === 'DateRangePickerWidget' || activeWidget === 'DateTimeRangePickerWidget' || activeWidget === 'EditableTableWidget' || activeWidget === 'TagsWidget') {
                rjsfType = 'array';
            } else if (activeWidget === 'updown' || activeWidget === 'range') {
                rjsfType = 'number';
            }

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

            if (activeWidget === 'SelectCustomWidget' || activeWidget === 'SelectSingle' || activeWidget === 'SelectMultiple' || activeWidget === 'SelectMultiTags') {
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

            const cleanUi = cleanupUiSchema(currentUi);

            const newDataStr = JSON.stringify(currentData, null, 2);
            const newUiStr = JSON.stringify(cleanUi, null, 2);

            setDataSchemaStr(newDataStr);
            setUiSchemaStr(newUiStr);

            if (currentUi['ui:layout']) {
                const updatedLayout = [...currentUi['ui:layout']];
                if (updatedLayout.length > 0 && updatedLayout[0].length > 0) {
                    updatedLayout[0].push([newFieldName]);
                    setUiLayout(updatedLayout);
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

    const handleAddCustomButton = () => {
        if (!newButtonLabel) {
            message.warning('Please enter a button label');
            return;
        }

        try {
            const currentUi = JSON.parse(uiSchemaStr || '{}');
            const buttons = currentUi['ui:submitButtons'] || [];
            
            let defaults = {};
            try {
                defaults = JSON.parse(newButtonDefaultValues);
            } catch (pErr) {
                message.error('Invalid JSON in default values');
                return;
            }

            buttons.push({
                label: newButtonLabel,
                variant: newButtonVariant,
                defaultValues: defaults
            });

            currentUi['ui:submitButtons'] = buttons;
            setUiSchemaStr(JSON.stringify(currentUi, null, 2));
            
            setNewButtonLabel('');
            setNewButtonVariant('default');
            setNewButtonDefaultValues('{}');
            setIsAddingButton(false);
            message.success(`Button "${newButtonLabel}" added`);
        } catch (e) {
            message.error('Error adding button: ' + (e as Error).message);
        }
    };

    const handleDeleteButton = (label: string) => {
        try {
            const currentUi = JSON.parse(uiSchemaStr);
            if (currentUi['ui:submitButtons']) {
                currentUi['ui:submitButtons'] = currentUi['ui:submitButtons'].filter((b: any) => b.label !== label);
                if (currentUi['ui:submitButtons'].length === 0) delete currentUi['ui:submitButtons'];
                setUiSchemaStr(JSON.stringify(currentUi, null, 2));
                message.info(`Button "${label}" removed`);
            }
        } catch (e) {
            message.error('Error removing button: ' + (e as Error).message);
        }
    };


    const openEditFieldModal = (fieldPath: string) => {
        try {
            const currentData = JSON.parse(dataSchemaStr || '{"type":"object","properties":{},"required":[]}');
            const currentUi = JSON.parse(uiSchemaStr || '{}');
            
            const pathParts = fieldPath.split('.');
            const propPath = ['properties', ...pathParts.flatMap(p => [p, 'properties'])].slice(0, -1);
            
            const property = get(currentData, propPath);
            if (!property) {
                message.error('Field not found in data schema');
                return;
            }

            setEditingFieldPath(fieldPath);
            setEditFieldTitle(property.title || '');
            
            let defaultValue = '';
            if (property.default !== undefined) {
                defaultValue = typeof property.default === 'object' ? JSON.stringify(property.default) : String(property.default);
            }
            setEditFieldDefaultValue(defaultValue);

            // Required status
            let isReq = false;
            const parentPath = propPath.slice(0, -2);
            const parentObj = parentPath.length === 0 ? currentData : get(currentData, parentPath);
            const fieldKey = pathParts[pathParts.length - 1];
            if (parentObj && Array.isArray(parentObj.required)) {
                isReq = parentObj.required.includes(fieldKey);
            }
            setEditFieldRequired(isReq);

            // UI Schema options
            const uiPlaceholder = get(currentUi, [fieldPath, 'ui:placeholder'], '');
            setEditFieldPlaceholder(uiPlaceholder);

            const uiReadonly = get(currentUi, [fieldPath, 'ui:readonly'], false);
            setEditFieldReadonly(uiReadonly);

            const uiWidget = get(currentUi, [fieldPath, 'ui:widget']);
            const isHidden = uiWidget === 'Hidden' || uiWidget === 'hidden';
            setEditFieldHidden(isHidden);

            // Determine editFieldType
            let currentWidget = uiWidget || 'default';
            if (currentWidget === 'SelectCustomWidget') {
                const mode = get(currentUi, [fieldPath, 'ui:options', 'mode'], 'single');
                if (mode === 'multiple') currentWidget = 'SelectMultiple';
                else if (mode === 'tags') currentWidget = 'SelectMultiTags';
                else currentWidget = 'SelectSingle';
            }
            setEditFieldType(currentWidget);

            // Manual options
            if (Array.isArray(property.enum)) {
                setEditFieldManualOptions(property.enum.join(', '));
            } else {
                setEditFieldManualOptions('');
            }

            // Lookup enum configuration
            const enumConfig = property.enum && typeof property.enum === 'object' ? property.enum : null;
            if (enumConfig) {
                const fullTable = enumConfig.table || '';
                let schema = '';
                let table = fullTable;
                if (fullTable.includes('.')) {
                    const parts = fullTable.split('.');
                    schema = parts[0];
                    table = parts.slice(1).join('.');
                }
                setEditLookupSchema(schema);
                setEditLookupTable(table);
                setEditLookupColumn(enumConfig.column || '');
                setEditLookupNoId(!!enumConfig.no_id);
                setEditFieldDependsOn(enumConfig.dependsOn || '');
                setEditFieldDependsOnField(enumConfig.dependsOnField || '');
                setEditFieldDependsOnColumn(enumConfig.dependsOnColumn || '');
            } else {
                setEditLookupSchema('');
                setEditLookupTable('');
                setEditLookupColumn('');
                setEditLookupNoId(false);
                setEditFieldDependsOn('');
                setEditFieldDependsOnField('');
                setEditFieldDependsOnColumn('');
            }

            // File accepted types
            const accept = get(currentUi, [fieldPath, 'ui:options', 'accept'], '');
            setEditFieldAcceptedFileTypes(accept);

            setIsEditFieldModalOpen(true);
        } catch (e) {
            message.error('Error loading field details: ' + (e as Error).message);
        }
    };

    const handleSaveFieldConfig = () => {
        try {
            const currentData = JSON.parse(dataSchemaStr || '{"type":"object","properties":{},"required":[]}');
            const currentUi = JSON.parse(uiSchemaStr || '{}');

            const pathParts = editingFieldPath.split('.');
            const propPath = ['properties', ...pathParts.flatMap(p => [p, 'properties'])].slice(0, -1);
            
            const property = get(currentData, propPath);
            if (!property) {
                message.error('Field not found in data schema');
                return;
            }

            // Update title
            property.title = editFieldTitle || pathParts[pathParts.length - 1];

            // Update default value
            if (editFieldDefaultValue !== '') {
                property.default = property.type === 'number' ? Number(editFieldDefaultValue) : editFieldDefaultValue;
            } else {
                delete property.default;
            }

            // Update required status in parent
            const parentPath = propPath.slice(0, -2);
            const parentObj = parentPath.length === 0 ? currentData : get(currentData, parentPath);
            const fieldKey = pathParts[pathParts.length - 1];
            if (parentObj) {
                const required = parentObj.required || [];
                if (editFieldRequired) {
                    if (!required.includes(fieldKey)) {
                        required.push(fieldKey);
                    }
                } else {
                    const idx = required.indexOf(fieldKey);
                    if (idx > -1) {
                        required.splice(idx, 1);
                    }
                }
                parentObj.required = required;
            }

            // Update UI schema placeholder and readonly
            if (editFieldPlaceholder) {
                set(currentUi, [editingFieldPath, 'ui:placeholder'], editFieldPlaceholder);
            } else {
                unset(currentUi, [editingFieldPath, 'ui:placeholder']);
            }

            if (editFieldReadonly) {
                set(currentUi, [editingFieldPath, 'ui:readonly'], true);
            } else {
                unset(currentUi, [editingFieldPath, 'ui:readonly']);
            }

            // Figure out the widget details
            let activeWidget = editFieldType;
            let rjsfType = property.type || 'string';

            if (activeWidget === 'checkbox') {
                rjsfType = 'boolean';
            } else if (activeWidget === 'DateRangePickerWidget' || activeWidget === 'DateTimeRangePickerWidget' || activeWidget === 'EditableTableWidget' || activeWidget === 'TagsWidget') {
                rjsfType = 'array';
            } else if (activeWidget === 'updown' || activeWidget === 'range') {
                rjsfType = 'number';
            } else if (activeWidget === 'default') {
                if (rjsfType === 'boolean') activeWidget = 'checkbox';
                else if (rjsfType === 'number') activeWidget = 'text';
                else activeWidget = 'text';
            }

            property.type = rjsfType;
            if (rjsfType === 'array' && !property.items) {
                property.items = { type: 'string' };
            }

            // Formats
            if (activeWidget === 'email') {
                property.format = 'email';
            } else if (activeWidget === 'url') {
                property.format = 'uri';
            } else {
                delete property.format;
            }

            // Manual Options vs Lookup
            if (activeWidget === 'SelectCustomWidget' || activeWidget === 'SelectSingle' || activeWidget === 'SelectMultiple' || activeWidget === 'SelectMultiTags') {
                if (editLookupTable) {
                    const enumConfig: any = {
                        table: editLookupSchema ? `${editLookupSchema}.${editLookupTable}` : editLookupTable,
                        column: editLookupColumn,
                        no_id: editLookupNoId
                    };
                    if (editFieldDependsOn) {
                        enumConfig.dependsOn = editFieldDependsOn;
                        enumConfig.dependsOnField = editFieldDependsOnField || editFieldDependsOn;
                        enumConfig.dependsOnColumn = editFieldDependsOnColumn;
                    }
                    property.enum = enumConfig;
                } else if (editFieldManualOptions) {
                    property.enum = editFieldManualOptions.split(',').map(s => s.trim()).filter(Boolean);
                } else {
                    delete property.enum;
                }
            } else if (editFieldManualOptions) {
                property.enum = editFieldManualOptions.split(',').map(s => s.trim()).filter(Boolean);
            } else {
                delete property.enum;
            }

            // UI options / layout widget
            if (editFieldHidden) {
                set(currentUi, [editingFieldPath, 'ui:widget'], 'Hidden');
            } else if (activeWidget === 'SelectCustomWidget' || activeWidget === 'SelectSingle' || activeWidget === 'SelectMultiple' || activeWidget === 'SelectMultiTags') {
                const actualWidget = 'SelectCustomWidget';
                set(currentUi, [editingFieldPath, 'ui:widget'], actualWidget);
                
                let mode = 'single';
                if (activeWidget === 'SelectMultiple') mode = 'multiple';
                if (activeWidget === 'SelectMultiTags') mode = 'tags';

                const existingOptions = get(currentUi, [editingFieldPath, 'ui:options']) || {};
                set(currentUi, [editingFieldPath, 'ui:options'], { 
                    ...existingOptions,
                    mode, 
                    colSpan: existingOptions.colSpan || 12,
                    reference_api: existingOptions.reference_api || '/api/v4/logical/fetch/...'
                });
            } else if (activeWidget === 'phone') {
                set(currentUi, [editingFieldPath, 'ui:options'], { inputType: 'tel' });
                set(currentUi, [editingFieldPath, 'ui:widget'], 'phone');
            } else if (activeWidget === 'file') {
                set(currentUi, [editingFieldPath, 'ui:widget'], 'file');
                if (editFieldAcceptedFileTypes) {
                    set(currentUi, [editingFieldPath, 'ui:options', 'accept'], editFieldAcceptedFileTypes);
                } else {
                    unset(currentUi, [editingFieldPath, 'ui:options', 'accept']);
                }
            } else {
                if (activeWidget === 'email' || activeWidget === 'url' || activeWidget === 'text') {
                    unset(currentUi, [editingFieldPath, 'ui:widget']);
                } else {
                    set(currentUi, [editingFieldPath, 'ui:widget'], activeWidget);
                }
            }

            const cleanUi = cleanupUiSchema(currentUi);

            setDataSchemaStr(JSON.stringify(currentData, null, 2));
            setUiSchemaStr(JSON.stringify(cleanUi, null, 2));
            
            setIsEditFieldModalOpen(false);
            message.success(`Field "${editingFieldPath}" config updated`);
        } catch (e) {
            message.error('Error saving field config: ' + (e as Error).message);
        }
    };

    useEffect(() => {
        try {
            const data_schema = JSON.parse(dataSchemaStr);
            const ui_schema = JSON.parse(uiSchemaStr);
            const db_schema = JSON.parse(dbSchemaStr);

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

    const filteredMasterFieldsOptions = (() => {
        const addedKeys = new Set(flattenedFields.map(f => f.path));
        const available = masterFields.filter(f => !addedKeys.has(f.key));
        const opts = available.map(f => ({ label: f.display_name, value: f.key }));
        if (newFieldName && !opts.some(o => o.value === newFieldName)) {
            opts.unshift({ label: `Add custom: "${newFieldName}"`, value: newFieldName });
        }
        return opts;
    })();

    return (
        <div style={{ padding: 12 }}>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    
                    <Card size="small" type="inner" title="Generator Controls">
                        <Space direction="horizontal" wrap size="small" align="center" style={{ width: '100%' }}>
                            {/* 1. Configure JSON Input button */}
                            

                            {/* 2. Entity Selector */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Text strong style={{ fontSize: '12px' }}>Entity:</Text>
                                <Select
                                    style={{ width: 220 }}
                                    placeholder="Select an entity"
                                    options={entities}
                                    loading={loading}
                                    value={selectedEntity}
                                    onChange={setSelectedEntity}
                                    showSearch
                                    allowClear
                                    optionFilterProp="label"
                                    size="small"
                                />
                            </div>

                            {/* 3. Mode selector */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Text strong style={{ fontSize: '12px' }}>Mode:</Text>
                                <Radio.Group value={mode} onChange={(e) => setMode(e.target.value)} size="small">
                                    <Radio.Button value="minimal">Minimal</Radio.Button>
                                    <Radio.Button value="recommended">Recommended</Radio.Button>
                                    <Radio.Button value="all">All</Radio.Button>
                                </Radio.Group>
                            </div>

                            {/* 4. Global Switch as Tooltip */}
                            <Tooltip title="Global Form (No Org ID restriction)">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Switch
                                        checked={isGlobal}
                                        onChange={setIsGlobal}
                                        size="small"
                                    />
                                    <Text strong style={{ fontSize: '12px' }}>Global</Text>
                                </div>
                            </Tooltip>

                            {/* 5. Generate Entity button */}
                            <Button
                                type="primary"
                                icon={<ThunderboltOutlined />}
                                onClick={handleGenerateFromEntity}
                                loading={generatingEntity}
                                disabled={!selectedEntity}
                                size="small"
                            >
                                Generate via Entity
                            </Button>
                            <Button
                                type="primary"
                                icon={<Code size={14} />}
                                onClick={() => setJsonInputDrawerOpen(true)}
                                size="small"
                            >
                                Configure JSON Input
                            </Button>
                            {/* 6. Saved Forms dropdown */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Text strong style={{ fontSize: '12px' }}>Saved Forms:</Text>
                                <Select
                                    style={{ width: 220 }}
                                    placeholder={selectedEntity ? `Forms for ${selectedEntity}` : 'Select a saved form'}
                                    options={savedForms.map(f => ({
                                        label: f.name + (f.organization_id ? '' : ' 🌐'),
                                        value: f.id,
                                    }))}
                                    loading={loadingSavedForms}
                                    value={selectedFormId}
                                    onChange={handleLoadForm}
                                    allowClear
                                    showSearch
                                    optionFilterProp="label"
                                    size="small"
                                />
                            </div>
                        </Space>
                    </Card>

                    {generatedSchema ? (
                        <Row gutter={16} align="top">
                            {/* Left Panel: Form Fields & Widgets */}
                            <Col span={6}>
                                <Card 
                                    size="small" 
                                    title={`Form Fields & Widgets (${flattenedFields.length})`}
                                    bodyStyle={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}
                                >
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {flattenedFields.map(field => {
                                            const currentUi = JSON.parse(uiSchemaStr || '{}');
                                            let currentWidget = get(currentUi, [field.path, 'ui:widget'], 'default');
                                            
                                            if (currentWidget === 'SelectCustomWidget') {
                                                const mode = get(currentUi, [field.path, 'ui:options', 'mode'], 'single');
                                                if (mode === 'multiple') currentWidget = 'SelectMultiple';
                                                else if (mode === 'tags') currentWidget = 'SelectMultiTags';
                                                else currentWidget = 'SelectSingle';
                                            }
                                            return (
                                                <div key={field.path} style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    padding: '6px 8px',
                                                    background: field.depth > 0 ? token.colorFillAlter : token.colorFillSecondary,
                                                    border: `1px solid ${token.colorBorderSecondary}`,
                                                    borderRadius: token.borderRadiusLG,
                                                    marginLeft: field.depth * 16,
                                                    borderLeft: field.depth > 0 ? `2px solid ${token.colorBorder}` : 'none',
                                                    gap: 8
                                                }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                                                        <Text strong={field.depth === 0} type={field.depth > 0 ? "secondary" : undefined} ellipsis>
                                                            {field.label}
                                                        </Text>
                                                    </div>
                                                    <Space size={2} style={{ flexShrink: 0 }}>
                                                        <Tooltip title={`Widget: ${WIDGET_OPTIONS.find(o => o.value === currentWidget)?.label || currentWidget}`}>
                                                            <span style={{ display: 'flex', alignItems: 'center', marginRight: 4 }}>
                                                                {getWidgetIcon(currentWidget)}
                                                            </span>
                                                        </Tooltip>
                                                        <Button
                                                            type="text"
                                                            size="small"
                                                            icon={<Settings2 size={14} />}
                                                            onClick={() => openEditFieldModal(field.path)}
                                                        />
                                                        <Button
                                                            type="text"
                                                            danger
                                                            size="small"
                                                            icon={<Trash2 size={14} />}
                                                            onClick={() => handleDeleteField(field.path)}
                                                        />
                                                    </Space>
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
                                                    options={filteredMasterFieldsOptions}
                                                    onSearch={setNewFieldName}
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
                                                        
                                                        <div style={{ padding: '4px', background: '#f5f5f5', borderRadius: '4px' }}>
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

                                    <Card size="small" title="Custom Submit Buttons" style={{ marginTop: 16 }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            {(() => {
                                                try {
                                                    const ui = JSON.parse(uiSchemaStr || '{}');
                                                    const buttons = ui['ui:submitButtons'] || [];
                                                    return buttons.map((btn: any) => (
                                                        <div key={btn.label} style={{
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                            padding: '8px',
                                                            background: token.colorFillSecondary,
                                                            border: `1px solid ${token.colorBorderSecondary}`,
                                                            borderRadius: token.borderRadiusLG
                                                        }}>
                                                            <Space>
                                                                <Text strong>{btn.label}</Text>
                                                                <Text type="secondary" style={{ fontSize: '10px' }}>({btn.variant})</Text>
                                                            </Space>
                                                            <Button
                                                                type="text"
                                                                danger
                                                                size="small"
                                                                icon={<Trash2 size={14} />}
                                                                onClick={() => handleDeleteButton(btn.label)}
                                                            />
                                                        </div>
                                                    ));
                                                } catch (e) {
                                                    return <Text type="danger">UI Schema Error</Text>;
                                                }
                                            })()}

                                            {!isAddingButton ? (
                                                <Button
                                                    type="dashed"
                                                    block
                                                    icon={<PlusOutlined />}
                                                    onClick={() => setIsAddingButton(true)}
                                                >
                                                    Add Custom Button
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
                                                    <Input
                                                        size="small"
                                                        placeholder="Button Label"
                                                        value={newButtonLabel}
                                                        onChange={(e) => setNewButtonLabel(e.target.value)}
                                                    />
                                                    <Select
                                                        size="small"
                                                        value={newButtonVariant}
                                                        onChange={setNewButtonVariant}
                                                        options={[
                                                            { label: 'Primary', value: 'primary' },
                                                            { label: 'Default', value: 'default' },
                                                            { label: 'Dashed', value: 'dashed' },
                                                            { label: 'Danger', value: 'danger' }
                                                        ]}
                                                        style={{ width: '100%' }}
                                                    />
                                                    <Text type="secondary" style={{ fontSize: '10px' }}>Default Values (JSON):</Text>
                                                    <AceEditor
                                                        mode="json"
                                                        theme={isDarkMode ? "monokai" : "github"}
                                                        value={newButtonDefaultValues}
                                                        onChange={setNewButtonDefaultValues}
                                                        width="100%"
                                                        height="100px"
                                                        fontSize={12}
                                                        setOptions={{ useWorker: false, showPrintMargin: false, showGutter: false }}
                                                    />
                                                    <div style={{ display: 'flex', gap: 8 }}>
                                                        <Button type="primary" size="small" onClick={handleAddCustomButton} style={{ flex: 1 }}>Add</Button>
                                                        <Button size="small" onClick={() => setIsAddingButton(false)} style={{ flex: 1 }}>Cancel</Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </Card>
                                </Card>
                            </Col>

                            {/* Right Panel: Form Preview & Save Controls */}
                            <Col span={18}>
                                <Card 
                                    size="small" 
                                    title="Form Preview" 
                                    extra={
                                        <Space size="middle">
                                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                <Text strong>Form Name: </Text>
                                                <Input 
                                                    placeholder="Form Name" 
                                                    value={formName} 
                                                    onChange={(e) => setFormName(e.target.value)}
                                                    style={{ width: 200 }}
                                                />
                                            </div>
                                            <Button
                                                type={schemaEditorDrawerOpen ? "primary" : "default"}
                                                icon={<Braces size={16} />}
                                                onClick={() => setSchemaEditorDrawerOpen(true)}
                                            >
                                                Schema Code
                                            </Button>
                                            <Button
                                                type="default"
                                                icon={<Settings2 size={16} />}
                                                onClick={() => setIsPageManagerVisible(true)}
                                                disabled={!generatedSchema}
                                            >
                                                Pages
                                            </Button>
                                            <Button
                                                type="primary"
                                                icon={<SaveOutlined />}
                                                onClick={handleSaveToForms}
                                                loading={saving}
                                            >
                                                Save Layout
                                            </Button>
                                        </Space>
                                    }
                                    bodyStyle={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}
                                >
                                    <RJSFCoreForm
                                        schema={generatedSchema}
                                        onSuccess={(data) => console.log('Saved successfully:', data)}
                                        key={formName + dataSchemaStr.length + uiSchemaStr.length}
                                        entityType={selectedEntity ? selectedEntity.split('.')[1] : undefined}
                                        entitySchema={selectedEntity ? selectedEntity.split('.')[0] : undefined}
                                    />
                                </Card>
                            </Col>
                        </Row>
                    ) : (
                        <Card>
                            <Text type="secondary">Paste JSON data & options (click "Configure Input JSON"), then click "Generate Form via core.utils_form_gen" or select an entity to begin.</Text>
                        </Card>
                    )}
                </Space>

            {/* Drawer 1: Configure Input JSON */}
            <Drawer
                title="Configure Input JSON & Options"
                placement="right"
                width={640}
                onClose={() => setJsonInputDrawerOpen(false)}
                open={jsonInputDrawerOpen}
                extra={
                    <Space>
                        <Button
                            type="primary"
                            icon={<ThunderboltOutlined />}
                            onClick={async () => {
                                await handleGenerate();
                                setJsonInputDrawerOpen(false);
                            }}
                            loading={generating}
                        >
                            Generate Form
                        </Button>
                        <Button onClick={() => setJsonInputDrawerOpen(false)}>Cancel</Button>
                    </Space>
                }
            >
                <Space direction="vertical" style={{ width: '100%' }} size="large">
                    <Card size="small" title="P_JSON_DATA (Input JSON)" extra={<Text type="secondary">Raw schema fields & sample data</Text>}>
                        <AceEditor
                            mode="json"
                            theme={isDarkMode ? "monokai" : "github"}
                            value={jsonDataStr}
                            onChange={setJsonDataStr}
                            width="100%"
                            height="300px"
                            fontSize={12}
                            setOptions={{ useWorker: false, showPrintMargin: false }}
                        />
                    </Card>
                    <Card size="small" title="P_OPTIONS (Generation Switches)" extra={<Text type="secondary">Options configuration</Text>}>
                        <AceEditor
                            mode="json"
                            theme={isDarkMode ? "monokai" : "github"}
                            value={optionsStr}
                            onChange={setOptionsStr}
                            width="100%"
                            height="200px"
                            fontSize={12}
                            setOptions={{ useWorker: false, showPrintMargin: false }}
                        />
                    </Card>
                </Space>
            </Drawer>

            {/* Drawer 2: Schema Code Editor */}
            <Drawer
                title="Schema Code Editor"
                placement="right"
                width={720}
                onClose={() => setSchemaEditorDrawerOpen(false)}
                open={schemaEditorDrawerOpen}
            >
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
                                    height="400px"
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
                                    height="400px"
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
                                    height="150px"
                                    fontSize={12}
                                    setOptions={{ useWorker: false }}
                                />
                            )
                        }
                    ]}
                />
            </Drawer>

            <PageManager
                visible={isPageManagerVisible}
                fields={flattenedFields.map(f => ({ fieldName: f.path, fieldTitle: f.label }))}
                initialLayout={uiLayout}
                onSave={handleSaveLayout}
                onCancel={() => setIsPageManagerVisible(false)}
            />

            <Modal
                title={`Edit Field Config: ${editingFieldPath}`}
                open={isEditFieldModalOpen}
                onOk={handleSaveFieldConfig}
                onCancel={() => setIsEditFieldModalOpen(false)}
                okText="Save"
                width={500}
                bodyStyle={{ maxHeight: '70vh', overflowY: 'auto', padding: '10px 0' }}
            >
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    <div>
                        <Text strong>Field Path (Readonly)</Text>
                        <Input value={editingFieldPath} disabled style={{ marginTop: 4 }} />
                    </div>
                    <div>
                        <Text strong>Field Title</Text>
                        <Input value={editFieldTitle} onChange={(e) => setEditFieldTitle(e.target.value)} style={{ marginTop: 4 }} />
                    </div>
                    <div>
                        <Text strong>Placeholder</Text>
                        <Input value={editFieldPlaceholder} onChange={(e) => setEditFieldPlaceholder(e.target.value)} style={{ marginTop: 4 }} />
                    </div>
                    <div>
                        <Text strong>Default Value</Text>
                        <Input value={editFieldDefaultValue} onChange={(e) => setEditFieldDefaultValue(e.target.value)} style={{ marginTop: 4 }} />
                    </div>
                    <div>
                        <Text strong>Field Type / Widget</Text>
                        <Select
                            value={editFieldType}
                            onChange={setEditFieldType}
                            options={WIDGET_OPTIONS}
                            style={{ width: '100%', marginTop: 4 }}
                            showSearch
                            optionFilterProp="label"
                        />
                    </div>
                    <div style={{ display: 'flex', gap: 16 }}>
                        <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Switch size="small" checked={editFieldRequired} onChange={setEditFieldRequired} /> Required
                        </label>
                        <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Switch size="small" checked={editFieldReadonly} onChange={setEditFieldReadonly} /> Readonly
                        </label>
                        <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Switch size="small" checked={editFieldHidden} onChange={setEditFieldHidden} /> Hidden
                        </label>
                    </div>

                    {editFieldType === 'file' && (
                        <div>
                            <Text strong>Accepted File Types</Text>
                            <Input
                                placeholder="e.g. .pdf,.jpg"
                                value={editFieldAcceptedFileTypes}
                                onChange={(e) => setEditFieldAcceptedFileTypes(e.target.value)}
                                style={{ marginTop: 4 }}
                            />
                        </div>
                    )}

                    {(editFieldType === 'SelectCustomWidget' || editFieldType === 'SelectSingle' || editFieldType === 'SelectMultiple' || editFieldType === 'SelectMultiTags') && (
                        <div style={{ padding: '8px', border: `1px solid ${token.colorBorderSecondary}`, borderRadius: token.borderRadiusLG, background: token.colorFillAlter }}>
                            <Text strong style={{ fontSize: '12px' }}>Lookup Configuration (Optional)</Text>
                            <Space direction="vertical" style={{ width: '100%', marginTop: 8 }} size="small">
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <Switch size="small" checked={editLookupNoId} onChange={setEditLookupNoId} />
                                    <span style={{ fontSize: '12px' }}>Use value as ID (no_id)</span>
                                </div>
                                <Input 
                                    size="small" 
                                    placeholder="Lookup Schema (e.g. core)" 
                                    value={editLookupSchema} 
                                    onChange={(e) => setEditLookupSchema(e.target.value)} 
                                />
                                <Input 
                                    size="small" 
                                    placeholder="Lookup Table" 
                                    value={editLookupTable} 
                                    onChange={(e) => setEditLookupTable(e.target.value)} 
                                />
                                <Input 
                                    size="small" 
                                    placeholder="Lookup Column" 
                                    value={editLookupColumn} 
                                    onChange={(e) => setEditLookupColumn(e.target.value)} 
                                />
                                
                                <div style={{ padding: '4px', background: token.colorFillSecondary, borderRadius: '4px', marginTop: 4 }}>
                                    <div style={{ fontSize: '10px', color: token.colorTextSecondary, marginBottom: '2px' }}>CASCADING</div>
                                    <Space direction="vertical" style={{ width: '100%' }} size="small">
                                        <Input 
                                            size="small" 
                                            placeholder="Depends On (Field Name)" 
                                            value={editFieldDependsOn} 
                                            onChange={(e) => setEditFieldDependsOn(e.target.value)} 
                                        />
                                        <Input 
                                            size="small" 
                                            placeholder="Depends On Field" 
                                            value={editFieldDependsOnField} 
                                            onChange={(e) => setEditFieldDependsOnField(e.target.value)} 
                                        />
                                        <Input 
                                            size="small" 
                                            placeholder="Filter Column" 
                                            value={editFieldDependsOnColumn} 
                                            onChange={(e) => setEditFieldDependsOnColumn(e.target.value)} 
                                        />
                                    </Space>
                                </div>
                            </Space>
                        </div>
                    )}

                    {(!editLookupTable || (editFieldType !== 'SelectCustomWidget' && editFieldType !== 'SelectSingle' && editFieldType !== 'SelectMultiple' && editFieldType !== 'SelectMultiTags')) && (
                        <div>
                            <Text strong>Manual Options (comma separated)</Text>
                            <Input.TextArea
                                placeholder="e.g. apple, banana, cherry"
                                value={editFieldManualOptions}
                                onChange={(e) => setEditFieldManualOptions(e.target.value)}
                                rows={2}
                                style={{ marginTop: 4 }}
                            />
                        </div>
                    )}
                </Space>
            </Modal>
        </div>
    );
};

export default TestRJSFGenForm;
