import { groupBy, sumBy, meanBy } from 'lodash';

export const analyzeDataStructure = (results: any[]): any => {
  if (!results?.length) return { recommendedChartType: 'table', columnMetadata: [] };
  const firstRow = results[0];
  const columns = Object.keys(firstRow);
  const numeric: string[] = [];
  const temporal: string[] = [];
  const categorical: string[] = [];

  columns.forEach(col => {
    const val = firstRow[col];
    if (typeof val === 'number') numeric.push(col);
    else if (val instanceof Date || (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val))) temporal.push(col);
    else if (typeof val === 'string') {
      const unique = new Set(results.map(r => r[col])).size;
      if (unique <= 10) categorical.push(col);
    }
  });

  const isTimeSeries = temporal.length >= 1 && numeric.length >= 1;
  const isCategorical = categorical.length >= 1 && numeric.length >= 1;

  return {
    recommendedChartType: isTimeSeries ? 'line' : isCategorical ? 'bar' : 'table',
    isTimeSeries,
    isCategorical,
    categoricalColumn: categorical[0],
    temporalColumn: temporal[0],
    numericColumns: numeric,
  };
};

export const aggregateDataByCategory = (data: any[], cat: string, val: string, method: string) => {
  const grouped = groupBy(data, cat);
  const categories = Object.keys(grouped);
  const values = categories.map(c => {
    const g = grouped[c];
    if (method === 'sum') return sumBy(g, val);
    if (method === 'average') return meanBy(g, val);
    return g.length;
  });
  return { categories, values };
};

export const aggregateDataByTime = (data: any[], time: string, val: string, method: string) => {
  const grouped = groupBy(data, time);
  const timestamps = Object.keys(grouped).sort();
  const values = timestamps.map(t => {
    const g = grouped[t];
    if (method === 'sum') return sumBy(g, val);
    if (method === 'average') return meanBy(g, val);
    return g.length;
  });
  return { timestamps, values };
};

export const formatSql = (sql: string): string => {
  return sql
    ?.replace(/\bSELECT\b/gi, 'SELECT')
    ?.replace(/\bFROM\b/gi, '\nFROM')
    ?.replace(/\bWHERE\b/gi, '\nWHERE')
    ?.replace(/\bAND\b/gi, '\n  AND')
    ?.replace(/\bJOIN\b/gi, '\nJOIN')
    ?.trim();
};
