// // // import React, { useEffect, useState, useMemo } from 'react';
// // // import { Table, Input, Button, Typography, Select, message, Row, Col, InputNumber, DatePicker, Radio } from 'antd';
// // // import { supabase } from '@/lib/supabase';
// // // import { useAuthStore } from '@/core/lib/store';
// // // import dayjs from 'dayjs';
// // // import weekday from 'dayjs/plugin/weekday';
// // // import './timesheet.css';

// // // dayjs.extend(weekday);

// // // const { Option } = Select;
// // // const { Title } = Typography;

// // // interface TimesheetProps {
// // //     editItem?: any;
// // //     onFinish: () => void;
// // //     viewMode?: boolean;
// // // }

// // // const Timesheet: React.FC<TimesheetProps> = ({ editItem, onFinish, viewMode = false }) => {
// // //     const [timesheetType, setTimesheetType] = useState<'Weekly' | 'Daily'>(editItem?.timesheet_type || 'Weekly');
// // //     const [startDate, setStartDate] = useState<dayjs.Dayjs>(
// // //         editItem?.timesheet_date ? dayjs(editItem.timesheet_date) : dayjs().startOf('week')
// // //     );
// // //     const [data, setData] = useState<any[]>([]);
// // //     const [projects, setProjects] = useState<any[]>([]);
// // //     const [totalHours, setTotalHours] = useState<number>(editItem?.total_hours || 0);
// // //     const [loading, setLoading] = useState(false);
// // //     const { user } = useAuthStore();

// // //     useEffect(() => {
// // //         const fetchProjects = async () => {
// // //             if (!user?.id) return;
// // //             try {
// // //                 const { data, error } = await supabase.rpc('get_projects_for_user', { p_user_id: user.id });
// // //                 if (error) throw error;
// // //                 setProjects(data || []);
// // //             } catch (error: any) {
// // //                 // Fallback for when RPC is not available
// // //                 console.warn("RPC get_projects_for_user not found or failed, falling back to public.projects table.");
// // //                 const { data, error: tableError } = await supabase.from('projects').select('id, name');
// // //                 if (tableError) {
// // //                     console.error('Error fetching projects from table:', tableError);
// // //                     message.error('Failed to fetch projects.');
// // //                 } else {
// // //                     setProjects(data || []);
// // //                 }
// // //             }
// // //         };
// // //         fetchProjects();
// // //     }, [user?.id]);

// // //     const generateDates = (start: dayjs.Dayjs, type: 'Weekly' | 'Daily') => {
// // //         if (type === 'Daily') {
// // //             return [{ key: start.format('YYYY-MM-DD'), date: start.format('ddd, MMM D'), full_date: start.format('YYYY-MM-DD'), total: 0 }];
// // //         }
// // //         const weekDates = Array.from({ length: 5 }, (_, i) => {
// // //             const date = start.weekday(i);
// // //             return {
// // //                 key: date.format('YYYY-MM-DD'),
// // //                 date: date.format('ddd, MMM D'),
// // //                 full_date: date.format('YYYY-MM-DD'),
// // //                 total: 0,
// // //             };
// // //         });
// // //         return weekDates;
// // //     };

// // //     useEffect(() => {
// // //         let initialData = generateDates(startDate, timesheetType);

// // //         if (editItem?.details) {
// // //             const detailsMap = editItem.details.reduce((acc: any, day: any) => {
// // //                 acc[dayjs(day.full_date).format('YYYY-MM-DD')] = day.dailyEntries;
// // //                 return acc;
// // //             }, {});

// // //             initialData = initialData.map(day => {
// // //                 const dailyEntries = detailsMap[day.full_date];
// // //                 if (dailyEntries) {
// // //                     const projectHours = Object.entries(dailyEntries).reduce((acc: any, [projectId, entry]: [string, any]) => {
// // //                         acc[projectId] = entry.hours;
// // //                         acc[`${projectId}_desc`] = entry.description;
// // //                         return acc;
// // //                     }, {});
// // //                     const total = Object.values(projectHours).reduce((sum: number, hours: any) => sum + (parseFloat(hours) || 0), 0);
// // //                     return { ...day, ...projectHours, total };
// // //                 }
// // //                 return day;
// // //             });
// // //         }
// // //         setData(initialData);
// // //     }, [startDate, timesheetType, editItem, projects]);

// // //     useEffect(() => {
// // //         const grandTotal = data.reduce((sum, row) => sum + (row.total || 0), 0);
// // //         setTotalHours(grandTotal);
// // //     }, [data]);

// // //     const handleInputChange = (dateKey: string, projectId: string, field: 'hours' | 'description', value: any) => {
// // //         const newData = [...data];
// // //         const rowIndex = newData.findIndex(row => row.key === dateKey);
// // //         if (rowIndex === -1) return;

