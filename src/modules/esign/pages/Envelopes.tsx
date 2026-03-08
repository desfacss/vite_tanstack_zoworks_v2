import React from 'react';
import { Button, Table, Tag, Space, Card } from 'antd';
import { Plus, Send, FileCheck, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Envelopes() {
    const navigate = useNavigate();

    const columns = [
        { title: 'Title', dataIndex: 'title', key: 'title' },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => (
                <Tag color={status === 'completed' ? 'success' : 'processing'}>
                    {status.toUpperCase()}
                </Tag>
            )
        },
        { title: 'Recipients', dataIndex: 'recipientCount', key: 'recipientCount' },
        { title: 'Sent At', dataIndex: 'sentAt', key: 'sentAt' },
        {
            title: 'Action',
            key: 'action',
            render: (_: any, record: any) => (
                <Space size="middle">
                    <Button type="link">View</Button>
                    <Button type="link">Resend</Button>
                </Space>
            ),
        },
    ];

    const data = [
        {
            key: '1',
            title: 'Service Agreement - Acme Corp',
            status: 'sent',
            recipientCount: 2,
            sentAt: '2026-03-07 10:00',
        },
        {
            key: '2',
            title: 'NDA - Tech Startups Inc',
            status: 'completed',
            recipientCount: 1,
            sentAt: '2026-03-06 15:30',
        },
    ];

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold">E-Sign Envelopes</h1>
                    <p className="text-gray-400">Manage and track your document signing workflows</p>
                </div>
                <Button
                    type="primary"
                    size="large"
                    icon={<Plus size={18} />}
                    onClick={() => navigate('/esign/create')}
                    className="rounded-lg h-touch shadow-ai"
                >
                    New Envelope
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card className="rounded-2xl border-none shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-50 rounded-xl text-blue-500">
                            <Send size={24} />
                        </div>
                        <div>
                            <div className="text-2xl font-bold">12</div>
                            <div className="text-gray-400 text-sm">Sent Envelopes</div>
                        </div>
                    </div>
                </Card>
                <Card className="rounded-2xl border-none shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-50 rounded-xl text-green-500">
                            <FileCheck size={24} />
                        </div>
                        <div>
                            <div className="text-2xl font-bold">8</div>
                            <div className="text-gray-400 text-sm">Completed</div>
                        </div>
                    </div>
                </Card>
                <Card className="rounded-2xl border-none shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-orange-50 rounded-xl text-orange-500">
                            <Clock size={24} />
                        </div>
                        <div>
                            <div className="text-2xl font-bold">4</div>
                            <div className="text-gray-400 text-sm">Pending</div>
                        </div>
                    </div>
                </Card>
            </div>

            <Card className="rounded-2xl border-none shadow-premium overflow-hidden">
                <Table columns={columns} dataSource={data} pagination={false} />
            </Card>
        </div>
    );
}
