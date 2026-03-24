import React from 'react';
import { Card, Tag, Typography, Divider, Space , Row, Col } from 'antd';
import { Mail, MessageSquare, Calendar, AlertCircle, User } from 'lucide-react';

const { Text, Title } = Typography;

interface TicketSummaryProps {
  entityId?: string;
  entityType?: string;
  data?: any;
}

const TicketSummary: React.FC<TicketSummaryProps> = ({ data }) => {
  if (!data) return null;

  const receivers = data?.receivers?.emails || [];
  const description = data?.details?.description || data?.description || 'No description provided';
  const schedule = data?.details?.schedule;
  const priority = data?.details?.priority_id || data?.priority;
  const reporter = data?.contact_name || data?.contact_id;
  const createdAt = data?.created_at || data?.reported_at;

  return (
    <div style={{ padding: '20px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Header-like info */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <Title level={4} style={{ margin: 0 }}>{data.subject || 'No Subject'}</Title>
            <Text type="secondary">{data.display_id || data.id}</Text>
          </div>
          {priority && (
            <Tag color={priority.toLowerCase().includes('high') ? 'red' : 'orange'}>
              {priority.toUpperCase()}
            </Tag>
          )}
        </div>

        <Card bordered={false} bodyStyle={{ padding: 0 }} style={{ background: 'transparent' }}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            
            <section>
              <Title level={5} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MessageSquare size={18} /> Description
              </Title>
              <div style={{ 
                padding: '12px', 
                background: 'var(--tenant-background-light, #f5f5f5)', 
                borderRadius: '8px',
                border: '1px solid var(--tenant-border-light, #f0f0f0)'
              }}>
                <Text>{description}</Text>
              </div>
            </section>

            <Divider style={{ margin: '8px 0' }} />

            <Row gutter={[24, 24]}>
              <Col span={12}>
                <Title level={5} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <User size={18} /> Reporter
                </Title>
                <Text>{reporter || 'Unknown'}</Text>
              </Col>
              <Col span={12}>
                <Title level={5} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Calendar size={18} /> Reported At
                </Title>
                <Text>{createdAt ? new Date(createdAt).toLocaleString() : 'N/A'}</Text>
              </Col>
            </Row>

            <Divider style={{ margin: '8px 0' }} />

            <section>
              <Title level={5} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Mail size={18} /> CC Receivers (External)
              </Title>
              <Space wrap>
                {receivers.length > 0 ? (
                  receivers.map((email: string) => (
                    <Tag key={email} color="blue" style={{ borderRadius: '12px', padding: '2px 10px' }}>
                      {email}
                    </Tag>
                  ))
                ) : (
                  <Text type="secondary" italic>No additional receivers registered for this ticket.</Text>
                )}
              </Space>
            </section>

            {schedule && (
              <>
                <Divider style={{ margin: '8px 0' }} />
                <section>
                  <Title level={5} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AlertCircle size={18} /> Scheduled Execution
                  </Title>
                  <Tag color="purple">{new Date(schedule).toLocaleString()}</Tag>
                </section>
              </>
            )}

          </Space>
        </Card>
      </Space>
    </div>
  );
};

// Simple Row/Col simulation if not imported from antd directly in the same way
// const Row = ({ children, gutter }: any) => (
//   <div style={{ display: 'flex', flexWrap: 'wrap', margin: `0 -${gutter[0]/2}px` }}>
//     {children}
//   </div>
// );
// const Col = ({ children, span, gutter }: any) => (
//   <div style={{ width: `${(span / 24) * 100}%`, padding: `0 ${gutter[0]/2}px` }}>
//     {children}
//   </div>
// );

export default TicketSummary;