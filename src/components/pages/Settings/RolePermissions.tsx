import React, { useState, useEffect } from 'react';
import { Checkbox, Table, Typography, Space, Button, message } from 'antd';
import { supabase } from '@/lib/supabase';

const { Text } = Typography;

interface SubModule {
  [key: string]: boolean;
}

interface Module {
  sub_modules: SubModule;
  settings?: any;
}

interface OrganizationModules {
  [key: string]: Module;
}

interface Permission {
  [module: string]: {
    [subModule: string]: string[];
  };
}

interface Role {
  id: string;
  name: string;
  permissions: Permission;
  organization_id: string;
}

interface RolePermissionsProps {
  organization: { id: string; name: string } | null; // Organization prop
}

const RolePermissions: React.FC<RolePermissionsProps> = ({ organization }) => {
  const [modules, setModules] = useState<OrganizationModules>({});
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissionsByRole, setPermissionsByRole] = useState<{ [roleId: string]: Permission }>({});
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch organization modules and roles
  useEffect(() => {
    const fetchData = async () => {
      if (!organization?.id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        // Fetch organization modules
        const { data: configData, error: configError } = await supabase.rpc(
          'get_organization_module_configs',
          {
            p_organization_id: organization.id,
            p_scope_level: 'organization',
          }
        );

        if (configError) throw configError;
        setModules(configData);

        // Fetch all roles, sorted by name in ascending order
        const { data: rolesData, error: rolesError } = await supabase
          .schema('identity')
          .from('roles')
          .select('*')
          .eq('organization_id', organization.id)
          .order('name', { ascending: true });

        if (rolesError) throw rolesError;
        const fetchedRoles = rolesData || [];
        setRoles(fetchedRoles);

        // Initialize permissions for each role
        const initialPermissions = fetchedRoles.reduce(
          (acc, role) => ({
            ...acc,
            [role.id]: role.permissions || {},
          }),
          {}
        );
        setPermissionsByRole(initialPermissions);
      } catch (error) {
        console.error('Error fetching data:', error);
        message.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [organization?.id]);

  // Handle permission checkbox change
  const handlePermissionChange = (
    roleId: string,
    module: string,
    subModule: string,
    permission: string,
    checked: boolean
  ) => {
    setPermissionsByRole((prev) => {
      const rolePermissions = { ...prev[roleId] };

      if (!rolePermissions[module]) {
        rolePermissions[module] = {};
      }

      if (!rolePermissions[module][subModule]) {
        rolePermissions[module][subModule] = [];
      }

      if (checked) {
        rolePermissions[module][subModule] = [
          ...new Set([...rolePermissions[module][subModule], permission]),
        ];
      } else {
        rolePermissions[module][subModule] = rolePermissions[module][subModule].filter(
          (p) => p !== permission
        );
      }

      return {
        ...prev,
        [roleId]: rolePermissions,
      };
    });
  };

  // Save permissions for all roles
  const handleSaveAllPermissions = async () => {
    if (!organization?.id) {
      message.warning('Organization not found');
      return;
    }

    try {
      const updates = roles.map((role) => ({
        id: role.id,
        name: role.name,
        permissions: permissionsByRole[role.id],
        organization_id: organization.id,
      }));

      // Perform batch update for all roles
      const { error } = await supabase.schema('identity').from('roles').upsert(updates, { onConflict: 'id' });

      if (error) throw error;

      // Update local roles state
      setRoles((prev) =>
        prev.map((role) => ({
          ...role,
          permissions: permissionsByRole[role.id],
        }))
      );
      message.success('Permissions saved successfully for all roles');
    } catch (error) {
      console.error('Error updating permissions:', error);
      message.error('Failed to save permissions');
    }
  };

  // Columns: One for module name, one per role
  const columns = [
    {
      title: 'Module',
      dataIndex: 'module',
      key: 'module',
      render: (text: string) => <Text strong>{text.toUpperCase()}</Text>,
      width: 200,
      fixed: 'left', // Fix the Module column for better scrolling
    },
    ...roles.map((role) => ({
      title: role.name,
      key: role.id,
      width: 200, // Set consistent width for role columns
      render: (_: any, record: { module: string }) => null, // Empty in main table
    })),
  ];

  // Data source for modules
  const dataSource = Object.keys(modules).map((module) => ({
    key: module,
    module,
  }));

  // Expanded row render for sub-modules
  const expandedRowRender = (record: { module: string }) => {
    const { module } = record;
    const subModules = modules[module].sub_modules;
    const subModuleKeys = Object.keys(subModules).filter((subModule) => subModules[subModule]);

    const subColumns = [
      {
        title: '',
        dataIndex: 'subModule',
        key: 'subModule',
        width: 200, // Match the main table's Module column width
        render: (text: string) => <Text>{text}</Text>,
      },
      ...roles.map((role) => ({
        title: '',
        key: `${role.id}-${module}`,
        width: 200, // Match the main table's role column width
        render: (_: any, subRecord: { subModule: string }) => (
          <Space size="middle">
            <Checkbox
              checked={permissionsByRole[role.id]?.[module]?.[subRecord.subModule]?.includes('c')}
              onChange={(e) =>
                handlePermissionChange(
                  role.id,
                  module,
                  subRecord.subModule,
                  'c',
                  e.target.checked
                )
              }
            >
              C
            </Checkbox>
            <Checkbox
              checked={permissionsByRole[role.id]?.[module]?.[subRecord.subModule]?.includes('r')}
              onChange={(e) =>
                handlePermissionChange(
                  role.id,
                  module,
                  subRecord.subModule,
                  'r',
                  e.target.checked
                )
              }
            >
              R
            </Checkbox>
            <Checkbox
              checked={permissionsByRole[role.id]?.[module]?.[subRecord.subModule]?.includes('u')}
              onChange={(e) =>
                handlePermissionChange(
                  role.id,
                  module,
                  subRecord.subModule,
                  'u',
                  e.target.checked
                )
              }
            >
              U
            </Checkbox>
            <Checkbox
              checked={permissionsByRole[role.id]?.[module]?.[subRecord.subModule]?.includes('d')}
              onChange={(e) =>
                handlePermissionChange(
                  role.id,
                  module,
                  subRecord.subModule,
                  'd',
                  e.target.checked
                )
              }
            >
              D
            </Checkbox>
          </Space>
        ),
      })),
    ];

    const subDataSource = subModuleKeys.map((subModule) => ({
      key: subModule,
      subModule,
    }));

    return (
      <Table
        columns={subColumns}
        dataSource={subDataSource}
        pagination={false}
        size="small"
        bordered
        showHeader={false} // Hide sub-table header
      />
    );
  };

  return (
    <div style={{ padding: '16px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Space style={{ marginBottom: 16 }}>
          <Button
            type="primary"
            onClick={handleSaveAllPermissions}
            disabled={loading || roles.length === 0 || !organization}
          >
            Save
          </Button>
        </Space>
        <Table
          columns={columns}
          dataSource={dataSource}
          expandable={{
            expandedRowRender,
            defaultExpandAllRows: false,
          }}
          pagination={false}
          bordered
          loading={loading}
          rowKey="module"
          scroll={{ x: 'max-content' }} // Enable horizontal scrolling for many roles
        />
      </Space>
    </div>
  );
};

export default RolePermissions;