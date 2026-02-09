import React, { useEffect, useState, useCallback } from 'react';
import { Card, Button, Input, Select, Switch, Drawer, Row, Col, message, Modal, Space, Radio, Alert, Typography } from 'antd';
const { Text } = Typography;
import { ThunderboltOutlined } from '@ant-design/icons';
import { widgetConfigs } from './widgets';
import AceEditor from 'react-ace';
// import 'ace-builds/webpack-resolver';
// import 'ace-builds/src-noconflict/mode-json';
// import 'ace-builds/src-noconflict/theme-monokai';
// import 'ace-builds/src-noconflict/worker-json';
import { supabase } from '@/core/lib/supabase';
import { useAuthStore } from '@/core/lib/store';
import DynamicForm from '@/core/components/DynamicForm';
import PageManager from './PageManager';
import FormGenerator from '../FormGenerator';


// Define interfaces for type safety
interface FieldInput {
  title: string;
  description: string;
  fieldName: string;
  fieldType: string;
  uiOrder: string;
  required: boolean;
  readonly: boolean;
  hidden: boolean;
  options: string[];
  placeholder: string;
  lookupTable: string;
  lookupColumn: string;
  acceptedFileTypes: string;
  // NEW: Enhanced enum configuration
  lookupSchema: string;           // Database schema (e.g., "organization", "external")
  lookupNoId: boolean;            // Use column value instead of id
  defaultValue: string;           // Default field value
  // Cascading select options
  dependsOn: string;              // Field name this depends on
  dependsOnField: string;         // Form field to get filter value from
  dependsOnColumn: string;        // Column to filter by in the lookup table
  // Static filters
  lookupFilters: Array<{          // Static filters for enum lookup
    key: string;
    operator: string;
    value: string;
  }>;
}

interface FormField extends FieldInput {
  fieldTitle: string;
}

interface Form {
  id: string;
  name: string;
  data_schema: any; // Replace with specific schema type if known
  ui_schema: any; // Replace with specific schema type if known
  data_config: any[]; // Replace with specific type if known
}

interface MasterObject {
  key: string;
  display_name?: string;
  foreign_key?: {
    source_table: string;
    display_column: string;
  };
}

interface FormBuilderProps {
  masterObjectInit?: MasterObject[];
  entitySchema?: string; // Format: "schema.entity_type" e.g., "external.contacts"
}

interface WidgetConfig {
  dataSchema: any; // Replace with specific schema type if known
  uiSchema: any; // Replace with specific schema type if known
  requiresOptions?: boolean;
  requiresLookup?: boolean;
  hasFileOptions?: boolean;
}

interface WidgetConfigs {
  [key: string]: WidgetConfig;
}
interface FormField extends FieldInput {
  fieldTitle: string;
}

