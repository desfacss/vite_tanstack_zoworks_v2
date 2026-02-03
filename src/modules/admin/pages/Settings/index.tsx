import React, { useState } from 'react';
import { Card, Tabs } from 'antd';
import LocationSettings from './LocationSettings';
import Organization from './Organization';
import Branding from './Branding';
import RoleFeatureEdit from './RolePermissions';
import TimesheetSettings from './Timesheet';
import LeaveSettings from './LeaveSettings';
import LeaveTypes from './LeaveTypes';
import SettingsWorkforce from './SettingsWorkforce';
import { useAuthStore } from '@/core/lib/store';
import Roles from './Roles';
import RolesManagement from './RolesManagement';
import Users from './Users';
import Teams from './Teams';
import EntityConfig from './EntityConfigForm';
import MermaidViewer from './MermaidViewer';
import GoogleDocViewer from './GoogleDocViewer';

const Settings: React.FC = () => {
  const { organization, user } = useAuthStore();
  const [activeKey, setActiveKey] = useState<string>('1');

  const handleTabChange = (key: string) => {
    setActiveKey(key);
  };

  // Define the tab items as an array
  const items = [
    {
      label: 'Mermaid Viewer',
      key: '1',
      children: <MermaidViewer />,
    },
    {
      label: 'Doc Viewer',
      key: '1.1',
      children: <GoogleDocViewer docLink={"https://docs.google.com/document/d/1PiXZcV9EtkHY5LRhA6cc6jxL_7Owsu-_VtOJ-jbbE2Q/edit?tab=t.0"} height="600px" />,
    },
    {
      label: 'Organization',
      key: '1.5',
      children: <Organization />,
    },
    {
      label: 'Users',
      key: '1.6',
      children: <Users />,
    },
    {
      label: 'Teams',
      key: '1.7',
      children: <Teams />,
    },
    {
      label: 'Roles Management',
      key: '1.8',
      children: <RolesManagement />,
    },
    {
      label: 'Roles (DynamicViews)',
      key: '2',
      children: <Roles />,
    },
    {
      label: 'Roles & Permission',
      key: '3',
      children: <RoleFeatureEdit organization={organization} />,
    },
    {
      label: (organization?.app_settings as any)?.holidays ? 'Location & Holidays' : 'Location',
      key: '4',
      children: <LocationSettings />,
    },
    {
      label: 'Module Settings',
      key: '5',
      children: <SettingsWorkforce />,
    },
    {
      label: 'Entity Config',
      key: '6',
      children: <EntityConfig />,
    },
  ];

  // Conditionally add tabs based on user role (SassAdmin or Superadmin)
  const roleName = user?.roles?.name || (user?.role_id as any)?.name;
  if (roleName === 'SassAdmin' || roleName === 'Superadmin') {
    // Insert Branding tab near the beginning (after Organization at index 2)
    items.splice(3, 0, {
      label: 'Branding',
      key: 'branding',
      children: <Branding />,
    });

    items.push(
      {
        label: 'Workflow Settings',
        key: '7',
        children: <TimesheetSettings />,
      },
      {
        label: 'Types',
        key: '8',
        children: <LeaveTypes />,
      },
      {
        label: 'Leave Settings',
        key: '9',
        children: <LeaveSettings />,
      }
    );
  }

  return (
    <Card>
      <Tabs activeKey={activeKey} onChange={handleTabChange} items={items} />
    </Card>
  );
};

export default Settings;

