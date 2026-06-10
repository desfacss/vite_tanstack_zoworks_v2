import React, { useState, useMemo } from 'react';
import Timeline from 'react-calendar-timeline';
import 'react-calendar-timeline/dist/style.css';
import { Button, message } from 'antd';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';

interface TimelineViewConfig {
  timelineview?: any;
  tableview?: any;
  fields?: {
    name?: string;
    start_date?: string;
    end_date?: string;
    group_by_field?: string;
  };
}

interface TimelineViewProps {
  entityType: string;
  entitySchema?: string;
  viewConfig?: TimelineViewConfig;
  data: any[];
  isLoading?: boolean;
  filterValues?: Record<string, any>;
  pagination?: { current: number; pageSize: number; total: number };
  onTableChange?: (pagination: any, filters: any, sorter: any) => void;
}

const colorPalette = [
  '#f5222d', '#1890ff', '#52c41a', '#faad14', '#eb2f96', '#722ed1', '#fa8c16', '#13c2c2'
];

const getConsistentColor = (key: string): string => {
  const hash = key.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colorPalette[hash % colorPalette.length];
};

const TimelineView: React.FC<TimelineViewProps> = ({
  entityType,
  entitySchema = 'public',
  viewConfig,
  data = [],
  isLoading = false,
}) => {
  const timelineview = viewConfig?.timelineview || {};
  const fieldsConfig = timelineview.fields || {};

  const nameField = fieldsConfig.name || 'name';
  const startDateField = fieldsConfig.start_date || 'start_date';
  const endDateField = fieldsConfig.end_date || 'due_date';
  const groupByField = fieldsConfig.group_by_field || 'assignee_id_name';

  // Helper function to safely access nested object properties
  const getNestedField = (obj: any, path: string) => {
    return path.split('.').reduce((acc, key) => acc?.[key], obj) ?? '';
  };

  const { groups, items } = useMemo(() => {
    if (!data || data.length === 0) {
      return { groups: [], items: [] };
    }

    // 1. Gather all unique group titles
    const groupTitlesSet = new Set<string>();
    data.forEach((item) => {
      const val = getNestedField(item, groupByField);
      const groupTitle = val ? String(val) : 'Unassigned';
      groupTitlesSet.add(groupTitle);
    });

    const uniqueGroups = Array.from(groupTitlesSet);
    const generatedGroups = uniqueGroups.map((title, index) => ({
      id: index + 1,
      title: title,
    }));

    // 2. Map data items
    const generatedItems = data.map((item, index) => {
      const name = getNestedField(item, nameField) || 'Unnamed Task';
      const startVal = getNestedField(item, startDateField);
      const endVal = getNestedField(item, endDateField);

      let start = dayjs();
      let end = dayjs().add(1, 'day');

      if (startVal) {
        start = dayjs(startVal);
      }
      if (endVal) {
        end = dayjs(endVal);
      } else {
        end = start.add(1, 'day');
      }

      const val = getNestedField(item, groupByField);
      const groupTitle = val ? String(val) : 'Unassigned';
      const groupObj = generatedGroups.find((g) => g.title === groupTitle);
      const groupId = groupObj ? groupObj.id : 1;

      const color = getConsistentColor(groupTitle);

      return {
        id: index + 1,
        group: groupId,
        title: name,
        start_time: start.valueOf(),
        end_time: end.valueOf(),
        itemProps: {
          style: {
            background: color,
            color: '#fff',
            borderRadius: '6px',
            border: 'none',
            boxShadow: '0 2px 5px rgba(0,0,0,0.15)',
            fontSize: '12px',
            fontWeight: 500,
            padding: '4px 8px',
          },
        },
      };
    });

    return { groups: generatedGroups, items: generatedItems };
  }, [data, nameField, startDateField, endDateField, groupByField]);

  // Handle zoom state
  const [zoomDays, setZoomDays] = useState<number>(30); // default show 30 days view

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div></div>;
  }

  if (groups.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-[var(--color-text-secondary)] bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl">
        No records available to display on timeline.
      </div>
    );
  }

  const minStart = items.length > 0 ? Math.min(...items.map((i) => i.start_time)) : Date.now();
  const maxEnd = items.length > 0 ? Math.max(...items.map((i) => i.end_time)) : Date.now();

  const startVisible = dayjs(minStart).subtract(2, 'days').valueOf();
  const endVisible = dayjs(startVisible).add(zoomDays, 'days').valueOf();

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full" style={{ height: '100%' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-0 flex-1 flex flex-col min-h-0"
        style={{ height: '100%' }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Button type={zoomDays === 7 ? 'primary' : 'default'} onClick={() => setZoomDays(7)}>Week</Button>
          <Button type={zoomDays === 15 ? 'primary' : 'default'} onClick={() => setZoomDays(15)}>2 Weeks</Button>
          <Button type={zoomDays === 30 ? 'primary' : 'default'} onClick={() => setZoomDays(30)}>Month</Button>
          <Button type={zoomDays === 90 ? 'primary' : 'default'} onClick={() => setZoomDays(90)}>Quarter</Button>
        </div>
        <div className="timeline-wrapper" style={{ overflow: 'hidden', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
          <Timeline
            groups={groups}
            items={items}
            defaultTimeStart={startVisible}
            defaultTimeEnd={endVisible}
            sidebarWidth={160}
            lineHeight={50}
            itemHeightRatio={0.75}
            canMove={false}
            canResize={false}
          />
        </div>
      </motion.div>
    </div>
  );
};

export default TimelineView;
