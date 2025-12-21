import React from 'react';
import { Typography, Empty } from 'antd';
import { Event } from '../types';
import EventList from './EventList';
import dayjs from 'dayjs';

const { Title } = Typography;

interface TodayViewProps {
  events: Event[];
}

const TodayView: React.FC<TodayViewProps> = ({ events }) => {
  const today = dayjs().format('YYYY-MM-DD');
  const todayEvents = events?.filter(event => event.date === today);

  return (
    <div className="h-full">
      <div className="px-4 py-3 border-b bg-gray-50">
        <Title level={4} className="!mb-0">
          Today - {dayjs().format('MMMM D, YYYY')}
        </Title>
      </div>
      <div className="flex-1 overflow-auto">
        {todayEvents?.length > 0 ? (
          <EventList events={todayEvents} />
        ) : (
          <div className="flex items-center justify-center h-64">
            <Empty description="No events today" />
          </div>
        )}
      </div>
    </div>
  );
};

export default TodayView;