import { EntityStatus } from './types';

export const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const getStatusColor = (status: EntityStatus): string => {
  switch (status) {
    case EntityStatus.PUBLISHED: return 'green';
    case EntityStatus.DRAFT: return 'blue';
    case EntityStatus.NOT_MODELED: return 'gold';
    default: return 'default';
  }
};

export const getStatusText = (status: EntityStatus): string => {
  switch (status) {
    case EntityStatus.PUBLISHED: return 'Published';
    case EntityStatus.DRAFT: return 'Draft in Review';
    case EntityStatus.NOT_MODELED: return 'Not Modeled';
    default: return status;
  }
};

export const getQueryStatusColor = (wasSuccessful: boolean): string => wasSuccessful ? 'green' : 'red';
export const getQueryStatusText = (wasSuccessful: boolean): string => wasSuccessful ? 'Success' : 'Failed';

export const formatSql = (sql: string): string => {
  return sql
    ?.replace(/\bSELECT\b/gi, 'SELECT')
    ?.replace(/\bFROM\b/gi, '\nFROM')
    ?.replace(/\bWHERE\b/gi, '\nWHERE')
    ?.replace(/\bAND\b/gi, '\n  AND')
    ?.replace(/\bOR\b/gi, '\n  OR')
    ?.replace(/\bGROUP BY\b/gi, '\nGROUP BY')
    ?.replace(/\bORDER BY\b/gi, '\nORDER BY')
    ?.replace(/\bLIMIT\b/gi, '\nLIMIT')
    ?.replace(/\bJOIN\b/gi, '\nJOIN')
    ?.replace(/\bLEFT JOIN\b/gi, '\nLEFT JOIN')
    ?.replace(/\bRIGHT JOIN\b/gi, '\nRIGHT JOIN')
    ?.trim();
};

export const truncateText = (text: string, maxLength: number): string => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const calculateSuccessRate = (logs: any[]): number => {
  if (!logs?.length) return 0;
  const successCount = logs.filter((log) => log.was_successful).length;
  return Math.round((successCount / logs.length) * 100);
};

export const calculateAverageExecutionTime = (logs: any[]): number => {
  const validLogs = logs?.filter((log) => log.execution_time_ms !== null);
  if (!validLogs?.length) return 0;
  const sum = validLogs.reduce((acc, log) => acc + (log.execution_time_ms || 0), 0);
  return Math.round(sum / validLogs.length);
};

export const queryKeys = {
  entities: ['entities'] as const,
  entity: (id: string) => ['entity', id] as const,
  entityContext: (id: string) => ['entityContext', id] as const,
  entityDraft: (id: string) => ['entityDraft', id] as const,
  entityVersions: (id: string) => ['entityVersions', id] as const,
  nlpLogs: (filters: any) => ['nlpLogs', filters] as const,
  databaseTables: ['databaseTables'] as const,
};
