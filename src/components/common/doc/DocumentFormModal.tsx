import React, { useState, useEffect } from 'react';
import {
  Modal,
  Drawer,
  Form,
  Input,
  DatePicker,
  Button,
  Space,
  Row,
  Col,
  Card,
  Select,
  InputNumber,
  message,
  Spin,
  TimePicker,
} from 'antd';
import { DocumentForm } from './types/document';
import ItemsTable from './ItemsTable';
import SignatureWidget from './SignatureWidget';
import DisplayIdField from './DisplayIdField';
import dayjs from 'dayjs';
import { supabase } from '@/lib/supabase';

const { TextArea } = Input;
const { Option } = Select;

interface DocumentFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (formData: any) => void;
  documentForm: DocumentForm | null;
  initialData?: any;
  mode: 'create' | 'edit' | 'view';
  title: string;
}

interface LookupOption {
  value: string;
  label: string;
  data: any;
}

const DocumentFormModal: React.FC<DocumentFormModalProps> = ({
  visible,
  onClose,
  onSubmit,
  documentForm,
  initialData,
  mode,
  title,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [lookupOptions, setLookupOptions] = useState<Record<string, LookupOption[]>>({});
  const [loadingLookups, setLoadingLookups] = useState<Record<string, boolean>>({});
  const [dynamicServiceTypes, setDynamicServiceTypes] = useState<string[]>([]);
  const [signatureFields, setSignatureFields] = useState<any[]>([]);

  useEffect(() => {
    if (visible && initialData) {
      const formData = { ...initialData };

      // Process date and time fields
      Object.keys(formData).forEach(key => {
        if (
          (key.includes('Date') || key.includes('Time')) &&
          formData[key] !== undefined &&
          formData[key] !== null
        ) {
          const dateValue = dayjs(formData[key]);
          formData[key] = dateValue.isValid() ? dateValue : null;
        } else if (
          (key.includes('Date') || key.includes('Time')) &&
          (formData[key] === undefined || formData[key] === null || formData[key] === '')
        ) {
          formData[key] = null;
        }
      });

      form.setFieldsValue(formData);
      setItems(initialData.items || []);
    } else if (visible) {
      form.resetFields();
      setItems([]);
      setDynamicServiceTypes(documentForm?.data_schema?.properties?.serviceType?.enum || []);
    }
  }, [visible, initialData, form, documentForm]);

  // Load lookup options and signature fields when form becomes visible
  useEffect(() => {
    if (visible && documentForm?.data_schema?.properties) {
      loadLookupData();
      const signatures = Object.entries(documentForm.data_schema.properties)
        .filter(([_, property]: [string, any]) => property['x-signature-widget'])
        .map(([key, property]: [string, any]) => ({ key, property }));
      setSignatureFields(signatures);
    }
  }, [visible, documentForm]);

  const loadLookupData = async () => {
    if (!documentForm?.data_schema?.properties) return;

    const { properties } = documentForm.data_schema;
    const lookupFields = Object.entries(properties).filter(
      ([_, property]: [string, any]) => property['x-lookups']
    );

    for (const [fieldKey, property] of lookupFields) {
      const lookupConfig = property['x-lookups'];
      if (lookupConfig?.table) {
        await loadLookupOptions(fieldKey, lookupConfig);
      }
    }
  };

  const loadLookupOptions = async (fieldKey: string, lookupConfig: any) => {
    setLoadingLookups(prev => ({ ...prev, [fieldKey]: true }));

    try {
      let config: any = {
        main_table: {},
        joins: [],
        filters: {},
        ordering: {},
      };

      if (fieldKey === 'ticketId') {
        config = {
          main_table: {
            schema: 'public',
            name: 'tickets',
          },
          joins: [
            {
              type: 'LEFT',
              join_table: { schema: 'external', name: 'accounts' },
              on_clause: 'tickets.account_id = externalaccounts.id',
            },
            {
              type: 'LEFT',
              join_table: { schema: 'identity', name: 'users' },
              on_clause: 'tickets.assignee_id = identityusers.id',
            },
            {
              type: 'LEFT',
              join_table: { schema: 'external', name: 'service_assets' },
              on_clause: 'tickets.asset_id = externalservice_assets.id',
            },
          ],
          filters: {
            where_clause: `tickets.status != 'closed'`,
          },
          ordering: {
            order_by: 'tickets.display_id',
          },
        };
      } else {
        const tableParts = lookupConfig.table.split('.');
        const main_schema = tableParts.length > 1 ? tableParts[0] : 'public';
        const main_name = tableParts.length > 1 ? tableParts[1] : tableParts[0];

        config.main_table = {
          schema: main_schema,
          name: main_name,
        };
        // if (lookupConfig) {
          if (lookupConfig.filter) {
            config.filters = {
              where_clause: `is_active = true AND ${lookupConfig.filter}`,
            };
          } else {
            // config.filters = {
            //   where_clause: `is_active = true`,
            // };
          }
        // }

        config.ordering = {
          order_by: lookupConfig.labelColumn || 'name',
        };
      }

      // const { data, error } = await supabase.rpc('core_get_entity_data_with_multi_joins_v2', { config });
      const { data, error } = await supabase.schema('core').rpc('core_get_entity_data_v30', { config });

      if (error) throw error;

      const parsedData = data || [];
      const options: LookupOption[] = (parsedData || []).map((row: any) => {
        let mappedData = row;
        // console.log("tz",mappedData,fieldKey);
        if (fieldKey === 'ticketId') {
          mappedData = {
            ...row,
            account_name: row.externalaccounts?.name,
            client_name: row.externalaccounts?.name,
            client_email: row.externalaccounts?.details?.contact_email,
            client_address: row.externalaccounts?.details?.address,
            assignee_name: row.identityusers?.name,
            asset_display_id: row.externalservice_assets?.display_id,
          };
        }
        if (fieldKey === 'clientId') {
          mappedData = {
            ...row,
            account_name: row.accounts?.name,
            client_name: row.accounts?.name,
            client_email: row.accounts?.details?.contact_email,
            client_address: row.accounts?.details?.address,
          };
        }
        if (fieldKey === 'serviceOfferingId') {
          mappedData = {
            ...row,
            accounts: row.service_offerings
          };
        }
        console.log("mz",mappedData);
        return {
          value: getNestedValue(mappedData[fieldKey === 'ticketId' ? 'tickets' : 'accounts'], lookupConfig.valueColumn || 'id'),
          label: getNestedValue(mappedData[fieldKey === 'ticketId' ? 'tickets' : 'accounts'], lookupConfig.labelColumn || 'name'),
          data: mappedData,
        };
      });
      setLookupOptions(prev => ({ ...prev, [fieldKey]: options }));
    } catch (error) {
      console.error(`Error loading lookup options for ${fieldKey}:`, error);
      message.error(`Failed to load ${fieldKey} options`);
    } finally {
      setLoadingLookups(prev => ({ ...prev, [fieldKey]: false }));
    }
  };

  const loadDynamicServiceTypes = async (offeringId: string | null) => {
  // If no offeringId is selected, reset to the default service types
  if (!offeringId) {
    setDynamicServiceTypes(documentForm?.data_schema?.properties?.serviceType?.enum || []);
    return;
  }

  try {
    // 1. Fetch the service offering to get the array of service_type IDs
    const { data: offeringData, error: offeringError } = await supabase
      .schema('organization')
      .from('service_offerings')
      .select('service_types')
      .eq('id', offeringId) // This line was commented out and is crucial
      .single();

    if (offeringError) throw offeringError;

    const offeringServiceTypes = offeringData?.service_types || [];

    if (offeringServiceTypes.length > 0) {
      // 2. Use the IDs from the array to fetch the actual service type details
      const { data: serviceTypeDetails, error: detailsError } = await supabase
        .schema('organization')
        .from('service_types')
        .select('id, name, short_code')
        .in('id', offeringServiceTypes);

      if (detailsError) throw detailsError;

      // 3. Map the details to an array of short codes for the dropdown
      const serviceTypeMap = serviceTypeDetails.reduce((acc: Record<string, string>, item: any) => {
        acc[item.id] = item.short_code;
        return acc;
      }, {});

      const formattedServiceTypes = offeringServiceTypes.map(
        (type: string) => serviceTypeMap[type] || type
      );
      setDynamicServiceTypes(formattedServiceTypes);
    } else {
      // If the offering has no service types, clear the dynamic options
      setDynamicServiceTypes([]);
    }
  } catch (error) {
    console.error('Error loading service types:', error);
    // On error, revert to the default service types or an empty array
    setDynamicServiceTypes(documentForm?.data_schema?.properties?.serviceType?.enum || []);
    message.error('Failed to load service types.');
  }
};

  const getNestedValue = (obj: any, path: string): any => {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : '';
    }, obj);
  };

  const setNestedValue = (obj: any, path: string, value: any): void => {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  };