// // //         const row = newData[rowIndex];
// // //         if (field === 'hours') {
// // //             const hours = Math.max(0, parseFloat(value) || 0);
// // //             row[projectId] = hours > 24 ? 24 : hours;
// // //         } else {
// // //             row[`${projectId}_desc`] = value;
// // //         }

// // //         row.total = projects.reduce((sum, p) => sum + (row[p.id] || 0), 0);
// // //         newData[rowIndex] = row;
// // //         setData(newData);
// // //     };

// // //     const columns = useMemo(() => {
// // //         const staticColumns = [
// // //             {
// // //                 title: 'Date',
// // //                 dataIndex: 'date',
// // //                 fixed: "left" as const,
// // //                 width: 150,
// // //             },
// // //         ];

// // //         const projectColumns = projects.flatMap(p => [
// // //             {
// // //                 title: `${p.name} (hrs)`,
// // //                 dataIndex: p.id,
// // //                 width: 120,
// // //                 render: (_: any, record: any) =>
// // //                     !viewMode ? (
// // //                         <InputNumber
// // //                             min={0}
// // //                             max={24}
// // //                             step={0.5}
// // //                             style={{ width: '100%' }}
// // //                             value={record[p.id]}
// // //                             onChange={(value) => handleInputChange(record.key, p.id, 'hours', value)}
// // //                         />
// // //                     ) : (
// // //                         <Typography.Text>{record[p.id] || "-"}</Typography.Text>
// // //                     ),
// // //             },
// // //             {
// // //                 title: 'Description',
// // //                 dataIndex: `${p.id}_desc`,
// // //                 width: 200,
// // //                 render: (_: any, record: any) =>
// // //                     !viewMode ? (
// // //                         <Input.TextArea
// // //                             value={record[`${p.id}_desc`]}
// // //                             onChange={(e) => handleInputChange(record.key, p.id, 'description', e.target.value)}
// // //                             autoSize={{ minRows: 1, maxRows: 2 }}
// // //                         />
// // //                     ) : (
// // //                         <Typography.Text>{record[`${p.id}_desc`] || "-"}</Typography.Text>
// // //                     ),
// // //             },
// // //         ]);

// // //         const totalColumn = {
// // //             title: 'Total',
// // //             dataIndex: 'total',
// // //             fixed: "right" as const,
// // //             width: 80,
// // //             render: (total: number) => <Typography.Text strong>{total?.toFixed(2)}</Typography.Text>,
// // //         };

// // //         return [...staticColumns, ...projectColumns, totalColumn];
// // //     }, [projects, viewMode, data]);

// // //     const handleSubmit = async (status: 'Draft' | 'Submitted') => {
// // //         if (!user?.id) {
// // //             message.error('User is not authenticated.');
// // //             return;
// // //         }
// // //         if (data.every(d => d.total === 0)) {
// // //             message.error('Cannot submit an empty timesheet. Please enter hours worked.');
// // //             return;
// // //         }

// // //         setLoading(true);

// // //         try {
// // //             const timesheetPayload = {
// // //                 id: editItem?.id,
// // //                 user_id: user.id,
// // //                 organization_id: user.pref_organization_id,
// // //                 timesheet_date: startDate.format('YYYY-MM-DD'),
// // //                 last_date: timesheetType === 'Weekly' ? startDate.weekday(4).format('YYYY-MM-DD') : startDate.format('YYYY-MM-DD'),
// // //                 timesheet_type: timesheetType,
// // //                 stage_id: status,
// // //                 // submitted_time: status === 'Submitted' ? new Date().toISOString() : null,
// // //             };

// // //             const { data: sheetData, error: sheetError } = await supabase
// // //                 .schema('workforce')
// // //                 .from('timesheets')
// // //                 .upsert(timesheetPayload)
// // //                 .select()
// // //                 .single();

// // //             if (sheetError) throw sheetError;

// // //             const timesheetId = sheetData.id;

// // //             if (editItem?.id) {
// // //                 const { error: deleteError } = await supabase
// // //                     .schema('workforce')
// // //                     .from('timesheet_items')
// // //                     .delete()
// // //                     .eq('timesheet_id', timesheetId);
// // //                 if (deleteError) throw deleteError;
// // //             }

// // //             const entriesToInsert = data
// // //                 .flatMap(row =>
// // //                     projects.map(p => ({
// // //                         timesheet_id: timesheetId,
// // //                         project_id: p.id,
// // //                         organization_id: user.pref_organization_id,
// // //                         entry_date: row.full_date,
// // //                         hours_worked: row[p.id] || 0,
// // //                         description: row[`${p.id}_desc`] || null,
// // //                         created_by: user.id,
// // //                     }))
// // //                 )
// // //                 .filter(entry => entry.hours_worked > 0);

