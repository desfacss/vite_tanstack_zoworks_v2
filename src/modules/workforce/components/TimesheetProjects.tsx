// import React, { useEffect, useState, useMemo } from 'react';
// import { 
//     Table, 
//     Input, 
//     Button, 
//     Typography, 
//     Select, 
//     message, 
//     Row, 
//     Col, 
//     InputNumber, 
//     DatePicker, 
//     Radio,
//     Popover,
//     Space,
//     Form
// } from 'antd';
// // DEV NOTE: The Supabase client and AuthStore are mocked for this environment.
// // In a real application, you would use your actual imports.
// // import { supabase } from '@/lib/supabase'; 
// // import { useAuthStore } from '@/core/lib/store';
// import dayjs from 'dayjs';
// import weekday from 'dayjs/plugin/weekday';
// // import './timesheet.css'; // Removed as CSS is handled inline or by AntD

// dayjs.extend(weekday);

// const { Option } = Select;
// const { Title, Text } = Typography;

// // --- MOCKED DEPENDENCIES ---

// // Mock Supabase client
// const supabase = {
//     schema: () => supabase,
//     from: () => ({
//         upsert: () => ({ select: () => ({ single: () => Promise.resolve({ data: { id: 'ts-mock-id' }, error: null }) }) }),
//         delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
//         insert: () => Promise.resolve({ error: null }),
//         select: () => Promise.resolve({ data: [{id: 'proj-1', name: 'Project Apollo'}, {id: 'proj-2', name: 'Project Zeus'}], error: null })
//     }),
//     rpc: () => Promise.resolve({ 
//         data: [{id: 'proj-1', name: 'Project Apollo'}, {id: 'proj-2', name: 'Project Zeus'}, {id: 'proj-3', name: 'Project Phoenix'}], 
//         error: null 
//     })
// };

// // Mock AuthStore hook
// const useAuthStore = () => ({
//     user: {
//         id: 'user-123',
//         organization_id: 'org-456'
//     }
// });


// // --- CONFIGURATION ---
// const CONFIG = {
//     DEFAULT_TYPE: 'Weekly' as 'Daily' | 'Weekly' | 'Monthly',
//     DEFAULT_WORK_WEEK: '5-Day' as '5-Day' | '7-Day',
//     SHOW_DESCRIPTION_IN_CELL: true,
//     DESCRIPTION_MAX_WIDTH: '100px',
//     INLINE_EDIT: true,
//     VALIDATION: {
//         MIN_HOURS_PER_DAY: 0,
//         MAX_HOURS_PER_DAY: 24,
//     }
// };

// // --- TYPE DEFINITIONS ---

// interface TimesheetSettings {
//     type: 'Daily' | 'Weekly' | 'Monthly';
//     workWeek: '5-Day' | '7-Day';
//     startDate: dayjs.Dayjs;
// }
// interface TimesheetEntry {
//     hours: number | null;
//     description: string | null;
// }
// interface DateRow {
//     key: string; 
//     dateLabel: string;
//     total: number;
//     [projectId: string]: TimesheetEntry | number | string | null;
// }
// interface DateInfo {
//     key: string;
//     label: string;
//     fullDate: dayjs.Dayjs;
// }
// interface SelectedProject {
//     id: string;
//     name: string;
// }
// interface TimesheetProps {
//     editItem?: any;
//     onFinish: () => void;
//     viewMode?: boolean;
// }

// // --- HELPER COMPONENTS (REUSABLE) ---

// interface TimeEntryCellProps {
//     value?: TimesheetEntry;
//     onChange: (newValue: TimesheetEntry) => void;
//     viewMode: boolean;
//     inlineEdit: boolean;
// }

// const TimeEntryCell: React.FC<TimeEntryCellProps> = ({ value, onChange, viewMode, inlineEdit }) => {
//     const [form] = Form.useForm();
//     const [visible, setVisible] = useState(false);

//     if (viewMode) {
//         const viewContent = (
//             (!value?.hours && !value?.description) 
//             ? <Text type="secondary" style={{ fontStyle: 'italic' }}>-</Text>
//             : (
//                 <div style={{ lineHeight: 1.3, minHeight: 38 }}>
//                     {value?.hours && <Text strong>{`${value.hours} hrs`}</Text>}
//                     {CONFIG.SHOW_DESCRIPTION_IN_CELL && value?.description && (
//                         <Text 
//                             type="secondary" 
//                             ellipsis={{ tooltip: { title: value.description, placement: 'topLeft' } }}
//                             style={{ display: 'block', maxWidth: CONFIG.DESCRIPTION_MAX_WIDTH }}
//                         >
//                             {value.description}
//                         </Text>
//                     )}
//                 </div>
//             )
//         );
//         return <div style={{ minHeight: 38 }}>{viewContent}</div>;
//     }

