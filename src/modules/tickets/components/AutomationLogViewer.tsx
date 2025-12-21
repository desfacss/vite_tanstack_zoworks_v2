import React, { useState, useEffect, useMemo } from 'react';
import {
  Timeline,
  Card,
  Tag,
  Spin,
  Alert,
  Typography,
  Collapse,
  Row,
  Col,
  Statistic,
  Space,
} from 'antd';
import {
  CheckCircle,
  RefreshCw,
  XCircle,
  AlertTriangle,
  Clock,
  Flag,
  Rocket,
  FileText,
  GitBranch,
  Send,
  Wrench,
  ClipboardList,
  DollarSign,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/core/lib/store';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

// --- 1. TYPE DEFINITIONS (Unchanged) ---
interface Ticket {
  id: string;
  display_id: string;
  subject: string;
  stage_id: string;
  escalation_level: number;
  created_at: string;
  updated_at: string;
}

interface Summary {
  total_tasks: number;
  total_service_reports: number;
  total_wf_logs: number;
  total_esm_logs: number;
  total_wf_events: number;
  total_sla_breaches: number;
  total_scheduled_jobs: number;
  total_invoices: number;
}

interface ESMLog {
  id: string;
  created_at: string;
  from_stage_id: string | null;
  to_stage_id: string;
  transition_type: 'entry' | 'transition' | 'exit';
  entity_type: string;
}

interface WFLog {
  id: string;
  executed_at: string;
  status: 'success' | 'failed' | 'skipped';
  action_id: string | null;
  rule_id: string | null;
  scheduled_job_id: string | null;
  message: string | null;
  error_details: string | null;
  context: {
    action_name?: string;
    action_type?: string;
    rule_name?: string;
    entities_found?: number;
    created_entity_id?: string;
    updated_entity_id?: string;
    [key: string]: any;
  };
}

interface SlaBreach {
  id: string;
  breached_at: string;
  sla_rule_name: string;
}

interface EventAndRules {
  event: {
    id: string;
    status: 'pending' | 'processed' | 'failed';
    trigger_type: string;
    created_at: string;
    processed_at: string | null;
    error_message: string | null;
  };
  matched_rules: any[];
}

interface AutomationLogResponse {
  ticket: Ticket;
  summary: Summary;
  related_objects: {
    tasks: any[];
    service_reports: any[];
    invoices: any[];
  };
  automation_trace: {
    esm_logs: ESMLog[];
    wf_logs: WFLog[];
    scheduled_job_logs: WFLog[];
    sla_breaches: SlaBreach[];
    wf_events_and_rules: EventAndRules[];
  };
}

type TimelineItemType =
  | 'TICKET_CREATED'
  | 'STATE_TRANSITION'
  | 'EVENT_FIRED'
  | 'EVENT_PROCESSED'
  | 'WORKFLOW_ACTION'
  | 'WORKFLOW_RULE'
  | 'SLA_BREACH';

interface TimelineItem {
  id: string;
  timestamp: string;
  type: TimelineItemType;
  data: any;
  color: string;
  icon?: React.ReactNode;
}

// --- 2. HELPER FUNCTIONS (To build the unified timeline) ---

/**
 * Gets the right icon for a log item.
 */
function getIconForLog(item: TimelineItem): React.ReactNode {
  if (item.icon) return item.icon;

  if (item.data?.action_type === 'send_email') return <Send size={16} />;
  if (item.data?.action_type === 'create_entity') {
    if (item.data?.context?.created_entity?.name?.includes('Task')) return <Wrench size={16} />;
    if (item.data?.context?.created_entity?.name?.includes('Service Report')) return <ClipboardList size={16} />;
    if (item.data?.context?.created_entity?.name?.includes('Invoice')) return <DollarSign size={16} />;
    return <CheckCircle size={16} />;
  }
  if (item.data?.action_type === 'update_entity') return <RefreshCw size={16} />;

  return <CheckCircle size={16} />;
}

/**
 * Creates a human-readable title for a timeline item.
 */
function getTitle(item: TimelineItem): string {
  switch (item.type) {
    case 'TICKET_CREATED':
      return 'Ticket Created';
    case 'STATE_TRANSITION':
      return 'State Changed';
    case 'EVENT_FIRED':
      return 'Event Fired';
    case 'EVENT_PROCESSED':
      return 'Event Processed';
    case 'SLA_BREACH':
      return 'SLA Breach';
    case 'WORKFLOW_ACTION':
      return item.data.context.action_name || 'Action Executed';
    case 'WORKFLOW_RULE':
      return item.data.context.rule_name || 'Rule Evaluation';
    default:
      return 'Log';
  }
}

/**
 * Creates a human-readable description for a timeline item.
 */
function getDetails(item: TimelineItem): React.ReactNode {
  const { type, data } = item;
  switch (type) {
    case 'TICKET_CREATED':
      return `Ticket ${data?.display_id} created with subject: "${data?.subject}"`;
    case 'STATE_TRANSITION':
      const entity = data?.entity_type === 'tickets' ? 'Ticket' : data?.entity_type;
      return (
        <>
          {entity} moved from <Tag>{data?.from_stage_id || 'Start'}</Tag> to <Tag>{data?.to_stage_id}</Tag>
        </>
      );
    case 'EVENT_FIRED':
      return <Text type="secondary">Event {data?.trigger_type} waiting to be processed.</Text>;
    case 'EVENT_PROCESSED':
      return (
        <Text type={data?.status === 'failed' ? 'danger' : undefined}>
          Event {data?.trigger_type} finished processing with status: {data?.status}
        </Text>
      );
    case 'SLA_BREACH':
      return <Text type="danger">{data?.sla_rule_name}</Text>;
    case 'WORKFLOW_ACTION':
      if (data?.context?.created_entity_id) {
        return `Created new entity: ${data?.context?.created_entity_id}`;
      }
      if (data?.context?.updated_entity_id) {
        return `Updated entity: ${data?.context?.updated_entity_id}`;
      }
      if (data?.context?.action_type === 'send_email') {
        return `Email sent. To: ${data?.context?.recipient_counts?.to}, CC: ${data?.context?.recipient_counts?.cc}`;
      }
      return <Text type="secondary">Action: {data?.context?.action_type}</Text>;
    case 'WORKFLOW_RULE':
      return <Text type="secondary">{data?.message || 'Rule evaluated'}</Text>;
    default:
      return <Text type="secondary">Log entry</Text>;
  }
}

/**
 * Merges all log sources into one sorted array.
 */
function processLogData(logData: AutomationLogResponse): TimelineItem[] {
  const items: TimelineItem[] = [];

  items.push({
    id: logData.ticket.id,
    timestamp: logData.ticket.created_at,
    type: 'TICKET_CREATED',
    data: logData.ticket,
    color: 'green',
    icon: <Rocket size={16} />,
  });

  logData.automation_trace.esm_logs.forEach((log) => {
    let icon = <GitBranch size={16} />;
    if (log.entity_type === 'tasks') icon = <Wrench size={16} />;
    if (log.entity_type === 'service_reports') icon = <ClipboardList size={16} />;
    if (log.entity_type === 'invoices') icon = <DollarSign size={16} />;

    items.push({
      id: log.id,
      timestamp: log.created_at,
      type: 'STATE_TRANSITION',
      data: log,
      color: 'blue',
      icon: icon,
    });
  });

  const allLogs = [
    ...logData.automation_trace.wf_logs,
    ...logData.automation_trace.scheduled_job_logs,
  ];
  allLogs.forEach((log) => {
    let color = 'green';
    let icon: React.ReactNode = <CheckCircle size={16} />;
    let type: TimelineItemType = 'WORKFLOW_ACTION';

    if (log.status === 'failed') {
      color = 'red';
      icon = <XCircle size={16} />;
    } else if (log.status === 'skipped') {
      color = 'gold';
      icon = <AlertTriangle size={16} />;
    }

    if (log.action_id) {
      type = 'WORKFLOW_ACTION';
      if (log.status === 'success') {
        // Use context-specific icons for success
        if (log.context?.action_type === 'send_email') icon = <Send size={16} />;
        else if (log.context?.created_entity_id) icon = <CheckCircle size={16} />;
        else if (log.context?.updated_entity_id) icon = <RefreshCw size={16} />;
      }
    } else {
      type = 'WORKFLOW_RULE';
      icon = <FileText size={16} />;
    }

    items.push({
      id: log.id,
      timestamp: log.executed_at,
      type: type,
      data: log,
      color: color,
      icon: icon,
    });
  });

  logData.automation_trace.sla_breaches.forEach((breach) => {
    items.push({
      id: breach.id,
      timestamp: breach.breached_at,
      type: 'SLA_BREACH',
      data: breach,
      color: 'red',
      icon: <Flag size={16} />,
    });
  });

  logData.automation_trace.wf_events_and_rules.forEach(({ event }) => {
    items.push({
      id: event.id + '_fired',
      timestamp: event.created_at,
      type: 'EVENT_FIRED',
      data: event,
      color: 'gray',
      icon: <Clock size={16} />,
    });
    if (event.processed_at) {
      const isFailed = event.status === 'failed';
      items.push({
        id: event.id + '_processed',
        timestamp: event.processed_at,
        type: 'EVENT_PROCESSED',
        data: event,
        color: isFailed ? 'red' : 'green',
        icon: isFailed ? <XCircle size={16} /> : <RefreshCw size={16} />,
      });
    }
  });

  // Sort all items chronologically
  return items.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}


// --- 4. MAIN COMPONENT (Fetches and displays the log) ---

interface AutomationLogViewerProps {
  ticketId: string;
}

const AutomationLogViewer: React.FC<AutomationLogViewerProps> = ({ ticketId }) => {
  const [logData, setLogData] = useState<AutomationLogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { organization } = useAuthStore();
  useEffect(() => {
    if (!ticketId) return;

    const fetchLogs = async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.schema('automation').rpc('get_automation_logs_v4', {
        // p_ticket_id: ticketId,
        p_organization_id: organization?.id,
        p_entity_schema: 'blueprint',
        p_entity_type: 'tickets',
        p_entity_id: ticketId
      });

      if (error) {
        console.error('Error fetching automation logs:', error);
        setError(error.message);
        setLogData(null);
      } else {
        setLogData(data as any); // Cast as any to avoid type mismatch during dev
      }
      setLoading(false);
    };

    fetchLogs();
  }, [ticketId, supabase]);

  const timelineItems = useMemo(() => {
    if (!logData) return [];
    return processLogData(logData);
  }, [logData]);

  if (loading) {
    return <Spin tip="Loading automation trace..." size="large"><div style={{ height: 200 }} /></Spin>;
  }

  if (error) {
    return <Alert message="Error loading logs" description={error} type="error" showIcon />;
  }

  if (!logData) {
    return <Alert message="No log data found for this ticket." type="info" showIcon />;
  }

  const { ticket, summary } = logData;

  return (
    <Card>
      <Title level={4}>Automation Trace: {ticket.display_id}</Title>
      <Paragraph>{ticket.subject}</Paragraph>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={8} md={6} lg={4}>
          <Statistic title="Current Stage" value={ticket.stage_id} />
        </Col>
        <Col xs={12} sm={8} md={6} lg={4}>
          <Statistic title="Escalation" value={ticket.escalation_level} />
        </Col>
        <Col xs={12} sm={8} md={6} lg={4}>
          <Statistic title="SLA Breaches" value={summary.total_sla_breaches} />
        </Col>
        <Col xs={12} sm={8} md={6} lg={4}>
          <Statistic title="Events" value={summary.total_wf_events} />
        </Col>
        <Col xs={12} sm={8} md={6} lg={4}>
          <Statistic title="Workflow Logs" value={summary.total_wf_logs} />
        </Col>
        <Col xs={12} sm={8} md={6} lg={4}>
          <Statistic title="Related Tasks" value={summary.total_tasks} />
        </Col>
        <Col xs={12} sm={8} md={6} lg={4}>
          <Statistic title="Service Reports" value={summary.total_service_reports} />
        </Col>
      </Row>

      {/* --- THIS IS THE KEY FIX --- */}
      {/* By removing mode="left", the timeline becomes responsive */}
      <Timeline>
        {timelineItems.map((item) => (
          <Timeline.Item key={item.id} dot={item.icon} color={item.color}>
            <Row justify="space-between" align="top" style={{ paddingBottom: 8 }}>
              <Col>
                <Title level={5} style={{ marginTop: 0, marginBottom: 4 }}>
                  {getTitle(item)}
                </Title>
                <Paragraph style={{ margin: 0 }}>{getDetails(item)}</Paragraph>
              </Col>
              <Col style={{ textAlign: 'right' }}>
                <Text type="secondary" style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                  {new Date(item.timestamp).toLocaleString()}
                </Text>
              </Col>
            </Row>
            <Collapse size="small" ghost style={{ padding: 0, margin: 0 }}>
              <Panel
                header={<Text type="secondary" style={{ fontSize: '12px' }}>Details</Text>}
                key={item.id}
                style={{ padding: '0 0 0 8px' }}
              >
                <pre style={{ background: '#f5f5f5', padding: 10, borderRadius: 4, maxHeight: 300, overflow: 'auto' }}>
                  {JSON.stringify(item.data, null, 2)}
                </pre>
              </Panel>
            </Collapse>
          </Timeline.Item>
        ))}
      </Timeline>
    </Card>
  );
};

export default AutomationLogViewer;