import React from 'react';
import { DatePicker, Input } from 'antd';

const { RangePicker } = DatePicker;
const { Search } = Input;

interface SearchDateFilterProps {
    onSearch: (value: string) => void;
    onDateChange: (dates: any, dateStrings: [string, string]) => void;
    className?: string;
}

export const SearchDateFilter: React.FC<SearchDateFilterProps> = ({
    onSearch,
    onDateChange,
    className
}) => {
    return (
        <div className={`flex flex-col gap-4 ${className || ''}`}>
            <Search
                placeholder="Search..."
                allowClear
                onSearch={onSearch}
                style={{ width: '100%' }}
            />
            <RangePicker
                onChange={onDateChange}
                style={{ width: '100%' }}
            />
        </div>
    );
};
