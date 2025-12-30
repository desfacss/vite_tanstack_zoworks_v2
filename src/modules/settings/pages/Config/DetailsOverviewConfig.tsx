import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Button,
  Select,
  Table,
  Space,
  Checkbox,
  Row,
  Col,
  Input,
  Switch,
  Modal,
  Typography,
  Spin,
  message,
} from 'antd';
import {
  PlusOutlined,
  UpOutlined,
  DownOutlined,
  DeleteOutlined,
  EditOutlined,
  SyncOutlined, // Added icon for manual refresh
} from '@ant-design/icons';
import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/theme-monokai';
import { supabase } from '@/core/lib/supabase'; // Assuming Supabase import is available here

const { Title } = Typography;
const { Option } = Select;

// --- Interfaces (Kept as before) ---
interface FieldConfig {
  fieldPath: string;
  label?: string;
  icon?: string;
  style?: {
    render?: string;
    colorMapping?: Record<string, string>;
    fontSize?: string;
    fontWeight?: string;
    color?: string;
    [key: string]: any;
  };
  webLink?: boolean;
  link?: string;
  imagePath?: string;
  order?: number;
}

interface GroupConfig {
  name: string;
  fields: FieldConfig[];
  show_group_name?: boolean;
  privacy_control?: boolean;
  order?: number;
}

interface ActionConfig {
  name: string;
  form?: string;
}

interface DetailOverviewConfig {
  groups: GroupConfig[];
  actions?: ActionConfig[];
  dividers?: string[];
}

interface ForeignKey {
  source_table: string;
  source_column: string;
  display_column: string;
}

interface MetadataItem {
  key: string;
  display_name: string;
  foreign_key?: ForeignKey;
  is_virtual?: boolean;
  type: string;
  table?: string;
  schema?: string;
}

interface DetailsOverviewConfigProps {
  configData: DetailOverviewConfig;
  onSave: (data: DetailOverviewConfig) => void;
  availableColumns: any[];
  metadata?: MetadataItem[];
}

// --- Supabase Fetch Utility ---

// Helper to safely trim '_id' suffix
const trimIdSuffix = (key: string): string => {
  return key.endsWith('_id') ? key.slice(0, -3) : key;
};

const fetchRelatedMetadataFromSupabase = async (sourceTable: string): Promise<MetadataItem[] | null> => {
  const [entitySchema, entityType] = sourceTable.split('.');
  
  if (!entitySchema || !entityType) {
      console.error(`Invalid sourceTable format: ${sourceTable}`);
      return null;
  }
  
  try {
    const { data, error } = await supabase
      .schema('core').from('entities')
      .select('metadata')
      .eq('entity_schema', entitySchema)
      .eq('entity_type', entityType)
      .single();

    if (error) {
      // console.error removed to reduce noise, handled by returning null
      return null;
    }

    if (data && data.metadata) {
      const metadataSource = typeof data.metadata === 'string' ? JSON.parse(data.metadata) : data.metadata;
      
      if (Array.isArray(metadataSource)) {
           return (metadataSource as MetadataItem[]).map((item) => ({
              ...item,
              table: entityType,
              schema: entitySchema,
          }));
      }
    }
    
    return null;

  } catch (e) {
    // console.error removed to reduce noise, handled by returning null
    return null;
  }
};