// // //             if (entriesToInsert.length > 0) {
// // //                 const { error: entriesError } = await supabase
// // //                     .schema('workforce')
// // //                     .from('timesheet_items')
// // //                     .insert(entriesToInsert);
// // //                 if (entriesError) throw entriesError;
// // //             }

// // //             message.success(`Timesheet ${status.toLowerCase()} successfully.`);
// // //             onFinish();
// // //         } catch (error: any) {
// // //             console.error('Submission Error:', error);
// // //             message.error(`Failed to ${status.toLowerCase()} timesheet: ${error.message}`);
// // //         } finally {
// // //             setLoading(false);
// // //         }
// // //     };

// // //     const summaryRow = (
// // //         <Table.Summary.Row style={{ background: '#fafafa' }}>
// // //             <Table.Summary.Cell index={0}><Typography.Text strong>Total</Typography.Text></Table.Summary.Cell>
// // //             {projects.flatMap(p => [
// // //                 <Table.Summary.Cell key={`${p.id}_hrs_total`} index={p.id}>
// // //                     <Typography.Text strong>
// // //                         {data.reduce((sum, row) => sum + (row[p.id] || 0), 0).toFixed(2)}
// // //                     </Typography.Text>
// // //                 </Table.Summary.Cell>,
// // //                 <Table.Summary.Cell key={`${p.id}_desc_total`} index={p.id + '_desc'}></Table.Summary.Cell>
// // //             ])}
// // //             <Table.Summary.Cell index={-1}>
// // //                 <Typography.Text strong>{totalHours.toFixed(2)}</Typography.Text>
// // //             </Table.Summary.Cell>
// // //         </Table.Summary.Row>
// // //     );

// // //     return (
// // //         <>
// // //             <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
// // //                 <Col>
// // //                     {!viewMode && (
// // //                         <>
// // //                             <Radio.Group
// // //                                 value={timesheetType}
// // //                                 onChange={(e) => setTimesheetType(e.target.value)}
// // //                                 buttonStyle="solid"
// // //                                 disabled={loading}
// // //                             >
// // //                                 <Radio.Button value="Weekly">Weekly</Radio.Button>
// // //                                 <Radio.Button value="Daily">Daily</Radio.Button>
// // //                             </Radio.Group>
// // //                             <DatePicker
// // //                                 className='ml-2'
// // //                                 value={startDate}
// // //                                 onChange={(date) => setStartDate(date || dayjs())}
// // //                                 picker={timesheetType === 'Weekly' ? 'week' : 'date'}
// // //                                 allowClear={false}
// // //                                 disabled={loading}
// // //                             />
// // //                         </>
// // //                     )}
// // //                     {viewMode && (
// // //                         <Title level={5}>
// // //                             {timesheetType} Timesheet for {startDate.format(timesheetType === 'Weekly' ? 'wo' : 'MMMM D, YYYY')}
// // //                         </Title>
// // //                     )}
// // //                 </Col>
// // //                 <Col>
// // //                     {!viewMode && (
// // //                         <>
// // //                             <Button onClick={() => handleSubmit('Draft')} disabled={loading} loading={loading}>
// // //                                 Save Draft
// // //                             </Button>
// // //                             <Button type="primary" onClick={() => handleSubmit('Submitted')} className='ml-2' disabled={loading} loading={loading}>
// // //                                 Submit
// // //                             </Button>
// // //                         </>
// // //                     )}
// // //                 </Col>
// // //             </Row>

// // //             <Table
// // //                 dataSource={data}
// // //                 columns={columns}
// // //                 pagination={false}
// // //                 bordered
// // //                 summary={() => summaryRow}
// // //                 scroll={{ x: 'max-content' }}
// // //                 rowKey="key"
// // //                 loading={loading}
// // //             />
// // //         </>
// // //     );
// // // };

// // // export default Timesheet;


import React, { useEffect, useState, useMemo } from 'react';
import { 
    Table, 
    Input, 
    Button, 
    Typography, 
    Select, 
    Row, 
    Col, 
    InputNumber, 
    DatePicker, 
    Radio,
    Popover,
    Space,
    Form,
    App
} from 'antd';
import { supabase } from '@/core/lib/supabase';
import { useAuthStore } from '@/core/lib/store';
import dayjs from 'dayjs';
import weekday from 'dayjs/plugin/weekday';
// import './timesheet.css'; 

dayjs.extend(weekday);

const { Option } = Select;
const { Title, Text } = Typography;




// --- CONFIGURATION ---
/**
 * @devnote
 * This configuration object controls the default behavior and UI of the timesheet.
 */
