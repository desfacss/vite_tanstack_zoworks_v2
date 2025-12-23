import React, { useState, useEffect, useRef, useCallback } from 'react';
import mermaid from 'mermaid';
import { Select, Button, Space, message } from 'antd';
import { ZoomIn, ZoomOut, Home } from 'lucide-react';

interface TransformState {
  scale: number;
  translateX: number;
  translateY: number;
}

interface Diagram {
  name: string;
  file: string;
}

interface PanState {
  x: number;
  y: number;
  initialTx: number;
  initialTy: number;
}

// Initialize Mermaid once
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
});

const INITIAL_TRANSFORM: TransformState = { scale: 1, translateX: 0, translateY: 0 };

export default function MermaidViewer(): JSX.Element {
  const [diagrams, setDiagrams] = useState<Diagram[]>([]);
  const [selectedDiagram, setSelectedDiagram] = useState<string | null>(null);
  const [mermaidCode, setMermaidCode] = useState<string>('');
  const [svgContent, setSvgContent] = useState<string>('');
  const [transform, setTransform] = useState<TransformState>(INITIAL_TRANSFORM);
  const containerRef = useRef<HTMLDivElement>(null);

  const startPan = useRef<PanState | null>(null);

  useEffect(() => {
    const hardcodedDiagrams: Diagram[] = [
      { name: 'Ticket Workflow v1', file: 'tickets.mermaid' },
      { name: 'Ticket Workflow v2', file: 'tickets_v2.mermaid' },
      { name: 'Ticket Workflow v3', file: 'tickets_v3.mermaid' },
    ];
    setDiagrams(hardcodedDiagrams);
    if (hardcodedDiagrams.length > 0) {
      setSelectedDiagram(hardcodedDiagrams[0].file);
    }
  }, []);

  useEffect(() => {
    if (selectedDiagram) {
      const diagramPath = `/mermaids/${selectedDiagram}`;
      fetch(diagramPath)
        .then(response => {
          if (!response.ok) {
            throw new Error(`Failed to load ${diagramPath}: ${response.statusText}`);
          }
          return response.text();
        })
        .then(data => {
          setMermaidCode(data);
          message.success(`Loaded diagram: ${selectedDiagram}`);
        })
        .catch(error => {
          console.error(error);
          setMermaidCode('');
          setSvgContent('');
          message.error('Error loading diagram content.');
        });
    }
  }, [selectedDiagram]);

  useEffect(() => {
    if (mermaidCode) {
      const id = 'mermaid-render-target';

      mermaid.render(id, mermaidCode)
        .then(({ svg }) => {
          setSvgContent(svg);
        })
        .catch(error => {
          console.error('Mermaid render error:', error);
          setSvgContent(`<div style="color: red; font-weight: bold;">Error rendering diagram. Check the Mermaid syntax.</div>`);
          message.error('Mermaid rendering failed.');
        });
    } else {
      setSvgContent('');
    }
  }, [mermaidCode]);

  const handleZoom = (factor: number) => {
    setTransform(prev => ({
      ...prev,
      scale: Math.max(0.1, prev.scale * factor)
    }));
  };

  const handleReset = () => {
    setTransform(INITIAL_TRANSFORM);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    startPan.current = {
      x: e.clientX,
      y: e.clientY,
      initialTx: transform.translateX,
      initialTy: transform.translateY,
    };
    e.preventDefault();
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const currentPan = startPan.current;
    if (!currentPan) return;

    const dx = e.clientX - currentPan.x;
    const dy = e.clientY - currentPan.y;

    setTransform(prev => ({
      ...prev,
      translateX: currentPan.initialTx + dx,
      translateY: currentPan.initialTy + dy,
    }));
  }, []);

  const handleMouseUp = useCallback(() => {
    startPan.current = null;
  }, []);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const transformStyle: React.CSSProperties = {
    transform: `translate(${transform.translateX}px, ${transform.translateY}px) scale(${transform.scale})`,
    cursor: startPan.current ? 'grabbing' : 'grab',
    transformOrigin: '0 0',
    willChange: 'transform',
    transition: startPan.current ? 'none' : 'transform 0.2s ease-out'
  };

  return (
    <div style={{ padding: '20px' }}>
      <Space direction="horizontal" style={{ marginBottom: '20px' }}>
        🌊
        <Select
          value={selectedDiagram}
          placeholder="Select a Diagram"
          onChange={setSelectedDiagram}
          style={{ width: 250 }}
          options={diagrams.map(d => ({ label: d.name, value: d.file }))}
        />

        <Button
          icon={<ZoomIn size={16} />}
          onClick={() => handleZoom(1.2)}
          disabled={!svgContent}
        >
          Zoom In
        </Button>
        <Button
          icon={<ZoomOut size={16} />}
          onClick={() => handleZoom(1 / 1.2)}
          disabled={!svgContent}
        >
          Zoom Out
        </Button>
        <Button
          icon={<Home size={16} />}
          onClick={handleReset}
          disabled={!svgContent}
        >
          Reset View
        </Button>
      </Space>

      <div style={{
        border: '1px solid #d9d9d9',
        borderRadius: '2px',
        overflow: 'hidden',
        height: '600px',
        width: '100%',
        position: 'relative',
        backgroundColor: '#f5f5f5'
      }}>
        {svgContent ? (
          <div
            ref={containerRef}
            style={transformStyle}
            onMouseDown={handleMouseDown}
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        ) : (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            {selectedDiagram ? 'Loading or rendering diagram...' : 'Please select a diagram to view.'}
          </div>
        )}
      </div>
    </div>
  );
}
