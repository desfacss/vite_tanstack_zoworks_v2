import React, { useEffect, useState } from 'react';
import { Select, Space, Typography, Tag, Tooltip, Spin, App } from 'antd';
import { GlobalOutlined, CheckOutlined } from '@ant-design/icons';
import { useAuthStore, type AuthState } from '@/lib/authStore';
import { useInboxStore } from '../../store/inboxStore';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

const { Text } = Typography;

interface UserOrganization {
    id: string;
    name: string;
}

// RPC response structure (from get_my_organizations)
interface RpcOrgData {
    organization_id: string;
    organization_name: string;
    roles: string[];
    locations: { location_id: string; location_name: string; }[];
}

export const OrgSwitcher: React.FC = () => {
    const queryClient = useQueryClient();
    const { message } = App.useApp();

    // Get state from Zustand store
    const organization = useAuthStore((state: AuthState) => state.organization);
    const user = useAuthStore((state: AuthState) => state.user);
    const initialized = useAuthStore((state: AuthState) => state.initialized);
    const setOrganization = useAuthStore((state: AuthState) => state.setOrganization);
    const setIsSwitchingOrg = useAuthStore((state: AuthState) => state.setIsSwitchingOrg);
    const isSwitchingOrg = useAuthStore((state: AuthState) => state.isSwitchingOrg);

    // Local state for orgs list
    const [userOrganizations, setUserOrganizations] = useState<UserOrganization[]>([]);
    const [loadingOrgs, setLoadingOrgs] = useState(false);

    // Fetch user's organizations when user changes
    useEffect(() => {
        const fetchOrgs = async () => {
            if (!user?.id) return;

            setLoadingOrgs(true);
            try {
                // Try get_my_organizations RPC first
                const { data, error } = await supabase
                    .schema('identity')
                    .rpc('get_my_organizations');

                if (error) {
                    console.error('[OrgSwitcher] RPC error:', error);
                    // Fallback: just show current org
                    if (organization) {
                        setUserOrganizations([{ id: organization.id, name: organization.name }]);
                    }
                } else if (data) {
                    console.log('[OrgSwitcher] Raw RPC data:', data);
                    // Map RPC response to our interface
                    const orgs = (data as RpcOrgData[]).map(d => ({
                        id: d.organization_id,
                        name: d.organization_name
                    }));
                    console.log('[OrgSwitcher] Mapped orgs:', orgs);
                    setUserOrganizations(orgs);
                }
            } catch (e) {
                console.error('[OrgSwitcher] Exception:', e);
            } finally {
                setLoadingOrgs(false);
            }
        };

        fetchOrgs();
    }, [user?.id, organization?.id]);

    console.log('[OrgSwitcher] State:', {
        initialized,
        organizationId: organization?.id,
        orgName: organization?.name,
        orgCount: userOrganizations.length,
        isSwitchingOrg
    });

    // Still loading initial auth
    if (!initialized) {
        return <Spin size="small" />;
    }

    // No org
    if (!organization) {
        return (
            <Tooltip title={'No organization'}>
                <Tag color="orange" icon={<GlobalOutlined />}>
                    No Org
                </Tag>
            </Tooltip>
        );
    }

    // Single org or still loading orgs - show tag
    if (userOrganizations.length <= 1) {
        return (
            <Tooltip title={`Current organization: ${organization.name}`}>
                <Tag color="green" icon={<GlobalOutlined />}>
                    {loadingOrgs ? <Spin size="small" /> : organization.name}
                </Tag>
            </Tooltip>
        );
    }

    // Multiple orgs - show dropdown
    const handleOrgChange = async (newOrgId: string) => {
        console.log('[OrgSwitcher] Switching from', organization.id, 'to', newOrgId);

        if (newOrgId === organization.id) {
            console.log('[OrgSwitcher] Same org, skipping');
            return;
        }

        const newOrg = userOrganizations.find(o => o.id === newOrgId);
        if (!newOrg) {
            console.error('[OrgSwitcher] Org not found:', newOrgId);
            return;
        }

        message.loading({ content: `Switching to ${newOrg.name}...`, key: 'orgSwitch' });
        setIsSwitchingOrg(true);

        try {
            // 0. Clear stale UI state from previous org
            useInboxStore.getState().setSelectedConversationId(null);

            // 1. Update store FIRST - this allows UI to respond immediately
            setOrganization({ id: newOrgId, name: newOrg.name } as any);

            // 2. Update localStorage for persistence across reloads
            localStorage.setItem('active_org_id', newOrgId);

            // 3. Persist to DB (set preferred org)
            await supabase.schema('identity').rpc('set_preferred_organization', {
                new_org_id: newOrgId
            });

            // 4. Update JWT metadata with new org_id (important for RLS/RPC context)
            await supabase.auth.updateUser({
                data: { org_id: newOrgId }
            });

            // 5. Switch WhatsApp routing for dev/test purposes
            const wabaPhoneNumberId = import.meta.env.VITE_PHONE_NUMBER_ID || '';
            const testerPhoneNumber = import.meta.env.VITE_TEST_WA_NUMBER || '918095063070';

            const { error: waError } = await supabase.schema('wa').rpc('wa_utils_testonly_dev_switch_active_org', {
                p_target_org_id: newOrgId,
                p_test_wa_id: testerPhoneNumber,
                p_real_phone_id: wabaPhoneNumberId
            });

            if (waError) {
                console.warn('[OrgSwitcher] WA routing switch failed:', waError.message);
            } else {
                console.log('[OrgSwitcher] ✅ WA routing switched to:', newOrgId);
            }

            // 6. Invalidate ALL queries to refresh data with new org context
            await queryClient.invalidateQueries();

            message.success({ content: `Switched to ${newOrg.name}`, key: 'orgSwitch', duration: 2 });
        } catch (e) {
            console.error('[OrgSwitcher] Switch error:', e);
            message.error({ content: 'Failed to switch organization', key: 'orgSwitch' });
            setIsSwitchingOrg(false);
        }
    };

    return (
        <Space size="small" style={{ marginRight: 16 }}>
            <Select
                loading={loadingOrgs || isSwitchingOrg}
                value={organization.id}
                onChange={handleOrgChange}
                style={{ width: 220 }}
                placeholder="Select Organization"
                popupMatchSelectWidth={300}
                options={userOrganizations.map(org => ({
                    value: org.id,
                    label: (
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            width: '100%'
                        }}>
                            <Text strong={org.id === organization.id}>{org.name}</Text>
                            {org.id === organization.id && (
                                <CheckOutlined style={{ color: '#52c41a' }} />
                            )}
                        </div>
                    )
                }))}
                labelRender={() => (
                    <Space>
                        <GlobalOutlined />
                        <span>{organization.name}</span>
                    </Space>
                )}
            />
        </Space>
    );
};

export default OrgSwitcher;
