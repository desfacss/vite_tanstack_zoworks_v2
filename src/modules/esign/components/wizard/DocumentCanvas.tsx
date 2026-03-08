import React, { useState, useRef, useEffect } from 'react';
import { useESignWizardStore } from '../../stores/esignStore';
import { X } from 'lucide-react';
import type { FieldType } from '../../types';

interface DocumentCanvasProps {
    selectedFieldId: string | null;
    onFieldSelect: (id: string | null) => void;
}

const fieldColors: Record<FieldType, string> = {
    signature: 'bg-blue-100 border-blue-500',
    initials: 'bg-indigo-100 border-indigo-500',
    date: 'bg-green-100 border-green-500',
    text: 'bg-orange-100 border-orange-500',
    checkbox: 'bg-pink-100 border-pink-500',
    dropdown: 'bg-purple-100 border-purple-500',
};

const A4_HEIGHT = 842;
const A4_WIDTH = 595;

export function DocumentCanvas({ selectedFieldId, onFieldSelect }: DocumentCanvasProps) {
    const { fieldPlacements, addFieldPlacement, updateFieldPlacement, removeFieldPlacement, recipients, previewUrl, pageCount } = useESignWizardStore();
    const [draggingFieldId, setDraggingFieldId] = useState<string | null>(null);
    const [resizingFieldId, setResizingFieldId] = useState<string | null>(null);
    const [scale, setScale] = useState(1);
    const canvasRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const updateScale = () => {
            if (containerRef.current) {
                const parentWidth = containerRef.current.clientWidth;
                // Add some padding to ensure no horizontal scrollbars
                const newScale = Math.min(1.5, (parentWidth - 48) / A4_WIDTH);
                setScale(newScale);
            }
        };

        const timer = setTimeout(updateScale, 100);
        window.addEventListener('resize', updateScale);
        return () => {
            window.removeEventListener('resize', updateScale);
            clearTimeout(timer);
        };
    }, []);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const fieldType = e.dataTransfer.getData('fieldType') as FieldType;
        if (!fieldType) return;

        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;

        // Coordinates relative to the scaled canvas
        const x = (e.clientX - rect.left) / scale;
        const y = (e.clientY - rect.top) / scale;

        if (recipients.length === 0) {
            alert('Please add recipients first');
            return;
        }

        const xPercent = (x / A4_WIDTH) * 100;
        const yPercent = (y / (pageCount * A4_HEIGHT)) * 100;

        const defaultWidths: Record<FieldType, number> = {
            signature: 180, initials: 80, date: 120, text: 200, checkbox: 24, dropdown: 200,
        };

        const defaultHeights: Record<FieldType, number> = {
            signature: 60, initials: 40, date: 40, text: 40, checkbox: 24, dropdown: 40,
        };

        addFieldPlacement({
            fieldType,
            recipientId: recipients[0].email,
            pageNumber: Math.floor(y / A4_HEIGHT) + 1,
            xPosition: xPercent,
            yPosition: yPercent,
            width: defaultWidths[fieldType],
            height: defaultHeights[fieldType],
            isRequired: true,
            fieldLabel: fieldType.charAt(0).toUpperCase() + fieldType.slice(1),
        });
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    };

    const handleMouseDown = (e: React.MouseEvent, fieldId: string) => {
        e.stopPropagation();
        onFieldSelect(fieldId);
        setDraggingFieldId(fieldId);
    };

    const handleResizeStart = (e: React.MouseEvent, fieldId: string) => {
        e.stopPropagation();
        setResizingFieldId(fieldId);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();

        if (draggingFieldId) {
            const x = (e.clientX - rect.left) / scale;
            const y = (e.clientY - rect.top) / scale;

            const boundedX = Math.max(0, Math.min(x, A4_WIDTH));
            const boundedY = Math.max(0, Math.min(y, pageCount * A4_HEIGHT));

            updateFieldPlacement(draggingFieldId, {
                xPosition: (boundedX / A4_WIDTH) * 100,
                yPosition: (boundedY / (pageCount * A4_HEIGHT)) * 100,
            });
        } else if (resizingFieldId) {
            const field = fieldPlacements.find(f => f.id === resizingFieldId);
            if (!field) return;

            const fieldX = (field.xPosition / 100) * A4_WIDTH;
            const fieldY = (field.yPosition / 100) * (pageCount * A4_HEIGHT);

            const mouseX = (e.clientX - rect.left) / scale;
            const mouseY = (e.clientY - rect.top) / scale;

            const newWidth = Math.max(20, mouseX - (fieldX - field.width / 2));
            const newHeight = Math.max(20, mouseY - (fieldY - field.height / 2));

            updateFieldPlacement(resizingFieldId, {
                width: newWidth,
                height: newHeight,
            });
        }
    };

    const handleMouseUp = () => {
        setDraggingFieldId(null);
        setResizingFieldId(null);
    };

    useEffect(() => {
        if (draggingFieldId || resizingFieldId) {
            window.addEventListener('mouseup', handleMouseUp);
            return () => window.removeEventListener('mouseup', handleMouseUp);
        }
    }, [draggingFieldId, resizingFieldId]);

    const canvasHeight = pageCount * A4_HEIGHT;

    return (
        <div ref={containerRef} className="flex flex-col items-center pb-20 w-full overflow-hidden">
            <div
                ref={canvasRef}
                className="relative bg-white shadow-2xl cursor-crosshair"
                style={{
                    width: `${A4_WIDTH}px`,
                    height: `${canvasHeight}px`,
                    border: '1px solid #e5e7eb',
                    transform: `scale(${scale})`,
                    transformOrigin: 'top center',
                }}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onMouseMove={handleMouseMove}
                onClick={() => onFieldSelect(null)}
            >
                {/* Real Document Preview */}
                <div className="absolute inset-0 z-0">
                    {previewUrl ? (
                        <iframe
                            src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                            className="w-full h-full border-none pointer-events-none"
                            title="Document Preview"
                            style={{ height: `${canvasHeight}px` }}
                        />
                    ) : (
                        <div className="absolute inset-x-0 top-0 p-8 text-gray-300 text-sm leading-relaxed pointer-events-none">
                            {[...Array(pageCount)].map((_, i) => (
                                <div key={i} style={{ height: `${A4_HEIGHT}px` }} className="border-b border-dashed border-gray-200 py-8">
                                    <div className="mb-4 font-bold text-xl text-gray-400">Page {i + 1}</div>
                                    <p>Place fields here...</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Transparent Interaction Layer - ensures drop events work even over iframe */}
                <div
                    className="absolute inset-0 z-10"
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                />

                {/* Field Overlay */}
                {fieldPlacements.map((field) => (
                    <div
                        key={field.id}
                        onMouseDown={(e) => handleMouseDown(e, field.id!)}
                        className={`absolute cursor-move border-2 ${draggingFieldId === field.id || resizingFieldId === field.id ? 'z-50' : 'z-10'} ${fieldColors[field.fieldType]} ${selectedFieldId === field.id ? 'ring-2 ring-offset-2 ring-blue-500 shadow-lg' : ''
                            } flex items-center justify-center text-xs font-bold transition-all select-none group`}
                        style={{
                            left: `${field.xPosition}%`,
                            top: `${field.yPosition}%`,
                            width: `${field.width}px`,
                            height: `${field.height}px`,
                            transform: 'translate(-50%, -50%)',
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            onFieldSelect(field.id!);
                        }}
                    >
                        <span className="text-gray-800 pointer-events-none uppercase tracking-tighter text-[10px] sm:text-xs">
                            {field.fieldLabel}
                        </span>

                        {/* Resize Handle */}
                        <div
                            onMouseDown={(e) => handleResizeStart(e, field.id!)}
                            className="absolute bottom-0 right-0 w-3 h-3 bg-blue-500 cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity"
                        />

                        <button
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ width: '20px', height: '20px' }}
                            onClick={(e) => {
                                e.stopPropagation();
                                removeFieldPlacement(field.id!);
                                if (selectedFieldId === field.id) {
                                    onFieldSelect(null);
                                }
                            }}
                        >
                            <X size={12} />
                        </button>
                    </div>
                ))}
            </div>

            <div className="mt-6 text-sm text-gray-400 font-medium">
                {pageCount} Page(s) • {fieldPlacements.length} field(s) placed
            </div>
        </div>
    );
}
