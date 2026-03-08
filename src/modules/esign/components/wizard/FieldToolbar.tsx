import React from 'react';
import { Type, PenTool, Calendar, AlignLeft, CheckSquare, List } from 'lucide-react';

const fields = [
    { type: 'signature', label: 'Signature', icon: <PenTool size={20} /> },
    { type: 'initials', label: 'Initials', icon: <PenTool size={20} /> },
    { type: 'date', label: 'Date Signed', icon: <Calendar size={20} /> },
    { type: 'text', label: 'Text Box', icon: <AlignLeft size={20} /> },
    { type: 'checkbox', label: 'Checkbox', icon: <CheckSquare size={20} /> },
    { type: 'dropdown', label: 'Dropdown', icon: <List size={20} /> },
];

export function FieldToolbar() {
    const handleDragStart = (e: React.DragEvent, fieldType: string) => {
        e.dataTransfer.setData('fieldType', fieldType);
        e.dataTransfer.effectAllowed = 'copy';
    };

    return (
        <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Fields</h3>
            <div className="grid grid-cols-1 gap-2">
                {fields.map((field) => (
                    <div
                        key={field.type}
                        draggable
                        onDragStart={(e) => handleDragStart(e, field.type)}
                        className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg cursor-move hover:border-blue-500 hover:shadow-sm transition-all"
                    >
                        <div className="text-blue-500">{field.icon}</div>
                        <span className="text-sm font-medium">{field.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
