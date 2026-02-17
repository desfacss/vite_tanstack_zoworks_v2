import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Card, Tag, message, Modal, Typography } from 'antd';
import { CheckCircle, XCircle, Info, Building2, User, Mail, Phone } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;

interface OnboardingRequest {
  id: string; // account id
  name: string; // account name
  short_code: string;
  contact_id: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  requested_at: string;
}

const OnboardingRequests: React.FC = () => {
  const [requests, setRequests] = useState<OnboardingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      // Fetch accounts joined with contacts where intent_category is ONBOARDING_PENDING
      const { data, error } = await supabase
        .schema('crm')
        .from('accounts')
        .select(`
          id,
          name,
          short_code,
          details,
          contacts:contacts!contacts_account_id_fkey(
            id,
            name,
            email,
            phone,
            created_at
          )
        `)
        .eq('intent_category', 'ONBOARDING_PENDING')
        .eq('status', 'requested');

      if (error) throw error;

      const formattedRequests: OnboardingRequest[] = (data || []).map((acc: any) => {
        const contact = acc.contacts?.[0] || {};
        return {
          id: acc.id,
          name: acc.name,
          short_code: acc.short_code,
          contact_id: contact.id,
          contact_name: contact.name,
          contact_email: contact.email,
          contact_phone: contact.phone,
          requested_at: contact.created_at || acc.created_at
        };
      });

      setRequests(formattedRequests);
    } catch (error: any) {
      message.error('Failed to fetch requests: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (request: OnboardingRequest) => {
    setProcessingId(request.id);
    try {
      // 1. Create Auth User
      const tempPassword = 'Welcome@' + Math.random().toString(36).slice(-8);
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: request.contact_email,
        password: tempPassword,
        options: {
          data: {
            display_name: request.contact_name,
            phone: request.contact_phone,
            email_confirmed_at: new Date().toISOString(),
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Auth user creation failed.');

      const authId = authData.user.id;
      const orgId = request.id; // From Stage 1, account ID matches Org ID

      // 2. Activate existing Shell Organization
      const { error: orgError } = await supabase
        .schema('identity')
        .from('organizations')
        .update({
          auth_id: authId,
          is_active: true,
          details: { onboarding_status: 'approved', approved_at: new Date().toISOString() }
        })
        .eq('id', orgId);

      if (orgError) throw orgError;

      // 3. Create User record
      const { data: userData, error: userError } = await supabase
        .schema('identity')
        .from('users')
        .insert([{
          id: authId,
          auth_id: authId,
          name: request.contact_name,
          email: request.contact_email,
          mobile: request.contact_phone,
          organization_id: orgId,
          password_confirmed: true
        }])
        .select()
        .single();

      if (userError) throw userError;

      // 4. Create Organization User mapping
      const { error: mappingError } = await supabase
        .schema('identity')
        .from('organization_users')
        .insert([{
          organization_id: orgId,
          user_id: userData.id,
          is_active: true
        }]);

      if (mappingError) throw mappingError;

      // 5. Update staging rows to active status
      await supabase.schema('crm').from('contacts').update({ status: 'active', intent_category: 'ONBOARDING_COMPLETED' }).eq('id', request.contact_id);
      await supabase.schema('crm').from('accounts').update({ status: 'active', intent_category: 'ONBOARDING_COMPLETED' }).eq('id', orgId);

      message.success(`Activated ${request.name} successfully! Credentials sent to ${request.contact_email}`);
      fetchRequests();
    } catch (error: any) {
      console.error('Approval Error:', error);
      message.error('Approval failed: ' + error.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = (request: OnboardingRequest) => {
    Modal.confirm({
      title: 'Reject Request?',
      content: `Are you sure you want to reject and delete the request from ${request.name}? This will also remove the shell organization.`,
      okText: 'Reject & Delete',
      okType: 'danger',
      onOk: async () => {
        setProcessingId(request.id);
        try {
          // Delete in order to satisfy FKs (though CASCADE is on)
          await supabase.schema('crm').from('contacts').delete().eq('id', request.contact_id);
          await supabase.schema('crm').from('accounts').delete().eq('id', request.id);
          await supabase.schema('identity').from('organizations').delete().eq('id', request.id);
          
          message.success('Request and shell organization removed.');
          fetchRequests();
        } catch (error: any) {
          message.error('Rejection failed: ' + error.message);
        } finally {
          setProcessingId(null);
        }
      }
    });
  };

  const columns: ColumnsType<OnboardingRequest> = [
    {
      title: 'Organization',
      key: 'org',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong className="flex items-center gap-2"><Building2 size={14} /> {record.name}</Text>
          <Tag color="blue">{record.short_code}.zoworks.com</Tag>
        </Space>
      )
    },
    {
      title: 'Contact',
      key: 'contact',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text className="flex items-center gap-2"><User size={14} /> {record.contact_name}</Text>
          <Text type="secondary" className="flex items-center gap-2 text-xs"><Mail size={12} /> {record.contact_email}</Text>
          <Text type="secondary" className="flex items-center gap-2 text-xs"><Phone size={12} /> {record.contact_phone}</Text>
        </Space>
      )
    },
    {
      title: 'Requested At',
      dataIndex: 'requested_at',
      key: 'requested_at',
      render: (date) => new Date(date).toLocaleString()
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space>
          <Button 
            type="primary" 
            icon={<CheckCircle size={16} />} 
            onClick={() => handleApprove(record)}
            loading={processingId === record.id}
          >
            Approve
          </Button>
          <Button 
            danger 
            icon={<XCircle size={16} />} 
            onClick={() => handleReject(record)}
            disabled={processingId === record.id}
          >
            Reject
          </Button>
        </Space>
      )
    }
  ];

  return (
    <div className="p-6">
      <Card>
        <div className="flex items-center justify-between mb-6">
          <div>
            <Title level={3}>Onboarding Requests</Title>
            <Text type="secondary">Review and approve new organization registrations.</Text>
          </div>
          <Button icon={<Info size={16} />} type="text">Help</Button>
        </div>

        <Table 
          columns={columns} 
          dataSource={requests} 
          rowKey="id" 
          loading={loading}
          locale={{ emptyText: 'No pending onboarding requests' }}
        />
      </Card>
    </div>
  );
};

export default OnboardingRequests;
