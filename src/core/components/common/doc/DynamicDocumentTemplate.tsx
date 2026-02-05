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
    const parts = timeStr.split(':');
    const date = new Date();
    if (parts.length >= 2) {
      date.setHours(parseInt(parts[0], 10));
      date.setMinutes(parseInt(parts[1], 10));
    }
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
    return formData?.display_id || 'N/A';
  };

  const getClientInfo = () => {
    return formData?.client || {};
  };

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
              <p style={{ fontSize: '0.9em', margin: 0 }}>{settings.header.tagline}</p>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <h2 style={{ fontSize: '1.8em', fontWeight: 'bold', margin: 0 }}>{getDocumentTitle()}</h2>
            <p style={{ color: '#666', margin: 0 }}>#{getDocumentNumber()}</p>
          </div>
        </header>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginBottom: 32 }}>
        <div>
          <h3 style={{ borderBottom: `2px solid ${settings.branding?.secondaryColor || '#52c41a'}`, paddingBottom: 4 }}>
            {documentType === 'doc_invoices' ? 'Bill To:' : 'Client:'}
          </h3>
          <p style={{ fontWeight: '600', margin: '4px 0' }}>{clientInfo.companyName}</p>
          <p style={{ whiteSpace: 'pre-line', margin: '4px 0' }}>{clientInfo.address}</p>
          <p style={{ color: settings.branding?.primaryColor, margin: '4px 0' }}>{clientInfo.email}</p>
        </div>
        <div>
           {formData?.issueDate && (
             <div style={{ display: 'flex', justifyContent: 'space-between' }}>
               <span>Date:</span>
               <span>{formatDate(formData.issueDate)}</span>
             </div>
           )}
        </div>
      </div>

      {formData?.items && formData.items.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: settings.branding?.primaryColor, color: 'white' }}>
                <th style={{ padding: 12, textAlign: 'left' }}>Description</th>
                <th style={{ padding: 12, textAlign: 'center' }}>Qty</th>
                <th style={{ padding: 12, textAlign: 'right' }}>Price</th>
                <th style={{ padding: 12, textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {formData.items.map((item: any, idx: number) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: 12 }}>{item.description}</td>
                  <td style={{ padding: 12, textAlign: 'center' }}>{item.quantity}</td>
                  <td style={{ padding: 12, textAlign: 'right' }}>{formatCurrency(item.unitPrice)}</td>
                  <td style={{ padding: 12, textAlign: 'right' }}>{formatCurrency(item.quantity * item.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <div style={{ padding: '16px 20px', backgroundColor: settings.branding?.primaryColor, color: 'white', borderRadius: 8 }}>
               <span style={{ fontSize: '1.2em', marginRight: 16 }}>Total:</span>
               <span style={{ fontSize: '1.4em', fontWeight: 'bold' }}>{formatCurrency(calculateTotal())}</span>
            </div>
          </div>
        </div>
      )}

      {formData?.notes && (
        <div style={{ marginBottom: 32 }}>
          <h3 style={{ borderBottom: `2px solid ${settings.branding?.accentColor || '#faad14'}`, paddingBottom: 4 }}>Notes:</h3>
          <p style={{ whiteSpace: 'pre-line', padding: 12, background: '#f9f9f9', borderRadius: 4 }}>{formData.notes}</p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginTop: 32, borderTop: '1px solid #eee', paddingTop: 16 }}>
        {formData?.technicianSignature && (
          <div>
            <h4 style={{ margin: '0 0 8px 0' }}>Technician Signature</h4>
            <img src={formData.technicianSignature} alt="Tech Sig" style={{ width: 200, height: 80, border: '1px solid #eee' }} />
          </div>
        )}
        {formData?.clientSignature && (
          <div>
            <h4 style={{ margin: '0 0 8px 0' }}>Client Signature</h4>
            <img src={formData.clientSignature} alt="Client Sig" style={{ width: 200, height: 80, border: '1px solid #eee' }} />
          </div>
        )}
      </div>

      <footer style={{ marginTop: 'auto', textAlign: 'center', padding: 16, background: '#f5f5f5', borderRadius: 6 }}>
        <p style={{ margin: 0, fontSize: '0.9em', color: '#666' }}>{settings.footer?.text || 'Thank you!'}</p>
      </footer>
    </div>
  );
};

function getDefaultSettings() {
  return {
    header: { showLogo: true, companyName: 'Company Name', tagline: '', backgroundColor: '#ffffff', textColor: '#000000' },
    footer: { showFooter: true, text: 'Thank you!', backgroundColor: '#f5f5f5', textColor: '#666666' },
    layout: { margins: { top: 20, bottom: 20, left: 20, right: 20 }, spacing: 16, fontSize: 14, fontFamily: 'Arial, sans-serif' },
    branding: { primaryColor: '#1890ff', secondaryColor: '#52c41a', accentColor: '#faad14' }
  };
}

export default DynamicDocumentTemplate;
