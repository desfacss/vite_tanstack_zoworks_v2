import React, { useState, useEffect } from 'react';
import { Button, Card, Row, Col, Typography, Space, Tag, Tabs, Spin, Empty } from 'antd';
import { ArrowLeftOutlined, EditOutlined, BranchesOutlined, ThunderboltOutlined, EyeOutlined } from '@ant-design/icons';
import { supabase } from '@/core/lib/supabase';
import type { WorkflowDefinition, WorkflowRule } from './types';

const { Title, Paragraph, Text } = Typography;

interface WorkflowDefinitionDetailsProps {
  definition: WorkflowDefinition;
  onBack: () => void;
  onEdit: () => void;
}

export function WorkflowDefinitionDetails({ definition, onBack, onEdit }: WorkflowDefinitionDetailsProps) {
  const [hooks, setHooks] = useState<WorkflowRule[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRelatedData();
  }, [definition.id]);

  const loadRelatedData = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.schema('workflow' as any).from('wf_workflows').select('*').eq('workflow_definition_id', definition.id);
      setHooks(data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const tabs = [
    {
      key: 'overview',
      label: <Space><EyeOutlined /> Overview</Space>,
      children: (
        <Row gutter={16}>
           <Col span={16}>
              <Card title="Definition Details" size="small">
                 <Space direction="vertical" className="w-full">
                    <div><Text type="secondary">Description</Text><Paragraph>{definition.description || 'N/A'}</Paragraph></div>
                    <Row gutter={8}>
                       <Col span={12}><Text type="secondary">Entity Type</Text><Paragraph>{definition.entity_schema}.{definition.entity_type}</Paragraph></Col>
                       <Col span={12}><Text type="secondary">Version</Text><Paragraph>v{definition.version}</Paragraph></Col>
                    </Row>
                 </Space>
              </Card>
           </Col>
           <Col span={8}>
              <Card title="Quick Stats" size="small">
                 <div className="flex flex-col gap-2">
                    <div className="flex justify-between"><span>Stages</span><Tag>{definition.definitions?.stages?.length || 0}</Tag></div>
                    <div className="flex justify-between"><span>Transitions</span><Tag>{definition.definitions?.transitions?.length || 0}</Tag></div>
                    <div className="flex justify-between"><span>Hooks</span><Tag>{hooks.length}</Tag></div>
                 </div>
              </Card>
           </Col>
        </Row>
      )
    },
    {
      key: 'stages',
      label: <Space><BranchesOutlined /> Stages</Space>,
      children: (
        <Space direction="vertical" className="w-full" size="small">
           {definition.definitions?.stages?.map((s:any) => (
             <Card key={s.id} size="small">
                <Space><Text strong>{s.displayLabel}</Text><Tag>{s.systemStatusCategory}</Tag></Space>
             </Card>
           ))}
        </Space>
      )
    },
    {
       key: 'hooks',
       label: <Space><ThunderboltOutlined /> Automation Hooks</Space>,
       children: (
         <Space direction="vertical" className="w-full" size="small">
            {hooks.length === 0 ? <Empty description="No hooks" /> : hooks.map(h => (
              <Card key={h.id} size="small">
                 <Space><Text strong>{h.name}</Text><Tag color={h.is_active ? 'green' : 'default'}>{h.trigger_type}</Tag></Space>
              </Card>
            ))}
         </Space>
       )
    }
  ];

  return (
    <Space direction="vertical" className="w-full" size="middle">
      <Row justify="space-between" align="middle">
        <Col>
          <Space>
            <Button type="text" icon={<ArrowLeftOutlined />} onClick={onBack} />
            <Title level={3} style={{ margin: 0 }}>{definition.name}</Title>
          </Space>
        </Col>
        <Col><Button type="primary" icon={<EditOutlined />} onClick={onEdit}>Edit Definition</Button></Col>
      </Row>

      {loading ? <Spin /> : <Tabs items={tabs} />}
    </Space>
  );
}
