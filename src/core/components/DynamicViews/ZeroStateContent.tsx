import React, { useMemo, useEffect, useState } from 'react';
import { snakeToTitleCase } from '@/core/components/common/utils/casing';

// --- External Libraries ---
import ReactMarkdown from 'react-markdown';

// Assuming your build system can load the markdown file as a string
import RichZeroStateContent from './ZeroStateContent.md?raw';

import { Typography, Button, Space, Row, Col, Card, Empty } from 'antd';
import { Filter, FileText } from 'lucide-react';

const { Text } = Typography;

// Unique delimiter to cleanly separate the prose from the mermaid code
const MERMAID_DELIMITER = '```mermaid';
const MERMAID_END_DELIMITER = '```';

// =====================================================================
// 1. Mermaid Component: Handles Initialization and Rendering of Diagrams
// =====================================================================

interface MermaidComponentProps {
    chart: string;
    id: string; // Unique ID for each mermaid diagram
}

const MermaidComponent: React.FC<MermaidComponentProps> = ({ chart, id }) => {
    const [svgContent, setSvgContent] = useState<string | null>(null);

    useEffect(() => {
        if (chart) {
            const renderMermaid = async () => {
                try {
                    const mermaid = (await import('mermaid')).default;
                    // Initialize Mermaid (theme: neutral is generally good for dark/light mode compatibility)
                    mermaid.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'loose' });
                    // Use mermaid.render() to get the SVG string
                    const { svg } = await mermaid.render(id, chart);
                    setSvgContent(svg);
                } catch (e: any) {
                    console.error("Mermaid rendering failed", e);
                    setSvgContent(`<div style="color:var(--color-error); text-align:center; padding: 10px;">
                        Error rendering diagram: Check Mermaid syntax.<br/>
                    </div>`);
                }
            };
            renderMermaid();
        }
    }, [chart, id]);

    if (!svgContent) {
        return <div className="mermaid-diagram-placeholder text-center text-[var(--color-text-secondary)] py-4">Loading process diagram...</div>;
    }

    return (
        <div
            // Injects the generated SVG content
            dangerouslySetInnerHTML={{ __html: svgContent }}
            className="mermaid-diagram flex justify-center items-center p-4 rounded-lg"
            style={{
                minHeight: '100px',
                backgroundColor: 'var(--color-background-secondary)',
                border: '1px solid var(--color-border)'
            }}
        />
    );
};


// ==========================================================================
// 2. Custom Markdown Renderer: Implements 2-Column Layout
// ==========================================================================

const CustomMarkdownRenderer: React.FC<{ content: string; entityTitle: string }> = ({ content, entityTitle }) => {
    const processedContent = useMemo(() => {
        return content.replace(/{ENTITY_TITLE}/g, entityTitle);
    }, [content, entityTitle]);

    // 1. Split content into prose and mermaid code using unique delimiters
    let textContent = processedContent;
    let mermaidChart: string | null = null;

    const MERMAID_REGEX_GLOBAL = /```mermaid[\s\S]*?```/g;
    if (processedContent.includes(MERMAID_DELIMITER)) {
        // Get the part after '```mermaid'
        const afterStart = processedContent.split(MERMAID_DELIMITER)[1] || '';
        // Get the part before '```'
        mermaidChart = afterStart.split(MERMAID_END_DELIMITER)[0]?.trim() || null;

        // Remove the entire mermaid block from the text content for ReactMarkdown
        textContent = processedContent.replace(MERMAID_REGEX_GLOBAL, '').trim();
    }

    // Regex for removing the entire code block for ReactMarkdown processing

    // 2. Define custom Ant Design components for rich styling
    const components: any = {
        h1: ({ children }: any) => <h1 className="text-h1 mt-4 mb-2 text-center">{children}</h1>,
        h2: ({ children }: any) => <h2 className="text-h2 mt-3 mb-2 text-center">{children}</h2>,
        h3: ({ children }: any) => <h3 className="text-h3 mt-3 mb-2 text-[var(--color-primary)]">{children}</h3>,
        p: ({ children }: any) => <p className="text-[var(--color-text-secondary)] text-center text-sm">{children}</p>,
        // List styling is critical for left alignment
        ul: ({ children }: any) => <ul className="text-left list-disc list-inside space-y-2 pl-4 text-[var(--color-text)]">{children}</ul>,
        li: ({ children }: any) => <li className="text-sm">{children}</li>,
    };

    // Determine if we need a two-column layout
    const isTwoColumn = !!mermaidChart;

    // If two-column, we need to extract the bullet points section to put it next to the diagram
    let proseContent = textContent;
    let bulletContent = null;

    if (isTwoColumn) {
        // Simple extraction: assume content after "Key Features" is the bulleted list area.
        const parts = textContent.split('### Key Features:');
        if (parts.length > 1) {
            proseContent = parts[0].trim();
            bulletContent = parts[1].trim();
        } else {
            // If the structure isn't exactly matched, just render everything in one column
            bulletContent = textContent;
            proseContent = '';
        }
    }


    return (
        <Space direction="vertical" size="large" className="w-full pt-4">
            {/* 1. Main Title and Description (Always Full Width) */}
            <ReactMarkdown components={components}>
                {proseContent}
            </ReactMarkdown>

            {/* 2. Features/Diagram Layout (Conditional 2-column or 1-column) */}
            <Row gutter={[32, 32]} justify="center" className="w-full">
                {/* Features (Bullet Points) Column */}
                <Col xs={24} lg={isTwoColumn ? 12 : 24}>
                    <Card size="small" className="h-full border-dashed border-2 border-[var(--color-border-secondary)]">
                        <Space direction="vertical" size="middle" className="w-full">
                            {/* Render the extracted bullet points/features */}
                            <ReactMarkdown components={components}>
                                {isTwoColumn ? bulletContent : textContent}
                            </ReactMarkdown>
                        </Space>
                    </Card>
                </Col>

                {/* Mermaid Diagram Column */}
                {isTwoColumn && (
                    <Col xs={24} lg={12}>
                        <Space direction="vertical" size="small" className="w-full">
                            <Text type="secondary" className="uppercase text-xs font-medium w-full text-center">
                                {entityTitle} Process Flow
                            </Text>
                            <MermaidComponent
                                chart={mermaidChart!}
                                id={`mermaid-diagram-${entityTitle}`}
                            />
                        </Space>
                    </Col>
                )}
            </Row>
        </Space>
    );
};


