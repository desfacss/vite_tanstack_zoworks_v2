import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../admin/api';
import { queryKeys } from '../admin/utils';

export const useEntities = () => useQuery({ queryKey: queryKeys.entities, queryFn: api.fetchEntities });
export const useNlpLogs = (filters: any) => useQuery({ queryKey: queryKeys.nlpLogs(filters), queryFn: () => api.fetchNlpLogs(filters) });
export const useEntityById = (id: string) => useQuery({ queryKey: queryKeys.entity(id), queryFn: () => api.fetchEntityById(id), enabled: !!id });
export const useEntityContext = (id: string) => useQuery({ queryKey: queryKeys.entityContext(id), queryFn: () => api.fetchEntityContext(id), enabled: !!id });
export const useEntityVersions = (id: string) => useQuery({ queryKey: queryKeys.entityVersions(id), queryFn: () => api.fetchEntityVersions(id), enabled: !!id });
export const useEntityDraft = (id: string) => useQuery({ queryKey: queryKeys.entityDraft(id), queryFn: () => api.fetchEntityDraft(id), enabled: !!id });

export const useGenerateSemantics = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.generateSemantics,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.entities }),
  });
};

export const useSaveDraft = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ entityId, semantics }: { entityId: string; semantics: any }) => api.saveDraftSemantics(entityId, semantics),
    onSuccess: (_, variables) => queryClient.invalidateQueries({ queryKey: queryKeys.entityDraft(variables.entityId) }),
  });
};

export const useApproveVersion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.approveEntityVersion,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.entities }),
  });
};

export const useUpdateNlpLog = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ logId, correctedSql, adminNotes }: { logId: string; correctedSql: string; adminNotes?: string }) => api.updateNlpLog(logId, correctedSql, adminNotes),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['nlpLogs'] }),
  });
};
