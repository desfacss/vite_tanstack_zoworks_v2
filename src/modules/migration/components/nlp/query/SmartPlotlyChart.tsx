import { useEffect, useRef, useState } from 'react';
import Plotly from 'plotly.js-dist-min';
import { Select, Button, Space, Tooltip } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { analyzeDataStructure, aggregateDataByCategory, aggregateDataByTime } from './utils';

export const SmartPlotlyChart: React.FC<{ data: any[] }> = ({ data }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [chartType, setChartType] = useState<string>('bar');
  const [agg, setAgg] = useState<string>('count');

  useEffect(() => {
    if (!data?.length) return;
    const res = analyzeDataStructure(data);
    setAnalysis(res);
    setChartType(res.recommendedChartType);
  }, [data]);

  useEffect(() => {
    if (!chartRef.current || !analysis || !data?.length) return;
    try {
      let plotData: any[] = [];
      let layout: any = { font: { family: 'Inter, sans-serif' }, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', margin: { l: 50, r: 20, t: 40, b: 60 } };

      if (chartType === 'bar' && analysis.isCategorical) {
        const { categories, values } = aggregateDataByCategory(data, analysis.categoricalColumn!, analysis.numericColumns[0], agg);
        plotData = [{ x: categories, y: values, type: 'bar', marker: { color: '#4A90E2' } }];
      } else if (chartType === 'line' && analysis.isTimeSeries) {
        const { timestamps, values } = aggregateDataByTime(data, analysis.temporalColumn!, analysis.numericColumns[0], agg);
        plotData = [{ x: timestamps, y: values, type: 'scatter', mode: 'lines+markers', line: { color: '#4A90E2' } }];
      }

      if (plotData.length) Plotly.react(chartRef.current, plotData, layout, { responsive: true });
    } catch {}
    return () => { if (chartRef.current) Plotly.purge(chartRef.current); };
  }, [data, chartType, agg, analysis]);

  if (!analysis) return null;

  return (
    <div>
      <Space className="mb-4" wrap>
        <Select value={chartType} onChange={setChartType} style={{ width: 120 }} options={[{ label: 'Bar', value: 'bar' }, { label: 'Line', value: 'line' }, { label: 'Table', value: 'table' }]} />
        <Select value={agg} onChange={setAgg} style={{ width: 120 }} options={[{ label: 'Count', value: 'count' }, { label: 'Sum', value: 'sum' }, { label: 'Average', value: 'average' }]} />
        <Button icon={<DownloadOutlined />} onClick={() => chartRef.current && Plotly.downloadImage(chartRef.current, { filename: 'chart' })}>Export</Button>
      </Space>
      <div ref={chartRef} style={{ width: '100%', height: 400 }} />
    </div>
  );
};