//     if (inlineEdit) {
//         return (
//             <Space direction="vertical" style={{ width: '100%' }}>
//                 <InputNumber
//                     min={CONFIG.VALIDATION.MIN_HOURS_PER_DAY}
//                     max={CONFIG.VALIDATION.MAX_HOURS_PER_DAY}
//                     step={0.5}
//                     style={{ width: '100%' }}
//                     placeholder="Hours"
//                     value={value?.hours || null}
//                     onChange={(newHours) => {
//                         onChange({ 
//                             hours: newHours, 
//                             description: value?.description || null 
//                         });
//                     }}
//                 />
//                 {CONFIG.SHOW_DESCRIPTION_IN_CELL && (
//                     <Input.TextArea
//                         placeholder="Description"
//                         autoSize={{ minRows: 1, maxRows: 2 }}
//                         value={value?.description || ''}
//                         onChange={(e) => {
//                             onChange({ 
//                                 hours: value?.hours || null, 
//                                 description: e.target.value 
//                             });
//                         }}
//                     />
//                 )}
//             </Space>
//         );
//     }

//     const initialValues = { hours: value?.hours || null, description: value?.description || null };
//     const handleOpenChange = (newVisible: boolean) => {
//         if (newVisible) {
//             form.setFieldsValue(initialValues);
//             setVisible(true);
//         } else {
//             form.submit();
//             setVisible(false);
//         }
//     };
//     const onFinish = (values: { hours: number | null, description: string | null }) => {
//         onChange({ hours: values.hours || null, description: values.description || null });
//         setVisible(false);
//     };
//     const cellContent = (
//         (!value?.hours && !value?.description) 
//         ? <Text type="secondary" style={{ fontStyle: 'italic', cursor: 'pointer' }}>Log</Text>
//         : (
//             <div style={{ lineHeight: 1.3, cursor: 'pointer', minHeight: 38 }}>
//                 {value?.hours && <Text strong>{`${value.hours} hrs`}</Text>}
//                 {CONFIG.SHOW_DESCRIPTION_IN_CELL && value?.description && (
//                     <Text 
//                         type="secondary" 
//                         ellipsis={{ tooltip: { title: value.description, placement: 'topLeft' } }}
//                         style={{ display: 'block', maxWidth: CONFIG.DESCRIPTION_MAX_WIDTH }}
//                     >
//                         {value.description}
//                     </Text>
//                 )}
//             </div>
//         )
//     );

//     return (
//         <Popover
//             content={
//                 <Form form={form} layout="vertical" onFinish={onFinish} initialValues={initialValues} style={{ width: 250 }}>
//                     <Form.Item name="hours" label="Hours"><InputNumber min={0} max={24} step={0.5} style={{ width: '100%' }} /></Form.Item>
//                     <Form.Item name="description" label="Description"><Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} /></Form.Item>
//                     <Button type="primary" htmlType="submit" style={{ width: '100%' }}>Done</Button>
//                 </Form>
//             }
//             title="Log Time" trigger="click" open={visible} onOpenChange={handleOpenChange}
//         >
//             {cellContent}
//         </Popover>
//     );
// };


// // --- MAIN COMPONENT ---

// const TimesheetProjects: React.FC<TimesheetProps> = ({ editItem, onFinish, viewMode = false }) => {
    
//     // --- STATE ---
//     const [settings, setSettings] = useState<TimesheetSettings>({
//         type: editItem?.timesheet_type || CONFIG.DEFAULT_TYPE,
//         workWeek: editItem?.work_week_type || CONFIG.DEFAULT_WORK_WEEK, 
//         // [FIX] Default to Monday (weekday 1) for weekly.
//         startDate: editItem?.timesheet_date 
//             ? dayjs(editItem.timesheet_date) 
//             : (
//                 CONFIG.DEFAULT_TYPE === 'Weekly' ? dayjs().weekday(1) :
//                 CONFIG.DEFAULT_TYPE === 'Monthly' ? dayjs().startOf('month') :
//                 dayjs().startOf('day')
//             ),
//     });
//     const [allProjects, setAllProjects] = useState<any[]>([]);
//     const [selectedProjects, setSelectedProjects] = useState<SelectedProject[]>([]);
//     const [timesheetData, setTimesheetData] = useState<DateRow[]>([]);
//     const [grandTotal, setGrandTotal] = useState<number>(0);
//     const [loading, setLoading] = useState(false);
//     const { user } = useAuthStore();

//     // --- DATA FETCHING ---
//     useEffect(() => {
//         const fetchProjects = async () => {
//             if (!user?.id) return;
//             try {
//                 const { data, error } = await supabase.rpc('get_projects_for_user', { p_user_id: user.id });
//                 if (error) throw error;
//                 setAllProjects(data || []);
//             } catch (error: any) {
//                 console.warn("RPC get_projects_for_user not found or failed, falling back to public.projects table.", error);
//                 const { data: tableData, error: tableError } = await supabase.from('projects').select('id, name');
//                 if (tableError) message.error('Failed to fetch projects.');
//                 else setAllProjects(tableData || []);
//             }
//         };
//         fetchProjects();
//     }, [user?.id]);


