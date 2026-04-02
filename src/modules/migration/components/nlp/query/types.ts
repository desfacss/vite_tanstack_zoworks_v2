export enum QueryStatus {
  LOADING = 'loading',
  SUCCESS = 'success',
  ERROR = 'error',
}

export enum UserFeedback {
  HELPFUL = 'helpful',
  NOT_HELPFUL = 'not_helpful',
  NO_FEEDBACK = 'no_feedback',
}

export enum ChartType {
  BAR = 'bar',
  LINE = 'line',
  PIE = 'pie',
  SCATTER = 'scatter',
  STATISTIC = 'statistic',
  TABLE = 'table',
}

export interface QueryResponse {
  sql: string;
  results: Record<string, any>[];
  executionTimeMs: number;
  explanation?: string;
}

export interface QueryInteraction {
  id: string;
  question: string;
  status: QueryStatus;
  response: QueryResponse | null;
  error: string | null;
  feedback: UserFeedback;
  timestamp: number;
}