//   const handleLookupChange = (fieldKey: string, selectedValue: string, property: any) => {
//   const lookupConfig = property['x-lookups'];
//   const selectedOption = lookupOptions[fieldKey]?.find(opt => opt.value === selectedValue);

//   if (selectedOption && lookupConfig.fillFields) {
//     const currentValues = form.getFieldsValue();
//     lookupConfig.fillFields.forEach((fillConfig: any) => {
//       let sourceValue = getNestedValue(selectedOption.data, fillConfig.sourceColumn);
//       // ... (rest of the date/time handling code)
//       if (
//         (fillConfig.targetField.includes('Date') || fillConfig.targetField.includes('Time')) &&
//         sourceValue
//       ) {
//         const dateValue = dayjs(sourceValue);
//         sourceValue = dateValue.isValid() ? dateValue : null;
//       } else if (
//         (fillConfig.targetField.includes('Date') || fillConfig.targetField.includes('Time')) &&
//         !sourceValue
//       ) {
//         sourceValue = null;
//       }
//       setNestedValue(currentValues, fillConfig.targetField, sourceValue);
//     });

//     form.setFieldsValue(currentValues);
//   }

//   // New conditional check to trigger dynamic loading for service types
//   if (fieldKey === 'serviceOfferingId') {
//     // Pass the selected offering ID to the dynamic loader
//     loadDynamicServiceTypes(selectedValue);
//   }
// };