//     // --- DATE ROW GENERATION ---
//     const dynamicDates: DateInfo[] = useMemo(() => {
//         const { startDate, type, workWeek } = settings;
//         if (type === 'Daily') {
//             return [{ key: startDate.format('YYYY-MM-DD'), label: startDate.format('ddd, MMM D'), fullDate: startDate }];
//         }
//         if (type === 'Monthly') {
//             const daysInMonth = startDate.daysInMonth();
//             const dates: DateInfo[] = [];
//             for (let i = 1; i <= daysInMonth; i++) {
//                 const date = startDate.date(i);
//                 if (workWeek === '5-Day' && (date.day() === 0 || date.day() === 6)) continue;
//                 dates.push({ key: date.format('YYYY-MM-DD'), label: date.format('ddd, D'), fullDate: date });
//             }
//             return dates;
//         }
//         // [FIX] Weekly logic: Always start from Monday (weekday 1)
//         const weekStart = startDate.weekday(1); // Ensures startDate is a Monday
//         const days = workWeek === '5-Day' ? 5 : 7;
//         // [FIX] Always start iterating from day 1 (Monday)
//         const startDay = 1; 
//         return Array.from({ length: days }, (_, i) => {
//             // .day() is locale-aware, but weekday(1) sets to Monday regardless of locale.
//             // .day(1 + i) will be Mon, Tue, Wed, Thu, Fri, Sat, Sun
//             const date = weekStart.day(startDay + i);
//             return { key: date.format('YYYY-MM-DD'), label: date.format('ddd, MMM D'), fullDate: date };
//         });
//     }, [settings.startDate, settings.type, settings.workWeek]);


//     // --- DATA STRUCTURE & LOADING ---

//     useEffect(() => {
//         // [FIX] Check for existing data based on both key AND project content to avoid data loss
//         const oldDataMap = new Map<string, DateRow>();
//         timesheetData.forEach(row => oldDataMap.set(row.key, row));

//         const newDataSource = dynamicDates.map(dateInfo => {
//             const existingRow = oldDataMap.get(dateInfo.key);
            
//             const newRow: DateRow = {
//                 key: dateInfo.key,
//                 dateLabel: dateInfo.label,
//                 total: 0,
//             };

//             selectedProjects.forEach(proj => {
//                 newRow[proj.id] = existingRow?.[proj.id] || null;
//             });

//             newRow.total = selectedProjects.reduce((sum, proj) => {
//                 const entry = newRow[proj.id] as TimesheetEntry;
//                 return sum + (entry?.hours || 0);
//             }, 0);

//             return newRow;
//         });
//         setTimesheetData(newDataSource);
//     }, [dynamicDates, selectedProjects]);

//     useEffect(() => {
//         if (editItem?.timesheet_items && allProjects.length > 0) {
//             setLoading(true);

//             const projectIdsInTimesheet = [...new Set(editItem.timesheet_items.map((e: any) => e.project_id))] as string[];
//             const projectsToSelect = allProjects.filter(p => projectIdsInTimesheet.includes(p.id));
//             setSelectedProjects(projectsToSelect);

//             const entryMap = new Map<string, Map<string, TimesheetEntry>>();
//             editItem.timesheet_items.forEach((entry: any) => {
//                 const dateKey = dayjs(entry.entry_date).format('YYYY-MM-DD');
//                 if (!entryMap.has(dateKey)) {
//                     entryMap.set(dateKey, new Map());
//                 }
//                 entryMap.get(dateKey)!.set(entry.project_id, {
//                     hours: entry.hours_worked,
//                     description: entry.description
//                 });
//             });
            
//             // [FIX] Use dynamicDates to build the initial data, not prevData
//             const loadedData = dynamicDates.map(dateRow => {
//                 const newRow: DateRow = {
//                     key: dateRow.key,
//                     dateLabel: dateRow.label,
//                     total: 0,
//                 };

//                 const entriesForDate = entryMap.get(dateRow.key);
//                 if (entriesForDate) {
//                     entriesForDate.forEach((entry, projectId) => {
//                         newRow[projectId] = entry;
//                     });
//                 }
                
//                 newRow.total = projectsToSelect.reduce((sum, proj) => {
//                     const entry = newRow[proj.id] as TimesheetEntry;
//                     return sum + (entry?.hours || 0);
//                 }, 0);

//                 return newRow;
//             });
            
//             setTimesheetData(loadedData);
//             setLoading(false);
//         }
//     }, [editItem, allProjects, dynamicDates]); // Added dynamicDates dependency


//     // --- TOTALS CALCULATION ---
//     useEffect(() => {
//         const newGrandTotal = timesheetData.reduce((sum, row) => sum + row.total, 0);
//         setGrandTotal(newGrandTotal);
//     }, [timesheetData]);


//     // --- EVENT HANDLERS ---
//     const handleSettingsChange = (key: string, value: any) => {
//         const newSettings = { ...settings, [key]: value };

//         // [FIX] Handle date snapping for DB constraint
//         if (key === 'type') {
//             if (value === 'Weekly') {
//                 // Snap existing date to Monday
//                 newSettings.startDate = settings.startDate.weekday(1);
//             } else if (value === 'Monthly') {
//                 newSettings.startDate = settings.startDate.startOf('month');
//             }
//         } else if (key === 'startDate' && value) {
//             // Snap new date to correct start
//             if (settings.type === 'Weekly') {
//                 newSettings.startDate = value.weekday(1); // Monday
//             } else if (settings.type === 'Monthly') {
//                 newSettings.startDate = value.startOf('month');
//             }
//             // For 'Daily', use the exact date
//         }
        
//         setSettings(newSettings);
//     };

//     const handleProjectSelectionChange = (selectedIds: string[]) => {
//         const newSelectedProjects = allProjects.filter(p => selectedIds.includes(p.id));
//         setSelectedProjects(newSelectedProjects);
//     };

