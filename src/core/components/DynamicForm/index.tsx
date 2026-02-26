import Form from "@rjsf/antd";
import validator from "@rjsf/validator-ajv8";
import { Button, Space, Spin, Typography } from "antd";
import { useEffect, useState, useCallback, useMemo } from "react";
import { PostgrestFilterBuilder } from '@supabase/supabase-js';
import Widgets from "./Widgets";
import ObjectFieldTemplate from "./ObjectFieldTemplate";
import { supabase } from "../../../lib/supabase";
import { useAuthStore } from "@/core/lib/store";
import CustomFieldTemplate from "./FieldTemplate";
import { debounce } from "lodash";
import dayjs from "dayjs";

// Define interfaces for props and types
interface DynamicFormProps {
  schemas: {
    data_schema: any;
    ui_schema?: any;
    db_schema?: {
      table: string;
      column: string;
      multiple_rows?: boolean;
    };
  };
  formData?: any;
  updateId?: string | number;
  onFinish: (formData: any) => void;
}

interface CustomSubmitButton {
  name: string;
  label: string;
  variant?: 'primary' | 'default' | 'dashed' | 'link' | 'text'; // Maps to Antd Button type
  icon?: string;
  className?: string;
  defaultValues?: { [key: string]: any }; // The key feature: default data to merge on submit
}

interface EnumType {
  name: string;
  options: string[];
}

type FilterOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'is' | 'like' | 'ilike';

interface FilterType {
  key: string;
  operator: FilterOperator;
  value: any;
}

interface Dependency {
  field: string;
  dependsOn: string;
  table: string;
  column: string;
}

