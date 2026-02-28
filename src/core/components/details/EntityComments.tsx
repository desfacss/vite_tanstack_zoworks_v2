import React, { useState, useEffect } from 'react';
import { message, Spin, List, Button, Input, Modal, Typography, Space } from 'antd';
import { MessageSquare, Trash2, Edit2, Send } from 'lucide-react';
import { supabase } from '@/core/lib/supabase';
import { useAuthStore } from '@/core/lib/store';
import dayjs from 'dayjs';

const { Text } = Typography;
const { TextArea } = Input;

interface Comment {
  id: string;
  comment: string;
  content: string;
  metadata: any;
  created_by: string;
  created_by_name: string;
  created_at: string;
}

interface EntityCommentsProps {
  entity_id: string;
}

const EntityComments: React.FC<EntityCommentsProps> = ({ entity_id }) => {
  const { user, organization } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);

  useEffect(() => {
    const fetchComments = async () => {
      setLoading(true);
      try {
        let query = supabase
          .schema('core')
          .from('object_comments')
          .select('*')
          .eq('object_id', entity_id);

        const org_id = user?.organization_id || organization?.id;
        if (org_id) {
          query = query.eq('organization_id', org_id);
        }

        const { data: records, error: fetchError } = await query.order('created_at', { ascending: false });

        if (fetchError) {
          message.error('Failed to fetch comments.');
          console.error(fetchError);
          return;
        }

        const uploaderIds = [...new Set((records || []).map(a => a.created_by).filter(Boolean))];
        const userMap: Record<string, string> = {};

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

        setComments(
          (records || []).map((item: any) => ({
            id: item.id,
            comment: item.comment || item.content,
            content: item.content || item.comment,
            metadata: item.v_metadata,
            created_by: item.created_by,
            created_by_name: userMap[item.created_by] || 'Unknown',
            created_at: item.created_at,
          }))
        );
      } catch (err) {
        message.error('An unexpected error occurred.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (entity_id) {
      fetchComments();
    }
  }, [entity_id, user?.organization_id]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    if (!user?.id) {
      message.error('You must be logged in to comment.');
      return;
    }

    setLoading(true);
    try {
      const org_id = user?.organization_id || organization?.id;
      const { data, error } = await supabase
        .schema('core')
        .from('object_comments')
        .insert({
          object_id: entity_id,
          organization_id: org_id,
          comment: newComment,
          content: newComment,
          created_by: user.id,
          updated_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      const addedComment: Comment = {
        id: data.id,
        comment: data.comment || data.content,
        content: data.content || data.comment,
        metadata: data.v_metadata,
        created_by: data.created_by,
        created_by_name: user.name || 'Unknown',
        created_at: data.created_at,
      };

      setComments(prev => [addedComment, ...prev]);
      setNewComment('');
      message.success('Comment added!');
    } catch (err) {
      console.error(err);
      message.error('Failed to add comment.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateComment = async () => {
    if (!editingComment || !editingComment.comment.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .schema('core')
        .from('object_comments')
        .update({
          comment: editingComment.comment,
          content: editingComment.comment,
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingComment.id);

      if (error) throw error;

      setComments(prev => prev.map(c => c.id === editingComment.id ? editingComment : c));
      setEditingComment(null);
      message.success('Comment updated!');
    } catch (err) {
      console.error(err);
      message.error('Failed to update comment.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComment = async () => {
    if (!commentToDelete) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .schema('core')
        .from('object_comments')
        .delete()
        .eq('id', commentToDelete);

      if (error) throw error;

      setComments(prev => prev.filter(c => c.id !== commentToDelete));
      message.success('Comment deleted!');
    } catch (err) {
      console.error(err);
      message.error('Failed to delete comment.');
    } finally {
      setLoading(false);
      setIsDeleteModalVisible(false);
      setCommentToDelete(null);
    }
  };

  return (
    <div style={{ padding: '16px' }}>
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
          <TextArea
            rows={2}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            disabled={loading}
          />
          <Button
            type="primary"
            icon={<Send size={16} />}
            onClick={handleAddComment}
            disabled={!newComment.trim() || loading}
            loading={loading}
          >
            Post
          </Button>
        </div>

        <Spin spinning={loading}>
          <List
            dataSource={comments}
            renderItem={(item) => (
              <List.Item
                actions={[
                  user?.id === item.created_by && (
                    <Button
                      type="text"
                      icon={<Edit2 size={14} />}
                      onClick={() => setEditingComment(item)}
                    />
                  ),
                  user?.id === item.created_by && (
                    <Button
                      type="text"
                      danger
                      icon={<Trash2 size={14} />}
                      onClick={() => {
                        setCommentToDelete(item.id);
                        setIsDeleteModalVisible(true);
                      }}
                    />
                  ),
                ].filter(Boolean)}
              >
                <List.Item.Meta
                  avatar={<MessageSquare size={24} style={{ color: 'var(--color-primary)' }} />}
                  title={
                    <Space>
                      <Text strong>{item.created_by_name}</Text>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {dayjs(item.created_at).format('MMM D, YYYY HH:mm')}
                      </Text>
                    </Space>
                  }
                  description={
                    editingComment?.id === item.id ? (
                      <div style={{ marginTop: '8px' }}>
                        <TextArea
                          value={editingComment.comment}
                          onChange={(e) => setEditingComment({ ...editingComment, comment: e.target.value })}
                          rows={2}
                        />
                        <Space style={{ marginTop: '8px' }}>
                          <Button size="small" type="primary" onClick={handleUpdateComment}>Save</Button>
                          <Button size="small" onClick={() => setEditingComment(null)}>Cancel</Button>
                        </Space>
                      </div>
                    ) : (
                      <Text style={{ whiteSpace: 'pre-wrap' }}>{item.comment}</Text>
                    )
                  }
                />
              </List.Item>
            )}
          />
        </Spin>
      </Space>

      <Modal
        title="Delete Comment"
        open={isDeleteModalVisible}
        onOk={handleDeleteComment}
        onCancel={() => setIsDeleteModalVisible(false)}
        okText="Delete"
        okButtonProps={{ danger: true }}
      >
        <p>Are you sure you want to delete this comment?</p>
      </Modal>
    </div>
  );
};

export default EntityComments;
