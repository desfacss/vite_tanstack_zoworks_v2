import React, { useRef, useState } from 'react';
import { Button, Tabs, Input, Card, Space } from 'antd';
import SignatureCanvas from 'react-signature-canvas';
import { Trash2, Type, PenTool, Upload as UploadIcon } from 'lucide-react';

interface SignatureDrawerProps {
    onSave: (signatureData: string) => void;
    onCancel: () => void;
}

export function SignatureDrawer({ onSave, onCancel }: SignatureDrawerProps) {
    const sigCanvas = useRef<SignatureCanvas>(null);
    const [typedName, setTypedName] = useState('');
    const [selectedFont, setSelectedFont] = useState('font-signature-1');

    const fonts = [
        { id: 'font-signature-1', name: 'Caveat', family: "'Caveat', cursive" },
        { id: 'font-signature-2', name: 'Dancing Script', family: "'Dancing Script', cursive" },
        { id: 'font-signature-3', name: 'Pacifico', family: "'Pacifico', cursive" },
    ];

    const clear = () => sigCanvas.current?.clear();

    const handleSaveDrawn = () => {
        if (sigCanvas.current?.isEmpty()) return;
        const data = sigCanvas.current?.getTrimmedCanvas().toDataURL('image/png');
        if (data) onSave(data);
    };

    const handleSaveTyped = () => {
        if (!typedName) return;
        // In a real app, we might convert the text to an image or SVG
        // For now we'll just send the name with a font prefix or handle it in CSS
        onSave(`typed:${selectedFont}:${typedName}`);
    };

    return (
        <div className="p-4">
            <Tabs defaultActiveKey="draw">
                <Tabs.TabPane
                    key="draw"
                    tab={<span><PenTool size={16} className="inline mr-2" />Draw</span>}
                >
                    <div className="border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 mb-4 overflow-hidden">
                        <SignatureCanvas
                            ref={sigCanvas}
                            penColor="black"
                            canvasProps={{
                                width: 600,
                                height: 300,
                                className: 'signature-canvas w-full h-[300px]'
                            }}
                        />
                    </div>
                    <div className="flex justify-between">
                        <Button icon={<Trash2 size={16} />} onClick={clear}>Clear</Button>
                        <Space>
                            <Button onClick={onCancel}>Cancel</Button>
                            <Button type="primary" onClick={handleSaveDrawn}>Adopt and Sign</Button>
                        </Space>
                    </div>
                </Tabs.TabPane>

                <Tabs.TabPane
                    key="type"
                    tab={<span><Type size={16} className="inline mr-2" />Type</span>}
                >
                    <Input
                        size="large"
                        placeholder="Type your name"
                        value={typedName}
                        onChange={(e) => setTypedName(e.target.value)}
                        className="mb-8"
                    />

                    <div className="grid grid-cols-1 gap-4 mb-8">
                        {fonts.map((font) => (
                            <Card
                                key={font.id}
                                className={`cursor-pointer transition-all ${selectedFont === font.id ? 'border-blue-500 bg-blue-50' : 'hover:border-gray-300'
                                    }`}
                                onClick={() => setSelectedFont(font.id)}
                            >
                                <div
                                    style={{ fontFamily: font.family }}
                                    className="text-4xl py-4 flex items-center justify-between"
                                >
                                    <span>{typedName || 'Your Signature'}</span>
                                    <span className="text-xs text-gray-400 font-sans uppercase tracking-widest">{font.name}</span>
                                </div>
                            </Card>
                        ))}
                    </div>

                    <div className="flex justify-end gap-3">
                        <Button onClick={onCancel}>Cancel</Button>
                        <Button type="primary" onClick={handleSaveTyped} disabled={!typedName}>Adopt and Sign</Button>
                    </div>
                </Tabs.TabPane>

                <Tabs.TabPane
                    key="upload"
                    tab={<span><UploadIcon size={16} className="inline mr-2" />Upload</span>}
                >
                    <div className="flex flex-col items-center justify-center h-[300px] border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 mb-4">
                        <UploadIcon size={48} className="text-gray-300 mb-4" />
                        <p className="text-gray-400">Upload a photo of your signature</p>
                        <Button type="dashed" className="mt-4">Choose File</Button>
                    </div>
                    <div className="flex justify-end gap-3">
                        <Button onClick={onCancel}>Cancel</Button>
                        <Button disabled>Adopt and Sign</Button>
                    </div>
                </Tabs.TabPane>
            </Tabs>

            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@700&family=Dancing+Script:wght@700&family=Pacifico&display=swap');
      `}</style>
        </div>
    );
}
