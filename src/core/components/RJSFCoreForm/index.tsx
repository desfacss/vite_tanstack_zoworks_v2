import Form from "@rjsf/antd";
import validator from "@rjsf/validator-ajv8";
import { Button, message, Space, Spin, Typography } from "antd";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../lib/store";
import Widgets from "../DynamicForm/Widgets";
import ObjectFieldTemplate from "../DynamicForm/ObjectFieldTemplate";
import CustomFieldTemplate from "../DynamicForm/FieldTemplate";
import { debounce } from "lodash";

// --- Interfaces ---

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
  no_id?: boolean;
  dependsOn?: string;
  dependsOnField?: string;
  dependsOnColumn?: string;
  display_column?: string;
}

// --- Utils ---

const applyFilter = (
  query: any,
  filter: FilterType
): any => {
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
  const { "ui:layout": layout, ...rest } = uiSchema;

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

  const uiGrid = layout.flatMap((page: any[]) =>
    page.map((row: any) => {
      let fields: string[] = [];
      const spans: { [key: string]: number } = {};

      if (Array.isArray(row)) {
        fields = row;
        const span = Math.floor(24 / Math.max(1, fields.length));
        fields.forEach((field: string) => { spans[field] = span; });
      } else if (typeof row === 'object' && row !== null) {
        fields = Object.keys(row);
        fields.forEach((field: string) => {
          spans[field] = row[field]?.['ui:colSpan'] || Math.floor(24 / Math.max(1, fields.length));
        });
      }
      return spans;
    })
  );

  return {
    ...rest,
    "ui:grid": uiGrid,
    "ui:order": uiOrder,
    pageFields,
  };
};

const RJSFCoreForm: React.FC<RJSFCoreFormProps> = ({ 
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

      console.log(`[RJSFCoreForm] Fetching enums for ${actualSchema}.${actualTable}`, { selectColumns, filters });

      // First try with organization_id filter
      let query = supabase.schema(actualSchema).from(actualTable).select(selectColumns);
      
      // Only add organization_id if it exists in store
      if (organization?.id) {
        query = query.eq('organization_id', organization.id);
      }
      
      filters.forEach(f => { query = applyFilter(query, f); });

      let { data, error } = await query;
      
      // If error (likely column missing) or no data, try without organization_id
      if (error || !data || data.length === 0) {
        if (error) console.warn(`[RJSFCoreForm] Org filter failed for ${actualTable}, retrying without it.`, error.message);
        
        let retryQuery = supabase.schema(actualSchema).from(actualTable).select(selectColumns);
        filters.forEach(f => { retryQuery = applyFilter(retryQuery, f); });
        
        const retryRes = await retryQuery;
        if (retryRes.error) {
            console.error(`[RJSFCoreForm] Fetch failed for ${actualTable} after retry:`, retryRes.error.message);
            throw retryRes.error;
        }
        data = retryRes.data;
      }

      console.log(`[RJSFCoreForm] Fetched ${data?.length || 0} options for ${actualTable}`);
      
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
        console.log(`[RJSFCoreForm] Found lookup field: ${key}`, enumValue);
        const noId = enumValue.no_id || false;
        let filterConditions = [...(enumValue.filters || [])] as FilterType[];

        if (enumValue.dependsOnColumn && formData[enumValue.dependsOnField || '']) {
          console.log(`[RJSFCoreForm] Applying dependency for ${key} from ${enumValue.dependsOnField}`);
          filterConditions.push({
            key: enumValue.dependsOnColumn,
            operator: 'eq',
            value: formData[enumValue.dependsOnField || ''],
          });
        }

        promises.push(
          fetchDataForDropdown(enumValue.schema, enumValue.table, enumValue.column, filterConditions, noId, enumValue.display_column).then((options) => {
            console.log(`[RJSFCoreForm] Replacing enum for ${key} with ${options?.length || 0} items`);
            obj[key] = {
              ...obj[key],
              enum: options?.map((item: any) => {
                  const val = noId ? item[enumValue.column] : item.id;
                  if (val === undefined) console.warn(`[RJSFCoreForm] Value missing for ${key} in item:`, item);
                  return val;
              }),
              enumNames: options?.map((item: any) => {
                  const label = item[enumValue.display_column || enumValue.column] || item.id;
                  return label;
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

      // If tableName already contains a dot, it likely has the schema prefix
      let fullTableName = tableName;
      if (!tableName.includes('.') && schemaName) {
        fullTableName = `${schemaName}.${tableName}`;
      } else if (!tableName.includes('.') && !schemaName) {
        fullTableName = `public.${tableName}`;
      }
      // If it already has a dot, we trust the tableName contains the schema (e.g. "hr.applications")

      // Prepare system fields
      const dataPayload = {
        ...values,
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
      message.success(`${type} saved successfully`);
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
      upsertMutation.mutate(data.formData);
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

  if (loading || !schema) return <Spin spinning={true} tip="Loading form..."/>;

  return (
    <Form
      id="rjsf-core-form"
      schema={getPageSchema()}
      uiSchema={schema.ui_schema}
      widgets={Widgets as any}
      validator={validator}
      templates={{
        ObjectFieldTemplate,
        FieldTemplate: CustomFieldTemplate
      }}
      formData={localFormData}
      onSubmit={onSubmit}
      onChange={debouncedHandleChange}
    >
      <div style={{ marginTop: 16 }}>
        {isMultiPage ? (
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Button onClick={handlePrevious} disabled={currentPage === 0}>Previous</Button>
            <Typography.Text>Page {currentPage + 1} of {totalPages}</Typography.Text>
            {currentPage < totalPages - 1 ? (
              <Button type="primary" onClick={handleNext}>Next</Button>
            ) : (
              <Button type="primary" htmlType="submit" loading={upsertMutation.isPending}>Submit</Button>
            )}
          </Space>
        ) : (
          <Button type="primary" htmlType="submit" block loading={upsertMutation.isPending}>
            {updateId ? 'Update' : 'Save'}
          </Button>
        )}
      </div>
    </Form>
  );
};

export default RJSFCoreForm;
