/**
 * PartitionFilterBuilder Component
 * 
 * A visual builder for constructing SQL WHERE clause filters.
 * Used when creating logical entity variants to define the partition criteria.
 * 
 * Example output: "lifecycle_stage = 'lead'" or "status IN ('active', 'pending')"
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Select, Input, Button, Space, Card, Typography, Tag, Tooltip } from 'antd';
import { PlusOutlined, DeleteOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { supabase } from '@/core/lib/supabase';
import type { FilterOperator, PartitionFilter } from './types';

const { Text } = Typography;

// Supported filter operators
const OPERATORS: { value: FilterOperator; label: string; needsValue: boolean }[] = [
  { value: '=', label: 'equals (=)', needsValue: true },
  { value: '!=', label: 'not equals (!=)', needsValue: true },
  { value: 'IN', label: 'in list (IN)', needsValue: true },
  { value: 'NOT IN', label: 'not in list (NOT IN)', needsValue: true },
  { value: 'LIKE', label: 'contains (LIKE)', needsValue: true },
  { value: '>', label: 'greater than (>)', needsValue: true },
  { value: '<', label: 'less than (<)', needsValue: true },
  { value: '>=', label: 'greater or equal (>=)', needsValue: true },
  { value: '<=', label: 'less or equal (<=)', needsValue: true },
  { value: 'IS NULL', label: 'is empty (IS NULL)', needsValue: false },
  { value: 'IS NOT NULL', label: 'has value (IS NOT NULL)', needsValue: false },
];

interface ColumnInfo {
  key: string;
  type: string;
  display_name?: string;
}

export interface PartitionFilterBuilderProps {
  schema: string;
  tableName: string;
  value?: string;  // SQL WHERE clause string
  onChange: (filterSql: string, filters: PartitionFilter[]) => void;
  disabled?: boolean;
}

const PartitionFilterBuilder: React.FC<PartitionFilterBuilderProps> = ({
  schema,
  tableName,
  value,
  onChange,
  disabled = false,
}) => {
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [filters, setFilters] = useState<PartitionFilter[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatedSql, setGeneratedSql] = useState('');

  // Fetch columns from base table
  useEffect(() => {
    const fetchColumns = async () => {
      if (!schema || !tableName) {
        setColumns([]);
        return;
      }
      setLoading(true);
      try {
        const { data, error } = await supabase
          .schema('core')
          .rpc('met_scan_schema_columns', {
            p_schema_name: schema,
            p_table_name: tableName,
            p_is_aggressive: false,
          });
        if (!error && data) {
          setColumns(data.map((col: any) => ({
            key: col.key,
            type: col.type,
            display_name: col.display_name || col.key,
          })));
        }
      } catch (err) {
        console.error('Error fetching columns:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchColumns();
  }, [schema, tableName]);

  // Convert filters to SQL and notify parent
  const generateSql = useCallback((currentFilters: PartitionFilter[]) => {
    const sql = currentFilters
      .filter(f => f.column && f.operator)
      .map(f => {
        const operator = f.operator;
        
        // Operators that don't need a value
        if (operator === 'IS NULL' || operator === 'IS NOT NULL') {
          return `${f.column} ${operator}`;
        }
        
        // Handle IN/NOT IN with array values
        if (operator === 'IN' || operator === 'NOT IN') {
          const valuesArray = Array.isArray(f.value) 
            ? f.value 
            : String(f.value).split(',').map(v => v.trim()).filter(Boolean);
          const formattedValues = valuesArray.map(v => `'${v}'`).join(', ');
          return `${f.column} ${operator} (${formattedValues})`;
        }
        
        // Handle LIKE with wildcards
        if (operator === 'LIKE') {
          return `${f.column} LIKE '%${f.value}%'`;
        }
        
        // Standard comparison operators
        const value = typeof f.value === 'string' ? f.value : String(f.value);
        // Check if value looks like a number
        const isNumeric = !isNaN(Number(value)) && value.trim() !== '';
        return isNumeric 
          ? `${f.column} ${operator} ${value}`
          : `${f.column} ${operator} '${value}'`;
      })
      .join(' AND ');
    
    setGeneratedSql(sql);
    onChange(sql, currentFilters);
  }, [onChange]);

  // Update SQL when filters change
  useEffect(() => {
    generateSql(filters);
  }, [filters, generateSql]);

  // Add a new filter rule
  const addFilter = () => {
    const newFilter: PartitionFilter = {
      id: `filter_${Date.now()}`,
      column: '',
      operator: '=',
      value: '',
    };
    setFilters([...filters, newFilter]);
  };

  // Remove a filter rule
  const removeFilter = (id: string) => {
    setFilters(filters.filter(f => f.id !== id));
  };

  // Update a specific filter field
  const updateFilter = (id: string, field: keyof PartitionFilter, fieldValue: any) => {
    setFilters(filters.map(f => {
      if (f.id !== id) return f;
      
      // Reset value when operator changes to one that doesn't need value
      if (field === 'operator') {
        const op = OPERATORS.find(o => o.value === fieldValue);
        if (op && !op.needsValue) {
          return { ...f, [field]: fieldValue, value: '' };
        }
      }
      
      return { ...f, [field]: fieldValue };
    }));
  };

  // Check if operator needs a value input
  const operatorNeedsValue = (operator: FilterOperator): boolean => {
    const op = OPERATORS.find(o => o.value === operator);
    return op?.needsValue ?? true;
  };

  // Get placeholder text based on operator
  const getValuePlaceholder = (operator: FilterOperator): string => {
    if (operator === 'IN' || operator === 'NOT IN') {
      return 'value1, value2, value3';
    }
    if (operator === 'LIKE') {
      return 'search text';
    }
    return 'value';
  };

  return (
    <Card 
      size="small" 
      title={
        <Space>
          <span>Partition Filter</span>
          <Tooltip title="Define conditions to filter records from the base table. Multiple conditions are combined with AND.">
            <InfoCircleOutlined style={{ color: '#1890ff' }} />
          </Tooltip>
        </Space>
      }
      style={{ marginTop: 16 }}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        {filters.length === 0 && (
          <Text type="secondary" style={{ fontStyle: 'italic' }}>
            No filters defined. Click "Add Condition" to create a partition filter.
          </Text>
        )}
        
        {filters.map((filter, index) => (
          <Space key={filter.id} align="start" wrap style={{ width: '100%' }}>
            {index > 0 && <Tag color="orange">AND</Tag>}
            
            <Select
              placeholder="Select column"
              style={{ width: 180 }}
              value={filter.column || undefined}
              onChange={(val) => updateFilter(filter.id!, 'column', val)}
              loading={loading}
              disabled={disabled}
              showSearch
              optionFilterProp="children"
              options={columns.map(c => ({ 
                value: c.key, 
                label: c.display_name || c.key,
                title: `${c.key} (${c.type})`,
              }))}
            />
            
            <Select
              placeholder="Operator"
              style={{ width: 180 }}
              value={filter.operator}
              onChange={(val) => updateFilter(filter.id!, 'operator', val)}
              disabled={disabled}
              options={OPERATORS.map(o => ({ value: o.value, label: o.label }))}
            />
            
            {operatorNeedsValue(filter.operator) && (
              <Input
                placeholder={getValuePlaceholder(filter.operator)}
                style={{ width: 200 }}
                value={Array.isArray(filter.value) ? filter.value.join(', ') : filter.value}
                onChange={(e) => updateFilter(filter.id!, 'value', e.target.value)}
                disabled={disabled}
              />
            )}
            
            <Button
              icon={<DeleteOutlined />}
              danger
              size="small"
              onClick={() => removeFilter(filter.id!)}
              disabled={disabled}
            />
          </Space>
        ))}
        
        <Button 
          type="dashed" 
          icon={<PlusOutlined />} 
          onClick={addFilter}
          disabled={disabled || !schema || !tableName}
          style={{ width: '100%', marginTop: 8 }}
        >
          Add Condition
        </Button>
        
        {generatedSql && (
          <div style={{ marginTop: 12, padding: '8px 12px', background: '#f5f5f5', borderRadius: 4 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>Generated SQL WHERE clause:</Text>
            <div style={{ marginTop: 4 }}>
              <Tag color="blue" style={{ whiteSpace: 'pre-wrap', maxWidth: '100%' }}>
                {generatedSql}
              </Tag>
            </div>
          </div>
        )}
      </Space>
    </Card>
  );
};

export default PartitionFilterBuilder;
