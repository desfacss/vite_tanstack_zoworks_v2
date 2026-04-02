import { supabase } from '@/core/lib/supabase';

export const executeNlpQuery = async (request: { userInput: string }): Promise<any> => {
  const { data, error } = await supabase.functions.invoke('nlp-query', { body: request });
  if (error) throw new Error(error.message);
  return data;
};

export const submitQueryFeedback = async (logId: string, feedback: string): Promise<void> => {
  const { error } = await supabase.schema('core' as any).from('nlp_logs').update({ 
    user_feedback: feedback, 
    updated_at: new Date().toISOString() 
  }).eq('id', logId);
  if (error) throw new Error(error.message);
};

export const fetchPublishedEntities = async (): Promise<any[]> => {
  const { data } = await supabase.schema('core' as any).from('entities').select('id, entity_type, semantics').eq('status', 'published').eq('is_active', true);
  return data || [];
};
