import React, { useState, useEffect } from 'react';
import { Input, Alert } from 'antd';

const { TextArea } = Input;

interface JsonEditorProps {
    value?: string;
    onChange?: (value: string) => void;
    defaultValue?: Record<string, any>;
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

    useEffect(() => {
        if (value !== undefined) {
            setJsonText(value);
            validateJson(value);
        } else {
            const initialValue = JSON.stringify(defaultValue, null, 2);
            setJsonText(initialValue);
            onChange?.(initialValue);
        }
    }, [value]);

    const validateJson = (text: string): boolean => {
        if (!text || text.trim() === '') {
            setError('');
            return true;
        }

        try {
            JSON.parse(text);
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
        validateJson(newValue);
        onChange?.(newValue);
    };

    const handleBlur = () => {
        if (jsonText && !error) {
            try {
                // Auto-format JSON on blur
                const parsed = JSON.parse(jsonText);
                const formatted = JSON.stringify(parsed, null, 2);
                setJsonText(formatted);
                onChange?.(formatted);
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
