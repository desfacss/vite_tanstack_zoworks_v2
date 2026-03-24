import React, { useEffect, useState } from 'react';
import { Spin } from 'antd';
import { supabase } from '@/lib/supabase';
import SupportTicketProgress from './SupportTicketProgress';

interface StatusTabProps {
  entityId?: string;
  entityType?: string;
  data?: any;
}

const StatusTab: React.FC<StatusTabProps> = ({ data: ticketData }) => {
  const [loading, setLoading] = useState(true);
  const [stages, setStages] = useState<any[]>([]);

  useEffect(() => {
    const fetchStages = async () => {
      try {
        setLoading(true);
        // 1. Fetch the active ticket process blueprint
        const { data: activeBlueprintData, error: blueprintError } = await supabase
          .schema('automation')
          .from('bp_process_blueprints')
          .select('id')
          .eq('entity_type', 'tickets')
          .eq('is_active', true)
          .single();

        if (blueprintError || !activeBlueprintData) {
          setLoading(false);
          return;
        }

        // 2. Fetch the latest ESM definition
        const { data: esmData, error: esmError } = await supabase
          .schema('automation')
          .from('esm_definitions')
          .select('definitions')
          .eq('blueprint_id', activeBlueprintData.id)
          .order('version', { ascending: false })
          .limit(1)
          .single();

        if (esmError) throw esmError;

        if (esmData?.definitions?.stages) {
          const mappedStages = esmData.definitions.stages.map((s: any) => ({
            id: s.id,
            stage_name: s.name,
            ordinal: s.ordinal || 0
          })).sort((a: any, b: any) => a.ordinal - b.ordinal);
          setStages(mappedStages);
        }
      } catch (err) {
        console.error('Error fetching stages:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStages();
  }, []);

  if (loading) return <Spin style={{ padding: 40 }} />;
  if (stages.length === 0) return <div style={{ padding: 20 }}>No stages defined for this process.</div>;

  return (
    <div style={{ padding: '20px' }}>
      <SupportTicketProgress 
        stages={stages} 
        currentStageId={ticketData?.stage_id || ticketData?.status} 
      />
    </div>
  );
};

export default StatusTab;