const CONFIG = {
    /** Default timesheet type on creation */
    DEFAULT_TYPE: 'Weekly' as 'Daily' | 'Weekly' | 'Monthly',
    /** Default work week on creation */
    DEFAULT_WORK_WEEK: '5-Day' as '5-Day' | '7-Day',
    /** Toggles the visibility of the description text directly in the cell */
    SHOW_DESCRIPTION_IN_CELL: true,
    /** Max width for the description text before truncating with '...' */
    DESCRIPTION_MAX_WIDTH: '100px',
    
    /**
     * Controls the editing mode.
     * false: Click cell to open a Popover (modal-like window).
     * true:  Show InputNumber and TextArea directly in the cell (spreadsheet style).
     */
    INLINE_EDIT: true, 

    /** Future validation settings */
    VALIDATION: {
        MIN_HOURS_PER_DAY: 0,
        MAX_HOURS_PER_DAY: 24,
    }
};

// --- TYPE DEFINITIONS ---
interface TimesheetSettings {
    type: 'Daily' | 'Weekly' | 'Monthly';
    workWeek: '5-Day' | '7-Day';
    startDate: dayjs.Dayjs;
}
interface TimesheetEntry {
    hours: number | null;
    description: string | null;
}
interface ProjectRow {
    key: string;
    project_id: string;
    project_name: string;
    total: number;
    [dateKey: string]: TimesheetEntry | number | string | null;
}
interface DateColumn {
    key: string; // "YYYY-MM-DD"
    label: string; // "Mon, Oct 20"
    fullDate: dayjs.Dayjs;
}
interface TimesheetProps {
    editItem?: any;
    onFinish: () => void;
    viewMode?: boolean;
}

// --- HELPER COMPONENTS ---

interface TimeEntryCellProps {
    value?: TimesheetEntry;
    onChange: (newValue: TimesheetEntry) => void;
    viewMode: boolean;
    /** @new Prop to toggle edit mode */
    inlineEdit: boolean;
}

/**
 * @component TimeEntryCell
 * @description Renders the cell for time entry.
 * @devnote v3: Now has two modes: 'popover' (default) and 'inline' (new).
 */
const TimeEntryCell: React.FC<TimeEntryCellProps> = ({ value, onChange, viewMode, inlineEdit }) => {
    const [form] = Form.useForm();
    const [visible, setVisible] = useState(false);

    // --- RENDER LOGIC FOR VIEW-ONLY MODE ---
    if (viewMode) {
        const viewContent = (
            (!value?.hours && !value?.description) 
            ? <Text type="secondary" style={{ fontStyle: 'italic' }}>-</Text>
            : (
                <div style={{ lineHeight: 1.3, minHeight: 38 }}>
                    {value?.hours && <Text strong>{`${value.hours} hrs`}</Text>}
                    {CONFIG.SHOW_DESCRIPTION_IN_CELL && value?.description && (
                        <Text 
                            type="secondary" 
                            ellipsis={{ tooltip: { title: value.description, placement: 'topLeft' } }}
                            style={{ display: 'block', maxWidth: CONFIG.DESCRIPTION_MAX_WIDTH }}
                        >
                            {value.description}
                        </Text>
                    )}
                </div>
            )
        );
        return <div style={{ minHeight: 38 }}>{viewContent}</div>;
    }

    // --- RENDER LOGIC FOR INLINE EDIT MODE ---
    if (inlineEdit) {
        return (
            <Space direction="vertical" style={{ width: '100%' }}>
                <InputNumber
                    min={CONFIG.VALIDATION.MIN_HOURS_PER_DAY}
                    max={CONFIG.VALIDATION.MAX_HOURS_PER_DAY}
                    step={0.5}
                    style={{ width: '100%' }}
                    placeholder="Hours"
                    value={value?.hours || null}
                    onChange={(newHours) => {
                        onChange({ 
                            hours: newHours, 
                            description: value?.description || null 
                        });
                    }}
                />
                {CONFIG.SHOW_DESCRIPTION_IN_CELL && (
                    <Input.TextArea
                        placeholder="Description"
                        autoSize={{ minRows: 1, maxRows: 2 }}
                        value={value?.description || ''}
                        onChange={(e) => {
                            onChange({ 
                                hours: value?.hours || null, 
                                description: e.target.value 
                            });
                        }}
                    />
                )}
            </Space>
        );
    }

    // --- RENDER LOGIC FOR POPOVER EDIT MODE (DEFAULT) ---
    const initialValues = {
        hours: value?.hours || null,
        description: value?.description || null,
    };

    const handleOpenChange = (newVisible: boolean) => {
        if (newVisible) {
            form.setFieldsValue(initialValues);
            setVisible(true);
        } else {
            form.submit();
            setVisible(false);
        }
    };

    const onFinish = (values: { hours: number | null, description: string | null }) => {
        onChange({
            hours: values.hours || null,
            description: values.description || null,
        });
        setVisible(false);
    };

    const cellContent = (
        (!value?.hours && !value?.description) 
        ? (
            <Text type="secondary" style={{ fontStyle: 'italic', cursor: 'pointer' }}>
                Log
            </Text>
        ) : (
            <div style={{ lineHeight: 1.3, cursor: 'pointer', minHeight: 38 }}>
                {value?.hours && <Text strong>{`${value.hours} hrs`}</Text>}
                {CONFIG.SHOW_DESCRIPTION_IN_CELL && value?.description && (
                    <Text 
                        type="secondary" 
                        ellipsis={{ tooltip: { title: value.description, placement: 'topLeft' } }}
                        style={{ display: 'block', maxWidth: CONFIG.DESCRIPTION_MAX_WIDTH }}
                    >
                        {value.description}
                    </Text>
                )}
            </div>
        )
    );

    return (
        <Popover
            content={
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={onFinish}
                    initialValues={initialValues}
                    style={{ width: 250 }}
                >
                    <Form.Item name="hours" label="Hours">
                        <InputNumber 
                            min={CONFIG.VALIDATION.MIN_HOURS_PER_DAY} 
                            max={CONFIG.VALIDATION.MAX_HOURS_PER_DAY} 
                            step={0.5} 
                            style={{ width: '100%' }} 
                        />
                    </Form.Item>
                    <Form.Item name="description" label="Description">
                        <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" style={{ width: '100%' }}>
                        Done
                    </Button>
                </Form>
            }
            title="Log Time"
            trigger="click"
            open={visible}
            onOpenChange={handleOpenChange}
        >
            {cellContent}
        </Popover>
    );
};


