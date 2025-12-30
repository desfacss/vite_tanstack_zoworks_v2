import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Button, Typography, Card, InputNumber, Space, Tooltip, message } from 'antd';
import { 
  DragOutlined, 
  DeleteOutlined, 
  PlusOutlined, 
  AppstoreOutlined,
  ColumnWidthOutlined
} from '@ant-design/icons';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const { Title, Text } = Typography;

// Types
interface FormField {
  fieldName: string;
  fieldTitle?: string;
}

interface Page {
  rows: string[][]; // Each row is an array of field names
}

interface PageManagerProps {
  fields: FormField[];
  initialLayout?: string[][][]; // Current ui:layout
  onSave: (uiLayout: string[][][]) => void;
  onCancel: () => void;
  visible: boolean;
}

// Draggable Field Component
interface DraggableFieldProps {
  id: string;
  fieldName: string;
  onRemove: () => void;
}

const DraggableField: React.FC<DraggableFieldProps> = ({ id, fieldName, onRemove }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    padding: '8px 12px',
    backgroundColor: '#fafafa',
    border: '1px solid #d9d9d9',
    borderRadius: 4,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    cursor: 'grab',
    userSelect: 'none',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <DragOutlined {...listeners} style={{ cursor: 'grab', color: '#999' }} />
      <Text ellipsis style={{ flex: 1, maxWidth: 150 }}>{fieldName}</Text>
      <Tooltip title="Remove">
        <DeleteOutlined 
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          style={{ color: '#ff4d4f', cursor: 'pointer' }}
        />
      </Tooltip>
    </div>
  );
};

// Droppable Row Component
interface DroppableRowProps {
  pageIndex: number;
  rowIndex: number;
  fields: string[];
  onRemoveField: (fieldIndex: number) => void;
  children?: React.ReactNode;
}

