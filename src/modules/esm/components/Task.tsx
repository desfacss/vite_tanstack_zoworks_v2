// src/components/Task.tsx
import React, { useState } from 'react';
import { Button, Drawer } from 'antd'; // Import Button and Drawer
import TaskForm from './TaskForm';

interface TaskProps {
  parentEditItem?: { id: string };
  entityType?: 'ticket' | 'project' | 'parent_task';
}

const Task: React.FC<TaskProps> = ({ parentEditItem, entityType,editItem,onFinish }) => {
  console.log("pq",parentEditItem,entityType);
  const [visible, setVisible] = useState(false); // State to manage drawer visibility

  const showDrawer = () => {
    setVisible(true);
  };

  const onClose = () => {
    setVisible(false);
  };

  return (
    <>
    {!editItem && <>
      <Button type="primary" onClick={showDrawer}>
        Create Task
      </Button>
      <Drawer
        title="Create a New Task"
        width={720}
        onClose={onClose}
        open={visible}
        style={{ paddingBottom: 80 }}
      >
        <TaskForm  parentEditItem={parentEditItem} entityType={entityType} onSuccess={onClose}/>
      </Drawer>
    </>}
      {editItem && <TaskForm parentEditItem={parentEditItem} entityType={entityType} editItemId={editItem?.id} onSuccess={onFinish}/>}
    </>
  );
};

export default Task;