const FormBuilder: React.FC<FormBuilderProps> = ({ masterObjectInit, entitySchema }) => {
  const { user, organization } = useAuthStore();

  console.log("mod", masterObjectInit);
  const [forms, setForms] = useState<Form[]>([]);
  const [generatedSchemas, setGeneratedSchemas] = useState<any | null>(null);
  const [saveMode, setSaveMode] = useState<'form' | 'record'>('form');
  const [isDrawerVisible, setIsDrawerVisible] = useState<boolean>(false);
  const [dataConfig, setDataConfig] = useState<any[]>([]);
  const [editItem, setEditItem] = useState<Form | null>(null);
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);
  const [dataSchema, setDataSchema] = useState<any>({
    type: "object",
    properties: {},
    required: [],
  });
  const [uiSchema, setUiSchema] = useState<any>({});
  const [fields, setFields] = useState<FormField[]>([]);
  const [fieldInput, setFieldInput] = useState<FieldInput>({
    title: '',
    description: '',
    fieldName: '',
    fieldType: 'Text',
    uiOrder: '',
    required: false,
    readonly: false,
    hidden: false,
    options: [],
    placeholder: '',
    lookupTable: '',
    lookupColumn: '',
    acceptedFileTypes: '.pdf',
    // New fields
    lookupSchema: '',
    lookupNoId: false,
    defaultValue: '',
    dependsOn: '',
    dependsOnField: '',
    dependsOnColumn: '',
    lookupFilters: [],
  });
  const [isSaveModalVisible, setIsSaveModalVisible] = useState<boolean>(false);
  const [saveFormName, setSaveFormName] = useState<string>('');
  const [formToSave, setFormToSave] = useState<any>(null);
  const currentConfig: WidgetConfig = widgetConfigs[fieldInput.fieldType];
  const showOptions = currentConfig?.requiresOptions;
  const showFileOptions = currentConfig?.hasFileOptions;
  const [showLookup, setShowLookup] = useState<boolean>(currentConfig?.requiresLookup || false);
  // Add after other useState declarations
  const [isPageManagerVisible, setIsPageManagerVisible] = useState<boolean>(false);
  const [uiLayout, setUiLayout] = useState<any[]>([]);
  const [skipEffect, setSkipEffect] = useState<boolean>(false);
  // FormGenerator modal state
  const [isFormGeneratorVisible, setIsFormGeneratorVisible] = useState<boolean>(false);

  const handleFieldChange = (key: keyof FieldInput, value: any) => {
    setFieldInput(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleFieldNameChange = (value: string) => {
    if (masterObjectInit) {
      const selectedField = masterObjectInit?.find(item => item.key === value);
      console.log("sfd", selectedField);
      setDataConfig(prevConfig => {
        const updatedConfig = prevConfig?.filter(item => item.key !== fieldInput.fieldName);
        if (selectedField) {
          return [...updatedConfig, selectedField];
        }
        return updatedConfig;
      });
      if (selectedField && selectedField?.foreign_key) {
        setFieldInput(prev => ({
          ...prev,
          fieldName: value,
          fieldType: "SelectSingle",
          lookupTable: selectedField.foreign_key?.source_table || '',
          lookupColumn: selectedField.foreign_key?.display_column || '',
        }));
        setShowLookup(true);
      } else {
        setFieldInput(prev => ({
          ...prev,
          fieldName: value,
          lookupTable: '',
          lookupColumn: '',
        }));
        setShowLookup(false);
      }
    }
  };

  const handleAddField = () => {
    console.log("gbv2");
    if (!fieldInput.fieldName.trim()) {
      message.error('Enter Field Name');
      return;
    }
    if (showLookup && !(fieldInput.lookupTable && fieldInput.lookupColumn)) {
      message.error('Enter LookUp Details');
      return;
    }

    const selectedField = masterObjectInit?.find(item => item.key === fieldInput.fieldName);
    const fieldTitle = selectedField?.display_name || fieldInput.fieldName;
    const formattedFieldName = fieldInput.fieldName.trim().replaceAll(' ', '_');

    const newField: FormField = {
      ...fieldInput,
      fieldTitle,
      fieldName: formattedFieldName,
      options: fieldInput.options.length ? fieldInput.options : [],
      lookupTable: fieldInput.lookupTable || '',
      lookupColumn: fieldInput.lookupColumn || '',
    };

    const newFields = [...fields, newField];
    setFields(newFields);

    // Update ui:layout to include new field in a default page
    const newUiLayout = uiLayout.length === 0 || uiLayout[0].length === 0
      ? [[[formattedFieldName]]]
      : [...uiLayout, [[formattedFieldName]]];
    setUiLayout(newUiLayout);

    updateSchemas(newFields);

    setFieldInput({
      title: fieldInput.title || '',
      description: fieldInput.description || '',
      fieldName: '',
      fieldType: 'Text',
      uiOrder: '',
      required: false,
      readonly: false,
      hidden: false,
      options: [],
      placeholder: '',
      lookupTable: '',
      lookupColumn: '',
      acceptedFileTypes: '.pdf',
      // Reset new fields
      lookupSchema: '',
      lookupNoId: false,
      defaultValue: '',
      dependsOn: '',
      dependsOnField: '',
      dependsOnColumn: '',
      lookupFilters: [],
    });
  };

  const updateSchemas = (updatedFields: FormField[], customLayout?: string[][][]) => {
    console.log("gbv");
    // Use customLayout if provided, otherwise use current uiLayout state
    const layoutToUse = customLayout || uiLayout;

    const newDataSchema: any = {
      type: 'object',
      title: fieldInput.title,
      description: fieldInput.description,
      required: [],
      properties: {},
      definitions: {},
    };
    const newUiSchema: any = {
      'ui:submitButtonOptions': {
        props: {
          disabled: false,
          className: 'ant-btn-variant-solid ant-btn-block',
        },
        norender: false,
        submitText: 'Save',
      },
      'ui:layout': layoutToUse.length > 0 && layoutToUse[0].length > 0 ? layoutToUse : [updatedFields.map(field => [field.fieldName])],
    };

    updatedFields.forEach(field => {
      const config = widgetConfigs[field.fieldType];
      if (!config) return;

      const fieldDataSchema: any = { ...config.dataSchema, title: field.fieldTitle };

      // Add default value if specified
      if (field.defaultValue) {
        fieldDataSchema.default = field.defaultValue;
      }

      if (config.requiresOptions && field.options?.length) {
        fieldDataSchema.enum = field.options;
      } else if (config.requiresLookup && field.lookupTable && field.lookupColumn) {
        // Build enhanced enum object with all options
        const enumConfig: any = {
          table: field.lookupSchema
            ? `${field.lookupSchema}.${field.lookupTable}`
            : field.lookupTable,
          column: field.lookupColumn,
        };

        // Add no_id flag if set
        if (field.lookupNoId) {
          enumConfig.no_id = true;
        }

        // Add cascading select dependencies
        if (field.dependsOn) {
          enumConfig.dependsOn = field.dependsOn;
          enumConfig.dependsOnField = field.dependsOnField || field.dependsOn;
          if (field.dependsOnColumn) {
            enumConfig.dependsOnColumn = field.dependsOnColumn;
          }
        }

        // Add static filters
        if (field.lookupFilters && field.lookupFilters.length > 0) {
          enumConfig.filters = field.lookupFilters;
        }

        fieldDataSchema.enum = enumConfig;
      }

      if (config.dataSchema.definitions) {
        newDataSchema.definitions = {
          ...newDataSchema.definitions,
          ...config.dataSchema.definitions,
        };
        delete fieldDataSchema.definitions;
      }

      newDataSchema.properties[field.fieldName] = fieldDataSchema;
      if (field.required) {
        newDataSchema.required.push(field.fieldName);
      }

      const fieldUiSchema = { ...config.uiSchema };
      if (field.placeholder) {
        fieldUiSchema['ui:placeholder'] = field.placeholder;
      }
      if (config.hasFileOptions && field.acceptedFileTypes) {
        fieldUiSchema['ui:options'] = {
          ...fieldUiSchema['ui:options'],
          accept: field.acceptedFileTypes,
        };
      }
      if (field.readonly) {
        fieldUiSchema['ui:readonly'] = true;
      }
      if (field.hidden) {
        fieldUiSchema['ui:widget'] = 'Hidden';
      }
      newUiSchema[field.fieldName] = fieldUiSchema;
    });

    setDataSchema(newDataSchema);
    setUiSchema(newUiSchema);
  };
  useEffect(() => {
    console.log("iud4");
    fetchForms();
  }, []);

  useEffect(() => {
    console.log("iud5");
    if (!skipEffect) {
      updateSchemas(fields);
    }
    setSkipEffect(false); // Reset after effect runs
  }, [fields, skipEffect]);

  const unflatten = (data: any) => {
    const result: any = {};
    for (const key in data) {
      if (key.includes('.')) {
        const parts = key.split('.');
        let current = result;
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          if (i === parts.length - 1) {
            current[part] = data[key];
          } else {
            current[part] = current[part] || {};
            current = current[part];
          }
        }
      } else {
        result[key] = data[key];
      }
    }
    return result;
  };

  const handleSaveRecord = async (values: any) => {
    let schemaName = 'public';
    let tableName = entitySchema || (dataSchema as any).db_schema?.table;

    if (tableName?.includes('.')) {
      const parts = tableName.split('.');
      schemaName = parts[0];
      tableName = parts[1];
    }

    if (!tableName) {
      return message.error('No target entity/table defined for this form');
    }

    // Unflatten dots for nested JSONB support
    const processedValues = unflatten(values);

    try {
      const { error } = await supabase
        .schema(schemaName)
        .from(tableName)
        .insert([{ ...processedValues, organization_id: organization?.id }]);

      if (error) throw error;
      message.success(`Record saved successfully to ${schemaName}.${tableName}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save record';
      message.error(errorMessage);
      console.error('❌ Record save error:', err);
    }
  };

  const onFinish = (values: any) => {
    console.log("Form Data", values);

    if (saveMode === 'record') {
      handleSaveRecord(values);
      return;
    }

    const payload = {
      data_schema: dataSchema,
      ui_schema: uiSchema,
      data_config: dataConfig,
    };

    setFormToSave(payload);
    setSaveFormName(selectedForm ? selectedForm.name : "");
    setIsSaveModalVisible(true);
  };

  const handleSaveForm = async () => {
    if (!saveFormName) {
      return message.error('Enter Form Name');
    }
    if (!organization?.id) {
      return message.error('Organization not found');
    }
    try {
      let upsertData: any = {
        name: saveFormName,
        data_schema: formToSave?.data_schema,
        ui_schema: formToSave?.ui_schema,
        data_config: formToSave?.data_config,
        organization_id: organization.id,
      };
      if (selectedForm && selectedForm.name === saveFormName) {
        upsertData.id = selectedForm.id;
      }
      const { data, error } = await supabase
        .schema('core').from('forms')
        .upsert([upsertData]);

      if (error) throw error;

      message.success(selectedForm && selectedForm.name === saveFormName ? 'Form updated successfully!' : 'Form saved successfully!');
      setIsSaveModalVisible(false);
      fetchForms();
      setSelectedForm(null);
      setEditItem(null);
      setFields([]);
      setDataSchema({
        type: "object",
        properties: {},
        required: [],
      });
      setUiSchema({});
      setDataConfig([]);
    } catch (error: any) {
      message.error(`Error saving/updating form: ${error.message}`);
    }
  };

  const fetchForms = async () => {
    try {
      const { data, error } = await supabase
        .schema('core').from('forms')
        .select('id, name, data_schema, ui_schema, data_config')
        .order('name', { ascending: true });
      if (error) throw error;
      setForms(data as Form[]);
    } catch (error: any) {
      message.error(`Error fetching forms: ${error.message}`);
    }
  };

  const handleFormChange = (formId: string) => {
    console.log("iud3");
    const form = forms.find((form) => form.id === formId);
    if (form) {
      setSelectedForm(form);
      setEditItem(form);
      setDataSchema(form.data_schema);
      setDataConfig(form.data_config || []);
      setUiSchema(form.ui_schema);
      setUiLayout(form.ui_schema['ui:layout'] || [[]]);

      // Reconstruct fields from data_schema and ui_schema
      const newFields: FormField[] = Object.keys(form.data_schema.properties || {}).map((fieldName) => {
        const dataSchemaField = form.data_schema.properties[fieldName] || {};
        const uiSchemaField = form.ui_schema[fieldName] || {};
        const enumConfig = dataSchemaField?.enum;

        // Parse table and schema from enum.table (e.g., "external.accounts" -> schema: "external", table: "accounts")
        let lookupSchema = '';
        let lookupTable = '';
        if (enumConfig?.table && typeof enumConfig.table === 'string') {
          if (enumConfig.table.includes('.')) {
            const parts = enumConfig.table.split('.');
            lookupSchema = parts[0];
            lookupTable = parts[1];
          } else {
            lookupTable = enumConfig.table;
          }
        }

        return {
          fieldName,
          fieldTitle: dataSchemaField.title || fieldName,
          fieldType:
            uiSchemaField['ui:widget'] === 'select' && enumConfig?.table
              ? 'Lookup-Select'
              : uiSchemaField['ui:widget'] === 'SelectableTags'
                ? 'SelectableTags'
                : uiSchemaField['ui:widget'] === 'SelectCustomWidget'
                  ? 'SelectSingle'
                  : uiSchemaField['ui:widget'] || 'Text',
          title: form.data_schema.title || '',
          description: form.data_schema.description || '',
          uiOrder: uiSchemaField['ui:order'] || '',
          required: form.data_schema.required?.includes(fieldName) || false,
          readonly: uiSchemaField['ui:readonly'] || false,
          hidden: uiSchemaField['ui:widget'] === 'hidden' || false,
          options: Array.isArray(enumConfig) ? enumConfig : [],
          placeholder: uiSchemaField['ui:placeholder'] || '',
          lookupTable: lookupTable,
          lookupColumn: enumConfig?.column || '',
          acceptedFileTypes: uiSchemaField['ui:options']?.accept || '.pdf',
          // NEW: Parse enhanced enum properties
          lookupSchema: lookupSchema,
          lookupNoId: enumConfig?.no_id || false,
          defaultValue: dataSchemaField.default || '',
          dependsOn: enumConfig?.dependsOn || '',
          dependsOnField: enumConfig?.dependsOnField || '',
          dependsOnColumn: enumConfig?.dependsOnColumn || '',
          lookupFilters: enumConfig?.filters || [],
        };
      });

      setFields(newFields);
      // Explicitly call updateSchemas to regenerate schemas
      updateSchemas(newFields);
    } else {
      console.log("iud2");
      setSelectedForm(null);
      setEditItem(null);
      setDataSchema({ type: 'object', properties: {}, required: [] });
      setUiSchema({});
      setUiLayout([[]]);
      setFields([]);
      setDataConfig([]);
    }
  };


  const initData = {
    "details2.companyname": "TDD",
    "details2.web": "gdgdgdrgd",
  };
  // Handler for FormGenerator callback
  const handleFormGeneratorGenerate = useCallback((schemas: any, entityName: string) => {
    // Extract title and description for form header
    const formTitle = schemas.dataSchema.title || '';
    const formDescription = schemas.dataSchema.description || '';

    // Set uiLayout from generated schema
    setUiLayout(schemas.uiSchema['ui:layout'] || [[]]);

    // Reconstruct fields from generated data_schema
    const newFields: FormField[] = Object.keys(schemas.dataSchema.properties || {}).map((fieldName) => {
      const prop = schemas.dataSchema.properties[fieldName] || {};
      const uiField = schemas.uiSchema[fieldName] || {};

      // Determine field type from schema properties
      // IMPORTANT: Check for enum lookup object FIRST (before ui:widget) 
      // to ensure SelectSingle is used for foreign key fields
      let fieldType = 'Text';
      if (prop.enum && typeof prop.enum === 'object' && 'table' in prop.enum) {
        // Foreign key with lookup - use SelectSingle which has requiresLookup: true
        fieldType = 'SelectSingle';
      } else if (prop.type === 'boolean') {
        fieldType = 'Checkboxes';
      } else if (prop.format === 'date') {
        fieldType = 'Date';
      } else if (prop.format === 'date-time') {
        fieldType = 'DateTime';
      } else if (prop.type === 'integer' || prop.type === 'number') {
        fieldType = 'Number';
      } else if (uiField['ui:widget']) {
        // Try to find matching widget config by ui:widget
        const widgetName = uiField['ui:widget'];
        const matchingType = Object.keys(widgetConfigs).find(key =>
          widgetConfigs[key].uiSchema?.['ui:widget'] === widgetName
        );
        fieldType = matchingType || 'Text';
      }

      // Parse lookup table (may be "schema.table" or just "table")
      let lookupSchema = '';
      let lookupTable = '';
      if (prop.enum?.table) {
        const tableParts = prop.enum.table.split('.');
        if (tableParts.length > 1) {
          lookupSchema = tableParts[0];
          lookupTable = tableParts[1];
        } else {
          lookupTable = tableParts[0];
        }
      }

      return {
        fieldTitle: prop.title || fieldName,
        fieldName,
        fieldType,
        title: formTitle,
        description: formDescription,
        uiOrder: '',
        required: schemas.dataSchema.required?.includes(fieldName) || false,
        readonly: uiField['ui:readonly'] || false,
        hidden: uiField['ui:widget'] === 'hidden',
        options: Array.isArray(prop.enum) ? prop.enum : [],
        placeholder: uiField['ui:placeholder'] || '',
        lookupTable: lookupTable,
        lookupColumn: prop.enum?.column || '',
        acceptedFileTypes: '.pdf',
        lookupSchema: lookupSchema,
        lookupNoId: prop.enum?.no_id || false,
        defaultValue: prop.default || '',
        dependsOn: prop.enum?.dependsOn || '',
        dependsOnField: prop.enum?.dependsOnField || '',
        dependsOnColumn: prop.enum?.dependsOnColumn || '',
        lookupFilters: prop.enum?.filters || [],
      };
    });

    // Set fields and regenerate schemas using updateSchemas
    setFields(newFields);

    // Update fieldInput title/description for future fields
    setFieldInput(prev => ({
      ...prev,
      title: formTitle,
      description: formDescription,
    }));

    // Call updateSchemas to properly reconstruct dataSchema and uiSchema with enum objects
    updateSchemas(newFields);

    setIsFormGeneratorVisible(false);
    message.success(`Loaded ${newFields.length} fields from ${entityName}`);
  }, []);

  console.log("iud6", uiSchema);
  return (
    <div className="space-y-6">
      <Row gutter={16}>
        <Col span={8}>
          <Row gutter={4} style={{ marginBottom: 8 }}>
            <Col span={12}>
              <Input
                placeholder="Title"
                value={fieldInput.title}
                onChange={(e) => handleFieldChange('title', e.target.value)}
              />
            </Col>
            <Col span={12}>
              <Input
                placeholder="Description"
                value={fieldInput.description}
                onChange={(e) => handleFieldChange('description', e.target.value)}
              />
            </Col>
          </Row>
          {/* Generate from Entity Button */}
          <Button
            type="dashed"
            icon={<ThunderboltOutlined />}
            onClick={() => setIsFormGeneratorVisible(true)}
            style={{ marginBottom: 8, width: '100%' }}
          >
            Generate from Entity Metadata
          </Button>
          <Card title="Add Form Field">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Row gutter={4}>
                  <Col span={12}>
                    {masterObjectInit ? (
                      <Select
                        showSearch
                        style={{ width: '100%' }}
                        placeholder="Select Field Name"
                        optionFilterProp="children"
                        onChange={handleFieldNameChange}
                        value={fieldInput.fieldName}
                      >
                        {masterObjectInit.map(item => (
                          <Select.Option key={item.key} value={item.key}>
                            {item.key}
                          </Select.Option>
                        ))}
                      </Select>
                    ) : (
                      <Input
                        placeholder="Field Name"
                        value={fieldInput.fieldName}
                        onChange={(e) => handleFieldChange('fieldName', e.target.value)}
                      />
                    )}
                  </Col>
                  <Col span={12}>
                    <Select showSearch
                      style={{ width: "100%" }}
                      value={fieldInput.fieldType}
                      placeholder="Select type"
                      onChange={(value) => handleFieldChange('fieldType', value)}
                    >
                      {Object.keys(widgetConfigs).map(type => (
                        <Select.Option key={type} value={type}>
                          {type.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                        </Select.Option>
                      ))}
                    </Select>
                  </Col>
                </Row>
                <Row gutter={4} className="mt-2">
                  <Col span={8}>
                    <Switch
                      checked={fieldInput.required}
                      onChange={(checked) => handleFieldChange('required', checked)}
                    />
                    <label>Req</label>
                  </Col>
                  <Col span={8}>
                    <Switch
                      checked={fieldInput.readonly}
                      onChange={(checked) => handleFieldChange('readonly', checked)}
                    />
                    <label>Readonly</label>
                  </Col>
                  <Col span={8}>
                    <Switch
                      checked={fieldInput.hidden}
                      onChange={(checked) => handleFieldChange('hidden', checked)}
                    />
                    <label>Hidden</label>
                  </Col>
                </Row>

                <Input
                  className="mt-2"
                  placeholder="Placeholder Text"
                  value={fieldInput.placeholder}
                  onChange={(e) => handleFieldChange('placeholder', e.target.value)}
                />

                <Input
                  className="mt-2"
                  placeholder="Default Value"
                  value={fieldInput.defaultValue}
                  onChange={(e) => handleFieldChange('defaultValue', e.target.value)}
                />

                {showOptions && (
                  <Input.TextArea
                    className="mt-2"
                    placeholder="Enter options (comma-separated)"
                    rows={3}
                    onChange={(e) => handleFieldChange('options', e.target.value.split(',').map(opt => opt.trim()).filter(Boolean))}
                  />
                )}

                {showLookup && (
                  <>
                    {/* Basic Lookup Row */}
                    <Row gutter={4} className="mt-2">
                      <Col span={6}>
                        <Input
                          placeholder="Schema"
                          value={fieldInput.lookupSchema}
                          onChange={(e) => handleFieldChange('lookupSchema', e.target.value)}
                        />
                      </Col>
                      <Col span={9}>
                        <Input
                          placeholder="Table"
                          value={fieldInput.lookupTable}
                          onChange={(e) => handleFieldChange('lookupTable', e.target.value)}
                        />
                      </Col>
                      <Col span={9}>
                        <Input
                          placeholder="Column"
                          value={fieldInput.lookupColumn}
                          onChange={(e) => handleFieldChange('lookupColumn', e.target.value)}
                        />
                      </Col>
                    </Row>

                    {/* No ID Toggle */}
                    <Row gutter={4} className="mt-2">
                      <Col span={12}>
                        <Switch
                          checked={fieldInput.lookupNoId}
                          onChange={(checked) => handleFieldChange('lookupNoId', checked)}
                        />
                        <label className="ml-2">Use value as ID (no_id)</label>
                      </Col>
                    </Row>

                    {/* Cascading Select Configuration */}
                    <div className="mt-2 p-2 bg-gray-50 rounded">
                      <label className="text-xs text-gray-500">Cascading Select (Optional)</label>
                      <Row gutter={4} className="mt-1">
                        <Col span={8}>
                          <Select
                            allowClear
                            style={{ width: '100%' }}
                            placeholder="Depends On"
                            value={fieldInput.dependsOn || undefined}
                            onChange={(value) => {
                              handleFieldChange('dependsOn', value || '');
                              handleFieldChange('dependsOnField', value || '');
                            }}
                          >
                            {fields.map(f => (
                              <Select.Option key={f.fieldName} value={f.fieldName}>
                                {f.fieldTitle || f.fieldName}
                              </Select.Option>
                            ))}
                          </Select>
                        </Col>
                        <Col span={8}>
                          <Input
                            placeholder="Form Field"
                            value={fieldInput.dependsOnField}
                            onChange={(e) => handleFieldChange('dependsOnField', e.target.value)}
                          />
                        </Col>
                        <Col span={8}>
                          <Input
                            placeholder="Filter Column"
                            value={fieldInput.dependsOnColumn}
                            onChange={(e) => handleFieldChange('dependsOnColumn', e.target.value)}
                          />
                        </Col>
                      </Row>
                    </div>

                    {/* Static Filters */}
                    <div className="mt-2 p-2 bg-gray-50 rounded">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label className="text-xs text-gray-500">Static Filters</label>
                      </div>
                    </div>
                  </>
                )}
                <Button type="primary" onClick={handleAddField} className="mt-2 w-full">
                  Add Field
                </Button>
              </div>
            </div>
          </Card>
        </Col>

        <Col span={16}>
          {/* Main preview area */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3>Form Preview</h3>
            <Space>
              <Button onClick={() => setIsPageManagerVisible(true)}>
                Manage Pages
              </Button>
              <Select
                style={{ width: 200 }}
                placeholder="Select a form to edit"
                onChange={handleFormChange}
                value={selectedForm?.id}
                allowClear
              >
                {forms.map(form => (
                  <Select.Option key={form.id} value={form.id}>{form.name}</Select.Option>
                ))}
              </Select>
            </Space>
          </div>

          {/* JSON Schema Editors */}
          <Card
            title="Schema Editor"
            extra={
              <Space>
                <Button onClick={() => setIsPageManagerVisible(true)} type="default" size="small">
                  Manage Pages
                </Button>
                <Button onClick={() => setIsDrawerVisible(true)} type="primary" size="small">
                  Show Form
                </Button>
              </Space>
            }
          >
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <h4 style={{ marginBottom: '8px' }}>Data Schema:</h4>
                <AceEditor
                  mode="json"
                  theme="monokai"
                  value={JSON.stringify(dataSchema, null, 2)}
                  onChange={(value) => {
                    try {
                      const parsedSchema = JSON.parse(value);
                      setDataSchema(parsedSchema);
                    } catch (error) {
                      // Invalid JSON, don't update
                    }
                  }}
                  editorProps={{ $blockScrolling: true }}
                  setOptions={{
                    tabSize: 2,
                    useSoftTabs: true,
                  }}
                  style={{ width: '100%', height: '500px' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ marginBottom: '8px' }}>UI Schema:</h4>
                <AceEditor
                  mode="json"
                  theme="monokai"
                  value={JSON.stringify(uiSchema, null, 2)}
                  onChange={(value) => {
                    try {
                      const parsedSchema = JSON.parse(value);
                      setUiSchema(parsedSchema);
                    } catch (error) {
                      // Invalid JSON, don't update
                    }
                  }}
                  editorProps={{ $blockScrolling: true }}
                  setOptions={{
                    tabSize: 2,
                    useSoftTabs: true,
                  }}
                  style={{ width: '100%', height: '500px' }}
                />
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Save Modal */}
      <Modal
        title="Save Form"
        open={isSaveModalVisible}
        onOk={handleSaveForm}
        onCancel={() => setIsSaveModalVisible(false)}
      >
        <Input
          placeholder="Form Name"
          value={saveFormName}
          onChange={(e) => setSaveFormName(e.target.value)}
        />
      </Modal>

      {/* Form Preview Drawer */}
      <Drawer
        width="50%"
        title="Form Preview"
        open={isDrawerVisible}
        onClose={() => setIsDrawerVisible(false)}
        footer={null}
      >
        <div style={{ marginBottom: 16 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Text strong>Save Mode:</Text>
              <Radio.Group
                value={saveMode}
                onChange={(e: any) => setSaveMode(e.target.value)}
                buttonStyle="solid"
              >
                <Radio.Button value="form">Form Definition</Radio.Button>
                <Radio.Button value="record">Entity Record</Radio.Button>
              </Radio.Group>
            </div>
            <Alert
              type="info"
              message={saveMode === 'form' ? "Saves the JSON Schema definition to core.forms" : `Inserts a new record into the target table: ${entitySchema || 'unknown'}`}
              showIcon
            />
          </Space>
        </div>
        <DynamicForm
          formData={initData}
          schemas={{ data_schema: dataSchema, ui_schema: uiSchema }}
          onFinish={onFinish}
        />
      </Drawer>

      {/* Page Manager Modal */}
      <PageManager
        visible={isPageManagerVisible}
        fields={fields}
        initialLayout={uiLayout}
        onSave={(newLayout) => {
          setUiLayout(newLayout);
          // Trigger schema update with new layout
          updateSchemas(fields, newLayout);
          setIsPageManagerVisible(false);
        }}
        onCancel={() => setIsPageManagerVisible(false)}
      />

      {/* Form Generator Modal */}
      <Modal
        title="Generate Form"
        open={isFormGeneratorVisible}
        footer={null}
        onCancel={() => setIsFormGeneratorVisible(false)}
        width={800}
      >
        <FormGenerator
          onGenerate={handleFormGeneratorGenerate}
          onClose={() => setIsFormGeneratorVisible(false)}
          defaultEntity={entitySchema}
        />
      </Modal>
    </div>
  );
};

export default FormBuilder;
