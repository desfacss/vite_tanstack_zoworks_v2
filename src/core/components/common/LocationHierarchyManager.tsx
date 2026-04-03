import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Table, message, Modal, Button, Tabs, Spin, Tag, Space } from 'antd'; 
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
import { MenuOutlined, ArrowsAltOutlined, ApartmentOutlined } from '@ant-design/icons';

// --- Interfaces ---

interface LocationType {
  id: string;
  name: string;
  level: number;
}

interface Location {
  id: string;
  name: string;
  parent_id: string | null;
  location_type_id: string | null;
  [key: string]: any;
}

interface TableData extends Location {
  key: string;
  typeName?: string;
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
    backgroundColor: isDragging ? '#e0f2fe' : '#fff',
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
                <span {...listeners} style={{ marginRight: 12, cursor: 'grab', color: '#64748b' }}>
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
  listeners: any; 
  attributes: any; 
  setNodeRef: (element: HTMLElement | null) => void;
  isDragging: boolean;
}

const DroppableOrgChartNode: React.FC<OrgChartNodeProps> = ({ 
  node, 
  listeners,
  attributes,
  setNodeRef,
  isDragging,
}) => {
  
  const nodeStyle: React.CSSProperties = {
    padding: '12px 16px',
    backgroundColor: isDragging ? '#e0f2fe' : '#fff',
    border: isDragging ? '2px dashed #0284c7' : '1px solid #e2e8f0',
    borderRadius: '12px',
    textAlign: 'center',
    cursor: 'grab',
    minWidth: '200px',
    boxShadow: isDragging ? '0 10px 15px -3px rgba(0, 0, 0, 0.1)' : '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    transition: 'all 0.2s ease',
    opacity: isDragging ? 0.9 : 1,
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
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
        {node.typeName || 'Unknown Type'}
      </span>
      <strong className="text-slate-900">{node.name}</strong>
    </div>
  );
};

const OrgChartTree: React.FC<{ data: TableData[] }> = ({ data }) => {
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
          <OrgChartBranch key={node.key} node={node} />
        ))}
      </div>
    </div>
  );
};

