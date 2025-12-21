import React, { useEffect, useState } from 'react';
import { Table, Input, Button, Typography, Select, message, Row, Col, InputNumber, DatePicker } from 'antd';
// NOTE: Assuming the new project has these imports/configs
import { supabase } from '@/lib/supabase'; // Updated path for supabase config
import { useAuthStore } from '@/lib/store'; // Updated path to get session/user
import dayjs from 'dayjs'
import { generateEmailData, sendEmail } from '@/components/common/email';
// NOTE: Assuming you will create/port these common utilities or replace them
// import { generateEmailData, sendEmail } from 'components/common/SendEmail'; 
// import { generateEmailData, sendEmail } from '@/utils/emailUtils'; // Placeholder for email utilities
import './timesheet.css'; // Keep or move this CSS

const { Option } = Select;

interface ExpensesheetProps {
    editItem?: any;
    onFinish: () => void; // Success callback to close the drawer
    viewMode?: boolean; // For viewing a submitted/approved sheet
}

// Utility function to generate the column key from the expense type name
const generateDataKey = (typeName: string) => typeName;

const Expensesheet: React.FC<ExpensesheetProps> = ({ editItem, onFinish, viewMode = false }) => {

    const [types, setTypes] = useState<any[]>();
    // Initialize with a single row if not in edit mode
    const [data, setData] = useState<any[]>(editItem?.details ? [] : [{ key: '1' }]); 
    const [projects, setProjects] = useState<any[]>();
    // Use the project_id from editItem if available, otherwise default to first project
    const [selectedProject, setSelectedProject] = useState<string | undefined>(editItem?.project_id); 
    const [users, setUsers] = useState<any[]>();
    const [total, setTotal] = useState<number>(editItem?.grand_total || 0)
    const [loading, setLoading] = useState(false);

    // Use the new store hook to get the session/user details
    const { user, organization } = useAuthStore();

    // Use the organization settings from the store
    const timesheet_settings = user?.organization?.timesheet_settings

    // --- Data Fetching Logic ---
    useEffect(() => {
        const fetchUsers = async () => {
            const { data, error } = await supabase.schema('identity').from('users').select('*').eq('organization_id', user?.pref_organization_id).eq('is_active', true);
            if (error) {
                console.error('Error fetching users:', error);
            } else {
                setUsers(data || []);
            }
        };
        fetchUsers();
    }, [user?.pref_organization_id]);

    const fetchProjects = async () => {
        // Attempt to call the RPC
        let data: any[] | null = null;
        let error: any = null;

        try {
            const rpcResult = await supabase.rpc('get_projects_with_allocation_v3', {
                userid: user?.id,
                include_leaves: false,
                include_non_project: true,
                include_allocation_tracking: false
            });
            data = rpcResult.data;
            error = rpcResult.error;

            if (error && error.code === 'PGRST202') { // Check for function not found error
                console.warn('RPC get_projects_with_allocation_v3 not found. Falling back to public.projects.');
                
                // Fallback: Fetch directly from public.projects
                const tableResult = await supabase.from('projects').select('id, name');
                data = tableResult.data;
                error = tableResult.error;
            }
        } catch (e) {
            console.error('Error during RPC call, attempting fallback:', e);
            // Fallback: Fetch directly from public.projects if the whole RPC call fails
            const tableResult = await supabase.from('projects').select('id, name');
            data = tableResult.data;
            error = tableResult.error;
        }

        if (error) {
            console.error('Error fetching projects (fallback):', error);
        } else {
            setProjects(data || []);
            if (!editItem && data && data.length > 0) {
                setSelectedProject(data[0]?.id); // Set default project only on NEW form
            }
        }
    };

    const getTypes = async () => {
        const { data: fetchedTypes, error } = await supabase.schema('workforce').from('expense_type').select('*')
            .eq('organization_id', user?.pref_organization_id).order('ui_order', { ascending: true })
        if (fetchedTypes) {
            console.log("dz",fetchedTypes);
            setTypes(fetchedTypes);

            // --- IMPORTANT: Data Normalization for Edit Mode ---
            // Normalize the editItem.details keys to match the generated dataKeys
            if (editItem?.details && fetchedTypes.length > 0) {
                const normalizedData = editItem.details.map((row: any) => {
                    const newRow: any = { ...row };
                    // For each expense type found, check if a value exists in the row
                    // If it does, and the key needs normalizing (e.g., if the stored key 
                    // is different from the generated one), move the value to the correct key.

                    // To be safe and address the potential issue with special characters in keys 
                    // (like 'misc(exc.vat)' in your example), we iterate over the *existing* // keys in the row and try to map them to the *expected* generated keys.
                    
                    const generatedKeysMap: Record<string, string> = fetchedTypes.reduce((acc, type) => {
                        acc[type.name] = generateDataKey(type.name);
                        return acc;
                    }, {});

                    // First, create a reverse map from the generated key back to the original database key
                    const reverseKeyMap: Record<string, string> = {};
                    for (const type of fetchedTypes) {
                        const generatedKey = generateDataKey(type.name);
                        // Check if the original row has a key that is similar to the generated one
                        // This is a heuristic and might need adjustment based on how keys are stored.
                        // Based on your example, the stored keys are NOT simply the generated ones.
                        // We must rely on the assumption that the *column title* (type.name) 
                        // is the source of truth, but the database *stored* keys are inconsistent 
                        // with the generateDataKey() logic.
                        
                        // We will rely on the fact that 'data' will be a mapping of the generated keys to their values.
                        // The existing row keys are the *old* keys. We need to find the correct *new* key for each.
                        // Since we don't know the full original type names, we will use a best-guess or
                        // a simple key-mapping if the `editItem.details` keys are stable database column names.
                        
                        // Let's assume the database keys in `editItem.details` are the stable ones 
                        // and we need to map them to the generated keys for the Ant Design Table.
                        // NOTE: If the type names exactly match the database column names *before* the 
                        // lowercase/replace, this logic is safer.

                        // Since we can't reliably reverse-engineer the original type name from the database 
                        // key like 'misc(exc.vat)', we'll stick to the core logic: the data *must* use 
                        // the generated key.

                        // New approach: Iterate over ALL row keys and try to map them to a generated key.
                        for (const key in row) {
                            if (Object.prototype.hasOwnProperty.call(row, key) && key !== 'key' && key !== 'date' && key !== 'description' && key !== 'total') {
                                // Find the type whose generated key is the closest match, or whose name matches the key.
                                const matchingType = fetchedTypes.find(type => generateDataKey(type.name) === key || type.name === key || generateDataKey(type.name) === generateDataKey(key));

                                if (matchingType) {
                                    const expectedGeneratedKey = generateDataKey(matchingType.name);
                                    if (key !== expectedGeneratedKey) {
                                        // Move value from old key to new generated key
                                        newRow[expectedGeneratedKey] = newRow[key];
                                        delete newRow[key]; // Clean up the old key
                                    }
                                } else {
                                    // This is the CRITICAL fix for keys like 'misc(exc.vat)'.
                                    // We need to check if the row key itself is a type name or a generated key for a type.
                                    const typeByRowKey = fetchedTypes.find(t => t.name === key || generateDataKey(t.name) === key);
                                    if (typeByRowKey) {
                                        const expectedKey = generateDataKey(typeByRowKey.name);
                                        if (key !== expectedKey) {
                                            newRow[expectedKey] = newRow[key];
                                            delete newRow[key];
                                        }
                                    } else {
                                        // The provided `editItem` has keys like "misc(exc.vat)" which are NOT
                                        // the generated keys. We must manually map them if they are constant.
                                        // Assuming your `expense_type` names are (for example): 
                                        // "Misc (exc. VAT)", "Accommodation (exc. VAT)", "Business Ent Client (exc. VAT)"
                                        // And the *generated keys* are:
                                        // "miscexc.vat", "accommodationexc.vat", "businessentclientexc.vat"
                                        
                                        // Let's stick to the generated key logic:
                                        // 'misc(exc.vat)' in the editItem is an *old* database column name.
                                        // 'miscexcvat' is the *new* generated key.
                                        // We need to map 'misc(exc.vat)' to 'miscexcvat' based on what the type name is.

                                        // Since we don't know the exact type name for 'misc(exc.vat)', 
                                        // we'll use a direct mapping for the *most likely* case.
                                        const typeForOldKey = fetchedTypes.find(t => t.name.toLowerCase().includes('misc') && t.name.toLowerCase().includes('vat'));
                                        if (typeForOldKey) {
                                            const correctKey = generateDataKey(typeForOldKey.name);
                                            if (row[key] !== undefined && correctKey !== key) {
                                                newRow[correctKey] = newRow[key];
                                                delete newRow[key];
                                            }
                                        }

                                    }
                                }
                            }
                        }
                    }

                    return newRow;
                });
                setData(normalizedData);
            }

        }
    }

    useEffect(() => {
        fetchProjects();
        getTypes()
    }, [user?.id, editItem]); // Added editItem to dependencies to run logic when it's present
    
    // Recalculate total when data or types change
    useEffect(() => {
        if (types) {
          getSummary(data, types);
        }
    }, [data, types]);


    const handleAddRow = () => {
        // Use current timestamp/random number for a better unique key
        const newRow = { key: Date.now().toString() }; 
        setData([...data, newRow]);
    };

    const handleInputChange = (rowIndex: number, field: string, value: any) => {
        const newData = [...data];
        
        // Enforce non-negative values for number inputs
        if (typeof value === 'number' && value < 0) {
          value = 0;
        }

        newData[rowIndex][field] = value;

        // Recalculate the total for the row
        const rowTotal = (types || []).reduce((sum, type) => {
            const key = generateDataKey(type.name);
            // Use Number.parseFloat for better decimal handling before .toFixed(2)
            return sum + (Number(Number.parseFloat(newData[rowIndex][key] || 0).toFixed(2)) || 0);
        }, 0);

        newData[rowIndex].total = rowTotal;
        setData(newData);
    };

    const handleDeleteRow = (rowIndex: number) => {
        const newData = [...data];
        newData.splice(rowIndex, 1);
        setData(newData);
    };

    const generateColumns = (types: any) => {
        // Static columns
        const staticColumns = [
            {
                title: 'Date',
                dataIndex: 'date',
                fixed: "left" as const, // Fixed left column
                render: (_: any, record: any, rowIndex: number) => (
                    <>
                        {!viewMode ? <DatePicker value={record?.date ? dayjs(record.date, 'YYYY-MM-DD') : null} format='YYYY-MM-DD' allowClear={false}
                            onChange={(_, dateString) => handleInputChange(rowIndex, 'date', dateString)} />
                            : <Typography.Text>{record?.date || "-"}</Typography.Text>}
                    </>
                ),
            },
            {
                title: 'Description',
                dataIndex: 'description',
                render: (_: any, record: any, rowIndex: number) => (
                    <>
                        {!viewMode ? <Input.TextArea value={record?.description} onChange={(e) => handleInputChange(rowIndex, 'description', e.target.value)} />
                            : <Typography.Text>{record?.description || "-"}</Typography.Text>}
                    </>
                ),
            },
        ];

        if (!Array.isArray(types)) return staticColumns;

        // Dynamic columns based on `types`
        const dynamicColumns = types.map((type) => {
            const dataKey = generateDataKey(type.name); // Using the util function here
            return {
                title: type.name,
                dataIndex: dataKey, // This is the key that must match the data object
                render: (_: any, record: any, rowIndex: number) => (
                    <>
                        {!viewMode ? <InputNumber
                            value={record[dataKey]}
                            // Added checks for negative values inside handleInputChange
                            onChange={(e) => handleInputChange(rowIndex, dataKey, e)}
                        />
                            : <Typography.Text>{record[dataKey] || "-"}</Typography.Text>}
                    </>
                ),
            }
        });

        const totalColumn = [
            {
                title: 'Total (GBP)',
                dataIndex: 'total',
                fixed: "right" as const,
                render: (_: any, record: any) =>
                    <Typography.Text>{record.total || "-"}</Typography.Text>
            },
            {
                title: '',
                fixed: "right" as const,
                width: 50,
                render: (_: any, __: any, rowIndex: number) => (
                    <>
                        {!viewMode ? <Button onClick={() => handleDeleteRow(rowIndex)} size="small" type="text" danger>X</Button>
                            : <></>}
                    </>
                ),
            },
        ];

        return [...staticColumns, ...dynamicColumns, ...totalColumn];
    };

    const columns = types && generateColumns(types);

    const handleSubmit = async (status: 'Draft' | 'Submitted') => {
        // Basic Validation
        if (!data || data.length === 0 || !total) {
            message.error(`Please add at least one item and ensure total is non-zero.`);
            return
        }
        if (!selectedProject) {
            message.error(`Please select a project.`);
            return
        }

        let emptyRow = false
        data.forEach((row, index) => {
            if (!row.date || !row.description) {
                message.error(`Row ${index + 1} has an empty Date or Description.`);
                emptyRow = true
            }
        });
        if (emptyRow) { return }

        if (!user?.id) {
            message.error('User is not authenticated.');
            return;
        }

        setLoading(true)
        
        const today = new Date();
        // Calculate last date for approval
        const approvalTimeLimit = timesheet_settings?.approvalWorkflow?.timeLimitForApproval || 0;
        const lastDate = new Date(today.setDate(today.getDate() + approvalTimeLimit));
        // Determine the approver ID
        const defaultApproverKey = timesheet_settings?.approvalWorkflow?.defaultApprover || 'manager';
        const approver_id = user?.id;
        const approverDetails = users?.find(u => u.id === approver_id);

        const expensesheetData = {
            user_id: user?.id,
            details: data,
            // status,
            stage_id:status,
            project_id: selectedProject,
            approver_id: status === 'Submitted' ? approver_id : null, // Only assign approver on submission
            last_date: status === 'Submitted' ? lastDate.toISOString() : null,
            submitted_time: status === 'Submitted' ? new Date().toISOString() : null,
            grand_total: total,
            organization_id: user?.pref_organization_id,
        };
        
        // Email data preparation (only if submitting)
        let emailPayload: any[] = [];
        if (status === 'Submitted') {
            const projectName = projects?.find(p => p.id === selectedProject)?.name || 'Unassigned Project';
            emailPayload = [generateEmailData("expenses claim", "Submitted", {
                username: user?.name,
                approverEmail: approverDetails?.details?.email,
                hrEmails: users?.filter(u => u.role_type === 'hr').map(u => u.details?.email),
                applicationDate: `for ${projectName} - ${new Date().toISOString().slice(0, 10)}`,
                submittedTime: new Date().toISOString().slice(0, 19).replace("T", " "),
            })];
        }

        // --- New Normalized Data Handling ---
        const processAndSubmit = async () => {
            const expenseSheetPayload = {
                id: editItem?.id, // Pass ID for update, or it will be undefined for insert
                user_id: user?.id,
                organization_id: user?.pref_organization_id,
                project_id: selectedProject,
                notes: ' ', // Add a notes field if you have one in the UI
                stage_id: status,
                submitted_time: status === 'Submitted' ? new Date().toISOString() : null,
                approver_id: status === 'Submitted' ? approver_id : null,
                last_date: status === 'Submitted' ? lastDate.toISOString() : null,
            };

            // 1. Insert or Update the main expense_sheet record
            const { data: sheetData, error: sheetError } = await supabase.schema('workforce')
                .from('expense_sheets')
                .upsert(expenseSheetPayload)
                .select()
                .single();

            if (sheetError) {
                throw new Error(`Failed to save expense sheet: ${sheetError.message}`);
            }

            const expenseSheetId = sheetData.id;

            // 2. If updating, first delete all existing items for this sheet
            if (editItem?.id) {
                const { error: deleteError } = await supabase.schema('workforce')
                    .from('expense_sheet_items')
                    .delete()
                    .eq('expense_sheet_id', expenseSheetId);

                if (deleteError) {
                    throw new Error(`Failed to update items: ${deleteError.message}`);
                }
            }

            // 3. Prepare and insert the new line items
            const itemsToInsert: any[] = [];
            data.forEach(row => {
                types?.forEach(type => {
                    const dataKey = generateDataKey(type.name);
                    const amount = parseFloat(row[dataKey]);

                    if (amount > 0) {
                        itemsToInsert.push({
                            expense_sheet_id: expenseSheetId,
                            organization_id: user?.pref_organization_id,
                            item_date: row.date,
                            expense_type_id: type.id,
                            description: row.description,
                            amount: amount,
                            created_by: user?.id,
                        });
                    }
                });
            });

            if (itemsToInsert.length > 0) {
                const { error: itemsError } = await supabase.schema('workforce')
                    .from('expense_sheet_items')
                    .insert(itemsToInsert);

                if (itemsError) {
                    throw new Error(`Failed to save expense details: ${itemsError.message}`);
                }
            }

            // The grand_total will be updated automatically by the database trigger.
        };

        try {
            await processAndSubmit();
            
            message.success(status === 'Draft' ? 'Expenses Claim Saved.' : 'Expenses Claim Submitted.');
            onFinish(); // Close drawer on success
        } catch (error: any) {
            console.error("Submission Error:", error);
            message.error(error.message || `Failed to ${status === 'Draft' ? 'save' : 'submit'} Expenses Claim`);
        } finally {
            setLoading(false);
        }
    };

    const getSummary = (currentData = data, expenseTypes = types) => {
        if (!expenseTypes) return null;

        const totals = expenseTypes.reduce((acc, type) => {
            const key = generateDataKey(type.name); // Using the util function here
            acc[key] = currentData.reduce((sum, row) => sum + (Number(row[key]) || 0), 0);
            return acc;
        }, {} as Record<string, number>);

        // Use Number.parseFloat before toFixed(2) to handle potential floating point issues
        const grandTotal = Object.values(totals).reduce((sum, val) => sum + (Number(Number.parseFloat(val.toString()).toFixed(2)) || 0), 0)
        setTotal(grandTotal)

        return (
            <Table.Summary.Row className="table-summary-row">
                <Table.Summary.Cell className="sticky-left">Total (GBP)</Table.Summary.Cell>
                <Table.Summary.Cell></Table.Summary.Cell> {/* For Description */}
                {expenseTypes.map((type) => {
                    const key = generateDataKey(type.name); // Using the util function here
                    return (<Table.Summary.Cell key={key}> {totals[key]?.toFixed(2)} </Table.Summary.Cell>);
                })}
                <Table.Summary.Cell className="sticky-right">
                    {grandTotal.toFixed(2)}
                </Table.Summary.Cell>
                <Table.Summary.Cell className="sticky-right" >{" "}</Table.Summary.Cell> {/* For Delete Button */}
            </Table.Summary.Row>
        );
    }

    // Hide action buttons if the claim is already submitted/approved/rejected
    const showActions = !viewMode && editItem?.status !== 'Submitted' && editItem?.status !== 'Approved' && editItem?.status !== 'Rejected';

    return (
        <>
            {showActions && <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
                <Col>
                    <Button onClick={handleAddRow} disabled={loading}>Add Row</Button>
                    <Select style={{ width: 200 }} className='ml-2' placeholder="Select a Project"
                        value={selectedProject} onChange={(project) => setSelectedProject(project)} disabled={loading || !projects} >
                        {projects?.map((option) => (
                            <Option key={option?.id} value={option?.id}>
                                {option.name}
                            </Option>
                        ))}
                    </Select>
                </Col>
                <Col>
                    <Button onClick={() => handleSubmit('Draft')} disabled={data.length === 0} loading={loading}>Save Draft</Button>
                    <Button type="primary" onClick={() => handleSubmit('Submitted')} className='ml-2' disabled={data.length === 0} loading={loading}>Submit</Button>
                </Col>
            </Row>}
            {viewMode && <Typography.Title level={5}>Project: {projects?.find(p => p.id === editItem?.project_id)?.name || 'N/A'}</Typography.Title>}
            <Table 
              dataSource={data} 
              columns={columns} 
              pagination={false} 
              summary={getSummary} 
              scroll={{ x: 'max-content' }} 
              rowKey="key"
            />
        </>
    );
};

export default Expensesheet;