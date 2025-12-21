import React, { useState, useEffect } from 'react';
import { Table, Checkbox, Button, message, Input, Space } from 'antd';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/core/lib/store';
// import { camelCaseToTitleCase } from 'components/util-components/utils';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { camelCaseToTitleCase } from '../../common/utils/casing';

interface OrganizationFeatureEditProps {
  onSave: () => void;
}

const OrganizationFeatureEdit: React.FC<OrganizationFeatureEditProps> = ({ onSave }) => {
  const [organizationFeatures, setOrganizationFeatures] = useState<Record<string, boolean>>({});
  const [features, setFeatures] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [newFeature, setNewFeature] = useState<string>('');
  const [editingFeature, setEditingFeature] = useState<string | null>(null);
  const { organization } = useAuthStore();

  const fetchOrganizationFeatures = async () => {
    if (!organization?.id) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .schema('identity').from('organizations')
      .select('module_features')
      .eq('id', organization.id)
      .single();

    if (error) {
      message.error('Failed to fetch organization features.');
    } else {
      setOrganizationFeatures(data?.module_features || {});
    }
  };

  const fetchFeatures = async () => {
    const { data, error } = await supabase
      .from('enums')
      .select('options')
      .eq('name', 'features')
      .single();

    if (error) {
      message.error('Failed to fetch available features.');
    } else {
      setFeatures(data?.options || []);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!organization?.id) {
        setLoading(false);
        return;
      }
      await fetchFeatures();
      await fetchOrganizationFeatures();
      setLoading(false);
    };

    fetchData();
  }, [organization?.id]);

  const handleFeatureChange = (featureKey: string, checked: boolean) => {
    setOrganizationFeatures((prev) => ({
      ...prev,
      [featureKey]: checked,
    }));
  };

  const handleSaveChanges = async () => {
    if (!organization?.id) {
      message.error('Organization ID not found.');
      return;
    }

    const { error } = await supabase
      .schema('identity').from('organizations')
      .update({ module_features: organizationFeatures })
      .eq('id', organization.id);

    if (error) {
      message.error('Failed to save changes.');
    } else {
      message.success('Changes saved successfully!');
      onSave();
    }
  };

  const handleAddOrEditFeature = async () => {
    if (!newFeature.trim()) {
      message.error('Please enter a feature name');
      return;
    }

    const formattedFeature = newFeature
      .trim()
      .replace(/\s+/g, '')
      .replace(/^(.)(.*)$/, (_, first, rest) => first.toLowerCase() + rest);

    if (editingFeature) {
      if (features.includes(formattedFeature) && formattedFeature !== editingFeature) {
        message.error('Feature name already exists');
        return;
      }

      const updatedFeatures = features.map(f =>
        f === editingFeature ? formattedFeature : f
      );

      const { error } = await supabase
        .from('enums')
        .update({ options: updatedFeatures })
        .eq('name', 'features');

      if (error) {
        message.error('Failed to update feature');
      } else {
        const updatedOrgFeatures = { ...organizationFeatures };
        if (formattedFeature !== editingFeature) {
          updatedOrgFeatures[formattedFeature] = updatedOrgFeatures[editingFeature];
          delete updatedOrgFeatures[editingFeature];
        }
        setOrganizationFeatures(updatedOrgFeatures);
        setFeatures(updatedFeatures);
        message.success('Feature updated successfully');
        setNewFeature('');
        setEditingFeature(null);
      }
    } else {
      if (features.includes(formattedFeature)) {
        message.error('Feature already exists');
        setNewFeature('');
        return;
      }

      const updatedFeatures = [...features, formattedFeature];
      const { error } = await supabase
        .from('enums')
        .update({ options: updatedFeatures })
        .eq('name', 'features');

      if (error) {
        message.error('Failed to add feature');
      } else {
        setFeatures(updatedFeatures);
        setOrganizationFeatures((prev) => ({
          ...prev,
          [formattedFeature]: false,
        }));
        message.success('Feature added successfully');
        setNewFeature('');
      }
    }
  };

  const handleEdit = (feature: string) => {
    setEditingFeature(feature);
    setNewFeature(feature);
  };

  const handleDelete = async (feature: string) => {
    const updatedFeatures = features.filter(f => f !== feature);
    const { error } = await supabase
      .from('enums')
      .update({ options: updatedFeatures })
      .eq('name', 'features');

    if (error) {
      message.error('Failed to delete feature');
    } else {
      const updatedOrgFeatures = { ...organizationFeatures };
      delete updatedOrgFeatures[feature];
      setOrganizationFeatures(updatedOrgFeatures);
      setFeatures(updatedFeatures);
      message.success('Feature deleted successfully');
    }
  };

  const columns = [
    {
      title: 'Feature',
      dataIndex: 'feature',
      key: 'feature',
      render: (text: string) => camelCaseToTitleCase(text),
    },
    {
      title: 'Enabled',
      key: 'enabled',
      render: (_: any, record: { feature: string }) => (
        <Checkbox
          checked={organizationFeatures[record.feature] || false}
          onChange={(e) => handleFeatureChange(record.feature, e.target.checked)}
        />
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: { feature: string }) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            onClick={() => handleEdit(record.feature)}
            size="small"
          />
          <Button
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.feature)}
            size="small"
            danger
          />
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Table
        size="small"
        dataSource={features.map((feature) => ({ feature }))}
        loading={loading}
        pagination={false}
        rowKey="feature"
        columns={columns}
      />

      <Space style={{ marginTop: 16, width: '100%', justifyContent: 'space-between' }}>
        <Button type="primary" onClick={handleSaveChanges}>
          Save Changes
        </Button>
        <Space>
          <Input
            value={newFeature}
            onChange={(e) => setNewFeature(e.target.value)}
            placeholder={editingFeature ? 'Edit feature' : 'Enter new feature'}
            style={{ width: 200 }}
          />
          <Button onClick={handleAddOrEditFeature}>
            {editingFeature ? 'Edit' : 'Add'}
          </Button>
        </Space>
      </Space>
    </div>
  );
};

export default OrganizationFeatureEdit;