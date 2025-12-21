// DocView.tsx
import React, { useRef } from 'react';
import { Typography, Divider, Row, Col, Button } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import { useReactToPrint } from 'react-to-print';

const { Text, Title } = Typography;

// [Interface definitions remain the same]
interface FieldConfig {
  fieldPath: string;
  label?: string;
  order?: number;
  imagePath?: string;
}

interface GroupConfig {
  name: string;
  fields: FieldConfig[];
  show_group_name?: boolean;
}

interface DocTemplateSettings {
  header?: {
    showLogo?: boolean;
    companyName?: string;
    tagline?: string;
    backgroundColor?: string;
    textColor?: string;
    logoUrl?: string;
  };
  footer?: {
    showFooter?: boolean;
    text?: string;
    backgroundColor?: string;
    textColor?: string;
  };
  layout?: {
    margins?: {
      top: number;
      left: number;
      right: number;
      bottom: number;
    };
    spacing?: number;
    fontSize?: number;
    fontFamily?: string;
  };
  branding?: {
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
  };
}

interface DocViewProps {
  data: Record<string, any>;
  viewConfig: {
    details_overview: {
      groups: GroupConfig[];
    };
  };
  templateSettings: DocTemplateSettings;
  templateStyles: Record<string, React.CSSProperties>;
  templateConfig: TemplateConfig; 
}

interface LayoutFieldConfig {
  label: string;
  fieldPath: string;
  isMapLink?: boolean;
  latPath?: string;
  lngPath?: string;
}

interface InfoBoxConfig {
  title: string;
  fields: LayoutFieldConfig[];
}

interface SignatureConfig {
  label: string;
  imagePath: string;
  signedByPath: string;
}

type LayoutBlock = 
  | { type: 'two_column_info_box'; left: InfoBoxConfig; right: InfoBoxConfig }
  | { type: 'inline_fields'; fields: LayoutFieldConfig[]; columns?: number }
  | { type: 'description_section'; fields: LayoutFieldConfig[] }
  | { type: 'two_column_fields'; left: LayoutFieldConfig; right: LayoutFieldConfig }
  | { type: 'signature_block'; left?: SignatureConfig; right?: SignatureConfig };

interface TemplateConfig {
  layout_blocks: LayoutBlock[];
}
// [getNestedValue remains the same]
const getNestedValue = (obj: Record<string, any>, path: string): string => {
  if (!obj) return ' - - ';
  
  if (obj.hasOwnProperty(path)) {
    const result = obj[path];
    return result === undefined || result === null || result === '' ? ' - - ' : String(result);
  }
  
  const result = path?.split('.')?.reduce((acc, part) => acc && acc[part], obj);
  return result === undefined || result === null || result === '' ? ' - - ' : String(result);
};

// =========================================================================
// UPDATED renderField to use flex/inline styles from templateStyles
// =========================================================================
const renderField = (
  config: LayoutFieldConfig, 
  data: Record<string, any>, 
  styles: (className: string) => React.CSSProperties
) => {
  const value = getNestedValue(data, config.fieldPath);
  
  if (config.isMapLink && value !== ' - - ' && config.latPath && config.lngPath) {
    const lat = getNestedValue(data, config.latPath);
    const lng = getNestedValue(data, config.lngPath);
    const mapUrl = `https://maps.google.com/maps?q=${lat},${lng}`;
    return (
      <div key={config.fieldPath} style={styles('.doc-field')}>
        <Text style={styles('.doc-label')}>{config.label}:</Text>
        <a href={mapUrl} target="_blank" rel="noopener noreferrer">
          <Text strong style={styles('.doc-value')}>View on Map</Text>
        </a>
      </div>
    );
  }

  return (
    <div key={config.fieldPath} style={styles('.doc-field')}>
      <Text style={styles('.doc-label')}>{config.label}:</Text>
      <Text strong style={styles('.doc-value')}>{value}</Text>
    </div>
  );
};
// =========================================================================

const renderDescriptionField = (
  config: LayoutFieldConfig, 
  data: Record<string, any>, 
  accentColor?: string
) => {
  return (
    <div key={config.fieldPath} style={{ marginBottom: '16px' }}>
      <Text strong style={{ display: 'block' }}>
        {config.label}:
      </Text>
      <div style={{ border: `1px solid ${accentColor}`, padding: '8px', minHeight: '80px', marginTop: '8px' }}>
        <Text>{getNestedValue(data, config.fieldPath)}</Text>
      </div>
    </div>
  );
};

