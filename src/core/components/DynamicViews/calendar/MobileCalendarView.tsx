import React, { useState, useEffect, useMemo } from 'react';
import { Tabs, Card } from 'antd';
import { Calendar, Clock, Eye, Table } from 'lucide-react';
import { Event } from '../types'; // This now refers to the transformed type
import TodayView from './TodayView';
import CalendarView from './CalendarView';
import dayjs from 'dayjs';

type ViewType = 'today' | 'day' | 'week' | 'month';

// Define config structure based on your dynamic setup
interface CalendarViewConfig {
    fields?: { name?: string; start_date?: string; due_date?: string };
    calendarview?: {
        fields?: { name?: string; start_date?: string; due_date?: string };
    };
}

interface MobileCalendarViewProps {
    data: any[]; // The raw array of data objects
    viewConfig: CalendarViewConfig;
}

const getNestedField = (obj: any, path: string) => {
    return path.split('.').reduce((acc, key) => acc?.[key], obj) ?? '';
};

const MobileCalendarView: React.FC<MobileCalendarViewProps> = ({ data, viewConfig }) => {
    const [activeView, setActiveView] = useState<ViewType>('today');
    const [isMobile, setIsMobile] = useState<boolean>(false);

    // --- Data Transformation (similar to your dynamic component) ---
    const events: Event[] = useMemo(() => {
        const fields = viewConfig?.calendarview?.fields || { name: 'name', start_date: 'event_start_at', due_date: 'event_end_at' };

        return data?.map((event) => {
            const title = getNestedField(event, fields.name || 'name') || 'Unnamed Event';
            const startDateField = getNestedField(event, fields.start_date || 'event_start_at');
            const dueDateField = getNestedField(event, fields.due_date || 'event_end_at');

            let start: Date;
            let end: Date;
            console.log("srrr", fields, startDateField, dueDateField);

            if (startDateField && !dueDateField) {
                const startDay = dayjs(startDateField);
                start = startDay.toDate();
                end = startDay.endOf('day').toDate();
            } else if (!startDateField && dueDateField) {
                const endDay = dayjs(dueDateField);
                end = endDay.toDate();
                start = endDay.subtract(1, 'day').toDate();
            } else {
                start = startDateField ? new Date(startDateField) : new Date();
                end = dueDateField ? new Date(dueDateField) : new Date();
            }

            // Transform back to the simple fields expected by old components (TodayView/EventList)
            const date = dayjs(start).format('YYYY-MM-DD');
            const startTime = dayjs(start).format('HH:mm');
            const endTime = dayjs(end).format('HH:mm');

            return {
                ...event, // Keep raw data
                id: event.id,
                title,
                start,
                end,
                date,      // For TodayView/EventList
                startTime, // For TodayView/EventList
                endTime,   // For TodayView/EventList
                color: event.color || 'blue', // Default color if not provided
            };
        });
    }, [data, viewConfig]);
    // ----------------------------------------------------------------

    useEffect(() => {
        // ... (mobile check logic remains the same)
        const checkIsMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkIsMobile();
        window.addEventListener('resize', checkIsMobile);
        return () => {
            window.removeEventListener('resize', checkIsMobile);
        };
    }, []);

    const tabItems = [
        {
            key: 'today',
            label: 'Today',
            icon: <Clock size={16} />,
            children: <TodayView events={events} /> // Use transformed events
        },
        // ... (rest of the tabItems remain the same, passing 'events' to CalendarView)
        {
            key: 'day',
            label: 'Day',
            icon: <Eye size={16} />,
            children: <CalendarView events={events} viewMode="day" isMobile={isMobile} />
        },
        {
            key: 'week',
            label: isMobile ? '3 Days' : 'Week',
            icon: <Table size={16} />,
            children: <CalendarView events={events} viewMode="week" isMobile={isMobile} />
        },
        {
            key: 'month',
            label: 'Month',
            icon: <Calendar size={16} />,
            children: <CalendarView events={events} viewMode="month" isMobile={isMobile} />
        }
    ];

    return (
        <div className="h-screen bg-white">
            <Card
                className="h-full !rounded-none border-0"
                bodyStyle={{ padding: 0, height: '100%' }}
            >
                <Tabs
                    activeKey={activeView}
                    onChange={(key) => setActiveView(key as ViewType)}
                    items={tabItems}
                    className="h-full"
                    tabBarStyle={{
                        margin: 0,
                        padding: '0 16px',
                        background: '#fafafa',
                        borderBottom: '1px solid #f0f0f0'
                    }}
                />
            </Card>
        </div>
    );
};

export default MobileCalendarView;