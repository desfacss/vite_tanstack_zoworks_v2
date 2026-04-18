import React from 'react';
import DocumentList from '../doc/DocumentList';
import { DocumentRecord } from '../doc/types/document';

interface Props {
  foreignKey?: string; 
  foreignKeyValue?: string;
}

const ServiceReportsComponent: React.FC<Props> = ({ foreignKey, foreignKeyValue }) => {
  return (
    <div style={{ padding: '0px' }}>
      <DocumentList 
        documentType="doc_service_reports" 
      />
    </div>
  );
};

export default ServiceReportsComponent;