// =====================================================================
// 3. ZeroStateContent Component: (Container - Remains largely the same)
// =====================================================================

interface DynamicViewsProps {
    searchConfig?: {
        serverSideFilters: string[];
        noDataMessage: string;
        searchButton: React.ReactNode;
    };
}

interface ZeroStateContentProps {
    entityName: string;
    globalFiltersElement: React.ReactNode | null;
    globalActionsElement: React.ReactNode;
    searchConfig?: DynamicViewsProps['searchConfig'];
    hasActiveFilters: boolean;
    clearFilters: () => void;
}

export const ZeroStateContent: React.FC<ZeroStateContentProps> = ({
    entityName,
    globalFiltersElement,
    globalActionsElement,
    searchConfig,
    hasActiveFilters,
    clearFilters,
}) => {
    const entityTitle = snakeToTitleCase(entityName);

    const mainTitle = useMemo(() => {
        if (hasActiveFilters) {
            return `No ${entityTitle} Match Current Filters 😞`;
        }
        return `Welcome to the ${entityTitle} Dashboard!`;
    }, [hasActiveFilters, entityTitle]);

    const description = useMemo(() => {
        if (hasActiveFilters) {
            return (
                <>
                    <p>
                        {searchConfig?.noDataMessage ||
                            'Your current filters are too restrictive.'}
                    </p>
                    <p>
                        **Try removing some filters** to see all available records.
                    </p>
                </>
            );
        }
        return null;
    }, [hasActiveFilters, searchConfig]);

    const extraContent = useMemo(() => {
        if (hasActiveFilters) {
            return (
                <Button
                    type="primary"
                    size="large"
                    icon={<Filter size={16} />}
                    onClick={clearFilters}
                    className="mt-4 shadow-md"
                >
                    Clear All Filters
                </Button>
            );
        }

        // Display GlobalActions prominently in the zero-state
        return (
            <Space direction="vertical" align="center" size="large" className="w-full">
                {globalActionsElement}
            </Space>
        );

    }, [hasActiveFilters, clearFilters, globalActionsElement]);


    return (
        <div className="py-8 space-y-4">
            {/* 1. Filters (Top-level element) */}
            {globalFiltersElement}

            {/* 2. Main Content Card (The Rich Container) */}
            <Card bordered={false} className="shadow-2xl bg-[var(--color-component-background)] rounded-xl p-4">
                <Empty
                    image={hasActiveFilters ? Empty.PRESENTED_IMAGE_DEFAULT : <FileText size={48} className="text-primary" />}
                    description={
                        <div className="mt-4 max-w-6xl mx-auto">
                            {/* Main Page Title (Top-level container title) */}
                            <h1 className="text-h3 text-center mb-2 text-[var(--color-text-title)]">{mainTitle}</h1>
                            <div className="text-[var(--color-text-secondary)] text-sm mb-6 text-center">
                                {description}
                            </div>

                            {/* Conditional Rich Content from MD file */}
                            {!hasActiveFilters ? (
                                <div className="markdown-content mt-8">
                                    <CustomMarkdownRenderer
                                        content={RichZeroStateContent}
                                        entityTitle={entityTitle}
                                    />
                                </div>
                            ) : (
                                // If filters are active, we center the action/filter clearing button below the text
                                <div className="w-full text-center">
                                    {extraContent}
                                </div>
                            )}
                        </div>
                    }
                >
                    {/* When not filtered, the actions are handled inside the CustomMarkdownRenderer's flow */}
                    {!hasActiveFilters && (
                        <div className="mt-6 w-full text-center">
                            {extraContent}
                        </div>
                    )}
                </Empty>
            </Card>
        </div>
    );
};
export default ZeroStateContent;
