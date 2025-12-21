import React, { useState, useEffect } from 'react';
import { Upload, Button, Modal, Input, List, Space, message, Image } from 'antd';
import { Plus, Download } from 'lucide-react';
import PublitioAPI from 'publitio_js_sdk';
// import { supabase } from 'configs/SupabaseConfig';
import { supabase } from '@/lib/supabase';

interface FilesTabProps {
  editItem?: { id: string;[key: string]: any };
  rawData?: any[];
}

const FilesTab: React.FC<FilesTabProps> = ({ editItem, rawData }) => {
  const [folders, setFolders] = useState<string[]>([]);
  const [files, setFiles] = useState<Record<string, any[]>>({});
  const [visibleCreateFolder, setVisibleCreateFolder] = useState<boolean>(false);
  const [folderName, setFolderName] = useState<string>('');

  const publitio = new PublitioAPI('xr7tJHfDaqk5ov18TkJX', 'aApiZqz6Di1eacmemfof14xwN63lyJHG');

  useEffect(() => {
    const project = rawData?.find((item) => item.id === editItem?.id);
    if (project && project.details) {
      setFolders(Object.keys(project.details.files || {}));
      setFiles(project.details.files || {});
    }
  }, [editItem?.id, rawData]);

  const handleCreateFolder = async () => {
    if (folderName) {
      const newFolders = [...folders, folderName];
      setFolders(newFolders);

      await supabase
        .from('y_projects')
        .update({
          details: {
            ...(rawData?.find((item) => item.id === editItem?.id)?.details || {}),
            files: {
              ...(rawData?.find((item) => item.id === editItem?.id)?.details?.files || {}),
              [folderName]: [],
            },
          },
        })
        .eq('id', editItem?.id);
      setFolderName('');
      setVisibleCreateFolder(false);
    }
  };

  const handleFileUpload = async (info: any, folder: string) => {
    const { file } = info;
    if (file.status === 'done') {
      const newFile = {
        ...file.response,
        name: file.name,
        uploadedBy: 'Current User',
        uploadedAt: new Date(),
        version: '1.0',
        stage: 'Draft',
      };

      setFiles((prevFiles) => ({
        ...prevFiles,
        [folder]: prevFiles[folder] ? [...prevFiles[folder], newFile] : [newFile],
      }));

      const currentProject = rawData?.find((item) => item.id === editItem?.id);
      const updatedFiles = {
        ...(currentProject?.details?.files || {}),
        [folder]: files[folder] ? [...files[folder], newFile] : [newFile],
      };

      await supabase
        .from('y_projects')
        .update({
          details: {
            ...(currentProject?.details || {}),
            files: updatedFiles,
          },
        })
        .eq('id', editItem?.id);
    } else if (file.status === 'error') {
      message.error(`${file.name} file upload failed.`);
    }
  };

  return (
    <div>
      <Button onClick={() => setVisibleCreateFolder(true)} icon={<Plus size={16} />}>
        Create Folder
      </Button>
      <Modal
        title="Create New Folder"
        open={visibleCreateFolder}
        onOk={handleCreateFolder}
        onCancel={() => setVisibleCreateFolder(false)}
      >
        <Input
          value={folderName}
          onChange={(e) => setFolderName(e.target.value)}
          placeholder="Folder Name"
        />
      </Modal>

      <List
        header={<div>Files</div>}
        bordered
        dataSource={folders}
        renderItem={(folder) => (
          <List.Item>
            <Space direction="vertical">
              <h4>{folder}</h4>
              <Upload
                customRequest={async ({ file, onSuccess, onError }) => {
                  try {
                    const result = await publitio.uploadFile(file, 'file', { folder });
                    onSuccess?.(result);
                  } catch (error) {
                    console.error('Upload error:', error);
                    onError?.(error as Error);
                  }
                }}
                onChange={(info) => handleFileUpload(info, folder)}
                multiple
              >
                <Button icon={<Plus size={16} />}>Upload File</Button>
              </Upload>
              {files[folder]?.map((file) => (
                <div key={file.id} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                  {file.type === 'image' ? (
                    <Image width={100} src={file.url_preview} alt={file.name} />
                  ) : (
                    <span>{file.name}</span>
                  )}
                  <Space>
                    <a href={file.url_download} download target="_blank" rel="noopener noreferrer">
                      <Button icon={<Download size={16} />} size="small">
                        Download
                      </Button>
                    </a>
                    <span>
                      - Uploaded by: {file.uploadedBy} - Version: {file.version} - Stage: {file.stage}
                    </span>
                  </Space>
                </div>
              ))}
            </Space>
          </List.Item>
        )}
      />
    </div>
  );
};

export default FilesTab;