import React from 'react';
import { Card, Button, Checkbox, Select, Input, Tooltip } from 'antd';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import type { FieldPlacement, FieldType } from '../../types';

interface DocumentViewerProps {
    envelope: any;
    fields: FieldPlacement[];
    onFieldClick: (fieldId: string) => void;
    isFieldCompleted: (fieldId: string) => boolean;
}

const fieldIcons: Record<FieldType, React.ReactNode> = {
    signature: <CheckCircle2 size={16} className="mr-1" />,
    initials: <CheckCircle2 size={16} className="mr-1" />,
    date: null,
    text: null,
    checkbox: null,
    dropdown: null,
};

export function DocumentViewer({ envelope, fields, onFieldClick, isFieldCompleted }: DocumentViewerProps) {
    return (
        <div className="flex flex-col items-center py-8">
            <div className="max-w-[800px] w-full bg-white shadow-premium rounded-xl overflow-hidden relative" style={{ minHeight: '1100px' }}>
                {/* Document Header Mock */}
                <div className="p-12 border-b border-gray-100 bg-gray-50/30">
                    <div className="flex justify-between items-start mb-12">
                        <div>
                            <h1 className="text-4xl font-bold text-gray-800 mb-2">{envelope.title}</h1>
                            <p className="text-gray-400">Ref: {envelope.id.slice(0, 8)}</p>
                        </div>
                        <div className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold">
                            PAGE 1
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="h-4 bg-gray-100 rounded w-full"></div>
                        <div className="h-4 bg-gray-100 rounded w-5/6"></div>
                        <div className="h-4 bg-gray-100 rounded w-4/6"></div>
                        <div className="h-4 bg-gray-100 rounded w-full"></div>
                    </div>
                </div>

                {/* Content Mock */}
                <div className="p-12 space-y-8">
                    <div className="grid grid-cols-2 gap-12 mb-12">
                        <div className="space-y-4">
                            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Party A</div>
                            <div className="h-6 bg-gray-50 rounded w-3/4"></div>
                        </div>
                        <div className="space-y-4">
                            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Party B</div>
                            <div className="h-6 bg-gray-50 rounded w-3/4"></div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-xl font-bold text-gray-800">1. Scope of Work</h2>
                        <div className="h-4 bg-gray-100 rounded w-full"></div>
                        <div className="h-4 bg-gray-100 rounded w-full"></div>
                        <div className="h-4 bg-gray-100 rounded w-3/4"></div>
                    </div>

                    <div className="space-y-4 pt-12">
                        <h2 className="text-xl font-bold text-gray-800">2. Signatures</h2>
                        <p className="text-gray-400">By signing below, the parties agree to the terms listed above.</p>
                    </div>
                </div>

                {/* Overlaying the E-Sign Fields */}
                {fields.map((field) => (
                    <div
                        key={field.id}
                        className={`absolute flex items-center justify-center cursor-pointer transition-all ${isFieldCompleted(field.id)
                                ? 'bg-green-50 border-2 border-green-500'
                                : 'bg-yellow-50 border-2 border-yellow-500 border-dashed animate-pulse-subtle'
                            }`}
                        style={{
                            left: `${field.xPosition}%`,
                            top: `${field.yPosition}%`,
                            width: `${field.width}px`,
                            height: `${field.height}px`,
                            borderRadius: '6px',
                        }}
                        onClick={() => onFieldClick(field.id)}
                    >
                        {isFieldCompleted(field.id) ? (
                            <div className="flex flex-col items-center">
                                {field.signature_data?.startsWith('data:') ? (
                                    <img src={field.signature_data} className="h-[80%] object-contain" alt="Signature" />
                                ) : field.signature_data?.startsWith('typed:') ? (
                                    <span
                                        className="text-xl"
                                        style={{
                                            fontFamily: field.signature_data.split(':')[1] === 'font-signature-1' ? "'Caveat', cursive" :
                                                field.signature_data.split(':')[1] === 'font-signature-2' ? "'Dancing Script', cursive" :
                                                    "'Pacifico', cursive"
                                        }}
                                    >
                                        {field.signature_data.split(':')[2]}
                                    </span>
                                ) : (
                                    <span className="text-xs font-bold text-green-600">COMPLETED</span>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center text-yellow-700 font-bold px-4">
                                <AlertCircle size={18} className="mr-2" />
                                <span>{field.fieldLabel}</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <style>{`
        @keyframes pulse-subtle {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(0.98); }
        }
        .animate-pulse-subtle {
          animation: pulse-subtle 2s infinite ease-in-out;
        }
      `}</style>
        </div>
    );
}
