import React, { useState, useEffect } from 'react';
import { Table, Button, Input, Select, Space, Row, Col } from 'antd';
import { PlusOutlined, DeleteOutlined, UpOutlined, DownOutlined } from '@ant-design/icons';

const { Option } = Select;

const transformSchemaToFields = (schema) => {
    console.log("sc", schema)
    if (!schema || !schema.properties) return [];
    return Object.entries(schema.properties).map(([fieldName, fieldData], index) => ({
        sequence: index + 1,
        field_name: fieldName,
        field_type: fieldData.type || 'string',
    }));
};

const CrudTableConfig = ({ jsonSchema, onSave }) => {
    const [data, setData] = useState([]);

    useEffect(() => {
        if (jsonSchema) {
            const transformedData = transformSchemaToFields(jsonSchema);
            setData(transformedData);
        }
    }, [jsonSchema]);

    const handleAddField = () => {
        setData([
            ...data,
            { field_type: 'string', field_name: '', sequence: data?.length + 1 },
        ]);
    };

    const handleFieldChange = (index, key, value) => {
        const updatedData = [...data];
        updatedData[index][key] = value;
        setData(updatedData);
    };

    const handleRemoveField = (index) => {
        const updatedData = data?.filter((_, i) => i !== index);
        setData(updatedData.map((item, i) => ({ ...item, sequence: i + 1 })));
    };

    const moveField = (index, direction) => {
        const newData = [...data];
        const [movedField] = newData.splice(index, 1);
        newData.splice(index + direction, 0, movedField);
        setData(newData.map((item, i) => ({ ...item, sequence: i + 1 })));
    };

    const handleSaveConfig = () => {
        onSave(data);
        console.log('payload', data);
    };

    const columns = [
        {
            title: 'Sequence',
            dataIndex: 'sequence',
            key: 'sequence',
        },
        {
            title: 'Field Type',
            dataIndex: 'field_type',
            key: 'field_type',
            render: (text, record, index) => (
                <Select
                    value={record.field_type}
                    onChange={(value) => handleFieldChange(index, 'field_type', value)}
                    style={{ width: '100%' }}
                >
                    <Option value="numeric">Numeric</Option>
                    <Option value="boolean">Boolean</Option>
                    <Option value="string">String</Option>
                </Select>
            ),
        },
        {
            title: 'Field Name',
            dataIndex: 'field_name',
            key: 'field_name',
            render: (text, record, index) => (
                <Input
                    value={record.field_name}
                    onChange={(e) => handleFieldChange(index, 'field_name', e.target.value)}
                />
            ),
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, __, index) => (
                <Space>
                    <Button
                        icon={<UpOutlined />}
                        onClick={() => moveField(index, -1)}
                        disabled={index === 0}
                    />
                    <Button
                        icon={<DownOutlined />}
                        onClick={() => moveField(index, 1)}
                        disabled={index === data?.length - 1}
                    />
                    <Button
                        icon={<DeleteOutlined />}
                        danger
                        onClick={() => handleRemoveField(index)}
                    />
                </Space>
            ),
        },
    ];

    return (
        <div>
            <h2>CRUD Table Configuration</h2>
            {data && (
                <Table
                    dataSource={data}
                    columns={columns}
                    rowKey="sequence"
                    pagination={false}
                    style={{ marginBottom: '20px' }}
                />
            )}

            <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={handleAddField}
                style={{ marginBottom: '20px' }}
            >
                Add Field
            </Button>

            <Row justify="end">
                <Col>
                    <Button type="primary" onClick={handleSaveConfig}>
                        Save Configuration
                    </Button>
                </Col>
            </Row>
        </div>
    );
};

export default CrudTableConfig;
