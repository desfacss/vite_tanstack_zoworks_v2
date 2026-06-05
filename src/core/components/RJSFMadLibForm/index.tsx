import Form from "@rjsf/antd";
import validator from "@rjsf/validator-ajv8";
import { Button, message, Space, Spin, Typography, Select, Input, Switch, DatePicker, Collapse, Row, Col, theme as antdTheme } from "antd";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { useAuthStore, useThemeStore } from "../../lib/store";
import Widgets from "../DynamicForm/Widgets";
import { debounce, get } from "lodash";
import { FieldTemplateProps, ObjectFieldTemplateProps } from "@rjsf/utils";

// --- Interfaces ---

interface CustomSubmitButton {
  label: string;
  variant?: 'primary' | 'default' | 'dashed' | 'link' | 'text';
  icon?: string;
  className?: string;
  defaultValues?: { [key: string]: any };
}

interface RJSFCoreFormProps {
  schema: {
    data_schema: any;
    ui_schema?: any;
    db_schema?: {
      table: string;
      schema?: string;
    };
  };
  formData?: any;
  updateId?: string | number;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
  entityType?: string;
  entitySchema?: string;
}

interface FilterType {
  key: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'is' | 'like' | 'ilike';
  value: any;
}

interface EnumSchema {
  table: string;
  column: string;
  schema?: string;
  filters?: FilterType[];
  filter?: { [key: string]: any };
  no_id?: boolean;
  dependsOn?: string;
  dependsOnField?: string;
  dependsOnColumn?: string;
  display_column?: string;
}

// --- Utils ---

const applyFilter = (query: any, filter: FilterType): any => {
  const { key, operator, value } = filter;
  switch (operator) {
    case 'eq': return query.eq(key, value);
    case 'neq': return query.neq(key, value);
    case 'gt': return query.gt(key, value);
    case 'gte': return query.gte(key, value);
    case 'lt': return query.lt(key, value);
    case 'lte': return query.lte(key, value);
    case 'in': return query.in(key, Array.isArray(value) ? value : [value]);
    case 'is': return query.is(key, value);
    case 'like': return query.like(key, value);
    case 'ilike': return query.ilike(key, value);
    default: return query;
  }
};

const transformUiSchema = (uiSchema: any, dataSchemaProperties: string[]) => {
  const { "ui:layout": layout, ...rest } = uiSchema || {};

  if (!layout) {
    return {
      ...rest,
      "ui:order": dataSchemaProperties,
    };
  }

  const uiOrder: string[] = [];
  const pageFields = layout.map((page: any[]) => {
    const pageFieldsInner: string[] = [];
    page?.forEach((row: any) => {
      if (Array.isArray(row)) {
        row.forEach((field: string) => {
          if (!uiOrder.includes(field)) uiOrder.push(field);
          if (!pageFieldsInner.includes(field)) pageFieldsInner.push(field);
        });
      } else if (typeof row === 'object' && row !== null) {
        Object.keys(row).forEach((field: string) => {
          if (!uiOrder.includes(field)) uiOrder.push(field);
          if (!pageFieldsInner.includes(field)) pageFieldsInner.push(field);
        });
      }
    });
    return pageFieldsInner;
  });

  dataSchemaProperties?.forEach((prop) => {
    if (!uiOrder?.includes(prop)) uiOrder?.push(prop);
  });

  return {
    ...rest,
    "ui:order": uiOrder,
    pageFields,
  };
};

const unflattenObject = (obj: any): any => {
  const result: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      if (key.includes('.')) {
        const parts = key.split('.');
        let current = result;
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          if (i === parts.length - 1) {
            current[part] = obj[key];
          } else {
            if (!(part in current) || typeof current[part] !== 'object' || current[part] === null) {
              current[part] = {};
            }
            current = current[part];
          }
        }
      } else {
        result[key] = obj[key];
      }
    }
  }
  return result;
};

// --- Custom Templates for Mad Libs UI ---

// --- Custom Templates for Mad Libs UI ---

