import React from 'react';
import { Card, Row, Col, Statistic, Typography, Table, Tag, Space } from 'antd';
import { 
  ShoppingBag, 
  DollarSign, 
  Users, 
  TrendingUp, 
  Package, 
  AlertCircle 
} from 'lucide-react';

const { Title, Text } = Typography;

const CommerceDashboard: React.FC = () => {
    // Mock data for the dashboard
    const stats = [
        { title: 'Total Revenue', value: '$45,231.89', icon: <DollarSign className="text-blue-500" size={24} />, trend: '+12.5%' },
        { title: 'Orders Today', value: '156', icon: <ShoppingBag className="text-green-500" size={24} />, trend: '+8.2%' },
        { title: 'Customers', value: '2,453', icon: <Users className="text-purple-500" size={24} />, trend: '+3.1%' },
        { title: 'Avg. Order Value', value: '$289.94', icon: <TrendingUp className="text-orange-500" size={24} />, trend: '-2.4%' },
    ];

    const recentOrders = [
        { key: '1', id: '#ORD-7234', customer: 'John Doe', amount: '$129.00', status: 'Processing', date: '2 min ago' },
        { key: '2', id: '#ORD-7233', customer: 'Jane Smith', amount: '$850.50', status: 'Shipped', date: '15 min ago' },
        { key: '3', id: '#ORD-7232', customer: 'Robert Johnson', amount: '$45.00', status: 'Delivered', date: '1 hour ago' },
        { key: '4', id: '#ORD-7231', customer: 'Sarah Williams', amount: '$240.20', status: 'Pending', date: '3 hours ago' },
    ];

    const lowStockItems = [
        { key: '1', item: 'Nike Air Max 270', stock: 5, category: 'Footwear' },
        { key: '2', item: 'iPhone 15 Case - Clear', stock: 2, category: 'Accessories' },
        { key: '3', item: 'Leather Wallet - Brown', stock: 8, category: 'Bags' },
    ];

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ marginBottom: '24px' }}>
                <Title level={4}>Commerce Overview</Title>
                <Text type="secondary">Real-time statistics for your store performance</Text>
            </div>

            <Row gutter={[16, 16]}>
                {stats.map((stat, idx) => (
                    <Col xs={24} sm={12} lg={6} key={idx}>
                        <Card bordered={false} className="shadow-sm">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <Text type="secondary">{stat.title}</Text>
                                    <Title level={3} style={{ margin: '8px 0' }}>{stat.value}</Title>
                                    <Text type={stat.trend.startsWith('+') ? 'success' : 'danger'}>
                                        {stat.trend} <Text type="secondary" style={{ fontSize: '12px' }}>from last month</Text>
                                    </Text>
                                </div>
                                <div style={{ padding: '12px', background: '#f0f5ff', borderRadius: '8px' }}>
                                    {stat.icon}
                                </div>
                            </div>
                        </Card>
                    </Col>
                ))}
            </Row>

            <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
                <Col xs={24} lg={16}>
                    <Card title="Recent Orders" bordered={false} className="shadow-sm">
                        <Table 
                            dataSource={recentOrders} 
                            pagination={false}
                            columns={[
                                { title: 'Order ID', dataIndex: 'id', key: 'id', render: (text) => <Text strong>{text}</Text> },
                                { title: 'Customer', dataIndex: 'customer', key: 'customer' },
                                { title: 'Amount', dataIndex: 'amount', key: 'amount' },
                                { 
                                    title: 'Status', 
                                    dataIndex: 'status', 
                                    key: 'status',
                                    render: (status) => {
                                        let color = 'gold';
                                        if (status === 'Shipped') color = 'blue';
                                        if (status === 'Delivered') color = 'green';
                                        if (status === 'Processing') color = 'cyan';
                                        return <Tag color={color}>{status}</Tag>;
                                    }
                                },
                                { title: 'Date', dataIndex: 'date', key: 'date', render: (text) => <Text type="secondary">{text}</Text> }
                            ]}
                        />
                    </Card>
                </Col>
                <Col xs={24} lg={8}>
                    <Card 
                        title={
                            <Space>
                                <AlertCircle size={18} className="text-red-500" />
                                <span>Low Stock Alert</span>
                            </Space>
                        } 
                        bordered={false} 
                        className="shadow-sm"
                    >
                        <Table 
                            dataSource={lowStockItems} 
                            pagination={false}
                            size="small"
                            columns={[
                                { title: 'Item', dataIndex: 'item', key: 'item' },
                                { 
                                    title: 'Stock', 
                                    dataIndex: 'stock', 
                                    key: 'stock',
                                    render: (stock) => <Tag color="error">{stock} units left</Tag>
                                }
                            ]}
                        />
                        <div style={{ marginTop: '16px', textAlign: 'center' }}>
                            <Text link>View all inventory</Text>
                        </div>
                    </Card>

                    <Card title="Distribution" bordered={false} className="shadow-sm" style={{ marginTop: '16px' }}>
                        <div style={{ height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {/* Simple placeholder for a chart */}
                            <div style={{ textAlign: 'center' }}>
                                <Package size={48} className="text-gray-300" style={{ marginBottom: '12px' }} />
                                <Text type="secondary">Sales Distribution by Category</Text>
                            </div>
                        </div>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default CommerceDashboard;
