import React from 'react';
import { Card, Row, Col, Typography, Space, InputNumber, Tag, Empty } from 'antd';
import { ClockCircleOutlined, DollarOutlined } from '@ant-design/icons';
import type { WorkflowDefinition, StageMetrics, StageMetric } from '../types';

const { Title, Text, Paragraph } = Typography;

interface ProcessMetricsConfigProps {
  definition: Partial<WorkflowDefinition>;
  stageMetrics: Partial<StageMetrics>;
  onUpdate: (metrics: Partial<StageMetrics>) => void;
}

export function ProcessMetricsConfig({ definition, stageMetrics, onUpdate }: ProcessMetricsConfigProps) {
  const stages = definition.definitions?.stages || [];
  const metricsData = stageMetrics.metrics_data || [];

  const updateMetric = (stageId: string, partial: Partial<StageMetric>) => {
    const next = [...metricsData];
    const idx = next.findIndex(m => m.stage_id === stageId);
    if (idx >= 0) {
      next[idx] = { ...next[idx], ...partial };
    } else {
      next.push({
        stage_id: stageId,
        pertTime: { optimisticHours: 1, mostLikelyHours: 2, pessimisticHours: 5 },
        pertCost: { optimisticUsd: 10, mostLikelyUsd: 20, pessimisticUsd: 50 },
        aspirationalMetrics: { targetTimeHours: 1, targetCostUsd: 15 },
        requiredSkills: [],
        resourceRequirements: [],
        ...partial
      });
    }
    onUpdate({ ...stageMetrics, metrics_data: next });
  };

  if (stages.length === 0) return <Empty description="Configure stages first" />;

  return (
    <Space direction="vertical" className="w-full" size="middle">
      <Title level={4}>Stage Metrics</Title>
      <Paragraph type="secondary">Estimates for time and cost per stage</Paragraph>

      {stages.map((s:any) => {
        const m = metricsData.find(dm => dm.stage_id === s.id) || {
          pertTime: { optimisticHours: 0, mostLikelyHours: 0, pessimisticHours: 0 },
          pertCost: { optimisticUsd: 0, mostLikelyUsd: 0, pessimisticUsd: 0 },
          aspirationalMetrics: { targetTimeHours: 0, targetCostUsd: 0 }
        };

        return (
          <Card key={s.id} size="small" title={<Space><Text strong>{s.displayLabel}</Text></Space>} className="mb-4">
             <Row gutter={16}>
                <Col span={12}>
                   <Card size="small" type="inner" title={<Space><ClockCircleOutlined /><span>Time (Hours)</span></Space>}>
                      <Row gutter={8}>
                         <Col span={8}><Text type="secondary">Min</Text><InputNumber size="small" className="w-full" value={m.pertTime.optimisticHours} onChange={v => updateMetric(s.id, { pertTime: { ...m.pertTime, optimisticHours: v || 0 } })} /></Col>
                         <Col span={8}><Text type="secondary">Likely</Text><InputNumber size="small" className="w-full" value={m.pertTime.mostLikelyHours} onChange={v => updateMetric(s.id, { pertTime: { ...m.pertTime, mostLikelyHours: v || 0 } })} /></Col>
                         <Col span={8}><Text type="secondary">Max</Text><InputNumber size="small" className="w-full" value={m.pertTime.pessimisticHours} onChange={v => updateMetric(s.id, { pertTime: { ...m.pertTime, pessimisticHours: v || 0 } })} /></Col>
                      </Row>
                   </Card>
                </Col>
                <Col span={12}>
                   <Card size="small" type="inner" title={<Space><DollarOutlined /><span>Cost (USD)</span></Space>}>
                      <Row gutter={8}>
                         <Col span={8}><Text type="secondary">Min</Text><InputNumber size="small" className="w-full" value={m.pertCost.optimisticUsd} onChange={v => updateMetric(s.id, { pertCost: { ...m.pertCost, optimisticUsd: v || 0 } })} /></Col>
                         <Col span={8}><Text type="secondary">Likely</Text><InputNumber size="small" className="w-full" value={m.pertCost.mostLikelyUsd} onChange={v => updateMetric(s.id, { pertCost: { ...m.pertCost, mostLikelyUsd: v || 0 } })} /></Col>
                         <Col span={8}><Text type="secondary">Max</Text><InputNumber size="small" className="w-full" value={m.pertCost.pessimisticUsd} onChange={v => updateMetric(s.id, { pertCost: { ...m.pertCost, pessimisticUsd: v || 0 } })} /></Col>
                      </Row>
                   </Card>
                </Col>
             </Row>
          </Card>
        );
      })}
    </Space>
  );
}