const handleLookupChange = (fieldKey: string, selectedValue: string, property: any) => {
  const lookupConfig = property['x-lookups'];
  const selectedOption = lookupOptions[fieldKey]?.find(opt => opt.value === selectedValue);

  // If a lookup is selected, check its configuration for fields to fill.
  if (selectedOption && lookupConfig.fillFields) {
    const currentValues = form.getFieldsValue();
    lookupConfig.fillFields.forEach((fillConfig: any) => {
      let sourceValue = getNestedValue(selectedOption.data, fillConfig.sourceColumn);

      // Handle date/time fields
      if (
        (fillConfig.targetField.includes('Date') || fillConfig.targetField.includes('Time')) &&
        sourceValue
      ) {
        const dateValue = dayjs(sourceValue);
        sourceValue = dateValue.isValid() ? dateValue : null;
      } else if (
        (fillConfig.targetField.includes('Date') || fillConfig.targetField.includes('Time')) &&
        !sourceValue
      ) {
        sourceValue = null;
      }

      // Special handling for the clientId lookup
      // if (fieldKey === 'clientId') {
      //   const targetFieldParts = fillConfig.targetField.split('.');
      //   if (targetFieldParts.length > 1) {
      //     const [parent, child] = targetFieldParts;
      //     if (!currentValues[parent]) {
      //       currentValues[parent] = {};
      //     }
      //     currentValues[parent][child] = sourceValue;
      //   } else {
      //     currentValues[fillConfig.targetField] = sourceValue;
      //   }
      // } else {
        setNestedValue(currentValues, fillConfig.targetField, sourceValue);
      // }
    });

    form.setFieldsValue(currentValues);
  }

  // Handle dynamic loading for service types
  if (fieldKey === 'serviceOfferingId') {
    loadDynamicServiceTypes(selectedValue);
  }
};

  const handleSubmit = async () => {
    try {
      setLoading(true);

      const values = await form.validateFields();
      const formData = { ...values };
      // Check for and auto-generate 'outTime' before submission
      if (
        documentForm?.data_schema?.properties?.outTime?.['x-auto-generate'] === 'on-submit'
      ) {
        // Set 'outTime' to the current local time in HH:mm:ss format
        formData.outTime = dayjs().format('HH:mm:ss');
      }
      // Convert dayjs objects back to strings
      Object.keys(formData).forEach(key => {
        if (formData[key] && typeof formData[key] === 'object' && dayjs.isDayjs(formData[key])) {
          if (key.includes('Date')) {
            formData[key] = formData[key].format('YYYY-MM-DD');
          } else if (key.includes('Time')) {
            formData[key] = formData[key].format('HH:mm:ss');
          }
        }
      });

      // Add items to form data
      formData.items = items;

      await onSubmit(formData);
      message.success('Document saved successfully!');
      onClose();
    } catch (error) {
      console.error('Form validation or submission failed:', error);
      if (error && (error as any).errorFields) {
        message.error('Please check the form for validation errors.');
      } else {
        message.error('An unexpected error occurred during submission.');
      }
    } finally {
      setLoading(false);
    }
  };

  const renderFormField = (key: string, property: any, required: boolean) => {
    const isAutoGenerated = property['x-auto-generate'] === 'on-submit';
    
    // Disable the field if it's auto-generated or the form is in view mode
    const commonProps = {
      disabled: mode === 'view' || isAutoGenerated,
    };

    // Skip items and signature - handled separately
    if (key === 'items' || property['x-signature-widget']) {
      return null;
    }

    if (property['x-lookups']) {
      const lookupConfig = property['x-lookups'];
      const options = lookupOptions[key] || [];
      const isLoading = loadingLookups[key];

      return (
        <Form.Item
          name={key}
          label={property.title}
          rules={[{ required, message: `${property.title} is required` }]}
        >
          <Select
            placeholder={`Select ${property.title}`}
            loading={isLoading}
            showSearch
            optionFilterProp="children"
            onChange={value => handleLookupChange(key, value, property)}
            {...commonProps}
          >
            {options.map(option => (
              <Option key={option.value} value={option.value}>
                {option.label}
              </Option>
            ))}
          </Select>
        </Form.Item>
      );
    }

    if (property.type === 'string' && property.format === 'date') {
      return (
        <Form.Item
          name={key}
          label={property.title}
          rules={[{ required, message: `${property.title} is required` }]}
        >
          <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" {...commonProps} />
        </Form.Item>
      );
    }
    
    // Handle time-only fields
    if (property.type === 'string' && property.format === 'time') {
      return (
        <Form.Item
          name={key}
          label={property.title}
          rules={[{ required, message: `${property.title} is required` }]}
        >
          <TimePicker style={{ width: '100%' }} format="HH:mm" {...commonProps} />
        </Form.Item>
      );
    }


    if (key === 'serviceType' && property['x-dynamic-options']) {
      return (
        <Form.Item
          name={key}
          label={property.title}
          rules={[{ required, message: `${property.title} is required` }]}
        >
          <Select placeholder={`Select ${property.title}`} {...commonProps}>
            {dynamicServiceTypes.map((option: string) => (
              <Option key={option} value={option}>
                {option}
              </Option>
            ))}
          </Select>
        </Form.Item>
      );
    }

    if (property.type === 'number') {
      return (
        <Form.Item
          name={key}
          label={property.title}
          rules={[{ required, message: `${property.title} is required` }]}
        >
          <InputNumber style={{ width: '100%' }} {...commonProps} />
        </Form.Item>
      );
    }
    if (property.enum && property.type === 'string') {
  return (
    <Form.Item
      name={key}
      label={property.title}
      rules={[{ required, message: `${property.title} is required` }]}
    >
      <Select placeholder={`Select ${property.title}`} {...commonProps}>
        {property.enum.map((option: string) => (
          <Option key={option} value={option}>
            {option}
          </Option>
        ))}
      </Select>
    </Form.Item>
  );
}

    if (property.type === 'string' && (key === 'notes' || key === 'description')) {
      return (
        <Form.Item
          name={key}
          label={property.title}
          rules={[{ required, message: `${property.title} is required` }]}
        >
          <TextArea rows={3} {...commonProps} />
        </Form.Item>
      );
    }

    if (property.type === 'object') {
      const objectFields = Object.entries(property.properties || {}).map(
        ([nestedKey, nestedProperty]: [string, any]) => (
          <Form.Item
            key={`${key}.${nestedKey}`}
            name={[key, nestedKey]}
            label={nestedProperty.title}
            rules={[
              {
                required: property.required?.includes(nestedKey),
                message: `${nestedProperty.title} is required`,
              },
            ]}
          >
            {nestedProperty.type === 'string' && nestedKey === 'address' ? (
              <TextArea rows={2} {...commonProps} />
            ) : (
              <Input {...commonProps} />
            )}
          </Form.Item>
        )
      );

      return (
        <Card title={property.title} size="small" style={{ marginBottom: 16 }}>
          {objectFields}
        </Card>
      );
    }

    if (property.type === 'string') {
      return (
        <Form.Item
          name={key}
          label={property.title}
          rules={[{ required, message: `${property.title} is required` }]}
        >
          <Input {...commonProps} />
        </Form.Item>
      );
    }

    return null;
  };

  const renderFieldsFromLayout = () => {
    if (!documentForm?.data_schema?.properties || !documentForm?.ui_schema?.['ui:layout']) {
      return renderFormFieldsDefault();
    }

    const { properties, required = [] } = documentForm.data_schema;
    const layout = documentForm.ui_schema['ui:layout'];

    return layout.map((row: string[], rowIndex: number) => (
      <Row gutter={16} key={rowIndex}>
        {row.map((fieldPath: string) => {
          const fieldKeys = fieldPath.split('.');
          const rootKey = fieldKeys[0];
          const property = properties[rootKey];

          if (!property) return null;

          if (fieldKeys.length > 1) {
            const nestedKey = fieldKeys[1];
            const nestedProperty = property.properties?.[nestedKey];

            if (!nestedProperty) return null;

            const isRequired = property.required?.includes(nestedKey) || false;
            const span = 24 / row.length;

            return (
              <Col span={span} key={fieldPath}>
                <Form.Item
                  name={[rootKey, nestedKey]}
                  label={nestedProperty.title}
                  rules={[{ required: isRequired, message: `${nestedProperty.title} is required` }]}
                >
                  {nestedProperty.type === 'string' && nestedKey === 'address' ? (
                    <TextArea rows={2} disabled={mode === 'view'} />
                  ) : (
                    <Input disabled={mode === 'view'} />
                  )}
                </Form.Item>
              </Col>
            );
          }

          const isRequired = required.includes(rootKey);
          const span = 24 / row.length;

          return (
            <Col span={span} key={fieldPath}>
              {renderFormField(rootKey, property, isRequired)}
            </Col>
          );
        })}
      </Row>
    ));
  };

  const renderFormFieldsDefault = () => {
    if (!documentForm?.data_schema?.properties) {
      return null;
    }

    const { properties, required = [] } = documentForm.data_schema;
    const fields: React.ReactNode[] = [];

    Object.entries(properties).forEach(([key, property]: [string, any]) => {
      const field = renderFormField(key, property, required.includes(key));
      if (field) {
        fields.push(
          <Col span={12} key={key}>
            {field}
          </Col>
        );
      }
    });

    return <Row gutter={16}>{fields}</Row>;
  };

  if (!documentForm) {
    return (
      <Modal
        title="Loading..."
        open={visible}
        onCancel={onClose}
        footer={null}
      >
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
          <p style={{ marginTop: 16 }}>Loading document form schema...</p>
        </div>
      </Modal>
    );
  }

  const hasItems = documentForm.data_schema.properties?.items;
  const signatureCount = signatureFields.length;
  const signatureColSpan = signatureCount > 0 ? 24 / signatureCount : 0;

  return (
    <Drawer
      title={title}
      open={visible}
      onClose={onClose}
      width={1000}
      footer={
        mode === 'view' ? (
          <Button onClick={onClose}>Close</Button>
        ) : (
          <Space>
            <Button onClick={onClose}>Cancel</Button>
            <Button type="primary" onClick={handleSubmit} loading={loading}>
              {mode === 'create' ? 'Create' : 'Update'}
            </Button>
          </Space>
        )
      }
    >
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="display_id"
              label="Document Number"
              rules={[{ required: true, message: 'Document number is required' }]}
            >
              <DisplayIdField
                entityType={documentForm?.type_id}
                value={form.getFieldValue('display_id')}
                onChange={val => form.setFieldsValue({ display_id: val })}
                formData={form.getFieldsValue(true)}
                disabled={mode === 'view'}
                placeholder="Auto-generated document number"
              />
            </Form.Item>
          </Col>
        </Row>

        {renderFieldsFromLayout()}

        {hasItems && (
          <Row gutter={16}>
            <Col span={24}>
              <Card title="Items" size="small" style={{ marginBottom: 16 }}>
                <ItemsTable
                  items={items}
                  onChange={setItems}
                  schema={documentForm.data_schema.properties.items?.items}
                  disabled={mode === 'view'}
                />
              </Card>
            </Col>
          </Row>
        )}

        {signatureCount > 0 && (
          <Row gutter={16}>
            {signatureFields.map(signatureField => (
              <Col span={signatureColSpan} key={signatureField.key}>
                <Form.Item name={signatureField.key} label={signatureField.property.title}>
                  <SignatureWidget disabled={mode === 'view'} />
                </Form.Item>
              </Col>
            ))}
          </Row>
        )}
      </Form>
    </Drawer>
  );
};

export default DocumentFormModal;