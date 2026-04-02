import { useState, useEffect } from 'react';
import { Layout, Input, Button, Card, Space, Typography, Spin, Alert, Table, Tooltip, Divider, Badge } from 'antd';
import { ThunderboltOutlined, UserOutlined, RobotOutlined, CodeOutlined, DeleteOutlined, LikeOutlined, DislikeOutlined, TableOutlined, LineChartOutlined } from '@ant-design/icons';
import { executeNlpQuery, submitQueryFeedback } from './api';
import { SmartPlotlyChart } from './SmartPlotlyChart';
import { formatSql } from './utils';

const { Content, Sider } = Layout;
const { Title, Text, Paragraph } = Typography;
const { Search } = Input;

export const NaturalLanguageQueryInterface = () => {
    const [interactions, setInteractions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [userInput, setUserInput] = useState('');

    const handleSend = async (val: string) => {
        if (!val.trim()) return;
        const newInteraction = { id: Date.now().toString(), question: val, status: 'loading', response: null, error: null };
        setInteractions([...interactions, newInteraction]);
        setUserInput('');
        setLoading(true);

        try {
            const res = await executeNlpQuery({ userInput: val });
            setInteractions(prev => prev.map(i => i.id === newInteraction.id ? { ...i, status: 'success', response: res } : i));
        } catch (err: any) {
            setInteractions(prev => prev.map(i => i.id === newInteraction.id ? { ...i, status: 'error', error: err.message } : i));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout className="bg-gray-50 min-h-screen">
            <Content className="p-6">
                <div className="max-w-4xl mx-auto space-y-6 pb-24">
                    <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm">
                        <Title level={4} className="m-0"><ThunderboltOutlined className="text-blue-500" /> AI Query Assistant</Title>
                        <Button icon={<DeleteOutlined />} onClick={() => setInteractions([])} type="text">Clear History</Button>
                    </div>

                    {interactions.map(interaction => (
                        <div key={interaction.id} className="space-y-4">
                            <Card className="bg-gray-800 text-white rounded-lg shadow-md border-0">
                                <Space><UserOutlined className="text-xl" /><Text className="text-white text-lg">{interaction.question}</Text></Space>
                            </Card>

                            <Card className="bg-blue-50 border-blue-200 rounded-lg shadow-sm">
                                <div className="space-y-4">
                                    <Space><RobotOutlined className="text-xl text-blue-600" /><Text strong className="text-lg text-blue-600">AI Assistant</Text></Space>
                                    
                                    {interaction.status === 'loading' && <div className="text-center py-8"><Spin tip="Analyzing data..." /></div>}
                                    
                                    {interaction.status === 'error' && <Alert message="Query Failed" description={interaction.error} type="error" showIcon />}
                                    
                                    {interaction.status === 'success' && interaction.response && (
                                        <div className="space-y-6">
                                            {interaction.response.results?.length > 0 ? (
                                                <>
                                                    <div className="bg-white p-2 rounded border"><SmartPlotlyChart data={interaction.response.results} /></div>
                                                    <div className="bg-white p-2 rounded border overflow-x-auto"><Table dataSource={interaction.response.results} columns={Object.keys(interaction.response.results[0]).map(k => ({ title: k, dataIndex: k, key: k }))} size="small" pagination={{ pageSize: 5 }} /></div>
                                                </>
                                            ) : <Alert message="No results found for this query." type="info" />}
                                            
                                            <Divider className="m-0" />
                                            <div className="flex justify-between items-center pt-2">
                                                <Space>
                                                    <Text type="secondary" className="text-xs">Helpful?</Text>
                                                    <Button size="small" icon={<LikeOutlined />} onClick={() => submitQueryFeedback(interaction.response.log_id, 'helpful')} />
                                                    <Button size="small" icon={<DislikeOutlined />} onClick={() => submitQueryFeedback(interaction.response.log_id, 'not_helpful')} />
                                                </Space>
                                                <Tooltip title={<pre className="text-xs m-0">{formatSql(interaction.response.sql)}</pre>}><Button size="small" icon={<CodeOutlined />}>Show SQL</Button></Tooltip>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </div>
                    ))}
                </div>

                <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t shadow-lg z-50">
                    <div className="max-w-4xl mx-auto">
                        <Search
                            placeholder="Ask anything about your data... (e.g., 'Show me total sales by month')"
                            enterButton={<ThunderboltOutlined />}
                            size="large"
                            value={userInput}
                            onChange={e => setUserInput(e.target.value)}
                            onSearch={handleSend}
                            loading={loading}
                        />
                    </div>
                </div>
            </Content>
        </Layout>
    );
};
