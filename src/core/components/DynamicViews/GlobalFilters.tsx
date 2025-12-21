import React, { useState, useEffect } from 'react';
import { Form, Input, DatePicker, Select, Button, Space, Dropdown, Checkbox } from 'antd';
import dayjs from 'dayjs';
import { useViewConfigEnhanced } from './hooks/useEntityConfig';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from "@/core/lib/store";
import { Settings2 } from 'lucide-react';

const { RangePicker } = DatePicker;

interface GlobalFiltersProps {
    entityType: string;
    entitySchema?: string;
    defaultFilters?: Record<string, any>;
    searchConfig?: {
        serverSideFilters: string[];
        noDataMessage: string;
        searchButton: React.ReactNode;
    };
    initialFilters: Record<string, any>;
    onFilterChange: (filterValues: Record<string, any>) => void;
    onSearch: (modifiedFilters: Set<string>) => void;
    allDisplayableColumns: { fieldName: string; fieldPath: string }[];
    visibleColumns: string[];
    setVisibleColumns: (columns: string[]) => void;
}

interface FilterField {
    name: string;
    type: 'text' | 'date-range' | 'select';
    label: string;
    placeholder: string;
    options?: {
        source_table: string;
        source_column: string;
        display_column: string;
    };
    isServerSide?: boolean;
    defaultValue?: any;
}

const getPastDateRange = (days: number) => {
    const endDate = dayjs();
    const startDate = dayjs().subtract(days, 'day');
    return [startDate, endDate];
};