//     const handleCellChange = (dateKey: string, projectId: string, newValue: TimesheetEntry) => {
//         setTimesheetData(prevData => {
//             const newData = [...prevData];
//             const rowIndex = newData.findIndex(row => row.key === dateKey);
//             if (rowIndex === -1) return prevData;

//             const rowToUpdate = { ...newData[rowIndex] };
//             rowToUpdate[projectId] = newValue;

//             rowToUpdate.total = selectedProjects.reduce((sum, proj) => {
//                 const entry = rowToUpdate[proj.id] as TimesheetEntry;
//                 return sum + (entry?.hours || 0);
//             }, 0);

//             newData[rowIndex] = rowToUpdate;
//             return newData;
//         });
//     };
    
//     const handleSubmit = async (status: 'Draft' | 'Submitted') => {
//         if (!user?.id) { message.error('User not authenticated'); return; }
//         if (selectedProjects.length === 0) { message.error('Please select at least one project.'); return; }
//         if (grandTotal === 0) { message.error('Cannot submit a timesheet with zero hours.'); return; }
//         setLoading(true);

//         try {
//             const entriesToInsert: any[] = [];
//             timesheetData.forEach(dateRow => {
//                 selectedProjects.forEach(proj => {
//                     const entry = dateRow[proj.id] as TimesheetEntry;
//                     if (entry && entry.hours && entry.hours > 0) {
//                         entriesToInsert.push({
//                             project_id: proj.id,
//                             organization_id: user.pref_organization_id,
//                             entry_date: dateRow.key,
//                             hours_worked: entry.hours,
//                             description: entry.description || null,
//                             created_by: user.id,
//                         });
//                     }
//                 });
//             });

//             // [FIX] Ensure timesheet_date is the *first* day of the period.
//             const firstDate = dynamicDates[0].fullDate;
//             const lastDate = dynamicDates[dynamicDates.length - 1].fullDate;

//             const timesheetPayload = {
//                 id: editItem?.id, user_id: user.id, organization_id: user.pref_organization_id,
//                 timesheet_date: firstDate.format('YYYY-MM-DD'),
//                 last_date: lastDate.format('YYYY-MM-DD'),
//                 timesheet_type: settings.type, total_hours: grandTotal, stage_id: status,
//             };
//             const { data: sheetData, error: sheetError } = await supabase.schema('workforce').from('timesheets').upsert(timesheetPayload).select().single();
//             if (sheetError) throw sheetError;
//             const timesheetId = sheetData.id;

//             if (editItem?.id) {
//                 const { error: deleteError } = await supabase.schema('workforce').from('timesheet_items').delete().eq('timesheet_id', timesheetId);
//                 if (deleteError) throw deleteError;
//             }

//             if (entriesToInsert.length > 0) {
//                 const finalEntries = entriesToInsert.map(e => ({ ...e, timesheet_id: timesheetId }));
//                 const { error: entriesError } = await supabase.schema('workforce').from('timesheet_items').insert(finalEntries);
//                 if (entriesError) throw entriesError;
//             }

//             message.success(`Timesheet ${status} successfully.`);
//             onFinish();
//         } catch (error: any) {
//             console.error('Submission Error:', error);
//             message.error(`Failed to ${status.toLowerCase()} timesheet: ${error.message}`);
//         } finally {
//             setLoading(false);
//         }
//     };


//     // --- TABLE COLUMNS (MEMOIZED) ---
//     const columns = useMemo(() => {
//         const dateColumn = {
//             title: 'Date', dataIndex: 'dateLabel', fixed: "left" as const, width: 150,
//             render: (label: string, record: DateRow) => {
//                 const day = dayjs(record.key).day();
//                 const isWeekend = day === 0 || day === 6;
//                 return <Text strong={isWeekend}>{label}</Text>;
//             }
//         };

//         const projectColumns = selectedProjects.map(proj => ({
//             title: proj.name, dataIndex: proj.id, key: proj.id,
//             width: CONFIG.INLINE_EDIT ? 150 : 130,
//             align: "left" as const,
//             render: (entry: TimesheetEntry | null, record: DateRow) => (
//                 <TimeEntryCell
//                     value={entry || undefined}
//                     onChange={(newValue) => handleCellChange(record.key, proj.id, newValue)}
//                     viewMode={viewMode}
//                     inlineEdit={CONFIG.INLINE_EDIT}
//                 />
//             ),
//         }));

//         const totalColumn = {
//             title: 'Total', dataIndex: 'total', fixed: "right" as const, width: 80, align: "right" as const,
//             render: (total: number) => <Text strong>{total?.toFixed(2) || "0.00"}</Text>,
//         };

//         return [dateColumn, ...projectColumns, totalColumn];
//     }, [selectedProjects, viewMode, CONFIG.INLINE_EDIT, timesheetData]);


//     // --- RENDER ---
//     const datePickerType = settings.type.toLowerCase() as 'week' | 'month' | 'date';
//     return (
//         <>
//             <style>{`.weekend-row { background-color: #fafafa; } .ant-table-cell { vertical-align: top; padding: 8px !important; }`}</style>
            
