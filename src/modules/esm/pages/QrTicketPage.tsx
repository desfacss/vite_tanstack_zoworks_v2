import React from 'react';
import { useParams } from 'react-router-dom';
import QrTicketForm from '../components/QrTicketForm';
import { Card, Layout } from 'antd';

const { Content } = Layout;

const QrTicketPage: React.FC = () => {
    const { assetId } = useParams<{ assetId?: string }>();

    return (
        <Layout className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <Content className="w-full max-w-md">
                <Card 
                    title={<h2 className="text-center font-bold text-xl uppercase tracking-wider text-blue-600">Register Product / Support</h2>}
                    bordered={false} 
                    className="shadow-xl rounded-2xl overflow-hidden"
                >
                    <div className="mb-6 text-center text-gray-500">
                        Scan successful! Please provide few details to register your request.
                    </div>
                    <QrTicketForm asset_id={assetId || ''} onSuccess={() => window.location.href = '/'} />
                </Card>
            </Content>
        </Layout>
    );
};

export default QrTicketPage;
