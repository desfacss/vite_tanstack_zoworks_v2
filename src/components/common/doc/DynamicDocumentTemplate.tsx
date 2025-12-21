import React from 'react';

interface DynamicDocumentTemplateProps {
  documentType: string;
  formData: any;
  templateSettings?: any;
  companyName?: string;
}

const DynamicDocumentTemplate: React.FC<DynamicDocumentTemplateProps> = ({
  documentType,
  formData,
  templateSettings,
  companyName = 'Your Company Name'
}) => {
  const settings = templateSettings || getDefaultSettings();

  const calculateTotal = () => {
    if (!formData.items || !Array.isArray(formData.items)) return 0;
    return formData.items.reduce((total: number, item: any) => {
      return total + ((item.quantity || 0) * (item.unitPrice || 0));
    }, 0);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    const [hours, minutes, seconds] = timeStr.split(':');
    const date = new Date();
    date.setHours(parseInt(hours, 10));
    date.setMinutes(parseInt(minutes, 10));
    date.setSeconds(parseInt(seconds, 10));
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getDocumentTitle = () => {
    switch (documentType) {
      case 'doc_invoices': return 'INVOICE';
      case 'purchase-order': return 'PURCHASE ORDER';
      case 'credit-note': return 'CREDIT NOTE';
      case 'doc_service_reports': return 'SERVICE REPORT';
      default: return 'DOCUMENT';
    }
  };

  const getDocumentNumber = () => {
    return formData?.display_id || formData?.invoiceNumber || 
           formData?.poNumber || 
           formData?.creditNoteNumber || 
           formData?.reportNumber || 
           'N/A';
  };

  const getClientInfo = () => {
    // The new schema uses a nested 'client' object directly
    return formData?.client || formData?.billedTo || formData?.vendor || formData?.creditedTo || {};
  };

  // --- Start of styles moved inside the component ---
  const infoRowStyle = {
    display: 'flex', 
    justifyContent: 'space-between' 
  };

  const infoLabelStyle = { 
    color: '#666', 
    fontWeight: '500' 
  };

  const infoValueStyle = { 
    fontWeight: '600' 
  };

  const sectionHeadingStyle = (settings: any) => ({
    fontSize: '1.1em', 
    fontWeight: '600', 
    color: '#333',
    marginBottom: 12,
    borderBottom: `2px solid ${settings.branding?.accentColor || '#faad14'}`,
    paddingBottom: 4
  });

  const fieldValueStyle = { 
    color: '#555', 
    backgroundColor: '#f9f9f9',
    padding: '8px 12px',
    borderRadius: '4px',
    border: '1px solid #e8e8e8',
    margin: 0
  };

  const contentBlockStyle = {
    backgroundColor: '#f9f9f9',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #e8e8e8'
  };

  const contentParagraphStyle = { 
    color: '#555', 
    whiteSpace: 'pre-line' as 'pre-line',
    margin: 0,
    lineHeight: 1.6
  };

  const notesParagraphStyle = { 
    color: '#555', 
    whiteSpace: 'pre-line' as 'pre-line',
    backgroundColor: '#f9f9f9',
    padding: '12px 16px',
    borderRadius: '6px',
    border: '1px solid #e8e8e8',
    margin: 0
  };

  const signatureHeadingStyle = { 
    fontSize: '1.1em', 
    fontWeight: '600', 
    color: '#333',
    marginBottom: 12
  };

  const signatureImageStyle = { 
    width: '200px', 
    height: '80px', 
    border: '1px solid #d9d9d9', 
    borderRadius: '4px',
    backgroundColor: '#fafafa'
  };

  const signatureTextStyle = { 
    fontSize: '0.9em', 
    color: '#666',
    marginTop: 8,
    margin: 0
  };
  // --- End of styles moved inside the component ---


  const containerStyle = {
    maxWidth: '210mm',
    margin: '0 auto',
    background: 'white',
    padding: settings.layout?.margins ? 
      `${settings.layout.margins.top}px ${settings.layout.margins.right}px ${settings.layout.margins.bottom}px ${settings.layout.margins.left}px` : 
      '32px',
    fontFamily: settings.layout?.fontFamily || 'Arial, sans-serif',
    fontSize: settings.layout?.fontSize || 14,
    lineHeight: 1.5,
    color: '#333',
    minHeight: '297mm',
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: settings.layout?.spacing || 32,
    paddingBottom: 16,
    borderBottom: `3px solid ${settings.branding?.primaryColor || '#1890ff'}`,
    backgroundColor: settings.header?.backgroundColor || 'transparent',
    color: settings.header?.textColor || '#000',
    padding: settings.header?.backgroundColor !== '#ffffff' ? '16px' : '0',
    borderRadius: settings.header?.backgroundColor !== '#ffffff' ? '8px' : '0',
  };

  const clientInfo = getClientInfo();

  return (
    <div style={containerStyle}>
      {/* Header */}
      {settings.header?.showLogo !== false && (
        <header style={headerStyle}>
          <div>
            <h1 style={{ 
              fontSize: '2em', 
              fontWeight: 'bold', 
              color: settings.branding?.primaryColor || '#1890ff',
              margin: 0,
              marginBottom: 4
            }}>
              {settings.header?.companyName || companyName}
            </h1>
            {settings.header?.tagline && (
              <p style={{ 
                color: settings.header?.textColor || '#666', 
                margin: 0,
                fontSize: '0.9em'
              }}>
                {settings.header.tagline}
              </p>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <h2 style={{ 
              fontSize: '1.8em', 
              fontWeight: 'bold', 
              color: '#333',
              margin: 0,
              marginBottom: 4
            }}>
              {getDocumentTitle()}
            </h2>
            <p style={{ 
              color: '#666', 
              margin: 0,
              fontSize: '0.9em'
            }}>
              #{getDocumentNumber()}
            </p>
          </div>
        </header>
      )}

      {/* Document Info */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: settings.layout?.spacing || 32,
        marginBottom: settings.layout?.spacing || 32
      }}>
        <div>
          <h3 style={{ 
            fontSize: '1.2em', 
            fontWeight: '600', 
            color: '#333',
            marginBottom: 12,
            borderBottom: `2px solid ${settings.branding?.secondaryColor || '#52c41a'}`,
            paddingBottom: 4
          }}>
            {getClientLabel()}:
          </h3>
          <div style={{ color: '#555', lineHeight: 1.6 }}>
            <p style={{ fontWeight: '600', margin: '0 0 4px 0' }}>
              {clientInfo.companyName}
            </p>
            <p style={{ whiteSpace: 'pre-line', margin: '0 0 4px 0' }}>
              {clientInfo.address}
            </p>
            {clientInfo.email && (
              <p style={{ 
                color: settings.branding?.primaryColor || '#1890ff',
                margin: 0
              }}>
                {clientInfo.email}
              </p>
            )}
          </div>
        </div>
        <div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {renderDateFields()}
          </div>
        </div>
      </div>

      {/* Service Report specific fields */}
      {documentType === 'doc_service_reports' && (
        <>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: settings.layout?.spacing || 32,
            marginBottom: settings.layout?.spacing || 32
          }}>
            {formData?.assetId && (
              <div>
                <h3 style={sectionHeadingStyle(settings)}>Asset ID:</h3>
                <p style={fieldValueStyle}>{formData.assetId}</p>
              </div>
            )}
            {formData?.serviceType && (
              <div>
                <h3 style={sectionHeadingStyle(settings)}>Service Type:</h3>
                <p style={fieldValueStyle}>{formData.serviceType}</p>
              </div>
            )}
            {formData?.observation && (
              <div>
                <h3 style={sectionHeadingStyle(settings)}>Under Observation:</h3>
                <p style={fieldValueStyle}>{formData.observation}</p>
              </div>
            )}
            {formData?.technician && (
              <div>
                <h3 style={sectionHeadingStyle(settings)}>Technician:</h3>
                <p style={fieldValueStyle}>{formData.technician}</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Description */}
      {formData?.description && (
        <div style={{ marginBottom: settings.layout?.spacing || 32 }}>
          <h3 style={sectionHeadingStyle(settings)}>
            Description:
          </h3>
          <div style={contentBlockStyle}>
            <p style={contentParagraphStyle}>
              {formData.description}
            </p>
          </div>
        </div>
      )}

      {/* Items Table */}
      {formData?.items && Array.isArray(formData.items) && formData.items.length > 0 && (
        <div style={{ marginBottom: settings.layout?.spacing || 32 }}>
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse',
            border: '1px solid #e8e8e8',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            <thead>
              <tr style={{ 
                backgroundColor: settings.branding?.primaryColor || '#1890ff',
                color: 'white'
              }}>
                <th style={{ 
                  border: 'none',
                  padding: '12px 16px', 
                  textAlign: 'left',
                  fontWeight: '600'
                }}>
                  Description
                </th>
                <th style={{ 
                  border: 'none',
                  padding: '12px 16px', 
                  textAlign: 'center',
                  fontWeight: '600'
                }}>
                  Quantity
                </th>
                <th style={{ 
                  border: 'none',
                  padding: '12px 16px', 
                  textAlign: 'right',
                  fontWeight: '600'
                }}>
                  Unit Price
                </th>
                {documentType === 'purchase-order' && (
                  <th style={{ 
                    border: 'none',
                    padding: '12px 16px', 
                    textAlign: 'center',
                    fontWeight: '600'
                  }}>
                    Expected Delivery
                  </th>
                )}
                <th style={{ 
                  border: 'none',
                  padding: '12px 16px', 
                  textAlign: 'right',
                  fontWeight: '600'
                }}>
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {formData?.items.map((item: any, index: number) => (
                <tr key={index} style={{ 
                  borderBottom: index < formData.items.length - 1 ? '1px solid #f0f0f0' : 'none',
                  backgroundColor: index % 2 === 0 ? '#fafafa' : 'white'
                }}>
                  <td style={{ 
                    border: 'none',
                    padding: '12px 16px',
                    verticalAlign: 'top'
                  }}>
                    {item.description}
                  </td>
                  <td style={{ 
                    border: 'none',
                    padding: '12px 16px', 
                    textAlign: 'center',
                    verticalAlign: 'top'
                  }}>
                    {item.quantity}
                  </td>
                  <td style={{ 
                    border: 'none',
                    padding: '12px 16px', 
                    textAlign: 'right',
                    verticalAlign: 'top'
                  }}>
                    {formatCurrency(item.unitPrice)}
                  </td>
                  {documentType === 'purchase-order' && (
                    <td style={{ 
                      border: 'none',
                      padding: '12px 16px', 
                      textAlign: 'center',
                      verticalAlign: 'top'
                    }}>
                      {item.expectedDelivery ? formatDate(item.expectedDelivery) : 'N/A'}
                    </td>
                  )}
                  <td style={{ 
                    border: 'none',
                    padding: '12px 16px', 
                    textAlign: 'right',
                    fontWeight: '600',
                    verticalAlign: 'top'
                  }}>
                    {formatCurrency((item.quantity || 0) * (item.unitPrice || 0))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Total */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <div style={{ width: '300px' }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                backgroundColor: settings.branding?.primaryColor || '#1890ff',
                color: 'white',
                padding: '16px 20px',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
              }}>
                <span style={{ fontSize: '1.2em', fontWeight: '600' }}>
                  {getTotalLabel()}:
                </span>
                <span style={{ fontSize: '1.4em', fontWeight: 'bold' }}>
                  {formatCurrency(calculateTotal())}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      {formData?.notes && (
        <div style={{ marginBottom: settings.layout?.spacing || 32 }}>
          <h3 style={sectionHeadingStyle(settings)}>
            Notes:
          </h3>
          <p style={notesParagraphStyle}>
            {formData.notes}
          </p>
        </div>
      )}

      {/* Signatures */}
      <div style={{ 
        marginTop: settings.layout?.spacing || 32,
        paddingTop: 16,
        borderTop: '1px solid #e8e8e8',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: settings.layout?.spacing || 32
      }}>
        {formData?.technicianSignature && (
          <div>
            <h3 style={signatureHeadingStyle}>Technician Signature:</h3>
            <img 
              src={formData.technicianSignature} 
              alt="Technician Signature" 
              style={signatureImageStyle}
            />
            {formData.technician && (
              <p style={signatureTextStyle}>
                Signed by: {formData.technician}
              </p>
            )}
          </div>
        )}
        {formData?.clientSignature && (
          <div>
            <h3 style={signatureHeadingStyle}>Client Signature:</h3>
            <img 
              src={formData.clientSignature} 
              alt="Client Signature" 
              style={signatureImageStyle}
            />
            {clientInfo.companyName && (
              <p style={signatureTextStyle}>
                Signed for: {clientInfo.companyName}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      {settings.footer?.showFooter !== false && (
        <footer style={{ 
          marginTop: 'auto',
          paddingTop: 24,
          borderTop: '1px solid #e8e8e8',
          textAlign: 'center',
          backgroundColor: settings.footer?.backgroundColor || '#f5f5f5',
          color: settings.footer?.textColor || '#666',
          padding: '16px',
          borderRadius: '6px',
          marginBottom: 0
        }}>
          <p style={{ margin: 0, fontSize: '0.9em' }}>
            {settings.footer?.text || getDefaultFooterText()}
          </p>
        </footer>
      )}
    </div>
  );

  function getClientLabel() {
    switch (documentType) {
      case 'doc_invoices': return 'Bill To';
      case 'purchase-order': return 'Vendor';
      case 'credit-note': return 'Credited To';
      case 'doc_service_reports': return 'Client';
      default: return 'Client';
    }
  }

  function getTotalLabel() {
    switch (documentType) {
      case 'credit-note': return 'Credit Amount';
      default: return 'Total Amount';
    }
  }

  function getDefaultFooterText() {
    switch (documentType) {
      case 'doc_invoices': return 'Thank you for your business!';
      case 'purchase-order': return 'Please confirm receipt of this purchase order';
      case 'credit-note': return 'This credit note has been applied to your account';
      case 'doc_service_reports': return 'Service completed successfully. Thank you for choosing our services.';
      default: return 'Thank you for your business!';
    }
  }

  function renderDateFields() {
    const fields = [];
    
    if (formData?.issueDate) {
      fields.push(
        <div key="issueDate" style={infoRowStyle}>
          <span style={infoLabelStyle}>Issue Date:</span>
          <span style={infoValueStyle}>{formatDate(formData?.issueDate)}</span>
        </div>
      );
    }
    
    if (formData?.dueDate) {
      fields.push(
        <div key="dueDate" style={infoRowStyle}>
          <span style={infoLabelStyle}>Due Date:</span>
          <span style={infoValueStyle}>{formatDate(formData?.dueDate)}</span>
        </div>
      );
    }
    
    if (formData?.serviceDate) {
      fields.push(
        <div key="serviceDate" style={infoRowStyle}>
          <span style={infoLabelStyle}>Service Date:</span>
          <span style={infoValueStyle}>{formatDate(formData?.serviceDate)}</span>
        </div>
      );
    }
    
    if (formData?.inTime) {
      fields.push(
        <div key="inTime" style={infoRowStyle}>
          <span style={infoLabelStyle}>In Time:</span>
          <span style={infoValueStyle}>{formatTime(formData?.inTime)}</span>
        </div>
      );
    }
    
    if (formData?.outTime) {
      fields.push(
        <div key="outTime" style={infoRowStyle}>
          <span style={infoLabelStyle}>Out Time:</span>
          <span style={infoValueStyle}>{formatTime(formData?.outTime)}</span>
        </div>
      );
    }
    
    if (formData?.originalInvoice) {
      fields.push(
        <div key="originalInvoice" style={infoRowStyle}>
          <span style={infoLabelStyle}>Original Invoice:</span>
          <span style={infoValueStyle}>{formData?.originalInvoice}</span>
        </div>
      );
    }
    
    return fields;
  }
};

function getDefaultSettings() {
  return {
    header: {
      showLogo: true,
      companyName: 'Demo Company Inc.',
      tagline: 'Professional Services',
      backgroundColor: '#ffffff',
      textColor: '#000000',
    },
    footer: {
      showFooter: true,
      text: 'Thank you for your business!',
      backgroundColor: '#f5f5f5',
      textColor: '#666666',
    },
    layout: {
      margins: { top: 20, bottom: 20, left: 20, right: 20 },
      spacing: 16,
      fontSize: 14,
      fontFamily: 'Arial, sans-serif',
    },
    branding: {
      primaryColor: '#1890ff',
      secondaryColor: '#52c41a',
      accentColor: '#faad14',
    },
  };
}

export default DynamicDocumentTemplate;