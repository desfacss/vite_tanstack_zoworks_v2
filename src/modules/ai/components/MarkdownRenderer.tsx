import React, { useEffect, useRef, useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
// import mermaid from 'mermaid'; // TODO: Install mermaid if needed for diagram support

// Dashboard-style color palette for charts
const CHART_COLORS = [
    '#1677ff', // Primary blue
    '#3B82F6', // Blue 500
    '#22C55E', // Green 500
    '#F59E0B', // Amber 500
    '#EF4444', // Red 500
    '#8B5CF6', // Purple 500
    '#0EA5E9', // Sky 500
    '#14B8A6', // Teal 500
    '#F97316', // Orange 500
    '#EC4899', // Pink 500
    '#6366F1', // Indigo 500
    '#10B981', // Emerald 500
];

interface MarkdownRendererProps {
    content: string;
    className?: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className }) => {
    return (
        <div className={className} style={{ lineHeight: 1.6 }}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    // Table styling
                    table: ({ children }) => (
                        <div style={{ overflowX: 'auto', margin: '12px 0' }}>
                            <table style={{
                                width: '100%',
                                borderCollapse: 'collapse',
                                fontSize: 13,
                            }}>
                                {children}
                            </table>
                        </div>
                    ),
                    thead: ({ children }) => (
                        <thead style={{ background: '#fafafa' }}>{children}</thead>
                    ),
                    th: ({ children }) => (
                        <th style={{
                            padding: '8px 12px',
                            textAlign: 'left',
                            borderBottom: '2px solid #e8e8e8',
                            fontWeight: 600,
                        }}>
                            {children}
                        </th>
                    ),
                    td: ({ children }) => (
                        <td style={{
                            padding: '8px 12px',
                            borderBottom: '1px solid #f0f0f0',
                        }}>
                            {children}
                        </td>
                    ),
                    // Code block styling
                    code: ({ className, children, ...props }) => {
                        const isInline = !className;
                        if (isInline) {
                            return (
                                <code
                                    style={{
                                        background: '#f5f5f5',
                                        padding: '2px 6px',
                                        borderRadius: 4,
                                        fontSize: '0.9em',
                                        fontFamily: 'monospace',
                                    }}
                                    {...props}
                                >
                                    {children}
                                </code>
                            );
                        }
                        return (
                            <pre style={{
                                background: '#f5f5f5',
                                padding: 12,
                                borderRadius: 6,
                                overflow: 'auto',
                                fontSize: 12,
                                margin: '12px 0',
                            }}>
                                <code className={className} {...props}>
                                    {children}
                                </code>
                            </pre>
                        );
                    },
                    // List styling
                    ul: ({ children }) => (
                        <ul style={{ paddingLeft: 20, margin: '8px 0' }}>{children}</ul>
                    ),
                    ol: ({ children }) => (
                        <ol style={{ paddingLeft: 20, margin: '8px 0' }}>{children}</ol>
                    ),
                    li: ({ children }) => (
                        <li style={{ marginBottom: 4 }}>{children}</li>
                    ),
                    // Paragraph styling
                    p: ({ children }) => (
                        <p style={{ margin: '8px 0' }}>{children}</p>
                    ),
                    // Heading styling
                    h1: ({ children }) => (
                        <h1 style={{ fontSize: 20, fontWeight: 600, margin: '16px 0 8px' }}>{children}</h1>
                    ),
                    h2: ({ children }) => (
                        <h2 style={{ fontSize: 18, fontWeight: 600, margin: '14px 0 6px' }}>{children}</h2>
                    ),
                    h3: ({ children }) => (
                        <h3 style={{ fontSize: 16, fontWeight: 600, margin: '12px 0 4px' }}>{children}</h3>
                    ),
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
};

export default MarkdownRenderer;
