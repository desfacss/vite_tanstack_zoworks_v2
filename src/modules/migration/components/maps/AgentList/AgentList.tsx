import React from 'react';
import { List, Card, Typography } from 'antd';
import type { AgentWithDetails } from '../types';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);
const { Text } = Typography;

interface AgentListProps {
  agents: AgentWithDetails[];
  selectedAgentId?: string;
  onSelectAgent: (agent: AgentWithDetails) => void;
}

const AgentList: React.FC<AgentListProps> = ({
  agents,
  selectedAgentId,
  onSelectAgent,
}) => {
  return (
    <List
      dataSource={agents}
      renderItem={(agent) => (
        <List.Item
          onClick={() => onSelectAgent(agent)}
          style={{
            cursor: 'pointer',
            background: selectedAgentId === agent.id ? '#f0faff' : '#ffffff',
            padding: '12px',
            borderBottom: '1px solid #f0f0f0',
            transition: 'all 0.3s ease',
          }}
        >
          <Card 
            size="small" 
            className="w-full"
            style={{
              borderColor: selectedAgentId === agent.id ? '#1890ff' : '#f0f0f0',
              boxShadow: selectedAgentId === agent.id ? '0 2px 8px rgba(24, 144, 255, 0.15)' : 'none',
              borderRadius: '8px',
            }}
          >
            <div className="flex flex-col">
              <Text strong className="text-sm truncate">
                {agent.user?.name || agent.publicusers?.name || 'Unknown Agent'}
              </Text>
              <Text type="secondary" className="text-xs truncate">
                {agent.user?.details?.designation || agent.publicusers?.details?.designation || 'Field Agent'}
              </Text>
              <Divider className="my-2" />
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>Last seen:</span>
                <span>{dayjs(agent.recorded_at).fromNow()}</span>
              </div>
            </div>
          </Card>
        </List.Item>
      )}
    />
  );
};

// Internal Divider for cleaner UI
const Divider = ({ className }: { className?: string }) => <div className={`h-[1px] bg-gray-100 ${className}`} />;

export default AgentList;
