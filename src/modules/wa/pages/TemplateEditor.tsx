import React, { useState, useEffect } from 'react';
import { Form, Input, Select, Button, Card, Space, Divider, Typography, Radio, Modal } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import type { GraphTemplate, GraphTemplateComponent } from '../services/whatsappTemplates';

const { Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface TemplateEditorProps {
    initialValues?: GraphTemplate;
    onSubmit: (values: GraphTemplate) => Promise<void>;
    isLoading?: boolean;
    onCancel?: () => void;
    isEditing?: boolean;
}

const TemplateEditor: React.FC<TemplateEditorProps> = ({ initialValues, onSubmit, isLoading, onCancel, isEditing = false }) => {
    const [form] = Form.useForm();
    const [headerType, setHeaderType] = useState<'NONE' | 'TEXT' | 'MEDIA'>('NONE');
    const [mediaType, setMediaType] = useState<'IMAGE' | 'VIDEO' | 'DOCUMENT'>('IMAGE');

    useEffect(() => {
        if (initialValues) {
            // Map GraphTemplate back to form values
            const header = initialValues.components.find(c => c.type === 'HEADER');
            const body = initialValues.components.find(c => c.type === 'BODY');
            const footer = initialValues.components.find(c => c.type === 'FOOTER');
            const buttons = initialValues.components.find(c => c.type === 'BUTTONS');

            if (header) {
                if (header.format === 'TEXT') {
                    setHeaderType('TEXT');
                } else if (header.format && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(header.format)) {
                    setHeaderType('MEDIA');
                    setMediaType(header.format as any);
                }
            } else {
                setHeaderType('NONE');
            }

            form.setFieldsValue({
                id: initialValues.id, // For update
                name: initialValues.name,
                category: initialValues.category,
                language: initialValues.language,
                headerText: header?.text,
                bodyText: body?.text,
                footerText: footer?.text,
                buttons: buttons?.buttons?.map((btn: any) => ({
                    type: btn.type,
                    text: btn.text,
                    phoneNumber: btn.phone_number,
                    url: btn.url
                })) || []
            });
        }
    }, [initialValues, form]);

    const handleFinish = (values: any) => {
        const components: GraphTemplateComponent[] = [];

        // Header
        if (headerType === 'TEXT' && values.headerText) {
            components.push({
                type: 'HEADER',
                format: 'TEXT',
                text: values.headerText
            });
        } else if (headerType === 'MEDIA') {
            components.push({
                type: 'HEADER',
                format: mediaType,
            });
        }

        // VALIDATION: Check for trailing or leading variables in body
        const bodyText = values.bodyText || '';
        if (/\{\{\d+\}\}[\s\.,!]*$/.test(bodyText) || /^[\s\.,!]*\{\{\d+\}\}/.test(bodyText)) {
            Modal.error({
                title: 'Validation Error',
                content: 'Variables cannot be at the very start or end of the message. Please add some text before/after the variable (e.g., "Hi {{1}}" instead of "{{1}}").'
            });
            return;
        }

        // VALIDATION: Check for emojis in buttons
        if (values.buttons && values.buttons.length > 0) {
            const hasEmoji = values.buttons.some((btn: any) =>
                /[\u{1F300}-\u{1F9FF}]/u.test(btn.text) || /[\u{2700}-\u{27BF}]/u.test(btn.text)
            );
            if (hasEmoji) {
                Modal.error({
                    title: 'Validation Error',
                    content: 'Button text cannot contain emojis. Please remove emojis from your buttons.'
                });
                return;
            }
        }

        // Body (Required)
        const bodyComponent: any = {
            type: 'BODY',
            text: values.bodyText
        };
        // Preserve example if it exists in initialValues
        const initialBody = initialValues?.components?.find(c => c.type === 'BODY');
        if (initialBody?.example) {
            bodyComponent.example = initialBody.example;
        }
        components.push(bodyComponent);

        // Footer
        if (values.footerText) {
            components.push({
                type: 'FOOTER',
                text: values.footerText
            });
        }

        // Buttons
        if (values.buttons && values.buttons.length > 0) {
            const buttons = values.buttons.map((btn: any) => ({
                type: btn.type,
                text: btn.text,
                ...(btn.type === 'PHONE_NUMBER' && { phone_number: btn.phoneNumber }),
                ...(btn.type === 'URL' && { url: btn.url })
            }));
            components.push({
                type: 'BUTTONS',
                buttons: buttons
            });
        }

        // Also preserve header example if media
        if (headerType === 'MEDIA') {
            const initialHeader = initialValues?.components?.find(c => c.type === 'HEADER');
            if (initialHeader?.example) {
                const headerComp = components.find(c => c.type === 'HEADER');
                if (headerComp) {
                    headerComp.example = initialHeader.example;
                }
            }
        }

        const templateData: GraphTemplate = {
            id: initialValues?.id, // Preserve ID if editing
            name: values.name,
            category: values.category,
            language: values.language,
            components
        };

        onSubmit(templateData);
    };

    return (
        <Form form={form} layout="vertical" onFinish={handleFinish} initialValues={{ category: 'UTILITY', language: 'en_US' }}>
            <Card title={isEditing ? "Edit Template" : "New Template"} size="small" style={{ marginBottom: 16 }}>
                <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Required' }, { pattern: /^[a-z0-9_]+$/, message: 'Lowercase and underscores only' }]}>
                    <Input placeholder="e.g. order_update_v2" disabled={isEditing} />
                    {/* Name cannot be changed on edit typically */}
                </Form.Item>
                <Space>
                    <Form.Item name="category" label="Category" rules={[{ required: true }]}>
                        <Select style={{ width: 150 }} disabled={isEditing}>
                            <Option value="UTILITY">Utility</Option>
                            <Option value="MARKETING">Marketing</Option>
                            <Option value="AUTHENTICATION">Authentication</Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="language" label="Language" rules={[{ required: true }]}>
                        <Select style={{ width: 150 }} disabled={isEditing}>
                            <Option value="en_US">English (US)</Option>
                            <Option value="hi_IN">Hindi</Option>
                        </Select>
                    </Form.Item>
                </Space>
                {isEditing && <Text type="secondary" style={{ display: 'block' }}>Note: Changing Name, Category or Language requires creating a new template.</Text>}
            </Card>

            <Card title="Components" size="small">
                {/* HEADERS */}
                <Divider orientation="left">Header <Text type="secondary">(Optional)</Text></Divider>
                <Radio.Group value={headerType} onChange={e => setHeaderType(e.target.value)} style={{ marginBottom: 16 }}>
                    <Radio.Button value="NONE">None</Radio.Button>
                    <Radio.Button value="TEXT">Text</Radio.Button>
                    <Radio.Button value="MEDIA">Media</Radio.Button>
                </Radio.Group>

                {headerType === 'TEXT' && (
                    <Form.Item name="headerText" label="Header Text" rules={[{ required: true, max: 60 }]}>
                        <Input placeholder="Header text..." showCount maxLength={60} />
                    </Form.Item>
                )}

                {headerType === 'MEDIA' && (
                    <Space direction="vertical" style={{ width: '100%' }}>
                        <Text>Media Type:</Text>
                        <Radio.Group value={mediaType} onChange={e => setMediaType(e.target.value)}>
                            <Radio value="IMAGE">Image</Radio>
                            <Radio value="VIDEO">Video</Radio>
                            <Radio value="DOCUMENT">Document</Radio>
                        </Radio.Group>
                    </Space>
                )}

                {/* BODY */}
                <Divider orientation="left">Body <Text type="danger">*</Text></Divider>
                <Form.Item name="bodyText" rules={[{ required: true, message: 'Body text is required' }]}>
                    <TextArea rows={4} placeholder="Hello {{1}}, we have received your order." showCount maxLength={1024} />
                </Form.Item>
                <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                    Use {'{{1}}'}, {'{{2}}'} etc. for variables.
                </Text>

                {/* FOOTER */}
                <Divider orientation="left">Footer <Text type="secondary">(Optional)</Text></Divider>
                <Form.Item name="footerText" rules={[{ max: 60 }]}>
                    <Input placeholder="Footer text..." showCount maxLength={60} />
                </Form.Item>

                {/* BUTTONS */}
                <Divider orientation="left">Buttons <Text type="secondary">(Optional)</Text></Divider>
                <Form.List name="buttons">
                    {(fields, { add, remove }) => (
                        <>
                            {fields.map(({ key, name, ...restField }) => (
                                <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                                    <Form.Item
                                        {...restField}
                                        name={[name, 'type']}
                                        rules={[{ required: true }]}
                                    >
                                        <Select style={{ width: 130 }} placeholder="Type">
                                            <Option value="QUICK_REPLY">Quick Reply</Option>
                                            <Option value="PHONE_NUMBER">Phone Number</Option>
                                            <Option value="URL">URL</Option>
                                        </Select>
                                    </Form.Item>
                                    <Form.Item
                                        {...restField}
                                        name={[name, 'text']}
                                        rules={[{ required: true, message: 'Required' }]}
                                    >
                                        <Input placeholder="Button Text" />
                                    </Form.Item>
                                    <DeleteOutlined onClick={() => remove(name)} />
                                </Space>
                            ))}
                            <Form.Item>
                                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                                    Add Button
                                </Button>
                            </Form.Item>
                        </>
                    )}
                </Form.List>
            </Card>

            <div style={{ marginTop: 24, textAlign: 'right' }}>
                <Space>
                    <Button onClick={onCancel}>Cancel</Button>
                    <Button type="primary" htmlType="submit" loading={isLoading}>
                        {isEditing ? "Update Template" : "Submit Template"}
                    </Button>
                </Space>
            </div>
        </Form>
    );
};

export default TemplateEditor;
