// src/modules/archive/components/Scheduler/MermaidChart.tsx
import React, { useState, useEffect } from 'react';
import { Spin, message } from 'antd';

interface MermaidChartProps {
  scenarioName: string;
}

const MermaidChart: React.FC<MermaidChartProps> = ({ scenarioName }) => {
  const [svgContent, setSvgContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const renderDiagram = async () => {
      setLoading(true);
      try {
        const response = await fetch('/data/tasks/ppm.mmd');
        if (!response.ok) throw new Error('Failed to load Mermaid file');
        const mermaidCode = await response.text();

        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: 'default',
          securityLevel: 'loose',
        });

        const id = `mermaid-scheduler-${Date.now()}`;
        const { svg } = await mermaid.render(id, mermaidCode);
        setSvgContent(svg);
      } catch (error: any) {
        console.error('Mermaid error:', error);
        setSvgContent(`<div style="color: red;">Error rendering diagram: ${error.message}</div>`);
      } finally {
        setLoading(false);
      }
    };

    renderDiagram();
  }, [scenarioName]);

  return (
    <div style={{ padding: '20px', textAlign: 'center', minHeight: '400px' }}>
      <h3>Mermaid Diagram - {scenarioName}</h3>
      {loading ? (
        <Spin size="large" />
      ) : (
        <div 
          style={{ border: '1px solid #d9d9d9', padding: '20px', background: '#fff' }}
          dangerouslySetInnerHTML={{ __html: svgContent }} 
        />
      )}
    </div>
  );
};

export default MermaidChart;
