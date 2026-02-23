import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Card, Tag, message, Modal, Typography } from 'antd';
import { CheckCircle, XCircle, Info, Building2, User, Mail, Phone } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/core/lib/store';
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
  const { organization } = useAuthStore();
  const [requests, setRequests] = useState<OnboardingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      // Use the L4 Fetcher for standardized data retrieval
      const { data, error } = await supabase.schema('core').rpc('api_new_fetch_entity_records', {
        config: {
          entity_name: 'accounts', // Or 'v_accounts' if you want the enriched view
          entity_schema: 'crm',
          organization_id: organization?.id,
          filters: [
            // { key: 'intent_category', operator: 'eq', value: 'ONBOARDING_PENDING' },
            // { key: 'status', operator: 'eq', value: 'requested' }
          ],
          pagination: { limit: 100 },
          sorting: { column: 'created_at', direction: 'DESC' }
        }
      });

      if (error) throw error;

      // The L4 fetcher returns data in a 'data' property
      const records = data?.data || [];

      // Note: Since api_new_fetch_entity_records might not support 'include' yet
      // we may need to fall back to the enriched v_accounts view or handle joins differently.
      // If records don't have contacts, we might need a separate fetch or use v_accounts.
      
      const formattedRequests: OnboardingRequest[] = records.map((acc: any) => {
        // Contacts might be joined if using v_accounts or if include is supported
        const contact = acc.contacts?.[0] || acc.primary_contact || {};
        
        // Account Name Mapping (standardized field)
        const orgName = acc.name || acc.details?.name || 'Unnamed Organization';
        
        // Contact Name Mapping from nested details (L4 pattern)
        const contactName = acc.contact_name || contact.name || 
                           (contact.details?.first_name ? `${contact.details.first_name} ${contact.details.last_name || ''}`.trim() : null) ||
                           contact.details?.name || 
                           'Unnamed Contact';

        return {
          id: acc.id,
          name: orgName,
          short_code: acc.short_code,
          contact_id: contact.id || acc.contact_id,
          contact_name: contactName,
          contact_email: acc.contact_email || contact.email,
          contact_phone: acc.contact_phone || contact.phone,
          requested_at: acc.created_at || contact.created_at
        };
      });

      setRequests(formattedRequests);
    } catch (error: any) {
      console.error('Fetch Error:', error);
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
      // Phase 3: SaaS Activation via RPC
      const { error } = await supabase.schema('identity').rpc('promote_to_tenant', {
        p_org_id: request.id
      });

      if (error) throw error;

      message.success(`Activated ${request.name} successfully! Organization is now operational.`);
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
      content: `Are you sure you want to reject the request from ${request.name}? This will mark the request as rejected.`,
      okText: 'Reject',
      okType: 'danger',
      onOk: async () => {
        setProcessingId(request.id);
        try {
          // Use L4 Upsert for standardized state updates
          const { error } = await supabase.schema('core').rpc('api_new_core_upsert_data', {
            table_name: 'crm.v_accounts',
            data: {
              id: request.id,
              status: 'rejected',
              intent_category: 'ONBOARDING_REJECTED'
            }
          });

          if (error) throw error;
          
          message.success('Request rejected.');
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