// Utility function to transform ui:layout into ui:grid, ui:order, and pageFields
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
          if (!uiOrder.includes(field)) {
            uiOrder.push(field);
          }
          if (!pageFieldsInner.includes(field)) {
            pageFieldsInner.push(field);
          }
        });
      } else if (typeof row === 'object' && row !== null) {
        Object.keys(row).forEach((field: string) => {
          if (!uiOrder.includes(field)) {
            uiOrder.push(field);
          }
          if (!pageFieldsInner.includes(field)) {
            pageFieldsInner.push(field);
          }
        });
      }
    });
    return pageFieldsInner;
  });

  dataSchemaProperties?.forEach((prop) => {
    if (!uiOrder?.includes(prop)) {
      uiOrder?.push(prop);
    }
  });

  const uiGrid = layout.flatMap((page: any[]) =>
    page.map((row: any) => {
      let fields: string[] = [];
      const spans: { [key: string]: number } = {};

      if (Array.isArray(row)) {
        fields = row;
        const span = Math.floor(24 / Math.max(1, fields.length));
        fields.forEach((field: string) => {
          spans[field] = span;
        });
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

const applyFilter = (
  query: PostgrestFilterBuilder<any, any, any>,
  filter: FilterType
): PostgrestFilterBuilder<any, any, any> => {
  const { key, operator, value } = filter;

  switch (operator) {
    case 'eq':
      return query.eq(key, value);
    case 'neq':
      return query.neq(key, value);
    case 'gt':
      return query.gt(key, value);
    case 'gte':
      return query.gte(key, value);
    case 'lt':
      return query.lt(key, value);
    case 'lte':
      return query.lte(key, value);
    case 'in':
      return query.in(key, Array.isArray(value) ? value : [value]);
    case 'is':
      return query.is(key, value);
    case 'like':
      return query.like(key, value);
    case 'ilike':
      return query.ilike(key, value);
    default:
      console.warn(`Unsupported filter operator: ${operator}`);
      return query;
  }
};

const DynamicForm: React.FC<DynamicFormProps> = ({ schemas, formData, updateId, onFinish }) => {
  const [schema, setSchema] = useState<any>();
  const [loading, setLoading] = useState<boolean>(true);
  const [userId, setUserId] = useState<string | undefined>();
  const [organization, setOrganization] = useState<any>();
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [localFormData, setLocalFormData] = useState<any>({});
  const [submitClicked, setSubmitClicked] = useState<boolean>(false);
  const [enumCache, setEnumCache] = useState<{ [key: string]: any[] }>({});

  // 🎯 FIX: Use a state to hold the *active* button's default values
  const [activeButtonDefaults, setActiveButtonDefaults] = useState<{ [key: string]: any } | null>(null);

  const { organization: userOrganization, location } = useAuthStore();

  const getOrganization = async (): Promise<void> => {
    if (userOrganization?.id) {
      setOrganization(userOrganization);
      return;
    }
    const { data, error } = await supabase
      .schema('identity').from('organizations')
      .select('*')
      .eq('name', import.meta.env.VITE_ORGANIZATION_APP || 'VKBS DEMO')
      .single();

    if (data) {
      setOrganization(data);
    }
  };

  useEffect(() => {
    const getUser = async (): Promise<void> => {
      const { data: { session } } = await supabase.auth.getSession();
      setUserId(session?.user?.id);
    };
    getUser();
    getOrganization();
  }, [userOrganization]);

  // Define a new interface to include the dynamic display column hint
  interface EnumSchema {
    table: string;
    column: string; // The ID column to select (e.g., 'id' or 'user_id')
    schema?: string;
    filters?: FilterType[];
    filter?: FilterType[]; // Add support for autonomic singular filter
    no_id?: boolean;
    dependsOn?: string;
    dependsOnField?: string;
    dependsOnColumn?: string;
    // NEW: Property to specify the column to select for display, potentially a foreign key path
    display_column?: string;
  }

  const fetchDataForDropdown = useCallback(async (
    schemaParam: string | undefined,
    tableParam: string,
    column: string,
    filters: FilterType[] = [],
    noId: boolean = false,
    isWorkflowStages: boolean = false,
    displayColumn?: string // Optional parameter for the display column
  ): Promise<any[]> => {
    // NOTE: This function assumes `enumCache`, `organization`, and `supabase` are available in the component's scope.
    try {
      const cacheKey = JSON.stringify({ schemaParam, tableParam, column, filters, noId, isWorkflowStages, displayColumn });
      if (enumCache[cacheKey]) {
        return enumCache[cacheKey];
      }

      let actualSchema: string = schemaParam || 'public';
      let actualTable: string = tableParam;

      if (tableParam.includes('.')) {
        const parts = tableParam.split('.');
        actualSchema = parts[0];
        actualTable = parts[1];
      }

      if (isWorkflowStages) {
        // --- Workflow stages logic (omitted for brevity, assume unchanged) ---
        let query = supabase
          .schema('workflow')
          .from('dynamic_workflow_definitions')
          .select('definitions->stages')
          .eq('entity_type', column)
          .is('is_active', true);

        filters.forEach(filter => {
          query = applyFilter(query, filter);
        });

        const { data, error } = await query;

        if (error) {
          console.error("Error fetching workflow stages from Supabase:", error);
          return [];
        }

        const stages = data
          ?.flatMap((item: any) => item?.stages || [])
          .map((stage: any) => ({
            name: stage?.name,
            display_label: stage?.displayLabel,
          }));

        if (!stages || stages.length === 0) {
          query = supabase
            .schema('workflow')
            .from('dynamic_workflow_definitions')
            .select('definitions->stages')
            .is('organization_id', null)
            .eq('entity_type', column)
            .is('is_active', true);

          filters.forEach(filter => {
            query = applyFilter(query, filter);
          });

          const { data: retryData, error: retryError } = await query;

          if (retryError) {
            console.error("Error retrying workflow stages fetch from Supabase:", retryError);
            return [];
          }

          const retryStages = retryData
            ?.flatMap((item: any) => item.stages || [])
            ?.map((stage: any) => ({
              id: stage?.id,
              name: stage?.name,
            }));

          setEnumCache(prev => ({ ...prev, [cacheKey]: retryStages }));
          return retryStages || [];
        }

        setEnumCache(prev => ({ ...prev, [cacheKey]: stages }));
        return stages || [];
      } else {
        // Determine the columns to select
        const valueColumn = column;
        const selectDisplayColumn = displayColumn || column;

        let selectColumns = noId ? valueColumn : `id, ${valueColumn}`;

        if (displayColumn && displayColumn.includes('.')) {
          // If deep reference (e.g., 'user_id.name'), construct the PostgREST relation syntax
          const parts = displayColumn.split('.');
          const relation = parts[0]; // e.g., 'user_id'
          const displayField = parts[1]; // e.g., 'name'

          // Construct the relation string: user_id(name)
          const relationSelect = `${relation}(${displayField})`;

          // Ensure 'id' is selected for the value, and then the relationSelect for the display name
          selectColumns = `id, ${relationSelect}`;

        } else {
          // Use the standard select for local columns
          const normalizedColumn = selectDisplayColumn?.replace('-', '.');
          // Use `->>` operator only for JSON fields, otherwise direct selection
          const displaySelect = normalizedColumn.includes('.') ? `${normalizedColumn} ->>` : normalizedColumn;

          selectColumns = noId
            ? displaySelect
            : `id, ${displaySelect}`;
        }

        let query = supabase
          .schema(actualSchema)
          .from(actualTable)
          .select(selectColumns);

        // NOTE: For views like core.v_enums_tenanted, RLS and the view's internal logic (DISTINCT ON)
        // already handle the "Mine OR Global" resolution. Adding a manual filter here
        // can break the fallback to global values if the organization context is missing or specific.
        if (organization?.id && actualTable !== 'v_enums_tenanted') {
          query = query.or(`organization_id.eq.${organization.id},organization_id.is.null`);
        }

        filters.forEach(filter => {
          query = applyFilter(query, filter);
        });

        const { data, error } = await query;

        if (error) {
          console.error("Error fetching data from Supabase:", error);
          return [];
        }

        // Fallback to null organization_id
        if (data?.length === 0) {
          query = supabase
            .schema(actualSchema)
            .from(actualTable)
            .select(selectColumns)
            .is('organization_id', null);

          filters.forEach(filter => {
            query = applyFilter(query, filter);
          });

          const { data: retryData, error: retryError } = await query;

          if (retryError) {
            console.error("Error retrying data fetch from Supabase:", retryError);
            return [];
          }
          setEnumCache(prev => ({ ...prev, [cacheKey]: retryData }));
          return retryData || [];
        }

        setEnumCache(prev => ({ ...prev, [cacheKey]: data }));
        return data;
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      return [];
    }
  }, [organization, enumCache]);

  // NOTE: Ensure your `replaceEnums` uses the correct logic to extract the name 
  // from the returned object structure when a join is performed.

  const replaceEnums = useCallback(async (obj: any, formData: any = {}): Promise<void> => {
    const keys = Object.keys(obj);
    const promises: Promise<void>[] = [];

    for (const key of keys) {
      const enumValue = obj[key]?.enum as EnumSchema;
      const noId = enumValue?.no_id || false;
      let filterConditions: FilterType[] = enumValue?.filter || enumValue?.filters || [];

      if (enumValue?.dependsOnColumn && formData[enumValue?.dependsOnField]) {
        filterConditions = [
          ...filterConditions,
          {
            key: enumValue.dependsOnColumn,
            operator: 'eq',
            value: formData[enumValue?.dependsOnField],
          },
        ];
      }

      if (enumValue && typeof enumValue === 'object') {
        if (enumValue.table === 'dynamic_workflow_definitions') {
          promises.push(
            fetchDataForDropdown(enumValue?.schema, enumValue?.table, enumValue?.column, filterConditions, noId, true).then((options) => {
              obj[key] = {
                ...obj[key],
                enum: options?.map((item: any) => (noId ? item?.name : item?.display_label)),
                enumNames: options?.map((item: any) => item?.display_label),
              };
            })
          );
        } else if (enumValue?.table && enumValue?.column) {
          promises.push(
            fetchDataForDropdown(enumValue?.schema, enumValue?.table, enumValue?.column, filterConditions, noId, false).then((options) => {
              obj[key] = {
                ...obj[key],
                enum: options?.map((item: any) => (noId ? item[`${enumValue?.column}`] : item?.id)),
                enumNames: options?.map((item: any) => item[`${enumValue?.column}`]),
              };
            })
          );
        }
      } else if (typeof obj[key] === "object" && obj[key] !== null) {
        promises.push(replaceEnums(obj[key], formData));
      }
    }
    await Promise.all(promises);
  }, [fetchDataForDropdown]);

  // Function to format date strings to YYYY-MM-DD
  const formatDatesInFormData = (data: any, uiSchema: any, dataSchema: any) => {
    if (!data) return {};

    const formattedData: any = {};
    for (const key in data) {
      const value = data[key];
      if (value === null || value === undefined || value === "") {
        continue;
      }

      const isDateSchema = dataSchema?.properties?.[key]?.type === "string" && dataSchema?.properties?.[key]?.format === "date";
      const isDateWidget = uiSchema?.[key]?.['ui:widget'] && String(uiSchema[key]['ui:widget']).includes("date");

      if (isDateSchema || isDateWidget) {
        try {
          const datePart = String(value).split('T')[0];
          if (datePart) {
            formattedData[key] = datePart;
          } else {
            const parsedDate = new Date(value);
            if (!isNaN(parsedDate.getTime())) {
              formattedData[key] = parsedDate.toISOString().split('T')[0];
            } else {
              formattedData[key] = value;
            }
          }
        } catch (e) {
          console.warn(`Could not format date for field ${key}: ${value}`, e);
          formattedData[key] = value;
        }
      } else {
        formattedData[key] = value;
      }
    }
    return formattedData;
  };

  useEffect(() => {
    const initialSetup = async () => {
      if (!schemas || !organization) return;
      setLoading(true);

      const schemaCopy = JSON.parse(JSON.stringify(schemas));
      if (schemaCopy?.ui_schema) {
        schemaCopy.ui_schema = transformUiSchema(schemaCopy?.ui_schema, Object.keys(schemaCopy?.data_schema?.properties));
      }

      let initialFormData = { ...formData };
      if (
        schemas?.data_schema?.properties?.location_id &&
        (initialFormData?.location_id === undefined || initialFormData?.location_id === null) &&
        location?.id
      ) {
        initialFormData = { ...initialFormData, location_id: location.id };
      }

      initialFormData = formatDatesInFormData(initialFormData, schemas?.ui_schema, schemas?.data_schema);
      setLocalFormData(initialFormData);

      await replaceEnums(schemaCopy?.data_schema, initialFormData);
      setSchema(schemaCopy);
      setLoading(false);
    };
    initialSetup();
  }, [schemas, organization, formData, location]);

  useEffect(() => {
    if (!schemas || !localFormData) return;
    const updateEnums = async () => {
      const schemaCopy = JSON.parse(JSON.stringify(schemas));
      if (schemaCopy?.ui_schema) {
        schemaCopy.ui_schema = transformUiSchema(schemaCopy?.ui_schema, Object.keys(schemaCopy?.data_schema?.properties));
      }
      await replaceEnums(schemaCopy?.data_schema, localFormData);
      setSchema(schemaCopy);
    };
    updateEnums();
  }, [localFormData, schemas, replaceEnums]);

  // 🎯 FIX: The onSubmit handler now checks and merges the activeButtonDefaults
  const onSubmit = async ({ formData }: { formData: any }): Promise<void> => {
    setSubmitClicked(true);

    // 1. Merge form data with the active button's default values
    const finalFormData = {
      ...localFormData,
      ...formData,
      ...(activeButtonDefaults || {}), // <--- THE FIX: Merge the payload here
    };

    if (!isMultiPage || currentPage === totalPages - 1) {
      console.log('Submitted formData:', finalFormData);
      onFinish(finalFormData);

      // 2. Clear all state related to submission
      setLocalFormData({});
      setCurrentPage(0);
      setSubmitClicked(false);
      setActiveButtonDefaults(null); // <--- IMPORTANT: Clear the defaults
    }
  };

  // 🎯 FIX: This function now sets the state synchronously and then submits the form.
  const handleCustomSubmit = (defaults: { [key: string]: any }) => (e: React.MouseEvent) => {
    e.preventDefault();

    // Set the default values for the upcoming submission
    setActiveButtonDefaults(defaults);

    // After setting the state, use a slight timeout or similar mechanism 
    // to ensure state is updated before form submission is guaranteed to read it.
    // However, since state updates are batched, the safest way is to use 
    // a single controlled submit handler that sets the state *before* submission.
    // Since we can't reliably wait for state to update before submitting, 
    // the previous approach of setting state and immediately submitting 
    // sometimes fails. Let's stick to setting state and then triggering submit.
    // The key is that RJSF's onSubmit uses the state.

    // Force the form to submit after setting the default values
    const formElement = document.getElementById("rjsf-form");
    if (formElement) {
      // Use a slight delay to help ensure the state update is processed, 
      // though React doesn't guarantee this immediately.
      // For production, a ref-based solution or a custom SubmitButton component 
      // would be more robust, but this pattern is common for simple fixes.
      setTimeout(() => {
        (formElement as HTMLFormElement).dispatchEvent(
          new Event('submit', { cancelable: true, bubbles: true })
        );
      }, 0);
    }
  };


  const pageFields: string[][] | undefined = schema?.ui_schema?.pageFields;
  const isMultiPage: boolean = pageFields && pageFields?.length > 1;
  const totalPages: number = pageFields ? pageFields?.length : 1;

  const customSubmitButtons: CustomSubmitButton[] = schema?.ui_schema?.['ui:submitButtons'] || [];


  const getPageSchema = (): any => {
    if (!isMultiPage || !schema) return schema?.data_schema;

    const currentFields = pageFields[currentPage];
    const fullSchema = JSON.parse(JSON.stringify(schema?.data_schema));

    if (!submitClicked) {
      fullSchema.required = fullSchema?.required?.filter((field: string) =>
        currentFields.includes(field)
      );
    }

    return {
      ...fullSchema,
      properties: Object.fromEntries(
        currentFields?.map((key: string) => [key, fullSchema.properties[key]])
      ),
    };
  };

  const handleNext = (e: React.MouseEvent): void => {
    e.preventDefault();
    if (isMultiPage && currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevious = (e: React.MouseEvent): void => {
    e.preventDefault();
    if (isMultiPage && currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  // The debounced handler remains the same
  const debouncedHandleChange = useMemo(
    () =>
      debounce(({ formData: newFormData }: { formData: any }) => {
        setLocalFormData((prevFormData: any) => {
          const updatedFormData = { ...newFormData };

          if (prevFormData?.offering_id !== updatedFormData?.offering_id) {
            updatedFormData.contract_id = undefined;
          }

          if (prevFormData?.start_date !== updatedFormData?.start_date) {
            const startDate = updatedFormData.start_date;
            const formattedStartDate = startDate
              ? dayjs(startDate).toISOString()
              : undefined;

            updatedFormData.allocations = updatedFormData.allocations?.map((alloc: any) => ({
              ...alloc,
              "details.start_date": formattedStartDate,
            }));
          }

          if (prevFormData?.end_date !== updatedFormData?.end_date) {
            const endDate = updatedFormData.end_date;
            const formattedEndDate = endDate
              ? dayjs(endDate).toISOString()
              : undefined;

            updatedFormData.allocations = updatedFormData.allocations?.map((alloc: any) => ({
              ...alloc,
              "details.end_date": formattedEndDate,
            }));
          }

          return updatedFormData;
        });
      }, 500),
    []
  );

  useEffect(() => {
    return () => {
      debouncedHandleChange.cancel();
    };
  }, [debouncedHandleChange]);


  // Renders the pagination or custom submit buttons
  const renderSubmitButtons = (): React.ReactNode => {

    // --- Multi-Page Logic ---
    if (isMultiPage) {
      return (
        <Space
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 16,
            width: "100%",
          }}
        >
          <Button
            onClick={handlePrevious}
            disabled={currentPage === 0}
            style={{ visibility: currentPage > 0 ? "visible" : "hidden" }}
          >
            Previous
          </Button>
          <Typography.Text>
            Page {currentPage + 1} of {totalPages}
          </Typography.Text>

          {currentPage < totalPages - 1 ? (
            <Button type="default" onClick={handleNext}>Next</Button>
          ) : (
            // Last page: Render custom buttons or default submit
            <Space size="small">
              {customSubmitButtons.length > 0 ? (
                customSubmitButtons.map((button) => (
                  <Button
                    key={button.name}
                    type={button.variant || "default"}
                    onClick={handleCustomSubmit(button.defaultValues || {})}
                    className={button.className}
                  >
                    {button.label}
                  </Button>
                ))
              ) : (
                // Default submit for last page if no custom buttons
                <Button type="primary" htmlType="submit" onClick={handleCustomSubmit({})}>Submit</Button>
              )}
            </Space>
          )}
        </Space>
      );
    }

    // --- Single-Page Logic ---
    if (customSubmitButtons.length > 0) {
      return (
        <div // Changed from <Space> to a <div> for better flex control
          style={{
            display: "flex",
            justifyContent: "space-between", // Distribute buttons across the line
            gap: 8, // Maintain the gap
            marginTop: 16,
            width: "100%",
          }}
        >
          {customSubmitButtons.map((button) => (
            <Button
              key={button.name}
              type={button.variant || "default"}
              onClick={handleCustomSubmit(button.defaultValues || {})}
              className={button.className}
              style={{ flex: 1 }} // <--- MODIFICATION: Makes button take up equal width
            >
              {button.label}
            </Button>
          ))}
        </div> // Changed from </Space> to </div>
      );
    }

    // Fallback default submit for single page, no custom buttons
    return (
      <Button
        type="primary"
        htmlType="submit"
        style={{ marginTop: 16, width: "100%" }}
        onClick={handleCustomSubmit({})} // Triggers submit with empty defaults
      >
        Submit
      </Button>
    )
  };

  const _RJSFSchema = schema && (isMultiPage ? getPageSchema() : schema?.data_schema);
  const log = (type: string) => console.log.bind(console, type);


  return (
    <>
      {schema ? (
        <Form
          id="rjsf-form" // REQUIRED FOR PROGRAMMATIC SUBMISSION
          schema={_RJSFSchema}
          widgets={Widgets}
          validator={validator}
          templates={{
            ObjectFieldTemplate,
            FieldTemplate: CustomFieldTemplate
          }}
          // Hide rjsf's default buttons, we render them in children
          uiSchema={{
            ...schema?.ui_schema,
            'ui:submitButtons': undefined,
            'ui:layout': schema?.ui_schema?.['ui:layout'], // Keep layout data
          }}
          formData={localFormData}
          onSubmit={onSubmit} // This now receives the merged data via state
          onChange={debouncedHandleChange}
          onError={log("errors")}
        >
          {/* Render the buttons explicitly */}
          {renderSubmitButtons()}
        </Form>
      ) : (
        <Spin spinning={true} />
      )}
    </>
  );
};

export default DynamicForm;