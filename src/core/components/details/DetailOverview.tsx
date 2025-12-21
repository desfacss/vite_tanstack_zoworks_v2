// DetailOverview.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Card, Divider, Tag, Button, Typography, Switch, message, Spin } from 'antd';
import * as Icons from '@ant-design/icons';
import { supabase } from '@/lib/supabase';
import QRCard from './QRCard';
import RowActions from '../../DynamicViews/RowActions';
import TaskReportPage from '../doc/ServiceReportDrawer';
import DocView from './DocView';
import ApprovalActionButtons from './ApprovalActionButtons';
import Expensesheet from './Expensesheet';
import Timesheet from './Timesheet';
import { useAuthStore } from '../../../lib/store';

const { Text, Title } = Typography;

// --- Priority List for Card Title ---
const TITLE_FIELD_PRIORITY = [
  'display_id',
  'name',
  'title',
  'label',
  'display_name',
  'code',
  'slug',
  'email',
  'username',
  'subject',
  'description',
];
// ------------------------------------

// Interfaces for type safety (kept minimal)
interface FieldConfig {
  fieldPath: string;
  label?: string;
  icon?: string;
  style?: React.CSSProperties & {
    render?: string;
    colorMapping?: Record<string, string>;
  };
  webLink?: boolean;
  link?: string;
  imagePath?: string;
  order?: number;
  displayKey?: string;
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
  icon?: string;
  style?: React.CSSProperties;
  form?: string;
}

interface SaveConfig {
  table: string;
  column: string;
  entity: string;
}

interface DetailOverviewProps {
  data: Record<string, any>;
  viewConfig: any;
  config: any;
  openMessageModal?: (formData: any) => void;
  editable?: boolean;
  owner?: boolean;
  saveConfig?: SaveConfig;
}

// Helper function to get nested or flat data from an object (FIXED for complex objects)
const getNestedValue = (obj: Record<string, any>, path: string): string | any[] | Record<string, any> => {
  if (!obj || !path) {
    return ' - - ';
  }

  // Handle direct access first
  if (path in obj) {
    const value = obj[path];
    if (path === 'details.membership_type' && typeof value === 'object' && !Array.isArray(value)) {
      return Object.values(value).join(', ');
    }
    
    if (value === undefined || value === null || value === '') return ' - - ';
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
         return value;
    }
    
    return String(value);
  }

  // Handle nested path access
  const result = path?.split('.')?.reduce((acc, part) => {
    if (!acc || typeof acc !== 'object') return undefined;
    return acc[part];
  }, obj);


  if (result === undefined || result === null || result === '') return ' - - ';

  // If the final result is a non-scalar object/array, return the object.
  if (typeof result === 'object' && result !== null && !Array.isArray(result)) {
    return result;
  }
  
  return String(result);
};

// 💡 NEW HELPER: Determines the card title text based on the priority list
const getCardTitleText = (data: Record<string, any>): string => {
  if (!data) return ' - - ';

  for (const fieldKey of TITLE_FIELD_PRIORITY) {
    // Check if the key exists in the data and the value is a non-empty string
    const value = getNestedValue(data, fieldKey);
    
    if (typeof value === 'string' && value !== ' - - ') {
      return value;
    }
  }

  // Fallback to ID if available
  if (data.id) {
    return data.id;
  }
  
  return ' - - ';
};


