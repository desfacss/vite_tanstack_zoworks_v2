import React, { useState, useRef, useMemo } from 'react';
import Papa from 'papaparse';
import { message, Button, Typography, Space, Tooltip, Dropdown, MenuProps, Drawer, Modal, Form, Select, InputNumber } from 'antd';
import { Upload as LucideUpload, MoreHorizontal, QrCode, Download, FileDown } from 'lucide-react';
import { MenuItem } from '@/core/components/ActionBar/types';
import { useAuthStore } from '@/core/lib/store';
import { useReactToPrint } from 'react-to-print';
import QRCard from '@/core/components/details/QRCard';

const { Text } = Typography;

// Define columns to exclude from export
const EXCLUDED_EXPORT_COLUMNS = ['id', 'created_by', 'updated_by', 'created_at', 'updated_at', 'geofence', 'lat', 'lng', 'notes', 'is_active', 'x_client_type', 'parent_account_id'];

interface ForeignKey {
    source_table: string;
    source_column: string;
    display_column: string;
}

interface MetadataField {
    key: string;
    type: string;
    display_name: string;
    foreign_key?: ForeignKey;
    is_template?: boolean;
}

interface ViewConfig {
    metadata: MetadataField[];
    v_metadata?: MetadataField[];
    general?: {
        features?: { [key: string]: any };
        features_settings?: { [key: string]: any };
    };
}

interface Config {
    features?: { [key: string]: boolean | undefined };
    features_settings?: { [key: string]: any };
}

interface ImportExportProps {
    entityType: string;
    entitySchema: string;
    viewConfig: ViewConfig | undefined;
    config: Config | undefined;
    data: any[];
    printRef: React.RefObject<HTMLDivElement>;
    visibleColumns: string[];
    children?: (actions: MenuItem[]) => React.ReactNode;
}


interface PrintSettings {
    pageSize: 'A4' | 'Letter';
    margin: number;
    scale: number;
}

const getNestedValue = (obj: any, path: string): string => {
    if (Object.prototype.hasOwnProperty.call(obj, path)) {
        const value = obj[path];
        return value === null || value === undefined ? '' : String(value);
    }

    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
        if (current === undefined || current === null || !Object.prototype.hasOwnProperty.call(current, key)) {
            return '';
        }
        current = current[key];
    }

    if (Array.isArray(current)) {
        try {
            const isComplexArray = current.some(item => typeof item === 'object' && item !== null);
            return isComplexArray ? JSON.stringify(current) : current.join(', ');
        } catch (e) {
            return current.join(', ');
        }
    }

    if (current === null || current === undefined) return '';
    if (typeof current === 'object') return JSON.stringify(current);

    return String(current);
};

const setNestedValue = (obj: any, path: string, value: any): void => {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!current[key] || typeof current[key] !== 'object' || Array.isArray(current[key])) {
            current[key] = {};
        }
        current = current[key];
    }

    const lastKey = keys[keys.length - 1];

    if (typeof value === 'string' && (value.startsWith('[') && value.endsWith(']'))) {
        try {
            current[lastKey] = JSON.parse(value);
        } catch {
            current[lastKey] = value;
        }
    }
    else if (typeof value === 'string' && (lastKey === 'tags')) {
        current[lastKey] = value.split(',').map((v: string) => v.trim());
    }
    else {
        current[lastKey] = value === '' ? null : value;
    }
};

