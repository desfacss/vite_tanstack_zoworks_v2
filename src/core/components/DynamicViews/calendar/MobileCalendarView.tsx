import React, { useState, useEffect, useMemo } from 'react';
import { Tabs, Card, Button, message, Tooltip } from 'antd';
import { Calendar, Clock, Eye, Table, Plus } from 'lucide-react';
import { Event } from '../types'; // This now refers to the transformed type
import TodayView from './TodayView';
import CalendarView from './CalendarView';
import dayjs from 'dayjs';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

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
    entityType: string;
    entitySchema?: string;
}

const getNestedField = (obj: any, path: string) => {
    return path.split('.').reduce((acc, key) => acc?.[key], obj) ?? '';
};

const MobileCalendarView: React.FC<MobileCalendarViewProps> = ({ data, viewConfig, entityType, entitySchema = 'public' }) => {
    const [activeView, setActiveView] = useState<ViewType>('today');
    const [isMobile, setIsMobile] = useState<boolean>(false);
    const queryClient = useQueryClient();

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

    // Check if the dataset supports stage_id filtering
    const hasStageField = useMemo(() => {
        return data && data.some(item => 'stage_id' in item);
    }, [data]);

    // Find the first display field path from tableview fields
    const firstDisplayFieldPath = useMemo(() => {
        const tableFields = (viewConfig as any)?.tableview?.fields || [];
        const sortedFields = [...tableFields].sort((a, b) => a.order - b.order);
        return sortedFields[0]?.fieldPath || 'name';
    }, [viewConfig]);

    // Split events into assigned and unassigned
    const { assignedEvents, unassignedEvents } = useMemo(() => {
        if (!hasStageField) {
            return { assignedEvents: events || [], unassignedEvents: [] };
        }
        return {
            assignedEvents: events?.filter(e => e.stage_id === 'assigned') || [],
            unassignedEvents: events?.filter(e => e.stage_id !== 'assigned') || [],
        };
    }, [events, hasStageField]);

    const handleAssign = async (event: any) => {
        try {
            const parts = entityType.split('.');
            const schema = parts.length === 2 ? parts[0] : entitySchema;
            const table = parts.length === 2 ? parts[1] : entityType;
            const fullTableName = `${schema}.${table}`;

            const { error } = await supabase.schema('core').rpc('api_new_core_upsert_data', {
                table_name: fullTableName,
                data: {
                    id: event.id,
                    stage_id: 'assigned'
                }
            });

            if (error) throw error;
            message.success('Item assigned to calendar successfully');
            queryClient.invalidateQueries({ queryKey: [entityType] });
        } catch (err: any) {
            message.error(`Failed to assign: ${err.message}`);
        }
    };

    useEffect(() => {
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
            children: <TodayView events={assignedEvents} />
        },
        {
            key: 'day',
            label: 'Day',
            icon: <Eye size={16} />,
            children: <CalendarView events={assignedEvents} viewMode="day" isMobile={isMobile} />
        },
        {
            key: 'week',
            label: isMobile ? '3 Days' : 'Week',
            icon: <Table size={16} />,
            children: <CalendarView events={assignedEvents} viewMode="week" isMobile={isMobile} />
        },
        {
            key: 'month',
            label: 'Month',
            icon: <Calendar size={16} />,
            children: <CalendarView events={assignedEvents} viewMode="month" isMobile={isMobile} />
        }
    ];

    return (
        <div className="flex-1 flex flex-col md:flex-row min-h-0 w-full bg-[var(--color-bg-primary)]" style={{ height: '100%' }}>
            <div className="flex-1 flex flex-col min-h-0">
                <Card
                    className="h-full !rounded-none border-0 flex-1 flex flex-col min-h-0"
                    bodyStyle={{ padding: 0, height: '100%', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
                >
                    <Tabs
                        activeKey={activeView}
                        onChange={(key) => setActiveView(key as ViewType)}
                        items={tabItems}
                        className="h-full flex-1 flex flex-col min-h-0"
                        tabBarStyle={{
                            margin: 0,
                            padding: '0 16px',
                            background: 'var(--color-bg-secondary)',
                            borderBottom: '1px solid var(--color-border)',
                            color: 'var(--color-text-primary)'
                        }}
                    />
                </Card>
            </div>

            {hasStageField && (
                <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-[var(--color-border)] bg-[var(--color-bg-secondary)] flex flex-col h-full">
                    <div className="p-4 border-b border-[var(--color-border)] flex justify-between items-center bg-[var(--color-bg-tertiary)]">
                        <span className="font-semibold text-sm text-[var(--color-text-primary)]">Unassigned Pool</span>
                        <span className="bg-[var(--color-primary)] text-black px-2 py-0.5 rounded-full text-xs font-semibold">
                            {unassignedEvents.length}
                        </span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {unassignedEvents.length === 0 ? (
                            <div className="text-center py-8 text-[var(--color-text-secondary)] text-xs">
                                All items have been assigned.
                            </div>
                        ) : (
                            unassignedEvents.map(event => {
                                const displayName = getNestedField(event, firstDisplayFieldPath) || 'Unnamed Item';
                                return (
                                    <div key={event.id} className="p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] hover:border-[var(--color-primary)] transition-all flex items-center justify-between gap-2">
                                        <div className="font-medium text-sm text-[var(--color-text-primary)] truncate" title={displayName}>{displayName}</div>
                                        <Tooltip title="Add to Calendar">
                                            <Button 
                                                type="primary" 
                                                size="small" 
                                                shape="circle"
                                                icon={<Plus size={14} />}
                                                onClick={() => handleAssign(event)}
                                                style={{ flexShrink: 0 }}
                                            />
                                        </Tooltip>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MobileCalendarView;