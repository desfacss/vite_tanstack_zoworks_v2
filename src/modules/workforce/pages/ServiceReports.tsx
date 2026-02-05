import React from 'react';
import ServiceReportsComponent from '@/core/components/common/documents/ServiceReportsComponent';

const ServiceReports: React.FC = () => {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Service Reports</h1>
      <ServiceReportsComponent />
    </div>
  );
};

export default ServiceReports;
