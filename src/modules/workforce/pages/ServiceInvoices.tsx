import React from 'react';
import ServiceInvoicesComponent from '@/core/components/common/documents/ServiceInvoiceComponent';

const ServiceInvoices: React.FC = () => {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Service Invoices</h1>
      <ServiceInvoicesComponent />
    </div>
  );
};

export default ServiceInvoices;
