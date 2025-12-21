import React, { useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Upload, message, Spin, Button, Input, List, Row, Col, Tabs, Tooltip } from 'antd';
import { CameraOutlined, UploadOutlined, DeleteOutlined, FileOutlined, LinkOutlined } from '@ant-design/icons';
import Publitio from 'publitio_js_sdk';
// import ReactCrop from 'react-image-crop';
// import 'react-image-crop/dist/ReactCrop.css';
import moment from 'moment';
import { useAuthStore } from '@/core/lib/store';

// Publitio configuration
const publitio = new Publitio(import.meta.env.VITE_PUBLITIO_API_KEY, import.meta.env.VITE_PUBLITIO_API_SECRET);

// Upload configuration
const uploadConfig = {
    maxFileSize: 10, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    maxFileNameLength: 100,
    maxFiles: 10,
};

interface FileObject {
    url: string;
    thumbnail?: string;
    name: string;
    type: string;
    description: string;
    created_at: string;
    location?: { lat: number; lng: number };
}

interface FileUploaderProps {
    onUploadComplete: (files: FileObject[]) => void;
    maxFiles?: number;
    allowedTypes?: string[];
    autoUpload?: boolean;
}

interface FileUploaderRef {
    triggerUpload: () => Promise<FileObject[]>;
}

