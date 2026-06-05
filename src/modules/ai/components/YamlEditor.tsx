import React, { useState, useEffect } from 'react';
import { Input, Alert } from 'antd';
import jsYaml from 'js-yaml';

const { TextArea } = Input;

interface YamlEditorProps {
    value?: string;
    onChange?: (value: string) => void;
    placeholder?: string;
    rows?: number;
    disabled?: boolean;
}

/**
 * YAML Editor Component with validation
 * Provides textarea with YAML syntax validation and error display
 */
const YamlEditor: React.FC<YamlEditorProps> = ({
    value = '',
    onChange,
    placeholder = 'Enter YAML...',
    rows = 8,
    disabled = false
}) => {
    const [yamlText, setYamlText] = useState<string>('');
    const [error, setError] = useState<string>('');

    useEffect(() => {
        if (value !== undefined && value !== yamlText) {
            setYamlText(value);
            setError('');
        }
    }, [value]);

    const validateYaml = (text: string): boolean => {
        if (!text || text.trim() === '') {
            setError('');
            return true;
        }

        try {
            jsYaml.load(text);
            setError('');
            return true;
        } catch (e: any) {
            setError(`Invalid YAML: ${e.message}`);
            return false;
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        setYamlText(newValue);
        validateYaml(newValue);
        onChange?.(newValue);
    };

    return (
        <div style={{ width: '100%' }}>
            <TextArea
                value={yamlText}
                onChange={handleChange}
                placeholder={placeholder}
                autoSize={{ minRows: rows, maxRows: 30 }}
                disabled={disabled}
                className={error ? 'ant-input-status-error' : ''}
                style={{
                    fontFamily: 'Consolas, Monaco, "Courier New", Courier, monospace',
                    fontSize: '13px',
                    backgroundColor: disabled ? '#f5f5f5' : '#1e1e1e',
                    color: disabled ? '#a0a0a0' : '#d4d4d4',
                    border: '1px solid #434343',
                    borderRadius: '6px',
                    padding: '10px',
                    lineHeight: '1.5'
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

export default YamlEditor;