// 💡 REVISED: Helper function for recursive metadata expansion with circular dependency check
const expandMetadata = (
  primaryMetadata: MetadataItem[],
  relatedMetadata: Record<string, MetadataItem[]>,
  prefix: string = '',
  visitedEntities: Set<string> = new Set(), // Tracks entities in current path
): MetadataItem[] => {
  let expandedFields: MetadataItem[] = [];

  for (const item of primaryMetadata) {
    const currentKey = prefix ? `${prefix}.${item.key}` : item.key;
    const currentDisplayName = prefix
      ? `${prefix.charAt(0).toUpperCase() + prefix.slice(1)}: ${item.display_name}`
      : item.display_name;

    // 1. Check for Foreign Keys (Relationships)
    if (item.foreign_key && item.foreign_key.source_table) {
      const sourceTable = item.foreign_key.source_table;
      const objectKey = item.key; // e.g., 'account_id'

      if (relatedMetadata[sourceTable]) {
        
        // --- START FIX: Circular Dependency Check ---
        if (visitedEntities.has(sourceTable)) {
            console.warn(`Circular dependency detected: Skipping recursion into ${sourceTable} via ${objectKey}`);
            // If circular, we only list the FK field itself (e.g., 'parent_account_id' UUID)
            expandedFields.push({
                ...item,
                key: currentKey, // Use the non-trimmed key for the raw ID field
                display_name: currentDisplayName,
            });
            continue; 
        }
        const nextVisited = new Set(visitedEntities).add(sourceTable);
        // --- END FIX ---
        
        const nestedPrefix = trimIdSuffix(objectKey); // e.g., 'account'
        
        // Add the top-level FK object field itself (e.g., 'account')
        expandedFields.push({
          ...item,
          key: nestedPrefix, 
          display_name: item.display_name.replace('Id', '') + ' (Object)',
          is_virtual: true,
        } as MetadataItem);

        // Recursively expand, passing the updated visited set
        const nestedFields = expandMetadata(
            relatedMetadata[sourceTable], 
            relatedMetadata, 
            nestedPrefix, 
            nextVisited // Pass the updated set
        );
        expandedFields.push(...nestedFields);

        // Skip adding the raw FK ID field since the object is expanded
        continue;
      }
    }

    // 2. Add Base/Leaf Fields (or FK IDs without metadata / outside recursion)
    expandedFields.push({
      ...item,
      key: currentKey,
      display_name: currentDisplayName,
    });
  }

  return expandedFields;
};

// 💡 REVISED: Function to generate default groups based on metadata
const generateDefaultGroups = (
  primaryMetadata: MetadataItem[],
  relatedMetadata: Record<string, MetadataItem[]>,
): GroupConfig[] => {
  const defaultGroups: GroupConfig[] = [];
  const primaryFields: FieldConfig[] = [];
  let groupOrder = 1;

  // --- 1. Primary Fields Group ---
  for (const item of primaryMetadata) {
    // Skip FKs that have related metadata for now
    if (
      item.foreign_key &&
      item.foreign_key.source_table &&
      relatedMetadata[item.foreign_key.source_table]
    ) {
      continue;
    }

    // Process base fields and JSONb paths
    primaryFields.push({
      fieldPath: item.key,
      label: item.display_name,
      order: primaryFields.length + 1,
    });
  }

  if (primaryFields.length > 0) {
    defaultGroups.push({
      name: 'Primary Details',
      fields: primaryFields,
      show_group_name: true,
      privacy_control: false,
      order: groupOrder++,
    });
  }

  // --- 2. Foreign Key Groups ---
  for (const item of primaryMetadata) {
    if (
      item.foreign_key &&
      item.foreign_key.source_table &&
      relatedMetadata[item.foreign_key.source_table]
    ) {
      const table = item.foreign_key.source_table;
      const objectKey = item.key;
      
      const trimmedObjectKey = trimIdSuffix(objectKey); 
      const objectDisplayName = item.display_name.replace(' Id', '');

      const nestedFields: FieldConfig[] = [];
      const relatedMeta = relatedMetadata[table];
      
      // Add fields from the related entity, prefixing the key with the trimmed object key
      for (const relatedItem of relatedMeta) {
          nestedFields.push({
            fieldPath: `${trimmedObjectKey}.${relatedItem.key}`, 
            label: relatedItem.display_name,
            order: nestedFields.length + 1,
          });
      }

      if (nestedFields.length > 0) {
        defaultGroups.push({
          name: `${objectDisplayName} Details`,
          fields: nestedFields,
          show_group_name: true,
          privacy_control: false,
          order: groupOrder++,
        });
      }
    }
  }

  return defaultGroups;
};

// --- REACT COMPONENT: DetailsOverviewConfig ---

