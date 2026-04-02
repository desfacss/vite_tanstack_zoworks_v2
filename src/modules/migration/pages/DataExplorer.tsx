import React, { useState, useEffect } from 'react';
import { Button, Modal, Form, Select, Table, Space, Card, message, Input, Tooltip } from 'antd';
import dayjs from 'dayjs';
import { supabase } from '@/core/lib/supabase';
import { useAuthStore } from '@/core/lib/store';

const DataExplorer: React.FC = () => {
  // Your provided schema and table data in the desired format
  const allTablesBySchema: { [key: string]: string[] } = {
    "core": ["entities","view_configs", "audit_logs", "entity_versions", "modules","user_dashboards"],
    // "cron": ["job", "job_run_details"],
    "external": ["accounts", "contacts", "contract_assets", "contract_offerings", "contracts", "customers", "deals", "leads", "service_assets", "user_account_assignments"],
    "identity": ["organizations", "roles", "teams", "user_roles", "user_teams", "users"],
    "net": ["_http_response", "http_request_queue"],
    "organization": ["asset_categories", "bundle_items", "enums", "locations", "module_configs", "offering_bundles", "offering_categories", "offering_variants", "offerings", "resource_availability", "resource_properties", "resource_skills", "resource_types", "resources", "service_offerings", "service_types", "skills", "specifications", "tasks", "tasks1", "user_availability", "user_skills"],
    // "pgsodium": ["key"],
    "public": ["allocations", "app_config", "channel_post_messages", "channel_posts", "channels", "cli_client_contacts", "cli_clients", "core_calculated_insights", "dashboards", "debug_log", "doc_customer_review", "doc_forms", "doc_invoices", "doc_service_reports", "doc_templates", "document_shares", "documents", "dynamic_workflow_definitions", "dynamic_workflow_instances", "email_templates", "ent_activities", "ent_attachments", "forms", "leads", "leave_applications", "leave_apps", "leave_type", "leaves", "llm_prompt_templates", "loc_agent_locations", "loc_agent_summary", "locations", "messages", "module_configs", "modules", "notifications", "organizations", "prj_allocations", "projects", "projects_leaves", "rls_test", "roles", "roles_duplicate", "sr_assets", "sr_assets_duplicate", "sr_categories", "sr_contract_assets", "sr_contract_offerings", "sr_contracts", "sr_offerings", "sr_offerings_duplicate", "sr_service_types", "subscriptions", "system_status_categories","tickets", "y_view_config","z_view_config"]
  };

  const schemaOptions = Object.keys(allTablesBySchema).map(schema => ({
    label: schema,
    value: schema,
  }));

  const [selectedSchema, setSelectedSchema] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableOptions, setTableOptions] = useState<any[]>([]); 
  const [groupBy, setGroupBy] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [cellEditModalVisible, setCellEditModalVisible] = useState(false);
  const [tableData, setTableData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [jsonColumns, setJsonColumns] = useState<string[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [searchText, setSearchText] = useState('');
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [importJson, setImportJson] = useState('');
  const [cellEditData, setCellEditData] = useState<{
    rowId: any;
    dataIndex: string;
    value: any;
  } | null>(null);
  const [form] = Form.useForm();
  const [importForm] = Form.useForm();
  const [cellEditForm] = Form.useForm();
  const { user } = useAuthStore();
  const [organizationOptions, setOrganizationOptions] = useState<any[]>([]);
  const [locationOptions, setLocationOptions] = useState<any[]>([]);

  useEffect(() => {
    if (selectedSchema) {
      const tablesForSchema = allTablesBySchema[selectedSchema] || [];
      setTableOptions(tablesForSchema.map(table => ({ label: table, value: table })));
      setSelectedTable(null);
      setTableData([]); 
      setFilteredData([]);
      setColumns([]);
      setJsonColumns([]);
    } else {
      setTableOptions([]);
    }
  }, [selectedSchema]);

  useEffect(() => {
    if (!selectedSchema || !selectedTable) return;

    const fetchTableData = async () => {
      try {
        const { data, error } = await supabase.schema(selectedSchema as any).from(selectedTable).select('*');
        if (error) throw error;
        setTableData(data || []);
        setFilteredData(data || []);
        if (data && data.length > 0) {
          const cols = Object.keys(data[0]);
          setColumns(cols);
          const jsonCols = cols.filter((col) =>
            data.some((row) => row[col] && typeof row[col] === 'object' && row[col] !== null)
          );
          setJsonColumns(jsonCols);
        } else {
          setColumns([]);
          setJsonColumns([]);
        }
      } catch (error: any) {
        message.error(`Failed to fetch data for table ${selectedSchema}.${selectedTable}: ${error.message}`);
      }
    };
    fetchTableData();
  }, [selectedSchema, selectedTable]);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const { data: orgData, error: orgError } = await supabase
          .schema('identity')
          .from('organizations')
          .select('id, name');
        if (orgError) throw orgError;
        setOrganizationOptions(
          orgData.map((org: any) => ({ value: org.id, label: org.name || org.id }))
        );

        const { data: locData, error: locError } = await supabase
          .schema('identity')
          .from('locations')
          .select('id, name');
        if (locError) throw locError;
        setLocationOptions(
          locData.map((loc: any) => ({ value: loc.id, label: loc.name || loc.id }))
        );
      } catch (error: any) {
        message.error(`Failed to fetch options: ${error.message}`);
      }
    };
    fetchOptions();
  }, []);

  const handleAddClick = () => {
    if (!selectedSchema || !selectedTable) {
      message.warning('Please select a schema and table first');
      return;
    }
    if (selectedRowKeys.length === 0) {
      message.warning('Please select at least one row');
      return;
    }
    setModalVisible(true);
  };

  const handleDeleteClick = () => {
    if (!selectedSchema || !selectedTable) {
      message.warning('Please select a schema and table first');
      return;
    }
    if (selectedRowKeys.length === 0) {
      message.warning('Please select at least one row to delete');
      return;
    }

    Modal.confirm({
      title: 'Confirm Delete',
      content: `Are you sure you want to delete ${selectedRowKeys.length} row(s)?`,
      onOk: async () => {
        try {
          const selectedRows = tableData.filter((row) =>
            selectedRowKeys.includes(row.id || row.uuid || row[Object.keys(row)[0]])
          );
          const { error } = await supabase
            .schema(selectedSchema as any)
            .from(selectedTable)
            .delete()
            .in(
              'id',
              selectedRows.map((row) => row.id || row.uuid || row[Object.keys(row)[0]])
            );
          if (error) throw error;
          const { data } = await supabase.schema(selectedSchema as any).from(selectedTable).select('*');
          setTableData(data || []);
          setSelectedRowKeys([]);
          message.success('Rows deleted successfully');
        } catch (error: any) {
          message.error(`Failed to delete rows: ${error.message}`);
        }
      },
    });
  };

  const handleCopyClick = () => {
    if (!selectedSchema || !selectedTable) {
      message.warning('Please select a schema and table first');
      return;
    }
    if (selectedRowKeys.length === 0) {
      message.warning('Please select at least one row to copy');
      return;
    }
    try {
      const selectedRows = tableData.filter((row) =>
        selectedRowKeys.includes(row.id || row.uuid || row[Object.keys(row)[0]])
      );
      const jsonString = JSON.stringify(selectedRows, null, 2);
      navigator.clipboard.writeText(jsonString).then(() => {
        message.success('Rows copied to clipboard');
      }).catch(() => {
        message.error('Failed to copy rows to clipboard');
      });
    } catch (error: any) {
      message.error(`Failed to process rows for copying: ${error.message}`);
    }
  };

  const onFinish = async (values: any) => {
    const hasEmptyValues = values.columns?.some(
      (col: { name: string; value: any }) => col.value === '' || col.value === undefined
    );
    if (hasEmptyValues) {
      Modal.confirm({
        title: 'Empty Column Values',
        content: 'Some column values are empty. Do you want to save them as null?',
        onOk: async () => await saveRows(values),
      });
    } else {
      await saveRows(values);
    }
  };

  const saveRows = async (values: any) => {
    try {
      const selectedRows = tableData.filter((row) =>
        selectedRowKeys.includes(row.id || row.uuid || row[Object.keys(row)[0]])
      );
      const newRows = selectedRows.map((row) => {
        const newRow = { ...row };
        delete newRow.id; 
        if (newRow.created_at !== undefined) newRow.created_at = dayjs().toISOString();
        if (newRow.updated_at !== undefined) newRow.updated_at = null;
        if (newRow.created_by !== undefined) newRow.created_by = user?.id || null;
        if (newRow.updated_by !== undefined) newRow.updated_by = null;
        values.columns?.forEach((col: { name: string; value: any }) => {
          if (columns.includes(col.name)) {
            newRow[col.name] = col.value === '' ? null : col.value;
          }
        });
        return newRow;
      });
      const { error } = await supabase.schema(selectedSchema as any).from(selectedTable!).insert(newRows);
      if (error) throw error;
      const { data } = await supabase.schema(selectedSchema as any).from(selectedTable!).select('*');
      setTableData(data || []);
      message.success('Rows duplicated successfully');
      setModalVisible(false);
      form.resetFields();
      setSelectedRowKeys([]);
    } catch (error: any) {
      message.error(`Failed to duplicate rows: ${error.message}`);
    }
  };

  useEffect(() => {
    let filtered = [...tableData];
    if (searchText) {
      filtered = filtered.filter((row) =>
        Object.values(row).some((value) =>
          value?.toString().toLowerCase().includes(searchText.toLowerCase())
        )
      );
    }
    if (selectedOrgId) {
      filtered = filtered.filter((row) => row.organization_id === selectedOrgId);
    }
    setFilteredData(filtered);
  }, [searchText, selectedOrgId, tableData]);

  const handleImportSubmit = async () => {
    if (!selectedSchema || !selectedTable) {
      message.warning('Please select a schema and table first');
      return;
    }
    try {
      const jsonData = JSON.parse(importJson);
      const newRows = Array.isArray(jsonData) ? jsonData : [jsonData];
      const preparedRows = newRows.map((row: any) => {
        const newRow = { ...row };
        delete newRow.id; 
        if (newRow.created_at !== undefined) newRow.created_at = dayjs().toISOString();
        if (newRow.updated_at !== undefined) newRow.updated_at = dayjs().toISOString();
        if (newRow.created_by !== undefined) newRow.created_by = user?.id || null;
        if (newRow.updated_by !== undefined) newRow.updated_by = user?.id || null;
        return newRow;
      });
      const { error } = await supabase.schema(selectedSchema as any).from(selectedTable).insert(preparedRows);
      if (error) throw error;
      const { data } = await supabase.schema(selectedSchema as any).from(selectedTable).select('*');
      setTableData(data || []);
      setFilteredData(data || []);
      setImportModalVisible(false);
      setImportJson('');
      importForm.resetFields();
      message.success('Data imported successfully');
    } catch (error: any) {
      message.error(`Failed to import data: ${error.message}`);
    }
  };

  const handleCellEditSubmit = async (values: { value: any }) => {
    if (!cellEditData || !selectedSchema || !selectedTable) return;
    try {
      const { rowId, dataIndex } = cellEditData;
      const { error } = await supabase
        .schema(selectedSchema as any)
        .from(selectedTable)
        .update({
          [dataIndex]: values.value === '' ? null : values.value,
          updated_at: dayjs().toISOString(),
          updated_by: user?.id || null,
        })
        .eq('id', rowId); 
      if (error) throw error;
      const { data } = await supabase.schema(selectedSchema as any).from(selectedTable).select('*');
      setTableData(data || []);
      setFilteredData(data || []);
      message.success('Cell updated successfully');
      setCellEditModalVisible(false);
      setCellEditData(null);
      cellEditForm.resetFields();
    } catch (error: any) {
      message.error(`Failed to update cell: ${error.message}`);
    }
  };

  const handleCellDoubleClick = (rowId: any, dataIndex: string, value: any) => {
    setCellEditData({ rowId, dataIndex, value });
    cellEditForm.setFieldsValue({ value });
    setCellEditModalVisible(true);
  };

  const groupedData = groupBy
    ? filteredData.reduce((acc, row) => {
      const key = row[groupBy] || 'Ungrouped';
      acc[key] = acc[key] || [];
      acc[key].push(row);
      return acc;
    }, {} as { [key: string]: any[] })
    : { All: filteredData };

  const sortedColumns = columns
    .filter((col) => !jsonColumns.includes(col))
    .sort((a, b) => {
      const aLower = a.toLowerCase();
      const bLower = b.toLowerCase();
      if (aLower === 'name') return -1;
      if (bLower === 'name') return 1;
      const aHasName = aLower.includes('name');
      const bHasName = bLower.includes('name');
      if (aHasName && !bHasName) return -1;
      if (!aHasName && bHasName) return 1;
      return aLower.localeCompare(bLower);
    });

  const tableColumns = sortedColumns.map((col) => ({
    title: (
      <Tooltip title={col.length > 10 ? col : ''}>
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px', display: 'inline-block' }}>
          {col}
        </span>
      </Tooltip>
    ),
    dataIndex: col,
    key: col,
    width: 150,
    render: (value: any, record: any) => {
      if ((col.includes('id') || ['created_by', 'updated_by'].includes(col)) && col !== 'organization_id' && col !== 'location_id') {
        return (
          <Tooltip title={value}>
            <span
              style={{ cursor: 'pointer' }}
              onDoubleClick={() => handleCellDoubleClick(record.id || record.uuid || record[Object.keys(record)[0]], col, value)}
            >
              {value?.slice(0, 5)}
            </span>
          </Tooltip>
        );
      }
      if (['created_at', 'updated_at'].includes(col) && typeof value === 'string') {
        return (
          <span
            style={{ cursor: 'pointer' }}
            onDoubleClick={() => handleCellDoubleClick(record.id || record.uuid || record[Object.keys(record)[0]], col, value)}
          >
            {value?.split('.')[0]}
          </span>
        );
      }
      if (col === 'organization_id') {
        const option = organizationOptions.find((opt) => opt.value === value);
        return (
          <Tooltip title={value}>
            <span
              style={{ cursor: 'pointer' }}
              onDoubleClick={() => handleCellDoubleClick(record.id || record.uuid || record[Object.keys(record)[0]], col, value)}
            >
              {option ? option.label : value || '-'}
            </span>
          </Tooltip>
        );
      }
      if (col === 'location_id') {
        const option = locationOptions.find((opt) => opt.value === value);
        return (
          <Tooltip title={value}>
            <span
              style={{ cursor: 'pointer' }}
              onDoubleClick={() => handleCellDoubleClick(record.id || record.uuid || record[Object.keys(record)[0]], col, value)}
            >
              {option ? option.label : value || '-'}
            </span>
          </Tooltip>
        );
      }
      return (
        <span
          style={{ cursor: 'pointer' }}
          onDoubleClick={() => handleCellDoubleClick(record.id || record.uuid || record[Object.keys(record)[0]], col, value)}
        >
          {value ?? '-'}
        </span>
      );
    },
  }));

  const groupByColumns = columns
    .filter((col) => !['id', 'created_at', 'updated_at'].includes(col.toLowerCase()) && !jsonColumns.includes(col))
    .sort((a, b) => {
      const aLower = a.toLowerCase();
      const bLower = b.toLowerCase();
      if (aLower === 'name') return -1;
      if (bLower === 'name') return 1;
      const aHasName = aLower.includes('name');
      const bHasName = bLower.includes('name');
      if (aHasName && !bHasName) return -1;
      if (!aHasName && bHasName) return 1;
      return aLower.localeCompare(bLower);
    });

  const editableColumns = columns
    .filter((col) => !['id', 'created_at', 'updated_at', 'created_by', 'updated_by'].includes(col.toLowerCase()) && !jsonColumns.includes(col))
    .sort((a, b) => {
      const aLower = a.toLowerCase();
      const bLower = b.toLowerCase();
      if (aLower === 'name') return -1;
      if (bLower === 'name') return 1;
      const aHasName = aLower.includes('name');
      const bHasName = bLower.includes('name');
      if (aHasName && !bHasName) return -1;
      if (!aHasName && bHasName) return 1;
      return aLower.localeCompare(bLower);
    });

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys),
  };

  return (
    <Card
      style={{ width: '100%', height: 'calc(100vh - 100px)', margin: 0, display: 'flex', flexDirection: 'column' }}
      styles={{ body: { flex: 1, overflow: 'auto' } }}
    >
      <Space direction="vertical" style={{ width: '100%', height: '100%' }}>
        <Space wrap style={{ padding: '8px' }}>
          <Select
            showSearch
            placeholder="Select Schema"
            style={{ width: 200 }}
            onChange={(value) => {
              setSelectedSchema(value);
              setSelectedTable(null);
            }}
            options={schemaOptions}
            value={selectedSchema}
          />
          <Select
            showSearch
            placeholder="Select Table"
            style={{ width: 200 }}
            onChange={setSelectedTable}
            options={tableOptions}
            value={selectedTable}
            disabled={!selectedSchema}
          />
          <Select
            placeholder="Group By"
            style={{ width: 200 }}
            allowClear
            onChange={setGroupBy}
            options={groupByColumns.map((col) => ({ label: col, value: col }))}
          />
          <Input.Search
            placeholder="Search table data"
            style={{ width: 200 }}
            onChange={(e) => setSearchText(e.target.value)}
            value={searchText}
            allowClear
          />
          <Select
            placeholder="Filter by Organization"
            style={{ width: 200 }}
            allowClear
            onChange={setSelectedOrgId}
            options={organizationOptions}
            showSearch
            optionFilterProp="label"
          />
          {selectedRowKeys?.length > 0 ? (
            <div>
              <Button type="primary" onClick={handleAddClick} className='mr-2'>Clone</Button>
              <Button onClick={handleCopyClick} className='mr-2'>Copy JSON</Button>
              <Button danger onClick={handleDeleteClick}>Delete</Button>
            </div>
          ) :
            <Button onClick={() => setImportModalVisible(true)}>Import JSON</Button>
          }
        </Space>

        <div style={{ flex: 1, overflow: 'auto' }}>
          {Object.entries(groupedData).map(([group, rows]) => (
            <div key={group}>
              {groupBy && (
                <h3 style={{ padding: '4px 8px', fontSize: '14px' }}>
                  {groupBy === 'organization_id'
                    ? organizationOptions?.find((opt) => opt?.value === group)?.label
                    : groupBy === 'location_id'
                      ? locationOptions?.find((opt) => opt?.value === group)?.label
                      : group || '-'}
                </h3>
              )}
              <Table
                rowKey={(record) => record.id || record.uuid || record[Object.keys(record)[0]] || Math.random().toString()}
                columns={tableColumns}
                dataSource={rows}
                rowSelection={rowSelection}
                pagination={false}
                scroll={{ x: 'max-content', y: 'calc(100vh - 350px)' }}
                style={{ width: '100%' }}
                size="small"
              />
            </div>
          ))}
        </div>
      </Space>

      <Modal
        title="Edit and Duplicate Rows"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
      >
        <Form form={form} onFinish={onFinish} layout="vertical">
          <Form.List name="columns">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                    <Form.Item
                      {...restField}
                      name={[name, 'name']}
                      rules={[{ required: true, message: 'Missing column name' }]}
                    >
                      <Select
                        placeholder="Select Column"
                        style={{ width: 200 }}
                        options={editableColumns.map((col) => ({ label: col, value: col }))}
                      />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'value']}
                      rules={[{ required: false }]}
                    >
                      {form.getFieldValue(['columns', name, 'name']) === 'organization_id' ? (
                        <Select
                          placeholder="Select Organization"
                          style={{ width: 200 }}
                          options={organizationOptions}
                          showSearch
                          optionFilterProp="label"
                        />
                      ) : form.getFieldValue(['columns', name, 'name']) === 'location_id' ? (
                        <Select
                          placeholder="Select Location"
                          style={{ width: 200 }}
                          options={locationOptions}
                          showSearch
                          optionFilterProp="label"
                        />
                      ) : (
                        <Input placeholder="Enter value" />
                      )}
                    </Form.Item>
                    <Button onClick={() => remove(name)}>Remove</Button>
                  </Space>
                ))}
                <Form.Item>
                  <Button type="dashed" onClick={() => add()} block>
                    Add Column
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>
          <Form.Item>
            <Button type="primary" htmlType="submit">
              Save
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Import JSON Data"
        open={importModalVisible}
        onCancel={() => {
          setImportModalVisible(false);
          setImportJson('');
          importForm.resetFields();
        }}
        footer={[
          <Button key="cancel" onClick={() => setImportModalVisible(false)}>Cancel</Button>,
          <Button key="submit" type="primary" onClick={handleImportSubmit}>Import</Button>,
        ]}
      >
        <Form form={importForm} layout="vertical">
          <Form.Item
            name="jsonData"
            label="Paste JSON Data"
            rules={[{ required: true, message: 'Please paste valid JSON data' }]}
          >
            <Input.TextArea
              rows={10}
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
              placeholder='Paste JSON here (e.g., [{"column1": "value1", "column2": "value2"}, ...])'
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`Edit Cell: ${cellEditData?.dataIndex}`}
        open={cellEditModalVisible}
        onCancel={() => {
          setCellEditModalVisible(false);
          setCellEditData(null);
          cellEditForm.resetFields();
        }}
        footer={null}
      >
        <Form form={cellEditForm} onFinish={handleCellEditSubmit} layout="vertical">
          <Form.Item
            name="value"
            label="Value"
            rules={[{ required: false }]}
          >
            {cellEditData?.dataIndex === 'organization_id' ? (
              <Select
                placeholder="Select Organization"
                style={{ width: '100%' }}
                options={organizationOptions}
                showSearch
                optionFilterProp="label"
              />
            ) : cellEditData?.dataIndex === 'location_id' ? (
              <Select
                placeholder="Select Location"
                style={{ width: '100%' }}
                options={locationOptions}
                showSearch
                optionFilterProp="label"
              />
            ) : (
              <Input placeholder="Enter value" />
            )}
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Save
              </Button>
              <Button
                onClick={() => {
                  setCellEditModalVisible(false);
                  setCellEditData(null);
                  cellEditForm.resetFields();
                }}
              >
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default DataExplorer;