//             {/* Settings Header */}
//             {!viewMode && ( <Row justify="space-between" align="middle" style={{ marginBottom: 16 }} gutter={[16, 16]}> <Col> <Space wrap> <Radio.Group value={settings.type} onChange={(e) => handleSettingsChange('type', e.target.value)} buttonStyle="solid" disabled={loading}> <Radio.Button value="Daily">Daily</Radio.Button> <Radio.Button value="Weekly">Weekly</Radio.Button> <Radio.Button value="Monthly">Monthly</Radio.Button> </Radio.Group> {settings.type !== 'Daily' && (<Radio.Group value={settings.workWeek} onChange={(e) => handleSettingsChange('workWeek', e.target.value)} disabled={loading}> <Radio value="5-Day">5-Day Week</Radio> <Radio value="7-Day">7-Day Week</Radio> </Radio.Group>)} <DatePicker value={settings.startDate} onChange={(date) => handleSettingsChange('startDate', date || dayjs())} picker={datePickerType} allowClear={false} disabled={loading}/> </Space> </Col> </Row> )}
            
//             {/* Project Selector & Submit */}
//             <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
//                 <Col xs={24} sm={16} md={12}>
//                     {viewMode ? (
//                         <Title level={5}>
//                             {settings.type} Timesheet: {settings.startDate.format(
//                                 settings.type === 'Weekly' ? 'wo, YYYY' : 
//                                 settings.type === 'Monthly' ? 'MMMM YYYY' : 'MMMM D, YYYY'
//                             )}
//                         </Title>
//                     ) : (
//                         <Select
//                             mode="multiple"
//                             placeholder="Select projects to show as columns..."
//                             value={selectedProjects.map(p => p.id)}
//                             onChange={handleProjectSelectionChange}
//                             style={{ width: '100%' }}
//                             loading={allProjects.length === 0}
//                             allowClear
//                         >
//                             {allProjects.map(p => <Option key={p.id} value={p.id}>{p.name}</Option>)}
//                         </Select>
//                     )}
//                 </Col>
//                 <Col>
//                     {!viewMode && (
//                         <Space>
//                             <Button onClick={() => handleSubmit('Draft')} disabled={loading} loading={loading}>Save Draft</Button>
//                             <Button type="primary" onClick={() => handleSubmit('Submitted')} disabled={loading} loading={loading}>Submit</Button>
//                         </Space>
//                     )}
//                 </Col>
//             </Row>

//             {/* The Table */}
//             <Table
//                 dataSource={timesheetData}
//                 columns={columns}
//                 pagination={false}
//                 bordered
//                 scroll={{ x: 'max-content' }}
//                 rowKey="key"
//                 loading={loading}
//                 rowClassName={(record) => {
//                     const day = dayjs(record.key).day();
//                     return (day === 0 || day === 6) ? 'weekend-row' : '';
//                 }}
//                 summary={() => (
//                     <Table.Summary.Row style={{ background: '#fafafa', textAlign: 'right' }}>
//                         <Table.Summary.Cell index={0} style={{ textAlign: 'left' }}><Text strong>Total</Text></Table.Summary.Cell>
//                         {selectedProjects.map((proj, index) => (
//                             <Table.Summary.Cell key={proj.id} index={index + 1} style={{ textAlign: 'center' }}>
//                                 <Text strong>
//                                     {timesheetData.reduce((sum, row) => sum + ((row[proj.id] as TimesheetEntry)?.hours || 0), 0).toFixed(2)}
//                                 </Text>
//                             </Table.Summary.Cell>
//                         ))}
//                         <Table.Summary.Cell index={-1}><Text strong>{grandTotal.toFixed(2)}</Text></Table.Summary.Cell>
//                     </Table.Summary.Row>
//                 )}
//             />
//         </>
//     );
// };

// export default TimesheetProjects;


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
// import './timesheet.css'; // Removed as CSS is handled inline or by AntD

dayjs.extend(weekday);

const { Option } = Select;
const { Title, Text } = Typography;




// --- CONFIGURATION ---
const CONFIG = {
    DEFAULT_TYPE: 'Weekly' as 'Daily' | 'Weekly' | 'Monthly',
    DEFAULT_WORK_WEEK: '5-Day' as '5-Day' | '7-Day',
    SHOW_DESCRIPTION_IN_CELL: true,
    DESCRIPTION_MAX_WIDTH: '100px',
    INLINE_EDIT: true,
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
interface DateRow {
    key: string; 
    dateLabel: string;
    total: number;
    [projectId: string]: TimesheetEntry | number | string | null;
}
interface DateInfo {
    key: string;
    label: string;
    fullDate: dayjs.Dayjs;
}
interface SelectedProject {
    id: string;
    name: string;
}
interface TimesheetProps {
    editItem?: any;
    onFinish: () => void;
    viewMode?: boolean;
}

// --- HELPER COMPONENTS (REUSABLE) ---

interface TimeEntryCellProps {
    value?: TimesheetEntry;
    onChange: (newValue: TimesheetEntry) => void;
    viewMode: boolean;
    inlineEdit: boolean;
}

const TimeEntryCell: React.FC<TimeEntryCellProps> = ({ value, onChange, viewMode, inlineEdit }) => {
    const [form] = Form.useForm();
    const [visible, setVisible] = useState(false);

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

    const initialValues = { hours: value?.hours || null, description: value?.description || null };
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
        onChange({ hours: values.hours || null, description: values.description || null });
        setVisible(false);
    };
    const cellContent = (
        (!value?.hours && !value?.description) 
        ? <Text type="secondary" style={{ fontStyle: 'italic', cursor: 'pointer' }}>Log</Text>
        : (
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
                <Form form={form} layout="vertical" onFinish={onFinish} initialValues={initialValues} style={{ width: 250 }}>
                    <Form.Item name="hours" label="Hours"><InputNumber min={0} max={24} step={0.5} style={{ width: '100%' }} /></Form.Item>
                    <Form.Item name="description" label="Description"><Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} /></Form.Item>
                    <Button type="primary" htmlType="submit" style={{ width: '100%' }}>Done</Button>
                </Form>
            }
            title="Log Time" trigger="click" open={visible} onOpenChange={handleOpenChange}
        >
            {cellContent}
        </Popover>
    );
};


