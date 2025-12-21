import React, { useState, useEffect } from 'react';
import { message, Spin, Image, Tooltip, Button, Modal, Row, Col } from 'antd';
import { File, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/core/lib/store';
import dayjs from 'dayjs';
import ImageUploader from '@/core/components/shared/ImageUploader';

interface FileObject {
  url: string;
  thumbnail?: string;
  name: string;
  type: string;
  description: string;
  created_at: string;
  location?: { lat: number; lng: number };
}

interface GallerySet {
  id: string; // Add id to the interface
  files: FileObject[];
  created_by: string;
  created_by_name: string;
}

interface EntityImagesProps {
  entity_type: string;
  entity_id: string;
}

const EntityImages: React.FC<EntityImagesProps> = ({ entity_type, entity_id }) => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [gallery, setGallery] = useState<GallerySet[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<{ id: string; name: string } | null>(null);

  // Fetch existing files
  useEffect(() => {
    const fetchFiles = async () => {
      setLoading(true);
      const config = {
        entity_schema: 'public',
        entity_name: 'ent_attachments',
        organization_id: user?.organization_id,
        joins: [
          {
            schema: 'identity',
            name: 'users',
            alias: 'assignee',
            type: 'LEFT',
            on_clause: 'base.created_by = assignee.id',
          },
        ],
        filters: [
          {
            column: 'entity_type',
            operator: '=',
            value: entity_type,
          },
          {
            column: 'entity_id',
            operator: '=',
            value: entity_id,
          },
        ],
        sorting: {
          column: 'created_at',
          direction: 'DESC',
        },
      };

      try {
        // const { data, error } = await supabase.rpc('core_get_entity_data_v5', { config });
        const { data, error } = await supabase.schema('core').rpc('core_get_entity_data_v30', { config });
        if (error) {
          message.error('Failed to fetch files.');
          console.error(error);
          return;
        }

        const parsedData = data?.data || [];
        setGallery(
          parsedData.map((item: any) => ({
            id: item.id, // Ensure id is mapped
            files: item.images,
            created_by: item.created_by,
            created_by_name: item.assignee?.name,
          }))
        );
      } catch (err) {
        message.error('An unexpected error occurred while fetching files.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (user?.organization_id) {
      fetchFiles();
    }
  }, [entity_type, entity_id, user?.organization_id]);

  // Handle new file uploads
  const handleFilesUploaded = async (files: FileObject[]) => {
    if (!user?.id) {
      message.error('You must be logged in to upload files.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.from('ent_attachments').insert({
        entity_type,
        entity_id,
        images: files,
        created_by: user.id,
      }).select();

      if (error) {
        console.error('Supabase insert error:', error);
        message.error('Failed to save files.');
        return;
      }

      const newRecord = data[0];
      setGallery((prev) => [
        {
          id: newRecord.id,
          files: newRecord.images,
          created_by: newRecord.created_by,
          created_by_name: user?.name || 'Unknown',
        },
        ...prev,
      ]);

      message.success('Files uploaded successfully!');
    } catch (error) {
      console.error('Error saving files:', error);
      message.error('File upload failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFile = (setId: string) => {
    const fileSet = gallery.find(set => set.id === setId);
    if (fileSet) {
      setFileToDelete({ id: setId, name: fileSet.files[0]?.name || 'this file' });
      setIsModalVisible(true);
    }
  };

  const confirmDelete = async () => {
    if (!fileToDelete) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('ent_attachments')
        .delete()
        .eq('id', fileToDelete.id);

      if (error) {
        message.error('Failed to delete file.');
        console.error('Supabase delete error:', error);
      } else {
        setGallery((prev) => prev.filter((set) => set.id !== fileToDelete.id));
        message.success('File deleted successfully!');
      }
    } catch (err) {
      message.error('An unexpected error occurred during deletion.');
      console.error(err);
    } finally {
      setLoading(false);
      setIsModalVisible(false);
      setFileToDelete(null);
    }
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setFileToDelete(null);
  };

  return (
    <div>
      <Spin spinning={loading}>
        <ImageUploader onUploadComplete={handleFilesUploaded} />

        {/* Responsive File Gallery */}
        <div style={{ marginTop: 16 }}>
          <Row gutter={[16, 16]}>
            {gallery?.map((fileSet) => (
              !!fileSet?.files?.length && (
                <Col
                  key={fileSet.id}
                  xs={24}
                  md={12}
                  lg={8}
                >
                  <div style={{
                    padding: 16,
                    border: '1px solid #e8e8e8',
                    borderRadius: 8,
                    position: 'relative', // Make this card container relative
                    overflow: 'hidden', // Ensures nothing spills outside the rounded corners
                  }}>
                    {/* Delete button positioned absolutely */}
                    <Button
                      type="text" // Changed to text type for a cleaner look without background
                      icon={<Trash2 size={16} />}
                      onClick={() => handleRemoveFile(fileSet.id)}
                      style={{
                        position: 'absolute',
                        top: 8, // Adjust as needed for desired spacing from top
                        right: 8, // Adjust as needed for desired spacing from right
                        color: 'red',
                        zIndex: 1, // Ensure it's above other content
                        background: 'rgba(255, 255, 255, 0.7)', // Optional: slight background for visibility
                        borderRadius: '50%', // Optional: makes it round
                        height: 32, // Adjust height to make it a neat circle
                        width: 32, // Adjust width to make it a neat circle
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    />

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8, marginTop: 24 }}> {/* Added marginTop to prevent overlap with button */}
                      {fileSet.files.map((file, fileIndex) => (
                        <div key={fileIndex} style={{ position: 'relative' }}>
                          {file.type.startsWith('image/') ? (
                            <Image
                              src={file.thumbnail || file.url}
                              alt={file.description || file.name}
                              width={100}
                              height={100}
                              style={{ objectFit: 'cover', borderRadius: 8 }}
                              preview={{ src: file.url }}
                            />
                          ) : (
                            <Tooltip title={file.name}>
                              <a
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  display: 'block',
                                  width: 100,
                                  height: 100,
                                  background: '#f0f0f0',
                                  borderRadius: 8,
                                  textAlign: 'center',
                                  paddingTop: 30,
                                }}
                              >
                                <File size={40} className="text-blue-500" />
                              </a>
                            </Tooltip>
                          )}
                        </div>
                      ))}
                    </div>
                    <div>
                      <p>
                        {!!fileSet?.created_by_name && <strong>{fileSet?.created_by_name}</strong>} ({dayjs(fileSet?.files[0]?.created_at).format('YYYY-MM-DD HH:mm:ss')})
                      </p>
                      {!!fileSet?.files[0]?.description && (
                        <p>
                          Description: <strong>{fileSet?.files[0]?.description}</strong>
                        </p>
                      )}
                      {fileSet?.files[0]?.location && (
                        <p>
                          Location: <strong>({fileSet?.files[0].location.lat}, {fileSet?.files[0].location.lng})</strong>
                        </p>
                      )}
                    </div>
                  </div>
                </Col>
              )
            ))}
          </Row>
        </div>
      </Spin>

      <Modal
        title="Confirm Deletion"
        open={isModalVisible}
        onOk={confirmDelete}
        onCancel={handleCancel}
        okText="Delete"
        okButtonProps={{ danger: true }}
      >
        <p>Are you sure you want to delete this file?</p>
      </Modal>
    </div>
  );
};

export default EntityImages;