const DetailsOverviewConfig: React.FC<DetailsOverviewConfigProps> = ({
  configData,
  onSave,
  metadata,
}) => {
  // 💡 FIX 1: Initialize state directly from configData. If configData is empty, states are empty.
  const [groups, setGroups] = useState<GroupConfig[]>(configData?.groups || []);
  const [actions, setActions] = useState<ActionConfig[]>(configData?.actions || []);
  const [dividers, setDividers] = useState<string[]>(configData?.dividers || []);
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentStyle, setCurrentStyle] = useState<string>('');
  const [currentField, setCurrentField] = useState<{
    groupIndex: number;
    fieldIndex: number;
  } | null>(null);
  
  const [relatedMetadata, setRelatedMetadata] = useState<Record<string, MetadataItem[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  // 1. Fetch Related Metadata (Always runs to enable the Generate button)
  useEffect(() => {
    const loadRelatedMetadata = async () => {
      if (!metadata) {
        setIsLoading(false);
        return;
      }

      const fkFields = metadata.filter((item) => item.foreign_key?.source_table);
      const uniqueSourceTables = Array.from(
        new Set(fkFields.map((item) => item.foreign_key!.source_table)),
      );

      const fetchedMetadata: Record<string, MetadataItem[]> = {};
      let hasError = false;

      for (const table of uniqueSourceTables) {
        const data = await fetchRelatedMetadataFromSupabase(table);
        if (data) {
          fetchedMetadata[table] = data;
        } else {
            hasError = true;
            console.warn(`Could not fetch metadata for related table: ${table}`);
        }
      }
      
      if (hasError) {
          // message.warning("Could not load all related entity metadata. Check console for details.");
      }

      setRelatedMetadata(fetchedMetadata);
      setIsLoading(false);
    };

    loadRelatedMetadata();
  }, [metadata]);
  
  // 💡 FIX 2: Memoize the function to generate default groups and update state
  const handleGenerateDefaultGroups = useCallback(() => {
      if (!metadata || isLoading) {
          message.info("Metadata is still loading. Please wait.");
          return;
      }
      
      setIsGenerating(true);
      try {
          const defaultGroups = generateDefaultGroups(metadata, relatedMetadata);
          setGroups(defaultGroups);
          setActions([]);
          setDividers([]);
          message.success("Default groups and fields generated successfully.");
      } catch (error) {
          console.error("Error generating default groups:", error);
          message.error("Failed to generate groups.");
      } finally {
          setIsGenerating(false);
      }
  }, [metadata, relatedMetadata, isLoading]);

  // Memoize the expanded list of selectable fields
  const allExpandedFields = useMemo(() => {
    if (!metadata) return [];
    return expandMetadata(metadata, relatedMetadata); 
  }, [metadata, relatedMetadata]);

  // --- Handlers (using useCallback for optimization) ---

  const handleAddGroup = useCallback(() => {
    setGroups((prev) => [
      ...prev,
      {
        name: `Group ${prev.length + 1}`,
        fields: [],
        show_group_name: true,
        privacy_control: false,
        order: prev.length + 1,
      },
    ]);
  }, []);

  const handleGroupChange = useCallback((index: number, key: keyof GroupConfig, value: any) => {
    setGroups((prev) => {
      const updatedGroups = [...prev];
      updatedGroups[index] = { ...updatedGroups[index], [key]: value };
      return updatedGroups;
    });
  }, []);

  const handleRemoveGroup = useCallback(
    (index: number) => {
      setGroups((prev) => {
        const updatedGroups = prev.filter((_, i) => i !== index);
        return updatedGroups.map((group, i) => ({ ...group, order: i + 1 }));
      });
      setDividers((prev) => prev.filter((divider) => divider !== groups[index]?.name));
    },
    [groups],
  );

  const moveGroup = useCallback((index: number, direction: number) => {
    setGroups((prev) => {
      const newGroups = [...prev];
      const [movedGroup] = newGroups.splice(index, 1);
      newGroups.splice(index + direction, 0, movedGroup);
      return newGroups.map((group, i) => ({ ...group, order: i + 1 }));
    });
  }, []);

  const handleAddField = useCallback((groupIndex: number) => {
    setGroups((prev) => {
      const updatedGroups = [...prev];
      updatedGroups[groupIndex].fields = [
        ...updatedGroups[groupIndex].fields,
        {
          fieldPath: '',
          label: '',
          order: updatedGroups[groupIndex].fields.length + 1,
        },
      ];
      return updatedGroups;
    });
  }, []);

  const handleFieldChange = useCallback(
    (groupIndex: number, fieldIndex: number, key: keyof FieldConfig | string, value: any) => {
      setGroups((prev) => {
        const updatedGroups = [...prev];
        const updatedFields = [...updatedGroups[groupIndex].fields];
        const field = { ...updatedFields[fieldIndex] };

        if (key === 'fieldPath') {
          const selectedColumn = allExpandedFields?.find((col) => col.key === value);
          if (selectedColumn) {
            field.fieldPath = value;
            field.label = selectedColumn.display_name;
          } else {
            field.label = value;
            field.fieldPath = value;
          }
        } else if (key === 'style') {
          try {
            field.style = value ? JSON.parse(value) : undefined;
          } catch (error) {
            console.error('Invalid JSON for style:', error);
            field.style = undefined;
          }
        } else {
          (field as any)[key] = value;
        }

        updatedFields[fieldIndex] = field;
        updatedGroups[groupIndex].fields = updatedFields;
        return updatedGroups;
      });
    },
    [allExpandedFields],
  );

  const handleRemoveField = useCallback((groupIndex: number, fieldIndex: number) => {
    setGroups((prev) => {
      const updatedGroups = [...prev];
      updatedGroups[groupIndex].fields = updatedGroups[groupIndex].fields
        .filter((_, i) => i !== fieldIndex)
        .map((field, i) => ({ ...field, order: i + 1 }));
      return updatedGroups;
    });
  }, []);

  const moveField = useCallback((groupIndex: number, fieldIndex: number, direction: number) => {
    setGroups((prev) => {
      const updatedGroups = [...prev];
      const fields = [...updatedGroups[groupIndex].fields];
      const [movedField] = fields.splice(fieldIndex, 1);
      fields.splice(fieldIndex + direction, 0, movedField);
      updatedGroups[groupIndex].fields = fields.map((field, i) => ({
        ...field,
        order: i + 1,
      }));
      return updatedGroups;
    });
  }, []);

  const handleAddAction = useCallback(() => {
    setActions((prev) => [...prev, { name: '', form: '' }]);
  }, []);

  const handleActionChange = useCallback((index: number, key: keyof ActionConfig, value: string) => {
    setActions((prev) => {
      const updatedActions = [...prev];
      updatedActions[index] = { ...updatedActions[index], [key]: value };
      return updatedActions;
    });
  }, []);

  const handleRemoveAction = useCallback((index: number) => {
    setActions((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleDividerChange = useCallback((groupName: string) => {
    setDividers((prev) =>
      prev.includes(groupName) ? prev.filter((name) => name !== groupName) : [...prev, groupName],
    );
  }, []);

  const handleSaveConfig = useCallback(() => {
    onSave({ groups, actions, dividers });
  }, [groups, actions, dividers, onSave]);

  const handleOpenStyleModal = useCallback((groupIndex: number, fieldIndex: number) => {
    const field = groups[groupIndex].fields[fieldIndex];
    setCurrentStyle(field.style ? JSON.stringify(field.style, null, 2) : '{}');
    setCurrentField({ groupIndex, fieldIndex });
    setIsModalVisible(true);
  }, [groups]);

  const handleModalOk = useCallback(() => {
    if (currentField) {
      handleFieldChange(currentField.groupIndex, currentField.fieldIndex, 'style', currentStyle);
    }
    setIsModalVisible(false);
    setCurrentField(null);
    setCurrentStyle('');
  }, [currentField, currentStyle, handleFieldChange]);

  const handleModalCancel = useCallback(() => {
    setIsModalVisible(false);
    setCurrentField(null);
    setCurrentStyle('');
  }, []);

  // --- Render Functions ---

  const renderActionRow = (action: ActionConfig, index: number) => (
    <Row gutter={8} key={index} style={{ marginBottom: 8 }}>
      <Col span={10}>
        <Input
          value={action.form}
          onChange={(e) => handleActionChange(index, 'form', e.target.value)}
          placeholder="Form"
        />
      </Col>
      <Col span={10}>
        <Input
          value={action.name}
          onChange={(e) => handleActionChange(index, 'name', e.target.value)}
          placeholder="Name"
        />
      </Col>
      <Col span={4}>
        <Button icon={<DeleteOutlined />} onClick={() => handleRemoveAction(index)} danger />
      </Col>
    </Row>
  );

  // Placeholder for fieldColumns
  const fieldColumns = useMemo(
    () => [
      {
        title: 'Order',
        dataIndex: 'order',
        key: 'order',
        width: 60,
      },
      {
        title: 'Field Path',
        dataIndex: 'fieldPath',
        key: 'fieldPath',
        render: (_: any, record: FieldConfig, index: number, groupIndex: number) => (
          <Select
            showSearch
            value={record.fieldPath || ''}
            onChange={(value) => handleFieldChange(groupIndex, index, 'fieldPath', value)}
            style={{ width: '100%' }}
            filterOption={(input, option) =>
              (option?.children as string).toLowerCase().includes(input.toLowerCase())
            }
          >
            {allExpandedFields.map((col) => (
              <Option key={col.key} value={col.key}>
                {col.display_name} ({col.key})
              </Option>
            ))}
          </Select>
        ),
      },
      {
        title: 'Label',
        dataIndex: 'label',
        key: 'label',
        render: (_: any, record: FieldConfig, index: number, groupIndex: number) => (
          <Input
            value={record.label || ''}
            onChange={(e) => handleFieldChange(groupIndex, index, 'label', e.target.value)}
            placeholder="Label"
          />
        ),
      },
      {
        title: 'Style',
        dataIndex: 'style',
        key: 'style',
        width: 120,
        render: (_: any, record: FieldConfig, index: number, groupIndex: number) => (
          <Button icon={<EditOutlined />} onClick={() => handleOpenStyleModal(groupIndex, index)}>
            Edit JSON
          </Button>
        ),
      },
      {
        title: 'Web Link',
        dataIndex: 'webLink',
        key: 'webLink',
        width: 80,
        render: (_: any, record: FieldConfig, index: number, groupIndex: number) => (
          <Switch
            checked={record.webLink || false}
            onChange={(checked) => handleFieldChange(groupIndex, index, 'webLink', checked)}
          />
        ),
      },
      {
        title: 'Actions',
        key: 'actions',
        width: 150,
        render: (_: any, __: any, index: number, groupIndex: number) => (
          <Space size="small">
            <Button
              icon={<UpOutlined />}
              onClick={() => moveField(groupIndex, index, -1)}
              disabled={index === 0}
            />
            <Button
              icon={<DownOutlined />}
              onClick={() => moveField(groupIndex, index, 1)}
              disabled={index === groups[groupIndex]?.fields.length - 1}
            />
            <Button
              icon={<DeleteOutlined />}
              danger
              onClick={() => handleRemoveField(groupIndex, index)}
            />
          </Space>
        ),
      },
    ],
    [allExpandedFields, groups, handleFieldChange, handleOpenStyleModal, moveField, handleRemoveField],
  );

  // Placeholder for groupColumns
  const groupColumns = useMemo(
    () => [
      {
        title: 'Order',
        dataIndex: 'order',
        key: 'order',
        width: 80,
      },
      {
        title: 'Group Name',
        dataIndex: 'name',
        key: 'name',
        render: (_: any, record: GroupConfig, index: number) => (
          <Input
            value={record.name}
            onChange={(e) => handleGroupChange(index, 'name', e.target.value)}
            placeholder="Group Name"
          />
        ),
      },
      {
        title: 'Show Name',
        dataIndex: 'show_group_name',
        key: 'show_group_name',
        width: 100,
        render: (_: any, record: GroupConfig, index: number) => (
          <Switch
            checked={record.show_group_name}
            onChange={(checked) => handleGroupChange(index, 'show_group_name', checked)}
          />
        ),
      },
      {
        title: 'Privacy Control',
        dataIndex: 'privacy_control',
        key: 'privacy_control',
        width: 100,
        render: (_: any, record: GroupConfig, index: number) => (
          <Switch
            checked={record.privacy_control}
            onChange={(checked) => handleGroupChange(index, 'privacy_control', checked)}
          />
        ),
      },
      {
        title: 'Divider',
        key: 'divider',
        width: 80,
        render: (_: any, record: GroupConfig) => (
          <Checkbox
            checked={dividers.includes(record.name)}
            onChange={() => handleDividerChange(record.name)}
          />
        ),
      },
      {
        title: 'Actions',
        key: 'actions',
        width: 150,
        render: (_: any, __: any, index: number) => (
          <Space size="small">
            <Button
              icon={<UpOutlined />}
              onClick={() => moveGroup(index, -1)}
              disabled={index === 0}
            />
            <Button
              icon={<DownOutlined />}
              onClick={() => moveGroup(index, 1)}
              disabled={index === groups.length - 1}
            />
            <Button icon={<DeleteOutlined />} danger onClick={() => handleRemoveGroup(index)} />
          </Space>
        ),
      },
    ],
    [dividers, groups.length, handleDividerChange, handleGroupChange, moveGroup, handleRemoveGroup],
  );


  if (isLoading) {
    return (
      <div style={{ padding: '50px', textAlign: 'center' }}>
        <Spin size="large" />
        <Title level={5}>Loading metadata and resolving relationships from Supabase...</Title>
      </div>
    );
  }

  return (
    <div>
      <Title level={2}>Details Overview Configuration</Title>
      
      {/* --- Generate Defaults Button --- */}
      <Row justify="end" style={{ marginBottom: 20 }}>
        <Button
          type="default"
          icon={<SyncOutlined spin={isGenerating} />}
          onClick={handleGenerateDefaultGroups}
          disabled={isGenerating || !metadata || isLoading}
        >
          Generate Default Groups
        </Button>
      </Row>
      
      <hr/>

      {/* --- Groups Section --- */}
      <Title level={4}>Groups 📑</Title>
      <Table
        dataSource={groups}
        columns={groupColumns}
        rowKey="order"
        pagination={false}
        style={{ marginBottom: '20px' }}
      />
      <Button
        type="dashed"
        icon={<PlusOutlined />}
        onClick={handleAddGroup}
        style={{ marginBottom: '40px' }}
      >
        Add Group
      </Button>

      {/* --- Fields Sections --- */}
      {groups.map((group, groupIndex) => (
        <div key={group.name} style={{ border: '1px solid #e8e8e8', padding: '15px', marginBottom: '30px' }}>
          <Title level={5} style={{ marginTop: 0 }}>
            Fields for **{group.name}**
          </Title>
          <Table
            dataSource={group.fields}
            columns={fieldColumns.map((col) => ({
              ...col,
              render: col.render
                ? (text: any, record: any, index: number) =>
                    // @ts-ignore
                    col.render(text, record, index, groupIndex)
                : undefined,
            }))}
            rowKey="order"
            pagination={false}
          />
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={() => handleAddField(groupIndex)}
            style={{ marginTop: '10px' }}
          >
            Add Field
          </Button>
        </div>
      ))}

      {/* --- Actions Section --- */}
      <Title level={4}>Actions ⚡</Title>
      {actions.map((action, index) => renderActionRow(action, index))}
      <Button
        type="dashed"
        icon={<PlusOutlined />}
        onClick={handleAddAction}
        style={{ marginBottom: '40px' }}
      >
        Add Action
      </Button>

      {/* --- Save Button --- */}
      <Row justify="end">
        <Space>
           <Button type="primary" onClick={handleSaveConfig} size="large">
            Save Configuration
           </Button>
        </Space>
      </Row>

      {/* --- Style Editor Modal --- */}
      <Modal
        title="Edit Style (JSON)"
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={600}
      >
        <AceEditor
          mode="json"
          theme="monokai"
          name="style_editor"
          onChange={setCurrentStyle}
          value={currentStyle}
          fontSize={14}
          showPrintMargin={true}
          showGutter={true}
          highlightActiveLine={true}
          setOptions={{
            enableBasicAutocompletion: true,
            enableLiveAutocompletion: true,
            enableSnippets: true,
            showLineNumbers: true,
            tabSize: 2,
          }}
          style={{ width: '100%', height: '300px' }}
        />
      </Modal>
    </div>
  );
};

export default DetailsOverviewConfig;
