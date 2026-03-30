import React, { useState, useEffect } from 'react';
import { Input, Alert } from 'antd';

const { TextArea } = Input;

interface JsonEditorProps {
    value?: any;
    onChange?: (value: any) => void;
    defaultValue?: any;
    placeholder?: string;
    rows?: number;
    disabled?: boolean;
}

/**
 * JSON Editor Component with validation
 * Provides textarea with JSON syntax validation and error display
 */
const JsonEditor: React.FC<JsonEditorProps> = ({ 
    value, 
    onChange, 
    defaultValue = {},
    placeholder = 'Enter JSON...',
    rows = 8,
    disabled = false
}) => {
    const [jsonText, setJsonText] = useState<string>('');
    const [error, setError] = useState<string>('');
    const isObjectMode = React.useRef(false);

    useEffect(() => {
        if (value !== undefined) {
            const stringValue = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value || '');
            if (typeof value === 'object' && value !== null) {
                isObjectMode.current = true;
            }
            // Only update text state if it's actually different to avoid cursor jumps
            if (stringValue !== jsonText) {
                setJsonText(stringValue);
            }
            setError(''); 
        } else {
            const initialValue = typeof defaultValue === 'object' 
                ? JSON.stringify(defaultValue, null, 2) 
                : String(defaultValue || '');
            if (typeof defaultValue === 'object' && defaultValue !== null) {
                isObjectMode.current = true;
            }
            setJsonText(initialValue);
            onChange?.(defaultValue);
        }
    }, [value]);

    const validateJson = (text: any): boolean => {
        const str = typeof text === 'string' ? text : JSON.stringify(text);
        if (!str || str.trim() === '') {
            setError('');
            return true;
        }

        try {
            JSON.parse(str);
            setError('');
            return true;
        } catch (e: any) {
            setError(`Invalid JSON: ${e.message}`);
            return false;
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        setJsonText(newValue);
        const isValid = validateJson(newValue);
        
        if (isValid && isObjectMode.current) {
            try {
                onChange?.(JSON.parse(newValue));
            } catch (e) {
                // If parsing fails despite validateJson passing (unlikely), send as is
                onChange?.(newValue);
            }
        } else {
            onChange?.(newValue);
        }
    };

    const handleBlur = () => {
        if (jsonText && !error) {
            try {
                // Auto-format JSON on blur
                const parsed = JSON.parse(jsonText);
                const formatted = JSON.stringify(parsed, null, 2);
                setJsonText(formatted);
                if (isObjectMode.current) {
                    onChange?.(parsed);
                } else {
                    onChange?.(formatted);
                }
            } catch (e) {
                // Keep as is if invalid
            }
        }
    };

    return (
        <div style={{ width: '100%' }}>
            <TextArea
                value={jsonText}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder={placeholder}
                autoSize={{ minRows: rows, maxRows: 30 }}
                disabled={disabled}
                className={error ? 'ant-input-status-error' : ''}
                style={{
                    fontFamily: 'monospace',
                    fontSize: '13px',
                    backgroundColor: disabled ? '#f5f5f5' : '#fafafa',
                }}
            />
            {error && (
                <Alert
                    message={error}
                    type="error"
                    showIcon
                    style={{ marginTop: '8px' }}
                />
            )}
        </div>
    );
};

export default JsonEditor;
