import { supabase } from '@/core/lib/supabase';
import type {
  Entity,
  EntityVersion,
  NlpLog,
  EntityContext,
  TrainingCenterFilters,
} from './types';

export const fetchEntities = async (): Promise<Entity[]> => {
  const { data, error } = await supabase
    .schema('core' as any)
    .from('entities')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch entities: ${error.message}`);
  return data || [];
};

export const fetchEntityById = async (entityId: string): Promise<Entity> => {
  const { data, error } = await supabase
    .schema('core' as any)
    .from('entities')
    .select('*')
    .eq('id', entityId)
    .single();

  if (error) throw new Error(`Failed to fetch entity: ${error.message}`);
  return data;
};

export const fetchEntityContext = async (entityId: string): Promise<EntityContext> => {
  const { data, error } = await supabase.rpc('get_entity_context_for_llm', {
    p_entity_id: entityId,
  });

  if (error) throw new Error(`Failed to fetch entity context: ${error.message}`);
  return data;
};

export const fetchEntityDraft = async (entityId: string): Promise<EntityVersion | null> => {
  const { data, error } = await supabase
    .schema('core' as any)
    .from('entity_versions')
    .select('*')
    .eq('entity_id', entityId)
    .eq('status', 'draft')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch entity draft: ${error.message}`);
  return data;
};

export const fetchEntityVersions = async (entityId: string): Promise<EntityVersion[]> => {
  const { data, error } = await supabase
    .schema('core' as any)
    .from('entity_versions')
    .select('*')
    .eq('entity_id', entityId)
    .order('version_number', { ascending: false });

  if (error) throw new Error(`Failed to fetch entity versions: ${error.message}`);
  return data || [];
};

export const fetchNlpLogs = async (filters: TrainingCenterFilters): Promise<NlpLog[]> => {
  let query = supabase.schema('core' as any).from('nlp_logs').select('*');

  if (filters.status) {
    query = query.eq('was_successful', filters.status === 'success');
  }

  if (filters.userFeedback && filters.userFeedback !== 'no_feedback') {
    query = query.eq('user_feedback', filters.userFeedback);
  } else if (filters.userFeedback === 'no_feedback') {
    query = query.is('user_feedback', null);
  }

  if (filters.dateRange && filters.dateRange.length === 2) {
    query = query.gte('created_at', filters.dateRange[0]).lte('created_at', filters.dateRange[1]);
  }

  if (filters.searchText) {
    query = query.ilike('user_input', `%${filters.searchText}%`);
  }

  query = query.order('created_at', { ascending: false }).limit(100);

  const { data, error } = await query;

  if (error) throw new Error(`Failed to fetch NLP logs: ${error.message}`);
  return data || [];
};

export const generateSemantics = async (request: any): Promise<any> => {
  const { data, error } = await supabase.functions.invoke('generate-semantics', {
    body: request,
  });

  if (error) throw new Error(`Failed to generate semantics: ${error.message}`);
  return data;
};

export const saveDraftSemantics = async (
  entityId: string,
  semantics: any
): Promise<EntityVersion> => {
  const { data, error } = await supabase.rpc('create_draft_entity_version', {
    p_entity_id: entityId,
    p_semantics: semantics,
  });

  if (error) throw new Error(`Failed to save draft semantics: ${error.message}`);
  return data;
};

export const approveEntityVersion = async (versionId: string): Promise<void> => {
  const { error } = await supabase.rpc('approve_entity_version', {
    p_version_id: versionId,
  });

  if (error) throw new Error(`Failed to approve entity version: ${error.message}`);
};

export const updateNlpLog = async (
  logId: string,
  correctedSql: string,
  adminNotes?: string
): Promise<void> => {
  const { error } = await supabase
    .schema('core' as any)
    .from('nlp_logs')
    .update({
      corrected_sql: correctedSql,
      admin_notes: adminNotes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', logId);

  if (error) throw new Error(`Failed to update NLP log: ${error.message}`);
};
