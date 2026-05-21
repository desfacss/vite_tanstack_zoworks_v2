import React, { useState, useEffect, useMemo } from 'react';
import { Checkbox, Typography, Button, message, Spin } from 'antd';
import { MinusSquareOutlined, PlusSquareOutlined } from '@ant-design/icons';
import { supabase } from '@/core/lib/supabase';

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
  organization: { id: string; name: string } | null;
}

const CRUD_LABELS = ['c', 'r', 'u', 'd'] as const;
const CRUD_DISPLAY: Record<string, string> = { c: 'C', r: 'R', u: 'U', d: 'D' };

// Widths
const MODULE_COL_WIDTH = 180;
const ROLE_COL_WIDTH = 160;

const RolePermissions: React.FC<RolePermissionsProps> = ({ organization }) => {
  const [modules, setModules] = useState<OrganizationModules>({});
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissionsByRole, setPermissionsByRole] = useState<{ [roleId: string]: Permission }>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchData = async () => {
      if (!organization?.id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { data: templateData, error: templateError } = await supabase.schema('identity').rpc('get_module_hierarchy');
        if (templateError) throw templateError;

        const { data: configData, error: configError } = await supabase.schema('identity').rpc(
          'get_organization_module_configs',
          {
            p_organization_id: organization.id,
            p_scope_level: 'organization',
          }
        );

        if (configError) throw configError;

        // Fallback to template if organization has no activated modules yet
        const finalModules = configData && Object.keys(configData).length > 0 ? configData : templateData || {};
        setModules(finalModules);

        // 1. Try fetching tenant-specific roles first
        let { data: rolesData, error: rolesError } = await supabase
          .schema('identity')
          .from('roles')
          .select('*')
          .eq('organization_id', organization.id)
          .order('name', { ascending: true });

        if (rolesError) throw rolesError;
        let fetchedRoles = rolesData || [];

        // 2. Fall back to global roles (organization_id IS NULL) if no tenant-specific records exist
        if (fetchedRoles.length === 0) {
          const { data: globalRolesData, error: globalRolesError } = await supabase
            .schema('identity')
            .from('roles')
            .select('*')
            .is('organization_id', null)
            .order('name', { ascending: true });

          if (globalRolesError) throw globalRolesError;
          fetchedRoles = globalRolesData || [];
        }
        setRoles(fetchedRoles);

        const initialPermissions = fetchedRoles.reduce(
          (acc, role) => ({
            ...acc,
            [role.id]: role.permissions || {},
          }),
          {}
        );
        setPermissionsByRole(initialPermissions);

        // Expand all modules by default
        setExpandedModules(new Set(Object.keys(finalModules)));
      } catch (error) {
        console.error('Error fetching data:', error);
        message.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [organization?.id]);

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

      const { error } = await supabase.schema('identity').from('roles').upsert(updates, { onConflict: 'id' });

      if (error) throw error;

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

  const toggleModule = (moduleName: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleName)) {
        next.delete(moduleName);
      } else {
        next.add(moduleName);
      }
      return next;
    });
  };

  const toggleAll = (expand: boolean) => {
    if (expand) {
      setExpandedModules(new Set(Object.keys(modules)));
    } else {
      setExpandedModules(new Set());
    }
  };

  // Build flat rows: module headers + sub-module rows
  const flatRows = useMemo(() => {
    const rows: Array<
      | { type: 'module'; moduleName: string }
      | { type: 'submodule'; moduleName: string; subModuleName: string }
    > = [];

    Object.keys(modules).forEach((moduleName) => {
      rows.push({ type: 'module', moduleName });

      if (expandedModules.has(moduleName)) {
        const subModules = modules[moduleName].sub_modules;
        Object.keys(subModules)
          .filter((sub) => subModules[sub])
          .forEach((subModuleName) => {
            rows.push({ type: 'submodule', moduleName, subModuleName });
          });
      }
    });

    return rows;
  }, [modules, expandedModules]);

  // Calculate total table width
  const totalWidth = MODULE_COL_WIDTH + roles.length * ROLE_COL_WIDTH;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: '16px' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <Button
          type="primary"
          onClick={handleSaveAllPermissions}
          disabled={roles.length === 0 || !organization}
        >
          Save
        </Button>
        <Button size="small" onClick={() => toggleAll(true)}>
          Expand All
        </Button>
        <Button size="small" onClick={() => toggleAll(false)}>
          Collapse All
        </Button>
      </div>

      {/* Scrollable table container */}
      <div
        style={{
          overflow: 'auto',
          maxHeight: 'calc(100vh - 260px)',
          border: '1px solid #f0f0f0',
          borderRadius: 8,
        }}
      >
        <table
          style={{
            width: Math.max(totalWidth, 600),
            minWidth: '100%',
            borderCollapse: 'separate',
            borderSpacing: 0,
            tableLayout: 'fixed',
          }}
        >
          {/* Colgroup for fixed widths */}
          <colgroup>
            <col style={{ width: MODULE_COL_WIDTH, minWidth: MODULE_COL_WIDTH }} />
            {roles.map((role) => (
              <col key={role.id} style={{ width: ROLE_COL_WIDTH, minWidth: ROLE_COL_WIDTH }} />
            ))}
          </colgroup>

          {/* Sticky header */}
          <thead>
            <tr>
              <th
                style={{
                  position: 'sticky',
                  top: 0,
                  left: 0,
                  zIndex: 3,
                  background: '#fafafa',
                  padding: '12px 16px',
                  borderBottom: '2px solid #e8e8e8',
                  borderRight: '1px solid #f0f0f0',
                  textAlign: 'left',
                  fontWeight: 600,
                  fontSize: 13,
                  color: '#333',
                }}
              >
                Module
              </th>
              {roles.map((role) => (
                <th
                  key={role.id}
                  style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 2,
                    background: '#fafafa',
                    padding: '12px 8px',
                    borderBottom: '2px solid #e8e8e8',
                    borderRight: '1px solid #f0f0f0',
                    textAlign: 'center',
                    fontWeight: 600,
                    fontSize: 13,
                    color: '#333',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={role.name}
                >
                  {role.name}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {flatRows.map((row) => {
              if (row.type === 'module') {
                const isExpanded = expandedModules.has(row.moduleName);
                return (
                  <tr
                    key={`mod-${row.moduleName}`}
                    style={{ background: '#f7f9fc', cursor: 'pointer' }}
                    onClick={() => toggleModule(row.moduleName)}
                  >
                    <td
                      style={{
                        position: 'sticky',
                        left: 0,
                        zIndex: 1,
                        background: '#f7f9fc',
                        padding: '10px 16px',
                        borderBottom: '1px solid #e8e8e8',
                        borderRight: '1px solid #f0f0f0',
                        fontWeight: 600,
                        fontSize: 13,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <span style={{ marginRight: 8, fontSize: 14, color: '#999' }}>
                        {isExpanded ? <MinusSquareOutlined /> : <PlusSquareOutlined />}
                      </span>
                      {row.moduleName.toUpperCase()}
                    </td>
                    {roles.map((role) => (
                      <td
                        key={role.id}
                        style={{
                          background: '#f7f9fc',
                          padding: '10px 8px',
                          borderBottom: '1px solid #e8e8e8',
                          borderRight: '1px solid #f0f0f0',
                        }}
                      />
                    ))}
                  </tr>
                );
              }

              // Sub-module row
              return (
                <tr key={`sub-${row.moduleName}-${row.subModuleName}`} style={{ background: '#fff' }}>
                  <td
                    style={{
                      position: 'sticky',
                      left: 0,
                      zIndex: 1,
                      background: '#fff',
                      padding: '8px 16px 8px 40px',
                      borderBottom: '1px solid #f0f0f0',
                      borderRight: '1px solid #f0f0f0',
                      fontSize: 13,
                      color: '#555',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={row.subModuleName}
                  >
                    {row.subModuleName}
                  </td>
                  {roles.map((role) => (
                    <td
                      key={role.id}
                      style={{
                        padding: '6px 8px',
                        borderBottom: '1px solid #f0f0f0',
                        borderRight: '1px solid #f0f0f0',
                        textAlign: 'center',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <div style={{ display: 'inline-flex', gap: 4, justifyContent: 'center' }}>
                        {CRUD_LABELS.map((perm) => (
                          <Checkbox
                            key={perm}
                            checked={permissionsByRole[role.id]?.[row.moduleName]?.[row.subModuleName]?.includes(perm)}
                            onChange={(e) =>
                              handlePermissionChange(
                                role.id,
                                row.moduleName,
                                row.subModuleName,
                                perm,
                                e.target.checked
                              )
                            }
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span style={{ fontSize: 12 }}>{CRUD_DISPLAY[perm]}</span>
                          </Checkbox>
                        ))}
                      </div>
                    </td>
                  ))}
                </tr>
              );
            })}

            {flatRows.length === 0 && (
              <tr>
                <td
                  colSpan={1 + roles.length}
                  style={{ textAlign: 'center', padding: 32, color: '#999' }}
                >
                  No modules configured for this organization.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RolePermissions;
