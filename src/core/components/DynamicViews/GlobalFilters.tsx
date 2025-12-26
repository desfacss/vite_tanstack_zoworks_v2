import React, { useState, useEffect } from 'react';
import { Form, Input, DatePicker, Select, Button, Dropdown, Checkbox, Typography, Popover } from 'antd';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useViewConfigEnhanced } from './hooks/useEntityConfig';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from "@/core/lib/store";
import { Settings2, Filter } from 'lucide-react';

const { RangePicker } = DatePicker;
const { Title } = Typography;

interface GlobalFiltersProps {
    entities: any[];
    entityType: string;
    entitySchema?: string;
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
    setVisibleColumns: React.Dispatch<React.SetStateAction<string[]>>;
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
    searchConfig,
    initialFilters,
    onFilterChange,
    onSearch,
    allDisplayableColumns,
    visibleColumns,
    setVisibleColumns,
}) => {
    const [form] = Form.useForm();
    const { data } = useViewConfigEnhanced(entityType, entitySchema || 'public');
    useTranslation();
    const { organization, location } = useAuthStore();
    const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

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

            if (location?.id && (organization?.app_settings as any)?.partition === 'locations') {
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
                className="global-filters-form w-full"
            >
                <div className="flex flex-nowrap items-center gap-x-2 justify-start overflow-x-visible">
                    {/* Filter Fields Mapping */}
                    {(() => {
                        const filteredFields = customFilters.filter(field => field?.name !== "location_id" ? true : !location?.id);

                        // Dynamic visibility based on tiered breakpoints
                        let MAX_VISIBLE = 4;
                        if (windowWidth < 1240) {
                            MAX_VISIBLE = 1;
                        } else if (windowWidth < 1440) {
                            MAX_VISIBLE = 2;
                        }

                        const visibleFields = windowWidth < 768 ? filteredFields.slice(0, 1) : filteredFields.slice(0, MAX_VISIBLE);
                        const overflowFields = windowWidth < 768 ? filteredFields.slice(1) : filteredFields.slice(MAX_VISIBLE);

                        return (
                            <>
                                {visibleFields.map((field, index) => (
                                    <Form.Item
                                        key={field.name}
                                        name={field.name}
                                        label={<span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 md:hidden">{field.label}</span>}
                                        className={`mb-0 ${index === 0 ? 'flex-1 min-w-[200px]' : 'min-w-[160px]'} max-w-[400px]`}
                                    >
                                        {field.type === 'text' && (
                                            <Input
                                                placeholder={field.placeholder}
                                                className="w-full bg-[var(--color-bg-secondary)] border-[var(--color-border)] hover:border-[var(--color-primary)] transition-colors text-[var(--color-text-primary)] font-medium placeholder:text-slate-400 placeholder:opacity-60 overflow-hidden text-ellipsis px-3 h-[44px]"
                                            />
                                        )}
                                        {field.type === 'date-range' && (
                                            <RangePicker
                                                className="w-full bg-[var(--color-bg-secondary)] border-[var(--color-border)] hover:border-[var(--color-primary)] transition-colors h-[44px]"
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
                                                className="w-full min-w-[180px] h-[44px]"
                                                allowClear
                                                loading={loading[field.name] || false}
                                            />
                                        )}
                                    </Form.Item>
                                ))}

                                {/* MORE FILTERS POPOVER */}
                                {overflowFields.length > 0 && (
                                    <Popover
                                        trigger="click"
                                        placement="bottomLeft"
                                        content={
                                            <div className="p-2 space-y-4 min-w-[280px]">
                                                <Title level={5} className="!mb-2 text-xs uppercase tracking-widest text-slate-400 font-bold">Additional Filters</Title>
                                                {overflowFields.map(field => (
                                                    <Form.Item
                                                        key={field.name}
                                                        name={field.name}
                                                        label={
                                                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                                                {field.label.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                                            </span>
                                                        }
                                                        className="mb-2 w-full"
                                                        layout="vertical"
                                                    >
                                                        {field.type === 'text' && (
                                                            <Input
                                                                placeholder={field.placeholder}
                                                                className="w-full bg-[var(--color-bg-secondary)] border-[var(--color-border)] h-[40px]"
                                                            />
                                                        )}
                                                        {field.type === 'date-range' && (
                                                            <RangePicker
                                                                className="w-full bg-[var(--color-bg-secondary)] border-[var(--color-border)] h-[40px]"
                                                            />
                                                        )}
                                                        {field.type === 'select' && (
                                                            <Select
                                                                placeholder={field.placeholder}
                                                                options={selectOptions[field.name] || []}
                                                                className="w-full h-[40px]"
                                                                allowClear
                                                                loading={loading[field.name] || false}
                                                            />
                                                        )}
                                                    </Form.Item>
                                                ))}
                                            </div>
                                        }
                                    >
                                        <Button
                                            className="hidden md:flex items-center justify-center border-dashed border-slate-300 hover:border-[var(--color-primary)] h-[44px] w-[44px] p-0"
                                        >
                                            <Filter size={18} className="text-slate-500" />
                                        </Button>
                                    </Popover>
                                )}
                            </>
                        );
                    })()}
                    {entities?.length > 0 && <Form.Item className="mb-0">
                        <Dropdown
                            menu={{ items: columnVisibilityMenuItems }}
                            trigger={['click']}
                            placement="bottomRight"
                            open={dropdownOpen}
                            onOpenChange={setDropdownOpen}
                        >
                            <Button
                                onClick={() => setDropdownOpen(!dropdownOpen)}
                                className="flex items-center justify-center border-dashed border-slate-300 hover:border-[var(--color-primary)] h-[44px] w-[44px] p-0"
                            >
                                <Settings2 size={16} className="text-slate-500" />
                            </Button>
                        </Dropdown>
                    </Form.Item>}

                    {mergedSearchConfig && modifiedFilters.size > 0 && (
                        <div className="flex items-center gap-2">
                            <Button
                                onClick={handleReset}
                                className="bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]"
                            >
                                Reset
                            </Button>
                            <div onClick={handleSearch}>{mergedSearchConfig.searchButton}</div>
                        </div>
                    )}
                </div>
            </Form>
        </div>
    );
};

export default GlobalFilters;