const renderSignatureField = (
  config: SignatureConfig, 
  data: Record<string, any>, 
  accentColor?: string
) => (
  <Col span={12} key={config.imagePath} style={{ textAlign: 'center' }}>
    <Text strong>{config.label}:</Text>
    <div style={{ borderBottom: `1px solid ${accentColor || '#ccc'}`, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {getNestedValue(data, config.imagePath) !== ' - - ' && (
        <img src={getNestedValue(data, config.imagePath)} alt={config.label} style={{ maxWidth: '100%', maxHeight: '100%' }} />
      )}
    </div>
    <Text style={{ fontSize: '0.8em', color: '#888' }}>
      Signed by: {getNestedValue(data, config.signedByPath)}
    </Text>
  </Col>
);

const DocView: React.FC<DocViewProps> = ({
  data,
  viewConfig,
  templateSettings,
  templateStyles,
  templateConfig, 
}) => {
  const componentRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: 'Service Report',
  });

  const { header, footer, layout, branding } = templateSettings;
  const getStyle = (className: string) => templateStyles?.[className] || {};

  const docContainerStyle = {
    ...getStyle('.doc-view-container'),
    padding: layout?.margins ? `${layout.margins.top}px ${layout.margins.right}px ${layout.margins.bottom}px ${layout.margins.left}px` : undefined,
    fontFamily: layout?.fontFamily,
    fontSize: layout?.fontSize ? `${layout.fontSize}px` : undefined,
    backgroundColor: getStyle('.doc-view-container')?.background,
  };

  const headerStyle = {
    ...getStyle('.doc-header'),
    backgroundColor: header?.backgroundColor,
  };

  const footerStyle = {
    ...getStyle('.doc-footer'),
    backgroundColor: footer?.backgroundColor,
    color: footer?.textColor,
  };

  // Helper function to render an Info Box (Client Info / Service Details)
  const renderInfoBox = (config: InfoBoxConfig, data: Record<string, any>, getStyle: (className: string) => React.CSSProperties) => (
    <Col span={12}>
      <Title level={5}>{config.title}</Title>
      <Row gutter={[16, 16]}>
        {config.fields.map(field => (
          <Col span={12} key={field.fieldPath}>
            {renderField(field, data, getStyle)}
          </Col>
        ))}
      </Row>
    </Col>
  );

  // Main dynamic rendering function
  const renderLayoutBlocks = (blocks: LayoutBlock[], data: Record<string, any>, branding: DocTemplateSettings['branding'], getStyle: (className: string) => React.CSSProperties) => {
    return blocks.map((block, index) => {
      const divider = <Divider key={`divider-${index}`} style={{ margin: '16px 0', borderColor: branding?.accentColor }} />;
      const content = (() => {
        switch (block.type) {
          case 'two_column_info_box':
            return (
              <Row key={index} gutter={[24, 16]}>
                {renderInfoBox(block.left, data, getStyle)}
                {renderInfoBox(block.right, data, getStyle)}
              </Row>
            );
          case 'inline_fields':
            const span = 24 / (block.columns || 4);
            return (
              <Row key={index} gutter={[24, 16]}>
                {block.fields.map(field => (
                  // For inline fields, we manually wrap and apply styles for better control
                  <Col span={span} key={field.fieldPath}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                      <Text style={{ fontWeight: 400, color: '#666' }}>{field.label}:</Text>
                      {field.isMapLink && getNestedValue(data, field.fieldPath) !== ' - - ' ? (
                        <a href={`https://maps.google.com/maps?q=$${getNestedValue(data, field.latPath!)},${getNestedValue(data, field.lngPath!)}`} target="_blank" rel="noopener noreferrer">
                          <Text strong>View on Map</Text>
                        </a>
                      ) : (
                        <Text strong>{getNestedValue(data, field.fieldPath)}</Text>
                      )}
                    </div>
                  </Col>
                ))}
              </Row>
            );
          case 'description_section':
            return (
              <Row key={index}>
                <Col span={24}>
                  {block.fields.map(field => (
                    renderDescriptionField(field, data, branding?.accentColor)
                  ))}
                </Col>
              </Row>
            );
          case 'two_column_fields':
            return (
              <Row key={index} gutter={[24, 16]}>
                <Col span={12}>{renderField(block.left, data, getStyle)}</Col>
                <Col span={12}>{renderField(block.right, data, getStyle)}</Col>
              </Row>
            );
          case 'signature_block':
            return (
              <Row key={index} gutter={[24, 16]}>
                {block.left && renderSignatureField(block.left, data, branding?.accentColor)}
                {block.right && renderSignatureField(block.right, data, branding?.accentColor)}
              </Row>
            );
          default:
            return null;
        }
      })();
      
      return (
        <React.Fragment key={index}>
          {content}
          {index < blocks.length - 1 && divider}
        </React.Fragment>
      );
    });
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px', backgroundColor: '#f0f2f5' }}>
        <div ref={componentRef} style={{ maxWidth: '90%', margin: '0 auto', background: 'white', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' }}>
          {/* Main Document Content */}
          <div style={docContainerStyle}>
            {/* Dynamic Header from Template*/}
            {header && (
              <>
                <Row justify="space-between" align="middle" style={headerStyle}>
                  <Col>
                    {header.showLogo && header.logoUrl && (
                      <img src={header.logoUrl} alt="Company Logo" style={{ height: 50, marginBottom: 10 }} />
                    )}
                    <Title level={2} style={{ ...getStyle('.doc-header .doc-title'), color: branding?.primaryColor, margin: 0 }}>
                      {header.companyName}
                    </Title>
                    <Text style={{ ...getStyle('.doc-header .doc-subtitle'), color: header?.textColor }}>
                      {header.tagline}
                    </Text>
                  </Col>
                  <Col style={{ textAlign: 'right' }}>
                    <Title level={4} style={{ ...getStyle('.doc-header-right-title'), color: branding?.primaryColor }}>SERVICE REPORT</Title>
                    <Text strong style={{ color: branding?.secondaryColor }}>
                      #{getNestedValue(data, 'display_id')}
                    </Text>
                  </Col>
                </Row>
                <Divider style={{ borderColor: branding?.primaryColor, margin: '16px 0' }} />
              </>
            )}

            {/* Document Body - DYNAMICALLY RENDERED */}
            <div style={getStyle('.doc-body')}>
              {renderLayoutBlocks(templateConfig.layout_blocks, data, branding, getStyle)}
            </div>

            {/* Dynamic Footer from Template*/}
            {footer?.showFooter && (
              <div style={footerStyle}>
                <Text style={{ color: footer.textColor }}>{footer.text}</Text>
              </div>
            )}
          </div>
        </div>
      </div>
      <div style={{ padding: '12px 24px', textAlign: 'right' }}>
        <Button 
          type="primary" 
          icon={<PrinterOutlined />} 
          onClick={handlePrint}
        >
          Print
        </Button>
      </div>
    </div>
  );
};

export default DocView;