const GlobalFilters: React.FC<GlobalFiltersProps> = ({
    entities,
    entityType,
    entitySchema,
    defaultFilters = {},
    searchConfig,
    initialFilters,
    onFilterChange,
    onSearch,
    allDisplayableColumns,
    visibleColumns,
    setVisibleColumns,
}) => {
    const [form] = Form.useForm();
    const { data } = useViewConfigEnhanced(entityType, entitySchema);
    const { organization, location } = useAuthStore();
    const customFilters: FilterField[] = data?.viewConfig?.general?.filters || [];
    const [selectOptions, setSelectOptions] = useState<Record<string, { value: string; label: string }[]>>({});
    const [loading, setLoading] = useState<Record<string, boolean>>({});

    const [modifiedFilters, setModifiedFilters] = useState<Set<string>>(new Set());
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [isDateCleared, setIsDateCleared] = useState(false); // New state to track if date is manually cleared

    const fetchOptions = async (
        sourceTable: string,
        sourceColumn: string,
        displayColumn: string,
    ) => {
        try {
            const [schema, table] = sourceTable.includes('.')
                ? sourceTable.split('.')
                : ['public', sourceTable];

            let query = supabase
                .schema(schema)
                .from(table)
                .select(`${sourceColumn}, ${displayColumn}`)
                .eq('organization_id', organization?.id);

            if (location?.id && organization?.app_settings?.partition === 'locations') {
                query = query.eq(
                    table === 'locations' ? 'id' : 'location_id',
                    location.id
                );
            }

            const { data, error } = await query;

            if (error) {
                console.error(`Error fetching options from ${schema}.${table}:`, error);
                return [];
            }

            return (data || []).map((item: any) => ({
                value: item[sourceColumn],
                label: item[displayColumn],
            }));
        } catch (error) {
            console.error(`Error fetching options for ${sourceTable}:`, error);
            return [];
        }
    };

    useEffect(() => {
        const fetchSelectOptions = async () => {
            const newOptions: Record<string, { value: string; label: string }[]> = {};
            const newLoading: Record<string, boolean> = {};

            for (const field of customFilters) {
                if (field.type === 'select' && field.options?.source_table) {
                    newLoading[field.name] = true;
                    const options = await fetchOptions(
                        field.options.source_table,
                        field.options.source_column,
                        field.options.display_column
                    );
                    newOptions[field.name] = options;
                    newLoading[field.name] = false;
                }
            }

            setSelectOptions(newOptions);
            setLoading(newLoading);
        };

        if (customFilters.length > 0) {
            fetchSelectOptions();
        }
    }, [customFilters]);

    const serverSideFilters = customFilters
        .filter((field) => field.isServerSide)
        .map((field) => field.name);

    const defaultSearchConfig = {
        serverSideFilters,
        noDataMessage: 'No data available',
        searchButton: (
            <Button
                type="primary"
                className="bg-[var(--color-primary)] text-white border-none hover:bg-[var(--color-primary-dark)]"
            >
                Search
            </Button>
        ),
    };

    const mergedSearchConfig = { ...defaultSearchConfig, ...searchConfig };

    const handleFilterChange = (changedValues: any, allValues: any) => {
        const changedField = Object.keys(changedValues)[0];

        if (changedField === 'dateRange') {
            const dateValue = changedValues.dateRange;
            // Check if the date range was cleared
            if (dateValue === null || (Array.isArray(dateValue) && dateValue.length === 0)) {
                setIsDateCleared(true);
            } else {
                setIsDateCleared(false);
            }

            if (dateValue) {
                changedValues.dateRange = dateValue.map((date: any) =>
                    date ? dayjs(date) : null
                );
            }
        }

        if (!mergedSearchConfig.serverSideFilters.includes(changedField)) {
            onFilterChange(allValues);
            return;
        }

        setModifiedFilters((prev) => new Set([...prev, changedField]));
        onFilterChange({
            ...allValues,
            [changedField]: changedValues[changedField],
        });
    };

    const handleSearch = () => {
        if (modifiedFilters.size > 0) {
            onSearch(modifiedFilters);
            setModifiedFilters(new Set());
        }
    };

    const handleReset = () => {
        form.resetFields();
        onFilterChange(initialFilters);
        setIsDateCleared(false); // Reset the flag so the default date can be set again
        setModifiedFilters(new Set());
    };

    const handleColumnVisibilityChange = (fieldPath: string, checked: boolean) => {
        setVisibleColumns(prev =>
            checked ? [...prev, fieldPath] : prev.filter(item => item !== fieldPath)
        );
    };

    const columnVisibilityMenuItems = allDisplayableColumns.map(field => ({
        key: field.fieldPath,
        label: (
            <div onClick={(e) => e.stopPropagation()}>
                <Checkbox
                    onChange={(e) => handleColumnVisibilityChange(field.fieldPath, e.target.checked)}
                    checked={visibleColumns.includes(field.fieldPath)}
                >
                    {field.fieldName}
                </Checkbox>
            </div>
        ),
    }));

    const prepareInitialValues = (filters: Record<string, any>) => {
        const preparedValues = { ...filters };

        customFilters.forEach(fieldConfig => {
            if (fieldConfig.type === 'date-range' && !preparedValues[fieldConfig.name]) {
                // Only set the default if the date range hasn't been manually cleared
                if (!isDateCleared) {
                    preparedValues[fieldConfig.name] = getPastDateRange(7);
                } else {
                    preparedValues[fieldConfig.name] = null;
                }
            }
        });

        for (const key in preparedValues) {
            const fieldConfig = customFilters.find(f => f.name === key);
            if (fieldConfig?.type === 'date-range' && Array.isArray(preparedValues[key])) {
                preparedValues[key] = preparedValues[key].map((date: any) =>
                    date ? dayjs(date) : null
                );
            }
        }
        return preparedValues;
    };

    useEffect(() => {
        const preparedValues = prepareInitialValues(initialFilters);
        form.setFieldsValue(preparedValues);
    }, [form, initialFilters, customFilters, isDateCleared]);

    return (
        <div>
            <Form
                form={form}
                layout="vertical"
                onValuesChange={handleFilterChange}
            >
                <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
                    {customFilters.filter(field => field?.name !== "location_id" ? true : !location?.id).map((field) => (
                        <Form.Item
                            key={field.name}
                            name={field.name}
                            label={field.label}
                            className="mb-0"
                        >
                            {field.type === 'text' && (
                                <Input
                                    placeholder={field.placeholder}
                                    className="w-full bg-[var(--color-background)] border-[var(--color-border)]"
                                />
                            )}
                            {field.type === 'date-range' && (
                                <RangePicker
                                    className="w-full bg-[var(--color-background)] border-[var(--color-border)]"
                                    defaultValue={
                                        field.defaultValue
                                            ? [dayjs(field.defaultValue[0]), dayjs(field.defaultValue[1])]
                                            : undefined
                                    }
                                />
                            )}
                            {field.type === 'select' && (
                                <Select
                                    placeholder={field.placeholder}
                                    options={selectOptions[field.name] || []}
                                    className="w-full bg-[var(--color-background)] border-[var(--color-border)]"
                                    allowClear
                                    loading={loading[field.name] || false}
                                />
                            )}
                        </Form.Item>
                    ))}
                    {entities?.length > 0 && <Form.Item label="&nbsp;" className="mb-0">
                        <Dropdown
                            menu={{ items: columnVisibilityMenuItems }}
                            trigger={['click']}
                            placement="bottomRight"
                            open={dropdownOpen}
                            onOpenChange={setDropdownOpen}
                        >
                            <Button onClick={() => setDropdownOpen(!dropdownOpen)}>
                                <Space>
                                    <Settings2 size={16} />
                                </Space>
                            </Button>
                        </Dropdown>
                    </Form.Item>}

                    {mergedSearchConfig && modifiedFilters.size > 0 && (
                        <div className="md:col-span-4 flex justify-end">
                            <Space>
                                <Button
                                    onClick={handleReset}
                                    className="bg-[var(--color-background)] border-[var(--color-border)] text-[var(--color-text)]"
                                >
                                    Reset
                                </Button>
                                <div onClick={handleSearch}>{mergedSearchConfig.searchButton}</div>
                            </Space>
                        </div>
                    )}
                </div>
            </Form>
        </div>
    );
};

export default GlobalFilters;