const OrgChartBranch: React.FC<{ node: TableData }> = ({ node }) => {
  
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
      minWidth: '240px', 
      padding: '15px 0',
      position: 'relative',
    }}>
      <DroppableOrgChartNode
        node={node}
        listeners={listeners}
        attributes={attributes}
        setNodeRef={setNodeRef}
        isDragging={isDragging}
      />
      
      {node.children && node.children.length > 0 && (
        <div className="org-chart-children" style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '30px', 
          marginTop: '30px',
          position: 'relative',
        }}>
          {/* Vertical line from parent */}
          <div style={{
            position: 'absolute',
            top: '-30px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '2px',
            height: '30px',
            backgroundColor: '#cbd5e1',
          }}></div>
          
          {/* Horizontal line connecting children */}
          {node.children.length > 1 && (
             <div style={{
                position: 'absolute',
                top: '0',
                left: `calc(120px)`,
                right: `calc(120px)`,
                height: '2px',
                backgroundColor: '#cbd5e1',
              }}></div>
          )}
          
          {node.children.map((child) => (
            <div key={child.key} style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              position: 'relative',
            }}>
              {/* Vertical line to child */}
              <div style={{
                  position: 'absolute',
                  top: '0',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '2px',
                  height: '15px',
                  backgroundColor: '#cbd5e1',
              }}></div>
              
              <OrgChartBranch node={child} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// --- Main Component ---

const LocationHierarchyManager: React.FC = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [types, setTypes] = useState<LocationType[]>([]);
  const [tableData, setTableData] = useState<TableData[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { organization } = useAuthStore();
  
  const [messageApi, contextHolder] = message.useMessage();
  const [activeTab, setActiveTab] = useState('tree'); 

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }), 
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch locations
      const { data: locData, error: locError } = await supabase
        .schema('identity')
        .from('locations')
        .select('id, name, parent_id, location_type_id')
        .eq('organization_id', organization?.id)
        .order('name', { ascending: true });

      if (locError) throw locError;

      // Fetch location types
      const { data: typeData, error: typeError } = await supabase
        .schema('identity')
        .from('location_types')
        .select('id, name, level')
        .eq('organization_id', organization?.id);
        
      if (typeError) throw typeError;

      setLocations((locData as unknown as Location[]) || []);
      setTypes((typeData as unknown as LocationType[]) || []);
    } catch (error: any) {
      messageApi.error(`Error fetching hierarchy data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [organization, messageApi]);

  const buildTree = useCallback((flatLocations: Location[], locationTypes: LocationType[]): TableData[] => {
    const nodeMap: { [key: string]: TableData } = {};
    const tree: TableData[] = [];

    const typeMap = new Map(locationTypes.map(t => [t.id, t.name]));

    flatLocations.forEach((loc) => {
      nodeMap[loc.id] = {
        ...loc,
        key: loc.id,
        typeName: typeMap.get(loc.location_type_id || '') || 'Unknown',
        children: [],
      };
    });

    flatLocations.forEach((loc) => {
      const parentId = loc.parent_id;
      if (parentId && nodeMap[parentId] && loc.id !== parentId) {
        nodeMap[parentId].children?.push(nodeMap[loc.id]);
      } else {
        tree.push(nodeMap[loc.id]);
      }
    });
    
    const cleanupChildren = (items: TableData[]) => items.map(item => {
        if (item.children && item.children.length === 0) {
          delete item.children;
        } else if (item.children) {
          item.children = cleanupChildren(item.children);
        }
        return item;
    });

    return cleanupChildren(tree);
  }, []);

  useEffect(() => {
    if (organization?.id && isModalOpen) {
      fetchData();
    }
  }, [fetchData, organization?.id, isModalOpen]);

  useEffect(() => {
    setTableData(buildTree(locations, types));
  }, [locations, types, buildTree]);


  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id || !over.id) return;

    const draggedKey = active.id as string;
    const targetKey = over.id as string;

    const draggedLoc = locations.find(l => l.id === draggedKey);
    const targetLoc = locations.find(l => l.id === targetKey);
    
    if (!draggedLoc || !targetLoc) return;

    const isDescendantOf = (childId: string, potentialParentId: string): boolean => {
        let currentParentId = locations.find(l => l.id === childId)?.parent_id;
        while (currentParentId) {
            if (currentParentId === potentialParentId) return true;
            const nextParent = locations.find(l => l.id === currentParentId);
            currentParentId = nextParent ? nextParent.parent_id : null;
        }
        return false;
    };

    if (isDescendantOf(targetKey, draggedKey)) {
        messageApi.error(`Cannot drop "${draggedLoc.name}" onto its own descendant, "${targetLoc.name}".`);
        return;
    }
    
    if (draggedLoc.parent_id === targetKey) {
        messageApi.info(`Already a child of "${targetLoc.name}".`);
        return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .schema('identity')
        .from('locations')
        .update({ parent_id: targetKey })
        .eq('id', draggedKey);

      if (error) throw error;
      
      messageApi.success(`"${draggedLoc.name}" is now located under "${targetLoc.name}".`);
      await fetchData(); 
    } catch (error: any) {
      messageApi.error(`Error updating hierarchy: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };


  const columns = [
    {
      title: 'Location Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: TableData) => (
        <Space>
          <span className="font-medium text-slate-900">{text}</span>
          <Tag color="blue" className="rounded-full px-2 py-0 text-[10px] uppercase font-bold border-none bg-slate-100 text-slate-600">
            {record.typeName}
          </Tag>
        </Space>
      )
    },
    {
      title: 'Parent',
      dataIndex: 'parent_id',
      key: 'parent_id',
      render: (parentId: string | null) => {
        if (!parentId) return <Tag className="border-none bg-slate-50 text-slate-400 italic">None (Top Level)</Tag>;
        const parent = locations.find(l => l.id === parentId);
        return parent ? <span className="text-slate-600 italic">{parent.name}</span> : parentId;
      }
    }
  ];

  const rowKeys = useMemo(() => {
      const getKeys = (data: TableData[]): string[] => {
          return data.flatMap(item => [item.key, ...(item.children ? getKeys(item.children) : [])]);
      }
      return getKeys(tableData);
  }, [tableData]);

  const treeContent = (
    <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-auto p-8 min-h-[500px]" style={{ backgroundImage: 'radial-gradient(#cbd5e1 0.5px, transparent 0.5px)', backgroundSize: '24px 24px' }}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={rowKeys} strategy={verticalListSortingStrategy}>
          {loading ? (
            <div className="flex flex-col items-center justify-center p-20 gap-4">
               <Spin size="large" />
               <p className="text-slate-500 font-medium tracking-tight">Updating Hierarchy...</p>
            </div>
          ) : (
             <div className="inline-block min-w-full">
                {/* Visual Header with Organization Root */}
                <div className="flex flex-col items-center mb-10">
                   <div className="px-6 py-3 bg-slate-900 text-white rounded-full font-bold shadow-xl flex items-center gap-2">
                      <ApartmentOutlined />
                      {organization?.name || 'Organization'}
                   </div>
                   <div className="w-0.5 h-10 bg-slate-300"></div>
                </div>
                <OrgChartTree data={tableData} />
             </div>
          ) }
        </SortableContext>
      </DndContext>
    </div>
  );
  
  const tableContent = (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
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
            components={{ body: { row: DragableRow } }}
            expandable={{ defaultExpandAllRows: true }}
            pagination={false}
            className="custom-hierarchy-table"
          />
        </SortableContext>
      </DndContext>
    </div>
  );
  
  const tabItems: TabsProps['items'] = [
    {
      key: 'tree',
      label: (
        <span className="flex items-center gap-2">
          <ApartmentOutlined /> Visual Tree
        </span>
      ),
      children: (
        <div className="p-4 flex flex-col gap-4">
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-100 flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-amber-200 flex items-center justify-center text-amber-700 font-bold shrink-0">!</div>
             <p className="text-amber-800 text-sm font-medium">Drag any node and drop it onto another to instantly re-parent the location.</p>
          </div>
          {treeContent}
        </div>
      ),
    },
    {
      key: 'table',
      label: (
        <span className="flex items-center gap-2">
          <MenuOutlined /> List Management
        </span>
      ),
      children: (
        <div className="p-6 flex flex-col gap-4">
          <p className="text-slate-500 font-medium">Manage hierarchy via sortable list view.</p>
          {tableContent}
        </div>
      ),
    },
  ];

  return (
    <>
      {contextHolder}
      <Button 
        type="primary" 
        size="large"
        className="font-bold flex items-center gap-2 rounded-xl h-11 px-6 shadow-indigo-200 shadow-lg hover:translate-y-[-1px] transition-all"
        onClick={() => setIsModalOpen(true)}
        icon={<ArrowsAltOutlined />}
      >
        Manage Hierarchy
      </Button>

      <Modal
        title={
           <div className="flex items-center gap-3 py-2 text-slate-800">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                 <ApartmentOutlined style={{ fontSize: 20 }} />
              </div>
              <div>
                 <h2 className="text-lg font-bold leading-none">Location Hierarchy</h2>
                 <p className="text-slate-400 text-xs mt-1 font-medium tracking-tight">Reorganize organizational locations structure</p>
              </div>
           </div>
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null} 
        width={1400} 
        destroyOnClose={true} 
        styles={{ 
           body: { padding: '0 0 24px 0', backgroundColor: '#fcfcfd' },
           header: { borderBottom: '1px solid #f1f5f9', padding: '16px 24px' }
        }}
        centered
      >
        <div className="px-6 pt-4">
           <Tabs 
             defaultActiveKey="tree" 
             activeKey={activeTab} 
             onChange={setActiveTab}
             items={tabItems}
             className="custom-hierarchy-tabs"
           />
        </div>
      </Modal>
      
      <style>{`
         .custom-hierarchy-tabs .ant-tabs-nav::before {
            border-bottom: none !important;
         }
         .custom-hierarchy-tabs .ant-tabs-tab {
            padding: 12px 16px !important;
            border-radius: 10px !important;
            font-weight: 600 !important;
            transition: all 0.2s ease !important;
         }
         .custom-hierarchy-tabs .ant-tabs-tab-active {
            background-color: #f1f5f9 !important;
         }
         .custom-hierarchy-table .ant-table-thead > tr > th {
            background: #f8fafc !important;
            font-weight: 700 !important;
            text-transform: uppercase !important;
            font-size: 11px !important;
            letter-spacing: 0.05em !important;
            color: #64748b !important;
         }
      `}</style>
    </>
  );
};

export default LocationHierarchyManager;