// --- MAIN COMPONENT ---

const Timesheet: React.FC<TimesheetProps> = ({ editItem, onFinish, viewMode = false }) => {
    
    const [settings, setSettings] = useState<TimesheetSettings>({
        type: editItem?.timesheet_type || CONFIG.DEFAULT_TYPE,
        workWeek: editItem?.work_week_type || CONFIG.DEFAULT_WORK_WEEK, 
        // [FIX] Apply database constraint logic to default date
        startDate: editItem?.timesheet_date 
            ? dayjs(editItem.timesheet_date) 
            : (
                CONFIG.DEFAULT_TYPE === 'Weekly' ? dayjs().weekday(1) : // Monday
                CONFIG.DEFAULT_TYPE === 'Monthly' ? dayjs().startOf('month') : // 1st
                dayjs().startOf('day')
            ),
    });
    
    const [timesheetData, setTimesheetData] = useState<ProjectRow[]>([]);
    const [allProjects, setAllProjects] = useState<any[]>([]);
    const [columnTotals, setColumnTotals] = useState<Map<string, number>>(new Map());
    const [grandTotal, setGrandTotal] = useState<number>(0);
    const [loading, setLoading] = useState(false);
    const { message } = App.useApp();
    const { user } = useAuthStore();

    // --- DATA FETCHING ---
    useEffect(() => {
        const fetchProjects = async () => {
            if (!user?.id) return;
            try {
                const { data, error } = await supabase.rpc('get_projects_for_user', { p_user_id: user.id });
                if (error) throw error;
                setAllProjects(data || []);
            } catch (error: any) {
                console.warn("RPC get_projects_for_user not found or failed, falling back to public.projects table.");
                const { data: tableErrorData, error: tableError } = await supabase.schema('blueprint').from('projects').select('id, name');
                if (tableError) {
                    console.error('Error fetching projects from table:', tableError);
                    message.error('Failed to fetch projects.');
                } else {
                    setAllProjects(tableErrorData || []);
                }
            }
        };
        fetchProjects();
    }, [user?.id]);


    // --- DATE & COLUMN GENERATION (MEMOIZED) ---
    const generateDates = (
        start: dayjs.Dayjs, 
        type: 'Daily' | 'Weekly' | 'Monthly', 
        workWeek: '5-Day' | '7-Day'
    ): DateColumn[] => {
        
        if (type === 'Daily') {
            return [{
                key: start.format('YYYY-MM-DD'),
                label: start.format('ddd, MMM D'),
                fullDate: start,
            }];
        }
        
        if (type === 'Monthly') {
            const daysInMonth = start.daysInMonth();
            const dates: DateColumn[] = [];
            for (let i = 1; i <= daysInMonth; i++) {
                const date = start.date(i);
                if (workWeek === '5-Day' && (date.day() === 0 || date.day() === 6)) {
                    continue;
                }
                dates.push({
                    key: date.format('YYYY-MM-DD'),
                    label: date.format('ddd, D'),
                    fullDate: date,
                });
            }
            return dates;
        }

        // [FIX] Weekly logic: Always start from Monday (weekday 1)
        const weekStart = start.weekday(1); // Ensures startDate is a Monday
        const days = workWeek === '5-Day' ? 5 : 7;
        const startDay = 1; // Always start from Monday

        return Array.from({ length: days }, (_, i) => {
            const date = weekStart.day(startDay + i);
            return {
                key: date.format('YYYY-MM-DD'),
                label: date.format('ddd, MMM D'),
                fullDate: date,
            };
        });
    };
    
    const dynamicDates: DateColumn[] = useMemo(() => {
        return generateDates(settings.startDate, settings.type, settings.workWeek);
    }, [settings.startDate, settings.type, settings.workWeek]);


    // --- DATA LOADING (EDIT/VIEW MODE) ---
    useEffect(() => {
        if (editItem?.timesheet_items && allProjects.length > 0) {
            
            const projectMap = new Map<string, ProjectRow>();
            
            editItem.timesheet_items.forEach((entry: any) => {
                let projectRow = projectMap.get(entry.project_id);

                if (!projectRow) {
                    const projectName = allProjects.find(p => p.id === entry.project_id)?.name || 'Unknown Project';
                    projectRow = {
                        key: entry.project_id,
                        project_id: entry.project_id,
                        project_name: projectName,
                        total: 0,
                    };
                    projectMap.set(entry.project_id, projectRow);
                }

                const dateKey = dayjs(entry.entry_date).format('YYYY-MM-DD');
                projectRow[dateKey] = {
                    hours: entry.hours_worked,
                    description: entry.description,
                };
            });

            const loadedData = Array.from(projectMap.values());
            loadedData.forEach(row => {
                row.total = dynamicDates.reduce((sum, date) => {
                    const entry = row[date.key] as TimesheetEntry;
                    return sum + (entry?.hours || 0);
                }, 0);
            });
            
            setTimesheetData(loadedData);
        }
    }, [editItem, allProjects, dynamicDates]);


    // --- TOTALS CALCULATION ---
    useEffect(() => {
        const newColumnTotals = new Map<string, number>();
        let newGrandTotal = 0;

        dynamicDates.forEach(date => newColumnTotals.set(date.key, 0));

        timesheetData.forEach(row => {
            dynamicDates.forEach(date => {
                const entry = row[date.key] as TimesheetEntry;
                if (entry?.hours) {
                    const currentTotal = newColumnTotals.get(date.key) || 0;
                    newColumnTotals.set(date.key, currentTotal + entry.hours);
                }
            });
        });

        newGrandTotal = Array.from(newColumnTotals.values()).reduce((sum, total) => sum + total, 0);

        setColumnTotals(newColumnTotals);
        setGrandTotal(newGrandTotal);
    }, [timesheetData, dynamicDates]);


    // --- EVENT HANDLERS ---
    
    /**
     * @handler handleSettingsChange
     * @description Updates settings and snaps date to meet DB constraints.
     */
    const handleSettingsChange = (key: string, value: any) => {
        const newSettings = { ...settings, [key]: value };

        // [FIX] Handle date snapping for DB constraint
        if (key === 'type') {
            if (value === 'Weekly') {
                // Snap existing date to Monday
                newSettings.startDate = settings.startDate.weekday(1);
            } else if (value === 'Monthly') {
                newSettings.startDate = settings.startDate.startOf('month');
            }
        } else if (key === 'startDate' && value) {
            // Snap new date to correct start
            if (settings.type === 'Weekly') {
                newSettings.startDate = value.weekday(1); // Monday
            } else if (settings.type === 'Monthly') {
                newSettings.startDate = value.startOf('month');
            }
            // For 'Daily', use the exact date
        }
        
        setSettings(newSettings);
    };

    const handleAddProject = (projectId: string) => {
        if (timesheetData.find(row => row.project_id === projectId)) {
            message.warning('Project is already in the timesheet.');
            return;
        }

        const project = allProjects.find(p => p.id === projectId);
        if (!project) return;

        const newRow: ProjectRow = {
            key: project.id,
            project_id: project.id,
            project_name: project.name,
            total: 0,
        };
        
        dynamicDates.forEach(date => {
            newRow[date.key] = null;
        });

        setTimesheetData([...timesheetData, newRow]);
    };
    
    const handleRemoveProject = (projectId: string) => {
        setTimesheetData(timesheetData.filter(row => row.project_id !== projectId));
    };

    const handleCellChange = (projectId: string, dateKey: string, newValue: TimesheetEntry) => {
        const newData = [...timesheetData];
        const rowIndex = newData.findIndex(row => row.project_id === projectId);
        if (rowIndex === -1) return;

        const row = newData[rowIndex];
        row[dateKey] = newValue;

        row.total = dynamicDates.reduce((sum, date) => {
            const entry = row[date.key] as TimesheetEntry;
            return sum + (entry?.hours || 0);
        }, 0);

        setTimesheetData(newData);
    };

    /**
     * @handler handleSubmit
     * @description Saves timesheet and entries, ensuring dates are correct.
     */
    const handleSubmit = async (status: 'Draft' | 'Submitted') => {
        console.log("uk",user);
        if (!user?.id) { message.error('User is not authenticated.'); return; }
        if (timesheetData.length === 0) { message.error('Cannot submit an empty timesheet. Please add a project.'); return; }
        if (grandTotal === 0) { message.error('Cannot submit a timesheet with no hours. Please log your time.'); return; }
        
        console.log(`Submitting timesheet with status: ${status}`);
        setLoading(true);

        try {
            // [FIX] Ensure timesheet_date is the *first* day of the period.
            const firstDate = dynamicDates[0].fullDate;
            const lastDate = dynamicDates[dynamicDates.length - 1].fullDate;

            const timesheetPayload = {
                id: editItem?.id,
                user_id: user.id,
                organization_id: (user as any).pref_organization_id || user.organization_id,
                timesheet_date: firstDate.format('YYYY-MM-DD'),
                last_date: lastDate.format('YYYY-MM-DD'),
                timesheet_type: settings.type,
                total_hours: grandTotal,
                stage_id: status,
            };

            console.log('Timesheet Payload:', timesheetPayload);

            const { data: sheetData, error: sheetError } = await supabase
                .schema('workforce')
                .from('timesheets')
                .upsert(timesheetPayload)
                .select()
                .single();

            if (sheetError) {
                console.error('Supabase Timesheet Upsert Error:', sheetError);
                throw sheetError;
            }
            
            console.log('Supabase Timesheet Upsert Success:', sheetData);
            const timesheetId = sheetData.id;

            if (editItem?.id) {
                console.log('Deleting existing entries for timesheet:', timesheetId);
                const { error: deleteError } = await supabase
                    .schema('workforce')
                    .from('timesheet_items')
                    .delete()
                    .eq('timesheet_id', timesheetId);
                if (deleteError) {
                    console.error('Supabase Entry Delete Error:', deleteError);
                    throw deleteError;
                }
            }

            const entriesToInsert: any[] = [];
            timesheetData.forEach(row => {
                dynamicDates.forEach(date => {
                    const entry = row[date.key] as TimesheetEntry;
                    if (entry && entry.hours && entry.hours > 0) {
                        entriesToInsert.push({
                            timesheet_id: timesheetId,
                            project_id: row.project_id,
                            organization_id: (user as any).pref_organization_id || user.organization_id,
                            entry_date: date.key, 
                            hours_worked: entry.hours,
                            description: entry.description || null,
                            created_by: user.id,
                        });
                    }
                });
            });

            console.log('Entries to insert:', entriesToInsert);

            if (entriesToInsert.length > 0) {
                const { error: entriesError } = await supabase
                    .schema('workforce')
                    .from('timesheet_items')
                    .insert(entriesToInsert);
                if (entriesError) {
                    console.error('Supabase Entry Insert Error:', entriesError);
                    throw entriesError;
                }
                console.log('Supabase Entry Insert Success');
            }

            message.success(`Timesheet ${status.toLowerCase()} successfully.`);
            onFinish?.();
        } catch (error: any)
        {
            console.error('Submission Error:', error);
            message.error(`Failed to ${status.toLowerCase()} timesheet: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };


    // --- TABLE COLUMNS (MEMOIZED) ---
    const columns = useMemo(() => {
        const projectColumn = {
            title: 'Project',
            dataIndex: 'project_name',
            fixed: "left" as const,
            width: 200,
            render: (name: string, record: ProjectRow) => (
                <Space>
                    <Text strong>{name}</Text>
                    {!viewMode && (
                        <Button 
                            type="text" 
                            danger 
                            size="small"
                            onClick={() => handleRemoveProject(record.project_id)}
                            icon={<span role="img" aria-label="delete">✖</span>} 
                        />
                    )}
                </Space>
            ),
        };

        const dateColumns = dynamicDates.map(date => {
            const isWeekend = date.fullDate.day() === 0 || date.fullDate.day() === 6;
            return {
                title: date.label,
                dataIndex: date.key,
                key: date.key,
                width: CONFIG.INLINE_EDIT ? 150 : 130,
                align: "left" as const,
                className: isWeekend ? 'weekend-column' : '',
                render: (entry: TimesheetEntry | null, record: ProjectRow) => (
                    <TimeEntryCell
                        value={entry || undefined}
                        onChange={(newValue) => handleCellChange(record.project_id, date.key, newValue)}
                        viewMode={viewMode}
                        inlineEdit={CONFIG.INLINE_EDIT}
                    />
                ),
            };
        });

        const totalColumn = {
            title: 'Total',
            dataIndex: 'total',
            fixed: "right" as const,
            width: 80,
            align: "right" as const,
            render: (total: number) => <Text strong>{total?.toFixed(2) || "0.00"}</Text>,
        };

        return [projectColumn, ...dateColumns, totalColumn];
    }, [dynamicDates, viewMode, timesheetData, CONFIG.INLINE_EDIT]);


    // --- RENDER ---
    const datePickerType = settings.type.toLowerCase() as 'week' | 'month' | 'date';
    return (
        <>
            <style>{`
                .weekend-column { background-color: #fafafa; }
                .ant-table-cell { vertical-align: top; padding: 8px !important; }
            `}</style>
            
            {/* 1. SETTINGS HEADER */}
            {!viewMode && (
                <Row justify="space-between" align="middle" style={{ marginBottom: 16 }} gutter={[16, 16]}>
                    <Col>
                        <Space wrap>
                            <Radio.Group
                                value={settings.type}
                                onChange={(e) => handleSettingsChange('type', e.target.value)}
                                buttonStyle="solid"
                                disabled={loading}
                            >
                                <Radio.Button value="Daily">Daily</Radio.Button>
                                <Radio.Button value="Weekly">Weekly</Radio.Button>
                                <Radio.Button value="Monthly">Monthly</Radio.Button>
                            </Radio.Group>

                            {settings.type !== 'Daily' && (
                                <Radio.Group
                                    value={settings.workWeek}
                                    onChange={(e) => handleSettingsChange('workWeek', e.target.value)}
                                    disabled={loading}
                                >
                                    <Radio value="5-Day">5-Day Week</Radio>
                                    <Radio value="7-Day">7-Day Week</Radio>
                                </Radio.Group>
                            )}

                            <DatePicker
                                value={settings.startDate}
                                onChange={(date) => handleSettingsChange('startDate', date || dayjs())}
                                picker={datePickerType}
                                allowClear={false}
                                disabled={loading}
                            />
                        </Space>
                    </Col>
                </Row>
            )}

            {/* 2. VIEW MODE HEADER & SUBMIT BUTTONS */}
            <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
                <Col>
                    {viewMode && (
                        <Title level={5}>
                            {settings.type} Timesheet: {settings.startDate.format(
                                settings.type === 'Weekly' ? 'wo, YYYY' : 
                                settings.type === 'Monthly' ? 'MMMM YYYY' : 
                                'MMMM D, YYYY'
                            )}
                        </Title>
                    )}
                    {!viewMode && (
                        <Select
                            placeholder="Add a project to log time..."
                            style={{ width: 300 }}
                            onSelect={handleAddProject}
                            value={null}
                            loading={allProjects.length === 0}
                        >
                            {allProjects.map(p => (
                                <Option key={p.id} value={p.id}>{p.name}</Option>
                            ))}
                        </Select>
                    )}
                </Col>
                <Col>
                    {!viewMode && (
                        <Space>
                            <Button onClick={() => handleSubmit('Draft')} disabled={loading} loading={loading}>
                                Save Draft
                            </Button>
                            <Button type="primary" onClick={() => handleSubmit('Submitted')} disabled={loading} loading={loading}>
                                Submit
                            </Button>
                        </Space>
                    )}
                </Col>
            </Row>

            {/* 3. THE TIMESHEET TABLE */}
            <Table
                dataSource={timesheetData}
                columns={columns}
                pagination={false}
                bordered
                scroll={{ x: 'max-content' }}
                rowKey="key"
                loading={loading}
                summary={() => (
                    <Table.Summary.Row style={{ background: '#fafafa', textAlign: 'right' }}>
                        <Table.Summary.Cell index={0} style={{ textAlign: 'left' }}>
                            <Text strong>Total</Text>
                        </Table.Summary.Cell>
                        
                        {dynamicDates.map((date, index) => {
                            const isWeekend = date.fullDate.day() === 0 || date.fullDate.day() === 6;
                            return (
                                <Table.Summary.Cell 
                                    key={date.key} 
                                    index={index + 1} 
                                    style={{ textAlign: 'center' }}
                                    className={isWeekend ? 'weekend-column' : ''}
                                >
                                    <Text strong>
                                        {(columnTotals.get(date.key) || 0).toFixed(2)}
                                    </Text>
                                </Table.Summary.Cell>
                            );
                        })}

                        <Table.Summary.Cell index={-1}>
                            <Text strong>{grandTotal.toFixed(2)}</Text>
                        </Table.Summary.Cell>
                    </Table.Summary.Row>
                )}
            />
        </>
    );
};

export default Timesheet;