const DroppableRow: React.FC<DroppableRowProps> = ({ 
  pageIndex, 
  rowIndex, 
  fields, 
  onRemoveField 
}) => {
  const rowId = `page-${pageIndex}-row-${rowIndex}`;
  
  // Make the row itself droppable for empty rows
  const { setNodeRef, isOver } = useDroppable({
    id: `${rowId}-dropzone`,
    data: {
      pageIndex,
      rowIndex,
      type: 'row',
    },
  });
  
  return (
    <div
      ref={setNodeRef}
      style={{
        minHeight: 50,
        padding: 8,
        backgroundColor: isOver ? '#e6f7ff' : '#f5f5f5',
        borderRadius: 4,
        marginBottom: 8,
        border: isOver ? '2px solid #1890ff' : '1px dashed #d9d9d9',
        transition: 'all 0.2s',
      }}
    >
      <SortableContext 
        items={fields.length > 0 ? fields.map((_, i) => `${rowId}-field-${i}`) : [`${rowId}-placeholder`]} 
        strategy={horizontalListSortingStrategy}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, minHeight: 40 }}>
          {fields.length === 0 ? (
            <Text type="secondary" style={{ padding: 8 }}>
              Drop fields here or use dropdown below
            </Text>
          ) : (
            fields.map((fieldName, fieldIndex) => (
              <DraggableField
                key={`${rowId}-field-${fieldIndex}`}
                id={`${rowId}-field-${fieldIndex}`}
                fieldName={fieldName}
                onRemove={() => onRemoveField(fieldIndex)}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
};

// Main PageManager Component
const PageManager: React.FC<PageManagerProps> = ({ 
  fields, 
  initialLayout, 
  onSave, 
  onCancel, 
  visible 
}) => {
  const [pages, setPages] = useState<Page[]>([{ rows: [[]] }]);
  const [columnsPerRow, setColumnsPerRow] = useState(1);
  const [numPages, setNumPages] = useState(1);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [unassignedFields, setUnassignedFields] = useState<string[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Initialize pages when modal opens
  useEffect(() => {
    if (visible && fields.length > 0) {
      // Get all field names
      const allFieldNames = fields.map(f => f.fieldName);
      
      if (initialLayout && initialLayout.length > 0 && initialLayout[0].length > 0) {
        // Load from existing layout
        const loadedPages = initialLayout.map(page => ({ 
          rows: page.map(row => [...row]) 
        }));
        setPages(loadedPages);
        setNumPages(loadedPages.length);
        
        // Find unassigned fields
        const assignedFields = new Set(
          initialLayout.flatMap(page => page.flatMap(row => row))
        );
        setUnassignedFields(allFieldNames.filter(f => !assignedFields.has(f)));
      } else {
        // Auto-populate: all fields unassigned, start with empty page
        setPages([{ rows: [[]] }]);
        setUnassignedFields([...allFieldNames]);
        setNumPages(1);
      }
    }
  }, [visible, fields, initialLayout]);

  // Add a new page
  const addPage = () => {
    setPages([...pages, { rows: [[]] }]);
    setNumPages(pages.length + 1);
  };

  // Add a new row to a page
  const addRow = (pageIndex: number) => {
    const updatedPages = [...pages];
    updatedPages[pageIndex].rows.push([]);
    setPages(updatedPages);
  };

  // Remove a row from a page
  const removeRow = (pageIndex: number, rowIndex: number) => {
    const updatedPages = [...pages];
    const removedFields = updatedPages[pageIndex].rows[rowIndex];
    updatedPages[pageIndex].rows.splice(rowIndex, 1);
    
    // Add removed fields back to unassigned
    setUnassignedFields(prev => [...prev, ...removedFields]);
    
    // If page is empty and there's more than one page, remove it
    if (updatedPages[pageIndex].rows.length === 0) {
      if (pages.length > 1) {
        updatedPages.splice(pageIndex, 1);
        setNumPages(pages.length - 1);
      } else {
        updatedPages[pageIndex].rows = [[]];
      }
    }
    setPages(updatedPages);
  };

  // Remove a page
  const removePage = (pageIndex: number) => {
    if (pages.length <= 1) {
      message.warning('At least one page is required');
      return;
    }
    const updatedPages = [...pages];
    const removedFields = updatedPages[pageIndex].rows.flat();
    updatedPages.splice(pageIndex, 1);
    
    setUnassignedFields(prev => [...prev, ...removedFields]);
    setPages(updatedPages);
    setNumPages(pages.length - 1);
  };

  // Add field to a specific row
  const addFieldToRow = (pageIndex: number, rowIndex: number, fieldName: string) => {
    if (!fieldName) return;
    
    const updatedPages = [...pages];
    updatedPages[pageIndex].rows[rowIndex].push(fieldName);
    setPages(updatedPages);
    
    // Remove from unassigned
    setUnassignedFields(prev => prev.filter(f => f !== fieldName));
  };

  // Remove field from a row
  const removeFieldFromRow = (pageIndex: number, rowIndex: number, fieldIndex: number) => {
    const updatedPages = [...pages];
    const [removedField] = updatedPages[pageIndex].rows[rowIndex].splice(fieldIndex, 1);
    setPages(updatedPages);
    
    // Add back to unassigned
    setUnassignedFields(prev => [...prev, removedField]);
  };

  // Auto-distribute fields across pages
  const autoDistribute = useCallback(() => {
    const allFieldNames = fields.map(f => f.fieldName);
    const fieldsPerPage = Math.ceil(allFieldNames.length / numPages);
    const newPages: Page[] = [];

    for (let i = 0; i < numPages; i++) {
      const pageFields = allFieldNames.slice(i * fieldsPerPage, (i + 1) * fieldsPerPage);
      const rows: string[][] = [];
      
      for (let j = 0; j < pageFields.length; j += columnsPerRow) {
        rows.push(pageFields.slice(j, j + columnsPerRow));
      }
      
      if (rows.length === 0) rows.push([]);
      newPages.push({ rows });
    }

    setPages(newPages);
    setUnassignedFields([]);
  }, [fields, numPages, columnsPerRow]);

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    // Parse IDs to get page, row, field indices
    const parseId = (id: string) => {
      // Format: "page-{pageIndex}-row-{rowIndex}-field-{fieldIndex}", "unassigned-{index}", or "page-{pageIndex}-row-{rowIndex}-dropzone"
      if (id.startsWith('unassigned-')) {
        const index = parseInt(id.replace('unassigned-', ''));
        return { type: 'unassigned', index };
      }
      // Check for dropzone (empty row target)
      const dropzoneMatch = id.match(/page-(\d+)-row-(\d+)-dropzone/);
      if (dropzoneMatch) {
        return {
          type: 'row',
          pageIndex: parseInt(dropzoneMatch[1]),
          rowIndex: parseInt(dropzoneMatch[2]),
        };
      }
      // Check for field
      const fieldMatch = id.match(/page-(\d+)-row-(\d+)-field-(\d+)/);
      if (fieldMatch) {
        return {
          type: 'field',
          pageIndex: parseInt(fieldMatch[1]),
          rowIndex: parseInt(fieldMatch[2]),
          fieldIndex: parseInt(fieldMatch[3]),
        };
      }
      return null;
    };

    const activeInfo = parseId(active.id as string);
    const overInfo = parseId(over.id as string);

    if (!activeInfo) return;

    // Handle dropping from unassigned to a row (empty or on a field)
    if (activeInfo.type === 'unassigned') {
      if (typeof activeInfo.index !== 'number') return;
      const fieldName = unassignedFields[activeInfo.index];
      if (!fieldName) return;

      const updatedPages = [...pages];
      
      if (overInfo?.type === 'row') {
        // Dropping on empty row
        updatedPages[overInfo.pageIndex!].rows[overInfo.rowIndex!].push(fieldName);
      } else if (overInfo?.type === 'field') {
        // Dropping next to a field
        updatedPages[overInfo.pageIndex!].rows[overInfo.rowIndex!].splice(
          overInfo.fieldIndex! + 1, 
          0, 
          fieldName
        );
      } else {
        return;
      }
      
      setPages(updatedPages);
      setUnassignedFields(prev => prev.filter((_, i) => i !== activeInfo.index));
    }
    
    // Handle moving between rows/pages
    if (activeInfo.type === 'field' && overInfo && overInfo.type === 'field') {
      const updatedPages = [...pages];
      const sourceRow = updatedPages[activeInfo.pageIndex!].rows[activeInfo.rowIndex!];
      const [movedField] = sourceRow.splice(activeInfo.fieldIndex!, 1);
      
      const targetRow = updatedPages[overInfo.pageIndex!].rows[overInfo.rowIndex!];
      targetRow.splice(overInfo.fieldIndex!, 0, movedField);
      
      setPages(updatedPages);
    }
  };

  // Handle save
  const handleSave = () => {
    // Filter out empty rows and pages
    const validLayout = pages
      .map(page => page.rows.filter(row => row.length > 0))
      .filter(page => page.length > 0);

    if (validLayout.length === 0) {
      message.error('At least one field must be assigned');
      return;
    }

    onSave(validLayout);
  };

  return (
    <Modal
      title="Manage Form Pages"
      open={visible}
      onOk={handleSave}
      onCancel={onCancel}
      width={900}
      style={{ top: 20 }}
      bodyStyle={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}
    >
      {/* Controls */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Space>
            <ColumnWidthOutlined />
            <Text>Columns:</Text>
            <InputNumber 
              min={1} 
              max={4} 
              value={columnsPerRow} 
              onChange={(v) => setColumnsPerRow(v || 1)}
              size="small"
              style={{ width: 60 }}
            />
          </Space>
          <Space>
            <AppstoreOutlined />
            <Text>Pages:</Text>
            <InputNumber 
              min={1} 
              max={10} 
              value={numPages} 
              onChange={(v) => setNumPages(v || 1)}
              size="small"
              style={{ width: 60 }}
            />
          </Space>
          <Button type="primary" onClick={autoDistribute}>
            Auto-Distribute
          </Button>
        </Space>
      </Card>

      {/* Unassigned Fields */}
      {unassignedFields.length > 0 && (
        <Card 
          size="small" 
          title={<Text strong>Unassigned Fields ({unassignedFields.length})</Text>}
          style={{ marginBottom: 16, backgroundColor: '#fffbe6', borderColor: '#ffe58f' }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {unassignedFields.map((fieldName) => (
              <Tooltip key={fieldName} title="Drag to a row or click to add">
                <div
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#fff',
                    border: '1px solid #d9d9d9',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontSize: 12,
                  }}
                  onClick={() => {
                    // Add to first available row
                    if (pages.length > 0 && pages[0].rows.length > 0) {
                      addFieldToRow(0, pages[0].rows.length - 1, fieldName);
                    }
                  }}
                >
                  {fieldName}
                </div>
              </Tooltip>
            ))}
          </div>
        </Card>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Pages */}
        {pages.map((page, pageIndex) => (
          <Card 
            key={pageIndex}
            size="small"
            style={{ marginBottom: 16 }}
            title={
              <Space>
                <Title level={5} style={{ margin: 0 }}>Page {pageIndex + 1}</Title>
                {pages.length > 1 && (
                  <Button 
                    size="small" 
                    danger 
                    onClick={() => removePage(pageIndex)}
                  >
                    Remove Page
                  </Button>
                )}
              </Space>
            }
            extra={
              <Button 
                size="small" 
                type="dashed" 
                icon={<PlusOutlined />}
                onClick={() => addRow(pageIndex)}
              >
                Add Row
              </Button>
            }
          >
            {page.rows.map((row, rowIndex) => (
              <div key={rowIndex} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                  <Text type="secondary" style={{ fontSize: 12, marginRight: 8 }}>
                    Row {rowIndex + 1}
                  </Text>
                  <Button 
                    size="small" 
                    type="text" 
                    danger
                    onClick={() => removeRow(pageIndex, rowIndex)}
                  >
                    Remove
                  </Button>
                </div>
                <DroppableRow
                  pageIndex={pageIndex}
                  rowIndex={rowIndex}
                  fields={row}
                  onRemoveField={(fieldIndex) => removeFieldFromRow(pageIndex, rowIndex, fieldIndex)}
                />
                {/* Quick add field dropdown */}
                {unassignedFields.length > 0 && (
                  <select
                    style={{ 
                      marginTop: 4, 
                      padding: '4px 8px', 
                      borderRadius: 4,
                      border: '1px solid #d9d9d9',
                      fontSize: 12,
                    }}
                    value=""
                    onChange={(e) => {
                      if (e.target.value) {
                        addFieldToRow(pageIndex, rowIndex, e.target.value);
                      }
                    }}
                  >
                    <option value="">+ Add field to this row</option>
                    {unassignedFields.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                )}
              </div>
            ))}
            {page.rows.length === 0 && (
              <Button 
                type="dashed" 
                block 
                onClick={() => addRow(pageIndex)}
              >
                Add First Row
              </Button>
            )}
          </Card>
        ))}

        <DragOverlay>
          {activeId ? (
            <div
              style={{
                padding: '8px 12px',
                backgroundColor: '#fff',
                border: '2px solid #1890ff',
                borderRadius: 4,
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              }}
            >
              <DragOutlined style={{ marginRight: 8 }} />
              {activeId}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Add Page Button */}
      <Button 
        type="dashed" 
        icon={<PlusOutlined />}
        onClick={addPage} 
        block
      >
        Add New Page
      </Button>
    </Modal>
  );
};

export default PageManager;