const MadLibsObjectTemplate = (props: ObjectFieldTemplateProps) => {
  const { isDarkMode, currentPage = 0, referencedKeys } = props.registry.formContext || {};
  const textColor = isDarkMode ? "#f3f4f6" : "#1f2937";

  const sentenceTemplate = props.uiSchema?.["ui:sentence"];
  const layout = props.uiSchema?.["ui:layout"];

  // Render helper function for sentence template
  const renderSentenceTemplate = (template: string) => {
    const parts = template.split(/(\{.*?\})/g);
    const leftoverProperties = props.properties.filter(p => !referencedKeys.has(p.name));

    return (
      <div style={{ width: '100%' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '8px 12px' }}>
          {parts.map((part, index) => {
            if (part.startsWith("{") && part.endsWith("}")) {
              const fieldKey = part.slice(1, -1);
              const prop = props.properties.find(p => p.name === fieldKey);
              return prop ? prop.content : null;
            }
            return part ? <span key={index} style={{ color: isDarkMode ? "#d1d5db" : "#4b5563" }}>{part}</span> : null;
          })}
        </div>

        {leftoverProperties.length > 0 && (
          <Collapse 
            ghost
            style={{ 
              marginTop: '24px', 
              width: '100%', 
              borderTop: `1px solid ${isDarkMode ? '#303030' : '#e5e7eb'}`, 
              paddingTop: '16px' 
            }}
            items={[{
              key: 'leftovers',
              label: (
                <Typography.Text type="secondary" strong style={{ fontSize: '13px', color: isDarkMode ? '#9ca3af' : '#4b5563' }}>
                  Additional Attributes ({leftoverProperties.length})
                </Typography.Text>
              ),
              children: (
                <Row gutter={[16, 20]} style={{ padding: '8px 4px' }}>
                  {leftoverProperties.map((p) => (
                    <Col key={p.name} xs={24} sm={12} md={8}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <Typography.Text type="secondary" style={{ fontSize: '12px', color: isDarkMode ? '#888' : '#666', fontWeight: 500 }}>
                          {p.label} {p.required && <span style={{ color: '#ff4d4f' }}>*</span>}
                        </Typography.Text>
                        <div style={{ minWidth: '100px' }}>{p.content}</div>
                      </div>
                    </Col>
                  ))}
                </Row>
              )
            }]}
          />
        )}
      </div>
    );
  };

  // Render layout grouped rows
  const renderLayoutRows = (layoutData: any[]) => {
    const currentPageLayout = layoutData[currentPage] || layoutData;
    const renderedKeys = new Set<string>();

    return (
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {currentPageLayout.map((row: any, rowIndex: number) => {
          const rowFields = Array.isArray(row) ? row : Object.keys(row);
          rowFields.forEach(k => renderedKeys.add(k));

          return (
            <div 
              key={rowIndex} 
              style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                alignItems: 'baseline', 
                gap: '8px 12px',
                paddingBottom: '8px',
                borderBottom: rowIndex < currentPageLayout.length - 1 ? `1px dashed ${isDarkMode ? '#303030' : '#f0f0f0'}` : 'none'
              }}
            >
              {rowFields.map((fieldName: string) => {
                const prop = props.properties.find(p => p.name === fieldName);
                return prop ? prop.content : null;
              })}
            </div>
          );
        })}

        {/* Render any fields missing from layout */}
        {props.properties.filter(p => !renderedKeys.has(p.name)).length > 0 && (
          <div style={{ width: '100%', marginTop: '12px', borderTop: `1px dashed ${isDarkMode ? '#303030' : '#e5e7eb'}`, paddingTop: '12px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 12px', alignItems: 'baseline' }}>
              {props.properties.filter(p => !renderedKeys.has(p.name)).map(p => p.content)}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div 
      className="mad-libs-sentence-container"
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "baseline",
        gap: "8px 12px",
        lineHeight: "2.5",
        fontSize: "16px",
        color: textColor,
        padding: "20px",
        background: isDarkMode ? "#1f1f1f" : "#f9fafb",
        borderRadius: "8px",
        border: `1px solid ${isDarkMode ? '#303030' : '#e5e7eb'}`
      }}
    >
      {sentenceTemplate ? (
        renderSentenceTemplate(sentenceTemplate)
      ) : layout ? (
        renderLayoutRows(layout)
      ) : (
        props.properties.map((property) => property.content)
      )}
    </div>
  );
};