const ImportExportComponent: React.FC<ImportExportProps> = ({
    entityType,
    viewConfig,
    config,
    data,
    printRef,
    children
}) => {
    const [importFile, setImportFile] = useState<File | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isPrinting] = useState(false);
    const [qrDrawerVisible, setQrDrawerVisible] = useState(false);
    const qrPrintRef = useRef<HTMLDivElement>(null);

    const [isPrintSettingsModalVisible, setIsPrintSettingsModalVisible] = useState(false);
    const [printSettingsForm] = Form.useForm<PrintSettings>();

    const [currentQrPrintSettings] = useState<PrintSettings>({
        pageSize: 'A4',
        margin: 10,
        scale: 100,
    });

    const metadata = useMemo(() => viewConfig?.metadata || viewConfig?.v_metadata || [], [viewConfig]);
    const features = useMemo(() => viewConfig?.general?.features || config?.features || {}, [viewConfig, config]);
    const qrForm = useMemo(() => features?.qr_form || config?.features_settings?.qr_form, [features, config]);

    const displayToColumnMap: Record<string, string> = useMemo(() => metadata.reduce((acc, field) => {
        acc[field.display_name] = field.key;
        return acc;
    }, {} as Record<string, string>), [metadata]);

    const foreignKeyMaps: Record<string, ForeignKey> = useMemo(() => metadata.reduce((acc, field) => {
        if (field.foreign_key) {
            acc[field.key] = field.foreign_key;
        }
        return acc;
    }, {} as Record<string, ForeignKey>), [metadata]);

    const convertDisplayToId = async (_table: string, _sourceColumn: string, _displayColumn: string, _displayValue: string): Promise<string | null> => {
        return 'mock-uuid';
    };

    const { user, organization } = useAuthStore();

    const handlePrint = useReactToPrint({
        contentRef: printRef,
    });

    const handlePrintQRCodes = useReactToPrint({
        contentRef: qrPrintRef,
    });

    const showQrPrintSettingsModal = () => setIsPrintSettingsModalVisible(true);
    const handlePrintSettingsModalOk = () => {
        setIsPrintSettingsModalVisible(false);
        handlePrintQRCodes();
    };
    const handlePrintSettingsModalCancel = () => setIsPrintSettingsModalVisible(false);

    const handleFileSelect = (file: File) => {
        setImportFile(file);
        return false;
    };

    const handleImport = async (): Promise<void> => {
        if (!importFile) { message.error('Please select a file'); return; }
        setIsImporting(true);

        Papa.parse(importFile, {
            complete: async (result: Papa.ParseResult<Record<string, string>>) => {
                try {
                    const recordsPromises = result.data
                        .filter((row) => Object.keys(row).length > 0 && Object.values(row).some(v => v !== ''))
                        .map(async (row) => {
                            const processedRow: Record<string, any> = {
                                organization_id: organization?.id || '',
                                created_by: user?.id || '',
                                updated_by: user?.id || '',
                                details: {},
                            };

                            for (const [displayName, value] of Object.entries(row)) {
                                const columnName = displayToColumnMap[displayName];
                                if (!columnName || columnName === 'organization_id') continue;

                                let finalValue: any = value;

                                if (foreignKeyMaps[columnName]) {
                                    const fk = foreignKeyMaps[columnName];
                                    finalValue = value ? await convertDisplayToId(fk.source_table, fk.source_column, fk.display_column, String(value)) : null;
                                }

                                setNestedValue(processedRow, columnName, finalValue);
                            }

                            return processedRow;
                        });

                    await Promise.all(recordsPromises);
                    message.success('Import successful (Simulated)');
                    setImportFile(null);
                } catch (err) {
                    message.error('Error processing import: ' + (err as Error).message);
                } finally {
                    setIsImporting(false);
                }
            },
            header: true,
            skipEmptyLines: true,
        });
    };

    const handleExport = async (): Promise<void> => {
        setIsExporting(true);
        try {
            const exportMetadata = metadata.filter(field => field.is_template === true && !EXCLUDED_EXPORT_COLUMNS.includes(field.key));
            if (exportMetadata.length === 0) {
                message.warning('No columns available for export.');
                setIsExporting(false);
                return;
            }

            const exportData = data.map((row) => {
                const exportRow: Record<string, string> = {};
                for (const field of exportMetadata) {
                    const value = field.foreign_key ? (row[`${field.key}_name`] || getNestedValue(row, field.key)) : getNestedValue(row, field.key);
                    exportRow[field.display_name] = value;
                }
                return exportRow;
            });

            const csv = Papa.unparse(exportData);
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${entityType}_template.csv`;
            link.click();
            message.success('Export successful');
        } catch (err) {
            message.error('Export error: ' + (err as Error).message);
        } finally {
            setIsExporting(false);
        }
    };

    const toggleQrDrawer = () => setQrDrawerVisible(!qrDrawerVisible);

    const actions: MenuItem[] = [
        ...(features.import ? [{
            key: 'import',
            label: importFile ? 'Import CSV' : 'Select CSV File',
            icon: <LucideUpload size={16} />,
            onClick: () => { importFile ? handleImport() : document.getElementById('import-upload')?.click() },
        }] : []),
        ...(data.length > 0 && features.export ? [{
            key: 'export',
            label: 'Export CSV',
            icon: <Download size={16} />,
            onClick: () => handleExport(),
            disabled: isExporting,
        }] : []),
        ...(data.length > 0 && features.export_pdf ? [{
            key: 'export_pdf',
            label: 'Download PDF',
            icon: <FileDown size={16} />,
            onClick: () => handlePrint(),
            disabled: isPrinting || !printRef.current,
        }] : []),
        ...(data.length > 0 && features.print_qr && qrForm ? [{
            key: 'print_qr',
            label: 'Show QR Codes',
            icon: <QrCode size={16} />,
            onClick: () => toggleQrDrawer(),
        }] : []),
    ];

    const menuItems = actions as any[];
    const singleAction = menuItems.length === 1 ? menuItems[0] : null;

    return (
        <>
            <div style={{ display: 'none' }}>
                {features.import && (
                    <input
                        id="import-upload"
                        type="file"
                        accept=".csv"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileSelect(file);
                        }}
                    />
                )}
            </div>

            <Drawer
                title="QR Codes"
                placement="right"
                onClose={toggleQrDrawer}
                open={qrDrawerVisible}
                width="50%"
                extra={
                    <Button type="primary" icon={<FileDown size={16} />} onClick={showQrPrintSettingsModal} loading={isPrinting}>
                        Download PDF
                    </Button>
                }
            >
                {data.length === 0 ? <Text>No data available.</Text> : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
                        {data.map((item: any) => item.id && (
                            <div key={item.id}><QRCard f={qrForm!} i={item.id} /></div>
                        ))}
                    </div>
                )}
                <div style={{ display: 'none' }}><div ref={qrPrintRef} className="qr-card-print-container">
                    {data.map((item: any) => item.id && (
                        <div key={`print-${item.id}`} className="qr-card-item"><QRCard f={qrForm!} i={item.id} /></div>
                    ))}
                </div></div>
            </Drawer>

            <Modal title="Print Settings" open={isPrintSettingsModalVisible} onOk={handlePrintSettingsModalOk} onCancel={handlePrintSettingsModalCancel} okText="Generate PDF" confirmLoading={isPrinting}>
                <Form form={printSettingsForm} layout="vertical" initialValues={currentQrPrintSettings}>
                    <Form.Item name="pageSize" label="Page Size"><Select><Select.Option value="A4">A4</Select.Option><Select.Option value="Letter">Letter</Select.Option></Select></Form.Item>
                    <Form.Item name="margin" label="Margins (mm)"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
                    <Form.Item name="scale" label="Scale (%)"><InputNumber min={10} max={200} step={5} style={{ width: '100%' }} /></Form.Item>
                </Form>
            </Modal>

            {children ? (
                children(actions)
            ) : (
                <Space direction="horizontal" size="middle">
                    {!singleAction && menuItems.length > 0 && (
                        <Dropdown menu={{ items: menuItems }} trigger={['click']}>
                            <Tooltip title="More Actions">
                                <Button type="primary" icon={<MoreHorizontal size={18} />} />
                            </Tooltip>
                        </Dropdown>
                    )}
                    {singleAction && (
                        <Tooltip title={singleAction.label}>
                            <Button
                                type="primary"
                                icon={singleAction.icon}
                                onClick={singleAction.onClick}
                                disabled={singleAction.disabled}
                                loading={isImporting || isExporting || isPrinting}
                            />
                        </Tooltip>
                    )}
                </Space>
            )}
        </>
    );
};


export default ImportExportComponent;