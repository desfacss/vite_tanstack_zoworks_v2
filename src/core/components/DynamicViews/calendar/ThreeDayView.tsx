import React from 'react';
import { Typography, Empty, Divider } from 'antd';
import { Event } from '../types';
import EventList from './EventList';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface ThreeDayViewProps {
  events: Event[];
}

const ThreeDayView: React.FC<ThreeDayViewProps> = ({ events }) => {
  const today = dayjs();
  const threeDays = [today, today.add(1, 'day'), today.add(2, 'day')];

  return (
    <div className="h-full overflow-auto">
      {threeDays.map((day, index) => {
        const dateStr = day.format('YYYY-MM-DD');
        const dayEvents = events.filter(event => event.date === dateStr);
        
        return (
          <div key={dateStr} className="mb-4">
            <div className="px-4 py-3 bg-gray-50">
              <Title level={5} className="!mb-0">
                {index === 0 ? 'Today' : index === 1 ? 'Tomorrow' : day.format('dddd')}
              </Title>
              <Text type="secondary" className="text-sm">
                {day.format('MMMM D, YYYY')}
              </Text>
            </div>
            {dayEvents.length > 0 ? (
              <EventList events={dayEvents} />
            ) : (
              <div className="px-4 py-8">
                <Empty description="No events" size="small" />
              </div>
            )}
            {index < threeDays.length - 1 && <Divider className="!my-0" />}
          </div>
        );
      })}
    </div>
  );
};

export default ThreeDayView;