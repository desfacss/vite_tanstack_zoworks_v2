import React from 'react';
import { List, Tag, Typography } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';
import { Event } from '../types';

const { Text } = Typography;

interface EventListProps {
  events: Event[];
  showDate?: boolean;
}

const EventList: React.FC<EventListProps> = ({ events, showDate = false }) => {
  const sortedEvents = [...events].sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    return a.startTime.localeCompare(b.startTime);
  });

  return (
    <List
      dataSource={sortedEvents}
      renderItem={(event) => (
        <List.Item className="!px-4 !py-3">
          <div className="w-full">
            <div className="flex items-start justify-between mb-2">
              <Text strong className="text-base">
                {event.title}
              </Text>
              <Tag color={event.color} className="ml-2">
                <ClockCircleOutlined className="mr-1" />
                {event.startTime} - {event.endTime}
              </Tag>
            </div>
            {showDate && (
              <Text type="secondary" className="text-sm">
                {new Date(event.date).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric'
                })}
              </Text>
            )}
          </div>
        </List.Item>
      )}
    />
  );
};

export default EventList;