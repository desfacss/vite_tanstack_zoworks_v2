import React from 'react';
import { Card, Divider, Tag, Typography } from 'antd';
import { UserOutlined, EnvironmentOutlined, TeamOutlined, IdcardOutlined } from '@ant-design/icons';
import { useAuthStore } from '@/core/lib/store';
import DetailOverview from '../../common/details/DetailOverview';

const { Title } = Typography;

const Profile: React.FC = () => {
  const { user } = useAuthStore();

  if (!user) {
    return (
      <Alert
        message="No Data"
        description="User profile data is not available."
        type="info"
        showIcon
        style={{ margin: '20px' }}
      />
    );
  }

  const userDetails = {
    ...user.details,
    ...user.user_metadata,
    status: user.status,
    is_active: user.is_active,
  };

  const viewConfig = {
    details_overview: {
      groups: [
        {
          name: 'Personal Details',
          fields: [
            // { fieldPath: 'firstName', label: 'Full Name' },
            { fieldPath: 'userName', label: 'Username' },
            { fieldPath: 'email', label: 'Email' },
            { fieldPath: 'mobile', label: 'Mobile' },
            { fieldPath: 'department', label: 'Department' },
            { fieldPath: 'designation', label: 'Designation' },
            { fieldPath: 'joiningDate', label: 'Joining Date' },
            { fieldPath: 'status', label: 'Status' },
            { fieldPath: 'is_active', label: 'Active' },
          ],
        },
        {
          name: 'Metadata',
          field_s: [
            { fieldPath: 'locations', label: 'Locations', icon: 'EnvironmentOutlined', style: { render: 'tag', colorMapping: { default: 'blue' } } },
            { fieldPath: 'roles', label: 'Roles', icon: 'IdcardOutlined', style: { render: 'tag', colorMapping: { default: 'green' } } },
            { fieldPath: 'teams', label: 'Teams', icon: 'TeamOutlined', style: { render: 'tag', colorMapping: { default: 'purple' } } },
          ],
          fields: [
          { fieldPath: 'locations', label: 'Locations', icon: 'EnvironmentOutlined', displayKey: 'name', style: { render: 'tag', colorMapping: { default: 'blue' } } },
          { fieldPath: 'roles', label: 'Roles', icon: 'IdcardOutlined', displayKey: 'name', style: { render: 'tag', colorMapping: { default: 'green' } } },
          { fieldPath: 'teams', label: 'Teams', icon: 'TeamOutlined', displayKey: 'name', style: { render: 'tag', colorMapping: { default: 'purple' } } },
        ],
        },
      ],
      dividers: ['Metadata'],
    },
  };

  const handleCustomRender = (field, value) => {
    if (field.fieldPath === 'is_active') {
      return value ? 'Yes' : 'No';
    }
    if (field.fieldPath === 'joiningDate') {
      return new Date(value).toLocaleDateString();
    }
    if (field.style && field.style.render === 'tag' && Array.isArray(value)) {
      return value.map((item) => (
        <Tag key={item.id} color={field.colorMapping?.default || 'default'}>
          {item.name}
        </Tag>
      ));
    }
    return value;
  };

  return (
    <div style={{ padding: '10px', maxWidth: '100%', margin: '0 auto' }}>
      {/* <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <UserOutlined style={{ marginRight: '8px' }} />
            <Title level={4} style={{ margin: 0 }}>
              User Profile
            </Title>
          </div>
        }
        bordered={false}
        style={{ boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}
      > */}
        <Title level={4} style={{ padding: 5 }}>
              User Profile
            </Title>
        <DetailOverview data={userDetails} viewConfig={viewConfig} />
      {/* </Card> */}
    </div>
  );
};

export default Profile;