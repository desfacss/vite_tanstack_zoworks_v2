import React, { useState } from 'react';
import { Drawer } from 'antd';
import DocumentList from '../doc/DocumentList';
import TaskReportPage from '../doc/TaskReportPage';
import { DocumentRecord } from '../doc/types/document';

interface Props {
  foreignKey?: string; 
  foreignKeyValue?: string;
}

const ServiceReportsComponent: React.FC<Props> = ({ foreignKey, foreignKeyValue }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);

  const handleCreate = () => {
    setSelectedRecord(null);
    setDrawerVisible(true);
  };

  const handleEdit = (record: DocumentRecord) => {
    // Service Reports in blueprint.service_reports have task_id
    // We pass the record which should contain task_id or id
    setSelectedRecord(record);
    setDrawerVisible(true);
  };

  return (
    <div style={{ padding: '0px' }}>
      <DocumentList 
        documentType="doc_service_reports" 
        onCreate={handleCreate}
        onEdit={handleEdit}
      />
      <Drawer
        title={selectedRecord ? 'Edit Service Report' : 'Create Service Report'}
        placement="right"
        width="800px"
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        destroyOnClose
      >
        <TaskReportPage 
          editItem={selectedRecord} 
          onClose={() => setDrawerVisible(false)} 
        />
      </Drawer>
    </div>
  );
};

export default ServiceReportsComponent;