const MadLibsFieldTemplate = (props: FieldTemplateProps) => {
  const { id, children, rawErrors, uiSchema, schema, label, registry, required } = props;
  const { isDarkMode, referencedKeys } = registry.formContext || {};

  // Render hidden fields as nothing
  if (uiSchema?.["ui:widget"] === "hidden" || uiSchema?.["ui:widget"] === "Hidden") {
    return null;
  }

  // Generate natural language label from field name/key
  const cleanLabel = (label || "")
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/\bId\b/gi, '')
    .toLowerCase()
    .trim();

  let prefixText = uiSchema?.["ui:options"]?.prefixText || uiSchema?.prefixText;
  let suffixText = uiSchema?.["ui:options"]?.suffixText || uiSchema?.suffixText || "";

  // If a sentence template is defined, we completely suppress the default labels/prefixes!
  // Fallbacks are ONLY rendered when no sentence template is defined.
  const hasSentence = !!referencedKeys && referencedKeys.size > 0;

  if (prefixText === undefined) {
    if (hasSentence) {
      prefixText = "";
    } else {
      const isBool = schema.type === "boolean";
      prefixText = isBool ? `is ${cleanLabel}` : `with ${cleanLabel} set to`;
    }
  }

  const hasValue = props.formData !== undefined && props.formData !== null && props.formData !== "";
  
  // Extract field name from id (e.g. root_first_name -> first_name)
  const fieldName = id.replace(/^root_/, '');
  
  // A field is an additional attribute field if there is a sentence template and the field is not referenced in it.
  const isAdditionalAttribute = !!referencedKeys && referencedKeys.size > 0 && !referencedKeys.has(fieldName);

  // Check if this is a checkbox field
  const isCheckbox = schema.type === "boolean" || uiSchema?.["ui:widget"] === "checkbox";

  return (
    <span 
      id={id}
      style={{ 
        display: 'inline-flex', 
        alignItems: 'baseline', 
        gap: '4px', 
        margin: '0 4px',
        flexWrap: 'wrap'
      }}
    >
      {prefixText && <span className="mad-libs-label">{prefixText}</span>}
      <span className={`mad-libs-blank-container ${hasValue ? 'field-active' : ''} ${isAdditionalAttribute ? 'has-floating-label' : ''}`}>
        {isAdditionalAttribute && <span className="mad-libs-field-label">{cleanLabel}</span>}
        <span 
          className={`mad-libs-input-blank ${isCheckbox ? 'no-underline' : ''}`}
          style={{ 
            display: 'inline-block',
            minWidth: '80px',
            verticalAlign: 'middle'
          }}
        >
          {children}
        </span>
        {required && <span style={{ color: '#ff4d4f', marginLeft: '2px', fontWeight: 'bold', fontSize: '14px' }} title="Required">*</span>}
      </span>
      {suffixText && <span className="mad-libs-label">{suffixText}</span>}
      {rawErrors && rawErrors.length > 0 && (
        <span style={{ color: '#dc2626', fontSize: '12px', marginLeft: '4px' }}>
          ({rawErrors.join(", ")})
        </span>
      )}
    </span>
  );
};

// --- Custom Mad Libs Styled Widgets ---
// We override selected widgets to render in a borderless, underlined fashion

