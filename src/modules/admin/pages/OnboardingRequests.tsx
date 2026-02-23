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
      // Use the L4 Fetcher for standardized data retrieval
      const { data, error } = await supabase.schema('core').rpc('api_new_fetch_entity_records', {
        config: {
          entity_name: 'organizations',
          entity_schema: 'identity',
          // No organization_id needed here since this is a global admin view of organizations
          filters: [
            // { key: 'is_active', operator: '=', value: false }
          ],
          // Join with the contact who claimed/requested this organization
          include: [
            {
              entity_name: 'contacts',
              entity_schema: 'crm',
              on: 'claimed_by_contact_id',
              select: ['id', 'email', 'phone', 'details', 'created_at', 'name']
            }
          ],
          pagination: { limit: 100 },
          sorting: { column: 'created_at', direction: 'DESC' }
        }
      });

      if (error) throw error;

      // The L4 fetcher returns data in a 'data' property
      const records = data?.data || [];
      
      const formattedRequests: OnboardingRequest[] = records.map((org: any) => {
        const contact = org.contacts?.[0] || {};
        
        // Organization Name & Code
        const orgName = org.name || 'Unnamed Organization';
        const shortCode = org.subdomain || 'no-code';
        
        // Contact Name Mapping from nested details (L4 pattern)
        const contactName = contact.name || 
                           (contact.details?.first_name ? `${contact.details.first_name} ${contact.details.last_name || ''}`.trim() : null) ||
                           contact.details?.name || 
                           'Unnamed Contact';

        return {
          id: org.id,
          name: orgName,
          short_code: shortCode,
          contact_id: contact.id,
          contact_name: contactName,
          contact_email: contact.email,
          contact_phone: contact.phone,
          requested_at: org.created_at || contact.created_at
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
            table_name: 'identity.organizations',
            data: {
              id: request.id,
              is_active: false // Already false, but we can set a rejection flag in details if needed
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
