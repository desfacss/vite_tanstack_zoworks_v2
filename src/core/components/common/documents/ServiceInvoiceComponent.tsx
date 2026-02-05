import React, { useEffect, useState } from 'react';
import { Card } from 'antd';
import DocumentList from '../doc/DocumentList';

interface Props {
  foreignKey?: string;
  foreignKeyValue?: string;
}

const ServiceInvoiceComponent: React.FC<Props> = ({ foreignKey, foreignKeyValue }) => {
  return (
    <div style={{ padding: '0px' }}>
      <DocumentList documentType="doc_invoices" />
    </div>
  );
};

export default ServiceInvoiceComponent;
