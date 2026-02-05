import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Table, message, Modal, Button, Tabs, Spin } from 'antd'; 
import type { TabsProps } from 'antd';
import {
  DndContext,
  closestCenter,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { supabase } from '@/core/lib/supabase';
import { useAuthStore } from "@/core/lib/store";
import { MenuOutlined, ArrowsAltOutlined } from '@ant-design/icons';

// --- Interfaces ---

interface Entity {
  id: string;
  [key: string]: any;
}

interface HierarchicalSortManagerProps {
  entitySchema: string;
  entityName: string; // Used for fetching (can be a view)
  saveEntityName?: string; // Used for saving (must be a table)
  parentColumn: string;
  buttonTitle?: string;
  displayColumn?: string;
}

interface TableData extends Entity {
  key: string;
  children?: TableData[];
}

// --- DND Row Component ---

const DragableRow: React.FC<any> = (props) => {
  const isDataRow = props['data-row-key'] !== undefined;

  if (!isDataRow) {
    return <tr {...props} />;
  }

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props['data-row-key'] });

  const style: React.CSSProperties = {
    ...props.style,
    transform: CSS.Transform.toString(transform),
    transition,
    cursor: 'move',
    opacity: isDragging ? 0.8 : 1,
    backgroundColor: isDragging ? '#e6f7ff' : '#fff',
    zIndex: isDragging ? 9999 : 'auto',
  };

  const rowCells = Array.isArray(props.children) ? props.children : [];

  return (
    <tr
      {...props}
      ref={setNodeRef}
      style={style}
      {...attributes}
    >
      {rowCells.map((child: any, index: number) => {
        if (index === 0) {
          return React.cloneElement(child, {
            children: (
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span {...listeners} style={{ marginRight: 8, cursor: 'grab' }}>
                  <MenuOutlined />
                </span>
                {child.props.children}
              </div>
            ),
          });
        }
        return child;
      })}
    </tr>
  );
};

// --- Org Chart Node Component ---

interface OrgChartNodeProps {
  node: TableData;
  displayColumn: string;
  listeners: any; 
  attributes: any; 
  setNodeRef: (element: HTMLElement | null) => void;
  isDragging: boolean;
}

const DroppableOrgChartNode: React.FC<OrgChartNodeProps> = ({ 
  node, 
  displayColumn,
  listeners,
  attributes,
  setNodeRef,
  isDragging,
}) => {
  
  const nodeStyle: React.CSSProperties = {
    padding: '8px 12px',
    backgroundColor: isDragging ? '#e6f7ff' : '#f0f2f5',
    border: isDragging ? '2px dashed #1890ff' : '1px solid #ddd',
    borderRadius: '4px',
    textAlign: 'center',
    cursor: 'grab',
    minWidth: '150px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
    transition: 'all 0.3s',
    opacity: isDragging ? 0.8 : 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  };

  return (
    <div 
      ref={setNodeRef} 
      style={nodeStyle} 
      {...attributes} 
      {...listeners}
      data-dnd-kit-id={node.key} 
    >
      <strong title={node.id}>{node[displayColumn] || node.id}</strong>
    </div>
  );
};

const OrgChartTree: React.FC<{ data: TableData[]; displayColumn: string }> = ({ data, displayColumn }) => {
  if (!data || data.length === 0) return null;

  return (
    <div className="org-chart-root" style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      paddingTop: '20px' 
    }}>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '50px' }}>
        {data.map(node => (
          <OrgChartBranch key={node.key} node={node} displayColumn={displayColumn} />
        ))}
      </div>
    </div>
  );
};

