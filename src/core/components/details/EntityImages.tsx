import React, { useState, useEffect } from 'react';
import { message, Spin, Image, Tooltip, Button, Modal, Row, Col } from 'antd';
import { File, Trash2 } from 'lucide-react';
import { supabase } from '@/core/lib/supabase';
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
  entity_id: string;
}

const EntityImages: React.FC<EntityImagesProps> = ({ entity_id }) => {
  const { user, organization } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [gallery, setGallery] = useState<GallerySet[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<{ id: string; name: string } | null>(null);
  // Fetch existing files
  useEffect(() => {
    const fetchFiles = async () => {
      setLoading(true);
      try {
        // 1. Fetch attachments directly
        let query = supabase
          .schema('core')
          .from('object_attachments')
          .select('*')
          .eq('object_id', entity_id);

        const org_id = user?.organization_id || organization?.id;
        if (org_id) {
          query = query.eq('organization_id', org_id);
        }

        const { data: attachments, error: attachError } = await query.order('created_at', { ascending: false });

        if (attachError) {
          message.error('Failed to fetch files.');
          console.error('Fetch error:', attachError);
          return;
        }

        // 2. Extract unique uploader IDs
        const uploaderIds = [...new Set((attachments || []).map(a => a.uploaded_by).filter(Boolean))];
        const userMap: Record<string, string> = {};

        // 3. Fetch user names if there are uploaders
        if (uploaderIds.length > 0) {
          const { data: users, error: userError } = await supabase
            .schema('identity')
            .from('users')
            .select('id, name')
            .in('id', uploaderIds);

          if (!userError && users) {
            users.forEach(u => {
              userMap[u.id] = u.name;
            });
          }
        }

        // 4. Map results
        setGallery(
          (attachments || []).map((item: any) => ({
            id: item.id,
            files: [{
              url: item.file_url,
              thumbnail: item.v_metadata?.thumbnail,
              name: item.file_name,
              type: item.file_type,
              description: item.description,
              created_at: item.created_at,
              location: item.v_metadata?.location,
            }],
            created_by: item.uploaded_by,
            created_by_name: userMap[item.uploaded_by] || 'Unknown',
          }))
        );
      } catch (err) {
        message.error('An unexpected error occurred while fetching files.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (entity_id) {
      fetchFiles();
    }
  }, [entity_id, user?.organization_id]);

  // Handle new file uploads
  const handleFilesUploaded = async (files: FileObject[]) => {
    if (!user?.id) {
      message.error('You must be logged in to upload files.');
      return;
    }

    setLoading(true);
    try {
      const org_id = user?.organization_id || organization?.id;
      const uploadData = files.map(file => ({
        object_id: entity_id,
        organization_id: org_id,
        file_name: file.name,
        file_url: file.url,
        file_type: file.type,
        description: file.description,
        uploaded_by: user.id,
        metadata: {
          thumbnail: file.thumbnail,
          location: file.location,
        }
      }));

      const { data, error } = await supabase
        .schema('core')
        .from('object_attachments')
        .insert(uploadData)
        .select();

      if (error) {
        console.error('Supabase insert error:', error);
        message.error('Failed to save files.');
        return;
      }

      const newRecords = data.map((record: any) => ({
        id: record.id,
        files: [{
          url: record.file_url,
          thumbnail: record.v_metadata?.thumbnail,
          name: record.file_name,
          type: record.file_type,
          description: record.description,
          created_at: record.created_at,
          location: record.v_metadata?.location,
        }],
        created_by: record.uploaded_by,
        created_by_name: user?.name || 'Unknown',
      }));

      setGallery((prev) => [...newRecords, ...prev]);
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
        .schema('core')
        .from('object_attachments')
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
                    position: 'relative',
                    overflow: 'hidden',
                  }}>
                    {/* Delete button positioned absolutely */}
                    <Button
                      type="text"
                      icon={<Trash2 size={16} />}
                      onClick={() => handleRemoveFile(fileSet.id)}
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        color: 'red',
                        zIndex: 1,
                        background: 'rgba(255, 255, 255, 0.7)',
                        borderRadius: '50%',
                        height: 32,
                        width: 32,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    />

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8, marginTop: 24 }}>
                      {fileSet.files.map((file, fileIndex) => (
                        <div key={fileIndex} style={{ position: 'relative' }}>
                          {file.type?.startsWith('image/') ? (
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
                                <File size={40} style={{ color: 'var(--color-primary)' }} />
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