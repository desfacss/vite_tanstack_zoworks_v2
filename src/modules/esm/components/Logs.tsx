import React, { useEffect, useState } from 'react';
import { Timeline, Typography, Spin } from 'antd';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../../lib/supabase';

const { Text } = Typography;

interface LogsProps {
  entity_id: string | undefined;
  entity_type: string;
}

interface AuditLog {
  id: string;
  new_stage_name: string;
  comments: string | null;
  created_at: string;
  created_by_name: string | null;
}

const Logs: React.FC<LogsProps> = ({ entity_id, entity_type }) => {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchLogs = async () => {
      if (!entity_id || !entity_type) return;

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('dynamic_workflow_auditlogs')
          .select(`
            id,
            new_stage_name,
            comments,
            created_at,
            created_by,
            users!fk_dynamic_workflow_auditlogs_created_by(name)
          `)
          .eq('entity_id', entity_id)
          .eq('entity_type', entity_type)
          .order('updated_at', { ascending: true }); // Ascending for latest at bottom in Timeline

        if (error) throw error;

        const formattedLogs = data.map((log: any) => ({
          id: log.id,
          new_stage_name: log.new_stage_name,
          comments: log.comments,
          created_at: new Date(log.created_at).toLocaleString(),
          created_by_name: log.users?.name || 'Unknown',
        }));

        setLogs(formattedLogs);
      } catch (error: any) {
        console.error('Error fetching logs:', error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [entity_id, entity_type]);

  return (
    <div className="h-full flex flex-col">
      {loading ? (
        <Spin style={{ margin: 'auto' }} />
      ) : logs.length === 0 ? (
        // <Text>{t('common.noData')}</Text>
        <Text>No Logs Found</Text>
      ) : (
        <Timeline
          mode="left"
          items={logs.map(log => ({
            key: log.id,
            children: (
              <div>
                <Text strong>{log.new_stage_name}</Text>
                <br />
                <Text>{log.comments || t('common.noComments')}</Text>
                <br />
                <Text type="secondary">
                  {t('common.by')} {log.created_by_name} {t('common.at')} {log.created_at}
                </Text>
              </div>
            ),
          }))}
        />
      )}
    </div>
  );
};

export default Logs;