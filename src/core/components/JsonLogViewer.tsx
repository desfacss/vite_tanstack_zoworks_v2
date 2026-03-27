import React from 'react';
import { Typography } from 'antd';

const { Text } = Typography;

interface JsonLogViewerProps {
  data: any;
  maxHeight?: string | number;
}

const JsonLogViewer: React.FC<JsonLogViewerProps> = ({ data, maxHeight = '400px' }) => {
  if (!data) return <Text type="secondary">No data available</Text>;

  const formattedJson = typeof data === 'string' ? data : JSON.stringify(data, null, 2);

  return (
    <div 
      style={{ 
        background: '#1d1d1d', 
        padding: '16px', 
        borderRadius: '8px', 
        maxHeight, 
        overflowY: 'auto',
        fontFamily: 'monospace',
        fontSize: '13px',
        lineHeight: '1.6',
        color: '#e6e6e6',
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)'
      }}
    >
      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
        {formattedJson.split('\n').map((line, i) => {
          // Simple syntax highlighting via regex (very basic)
          const isKey = line.includes('":');
          const isString = line.includes('": "') || (!isKey && line.includes('"'));
          const isNumber = /[0-9]/.test(line) && !isString;

          let color = '#e6e6e6'; // default
          if (isKey) color = '#9cdcfe';
          else if (isString) color = '#ce9178';
          else if (isNumber) color = '#b5cea8';

          return (
            <div key={i} style={{ color }}>
              {line}
            </div>
          );
        })}
      </pre>
    </div>
  );
};

export default JsonLogViewer;