const DetailOverview: React.FC<DetailOverviewProps> = ({
  data,
  viewConfig,
  config,
  openMessageModal,
  editable = false,
  owner = false,
  saveConfig,
}) => {
  const [fetchedData, setFetchedData] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggledGroups, setToggledGroups] = useState<Set<string>>(new Set());
  const { organization, user, permissions } = useAuthStore();
  const recordId = data?.id;

  const getIcon = (iconName?: string): React.ReactNode => {
    return iconName && Icons[iconName as keyof typeof Icons]
      ? React.createElement(Icons[iconName as keyof typeof Icons])
      : null;
  };

  const fetchDetailData = useCallback(async () => {
    if (!recordId || !viewConfig?.entity_type || !organization?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [entitySchema, entityName] = viewConfig.entity_type.split('.');
      const payload = {
        entity_schema: entitySchema,
        entity_name: entityName,
        record_id: recordId,
        organization_id: organization.id,
      };

      const { data: detailResult, error } = await supabase
        .schema('core')
        .rpc('api_fetch_entity_detail', {
          config: payload,
        });

      if (error) {
        console.error('Error fetching detail data via RPC:', error);
        message.error('Failed to load detail data.');
        setFetchedData(null);
      } else if (detailResult && detailResult.data) {
        setFetchedData(detailResult.data);
      } else {
        setFetchedData(null);
        message.warning('No detail data found.');
      }
    } catch (err) {
      console.error('RPC call exception:', err);
      message.error('An unexpected error occurred during data fetching.');
      setFetchedData(null);
    } finally {
      setLoading(false);
    }
  }, [recordId, viewConfig?.entity_type, organization?.id]);

  useEffect(() => {
    fetchDetailData();
  }, [fetchDetailData]);

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!editable || !saveConfig) return;

      const { table, column, entity } = saveConfig;
      const { data: result, error } = await supabase
        .from(table)
        .select(column)
        .eq('id', entity)
        .single();

      if (error) {
        console.error('Error fetching initial data from Supabase:', error);
      } else if (result && result[column] && result[column].groups) {
        setToggledGroups(new Set(result[column].groups as string[]));
      }
    };

    fetchInitialData();
  }, [editable, saveConfig]);

  const [templateData, setTemplateData] = useState<any>(null);
  const templateName = viewConfig?.details_overview?.template;

  useEffect(() => {
    const fetchTemplate = async () => {
      if (!templateName) return;

      const { data: docTemplate, error: templateError } = await supabase
        .from('doc_templates')
        .select(`*`)
        .eq('name', templateName)
        .single();

      if (templateError) {
        console.error('Error fetching document template:', templateError);
        setTemplateData(null);
        return;
      }
      
      if (docTemplate && docTemplate.doc_common_template_id) {
        const commonTemplateId = docTemplate.doc_common_template_id;

        const { data: commonTemplate, error: commonError } = await supabase
          .from('doc_common_templates')
          .select('settings')
          .eq('id', commonTemplateId)
          .single();

        if (commonError) {
          console.error('Error fetching common template:', commonError);
          setTemplateData({
            ...docTemplate,
            settings: {},
          });
          return;
        }

        const commonSettings = commonTemplate?.settings || {};

        const combinedTemplateData = {
          ...docTemplate,
          settings: commonSettings,
        };

        setTemplateData(combinedTemplateData);
      } else if (docTemplate) {
        setTemplateData({
          ...docTemplate,
          settings: {},
        });
      }
    };

    fetchTemplate();
  }, [templateName]);

  const saveToSupabase = async (updatedGroups: Set<string>) => {
    if (!editable || !saveConfig) return;

    const { table, column, entity } = saveConfig;
    const payload = { [column]: { groups: Array.from(updatedGroups) } };

    const { error } = await supabase.from(table).update(payload).eq('id', entity);

    if (error) {
      console.error('Error saving to Supabase:', error);
    } else {
      console.log('Successfully saved to Supabase:', payload);
    }
  };

  const handleToggle = (groupName: string) => {
    const newToggledGroups = new Set(toggledGroups);
    if (newToggledGroups.has(groupName)) {
      newToggledGroups.delete(groupName);
    } else {
      newToggledGroups.add(groupName);
    }
    setToggledGroups(newToggledGroups);
    saveToSupabase(newToggledGroups);
  };

  const handleResendLoginLink = async () => {
    const currentData = fetchedData || data;
    const emailValue = getNestedValue(currentData, 'details.email'); 
    const email = typeof emailValue === 'string' ? emailValue : ' - - ';

    if (email === ' - - ' || !email) {
      message.error('No valid email address found for this user.');
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      message.success(`Login link sent to ${email}`);
    } catch (error: any) {
      message.error(error.message || 'Failed to send login link.');
    }
  };

  const renderField = (field: FieldConfig) => {
    const currentData = fetchedData || data;
    if (!field || !field.fieldPath || !currentData) {
      console.warn('Invalid field configuration or missing data:', field);
      return null;
    }

    const value = getNestedValue(currentData, field.fieldPath);
    const { icon, label, style, webLink, link, imagePath, displayKey } = field;
    
    // Check if value is a complex object (JSONB column itself)
    const isComplexObject = typeof value === 'object' && value !== null && !Array.isArray(value);
    
    // Check if the value is missing or a complex object
    const isValueMissing = value === ' - - ' || isComplexObject; 
    
    if (isValueMissing && !Array.isArray(value)) {
        return null;
    }

    // Handle array of objects
    if (Array.isArray(value) && displayKey) {
      return (
        <div key={field.fieldPath} style={{ marginBottom: 8, textAlign: 'left' }}>
          {getIcon(icon)} <Text>{label}: </Text>
          {value.map((item, index) => (
            <Tag key={index} color={style?.colorMapping?.default || 'default'}>
              {item[displayKey]}
            </Tag>
          ))}
        </div>
      );
    }

    // Handle image-only field
    const imageUrl = imagePath ? getNestedValue(currentData, imagePath) : null;
    const imageUrlString = typeof imageUrl === 'string' && imageUrl !== ' - - ' ? imageUrl : null;

    if (imagePath && !label && !icon) {
      if (imageUrlString && !editable) {
        return (
          <div key={field.fieldPath || imagePath} style={{ marginBottom: 8, textAlign: 'left' }}>
            <img
              loading="lazy"
              src={imageUrlString}
              alt="Profile"
              style={{
                width: 84,
                height: 84,
                borderRadius: '50%',
                objectFit: 'cover',
                verticalAlign: 'middle',
              }}
            />
          </div>
        );
      }
      return null;
    }

    // Render image element
    const imageElement =
      imageUrlString && !editable ? (
        <img
          loading="lazy"
          src={imageUrlString}
          alt={label || 'Image'}
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            objectFit: 'cover',
            verticalAlign: 'middle',
            marginRight: 8,
          }}
        />
      ) : null;

    if (editable && imagePath && !imageUrlString) {
      return null;
    }

    // Handle 'tag' style rendering
    if (style && style.render === 'tag') {
      let values: string[] = [];
      if (Array.isArray(value)) {
        values = value.map((v) => String(v).trim());
      } else if (typeof value === 'string') {
        values = value.split(',').map((v) => v.trim());
      } else {
        values = [String(value)];
      }
      const color = style.colorMapping || {};
      return (
        <div key={field.fieldPath} style={{ marginBottom: 8, textAlign: 'left' }}>
          <Text>{label} : </Text>
          {values.map((val, index) => (
            <Tag key={index} color={color[val.toLowerCase()] || undefined}>
              {val}
            </Tag>
          ))}
        </div>
      );
    }

    const isNA = value === ' - - ';
    
    // Content rendering (value must be a string here)
    const content = isNA ? (
      <Text>{value}</Text>
    ) : webLink ? (
      <a href={value as string} target="_blank" rel="noopener noreferrer" style={style}>
        {value}
      </a>
    ) : link ? (
      <a href={link} style={style}>
        {value}
      </a>
    ) : (
      <Text style={style}>{value}</Text>
    );

    return (
      <div key={field.fieldPath} style={{ marginBottom: 8, textAlign: 'left' }}>
        {imageElement}
        {getIcon(icon)} <Text>{label}: </Text> <strong>{content}</strong>
      </div>
    );
  };

  const renderGroup = (group: GroupConfig, skipFirstField: boolean = false) => {
    const sortedFields = group?.fields
      ?.filter((field): field is FieldConfig => !!field && !!field.fieldPath)
      ?.sort((a, b) => (a.order || 0) - (b.order || 0));

    if (!sortedFields || sortedFields.length === 0) {
      return null;
    }

    // We skip the *first field in the first group* if it was used for the card title.
    // However, since we now use a prioritized list (TITLE_FIELD_PRIORITY) separate from the group config, 
    // we don't need to skip anything here. 
    // I'll keep the skipFirstField argument for safety but ignore it since the field used for the title might not be the first field in the first group.
    
    const fieldsToRender = sortedFields;

    return (
      <div key={group.name} style={{ textAlign: 'left' }}>
        {group?.show_group_name && (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Title level={4} style={{ marginRight: 8 }}>
              {group.name}
            </Title>
            {editable && owner && group?.privacy_control && (
              <div className="mb-2">
                <Switch
                  className="mr-2"
                  checked={toggledGroups.has(group.name)}
                  onChange={() => handleToggle(group.name)}
                  checkedChildren={<Icons.EyeInvisibleOutlined />}
                  unCheckedChildren={<Icons.EyeOutlined />}
                />
                {toggledGroups.has(group.name) ? 'Hidden' : 'Visible'}
              </div>
            )}
          </div>
        )}
        {fieldsToRender.map(renderField)}
      </div>
    );
  };

  const renderActions = () => {
    const actions = viewConfig?.details_overview?.actions || [];
    const currentData = fetchedData || data;
    const allActions = [
      ...actions.map((action: ActionConfig) => (
        <Button
          disabled
          key={action.name}
          icon={action.icon && getIcon(action.icon)}
          style={{ ...action.style, width: '100%', marginBottom: 8 }}
          type="primary"
          className="action-button"
          onClick={() => {
            if (action.name === 'message') {
              openMessageModal?.(currentData[action.form as keyof typeof currentData]);
            } else {
              alert(`Action: ${action.name} triggered for ID: ${currentData.id}`);
            }
          }}
        >
          {action?.name?.charAt(0).toUpperCase() + action.name.slice(1)}
        </Button>
      )),
      <Button
        disabled={viewConfig?.entity_type !== 'users'}
        key="resend-link"
        type="link"
        size="small"
        style={{ width: '100%', marginBottom: 8, textAlign: 'left' }}
        onClick={handleResendLoginLink}
      >
        Resend Link
      </Button>,
    ];

    return allActions;
  };

  const currentData = fetchedData || data;
  
  // 💡 FIX: Use the new priority logic for the card title
  const cardTitleText = getCardTitleText(currentData);

  const cardTitle = cardTitleText !== ' - - ' ? (
    <span>{cardTitleText}</span>
  ) : null;

  const sortedGroups = viewConfig?.details_overview?.groups?.sort(
    (a: GroupConfig, b: GroupConfig) => (a.order || 0) - (b.order || 0),
  );
  
  // Find the field path that matched the card title for optional exclusion later
  const titleFieldPath = TITLE_FIELD_PRIORITY.find(key => getNestedValue(currentData, key) === cardTitleText);

  if (templateName && templateData) {
    return (
      <DocView
        data={currentData}
        viewConfig={viewConfig}
        templateSettings={templateData.settings}
        templateStyles={templateData.styles}
        templateConfig={templateData.template_config}
      />
    );
  }

  if (loading) {
    return (
      <Card className="detail-overview-card" title="Loading Details...">
        <div style={{ padding: '50px', textAlign: 'center' }}>
          <Spin size="large" />
          <p style={{ marginTop: 16 }}>Fetching data from server...</p>
        </div>
      </Card>
    );
  }

  if (!currentData) {
    return (
      <Card className="detail-overview-card" title="Error">
        <div style={{ padding: '20px', textAlign: 'center', color: 'red' }}>
          <Icons.ExclamationCircleOutlined style={{ fontSize: 24, marginBottom: 10 }} />
          <p>Failed to load the record details. Please try again.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card
      className="detail-overview-card"
      title={cardTitle}
      extra={
        <RowActions
          entityType={viewConfig?.entity_type}
          record={currentData}
          actions={viewConfig?.tableview?.actions.row.filter(
            (action: any) => action.name === 'Edit',
          )}
          accessConfig={viewConfig?.access_config}
          viewConfig={viewConfig}
          config={config}
        />
      }
    >
      <ApprovalActionButtons
        entityId={currentData.id}
        entityType={viewConfig?.entity_type}
        entitySchema={viewConfig?.entity_schema}
        currentStatus={currentData.stage_id}
        submitterUserId={currentData.user_id}
        createdAt={currentData.created_at}
      />
      {viewConfig?.details_overview?.component === 'expense_sheet' && (
        <Expensesheet
          editItem={currentData}
          viewMode={true}
        />
      )}
      {viewConfig?.details_overview?.component === 'timesheet' && (
        <Timesheet
          editItem={currentData}
          viewMode={true}
        />
      )}
      {viewConfig?.general?.features?.qr_form && (
        <div className="pb-4">
          <QRCard
            f={viewConfig?.general?.features?.qr_form || 'qr_tickets'}
            i={currentData?.id}
            display_id={currentData?.display_id}
          />
        </div>
      )}
      {sortedGroups?.map((group, index) => (
        <React.Fragment key={group?.name}>
          {viewConfig?.details_overview?.dividers?.includes(group?.name) && index > 0 && (
            <Divider />
          )}
          {/* Note: renderGroup is now called without the skipFirstField logic */}
          {renderGroup(group)}
        </React.Fragment>
      ))}
      {!editable &&
        viewConfig?.details_overview?.actions &&
        viewConfig?.entity_type === 'users' && (
          <>
            <Divider />
            <div className="actions-container">{renderActions()}</div>
          </>
        )}
      {viewConfig?.entity_type === 'organization.tasks' && (
        <TaskReportPage editItem={currentData} />
      )}
    </Card>
  );
};

export default DetailOverview;