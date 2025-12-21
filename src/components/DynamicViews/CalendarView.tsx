import React, { useMemo } from 'react';
import { Calendar, dateFnsLocalizer, Event } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import enUS from 'date-fns/locale/en-US';
import { Button, Dropdown, Menu } from 'antd';
import { List } from 'antd-mobile';
import { motion } from 'framer-motion';
import { FileDown, UserIcon } from 'lucide-react';
import { useAuthedLayoutConfig } from '../Layout/AuthedLayoutContext';
import RowActions from './RowActions';
import dayjs from 'dayjs';

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales,
});

interface CalendarViewConfig {
  showFeatures?: string[];
  exportOptions?: string[];
  actions: {
    bulk?: Array<{ name: string; form?: string }>;
    row?: Array<{ name: string; form?: string }>;
  };
  fields?: {
    name?: string;
    start_date?: string;
    due_date?: string;
  };
  access_config?: any; // Added to match RowActions prop
}

interface CalendarViewProps {
  entityType: string;
  viewConfig?: CalendarViewConfig;
  data: any[];
  isLoading?: boolean;
  filterValues?: Record<string, any>;
  pagination?: { current: number; pageSize: number; total: number };
  onTableChange?: (pagination: any, filters: any, sorter: any) => void;
}

const defaultViewConfig: CalendarViewConfig = {
  actions: {
    bulk: [],
    row: [],
  },
  fields: {
    name: 'name',
    start_date: 'start_date',
    due_date: 'due_date',
  },
  showFeatures: ['search', 'enable_view', 'columnVisibility', 'pagination'],
  exportOptions: ['pdf', 'csv'],
};

const CalendarView: React.FC<CalendarViewProps> = ({
  entityType,
  viewConfig = defaultViewConfig,
  data = [],
  isLoading = false,
  filterValues,
  pagination,
  onTableChange,
}) => {
  const { setConfig } = useAuthedLayoutConfig();
  const isMobile = window.innerWidth <= 768;
  const calendarview = viewConfig?.calendarview || viewConfig?.tableview || defaultViewConfig;
  console.log("yy",calendarview,data);

  // Helper function to safely access nested object properties
  const getNestedField = (obj: any, path: string) => {
    return path.split('.').reduce((acc, key) => acc?.[key], obj) ?? '';
  };

  // const transformedEvents: Event[] = data.map((event) => ({
  //   ...event,
  //   title: getNestedField(event, calendarview.fields?.name || 'name') || 'Unnamed Event',
  //   start: getNestedField(event, calendarview.fields?.start_date || 'start_date')
  //     ? new Date(getNestedField(event, calendarview.fields.start_date))
  //     : new Date(),
  //   end: getNestedField(event, calendarview.fields?.due_date || 'due_date')
  //     ? new Date(getNestedField(event, calendarview.fields.due_date))
  //     : new Date(),
  // }));

  const transformedEvents: Event[] = data.map((event) => {
  const title = getNestedField(event, calendarview.fields?.name || 'name') || 'Unnamed Event';
  const startDateField = getNestedField(event, calendarview.fields?.start_date || 'start_date');
  const dueDateField = getNestedField(event, calendarview.fields?.due_date || 'due_date');

  let start;
  let end;

  if (startDateField && !dueDateField) {
    // If only a start time is available, assume end time is end of the day (11:59:59)
    const startDay = dayjs(startDateField);
    start = startDay.toDate();
    end = startDay.endOf('day').toDate();
  } else if (!startDateField && dueDateField) {
    // If only a due/end date is available, assume the start is 24 hours before
    const endDay = dayjs(dueDateField);
    end = endDay.toDate();
    start = endDay.subtract(1, 'day').toDate();
  } else {
    // Default case: use available dates or current date if both are missing
    start = startDateField ? new Date(startDateField) : new Date();
    end = dueDateField ? new Date(dueDateField) : new Date();
  }

  return {
    ...event,
    title,
    start,
    end,
  };
});

  // 👇️ useMemo to prevent `actionButtons` from being recreated on every render
  const actionButtons = useMemo(() => {
    return calendarview?.actions?.bulk && Array.isArray(calendarview.actions.bulk)
      ? calendarview.actions.bulk.map((action) => ({
          name: action.name,
          label: action.name === 'add_' ? 'Add Item' : action.name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
          type: 'primary' as const,
          icon: undefined,
          onClick: () => console.log(`Bulk action triggered: ${action.name}`),
        }))
      : [];
  }, [calendarview.actions.bulk]);

  React.useEffect(() => {
    setConfig((prev) => ({ ...prev, actionButtons }));
  }, [setConfig, actionButtons]);

  if (!calendarview) {
    return <div>No calendar view configuration found for {entityType}</div>;
  }

  return (
    <div style={{ height: '80vh', margin: '20px' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
        {!isMobile ? (
          <>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'nowrap',
                marginBottom: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', flex: 1 }} />
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {calendarview.actions?.bulk && Array.isArray(calendarview.actions.bulk) &&
                  calendarview.actions.bulk.map((action) => (
                    <Button
                      key={action.name}
                      type="primary"
                      style={{ marginRight: 8 }}
                      onClick={() => console.log(`Bulk action: ${action.name}`)}
                    >
                      {action.name
                        .split('_')
                        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ')}
                    </Button>
                  ))}
                {calendarview.showFeatures?.includes('export') && calendarview.exportOptions?.length > 0 && (
                  <Dropdown
                    menu={{
                      items: calendarview.exportOptions.map((option) => ({
                        key: option,
                        label: `Export to ${option.toUpperCase()}`,
                        onClick: () => console.log(`Export to ${option} triggered`),
                      })),
                    }}
                    trigger={['click']}
                  >
                    <Button icon={<FileDown />} style={{ marginLeft: 8 }} />
                  </Dropdown>
                )}
              </div>
            </div>
            {isLoading ? (
              <div>Loading...</div>
            ) : (
              <Calendar
                localizer={localizer}
                events={transformedEvents}
                startAccessor="start"
                endAccessor="end"
                style={{ height: 500 }}
                onSelectEvent={(event) => console.log('Open drawer for event:', event)}
              />
            )}
          </>
        ) : (
          isLoading ? (
            <div>Loading...</div>
          ) : (
            <List>
              {data.map((record) => (
                <List.Item
                  key={record.id}
                  prefix={<UserIcon size={24} />}
                  description={getNestedField(record, 'details.email') || '-'}
                  arrow={false}
                  extra={
                    calendarview.showFeatures?.includes('rowActions') && (
                      <RowActions
                        entityType={entityType}
                        record={record}
                        actions={calendarview?.actions?.row && Array.isArray(calendarview.actions.row) ? calendarview.actions.row : []}
                        accessConfig={viewConfig?.access_config}
                        viewConfig={viewConfig}
                        rawData={data}
                      />
                    )
                  }
                >
                  {getNestedField(record, calendarview.fields?.name || 'name') || 'Unnamed Event'}
                  <div className="text-xs text-gray-500">
                    {record.created_at ? dayjs(record.created_at).format('MMM D, YYYY') : '-'}
                  </div>
                </List.Item>
              ))}
            </List>
          )
        )}
      </motion.div>
    </div>
  );
};

export default CalendarView;