const FileUploader = forwardRef<FileUploaderRef, FileUploaderProps>(
    ({ onUploadComplete, maxFiles = uploadConfig.maxFiles, allowedTypes = uploadConfig.allowedTypes, autoUpload = false }, ref) => {
        const { user } = useAuthStore();
        const [loading, setLoading] = useState(false);
        const [fileList, setFileList] = useState<any[]>([]);
        const [description, setDescription] = useState('');
        const [googleDocLink, setGoogleDocLink] = useState('');
        const [activeTab, setActiveTab] = useState('files');
        const [linkFile, setLinkFile] = useState<any | null>(null);
        // const [cropModalVisible, setCropModalVisible] = useState(false);
    // const [crop, setCrop] = useState({ unit: '%', x: 0, y: 0, width: 50, height: 50, aspect: 1 });
    // const [imageSrc, setImageSrc] = useState<string | null>(null);
    // const [imageRef, setImageRef] = useState<HTMLImageElement | null>(null);
    // const [currentFileIndex, setCurrentFileIndex] = useState<number | null>(null);

    // Get geolocation

        const getLocation = useCallback((): Promise<{ lat: number; lng: number } | null> => {
            return new Promise((resolve) => {
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
                        () => resolve(null)
                    );
                } else {
                    resolve(null);
                }
            });
        }, []);

        const requestCameraPermission = useCallback(async (): Promise<boolean> => {
            try {
                await navigator.mediaDevices.getUserMedia({ video: true });
                return true;
            } catch (error) {
                console.error('Camera permission denied:', error);
                message.error('Camera access denied. Please allow camera permissions.');
                return false;
            }
        }, []);

        const captureImage = useCallback(async () => {
            const hasPermission = await requestCameraPermission();
            if (!hasPermission) return;

            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.capture = 'environment';
            input.onchange = async (e: any) => {
                const file = e.target.files?.[0];
                if (!file) return;

                if (file.size / 1024 / 1024 > uploadConfig.maxFileSize) {
                    message.error(`File must be smaller than ${uploadConfig.maxFileSize}MB!`);
                    return;
                }
                if (!allowedTypes.includes(file.type)) {
                    message.error(`Only ${allowedTypes.join(', ')} files are allowed!`);
                    return;
                }
                if (fileList.length + (linkFile ? 1 : 0) >= maxFiles) {
                    message.error(`Max ${maxFiles} files allowed.`);
                    return;
                }

                const newFile = {
                    uid: `-${fileList.length + 1}`,
                    name: file.name,
                    status: 'done',
                    url: URL.createObjectURL(file),
                    originFileObj: file,
                    type: file.type,
                };
                setFileList((prev) => [...prev, newFile]);
            };
            input.click();
        }, [allowedTypes, fileList, maxFiles, requestCameraPermission, linkFile]);

        // Convert file to base64
    // const getBase64 = useCallback((file: File): Promise<string> =>
    //   new Promise((resolve, reject) => {
    //     const reader = new FileReader();
    //     reader.readAsDataURL(file);
    //     reader.onload = () => resolve(reader.result as string);
    //     reader.onerror = (error) => reject(error);
    //   }), []);
        const compressAndResizeImage = useCallback((file: File, maxWidth = 800): Promise<File> => {
            if (!file.type.startsWith('image/')) return Promise.resolve(file);
            return new Promise((resolve, reject) => {
                const img = new window.Image();
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = (e) => (img.src = e.target!.result as string);
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d')!;
                    const aspectRatio = img.height / img.width;
                    canvas.width = maxWidth;
                    canvas.height = maxWidth * aspectRatio;
                    ctx.drawImage(img, 0, 0, maxWidth, maxWidth * aspectRatio);
                    canvas.toBlob(
                        (blob) => resolve(new File([blob!], file.name, { type: file.type, lastModified: Date.now() })),
                        file.type,
                        0.7
                    );
                };
                img.onerror = (error) => reject(error);
                reader.onerror = (error) => reject(error);
            });
        }, []);

        // Get cropped image
    // const getCroppedImage = useCallback((): Promise<File> => {
    //   if (!imageRef || !crop.width || !crop.height) {
    //     message.error('Please select a crop area.');
    //     return Promise.reject();
    //   }
    //   const canvas = document.createElement('canvas');
    //   const scaleX = imageRef.naturalWidth / imageRef.width;
    //   const scaleY = imageRef.naturalHeight / imageRef.height;
    //   canvas.width = crop.width * scaleX;
    //   canvas.height = crop.height * scaleY;
    //   const ctx = canvas.getContext('2d')!;
    //   ctx.drawImage(imageRef, crop.x * scaleX, crop.y * scaleY, crop.width * scaleX, crop.height * scaleY, 0, 0, crop.width * scaleX, crop.height * scaleY);
    //   return new Promise((resolve) => {
    //     canvas.toBlob(
    //       (blob) => resolve(new File([blob!], `cropped_${Date.now()}.jpg`, { type: 'image/jpeg', lastModified: Date.now() })),
    //       'image/jpeg',
    //       0.7
    //     );
    //   });
    // }, [imageRef, crop]);
        const beforeUpload = useCallback((file: File, files: File[]) => {
            if (file.size / 1024 / 1024 > uploadConfig.maxFileSize) {
                message.error(`File must be smaller than ${uploadConfig.maxFileSize}MB!`);
                return false;
            }
            if (!allowedTypes.includes(file.type)) {
                message.error(`Only ${allowedTypes.join(', ')} files are allowed!`);
                return false;
            }
            if (file.name.length > uploadConfig.maxFileNameLength) {
                message.error(`File name too long. Max ${uploadConfig.maxFileNameLength} characters.`);
                return false;
            }
            if (files.length + fileList.length + (activeTab === 'link' ? 1 : 0) > maxFiles) {
                message.error(`Max ${maxFiles} files allowed.`);
                return false;
            }

            setFileList((prev) => [
                ...prev,
                { uid: `-${prev.length + 1}`, name: file.name, status: 'done', url: URL.createObjectURL(file), originFileObj: file, type: file.type },
            ]);
            return false;
        }, [allowedTypes, fileList, maxFiles, activeTab]);


        // Handle crop confirmation
    // const handleCropConfirm = useCallback(async () => {
    //   try {
    //     const croppedFile = await getCroppedImage();
    //     setCropModalVisible(false);
    //     setFileList((prev) => [
    //       ...prev,
    //       {
    //         uid: `-${prev.length + 1}`,
    //         name: croppedFile.name,
    //         status: 'done',
    //         url: URL.createObjectURL(croppedFile),
    //         originFileObj: croppedFile,
    //       },
    //     ]);
    //   } catch (error) {
    //     console.error('Error cropping image:', error);
    //     message.error('Failed to crop image.');
    //   }
    // }, [getCroppedImage]);

        const handleGoogleDocChange = useCallback((e) => {
            const newLink = e.target.value;
            setGoogleDocLink(newLink);
            if (newLink) {
                const newLinkFile = {
                    uid: `link-1`,
                    name: newLink, // Use the link itself as the name
                    url: newLink,
                    type: 'google-doc',
                };
                setLinkFile(newLinkFile);
            } else {
                setLinkFile(null);
            }
        }, []);
        
        const triggerUpload = useCallback(async (): Promise<FileObject[]> => {
            const itemsToUpload = [...fileList];
            if (linkFile) {
                itemsToUpload.push(linkFile);
            }

            if (itemsToUpload.length === 0) {
                return [];
            }
            setLoading(true);
            try {
                const createdAt = moment().format();
                const location = await getLocation();
                const uploadedFiles: FileObject[] = [];

                for (const file of itemsToUpload) {
                    if (file.type === 'google-doc') {
                        uploadedFiles.push({
                            url: file.url,
                            name: file.name,
                            type: file.type,
                            description,
                            created_at: createdAt,
                            location: location || undefined,
                        });
                    } else {
                        const compressedFile = await compressAndResizeImage(file.originFileObj);
                        const response = await publitio.uploadFile(compressedFile);
                        uploadedFiles.push({
                            url: response.url_preview,
                            thumbnail: compressedFile.type.startsWith('image/') ? response.url_thumbnail || response.url_preview : undefined,
                            name: compressedFile.name,
                            type: compressedFile.type,
                            description,
                            created_at: createdAt,
                            location: location || undefined,
                        });
                    }
                }
                onUploadComplete(uploadedFiles);
                setFileList([]);
                setLinkFile(null);
                setDescription('');
                setGoogleDocLink('');
                message.success('Files uploaded successfully!');
                return uploadedFiles;
            } catch (error) {
                console.error('Error uploading files:', error);
                message.error('File upload failed.');
                throw error;
            } finally {
                setLoading(false);
            }
        }, [fileList, linkFile, description, getLocation, compressAndResizeImage, onUploadComplete]);

        useImperativeHandle(ref, () => ({ triggerUpload }));

        const handleRemove = useCallback((file: any) => {
            if (file.type === 'google-doc') {
                setLinkFile(null);
                setGoogleDocLink('');
            } else {
                setFileList((prev) => prev.filter((item) => item.uid !== file.uid));
            }
        }, []);

        const renderFileContent = (file: any) => {
            if (file.type === 'google-doc') {
                return (
                    <List.Item.Meta
                        avatar={
                            <div style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <a href={file.url} target="_blank" rel="noopener noreferrer">
                                    <LinkOutlined style={{ fontSize: 24, color: '#1890ff' }} />
                                </a>
                            </div>
                        }
                        title={<a href={file.url} target="_blank" rel="noopener noreferrer">{file.name}</a>}
                        description={`Added: ${moment().format('YYYY-MM-DD HH:mm')}`}
                    />
                );
            } else {
                const isImage = file.type.startsWith('image/');
                const previewUrl = isImage ? file.url : undefined;
                return (
                    <List.Item.Meta
                        avatar={
                            <div style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {isImage ? (
                                    <img src={previewUrl} alt={file.name} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }} />
                                ) : (
                                    <a href={file.url} target="_blank" rel="noopener noreferrer">
                                        <FileOutlined style={{ fontSize: 24, color: '#1890ff' }} />
                                    </a>
                                )}
                            </div>
                        }
                        title={file.name}
                        description={`Added: ${moment().format('YYYY-MM-DD HH:mm')}`}
                    />
                );
            }
        };

        const tabsItems = [
            {
                key: 'files',
                label: 'Upload Files',
                children: (
                    <Row gutter={[12, 12]} align="middle">
                        <Col>
                            <Button icon={<CameraOutlined />} onClick={captureImage}>
                                Capture Image
                            </Button>
                        </Col>
                        <Col>
                            <Upload
                                accept={allowedTypes.join(',')}
                                listType="text"
                                fileList={[]}
                                beforeUpload={beforeUpload}
                                multiple
                                showUploadList={false}
                            >
                                <Button icon={<UploadOutlined />}>Select Files</Button>
                            </Upload>
                        </Col>
                    </Row>
                ),
            },
            {
                key: 'link',
                label: 'Add Google Doc Link',
                children: (
                    <Row align="bottom">
                        <Col flex="auto">
                            <Tooltip title="Google Doc Link">
                                <Input style={{ width: '50%' }}
                                    prefix={<LinkOutlined />}
                                    value={googleDocLink}
                                    onChange={handleGoogleDocChange}
                                    placeholder="Paste Google Doc link here"
                                />
                            </Tooltip>
                        </Col>
                    </Row>
                ),
            },
        ];
        
        const combinedFileList = [...fileList, ...(linkFile ? [linkFile] : [])];
        const totalFiles = combinedFileList.length;

        return (
            <Spin spinning={loading}>
                <div style={{ padding: 16, border: '2px dashed #d9d9d9', borderRadius: 8 }}>
                    <Tabs
                        defaultActiveKey="files"
                        items={tabsItems}
                        onChange={setActiveTab}
                    />

                    {activeTab!=="link" && <div style={{ marginTop: 16, marginBottom: 16 }}>
                        <span style={{ fontSize: 14, color: '#555' }}>{totalFiles}/{maxFiles} files selected</span>
                    </div>}

                    {totalFiles > 0 && (
                        <div style={{ marginBottom: 16 }}>
                            <List
                                dataSource={combinedFileList}
                                renderItem={(file) => (
                                    <List.Item
                                        actions={[<Button type="link" icon={<DeleteOutlined />} onClick={() => handleRemove(file)} />]}
                                        style={{ background: '#fff', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', borderRadius: 6, marginBottom: 8 }}
                                    >
                                        {renderFileContent(file)}
                                    </List.Item>
                                )}
                            />
                        </div>
                    )}

                    <Row gutter={[8, 8]} align="bottom">
                        <Col flex="auto">
                            <Input.TextArea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Add a description for this batch of files"
                                maxLength={200}
                                rows={2}
                            />
                        </Col>
                        {!autoUpload && (
                            <Col>
                                <Button
                                    type="primary"
                                    onClick={triggerUpload}
                                    disabled={!totalFiles}
                                >
                                    Upload {totalFiles} File{totalFiles !== 1 ? 's' : ''}
                                </Button>
                            </Col>
                        )}
                    </Row>
                </div>
                {/* <Modal
          title="Crop Image"
          open={cropModalVisible}
          onOk={handleCropConfirm}
          onCancel={() => setCropModalVisible(false)}
          okText="Confirm"
          cancelText="Cancel"
        >
          {imageSrc && (
            <ReactCrop crop={crop} onChange={(newCrop) => setCrop(newCrop)} aspect={1} ruleOfThirds>
              <img src={imageSrc} alt="Crop" onLoad={(e) => setImageRef(e.currentTarget)} style={{ maxWidth: '100%' }} />
            </ReactCrop>
          )}
        </Modal> */}
            </Spin>
        );
    }
);

export default FileUploader;