const OrgChartBranch: React.FC<{ node: TableData; displayColumn: string }> = ({ node, displayColumn }) => {
  
  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
  } = useSortable({ id: node.key });
  
  return (
    <div className="org-chart-branch" style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center',
      minWidth: '200px', 
      padding: '10px 0',
      position: 'relative',
    }}>
      <DroppableOrgChartNode
        node={node}
        displayColumn={displayColumn}
        listeners={listeners}
        attributes={attributes}
        setNodeRef={setNodeRef}
        isDragging={isDragging}
      />
      
      {node.children && node.children.length > 0 && (
        <div className="org-chart-children" style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '20px', 
          marginTop: '20px',
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute',
            top: '-15px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '2px',
            height: '15px',
            backgroundColor: '#ccc',
          }}></div>
          
          {node.children.map((child) => (
            <div key={child.key} style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              position: 'relative',
            }}>
              <div style={{
                  position: 'absolute',
                  top: '0',
                  width: '2px',
                  height: '15px',
                  backgroundColor: '#ccc',
              }}></div>
              
              <OrgChartBranch node={child} displayColumn={displayColumn} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


// --- Main Component ---

const HierarchicalSortManager: React.FC<HierarchicalSortManagerProps> = ({
  entitySchema,
  entityName,
  saveEntityName,
  parentColumn,
  buttonTitle = "Org Hierarchy",
  displayColumn = "name",
}) => {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [tableData, setTableData] = useState<TableData[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { organization } = useAuthStore();
  
  const [messageApi, contextHolder] = message.useMessage();
  const [activeTab, setActiveTab] = useState('table'); 

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }), 
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  const fetchEntities = useCallback(async () => {
    setLoading(true);
    try {
      const selectFields = `id, ${parentColumn}, ${displayColumn}`;

      const { data, error } = await supabase
        .schema(entitySchema)
        .from(entityName)
        .select(selectFields)
        .eq('organization_id', organization?.id)
        .order(displayColumn, { ascending: true });

      if (error) throw error;
      setEntities((data as unknown as Entity[]) || []);
    } catch (error: any) {
      messageApi.error(`Error fetching entities: ${error.message}`);
      setEntities([]);
    } finally {
      setLoading(false);
    }
  }, [entitySchema, entityName, parentColumn, displayColumn, organization, messageApi]);

  const buildTableData = useCallback((flatEntities: Entity[]): TableData[] => {
    const nodeMap: { [key: string]: TableData } = {};
    const table: TableData[] = [];

    flatEntities.forEach((entity) => {
      nodeMap[entity.id] = {
        ...entity,
        key: entity.id,
        children: [],
      };
    });

    flatEntities.forEach((entity) => {
      const parentId = entity[parentColumn];
      if (parentId && nodeMap[parentId] && entity.id !== parentId) {
        nodeMap[parentId].children?.push(nodeMap[entity.id]);
      } else {
        table.push(nodeMap[entity.id]);
      }
    });
    
    table.sort((a, b) => (a[displayColumn] > b[displayColumn] ? 1 : -1));
    
    const sortChildren = (items: TableData[]) => items.map(item => {
        if (item.children && item.children.length > 0) {
            item.children.sort((a, b) => (a[displayColumn] > b[displayColumn] ? 1 : -1));
            item.children = sortChildren(item.children);
        }
        return item;
    });

    sortChildren(table);
    
    const cleanupChildren = (items: TableData[]) => items.map(item => {
        if (item.children && item.children.length === 0) {
          delete item.children;
        } else if (item.children) {
          item.children = cleanupChildren(item.children);
        }
        return item;
    });

    return cleanupChildren(table);
  }, [parentColumn, displayColumn]);

  useEffect(() => {
    if (organization?.id && isModalOpen) {
      fetchEntities();
    }
  }, [fetchEntities, organization?.id, isModalOpen]);

  useEffect(() => {
    setTableData(buildTableData(entities));
  }, [entities, buildTableData]);


  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id || !over.id) return;

    const draggedKey = active.id as string;
    const targetKey = over.id as string;

    const draggedEntity = entities.find(e => e.id === draggedKey);
    const targetEntity = entities.find(e => e.id === targetKey);
    
    if (!draggedEntity || !targetEntity) return;

    const newParentId = targetKey; 

    const isDescendantOf = (childId: string, potentialParentId: string): boolean => {
        let currentParentId = entities.find(e => e.id === childId)?.[parentColumn];
        while (currentParentId) {
            if (currentParentId === potentialParentId) return true;
            const nextParent = entities.find(e => e.id === currentParentId);
            currentParentId = nextParent ? nextParent[parentColumn] : null;
        }
        return false;
    };

    if (isDescendantOf(targetKey, draggedKey)) {
        messageApi.error(`Cannot drop "${draggedEntity[displayColumn]}" onto its own descendant, "${targetEntity[displayColumn]}".`);
        return;
    }
    
    if (draggedEntity[parentColumn] === newParentId) {
        messageApi.info(`Parent is already set to "${targetEntity[displayColumn]}".`);
        return;
    }


    try {
      setLoading(true);
      const { error } = await supabase
        .schema(entitySchema)
        .from(saveEntityName || entityName)
        .update({ [parentColumn]: newParentId })
        .eq('id', draggedKey);

      if (error) throw error;
      
      messageApi.success(`Entity "${draggedEntity[displayColumn]}" is now a child of "${targetEntity[displayColumn]}".`);
      
      await fetchEntities(); 
    } catch (error: any) {
      messageApi.error(`Error updating hierarchy: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };


  const columns = useMemo(() => [
    {
      title: 'Name',
      dataIndex: displayColumn,
      key: displayColumn,
    },
    {
        title: 'ID Reference',
        dataIndex: 'id', 
        key: 'id_ref',
        width: 300,
        render: (id: string) => <small style={{ color: '#999' }}>{id}</small>
    },
    {
      title: 'Parent',
      dataIndex: parentColumn,
      key: parentColumn,
      width: 300,
      render: (parentId: string | null) => {
        if (!parentId) return <span style={{ color: 'gray' }}>None (Top Level)</span>;
        const parent = entities.find(e => e.id === parentId);
        return parent ? parent[displayColumn] : <small style={{ color: '#999' }}>{parentId}</small>;
      }
    }
  ], [entities, parentColumn, displayColumn]);

  const rowKeys = useMemo(() => {
      const getKeys = (data: TableData[]): string[] => {
          return data.flatMap(item => [item.key, ...(item.children ? getKeys(item.children) : [])]);
      }
      return getKeys(tableData);
  }, [tableData]);

  const tableContent = (
    <DndContext 
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={rowKeys} strategy={verticalListSortingStrategy}>
        <Table
          columns={columns}
          dataSource={tableData}
          loading={loading}
          components={{
            body: {
              row: DragableRow,
            },
          }}
          expandable={{
            defaultExpandAllRows: true,
          }}
          pagination={false}
          style={{ background: '#fff', borderRadius: '4px' }}
        />
      </SortableContext>
    </DndContext>
  );

  const treeContent = (
    <div style={{ overflowX: 'auto', padding: '20px', minHeight: '300px', backgroundColor: '#fafafa' }}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={rowKeys} strategy={verticalListSortingStrategy}>
          {loading ? (
            <Spin tip="Loading Hierarchy..." />
          ) : (
            <OrgChartTree data={tableData} displayColumn={displayColumn} />
          ) }
        </SortableContext>
      </DndContext>
    </div>
  );
  
  const tabItems: TabsProps['items'] = [
    {
      key: 'table',
      label: (
        <span>
          <MenuOutlined /> Table View
        </span>
      ),
      children: (
        <div style={{ padding: '24px' }}>
          <p>Drag rows to reorganize. Dropping a row onto another will make it a child of that row.</p>
          {tableContent}
        </div>
      ),
    },
    {
      key: 'tree',
      label: (
        <span>
          <ArrowsAltOutlined /> Org Chart View
        </span>
      ),
      children: (
        <div style={{ minHeight: '400px' }}>
          <div style={{ padding: '16px 24px' }}>
            <p>Visual tree of the hierarchy. Drag and drop to re-parent.</p>
          </div>
          {treeContent}
        </div>
      ),
    },
  ];

  return (
    <>
      {contextHolder}
      <Button type="primary" onClick={() => setIsModalOpen(true)}>
        {buttonTitle}
      </Button>

      <Modal
        title={buttonTitle}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null} 
        width={1200} 
        destroyOnClose={true} 
        styles={{ body: { padding: 0 } }}
      >
        <Tabs 
          defaultActiveKey="table" 
          activeKey={activeTab} 
          onChange={setActiveTab}
          items={tabItems}
        />
      </Modal>
    </>
  );
};

export default HierarchicalSortManager;