// --- MAIN COMPONENT ---

const TimesheetProjects: React.FC<TimesheetProps> = ({ editItem, onFinish, viewMode = false }) => {
    
    // --- STATE ---
    const [settings, setSettings] = useState<TimesheetSettings>({
        type: editItem?.timesheet_type || CONFIG.DEFAULT_TYPE,
        workWeek: editItem?.work_week_type || CONFIG.DEFAULT_WORK_WEEK, 
        // [FIX] Default to Monday (weekday 1) for weekly.
        startDate: editItem?.timesheet_date 
            ? dayjs(editItem.timesheet_date) 
            : (
                CONFIG.DEFAULT_TYPE === 'Weekly' ? dayjs().weekday(1) :
                CONFIG.DEFAULT_TYPE === 'Monthly' ? dayjs().startOf('month') :
                dayjs().startOf('day')
            ),
    });
    const [allProjects, setAllProjects] = useState<any[]>([]);
    const [selectedProjects, setSelectedProjects] = useState<SelectedProject[]>([]);
    const [timesheetData, setTimesheetData] = useState<DateRow[]>([]);
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
                console.warn("RPC get_projects_for_user not found or failed, falling back to public.projects table.", error);
                const { data: tableData, error: tableError } = await supabase.schema('blueprint').from('projects').select('id, name');
                if (tableError) message.error('Failed to fetch projects.');
                else setAllProjects(tableData || []);
            }
        };
        fetchProjects();
    }, [user?.id]);


    // --- DATE ROW GENERATION ---
    const dynamicDates: DateInfo[] = useMemo(() => {
        const { startDate, type, workWeek } = settings;
        if (type === 'Daily') {
            return [{ key: startDate.format('YYYY-MM-DD'), label: startDate.format('ddd, MMM D'), fullDate: startDate }];
        }
        if (type === 'Monthly') {
            const daysInMonth = startDate.daysInMonth();
            const dates: DateInfo[] = [];
            for (let i = 1; i <= daysInMonth; i++) {
                const date = startDate.date(i);
                if (workWeek === '5-Day' && (date.day() === 0 || date.day() === 6)) continue;
                dates.push({ key: date.format('YYYY-MM-DD'), label: date.format('ddd, D'), fullDate: date });
            }
            return dates;
        }
        // [FIX] Weekly logic: Always start from Monday (weekday 1)
        const weekStart = startDate.weekday(1); // Ensures startDate is a Monday
        const days = workWeek === '5-Day' ? 5 : 7;
        // [FIX] Always start iterating from day 1 (Monday)
        const startDay = 1; 
        return Array.from({ length: days }, (_, i) => {
            // .day() is locale-aware, but weekday(1) sets to Monday regardless of locale.
            // .day(1 + i) will be Mon, Tue, Wed, Thu, Fri, Sat, Sun
            const date = weekStart.day(startDay + i);
            return { key: date.format('YYYY-MM-DD'), label: date.format('ddd, MMM D'), fullDate: date };
        });
    }, [settings.startDate, settings.type, settings.workWeek]);


    // --- DATA STRUCTURE & LOADING ---

    useEffect(() => {
        // [FIX] Check for existing data based on both key AND project content to avoid data loss
        const oldDataMap = new Map<string, DateRow>();
        timesheetData.forEach(row => oldDataMap.set(row.key, row));

        const newDataSource = dynamicDates.map(dateInfo => {
            const existingRow = oldDataMap.get(dateInfo.key);
            
            const newRow: DateRow = {
                key: dateInfo.key,
                dateLabel: dateInfo.label,
                total: 0,
            };

            selectedProjects.forEach(proj => {
                newRow[proj.id] = existingRow?.[proj.id] || null;
            });

            newRow.total = selectedProjects.reduce((sum, proj) => {
                const entry = newRow[proj.id] as TimesheetEntry;
                return sum + (entry?.hours || 0);
            }, 0);

            return newRow;
        });
        setTimesheetData(newDataSource);
    }, [dynamicDates, selectedProjects]);

    useEffect(() => {
        if (editItem?.timesheet_items && allProjects.length > 0) {
            setLoading(true);

            const projectIdsInTimesheet = [...new Set(editItem.timesheet_items.map((e: any) => e.project_id))] as string[];
            const projectsToSelect = allProjects.filter(p => projectIdsInTimesheet.includes(p.id));
            setSelectedProjects(projectsToSelect);

            const entryMap = new Map<string, Map<string, TimesheetEntry>>();
            editItem.timesheet_items.forEach((entry: any) => {
                const dateKey = dayjs(entry.entry_date).format('YYYY-MM-DD');
                if (!entryMap.has(dateKey)) {
                    entryMap.set(dateKey, new Map());
                }
                entryMap.get(dateKey)!.set(entry.project_id, {
                    hours: entry.hours_worked,
                    description: entry.description
                });
            });
            
            // [FIX] Use dynamicDates to build the initial data, not prevData
            const loadedData = dynamicDates.map(dateRow => {
                const newRow: DateRow = {
                    key: dateRow.key,
                    dateLabel: dateRow.label,
                    total: 0,
                };

                const entriesForDate = entryMap.get(dateRow.key);
                if (entriesForDate) {
                    entriesForDate.forEach((entry, projectId) => {
                        newRow[projectId] = entry;
                    });
                }
                
                newRow.total = projectsToSelect.reduce((sum, proj) => {
                    const entry = newRow[proj.id] as TimesheetEntry;
                    return sum + (entry?.hours || 0);
                }, 0);

                return newRow;
            });
            
            setTimesheetData(loadedData);
            setLoading(false);
        }
    }, [editItem, allProjects, dynamicDates]); // Added dynamicDates dependency


    // --- TOTALS CALCULATION ---
    useEffect(() => {
        const newGrandTotal = timesheetData.reduce((sum, row) => sum + row.total, 0);
        setGrandTotal(newGrandTotal);
    }, [timesheetData]);


    // --- EVENT HANDLERS ---
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

    const handleProjectSelectionChange = (selectedIds: string[]) => {
        const newSelectedProjects = allProjects.filter(p => selectedIds.includes(p.id));
        setSelectedProjects(newSelectedProjects);
    };

    const handleCellChange = (dateKey: string, projectId: string, newValue: TimesheetEntry) => {
        setTimesheetData(prevData => {
            const newData = [...prevData];
            const rowIndex = newData.findIndex(row => row.key === dateKey);
            if (rowIndex === -1) return prevData;

            const rowToUpdate = { ...newData[rowIndex] };
            rowToUpdate[projectId] = newValue;

            rowToUpdate.total = selectedProjects.reduce((sum, proj) => {
                const entry = rowToUpdate[proj.id] as TimesheetEntry;
                return sum + (entry?.hours || 0);
            }, 0);

            newData[rowIndex] = rowToUpdate;
            return newData;
        });
    };
    
    const handleSubmit = async (status: 'Draft' | 'Submitted') => {
        if (!user?.id) { message.error('User not authenticated'); return; }
        if (selectedProjects.length === 0) { message.error('Please select at least one project.'); return; }
        if (grandTotal === 0) { message.error('Cannot submit a timesheet with zero hours.'); return; }
        
        console.log(`Submitting timesheet (Projects view) with status: ${status}`);
        setLoading(true);

        try {
            const entriesToInsert: any[] = [];
            timesheetData.forEach(dateRow => {
                selectedProjects.forEach(proj => {
                    const entry = dateRow[proj.id] as TimesheetEntry;
                    if (entry && entry.hours && entry.hours > 0) {
                        entriesToInsert.push({
                            project_id: proj.id,
                            organization_id: (user as any).pref_organization_id || user.organization_id,
                            entry_date: dateRow.key,
                            hours_worked: entry.hours,
                            description: entry.description || null,
                            created_by: user.id,
                        });
                    }
                });
            });

            console.log('Entries to insert:', entriesToInsert);

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

            let sheetResult;
            if (editItem?.id) {
                console.log('Updating existing timesheet (Projects view):', editItem.id);
                sheetResult = await supabase
                    .schema('workforce')
                    .from('timesheets')
                    .update(timesheetPayload)
                    .eq('id', editItem.id)
                    .select()
                    .single();
            } else {
                console.log('Inserting new timesheet (Projects view)');
                sheetResult = await supabase
                    .schema('workforce')
                    .from('timesheets')
                    .insert(timesheetPayload)
                    .select()
                    .single();
            }

            const { data: sheetData, error: sheetError } = sheetResult;

            if (sheetError) {
                console.error('Supabase Timesheet Upsert Error:', sheetError);
                throw sheetError;
            }

            console.log('Supabase Timesheet Upsert Success:', sheetData);
            const timesheetId = sheetData.id;

            if (editItem?.id) {
                console.log('Deleting existing entries for timesheet:', timesheetId);
                const { error: deleteError } = await supabase.schema('workforce').from('timesheet_items').delete().eq('timesheet_id', timesheetId);
                if (deleteError) {
                    console.error('Supabase Entry Delete Error:', deleteError);
                    throw deleteError;
                }
            }

            if (entriesToInsert.length > 0) {
                console.log('Inserting entries for timesheet:', timesheetId);
                const finalEntries = entriesToInsert.map(e => ({ ...e, timesheet_id: timesheetId }));
                const { error: entriesError } = await supabase.schema('workforce').from('timesheet_items').insert(finalEntries);
                if (entriesError) {
                    console.error('Supabase Entry Insert Error:', entriesError);
                    throw entriesError;
                }
                console.log('Supabase Entry Insert Success');
            }

            message.success(`Timesheet ${status} successfully.`);
            onFinish?.();
        } catch (error: any) {
            console.error('Submission Error:', error);
            message.error(`Failed to ${status.toLowerCase()} timesheet: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };


    // --- TABLE COLUMNS (MEMOIZED) ---
    const columns = useMemo(() => {
        const dateColumn = {
            title: 'Date', dataIndex: 'dateLabel', fixed: "left" as const, width: 150,
            render: (label: string, record: DateRow) => {
                const day = dayjs(record.key).day();
                const isWeekend = day === 0 || day === 6;
                return <Text strong={isWeekend}>{label}</Text>;
            }
        };

        const projectColumns = selectedProjects.map(proj => ({
            title: proj.name, dataIndex: proj.id, key: proj.id,
            width: CONFIG.INLINE_EDIT ? 150 : 130,
            align: "left" as const,
            render: (entry: TimesheetEntry | null, record: DateRow) => (
                <TimeEntryCell
                    value={entry || undefined}
                    onChange={(newValue) => handleCellChange(record.key, proj.id, newValue)}
                    viewMode={viewMode}
                    inlineEdit={CONFIG.INLINE_EDIT}
                />
            ),
        }));

        const totalColumn = {
            title: 'Total', dataIndex: 'total', fixed: "right" as const, width: 80, align: "right" as const,
            render: (total: number) => <Text strong>{total?.toFixed(2) || "0.00"}</Text>,
        };

        return [dateColumn, ...projectColumns, totalColumn];
    }, [selectedProjects, viewMode, CONFIG.INLINE_EDIT, timesheetData]);


    // --- RENDER ---
    const datePickerType = settings.type.toLowerCase() as 'week' | 'month' | 'date';
    return (
        <>
            <style>{`.weekend-row { background-color: #fafafa; } .ant-table-cell { vertical-align: top; padding: 8px !important; }`}</style>
            
            {/* Settings Header */}
            {!viewMode && ( <Row justify="space-between" align="middle" style={{ marginBottom: 16 }} gutter={[16, 16]}> <Col> <Space wrap> <Radio.Group value={settings.type} onChange={(e) => handleSettingsChange('type', e.target.value)} buttonStyle="solid" disabled={loading}> <Radio.Button value="Daily">Daily</Radio.Button> <Radio.Button value="Weekly">Weekly</Radio.Button> <Radio.Button value="Monthly">Monthly</Radio.Button> </Radio.Group> {settings.type !== 'Daily' && (<Radio.Group value={settings.workWeek} onChange={(e) => handleSettingsChange('workWeek', e.target.value)} disabled={loading}> <Radio value="5-Day">5-Day Week</Radio> <Radio value="7-Day">7-Day Week</Radio> </Radio.Group>)} <DatePicker value={settings.startDate} onChange={(date) => handleSettingsChange('startDate', date || dayjs())} picker={datePickerType} allowClear={false} disabled={loading}/> </Space> </Col> </Row> )}
            
            {/* Project Selector & Submit */}
            <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
                <Col xs={24} sm={16} md={12}>
                    {viewMode ? (
                        <Title level={5}>
                            {settings.type} Timesheet: {settings.startDate.format(
                                settings.type === 'Weekly' ? 'wo, YYYY' : 
                                settings.type === 'Monthly' ? 'MMMM YYYY' : 'MMMM D, YYYY'
                            )}
                        </Title>
                    ) : (
                        <Select
                            mode="multiple"
                            placeholder="Select projects to show as columns..."
                            value={selectedProjects.map(p => p.id)}
                            onChange={handleProjectSelectionChange}
                            style={{ width: '100%' }}
                            loading={allProjects.length === 0}
                            allowClear
                        >
                            {allProjects.map(p => <Option key={p.id} value={p.id}>{p.name}</Option>)}
                        </Select>
                    )}
                </Col>
                <Col>
                    {!viewMode && (
                        <Space>
                            <Button onClick={() => handleSubmit('Draft')} disabled={loading} loading={loading}>Save Draft</Button>
                            <Button type="primary" onClick={() => handleSubmit('Submitted')} disabled={loading} loading={loading}>Submit</Button>
                        </Space>
                    )}
                </Col>
            </Row>

            {/* The Table */}
            <Table
                dataSource={timesheetData}
                columns={columns}
                pagination={false}
                bordered
                scroll={{ x: 'max-content' }}
                rowKey="key"
                loading={loading}
                rowClassName={(record) => {
                    const day = dayjs(record.key).day();
                    return (day === 0 || day === 6) ? 'weekend-row' : '';
                }}
                summary={() => (
                    <Table.Summary.Row style={{ background: '#fafafa' }}>
                        <Table.Summary.Cell index={0} align="left">
                            <Text strong>Total</Text>
                        </Table.Summary.Cell>
                        
                        {selectedProjects.map((proj, index) => (
                            <Table.Summary.Cell 
                                key={proj.id} 
                                index={index + 1} 
                                align="center"
                            >
                                <Text strong>
                                    {timesheetData.reduce((sum, row) => sum + ((row[proj.id] as TimesheetEntry)?.hours || 0), 0).toFixed(2)}
                                </Text>
                            </Table.Summary.Cell>
                        ))}

                        <Table.Summary.Cell index={-1} align="right">
                            <Text strong>{grandTotal.toFixed(2)}</Text>
                        </Table.Summary.Cell>
                    </Table.Summary.Row>
                )}
            />
        </>
    );
};

export default TimesheetProjects;