const MadLibSelectCustomWidget: React.FC<any> = (props) => {
  const { id, options, value, onChange, onBlur, onFocus, readonly, schema, registry } = props;
  const { enumOptions, placeholder, allowClear, mode: optionMode, showSearch, optionFilterProp } = options;
  const mode = optionMode || (schema?.type === "array" ? "multiple" : undefined);
  const { isDarkMode } = registry.formContext || {};

  return (
    <Select
      id={id}
      value={value}
      onChange={readonly ? undefined : (val) => onChange(val)}
      onBlur={() => onBlur(id, value)}
      onFocus={() => onFocus(id, value)}
      placeholder={placeholder || "..."}
      allowClear={allowClear ?? true}
      mode={mode}
      showSearch={showSearch ?? true}
      optionFilterProp={optionFilterProp || "children"}
      variant="borderless"
      dropdownStyle={{
        backgroundColor: isDarkMode ? "#1f1f1f" : "#ffffff",
      }}
      disabled={readonly}
      options={enumOptions?.map((opt: any) => ({
        label: opt.label || opt.value,
        value: opt.value
      }))}
    />
  );
};

const MadLibTextWidget: React.FC<any> = (props) => {
  const { id, value, onChange, onBlur, onFocus, readonly, schema, placeholder } = props;
  return (
    <Input
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={() => onBlur(id, value)}
      onFocus={() => onFocus(id, value)}
      placeholder={placeholder || schema?.title || "..."}
      variant="borderless"
      disabled={readonly}
    />
  );
};

const MadLibSwitchWidget: React.FC<any> = (props) => {
  const { id, value, onChange, readonly } = props;
  return (
    <Switch
      id={id}
      checked={!!value}
      onChange={(val) => onChange(val)}
      disabled={readonly}
      size="small"
      style={{ verticalAlign: 'middle', margin: '0 4px' }}
    />
  );
};

// Combine and map widgets
const MadLibWidgets = {
  ...Widgets,
  SelectCustomWidget: MadLibSelectCustomWidget,
  TextWidget: MadLibTextWidget,
  CheckboxWidget: MadLibSwitchWidget,
  CheckboxesWidget: MadLibSwitchWidget,
  select: MadLibSelectCustomWidget,
  text: MadLibTextWidget,
  checkbox: MadLibSwitchWidget,
};

// --- RJSFMadLibForm Component ---

