import React, { useState, useEffect } from 'react';
import { supabase } from '@/core/lib/supabase';
import { QueryBuilder, formatQuery, RuleGroupType } from 'react-querybuilder';
import { Typography } from 'antd';
// import 'react-querybuilder/dist/query-builder.css';
const { Title } = Typography;

interface Field {
  name: string;
  label: string;
  type: string;
  values?: any[];
  inputType?: string;
}

interface MasterObjectItem {
  key: string;
  type: string;
  foreign_key?: {
    source_table: string;
    source_column: string;
    display_column: string;
  };
}

interface QueryBuilderComponentProps {
  entityType?: string;
  masterObject?: MasterObjectItem[];
}

const QueryBuilderComponent: React.FC<QueryBuilderComponentProps> = ({ entityType, masterObject }) => {
  const [query, setQuery] = useState<RuleGroupType>({ combinator: 'and', rules: [] });
  const [data, setData] = useState<any[]>([]);
  const [sqlFilter, setSqlFilter] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Field[]>([]);

  const buildSupabaseFilter = (query: any, fields: Field[]): string => {
    console.log('Building Supabase filter for query:', JSON.stringify(query, null, 2));

    const operatorMap: { [key: string]: string } = {
      '=': 'eq',
      '!=': 'neq',
      '<': 'lt',
      '>': 'gt',
      '<=': 'lte',
      '>=': 'gte',
      'like': 'ilike',
      'ILIKE': 'ilike',
      'not like': 'not.ilike',
    };

    const processRule = (rule: any): string => {
      console.log('Processing individual rule:', JSON.stringify(rule, null, 2));
      const field = rule.field;
      const operator = rule.operator;
      const value = rule.value;
      const fieldConfig = fields.find(f => f.name === field);
      console.log('Field configuration:', fieldConfig);

      const parseFieldName = (fieldName: string) => {
        const parts = fieldName.split('.');
        if (parts.length > 1) {
          const baseField = parts[0];
          const nestedPath = parts.slice(1).join('->');
          return { baseField, nestedPath };
        }
        return { baseField: fieldName };
      };

      const { baseField, nestedPath } = parseFieldName(field);
      console.log('Parsed field:', { baseField, nestedPath });
      const mappedOperator = operatorMap[operator] || operator;
      console.log('Mapped operator:', mappedOperator);

      if (nestedPath) {
        return nestedPath
          ? `${baseField}->>${nestedPath}.${mappedOperator}.${JSON.stringify(value)}`
          : `${baseField}.${mappedOperator}.${JSON.stringify(value)}`;
      }
      return `${field}.${mappedOperator}.${JSON.stringify(value)}`;
    };

    const processGroup = (group: any): string => {
      console.log('Processing query group:', JSON.stringify(group, null, 2));
      const conditions = group.rules.map((rule: any) =>
        rule.rules ? processGroup(rule) : processRule(rule)
      );
      const combinator = group.combinator === 'and'
        ? '(' + conditions.join(',') + ')'
        : conditions.join(',');
      console.log('Processed group conditions:', combinator);
      return combinator;
    };

    return processGroup(query);
  };

  const mapType = (dbType: string, item?: MasterObjectItem): string => {
    console.log('Mapping database type:', dbType, 'Item:', item);
    if (item && item.foreign_key) {
      return 'select';
    }
    switch (dbType) {
      case 'bigint':
      case 'integer':
        return 'number';
      case 'character varying':
      case 'text':
      case 'uuid':
        return 'string';
      case 'timestamp with time zone':
        return 'datetime';
      case 'boolean':
        return 'boolean';
      case 'jsonb':
        return 'json';
      case 'ARRAY':
        return 'array';
      default:
        console.log('Defaulting to string for unknown type:', dbType);
        return 'string';
    }
  };

  useEffect(() => {
    const loadFields = async () => {
      console.log('Starting to load fields for entityType:', entityType);
      setLoading(true);
      try {
        const columns = masterObject || [];
        console.log('Master Object:', columns);
        const formattedFields: Field[] = columns.map(col => ({
          name: col.key,
          label: col.key.replace('_', ' ').toUpperCase(),
          type: mapType(col.type, col),
          values: col.foreign_key ? [] : undefined,
          inputType: col.foreign_key ? 'select' : undefined,
        }));
        console.log('Formatted fields:', formattedFields);
        setFields(formattedFields);
      } catch (err) {
        console.error('Error loading fields:', err);
        setError('Error loading fields: ' + (err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    if (entityType) {
      console.log('Entity type provided, fetching fields...');
      loadFields();
    } else {
      console.log('No entity type provided, skipping field fetch.');
    }
  }, [entityType, masterObject]);

  const handleFetch = async () => {
    if (!entityType) return;
    console.log('Starting data fetch with query:', JSON.stringify(query, null, 2));
    setLoading(true);
    setError(null);
    try {
      const filterConditions = buildSupabaseFilter(query, fields);
      console.log('Generated Supabase filter conditions:', filterConditions);
      let queryBuilder: any = supabase.from(entityType).select('*');
      if (filterConditions) {
        queryBuilder = queryBuilder.or(filterConditions);
      }
      const { data, error } = await queryBuilder;
      if (error) {
        console.error('Error fetching data:', error);
        setError(error.message);
      } else {
        console.log('Data fetched successfully:', data);
        setData(data);
      }
    } catch (err: any) {
      console.error('Unexpected error in handleFetch:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const DynamicSelect: React.FC<{
    foreignKeyConfig: NonNullable<MasterObjectItem['foreign_key']>;
    value: any;
    onChange: (value: any) => void;
  }> = ({ foreignKeyConfig, value, onChange }) => {
    const [options, setOptions] = useState<{ value: string; label: string }[]>([]);

    useEffect(() => {
      const fetchOptions = async () => {
        try {
          if (!foreignKeyConfig) return;
          console.log('Fetching options for:', foreignKeyConfig.source_table);
          const { data, error } = await supabase
            .from(foreignKeyConfig.source_table)
            .select(`${foreignKeyConfig.source_column}, ${foreignKeyConfig.display_column}`)
            .order(foreignKeyConfig.display_column, { ascending: true });
          if (error) throw error;
          setOptions(
            data.map(item => ({
              value: item[foreignKeyConfig.source_column],
              label: item[foreignKeyConfig.display_column],
            }))
          );
        } catch (err) {
          console.error('Failed to fetch options:', err);
        }
      };
      fetchOptions();
    }, [foreignKeyConfig]);

    return (
      <select value={value || ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select...</option>
        {options.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    );
  };

  const valueEditor = (props: any) => {
    const { fieldData, field, value, handleOnChange } = props;
    const item = masterObject?.find(item => item.key === fieldData.name);
    console.log('Rendering value editor for:', fieldData, 'Item:', item);

    if (item && item.foreign_key) {
      return (
        <DynamicSelect
          foreignKeyConfig={item.foreign_key}
          value={value}
          onChange={handleOnChange}
        />
      );
    } else if (fieldData.type === 'boolean') {
      return (
        <select value={value === true ? 'true' : 'false'} onChange={(e) => handleOnChange(e.target.value === 'true')}>
          <option value="true">True</option>
          <option value="false">False</option>
        </select>
      );
    } else if (fieldData.type === 'datetime') {
      return <input type="datetime-local" value={value || ''} onChange={(e) => handleOnChange(e.target.value)} />;
    }
    return <input type="text" value={value || ''} onChange={(e) => handleOnChange(e.target.value)} />;
  };

  return (
    <div>
      <h2>Query Builder for Table: {entityType || 'Select a table'}</h2>
      {fields.length > 0 ? (
        <QueryBuilder
          fields={fields}
          query={query}
          onQueryChange={(newQuery: RuleGroupType) => {
            console.log('Query updated:', newQuery);
            setQuery(newQuery);
          }}
          controlElements={{
            combinatorSelector: (props:any) => (
              <select value={props.value} onChange={(e) => props.handleOnChange(e.target.value)}>
                <option value="and">AND</option>
                <option value="or">OR</option>
              </select>
            ),
            valueEditor,
          }}
        />
      ) : loading ? (
        <p>Loading fields...</p>
      ) : (
        <p>No fields available. Please select a valid entity type.</p>
      )}
      <button onClick={handleFetch} disabled={loading || fields.length === 0}>
        {loading ? 'Loading...' : 'Fetch Data'}
      </button>
      {error && <div style={{ color: 'red' }}>{error}</div>}
       <Title level={4}>Fetched Results: </Title>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
};

export default QueryBuilderComponent;
