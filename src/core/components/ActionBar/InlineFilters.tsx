import React, { useState } from 'react';
import { Input, Select, DatePicker, Button, Popover, Space } from 'antd';
import { MoreHorizontal, X } from 'lucide-react';
import { useDeviceType } from '@/utils/deviceTypeStore';
import { InlineFiltersProps, FilterConfig } from './types';

const { RangePicker } = DatePicker;

/**
 * InlineFilters - Responsive filter controls
 * 
 * Responsive behavior:
 * - Desktop: Show up to maxVisible filters inline, rest in popover
 * - Mobile: Not rendered (filters go to search drawer)
 * 
 * Usage:
 * ```tsx
 * <InlineFilters
 *   filters={[
 *     { key: 'status', label: 'Status', type: 'select', options: [...] },
 *     { key: 'search', label: 'Search', type: 'text' },
 *   ]}
 *   values={filterValues}
 *   onChange={setFilterValues}
 *   maxVisible={2}
 * />
 * ```
 */
export const InlineFilters: React.FC<InlineFiltersProps> = ({
    filters,
    values,
    onChange,
    maxVisible = 2,
    onClear,
}) => {
    const deviceType = useDeviceType();
    const isMobile = deviceType === 'mobile';
    const [moreOpen, setMoreOpen] = useState(false);

    // Don't render on mobile - filters go to drawer
    if (isMobile) return null;

    // Don't render if no filters
    if (!filters || filters.length === 0) return null;

    // Split filters into visible and overflow
    const visibleFilters = filters.slice(0, maxVisible);
    const overflowFilters = filters.slice(maxVisible);
    const hasOverflow = overflowFilters.length > 0;

    // Check if any filters are active
    const hasActiveFilters = Object.keys(values).some(
        (key) => values[key] !== undefined && values[key] !== null && values[key] !== ''
    );

    const handleChange = (key: string, value: any) => {
        onChange({ ...values, [key]: value });
    };

    const renderFilter = (filter: FilterConfig) => {
        const { key, type, placeholder, options, width = 160 } = filter;
        const value = values[key];

        switch (type) {
            case 'select':
            case 'multiselect':
                return (
                    <Select
                        key={key}
                        value={value}
                        onChange={(v) => handleChange(key, v)}
                        placeholder={placeholder || filter.label}
                        style={{ width }}
                        allowClear
                        mode={type === 'multiselect' ? 'multiple' : undefined}
                        options={options}
                    />
                );
            case 'date':
                return (
                    <DatePicker
                        key={key}
                        value={value}
                        onChange={(v) => handleChange(key, v)}
                        placeholder={placeholder || filter.label}
                        style={{ width }}
                    />
                );
            case 'daterange':
                return (
                    <RangePicker
                        key={key}
                        value={value}
                        onChange={(v) => handleChange(key, v)}
                        style={{ width: width * 1.5 }}
                    />
                );
            case 'search':
            case 'text':
            default:
                return (
                    <Input.Search
                        key={key}
                        value={value}
                        onChange={(e) => handleChange(key, e.target.value)}
                        placeholder={placeholder || filter.label}
                        style={{ width }}
                        allowClear
                    />
                );
        }
    };

    const overflowContent = (
        <div className="p-2 min-w-[200px]">
            <Space direction="vertical" className="w-full">
                {overflowFilters.map((filter) => (
                    <div key={filter.key} className="w-full">
                        <label className="text-xs text-gray-500 mb-1 block">{filter.label}</label>
                        {renderFilter({ ...filter, width: 220 })}
                    </div>
                ))}
            </Space>
        </div>
    );

    return (
        <div className="action-bar-filters flex items-center gap-2">
            {/* Visible filters */}
            {visibleFilters.map(renderFilter)}

            {/* Overflow button */}
            {hasOverflow && (
                <Popover
                    content={overflowContent}
                    trigger="click"
                    placement="bottomRight"
                    open={moreOpen}
                    onOpenChange={setMoreOpen}
                >
                    <Button icon={<MoreHorizontal size={16} />} />
                </Popover>
            )}

            {/* Clear all button */}
            {hasActiveFilters && onClear && (
                <Button
                    type="text"
                    size="small"
                    icon={<X size={14} />}
                    onClick={onClear}
                    className="text-gray-400 hover:text-gray-600"
                >
                    Clear
                </Button>
            )}
        </div>
    );
};

export default InlineFilters;