const RJSFMadLibForm: React.FC<RJSFCoreFormProps> = ({
  schema: inputSchema,
  formData: initialFormDataProp,
  updateId,
  onSuccess,
  onError,
  entityType: fallbackEntityType,
  entitySchema: fallbackEntitySchema
}) => {
  const [schema, setSchema] = useState<any>();
  const [loading, setLoading] = useState<boolean>(true);
  const [localFormData, setLocalFormData] = useState<any>({});
  const [enumCache, setEnumCache] = useState<{ [key: string]: any[] }>({});
  const [submitClicked, setSubmitClicked] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(0);

  const { organization, user, location } = useAuthStore();
  const queryClient = useQueryClient();
  const activeButtonDefaultsRef = useRef<{ [key: string]: any } | null>(null);

  // --- Fetch Logic ---

  const fetchDataForDropdown = useCallback(async (
    schemaParam: string | undefined,
    tableParam: string,
    column: string,
    filters: FilterType[] = [],
    noId: boolean = false,
    displayColumn?: string
  ): Promise<any[]> => {
    try {
      const cacheKey = JSON.stringify({ schemaParam, tableParam, column, filters, noId, displayColumn });
      if (enumCache[cacheKey]) return enumCache[cacheKey];

      let actualSchema = schemaParam || 'public';
      let actualTable = tableParam;

      if (tableParam.includes('.')) {
        [actualSchema, actualTable] = tableParam.split('.');
      }

      const selectDisplayColumn = displayColumn || column;
      let selectColumns = noId ? selectDisplayColumn : `id, ${selectDisplayColumn}`;

      if (displayColumn && displayColumn.includes('.')) {
        const [relation, displayField] = displayColumn.split('.');
        selectColumns = `id, ${relation}(${displayField})`;
      } else {
        const normalizedColumn = selectDisplayColumn?.replace('-', '.');
        const displaySelect = normalizedColumn.includes('.') ? `${normalizedColumn} ->>` : normalizedColumn;
        selectColumns = noId ? displaySelect : `id, ${displaySelect}`;
      }

      let query = supabase.schema(actualSchema).from(actualTable).select(selectColumns);

      if (!selectColumns.includes('organization_id')) {
        query = supabase.schema(actualSchema).from(actualTable).select(`${selectColumns}, organization_id`);
      }

      if (organization?.id) {
        query = query.or(`organization_id.eq.${organization.id},organization_id.is.null`);
      } else {
        query = query.is('organization_id', null);
      }

      filters.forEach(f => { query = applyFilter(query, f); });

      let { data, error } = await query;

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        if (organization?.id) {
          const tenantSpecificData = data.filter((item: any) => item.organization_id === organization.id);
          if (tenantSpecificData.length > 0) {
            data = tenantSpecificData;
          } else {
            data = data.filter((item: any) => item.organization_id === null);
          }
        } else {
          data = data.filter((item: any) => item.organization_id === null);
        }

        const uniqueOptions = new Map();
        data.forEach((item: any) => {
          const val = noId ? item[column] : item.id;
          const label = item[displayColumn || column] || item.id;
          const key = `${val}:${label}`;
          if (!uniqueOptions.has(key)) {
            uniqueOptions.set(key, item);
          }
        });
        data = Array.from(uniqueOptions.values());
      }

      setEnumCache(prev => ({ ...prev, [cacheKey]: data || [] }));
      return data || [];
    } catch (err) {
      console.error("Error fetching dropdown data:", err);
      return [];
    }
  }, [organization, enumCache]);

  const replaceEnums = useCallback(async (obj: any, formData: any = {}): Promise<void> => {
    if (!obj) return;
    const keys = Object.keys(obj);
    const promises: Promise<void>[] = [];

    for (const key of keys) {
      const enumValue = obj[key]?.enum as EnumSchema;
      if (enumValue && typeof enumValue === 'object' && enumValue.table && enumValue.column) {
        const noId = enumValue.no_id || false;
        let filterConditions = [...(enumValue.filters || [])] as FilterType[];

        if (enumValue.filter) {
          if (Array.isArray(enumValue.filter)) {
            enumValue.filter.forEach((f: any) => {
              if (f.key && f.operator) {
                filterConditions.push(f as FilterType);
              }
            });
          } else if (typeof enumValue.filter === 'object') {
            Object.entries(enumValue.filter).forEach(([k, v]) => {
              filterConditions.push({ key: k, operator: 'eq', value: v });
            });
          }
        }

        if (enumValue.dependsOnColumn && formData[enumValue.dependsOnField || '']) {
          filterConditions.push({
            key: enumValue.dependsOnColumn,
            operator: 'eq',
            value: formData[enumValue.dependsOnField || ''],
          });
        }

        promises.push(
          fetchDataForDropdown(enumValue.schema, enumValue.table, enumValue.column, filterConditions, noId, enumValue.display_column).then((options) => {
            obj[key] = {
              ...obj[key],
              enum: options?.map((item: any) => {
                return noId ? item[enumValue.column] : item.id;
              }),
              enumNames: options?.map((item: any) => {
                return item[enumValue.display_column || enumValue.column] || item.id;
              }),
            };
          })
        );
      } else if (typeof obj[key] === "object" && obj[key] !== null) {
        promises.push(replaceEnums(obj[key], formData));
      }
    }
    await Promise.all(promises);
  }, [fetchDataForDropdown]);

  // --- Mutation ---

  const upsertMutation = useMutation({
    mutationFn: async (values: any) => {
      if (!organization?.id || !user?.id) throw new Error("Authentication required");

      let tableName = inputSchema.db_schema?.table || fallbackEntityType;
      let schemaName = inputSchema.db_schema?.schema || fallbackEntitySchema;

      if (!tableName) throw new Error("Table name is required for upsert");

      let fullTableName = tableName;
      if (!tableName.includes('.') && schemaName) {
        fullTableName = `${schemaName}.${tableName}`;
      } else if (!tableName.includes('.') && !schemaName) {
        fullTableName = `public.${tableName}`;
      }

      if (fullTableName === 'public.dynamic' && fallbackEntityType) {
        fullTableName = fallbackEntitySchema ? `${fallbackEntitySchema}.${fallbackEntityType}` : `public.${fallbackEntityType}`;
      }

      const unflattenedValues = unflattenObject(values);
      const dataPayload = {
        ...unflattenedValues,
        ...(updateId ? { id: updateId } : {}),
        organization_id: organization.id,
        updated_by: user.id,
        ...(!updateId ? { created_by: user.id } : {}),
        ...(!updateId && location?.id ? { location_id: location.id } : {}),
      };

      const { data, error } = await supabase.schema('core').rpc("api_new_core_upsert_data", {
        table_name: fullTableName,
        data: dataPayload
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      const type = inputSchema.db_schema?.table || fallbackEntityType || 'entity';
      queryClient.invalidateQueries({ queryKey: [type, organization?.id] });
      message.success(`${type} saved successfully via Mad Lib form`);
      if (onSuccess) onSuccess(data);
    },
    onError: (error: any) => {
      message.error(error.message || `Failed to save record`);
      if (onError) onError(error);
    },
  });

  // --- Handlers ---

  const onSubmit = (data: any) => {
    setSubmitClicked(true);
    if (!isMultiPage || currentPage === totalPages - 1) {
      const finalFormData = {
        ...data.formData,
        ...(activeButtonDefaultsRef.current || {}),
      };
      upsertMutation.mutate(finalFormData);
      activeButtonDefaultsRef.current = null;
    }
  };

  const handleCustomSubmit = (defaults: any) => (e: React.MouseEvent) => {
    e.preventDefault();
    activeButtonDefaultsRef.current = defaults;

    const formElement = document.getElementById('rjsf-madlib-form');
    if (formElement) {
      const submitButton = formElement.querySelector('button[type="submit"]') as HTMLButtonElement;
      if (submitButton) {
        submitButton.click();
      } else {
        const event = new Event('submit', { cancelable: true, bubbles: true });
        formElement.dispatchEvent(event);
      }
    }
  };

  const debouncedHandleChange = useMemo(
    () => debounce((data: any) => {
      if (data.formData) {
        setLocalFormData(data.formData);
      }
    }, 500),
    []
  );

  useEffect(() => {
    const init = async () => {
      if (!inputSchema || !organization) return;
      setLoading(true);

      const schemaCopy = JSON.parse(JSON.stringify(inputSchema));
      if (schemaCopy.ui_schema) {
        schemaCopy.ui_schema = transformUiSchema(schemaCopy.ui_schema, Object.keys(schemaCopy.data_schema.properties));
      }

      const initialData = { ...initialFormDataProp };
      setLocalFormData(initialData);

      await replaceEnums(schemaCopy.data_schema, initialData);
      setSchema(schemaCopy);
      setLoading(false);
    };
    init();
  }, [inputSchema, organization]);

  useEffect(() => {
    if (!inputSchema || !localFormData || loading) return;
    const updateEnums = async () => {
      const schemaCopy = JSON.parse(JSON.stringify(inputSchema));
      if (schemaCopy.ui_schema) {
        schemaCopy.ui_schema = transformUiSchema(schemaCopy.ui_schema, Object.keys(schemaCopy.data_schema.properties));
      }
      await replaceEnums(schemaCopy.data_schema, localFormData);
      setSchema(schemaCopy);
    };
    const timer = setTimeout(updateEnums, 300);
    return () => clearTimeout(timer);
  }, [localFormData, inputSchema, replaceEnums]);

  // --- Rendering ---

  const pageFields = schema?.ui_schema?.pageFields;
  const isMultiPage = pageFields && pageFields.length > 1;
  const totalPages = pageFields ? pageFields.length : 1;
  const customSubmitButtons: CustomSubmitButton[] = schema?.ui_schema?.['ui:submitButtons'] || [];
  const submitButtonOptions = schema?.ui_schema?.['ui:submitButtonOptions'] || {};

  const getPageSchema = () => {
    if (!isMultiPage || !schema) return schema?.data_schema;
    const currentFields = pageFields[currentPage];
    const fullSchema = JSON.parse(JSON.stringify(schema.data_schema));

    if (!submitClicked) {
      fullSchema.required = fullSchema.required?.filter((f: string) => currentFields.includes(f));
    }

    return {
      ...fullSchema,
      properties: Object.fromEntries(
        Object.entries(fullSchema.properties).filter(([k]) => currentFields.includes(k))
      ),
    };
  };

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    if (currentPage < totalPages - 1) setCurrentPage(currentPage + 1);
  };

  const handlePrevious = (e: React.MouseEvent) => {
    e.preventDefault();
    if (currentPage > 0) setCurrentPage(currentPage - 1);
  };

  const { token } = antdTheme.useToken();
  const { isDarkMode } = useThemeStore();

  const sentenceTemplate = schema?.ui_schema?.["ui:sentence"];
  const referencedKeys = useMemo(() => {
    if (!sentenceTemplate) return new Set<string>();
    return new Set((sentenceTemplate.match(/\{(.*?)\}/g) || []).map((m: string) => m.slice(1, -1)));
  }, [sentenceTemplate]);

  const customTemplates = useMemo(() => ({
    ObjectFieldTemplate: MadLibsObjectTemplate as any,
    FieldTemplate: MadLibsFieldTemplate as any
  }), []);

  const customFormContext = useMemo(() => ({
    token,
    isDarkMode,
    currentPage,
    referencedKeys
  }), [token, isDarkMode, currentPage, referencedKeys]);

  if (loading || !schema) return <Spin spinning={true} tip="Loading Mad Lib form..." />;

  const textColor = isDarkMode ? "#40a9ff" : "#1890ff";
  const underlineColor = isDarkMode ? "rgba(64, 169, 255, 0.4)" : "rgba(24, 144, 255, 0.4)";
  const activeUnderlineColor = isDarkMode ? "#40a9ff" : "#1890ff";

  return (
    <div style={{ position: 'relative' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --madlib-label-font-size: 16px;
          --madlib-label-color: ${isDarkMode ? '#9ca3af' : '#4b5563'};
          --madlib-label-floating-size: 10px;
          --madlib-label-floating-color: ${isDarkMode ? '#a1a1aa' : '#888888'};
          --madlib-label-transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        #rjsf-madlib-form .mad-libs-label {
          font-size: var(--madlib-label-font-size) !important;
          color: var(--madlib-label-color) !important;
          transition: var(--madlib-label-transition) !important;
          display: inline-block;
          font-weight: 500;
          transform-origin: left center;
        }
        #rjsf-madlib-form .mad-libs-label.floating,
        #rjsf-madlib-form span:focus-within > .mad-libs-label {
          font-size: var(--madlib-label-floating-size) !important;
          color: var(--madlib-label-floating-color) !important;
          transform: translateY(-5px);
          opacity: 0.8;
        }
        #rjsf-madlib-form .mad-libs-blank-container {
          display: inline-flex;
          position: relative;
          margin: 0 4px;
        }
        #rjsf-madlib-form .mad-libs-blank-container.has-floating-label {
          padding-top: 14px;
        }
        #rjsf-madlib-form .mad-libs-field-label {
          position: absolute;
          top: 14px;
          left: 4px;
          font-size: 13px;
          color: var(--madlib-label-floating-color) !important;
          opacity: 0;
          transform: translateY(0);
          transition: var(--madlib-label-transition) !important;
          pointer-events: none;
          line-height: 1;
          font-weight: bold;
        }
        #rjsf-madlib-form .mad-libs-blank-container.field-active .mad-libs-field-label,
        #rjsf-madlib-form .mad-libs-blank-container:focus-within .mad-libs-field-label {
          opacity: 0.85;
          transform: translateY(-13px);
          font-size: var(--madlib-label-floating-size) !important;
        }
        #rjsf-madlib-form .mad-libs-input-blank {
          border-bottom: 2px dashed ${underlineColor} !important;
          transition: border-color 0.2s, border-bottom-style 0.2s;
        }
        #rjsf-madlib-form .mad-libs-input-blank.no-underline {
          border-bottom: none !important;
        }
        #rjsf-madlib-form .mad-libs-input-blank:hover,
        #rjsf-madlib-form .mad-libs-blank-container:focus-within .mad-libs-input-blank {
          border-bottom-style: solid !important;
          border-bottom-color: ${activeUnderlineColor} !important;
        }
        #rjsf-madlib-form .mad-libs-blank-container:focus-within .mad-libs-input-blank.no-underline,
        #rjsf-madlib-form .mad-libs-input-blank.no-underline:hover {
          border-bottom: none !important;
        }
        #rjsf-madlib-form .ant-select {
          background-color: transparent !important;
        }
        #rjsf-madlib-form .ant-select-selector {
          background-color: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
          height: auto !important;
        }
        #rjsf-madlib-form .ant-select-selection-item {
          color: ${textColor} !important;
          font-weight: bold !important;
          padding-inline-end: 4px !important;
        }
        #rjsf-madlib-form .ant-select-selection-placeholder {
          color: ${isDarkMode ? '#555555' : '#aaaaaa'} !important;
          font-weight: bold !important;
          padding-inline-end: 4px !important;
        }
        #rjsf-madlib-form .ant-input {
          background-color: transparent !important;
          border: none !important;
          box-shadow: none !important;
          color: ${textColor} !important;
          font-weight: bold !important;
          padding: 0 4px !important;
        }
        #rjsf-madlib-form .ant-input::placeholder {
          color: ${isDarkMode ? '#555555' : '#aaaaaa'} !important;
        }
        #rjsf-madlib-form .ant-picker {
          background-color: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        #rjsf-madlib-form .ant-picker-input > input {
          color: ${textColor} !important;
          font-weight: bold !important;
        }
        #rjsf-madlib-form .ant-picker-suffix {
          display: none !important;
        }
      `}} />
      <Form
        id="rjsf-madlib-form"
        schema={getPageSchema()}
        uiSchema={schema.ui_schema}
        widgets={MadLibWidgets as any}
        validator={validator}
        templates={customTemplates}
        formContext={customFormContext}
        formData={localFormData}
        onSubmit={onSubmit}
        onChange={debouncedHandleChange}
      >
      <div style={{ marginTop: 24 }}>
        {isMultiPage ? (
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Button onClick={handlePrevious} disabled={currentPage === 0}>Previous</Button>
            <Typography.Text>Page {currentPage + 1} of {totalPages}</Typography.Text>
            {currentPage < totalPages - 1 ? (
              <Button type="primary" onClick={handleNext}>Next</Button>
            ) : (
              <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                {customSubmitButtons.length > 0 &&
                  customSubmitButtons.map((button) => (
                    <Button
                      key={button.label}
                      type={(button.variant as any) || "default"}
                      onClick={handleCustomSubmit(button.defaultValues || {})}
                      className={button.className}
                      style={{ flex: 1 }}
                    >
                      {button.label}
                    </Button>
                  ))}
                {!submitButtonOptions.norender && (
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={upsertMutation.isPending}
                    style={{ flex: 1 }}
                  >
                    {submitButtonOptions.submitText || (updateId ? "Update" : "Save")}
                  </Button>
                )}
              </div>
            )}
          </Space>
        ) : (
          <div style={{ display: 'flex', gap: 8, width: '100%' }}>
            {customSubmitButtons.length > 0 &&
              customSubmitButtons.map((button) => (
                <Button
                  key={button.label}
                  type={(button.variant as any) || "default"}
                  onClick={handleCustomSubmit(button.defaultValues || {})}
                  className={button.className}
                  style={{ flex: 1 }}
                >
                  {button.label}
                </Button>
              ))}
            {!submitButtonOptions.norender && (
              <Button
                type="primary"
                htmlType="submit"
                block={customSubmitButtons.length === 0}
                loading={upsertMutation.isPending}
                style={customSubmitButtons.length > 0 ? { flex: 1 } : {}}
              >
                {submitButtonOptions.submitText || (updateId ? "Update" : "Save")}
              </Button>
            )}
          </div>
        )}
      </div>
    </Form>
    </div>
  );
};

export default RJSFMadLibForm;
